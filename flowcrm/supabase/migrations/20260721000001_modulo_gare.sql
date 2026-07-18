-- ═══════════════════════════════════════════════════════════════════
-- MODULO GARE D'APPALTO — schema completo (documento "Modulo gestione
-- gare appalto": 19 sezioni). Convenzioni core: UUID, audit, freeze,
-- soft-delete, tsvector, codice GARA-AAAA-NNNN via genera_codice().
-- RLS: ogni policy passa da modulo_licenziato('gare'); l'offerta
-- economica (marginalità) è riservata ad admin/manager.
-- Scadenze (termini, cauzioni) sincronizzate su scadenze_moduli → il
-- cron notifica a 30/7/1/0 giorni senza altro codice.
-- ═══════════════════════════════════════════════════════════════════

CREATE TYPE gara_tipologia AS ENUM ('lavori', 'servizi', 'forniture');
CREATE TYPE gara_procedura AS ENUM (
  'aperta', 'ristretta', 'negoziata', 'affidamento_diretto',
  'accordo_quadro', 'manifestazione_interesse', 'altro'
);
CREATE TYPE gara_stato AS ENUM (
  'in_analisi', 'in_preparazione', 'presentata',
  'aggiudicata', 'non_aggiudicata', 'annullata'
);
CREATE TYPE gara_requisito_tipo AS ENUM (
  'generale', 'economico_finanziario', 'tecnico_professionale',
  'certificazione', 'soa', 'referenze', 'personale', 'attrezzature', 'altro'
);
CREATE TYPE gara_ati_ruolo AS ENUM ('mandataria', 'mandante', 'consorziata');
CREATE TYPE gara_cauzione_tipo AS ENUM (
  'provvisoria', 'definitiva', 'fideiussione', 'polizza_assicurativa'
);

-- ── ANAGRAFICA GARA (§1 + classificazione §2 + presentazione §12 + esito §13)
CREATE TABLE gare (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codice                TEXT UNIQUE,                 -- GARA-AAAA-NNNN via trigger
  titolo                TEXT NOT NULL,
  ente_appaltante_id    UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  ente_appaltante       TEXT,                        -- denominazione libera se non in anagrafica
  rup                   TEXT,
  cig                   TEXT,
  cup                   TEXT,
  cpv                   TEXT,
  tipologia             gara_tipologia NOT NULL DEFAULT 'lavori',
  procedura             gara_procedura NOT NULL DEFAULT 'aperta',
  piattaforma           TEXT,
  piattaforma_url       TEXT,
  importo_base          NUMERIC(14,2) NOT NULL DEFAULT 0,
  oneri_sicurezza       NUMERIC(12,2),
  durata_mesi           INT,
  luogo_esecuzione      TEXT,
  data_pubblicazione    DATE,
  termine_chiarimenti   DATE,
  termine_presentazione TIMESTAMPTZ,
  data_apertura_offerte TIMESTAMPTZ,
  stato                 gara_stato NOT NULL DEFAULT 'in_analisi',
  -- Classificazione opportunità (§2)
  settore               TEXT,
  categoria_soa         TEXT,
  territorio            TEXT,
  priorita              priorita_type NOT NULL DEFAULT 'media',
  fonte                 TEXT,
  -- Team (§5): responsabile di gara
  responsabile_id       UUID REFERENCES user_profiles(id),
  -- Offerta tecnica (§8): sintesi/nota (gli elaborati sono allegati "Offerta")
  offerta_tecnica_note  TEXT,
  -- Presentazione (§12)
  presentata_at         TIMESTAMPTZ,
  protocollo_invio      TEXT,
  -- Esito (§13) e avvio commessa (§14)
  esito_at              TIMESTAMPTZ,
  posizione_graduatoria INT,
  aggiudicatario        TEXT,
  ricorso               BOOLEAN NOT NULL DEFAULT false,
  note_esito            TEXT,
  commessa_id           UUID REFERENCES commesse(id) ON DELETE SET NULL,
  note                  TEXT,
  attivo                BOOLEAN NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by            UUID REFERENCES user_profiles(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by            UUID REFERENCES user_profiles(id)
);

ALTER TABLE gare ADD COLUMN ricerca tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(codice,'') || ' ' || coalesce(titolo,'') || ' ' ||
      coalesce(cig,'') || ' ' || coalesce(cpv,'') || ' ' ||
      coalesce(settore,'') || ' ' || coalesce(territorio,'') || ' ' ||
      coalesce(ente_appaltante,'')
    )
  ) STORED;

