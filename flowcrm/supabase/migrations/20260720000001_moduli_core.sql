-- ═══════════════════════════════════════════════════════════════════
-- MODULI — Fondamenta trasversali per i moduli verticali (Gare, Cantiere,
-- Automezzi, Agenti, Poliambulatori).
--   1. moduli_licenze + modulo_licenziato(): la licenza si applica nel DB
--      (la UI nasconde, la RLS nega — anche via API diretta).
--   2. codici_progressivi + genera_codice(): numerazione PREFISSO-AAAA-NNNN
--      race-safe per qualunque entità modulo (row-lock su contatore).
--   3. scadenze_moduli + processa_scadenze_moduli(): scadenzario generico
--      (DURC, revisioni, bolli, cauzioni, tarature…) con notifiche a soglie
--      [30,7,1,0], idempotente via notifiche_scadenza_inviate (pattern F10).
--   4. approvazioni: workflow autorizzativo generico (richiesta → approva/
--      rifiuta di admin/manager, con notifiche) usato da tutti i moduli.
--   5. allegati.categoria/sottocategoria: archivi documentali organizzati.
-- ═══════════════════════════════════════════════════════════════════

-- ── 1. LICENZE MODULI ────────────────────────────────────────────
CREATE TABLE moduli_licenze (
  slug        TEXT PRIMARY KEY,          -- 'gare','cantiere','automezzi','agenti','poliambulatori'
  attivo      BOOLEAN NOT NULL DEFAULT true,
  attivato_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE moduli_licenze ENABLE ROW LEVEL SECURITY;

-- Lettura: tutti gli autenticati (il frontend mostra i moduli licenziati).
-- Scrittura: NESSUNA policy → solo service_role (l'installer/upsell).
CREATE POLICY "moduli_licenze_select" ON moduli_licenze
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL);

-- Helper per le policy RLS delle tabelle modulo. SECURITY DEFINER (come
-- get_user_role/puo_amministrazione) + search_path fisso.
CREATE OR REPLACE FUNCTION modulo_licenziato(p_slug TEXT)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, public AS $$
  SELECT EXISTS (SELECT 1 FROM moduli_licenze WHERE slug = p_slug AND attivo)
$$;
REVOKE ALL ON FUNCTION modulo_licenziato(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION modulo_licenziato(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION modulo_licenziato(TEXT) TO authenticated;

-- ── 2. CODICI PROGRESSIVI GENERICI ───────────────────────────────
-- Contatore per prefisso+anno: l'INSERT ON CONFLICT prende il row-lock →
-- race-safe senza advisory lock, nessun MAX() sulla tabella di dominio.
CREATE TABLE codici_progressivi (
  prefisso TEXT NOT NULL,
  anno     INT  NOT NULL,
  ultimo   INT  NOT NULL DEFAULT 0,
  PRIMARY KEY (prefisso, anno)
);

ALTER TABLE codici_progressivi ENABLE ROW LEVEL SECURITY;
-- Nessuna policy: si passa SOLO da genera_codice().

CREATE OR REPLACE FUNCTION genera_codice(p_prefisso TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  -- Anno in fuso Europe/Rome (stessa regola di genera_codice_commessa)
  v_anno INT := EXTRACT(YEAR FROM (NOW() AT TIME ZONE 'Europe/Rome'));
  v_n INT;
BEGIN
  INSERT INTO codici_progressivi (prefisso, anno, ultimo)
  VALUES (p_prefisso, v_anno, 1)
  ON CONFLICT (prefisso, anno)
  DO UPDATE SET ultimo = codici_progressivi.ultimo + 1
  RETURNING ultimo INTO v_n;
  RETURN p_prefisso || '-' || v_anno || '-' || LPAD(v_n::TEXT, 4, '0');
END;
$$;
-- Chiamata solo dai trigger delle entità modulo (girano come owner):
REVOKE ALL ON FUNCTION genera_codice(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION genera_codice(TEXT) FROM anon;
REVOKE ALL ON FUNCTION genera_codice(TEXT) FROM authenticated;

-- ── 3. SCADENZARIO GENERICO DEI MODULI ───────────────────────────
CREATE TYPE scadenza_modulo_stato AS ENUM ('aperta', 'completata', 'annullata');

CREATE TABLE scadenze_moduli (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo        TEXT NOT NULL,           -- slug del modulo proprietario
  entita        TEXT NOT NULL,           -- 'automezzi','cantiere_imprese',...
  entita_id     UUID NOT NULL,
  tipo          TEXT NOT NULL,           -- 'DURC','revisione','bollo','cauzione',...
  descrizione   TEXT NOT NULL,
  data_scadenza DATE NOT NULL,
  stato         scadenza_modulo_stato NOT NULL DEFAULT 'aperta',
  completata_at DATE,
  azione_url    TEXT,                    -- pagina da aprire dalla notifica
  solo_manager  BOOLEAN NOT NULL DEFAULT false,  -- scadenza economica/riservata
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by    UUID REFERENCES user_profiles(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by    UUID REFERENCES user_profiles(id)
);

CREATE INDEX idx_scadenze_moduli_data ON scadenze_moduli (data_scadenza, stato);
CREATE INDEX idx_scadenze_moduli_entita ON scadenze_moduli (entita, entita_id);
CREATE INDEX idx_scadenze_moduli_modulo ON scadenze_moduli (modulo, stato);

CREATE TRIGGER scadenze_moduli_updated_at
  BEFORE UPDATE ON scadenze_moduli FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER scadenze_moduli_freeze_autore
  BEFORE UPDATE ON scadenze_moduli FOR EACH ROW EXECUTE FUNCTION freeze_created_by();
CREATE TRIGGER scadenze_moduli_audit
  AFTER INSERT OR UPDATE OR DELETE ON scadenze_moduli FOR EACH ROW EXECUTE FUNCTION log_audit();

-- completata_at derivato dallo stato (pattern attivita_completata_at)
CREATE OR REPLACE FUNCTION scadenza_modulo_completata_at()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.stato = 'completata' AND (OLD.stato IS DISTINCT FROM 'completata') THEN
    NEW.completata_at := CURRENT_DATE;
  ELSIF NEW.stato <> 'completata' THEN
    NEW.completata_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER scadenze_moduli_set_completata
  BEFORE INSERT OR UPDATE OF stato ON scadenze_moduli
  FOR EACH ROW EXECUTE FUNCTION scadenza_modulo_completata_at();

ALTER TABLE scadenze_moduli ENABLE ROW LEVEL SECURITY;

-- Visibilità: modulo licenziato + (scadenza riservata → solo admin/manager).
CREATE POLICY "scadenze_moduli_select" ON scadenze_moduli
  FOR SELECT TO authenticated
  USING (
    modulo_licenziato(modulo)
    AND (NOT solo_manager OR puo_amministrazione())
  );
CREATE POLICY "scadenze_moduli_insert" ON scadenze_moduli
  FOR INSERT TO authenticated
  WITH CHECK (modulo_licenziato(modulo) AND created_by = auth.uid());
CREATE POLICY "scadenze_moduli_update" ON scadenze_moduli
  FOR UPDATE TO authenticated
  USING (modulo_licenziato(modulo) AND (NOT solo_manager OR puo_amministrazione()))
  WITH CHECK (modulo_licenziato(modulo));
CREATE POLICY "scadenze_moduli_delete" ON scadenze_moduli
  FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- Notifiche a soglie [30,7,1,0] — stessa idempotenza di processa_scadenze
-- (tracking in notifiche_scadenza_inviate, soglia 0 = oggi O già scaduto).
CREATE OR REPLACE FUNCTION processa_scadenze_moduli()
RETURNS INT
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  soglie INT[] := ARRAY[30, 7, 1, 0];
  soglia INT;
  rec RECORD;
  destinatari UUID[];
  dest UUID;
  n_create INT := 0;
BEGIN
  -- Destinatari calcolati UNA volta; senza admin/manager attivi si esce
  -- subito (prima del tracking, per non bruciare l'idempotenza).
  SELECT array_agg(id) INTO destinatari
  FROM user_profiles WHERE ruolo IN ('admin', 'manager') AND attivo;
  IF destinatari IS NULL THEN RETURN 0; END IF;

  FOREACH soglia IN ARRAY soglie LOOP
    FOR rec IN
      SELECT sm.id, sm.modulo, sm.tipo, sm.descrizione, sm.data_scadenza,
             sm.azione_url, sm.solo_manager,
             (sm.data_scadenza - CURRENT_DATE) AS gg
      FROM scadenze_moduli sm
      WHERE sm.stato = 'aperta'
        AND modulo_licenziato(sm.modulo)
        AND ((soglia > 0 AND (sm.data_scadenza - CURRENT_DATE) = soglia)
          OR (soglia = 0 AND (sm.data_scadenza - CURRENT_DATE) <= 0))
    LOOP
      INSERT INTO notifiche_scadenza_inviate (entita, entita_id, giorni_soglia)
      VALUES ('scadenza_modulo', rec.id, soglia)
      ON CONFLICT DO NOTHING;
      IF NOT FOUND THEN CONTINUE; END IF;

      FOREACH dest IN ARRAY destinatari LOOP
        PERFORM crea_notifica(
          dest,
          CASE WHEN soglia = 0 THEN 'warning' ELSE 'info' END::notifica_tipo,
          CASE WHEN soglia = 0 AND rec.gg < 0 THEN 'Scadenza superata: ' || rec.tipo
               WHEN soglia = 0 THEN 'Scadenza oggi: ' || rec.tipo
               ELSE rec.tipo || ' tra ' || soglia || ' giorni' END,
          rec.descrizione,
          rec.azione_url
        );
        n_create := n_create + 1;
      END LOOP;
    END LOOP;
  END LOOP;

  RETURN n_create;
END;
$$;
REVOKE ALL ON FUNCTION processa_scadenze_moduli() FROM PUBLIC;
REVOKE ALL ON FUNCTION processa_scadenze_moduli() FROM anon;
REVOKE ALL ON FUNCTION processa_scadenze_moduli() FROM authenticated;
GRANT EXECUTE ON FUNCTION processa_scadenze_moduli() TO service_role;

-- Cron giornaliero alle 06:10 UTC (dopo processa_scadenze delle 06:00)
SELECT cron.unschedule('processa-scadenze-moduli-giornaliero')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'processa-scadenze-moduli-giornaliero');

SELECT cron.schedule(
  'processa-scadenze-moduli-giornaliero',
  '10 6 * * *',
  $$SELECT processa_scadenze_moduli()$$
);

-- ── 4. WORKFLOW AUTORIZZATIVI GENERICO ───────────────────────────
CREATE TYPE approvazione_stato AS ENUM ('richiesta', 'approvata', 'rifiutata', 'annullata');

CREATE TABLE approvazioni (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  modulo         TEXT NOT NULL,
  entita         TEXT NOT NULL,
  entita_id      UUID NOT NULL,
  tipo_richiesta TEXT NOT NULL,        -- 'go_no_go','sconto','nota_spese','sal',...
  descrizione    TEXT NOT NULL,
  dati           JSONB NOT NULL DEFAULT '{}',
  stato          approvazione_stato NOT NULL DEFAULT 'richiesta',
  richiedente_id UUID NOT NULL REFERENCES user_profiles(id),
  approvatore_id UUID REFERENCES user_profiles(id),
  motivazione    TEXT,
  decisa_at      TIMESTAMPTZ,
  azione_url     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_approvazioni_entita ON approvazioni (entita, entita_id);
CREATE INDEX idx_approvazioni_stato ON approvazioni (stato, created_at DESC);

CREATE TRIGGER approvazioni_updated_at
  BEFORE UPDATE ON approvazioni FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER approvazioni_audit
  AFTER INSERT OR UPDATE OR DELETE ON approvazioni FOR EACH ROW EXECUTE FUNCTION log_audit();

-- Transizioni governate: solo admin/manager decide; il richiedente può solo
-- annullare la propria richiesta ancora pendente. approvatore_id/decisa_at
-- derivati qui (non falsificabili dal client).
CREATE OR REPLACE FUNCTION approvazione_transizione()
RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.stato IS DISTINCT FROM OLD.stato THEN
    IF OLD.stato <> 'richiesta' THEN
      RAISE EXCEPTION 'Una richiesta già decisa non è modificabile';
    END IF;
    IF NEW.stato IN ('approvata', 'rifiutata') THEN
      IF NOT puo_amministrazione() THEN
        RAISE EXCEPTION 'Solo admin o manager possono decidere una richiesta';
      END IF;
      NEW.approvatore_id := auth.uid();
      NEW.decisa_at := NOW();
    ELSIF NEW.stato = 'annullata' THEN
      IF OLD.richiedente_id <> auth.uid() AND NOT puo_amministrazione() THEN
        RAISE EXCEPTION 'Solo il richiedente può annullare la propria richiesta';
      END IF;
    END IF;
  END IF;
  -- Il richiedente non si riscrive
  NEW.richiedente_id := OLD.richiedente_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER approvazioni_transizione
  BEFORE UPDATE ON approvazioni
  FOR EACH ROW EXECUTE FUNCTION approvazione_transizione();

-- Notifiche: nuova richiesta → admin/manager; decisione → richiedente.
CREATE OR REPLACE FUNCTION approvazione_notifica()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  dest UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    FOR dest IN
      SELECT id FROM user_profiles WHERE ruolo IN ('admin','manager') AND attivo
    LOOP
      IF dest <> NEW.richiedente_id THEN
        PERFORM crea_notifica(
          dest, 'info'::notifica_tipo,
          'Richiesta di approvazione: ' || NEW.tipo_richiesta,
          NEW.descrizione, NEW.azione_url, NEW.richiedente_id
        );
      END IF;
    END LOOP;
  ELSIF NEW.stato IN ('approvata','rifiutata') AND OLD.stato = 'richiesta' THEN
    PERFORM crea_notifica(
      NEW.richiedente_id,
      CASE WHEN NEW.stato = 'approvata' THEN 'success' ELSE 'warning' END::notifica_tipo,
      CASE WHEN NEW.stato = 'approvata' THEN 'Richiesta approvata' ELSE 'Richiesta rifiutata' END,
      NEW.descrizione || COALESCE(' — ' || NEW.motivazione, ''),
      NEW.azione_url, NEW.approvatore_id
    );
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER approvazioni_notifica
  AFTER INSERT OR UPDATE OF stato ON approvazioni
  FOR EACH ROW EXECUTE FUNCTION approvazione_notifica();

ALTER TABLE approvazioni ENABLE ROW LEVEL SECURITY;

CREATE POLICY "approvazioni_select" ON approvazioni
  FOR SELECT TO authenticated
  USING (modulo_licenziato(modulo));
CREATE POLICY "approvazioni_insert" ON approvazioni
  FOR INSERT TO authenticated
  WITH CHECK (modulo_licenziato(modulo) AND richiedente_id = auth.uid());
CREATE POLICY "approvazioni_update" ON approvazioni
  FOR UPDATE TO authenticated
  USING (modulo_licenziato(modulo))
  WITH CHECK (modulo_licenziato(modulo));
CREATE POLICY "approvazioni_delete" ON approvazioni
  FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- ── 5. ALLEGATI CATEGORIZZATI ────────────────────────────────────
ALTER TABLE allegati ADD COLUMN IF NOT EXISTS categoria TEXT;
ALTER TABLE allegati ADD COLUMN IF NOT EXISTS sottocategoria TEXT;
CREATE INDEX IF NOT EXISTS idx_allegati_categoria ON allegati (entita, entita_id, categoria);

-- ── Hardening delle nuove funzioni-trigger ───────────────────────
REVOKE ALL ON FUNCTION scadenza_modulo_completata_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION scadenza_modulo_completata_at() FROM anon;
REVOKE ALL ON FUNCTION scadenza_modulo_completata_at() FROM authenticated;
REVOKE ALL ON FUNCTION approvazione_transizione() FROM PUBLIC;
REVOKE ALL ON FUNCTION approvazione_transizione() FROM anon;
REVOKE ALL ON FUNCTION approvazione_transizione() FROM authenticated;
REVOKE ALL ON FUNCTION approvazione_notifica() FROM PUBLIC;
REVOKE ALL ON FUNCTION approvazione_notifica() FROM anon;
REVOKE ALL ON FUNCTION approvazione_notifica() FROM authenticated;
