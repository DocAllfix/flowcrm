-- ═══════════════════════════════════════════════════════════════════
-- MODULO PARCO AUTOMEZZI — schema completo (documento "Modulo parco
-- automezzi": 19 sezioni). Codice AUTO-AAAA-NNNN, assegnazioni,
-- manutenzioni, pneumatici, rifornimenti (km aggiornati in automatico),
-- utilizzi, sinistri, multe, costi analitici (riservati), attrezzature,
-- ricambi, patenti conducenti (HR) con scadenze automatiche.
-- Cross-modulo: cantiere_id sui mezzi; FK differita cantiere_mezzi.
-- ═══════════════════════════════════════════════════════════════════

CREATE TYPE automezzo_categoria AS ENUM (
  'autovettura', 'furgone', 'camion', 'escavatore', 'pala',
  'piattaforma', 'rimorchio', 'altro'
);
CREATE TYPE automezzo_alimentazione AS ENUM (
  'benzina', 'diesel', 'gpl', 'metano', 'ibrida', 'elettrica'
);
CREATE TYPE automezzo_acquisizione AS ENUM ('acquisto', 'leasing', 'noleggio');
CREATE TYPE automezzo_stato AS ENUM (
  'disponibile', 'assegnato', 'in_manutenzione', 'fuori_servizio', 'dismesso'
);
CREATE TYPE automezzo_dismissione AS ENUM ('vendita', 'rottamazione', 'trasferimento');
CREATE TYPE manutenzione_tipo AS ENUM ('ordinaria', 'straordinaria');
CREATE TYPE sinistro_stato AS ENUM ('aperto', 'in_lavorazione', 'liquidato', 'chiuso');
CREATE TYPE automezzo_costo_voce AS ENUM (
  'assicurazione', 'bollo', 'leasing', 'noleggio', 'pedaggi',
  'parcheggi', 'lavaggi', 'accessori', 'altro'
);
CREATE TYPE patente_tipo AS ENUM (
  'patente_b', 'patente_c', 'patente_ce', 'patente_d', 'cqc', 'adr',
  'carta_conducente', 'abilitazione', 'altro'
);

-- ── ANAGRAFICA AUTOMEZZI (§1 + dismissione §19) ──────────────────
CREATE TABLE automezzi (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codice               TEXT UNIQUE,          -- AUTO-AAAA-NNNN via trigger
  targa                TEXT,
  telaio               TEXT,                 -- VIN
  marca                TEXT NOT NULL,
  modello              TEXT NOT NULL,
  versione             TEXT,
  categoria            automezzo_categoria NOT NULL DEFAULT 'autovettura',
  alimentazione        automezzo_alimentazione,
  classe_euro          TEXT,
  anno_immatricolazione INT,
  data_acquisto        DATE,
  acquisizione         automezzo_acquisizione NOT NULL DEFAULT 'acquisto',
  proprietario         TEXT,
  centro_costo         TEXT,
  cantiere_id          UUID REFERENCES cantieri(id) ON DELETE SET NULL,
  sede                 TEXT,
  stato                automezzo_stato NOT NULL DEFAULT 'disponibile',
  km_attuali           INT NOT NULL DEFAULT 0,
  -- Dismissione (§19)
  dismesso_il          DATE,
  dismissione_tipo     automezzo_dismissione,
  dismissione_valore   NUMERIC(12,2),
  dismissione_note     TEXT,
  note                 TEXT,
  attivo               BOOLEAN NOT NULL DEFAULT true,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by           UUID REFERENCES user_profiles(id),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by           UUID REFERENCES user_profiles(id)
);

ALTER TABLE automezzi ADD COLUMN ricerca tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(codice,'') || ' ' || coalesce(targa,'') || ' ' ||
      coalesce(marca,'') || ' ' || coalesce(modello,'') || ' ' ||
      coalesce(centro_costo,'')
    )
  ) STORED;

CREATE INDEX idx_automezzi_ricerca ON automezzi USING GIN (ricerca);
CREATE INDEX idx_automezzi_stato ON automezzi (stato, attivo);
CREATE UNIQUE INDEX idx_automezzi_targa ON automezzi (targa) WHERE targa IS NOT NULL;

CREATE OR REPLACE FUNCTION automezzo_set_codice()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.codice := genera_codice('AUTO');
  RETURN NEW;