CREATE INDEX idx_gare_ricerca ON gare USING GIN (ricerca);
CREATE INDEX idx_gare_stato ON gare (stato, attivo);
CREATE INDEX idx_gare_termine ON gare (termine_presentazione);
CREATE INDEX idx_gare_ente ON gare (ente_appaltante_id);

-- Codice automatico (SECURITY DEFINER: genera_codice e il contatore sono
-- blindati, il trigger deve girare come owner).
CREATE OR REPLACE FUNCTION gara_set_codice()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.codice := genera_codice('GARA');
  RETURN NEW;
END;
$$;
CREATE TRIGGER gare_set_codice
  BEFORE INSERT ON gare
  FOR EACH ROW WHEN (NEW.codice IS NULL)
  EXECUTE FUNCTION gara_set_codice();

-- Date derivate dallo stato (presentata_at / esito_at)
CREATE OR REPLACE FUNCTION gara_stato_derivati()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.stato = 'presentata' AND OLD.stato IS DISTINCT FROM 'presentata'
     AND NEW.presentata_at IS NULL THEN
    NEW.presentata_at := NOW();
  END IF;
  IF NEW.stato IN ('aggiudicata', 'non_aggiudicata', 'annullata')
     AND OLD.stato NOT IN ('aggiudicata', 'non_aggiudicata', 'annullata')
     AND NEW.esito_at IS NULL THEN
    NEW.esito_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER gare_stato_derivati
  BEFORE UPDATE OF stato ON gare
  FOR EACH ROW EXECUTE FUNCTION gara_stato_derivati();

-- Scadenzario automatico (§15): termini della gara → scadenze_moduli.
-- SECURITY DEFINER (scrive su tabella RLS-protetta come fattura_crea_scadenza).
CREATE OR REPLACE FUNCTION gara_sync_scadenze()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  DELETE FROM scadenze_moduli
  WHERE entita = 'gare' AND entita_id = NEW.id
    AND tipo IN ('Termine chiarimenti', 'Termine presentazione offerta')
    AND stato = 'aperta';

  -- Le scadenze valgono finché la gara è in lavorazione
  IF NEW.attivo AND NEW.stato IN ('in_analisi', 'in_preparazione') THEN
    IF NEW.termine_chiarimenti IS NOT NULL AND NEW.termine_chiarimenti >= CURRENT_DATE THEN
      INSERT INTO scadenze_moduli
        (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, created_by)
      VALUES
        ('gare', 'gare', NEW.id, 'Termine chiarimenti',
         'Gara ' || NEW.codice || ' — ' || NEW.titolo,
         NEW.termine_chiarimenti, '/gare/' || NEW.id, NEW.created_by);
    END IF;
    IF NEW.termine_presentazione IS NOT NULL
       AND NEW.termine_presentazione::date >= CURRENT_DATE THEN
      INSERT INTO scadenze_moduli
        (modulo, entita, entita_id, tipo, descrizione, data_scadenza, azione_url, created_by)
      VALUES
        ('gare', 'gare', NEW.id, 'Termine presentazione offerta',
         'Gara ' || NEW.codice || ' — ' || NEW.titolo,
         NEW.termine_presentazione::date, '/gare/' || NEW.id, NEW.created_by);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER gare_sync_scadenze
  AFTER INSERT OR UPDATE OF termine_chiarimenti, termine_presentazione, stato, attivo ON gare
  FOR EACH ROW EXECUTE FUNCTION gara_sync_scadenze();

CREATE TRIGGER gare_updated_at
  BEFORE UPDATE ON gare FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER gare_freeze_autore
  BEFORE UPDATE ON gare FOR EACH ROW EXECUTE FUNCTION freeze_created_by();
CREATE TRIGGER gare_audit
  AFTER INSERT OR UPDATE OR DELETE ON gare FOR EACH ROW EXECUTE FUNCTION log_audit();

