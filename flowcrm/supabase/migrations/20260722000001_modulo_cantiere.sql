-- ═══════════════════════════════════════════════════════════════════
-- MODULO CANTIERE — schema completo (documento "Modulo Cantiere": 17
-- sezioni). Codice CANT-AAAA-NNNN, fasi/cronoprogramma, personale con
-- presenze, imprese/subappaltatori, mezzi, materiali, contabilità (SAL
-- → fattura attiva, misure, costi riservati), rapportini giornalieri,
-- sicurezza, qualità, ambiente. RLS: modulo_licenziato('cantiere');
-- SAL/costi/economia SOLO admin+manager. Scadenze → scadenze_moduli.
-- ═══════════════════════════════════════════════════════════════════

CREATE TYPE cantiere_stato AS ENUM (
  'pianificato', 'in_apertura', 'attivo', 'sospeso', 'chiuso'
);
CREATE TYPE cantiere_mezzo_tipo AS ENUM (
  'macchina_operatrice', 'automezzo', 'ponteggio', 'gru', 'ple', 'utensile', 'altro'
);
CREATE TYPE cantiere_movimento_tipo AS ENUM ('ordine', 'consegna', 'consumo', 'reso');
CREATE TYPE cantiere_sal_stato AS ENUM ('bozza', 'emesso', 'fatturato', 'pagato');
CREATE TYPE cantiere_costo_tipo AS ENUM ('personale', 'materiali', 'mezzi', 'subappalti', 'altro');
CREATE TYPE cantiere_sicurezza_tipo AS ENUM (
  'sopralluogo', 'checklist', 'non_conformita', 'near_miss', 'incidente',
  'infortunio', 'prescrizione', 'verbale', 'consegna_dpi',
  'riunione_coordinamento', 'controllo_giornaliero'
);
CREATE TYPE cantiere_qualita_tipo AS ENUM ('accettazione', 'corso_opera', 'collaudo', 'prova');
CREATE TYPE cantiere_qualita_esito AS ENUM ('in_attesa', 'conforme', 'non_conforme');
CREATE TYPE cantiere_ambiente_tipo AS ENUM ('rifiuti', 'emissioni', 'scarichi', 'terre_rocce', 'rumore');
CREATE TYPE cantiere_meteo AS ENUM ('sereno', 'nuvoloso', 'pioggia', 'neve', 'vento_forte');

-- ── ANAGRAFICA CANTIERE (§1) ─────────────────────────────────────
CREATE TABLE cantieri (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codice                   TEXT UNIQUE,          -- CANT-AAAA-NNNN via trigger
  denominazione            TEXT NOT NULL,
  cliente_id               UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  committente_id           UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  stazione_appaltante_id   UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  direttore_lavori         TEXT,
  rup                      TEXT,
  cig                      TEXT,
  cup                      TEXT,
  indirizzo                TEXT,
  citta                    TEXT,
  lat                      NUMERIC(9,6),
  lng                      NUMERIC(9,6),
  data_apertura            DATE,
  data_fine_prevista       DATE,
  data_chiusura            DATE,
  stato                    cantiere_stato NOT NULL DEFAULT 'pianificato',
  importo_contrattuale     NUMERIC(14,2) NOT NULL DEFAULT 0,
  importo_lavori           NUMERIC(14,2),
  categoria_lavori         TEXT,                 -- es. OG1, OG3…
  responsabile_interno_id  UUID REFERENCES user_profiles(id),
  direttore_tecnico        TEXT,
  capocantiere_id          UUID REFERENCES user_profiles(id),
  responsabile_sicurezza   TEXT,
  commessa_id              UUID REFERENCES commesse(id) ON DELETE SET NULL,
  gara_id                  UUID REFERENCES gare(id) ON DELETE SET NULL,
  note                     TEXT,
  attivo                   BOOLEAN NOT NULL DEFAULT true,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by               UUID REFERENCES user_profiles(id),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by               UUID REFERENCES user_profiles(id)
);

ALTER TABLE cantieri ADD COLUMN ricerca tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple',
      coalesce(codice,'') || ' ' || coalesce(denominazione,'') || ' ' ||
      coalesce(citta,'') || ' ' || coalesce(cig,'') || ' ' ||
      coalesce(categoria_lavori,'')
    )
  ) STORED;