END;
$$;
CREATE TRIGGER automezzi_set_codice
  BEFORE INSERT ON automezzi
  FOR EACH ROW WHEN (NEW.codice IS NULL)
  EXECUTE FUNCTION automezzo_set_codice();

-- Dismissione derivata: stato dismesso → data; il mezzo esce dal parco.
CREATE OR REPLACE FUNCTION automezzo_stato_derivati()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.stato = 'dismesso' AND OLD.stato IS DISTINCT FROM 'dismesso'
     AND NEW.dismesso_il IS NULL THEN
    NEW.dismesso_il := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER automezzi_stato_derivati
  BEFORE UPDATE OF stato ON automezzi
  FOR EACH ROW EXECUTE FUNCTION automezzo_stato_derivati();

-- ── ASSEGNAZIONI (§2) ────────────────────────────────────────────
CREATE TABLE automezzi_assegnazioni (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automezzo_id  UUID NOT NULL REFERENCES automezzi(id) ON DELETE CASCADE,
  dipendente_id UUID REFERENCES dipendenti(id) ON DELETE SET NULL,
  assegnatario  TEXT,                 -- se non in HR
  reparto       TEXT,
  cantiere_id   UUID REFERENCES cantieri(id) ON DELETE SET NULL,
  data_inizio   DATE NOT NULL DEFAULT CURRENT_DATE,
  data_fine     DATE,
  motivo        TEXT,
  km_iniziali   INT,
  km_finali     INT,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES user_profiles(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_automezzi_assegnazioni ON automezzi_assegnazioni (automezzo_id, data_inizio DESC);

-- ── MANUTENZIONI (§5) ────────────────────────────────────────────
CREATE TABLE automezzi_manutenzioni (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automezzo_id     UUID NOT NULL REFERENCES automezzi(id) ON DELETE CASCADE,
  tipo             manutenzione_tipo NOT NULL DEFAULT 'ordinaria',
  categoria        TEXT,              -- tagliando, olio, freni, carrozzeria…
  descrizione      TEXT NOT NULL,
  data             DATE NOT NULL DEFAULT CURRENT_DATE,
  officina         TEXT,
  km               INT,
  ore_fermo        NUMERIC(6,1),
  costo_manodopera NUMERIC(12,2),
  costo_materiali  NUMERIC(12,2),
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_automezzi_manutenzioni ON automezzi_manutenzioni (automezzo_id, data DESC);

-- ── PNEUMATICI (§6) ──────────────────────────────────────────────
CREATE TABLE automezzi_pneumatici (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automezzo_id       UUID NOT NULL REFERENCES automezzi(id) ON DELETE CASCADE,
  tipologia          TEXT NOT NULL,   -- estivi, invernali, 4 stagioni
  misura             TEXT,
  marca              TEXT,
  data_installazione DATE NOT NULL DEFAULT CURRENT_DATE,
  km_installazione   INT,
  montati            BOOLEAN NOT NULL DEFAULT true,
  note               TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by         UUID REFERENCES user_profiles(id),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by         UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_automezzi_pneumatici ON automezzi_pneumatici (automezzo_id);

-- ── RIFORNIMENTI (§7) — aggiornano i km del mezzo ────────────────
CREATE TABLE automezzi_rifornimenti (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automezzo_id  UUID NOT NULL REFERENCES automezzi(id) ON DELETE CASCADE,
  data          DATE NOT NULL DEFAULT CURRENT_DATE,
  conducente    TEXT,
  litri         NUMERIC(8,2) NOT NULL,
  costo         NUMERIC(10,2) NOT NULL,
  fornitore     TEXT,
  carta         TEXT,
  km            INT,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES user_profiles(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_automezzi_rifornimenti ON automezzi_rifornimenti (automezzo_id, data DESC);

CREATE OR REPLACE FUNCTION automezzo_aggiorna_km()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.km IS NOT NULL THEN
    UPDATE automezzi SET km_attuali = NEW.km
    WHERE id = NEW.automezzo_id AND km_attuali < NEW.km;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER automezzi_rifornimenti_km
  AFTER INSERT OR UPDATE OF km ON automezzi_rifornimenti
  FOR EACH ROW EXECUTE FUNCTION automezzo_aggiorna_km();

-- ── UTILIZZI (§8) ────────────────────────────────────────────────
CREATE TABLE automezzi_utilizzi (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automezzo_id UUID NOT NULL REFERENCES automezzi(id) ON DELETE CASCADE,
  conducente   TEXT,
  data         DATE NOT NULL DEFAULT CURRENT_DATE,
  destinazione TEXT,
  cantiere_id  UUID REFERENCES cantieri(id) ON DELETE SET NULL,
  motivo       TEXT,
  km_iniziali  INT,
  km_finali    INT,
  ore_motore   NUMERIC(7,1),
  anomalie     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_automezzi_utilizzi ON automezzi_utilizzi (automezzo_id, data DESC);

-- ── SINISTRI (§9) ────────────────────────────────────────────────
CREATE TABLE automezzi_sinistri (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automezzo_id     UUID NOT NULL REFERENCES automezzi(id) ON DELETE CASCADE,
  data             DATE NOT NULL DEFAULT CURRENT_DATE,
  luogo            TEXT,
  conducente       TEXT,
  descrizione      TEXT NOT NULL,
  controparte      TEXT,
  assicurazione    TEXT,
  pratica          TEXT,
  stato            sinistro_stato NOT NULL DEFAULT 'aperto',
  importo_liquidato NUMERIC(12,2),
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_automezzi_sinistri ON automezzi_sinistri (automezzo_id, stato);

-- ── MULTE (§10) ──────────────────────────────────────────────────
CREATE TABLE automezzi_multe (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automezzo_id    UUID NOT NULL REFERENCES automezzi(id) ON DELETE CASCADE,
  data            DATE NOT NULL DEFAULT CURRENT_DATE,
  ente            TEXT,
  importo         NUMERIC(10,2) NOT NULL DEFAULT 0,
  conducente      TEXT,
  pagata          BOOLEAN NOT NULL DEFAULT false,
  ricorso         BOOLEAN NOT NULL DEFAULT false,
  punti_decurtati INT,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES user_profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_automezzi_multe ON automezzi_multe (automezzo_id, pagata);

-- ── COSTI ANALITICI (§11) — riservati ad admin/manager ───────────
CREATE TABLE automezzi_costi (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automezzo_id UUID NOT NULL REFERENCES automezzi(id) ON DELETE CASCADE,
  voce         automezzo_costo_voce NOT NULL DEFAULT 'altro',
  descrizione  TEXT NOT NULL,
  importo      NUMERIC(12,2) NOT NULL DEFAULT 0,
  data         DATE NOT NULL DEFAULT CURRENT_DATE,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_automezzi_costi ON automezzi_costi (automezzo_id, voce);

-- ── ATTREZZATURE INSTALLATE (§15) + RICAMBI (§16) ────────────────
CREATE TABLE automezzi_attrezzature (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automezzo_id UUID NOT NULL REFERENCES automezzi(id) ON DELETE CASCADE,
  descrizione  TEXT NOT NULL,       -- gru, verricello, cassone, sponda…
  matricola    TEXT,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_automezzi_attrezzature ON automezzi_attrezzature (automezzo_id);

CREATE TABLE automezzi_ricambi (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  descrizione  TEXT NOT NULL,
  codice       TEXT,
  quantita     NUMERIC(10,2) NOT NULL DEFAULT 0,
  fornitore_id UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  automezzo_id UUID REFERENCES automezzi(id) ON DELETE SET NULL,  -- se installato
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES user_profiles(id)
);

-- ── PATENTI E ABILITAZIONI CONDUCENTI (§14, aggancio HR) ─────────
-- Scadenza → scadenze_moduli automatica (visita medica, CQC, ADR…).
CREATE TABLE dipendenti_patenti (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dipendente_id UUID NOT NULL REFERENCES dipendenti(id) ON DELETE CASCADE,
  tipo          patente_tipo NOT NULL DEFAULT 'patente_b',
  numero        TEXT,
  scadenza      DATE,
  punti         INT,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES user_profiles(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_dipendenti_patenti ON dipendenti_patenti (dipendente_id);

CREATE OR REPLACE FUNCTION patente_sync_scadenza()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_nome TEXT;
BEGIN
  DELETE FROM scadenze_moduli
  WHERE entita = 'dipendenti_patenti' AND entita_id = NEW.id AND stato = 'aperta';

  IF NEW.scadenza IS NOT NULL AND NEW.scadenza >= CURRENT_DATE THEN
    SELECT trim(nome || ' ' || COALESCE(cognome, '')) INTO v_nome
    FROM dipendenti WHERE id = NEW.dipendente_id;
    INSERT INTO scadenze_moduli
      (modulo, entita, entita_id, tipo, descrizione, data_scadenza,
       azione_url, solo_manager, created_by)
    VALUES
      ('automezzi', 'dipendenti_patenti', NEW.id,
       'Scadenza ' || replace(NEW.tipo::text, '_', ' '),
       COALESCE(v_nome, 'Conducente') || COALESCE(' — ' || NEW.numero, ''),
       NEW.scadenza, '/automezzi', true, NEW.created_by);
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER dipendenti_patenti_sync_scadenza
  AFTER INSERT OR UPDATE OF scadenza ON dipendenti_patenti
  FOR EACH ROW EXECUTE FUNCTION patente_sync_scadenza();

-- ── Cross-modulo: la FK differita di cantiere_mezzi ora si chiude ─
ALTER TABLE cantiere_mezzi
  ADD CONSTRAINT fk_cantiere_mezzi_automezzo
  FOREIGN KEY (automezzo_id) REFERENCES automezzi(id) ON DELETE SET NULL;

-- ── Collegamento attività ────────────────────────────────────────
ALTER TABLE attivita ADD COLUMN automezzo_id UUID REFERENCES automezzi(id) ON DELETE CASCADE;
CREATE INDEX idx_attivita_automezzo ON attivita (automezzo_id);

-- ── Trigger comuni ───────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'automezzi','automezzi_assegnazioni','automezzi_manutenzioni',
    'automezzi_pneumatici','automezzi_rifornimenti','automezzi_utilizzi',
    'automezzi_sinistri','automezzi_multe','automezzi_costi',
    'automezzi_attrezzature','automezzi_ricambi','dipendenti_patenti'
  ] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    EXECUTE format('CREATE TRIGGER %1$s_freeze_autore BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION freeze_created_by()', t);
    EXECUTE format('CREATE TRIGGER %1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
  END LOOP;
END $$;

-- ═══ RLS ═════════════════════════════════════════════════════════
-- Operativi: team con licenza. Costi analitici e patenti (dati personali
-- HR): SOLO admin/manager. Delete solo admin.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'automezzi','automezzi_assegnazioni','automezzi_manutenzioni',
    'automezzi_pneumatici','automezzi_rifornimenti','automezzi_utilizzi',
    'automezzi_sinistri','automezzi_multe','automezzi_attrezzature',
    'automezzi_ricambi'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated
      USING (modulo_licenziato('automezzi'))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_licenziato('automezzi') AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_licenziato('automezzi')) WITH CHECK (modulo_licenziato('automezzi'))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_licenziato('automezzi') AND get_user_role() = 'admin')$f$, t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['automezzi_costi','dipendenti_patenti'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated
      USING (modulo_licenziato('automezzi') AND puo_amministrazione())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_licenziato('automezzi') AND puo_amministrazione() AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_licenziato('automezzi') AND puo_amministrazione())
      WITH CHECK (modulo_licenziato('automezzi') AND puo_amministrazione())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_licenziato('automezzi') AND get_user_role() = 'admin')$f$, t);
  END LOOP;
END $$;

-- ═══ VISTE (§12 KPI) ═════════════════════════════════════════════
-- Consumi e operatività: per il team (litri, km, consumo medio, fermi).
CREATE VIEW vw_automezzo_consumi WITH (security_invoker = true) AS
SELECT
  a.id AS automezzo_id,
  a.km_attuali,
  COALESCE(r.litri_totali, 0)::numeric(12,2) AS litri_totali,
  COALESCE(r.costo_carburante, 0)::numeric(12,2) AS costo_carburante,
  r.km_min, r.km_max,
  CASE WHEN r.km_max > r.km_min AND r.litri_totali > 0
    THEN ROUND(r.litri_totali * 100.0 / (r.km_max - r.km_min), 1)
  END AS consumo_medio_100km,
  COALESCE(m.ore_fermo, 0)::numeric(10,1) AS ore_fermo,
  COALESCE(m.n_guasti, 0)::int AS n_guasti,
  COALESCE(m.costo_manutenzione, 0)::numeric(12,2) AS costo_manutenzione
FROM automezzi a
LEFT JOIN (
  SELECT automezzo_id, SUM(litri) AS litri_totali, SUM(costo) AS costo_carburante,
         MIN(km) AS km_min, MAX(km) AS km_max
  FROM automezzi_rifornimenti GROUP BY automezzo_id
) r ON r.automezzo_id = a.id
LEFT JOIN (
  SELECT automezzo_id, SUM(COALESCE(ore_fermo, 0)) AS ore_fermo,
         COUNT(*) FILTER (WHERE tipo = 'straordinaria') AS n_guasti,
         SUM(COALESCE(costo_manodopera, 0) + COALESCE(costo_materiali, 0)) AS costo_manutenzione
  FROM automezzi_manutenzioni GROUP BY automezzo_id
) m ON m.automezzo_id = a.id
WHERE a.attivo;

-- Costo totale e costo/km: SOLO manager (comprende i costi riservati).
CREATE VIEW vw_automezzo_costo_km WITH (security_invoker = true) AS
SELECT
  a.id AS automezzo_id,
  (COALESCE(c.costi_fissi, 0) + COALESCE(r.carburante, 0)
   + COALESCE(m.manutenzione, 0) + COALESCE(mu.multe, 0))::numeric(12,2) AS costo_totale,
  COALESCE(c.costi_fissi, 0)::numeric(12,2) AS costi_fissi,
  COALESCE(r.carburante, 0)::numeric(12,2) AS carburante,
  COALESCE(m.manutenzione, 0)::numeric(12,2) AS manutenzione,
  COALESCE(mu.multe, 0)::numeric(12,2) AS multe,
  CASE WHEN r.km_percorsi > 0 THEN
    ROUND((COALESCE(c.costi_fissi, 0) + COALESCE(r.carburante, 0)
      + COALESCE(m.manutenzione, 0)) / r.km_percorsi, 3)
  END AS costo_km
FROM automezzi a
LEFT JOIN (
  SELECT automezzo_id, SUM(importo) AS costi_fissi FROM automezzi_costi GROUP BY automezzo_id
) c ON c.automezzo_id = a.id
LEFT JOIN (
  SELECT automezzo_id, SUM(costo) AS carburante,
         NULLIF(MAX(km) - MIN(km), 0) AS km_percorsi
  FROM automezzi_rifornimenti GROUP BY automezzo_id
) r ON r.automezzo_id = a.id
LEFT JOIN (
  SELECT automezzo_id,
         SUM(COALESCE(costo_manodopera, 0) + COALESCE(costo_materiali, 0)) AS manutenzione
  FROM automezzi_manutenzioni GROUP BY automezzo_id
) m ON m.automezzo_id = a.id
LEFT JOIN (
  SELECT automezzo_id, SUM(importo) AS multe FROM automezzi_multe GROUP BY automezzo_id
) mu ON mu.automezzo_id = a.id
WHERE a.attivo AND puo_amministrazione();

GRANT SELECT ON vw_automezzo_consumi, vw_automezzo_costo_km TO authenticated;

-- ═══ Ricerca globale: + automezzi ════════════════════════════════
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
    UNION ALL
    SELECT 'cantiere', ca.id,
           ca.codice || ' · ' || ca.denominazione,
           COALESCE(ca.citta, ca.categoria_lavori, '')
    FROM cantieri ca
    WHERE ca.attivo AND ca.ricerca @@ websearch_to_tsquery('simple', q)
    UNION ALL
    SELECT 'automezzo', au.id,
           COALESCE(au.targa, au.codice) || ' · ' || au.marca || ' ' || au.modello,
           COALESCE(au.centro_costo, au.sede, '')
    FROM automezzi au
    WHERE au.attivo AND au.ricerca @@ websearch_to_tsquery('simple', q)
  ) t
  LIMIT 20
$$;

-- ═══ Hardening nuove funzioni ═════════════════════════════════════
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'automezzo_set_codice()', 'automezzo_stato_derivati()',
    'automezzo_aggiorna_km()', 'patente_sync_scadenza()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
END $$;