-- ── VALUTAZIONE GO/NO-GO (§3): criteri con punteggio; la DECISIONE passa
--    dal workflow approvazioni (tipo 'go_no_go').
CREATE TABLE gare_valutazioni (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gara_id    UUID NOT NULL REFERENCES gare(id) ON DELETE CASCADE,
  criterio   TEXT NOT NULL,
  punteggio  SMALLINT NOT NULL CHECK (punteggio BETWEEN 1 AND 5),
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_gare_valutazioni_gara ON gare_valutazioni (gara_id);

-- ── REQUISITI DI PARTECIPAZIONE (§4)
CREATE TABLE gare_requisiti (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gara_id     UUID NOT NULL REFERENCES gare(id) ON DELETE CASCADE,
  tipo        gara_requisito_tipo NOT NULL DEFAULT 'generale',
  descrizione TEXT NOT NULL,
  soddisfatto BOOLEAN NOT NULL DEFAULT false,
  allegato_id UUID REFERENCES allegati(id) ON DELETE SET NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_gare_requisiti_gara ON gare_requisiti (gara_id);

-- ── TEAM DI GARA (§5) — le attività si collegano via attivita.gara_id
CREATE TABLE gare_team (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gara_id    UUID NOT NULL REFERENCES gare(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  ruolo      TEXT NOT NULL,       -- 'Responsabile di gara','Ufficio tecnico',...
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  UNIQUE (gara_id, user_id)
);
CREATE INDEX idx_gare_team_gara ON gare_team (gara_id);

-- ── CHIARIMENTI (§7)
CREATE TABLE gare_chiarimenti (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gara_id         UUID NOT NULL REFERENCES gare(id) ON DELETE CASCADE,
  domanda         TEXT NOT NULL,
  risposta        TEXT,
  data_invio      DATE NOT NULL DEFAULT CURRENT_DATE,
  data_risposta   DATE,
  impatto_offerta TEXT,
  responsabile_id UUID REFERENCES user_profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES user_profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_gare_chiarimenti_gara ON gare_chiarimenti (gara_id);

-- ── OFFERTA ECONOMICA (§9) — ⚠️ SOLO admin/manager (marginalità/ribasso)
CREATE TABLE gare_offerte_economiche (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gara_id                UUID NOT NULL UNIQUE REFERENCES gare(id) ON DELETE CASCADE,
  computo_importo        NUMERIC(14,2),
  ribasso_percentuale    NUMERIC(6,3),
  importo_offerto        NUMERIC(14,2),
  costi_manodopera       NUMERIC(14,2),
  oneri_sicurezza        NUMERIC(12,2),
  marginalita_percentuale NUMERIC(6,2),
  note                   TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by             UUID REFERENCES user_profiles(id),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by             UUID REFERENCES user_profiles(id)
);

-- ── ATI / RTI / CONSORZI (§10)
CREATE TABLE gare_partecipanti (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gara_id           UUID NOT NULL REFERENCES gare(id) ON DELETE CASCADE,
  organizzazione_id UUID NOT NULL REFERENCES organizzazioni(id) ON DELETE CASCADE,
  ruolo             gara_ati_ruolo NOT NULL DEFAULT 'mandante',
  quota_percentuale NUMERIC(5,2) CHECK (quota_percentuale BETWEEN 0 AND 100),
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  UNIQUE (gara_id, organizzazione_id)
);
CREATE INDEX idx_gare_partecipanti_gara ON gare_partecipanti (gara_id);

-- ── CAUZIONI E GARANZIE (§11) → scadenza automatica su scadenze_moduli
CREATE TABLE gare_cauzioni (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gara_id       UUID NOT NULL REFERENCES gare(id) ON DELETE CASCADE,
  tipo          gara_cauzione_tipo NOT NULL DEFAULT 'provvisoria',
  importo       NUMERIC(14,2) NOT NULL DEFAULT 0,
  garante       TEXT,
  data_emissione DATE,
  data_scadenza DATE,
  restituita    BOOLEAN NOT NULL DEFAULT false,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES user_profiles(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_gare_cauzioni_gara ON gare_cauzioni (gara_id);

CREATE OR REPLACE FUNCTION gara_cauzione_sync_scadenza()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_codice TEXT;
BEGIN
  DELETE FROM scadenze_moduli
  WHERE entita = 'gare_cauzioni' AND entita_id = NEW.id AND stato = 'aperta';

  IF NOT NEW.restituita AND NEW.data_scadenza IS NOT NULL
     AND NEW.data_scadenza >= CURRENT_DATE THEN
    SELECT codice INTO v_codice FROM gare WHERE id = NEW.gara_id;
    INSERT INTO scadenze_moduli
      (modulo, entita, entita_id, tipo, descrizione, data_scadenza,
       azione_url, solo_manager, created_by)
    VALUES
      ('gare', 'gare_cauzioni', NEW.id, 'Cauzione ' || NEW.tipo,
       'Gara ' || COALESCE(v_codice, '?') || ' — € ' || NEW.importo ||
       COALESCE(' (' || NEW.garante || ')', ''),
       NEW.data_scadenza, '/gare/' || NEW.gara_id, true, NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER gare_cauzioni_sync_scadenza
  AFTER INSERT OR UPDATE OF data_scadenza, restituita ON gare_cauzioni
  FOR EACH ROW EXECUTE FUNCTION gara_cauzione_sync_scadenza();

-- ── Collegamento attività (§5: attività del team di gara)
ALTER TABLE attivita ADD COLUMN gara_id UUID REFERENCES gare(id) ON DELETE CASCADE;
CREATE INDEX idx_attivita_gara ON attivita (gara_id);

-- ── Trigger comuni sui figli con updated_at
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gare_valutazioni','gare_requisiti','gare_chiarimenti',
    'gare_offerte_economiche','gare_cauzioni'
  ] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    EXECUTE format('CREATE TRIGGER %1$s_freeze_autore BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION freeze_created_by()', t);
    EXECUTE format('CREATE TRIGGER %1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
  END LOOP;
END $$;

-- ═══ RLS ═════════════════════════════════════════════════════════
ALTER TABLE gare ENABLE ROW LEVEL SECURITY;
ALTER TABLE gare_valutazioni ENABLE ROW LEVEL SECURITY;
ALTER TABLE gare_requisiti ENABLE ROW LEVEL SECURITY;
ALTER TABLE gare_team ENABLE ROW LEVEL SECURITY;
ALTER TABLE gare_chiarimenti ENABLE ROW LEVEL SECURITY;
ALTER TABLE gare_offerte_economiche ENABLE ROW LEVEL SECURITY;
ALTER TABLE gare_partecipanti ENABLE ROW LEVEL SECURITY;
ALTER TABLE gare_cauzioni ENABLE ROW LEVEL SECURITY;

-- gare + figli operativi: team completo (licenza obbligatoria), delete admin
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'gare','gare_valutazioni','gare_requisiti','gare_team',
    'gare_chiarimenti','gare_partecipanti','gare_cauzioni'
  ] LOOP
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated
      USING (modulo_licenziato('gare'))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_licenziato('gare') AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_licenziato('gare')) WITH CHECK (modulo_licenziato('gare'))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_licenziato('gare') AND get_user_role() = 'admin')$f$, t);
  END LOOP;
END $$;

-- Offerta economica: SOLO admin/manager (l'operatore non vede ribasso/margini)
CREATE POLICY "gare_offerte_select" ON gare_offerte_economiche FOR SELECT TO authenticated
  USING (modulo_licenziato('gare') AND puo_amministrazione());
CREATE POLICY "gare_offerte_insert" ON gare_offerte_economiche FOR INSERT TO authenticated
  WITH CHECK (modulo_licenziato('gare') AND puo_amministrazione() AND created_by = auth.uid());
CREATE POLICY "gare_offerte_update" ON gare_offerte_economiche FOR UPDATE TO authenticated
  USING (modulo_licenziato('gare') AND puo_amministrazione())
  WITH CHECK (modulo_licenziato('gare') AND puo_amministrazione());
CREATE POLICY "gare_offerte_delete" ON gare_offerte_economiche FOR DELETE TO authenticated
  USING (modulo_licenziato('gare') AND get_user_role() = 'admin');

-- ═══ VISTE KPI (§17) — security_invoker: RLS e licenza del chiamante ══
CREATE VIEW vw_gare_kpi WITH (security_invoker = true) AS
SELECT
  COUNT(*)::int                                                        AS totali,
  COUNT(*) FILTER (WHERE stato = 'in_analisi')::int                    AS in_analisi,
  COUNT(*) FILTER (WHERE stato = 'in_preparazione')::int               AS in_preparazione,
  COUNT(*) FILTER (WHERE stato = 'presentata')::int                    AS presentate,
  COUNT(*) FILTER (WHERE stato = 'aggiudicata')::int                   AS aggiudicate,
  COUNT(*) FILTER (WHERE stato = 'non_aggiudicata')::int               AS non_aggiudicate,
  ROUND(
    COUNT(*) FILTER (WHERE stato = 'aggiudicata')::numeric * 100
    / NULLIF(COUNT(*) FILTER (WHERE stato IN ('aggiudicata','non_aggiudicata')), 0),
  1)                                                                   AS tasso_aggiudicazione,
  COALESCE(SUM(importo_base) FILTER (WHERE stato = 'aggiudicata'), 0)::numeric(14,2)      AS valore_vinte,
  COALESCE(SUM(importo_base) FILTER (WHERE stato = 'non_aggiudicata'), 0)::numeric(14,2)  AS valore_perse,
  COALESCE(SUM(importo_base) FILTER (WHERE stato IN ('in_analisi','in_preparazione','presentata')), 0)::numeric(14,2) AS valore_in_corso,
  ROUND(AVG(EXTRACT(EPOCH FROM (presentata_at - created_at)) / 86400)
    FILTER (WHERE presentata_at IS NOT NULL))::int                     AS giorni_medi_preparazione
FROM gare
WHERE attivo;

CREATE VIEW vw_gare_per_stato WITH (security_invoker = true) AS
SELECT stato::text AS stato, COUNT(*)::int AS numero,
       COALESCE(SUM(importo_base), 0)::numeric(14,2) AS valore
FROM gare WHERE attivo
GROUP BY stato;

CREATE VIEW vw_gare_successo_ente WITH (security_invoker = true) AS
SELECT COALESCE(o.ragione_sociale, g.ente_appaltante, '—') AS ente,
       COUNT(*) FILTER (WHERE g.stato IN ('presentata','aggiudicata','non_aggiudicata'))::int AS presentate,
       COUNT(*) FILTER (WHERE g.stato = 'aggiudicata')::int AS aggiudicate,
       COALESCE(SUM(g.importo_base) FILTER (WHERE g.stato = 'aggiudicata'), 0)::numeric(14,2) AS valore_vinto
FROM gare g
LEFT JOIN organizzazioni o ON o.id = g.ente_appaltante_id
WHERE g.attivo
GROUP BY 1
ORDER BY aggiudicate DESC, presentate DESC;

CREATE VIEW vw_gare_successo_territorio WITH (security_invoker = true) AS
SELECT COALESCE(territorio, '—') AS territorio,
       COUNT(*) FILTER (WHERE stato IN ('presentata','aggiudicata','non_aggiudicata'))::int AS presentate,
       COUNT(*) FILTER (WHERE stato = 'aggiudicata')::int AS aggiudicate,
       COALESCE(SUM(importo_base) FILTER (WHERE stato = 'aggiudicata'), 0)::numeric(14,2) AS valore_vinto
FROM gare WHERE attivo
GROUP BY 1
ORDER BY aggiudicate DESC;

CREATE VIEW vw_gare_successo_categoria WITH (security_invoker = true) AS
SELECT COALESCE(categoria_soa, '—') AS categoria,
       COUNT(*) FILTER (WHERE stato IN ('presentata','aggiudicata','non_aggiudicata'))::int AS presentate,
       COUNT(*) FILTER (WHERE stato = 'aggiudicata')::int AS aggiudicate,
       COALESCE(SUM(importo_base) FILTER (WHERE stato = 'aggiudicata'), 0)::numeric(14,2) AS valore_vinto
FROM gare WHERE attivo
GROUP BY 1
ORDER BY aggiudicate DESC;

GRANT SELECT ON vw_gare_kpi, vw_gare_per_stato, vw_gare_successo_ente,
               vw_gare_successo_territorio, vw_gare_successo_categoria
  TO authenticated;

-- ═══ Ricerca globale: le gare entrano nel cmd+K ═══════════════════
-- SECURITY INVOKER: la RLS (licenza inclusa) filtra per il chiamante.
CREATE OR REPLACE FUNCTION ricerca_globale(q TEXT)
RETURNS TABLE (
  tipo         TEXT,
  id           UUID,
  titolo       TEXT,
  sottotitolo  TEXT
)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, public AS $$
  SELECT * FROM (
    SELECT 'organizzazione' AS tipo, o.id,
           o.ragione_sociale AS titolo,
           COALESCE(o.citta, o.settore, '') AS sottotitolo
    FROM organizzazioni o
    WHERE o.attivo AND o.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'contatto', c.id,
           trim(c.nome || ' ' || COALESCE(c.cognome, '')),
           COALESCE(c.email, c.ruolo_aziendale, '')
    FROM contatti c
    WHERE c.attivo AND c.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'gara', g.id,
           g.codice || ' · ' || g.titolo,
           COALESCE(g.ente_appaltante, g.settore, '')
    FROM gare g
    WHERE g.attivo AND g.ricerca @@ websearch_to_tsquery('simple', q)
  ) t
  LIMIT 20
$$;

-- ═══ Hardening nuove funzioni ═════════════════════════════════════
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'gara_set_codice()', 'gara_stato_derivati()',
    'gara_sync_scadenze()', 'gara_cauzione_sync_scadenza()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
END $$;