CREATE INDEX idx_cantieri_ricerca ON cantieri USING GIN (ricerca);
CREATE INDEX idx_cantieri_stato ON cantieri (stato, attivo);
CREATE INDEX idx_cantieri_cliente ON cantieri (cliente_id);

CREATE OR REPLACE FUNCTION cantiere_set_codice()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.codice := genera_codice('CANT');
  RETURN NEW;
END;
$$;
CREATE TRIGGER cantieri_set_codice
  BEFORE INSERT ON cantieri
  FOR EACH ROW WHEN (NEW.codice IS NULL)
  EXECUTE FUNCTION cantiere_set_codice();

-- data_chiusura derivata dallo stato 'chiuso'
CREATE OR REPLACE FUNCTION cantiere_stato_derivati()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.stato = 'chiuso' AND OLD.stato IS DISTINCT FROM 'chiuso'
     AND NEW.data_chiusura IS NULL THEN
    NEW.data_chiusura := CURRENT_DATE;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER cantieri_stato_derivati
  BEFORE UPDATE OF stato ON cantieri
  FOR EACH ROW EXECUTE FUNCTION cantiere_stato_derivati();

-- ── PIANIFICAZIONE (§2): fasi del cronoprogramma con dipendenze ──
CREATE TABLE cantiere_fasi (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cantiere_id UUID NOT NULL REFERENCES cantieri(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  data_inizio DATE,
  data_fine   DATE,
  dipende_da  UUID REFERENCES cantiere_fasi(id) ON DELETE SET NULL,
  avanzamento SMALLINT NOT NULL DEFAULT 0 CHECK (avanzamento BETWEEN 0 AND 100),
  ordine      INT NOT NULL DEFAULT 0,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_cantiere_fasi_cantiere ON cantiere_fasi (cantiere_id, ordine);

-- ── PERSONALE (§4) + PRESENZE ────────────────────────────────────
CREATE TABLE cantiere_personale (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cantiere_id   UUID NOT NULL REFERENCES cantieri(id) ON DELETE CASCADE,
  dipendente_id UUID REFERENCES dipendenti(id) ON DELETE SET NULL,   -- interno (HR)
  nominativo    TEXT,                                                -- esterno
  impresa_id    UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  ruolo         TEXT,
  dpi_assegnati TEXT,
  note          TEXT,
  attivo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES user_profiles(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES user_profiles(id),
  CHECK (dipendente_id IS NOT NULL OR nominativo IS NOT NULL)
);
CREATE INDEX idx_cantiere_personale_cantiere ON cantiere_personale (cantiere_id);

CREATE TABLE cantiere_presenze (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cantiere_id  UUID NOT NULL REFERENCES cantieri(id) ON DELETE CASCADE,
  personale_id UUID NOT NULL REFERENCES cantiere_personale(id) ON DELETE CASCADE,
  data         DATE NOT NULL DEFAULT CURRENT_DATE,
  ore          NUMERIC(4,1) NOT NULL DEFAULT 8,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id),
  UNIQUE (personale_id, data)
);
CREATE INDEX idx_cantiere_presenze_cantiere ON cantiere_presenze (cantiere_id, data);

-- ── IMPRESE E SUBAPPALTATORI (§5) ────────────────────────────────
CREATE TABLE cantiere_imprese (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cantiere_id       UUID NOT NULL REFERENCES cantieri(id) ON DELETE CASCADE,
  organizzazione_id UUID NOT NULL REFERENCES organizzazioni(id) ON DELETE CASCADE,
  lavorazioni       TEXT,
  importo_affidato  NUMERIC(14,2),
  referente         TEXT,
  note              TEXT,
  attivo            BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id),
  UNIQUE (cantiere_id, organizzazione_id)
);
CREATE INDEX idx_cantiere_imprese_cantiere ON cantiere_imprese (cantiere_id);

-- ── MEZZI E ATTREZZATURE (§6) ────────────────────────────────────
-- automezzo_id senza FK: il modulo Automezzi arriva in Fase 3 e la
-- aggiungerà; intanto il registro funziona da solo.
CREATE TABLE cantiere_mezzi (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cantiere_id  UUID NOT NULL REFERENCES cantieri(id) ON DELETE CASCADE,
  tipo         cantiere_mezzo_tipo NOT NULL DEFAULT 'automezzo',
  descrizione  TEXT NOT NULL,
  automezzo_id UUID,
  dal          DATE NOT NULL DEFAULT CURRENT_DATE,
  al           DATE,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_cantiere_mezzi_cantiere ON cantiere_mezzi (cantiere_id);

-- ── MATERIALI (§7): movimenti (ordine/consegna/consumo/reso) ─────
CREATE TABLE cantiere_materiali (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cantiere_id  UUID NOT NULL REFERENCES cantieri(id) ON DELETE CASCADE,
  descrizione  TEXT NOT NULL,
  movimento    cantiere_movimento_tipo NOT NULL DEFAULT 'consegna',
  quantita     NUMERIC(12,2) NOT NULL DEFAULT 0,
  unita        TEXT,
  data         DATE NOT NULL DEFAULT CURRENT_DATE,
  fornitore_id UUID REFERENCES organizzazioni(id) ON DELETE SET NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   UUID REFERENCES user_profiles(id),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by   UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_cantiere_materiali_cantiere ON cantiere_materiali (cantiere_id, descrizione);

-- ── CONTABILITÀ (§8): SAL (→ fattura), misure, costi — RISERVATI ─
CREATE TABLE cantiere_sal (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cantiere_id UUID NOT NULL REFERENCES cantieri(id) ON DELETE CASCADE,
  numero      INT NOT NULL,
  data        DATE NOT NULL DEFAULT CURRENT_DATE,
  descrizione TEXT,
  importo     NUMERIC(14,2) NOT NULL DEFAULT 0,
  stato       cantiere_sal_stato NOT NULL DEFAULT 'bozza',
  fattura_id  UUID REFERENCES fatture(id) ON DELETE SET NULL,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES user_profiles(id),
  UNIQUE (cantiere_id, numero)
);
CREATE INDEX idx_cantiere_sal_cantiere ON cantiere_sal (cantiere_id, numero);

-- Numero SAL progressivo per cantiere (race-safe con advisory lock)
CREATE OR REPLACE FUNCTION cantiere_sal_numero()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('sal-' || NEW.cantiere_id::text));
  SELECT COALESCE(MAX(numero), 0) + 1 INTO NEW.numero
  FROM cantiere_sal WHERE cantiere_id = NEW.cantiere_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER cantiere_sal_set_numero
  BEFORE INSERT ON cantiere_sal
  FOR EACH ROW WHEN (NEW.numero IS NULL OR NEW.numero = 0)
  EXECUTE FUNCTION cantiere_sal_numero();

-- Coerenza con la fattura collegata: fatturato/pagato derivati
CREATE OR REPLACE FUNCTION cantiere_sal_sync_fattura()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_stato fattura_stato;
BEGIN
  IF NEW.fattura_id IS NOT NULL AND NEW.stato IN ('bozza', 'emesso') THEN
    NEW.stato := 'fatturato';
  END IF;
  IF NEW.fattura_id IS NOT NULL THEN
    SELECT stato INTO v_stato FROM fatture WHERE id = NEW.fattura_id;
    IF v_stato = 'pagata' THEN NEW.stato := 'pagato'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER cantiere_sal_sync_fattura
  BEFORE INSERT OR UPDATE OF fattura_id, stato ON cantiere_sal
  FOR EACH ROW EXECUTE FUNCTION cantiere_sal_sync_fattura();

CREATE TABLE cantiere_misure (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cantiere_id     UUID NOT NULL REFERENCES cantieri(id) ON DELETE CASCADE,
  sal_id          UUID REFERENCES cantiere_sal(id) ON DELETE SET NULL,
  descrizione     TEXT NOT NULL,
  quantita        NUMERIC(12,3) NOT NULL DEFAULT 0,
  unita           TEXT,
  prezzo_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  data            DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID REFERENCES user_profiles(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by      UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_cantiere_misure_cantiere ON cantiere_misure (cantiere_id);

CREATE TABLE cantiere_costi (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cantiere_id UUID NOT NULL REFERENCES cantieri(id) ON DELETE CASCADE,
  tipo        cantiere_costo_tipo NOT NULL DEFAULT 'altro',
  descrizione TEXT NOT NULL,
  importo     NUMERIC(14,2) NOT NULL DEFAULT 0,
  data        DATE NOT NULL DEFAULT CURRENT_DATE,
  note        TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_cantiere_costi_cantiere ON cantiere_costi (cantiere_id, tipo);

-- ── RAPPORTINI GIORNALIERI (§9) ──────────────────────────────────
CREATE TABLE cantiere_rapportini (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cantiere_id      UUID NOT NULL REFERENCES cantieri(id) ON DELETE CASCADE,
  data             DATE NOT NULL DEFAULT CURRENT_DATE,
  capocantiere_id  UUID REFERENCES user_profiles(id),
  lavorazioni      TEXT NOT NULL,
  personale        TEXT,          -- presenti (testo libero, veloce da mobile)
  mezzi            TEXT,
  materiali        TEXT,
  meteo            cantiere_meteo,
  problemi         TEXT,
  note             TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by       UUID REFERENCES user_profiles(id),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by       UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_cantiere_rapportini_cantiere ON cantiere_rapportini (cantiere_id, data DESC);

-- ── SICUREZZA (§10) ──────────────────────────────────────────────
CREATE TABLE cantiere_eventi_sicurezza (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cantiere_id UUID NOT NULL REFERENCES cantieri(id) ON DELETE CASCADE,
  tipo        cantiere_sicurezza_tipo NOT NULL,
  data        DATE NOT NULL DEFAULT CURRENT_DATE,
  descrizione TEXT NOT NULL,
  gravita     priorita_type NOT NULL DEFAULT 'media',
  azioni      TEXT,
  chiuso      BOOLEAN NOT NULL DEFAULT false,
  chiuso_at   DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by  UUID REFERENCES user_profiles(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by  UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_cantiere_sicurezza_cantiere ON cantiere_eventi_sicurezza (cantiere_id, chiuso);

CREATE OR REPLACE FUNCTION cantiere_sicurezza_chiuso_at()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.chiuso AND NOT COALESCE(OLD.chiuso, false) THEN
    NEW.chiuso_at := CURRENT_DATE;
  ELSIF NOT NEW.chiuso THEN
    NEW.chiuso_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER cantiere_sicurezza_set_chiuso
  BEFORE INSERT OR UPDATE OF chiuso ON cantiere_eventi_sicurezza
  FOR EACH ROW EXECUTE FUNCTION cantiere_sicurezza_chiuso_at();

-- Un incidente/infortunio grave notifica subito admin+manager
CREATE OR REPLACE FUNCTION cantiere_sicurezza_notifica()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  dest UUID;
  v_codice TEXT;
BEGIN
  IF NEW.tipo IN ('incidente', 'infortunio')
     OR (NEW.tipo = 'non_conformita' AND NEW.gravita = 'critica') THEN
    SELECT codice INTO v_codice FROM cantieri WHERE id = NEW.cantiere_id;
    FOR dest IN
      SELECT id FROM user_profiles WHERE ruolo IN ('admin','manager') AND attivo
    LOOP
      PERFORM crea_notifica(
        dest, 'critical'::notifica_tipo,
        'Sicurezza cantiere ' || COALESCE(v_codice, '?') || ': ' || NEW.tipo,
        left(NEW.descrizione, 140),
        '/cantieri/' || NEW.cantiere_id,
        NEW.created_by
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER cantiere_sicurezza_notifica
  AFTER INSERT ON cantiere_eventi_sicurezza
  FOR EACH ROW EXECUTE FUNCTION cantiere_sicurezza_notifica();

-- ── QUALITÀ (§11) ────────────────────────────────────────────────
CREATE TABLE cantiere_controlli_qualita (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cantiere_id       UUID NOT NULL REFERENCES cantieri(id) ON DELETE CASCADE,
  tipo              cantiere_qualita_tipo NOT NULL,
  data              DATE NOT NULL DEFAULT CURRENT_DATE,
  descrizione       TEXT NOT NULL,
  esito             cantiere_qualita_esito NOT NULL DEFAULT 'in_attesa',
  azione_correttiva TEXT,
  approvato_dl      BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by        UUID REFERENCES user_profiles(id),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by        UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_cantiere_qualita_cantiere ON cantiere_controlli_qualita (cantiere_id);

-- ── AMBIENTE (§12) ───────────────────────────────────────────────
CREATE TABLE cantiere_registri_ambiente (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cantiere_id   UUID NOT NULL REFERENCES cantieri(id) ON DELETE CASCADE,
  tipo          cantiere_ambiente_tipo NOT NULL,
  data          DATE NOT NULL DEFAULT CURRENT_DATE,
  descrizione   TEXT NOT NULL,
  quantita      NUMERIC(12,2),
  unita         TEXT,
  formulario    TEXT,
  autorizzazione TEXT,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES user_profiles(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES user_profiles(id)
);
CREATE INDEX idx_cantiere_ambiente_cantiere ON cantiere_registri_ambiente (cantiere_id);

-- ── Collegamento attività/timeline (§13 comunicazioni) ───────────
ALTER TABLE attivita ADD COLUMN cantiere_id UUID REFERENCES cantieri(id) ON DELETE CASCADE;
CREATE INDEX idx_attivita_cantiere ON attivita (cantiere_id);

-- ── Trigger comuni ───────────────────────────────────────────────
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cantieri','cantiere_fasi','cantiere_personale','cantiere_imprese',
    'cantiere_mezzi','cantiere_materiali','cantiere_sal','cantiere_misure',
    'cantiere_costi','cantiere_rapportini','cantiere_eventi_sicurezza',
    'cantiere_controlli_qualita','cantiere_registri_ambiente'
  ] LOOP
    EXECUTE format('CREATE TRIGGER %1$s_updated_at BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
    EXECUTE format('CREATE TRIGGER %1$s_freeze_autore BEFORE UPDATE ON %1$s FOR EACH ROW EXECUTE FUNCTION freeze_created_by()', t);
    EXECUTE format('CREATE TRIGGER %1$s_audit AFTER INSERT OR UPDATE OR DELETE ON %1$s FOR EACH ROW EXECUTE FUNCTION log_audit()', t);
  END LOOP;
END $$;

-- ═══ RLS ═════════════════════════════════════════════════════════
-- Operativi: team completo con licenza. Economici (SAL, misure, costi):
-- SOLO admin/manager. Delete sempre solo admin.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'cantieri','cantiere_fasi','cantiere_personale','cantiere_presenze',
    'cantiere_imprese','cantiere_mezzi','cantiere_materiali',
    'cantiere_rapportini','cantiere_eventi_sicurezza',
    'cantiere_controlli_qualita','cantiere_registri_ambiente'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated
      USING (modulo_licenziato('cantiere'))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_licenziato('cantiere') AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_licenziato('cantiere')) WITH CHECK (modulo_licenziato('cantiere'))$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_licenziato('cantiere') AND get_user_role() = 'admin')$f$, t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['cantiere_sal','cantiere_misure','cantiere_costi'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($f$CREATE POLICY "%1$s_select" ON %1$s FOR SELECT TO authenticated
      USING (modulo_licenziato('cantiere') AND puo_amministrazione())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_insert" ON %1$s FOR INSERT TO authenticated
      WITH CHECK (modulo_licenziato('cantiere') AND puo_amministrazione() AND created_by = auth.uid())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_update" ON %1$s FOR UPDATE TO authenticated
      USING (modulo_licenziato('cantiere') AND puo_amministrazione())
      WITH CHECK (modulo_licenziato('cantiere') AND puo_amministrazione())$f$, t);
    EXECUTE format($f$CREATE POLICY "%1$s_delete" ON %1$s FOR DELETE TO authenticated
      USING (modulo_licenziato('cantiere') AND get_user_role() = 'admin')$f$, t);
  END LOOP;
END $$;

-- ═══ VISTE ═══════════════════════════════════════════════════════
-- Economia di cantiere (§8+§14): SAL emessi/pagati, costi per voce,
-- utile maturato. security_invoker → l'operatore (che non legge
-- cantiere_sal/cantiere_costi) ottiene righe vuote.
CREATE VIEW vw_cantiere_economia WITH (security_invoker = true) AS
SELECT
  c.id AS cantiere_id,
  c.importo_contrattuale,
  COALESCE(s.sal_emessi, 0)::numeric(14,2)   AS sal_emessi,
  COALESCE(s.sal_pagati, 0)::numeric(14,2)   AS sal_pagati,
  COALESCE(k.costi_personale, 0)::numeric(14,2)  AS costi_personale,
  COALESCE(k.costi_materiali, 0)::numeric(14,2)  AS costi_materiali,
  COALESCE(k.costi_mezzi, 0)::numeric(14,2)      AS costi_mezzi,
  COALESCE(k.costi_subappalti, 0)::numeric(14,2) AS costi_subappalti,
  COALESCE(k.costi_altro, 0)::numeric(14,2)      AS costi_altro,
  COALESCE(k.costi_totali, 0)::numeric(14,2)     AS costi_totali,
  (c.importo_contrattuale - COALESCE(k.costi_totali, 0))::numeric(14,2) AS utile_previsto,
  (COALESCE(s.sal_emessi, 0) - COALESCE(k.costi_totali, 0))::numeric(14,2) AS utile_maturato
FROM cantieri c
LEFT JOIN (
  SELECT cantiere_id,
         SUM(importo) FILTER (WHERE stato IN ('emesso','fatturato','pagato')) AS sal_emessi,
         SUM(importo) FILTER (WHERE stato = 'pagato') AS sal_pagati
  FROM cantiere_sal GROUP BY cantiere_id
) s ON s.cantiere_id = c.id
LEFT JOIN (
  SELECT cantiere_id,
         SUM(importo) FILTER (WHERE tipo = 'personale')  AS costi_personale,
         SUM(importo) FILTER (WHERE tipo = 'materiali')  AS costi_materiali,
         SUM(importo) FILTER (WHERE tipo = 'mezzi')      AS costi_mezzi,
         SUM(importo) FILTER (WHERE tipo = 'subappalti') AS costi_subappalti,
         SUM(importo) FILTER (WHERE tipo = 'altro')      AS costi_altro,
         SUM(importo)                                    AS costi_totali
  FROM cantiere_costi GROUP BY cantiere_id
) k ON k.cantiere_id = c.id
-- puo_amministrazione() nel WHERE: l'operatore riceve zero righe (non
-- righe azzerate) — coerente con la riservatezza di SAL/costi.
WHERE c.attivo AND puo_amministrazione();

-- KPI operativi per cantiere (§17): avanzamento, ore, sicurezza aperta.
CREATE VIEW vw_cantiere_kpi WITH (security_invoker = true) AS
SELECT
  c.id AS cantiere_id,
  COALESCE(f.avanzamento_medio, 0)::int AS avanzamento_medio,
  COALESCE(p.ore_totali, 0)::numeric(10,1) AS ore_totali,
  COALESCE(sic.eventi_aperti, 0)::int AS sicurezza_aperti,
  COALESCE(q.nc_aperte, 0)::int AS qualita_non_conformi,
  COALESCE(r.n_rapportini, 0)::int AS rapportini
FROM cantieri c
LEFT JOIN (
  SELECT cantiere_id, AVG(avanzamento) AS avanzamento_medio
  FROM cantiere_fasi GROUP BY cantiere_id
) f ON f.cantiere_id = c.id
LEFT JOIN (
  SELECT cantiere_id, SUM(ore) AS ore_totali
  FROM cantiere_presenze GROUP BY cantiere_id
) p ON p.cantiere_id = c.id
LEFT JOIN (
  SELECT cantiere_id, COUNT(*) AS eventi_aperti
  FROM cantiere_eventi_sicurezza WHERE NOT chiuso GROUP BY cantiere_id
) sic ON sic.cantiere_id = c.id
LEFT JOIN (
  SELECT cantiere_id, COUNT(*) AS nc_aperte
  FROM cantiere_controlli_qualita WHERE esito = 'non_conforme' GROUP BY cantiere_id
) q ON q.cantiere_id = c.id
LEFT JOIN (
  SELECT cantiere_id, COUNT(*) AS n_rapportini
  FROM cantiere_rapportini GROUP BY cantiere_id
) r ON r.cantiere_id = c.id
WHERE c.attivo;

GRANT SELECT ON vw_cantiere_economia, vw_cantiere_kpi TO authenticated;

-- ═══ Ricerca globale: + cantieri ═════════════════════════════════
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
  ) t
  LIMIT 20
$$;

-- ═══ Hardening nuove funzioni ═════════════════════════════════════
DO $$
DECLARE f text;
BEGIN
  FOREACH f IN ARRAY ARRAY[
    'cantiere_set_codice()', 'cantiere_stato_derivati()',
    'cantiere_sal_numero()', 'cantiere_sal_sync_fattura()',
    'cantiere_sicurezza_chiuso_at()', 'cantiere_sicurezza_notifica()'
  ] LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM anon', f);
    EXECUTE format('REVOKE ALL ON FUNCTION %s FROM authenticated', f);
  END LOOP;
END $$;
