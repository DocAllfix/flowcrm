-- ═══════════════════════════════════════════════════════════════════
-- F1.3 — Trasversali: audit_log (immutabile), notifiche, allegati
-- ═══════════════════════════════════════════════════════════════════

-- ── AUDIT LOG — solo INSERT, mai UPDATE/DELETE per nessun ruolo ───
CREATE TABLE audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entita       TEXT NOT NULL,          -- 'organizzazione','deal','fattura',...
  entita_id    UUID NOT NULL,
  azione       TEXT NOT NULL,          -- 'insert' | 'update' | 'delete'
  diff         JSONB NOT NULL DEFAULT '{}',
  eseguito_da  UUID REFERENCES user_profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_entita ON audit_log(entita, entita_id, created_at DESC);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Lettura: tutti gli autenticati (lo storico è trasparenza interna;
-- le entità amministrative avranno diff senza importi per l'operatore
-- oppure filtro per entità — rivalutato al gate F8).
CREATE POLICY "audit_log_select" ON audit_log
  FOR SELECT TO authenticated
  USING (true);

-- Scrittura: solo tramite trigger di sistema (SECURITY DEFINER).
-- Nessuna policy INSERT/UPDATE/DELETE per authenticated = negato.

-- Funzione generica di logging chiamata dai trigger delle entità.
CREATE OR REPLACE FUNCTION log_audit()
RETURNS TRIGGER AS $$
DECLARE
  v_diff JSONB := '{}';
  v_id UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_id := NEW.id;
    v_diff := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_id := NEW.id;
    -- Solo le colonne cambiate: {col: {da, a}}
    SELECT COALESCE(jsonb_object_agg(n.key, jsonb_build_object('da', o.value, 'a', n.value)), '{}')
    INTO v_diff
    FROM jsonb_each(to_jsonb(OLD)) o
    JOIN jsonb_each(to_jsonb(NEW)) n USING (key)
    WHERE o.value IS DISTINCT FROM n.value;
  ELSE
    v_id := OLD.id;
    v_diff := to_jsonb(OLD);
  END IF;

  INSERT INTO audit_log (entita, entita_id, azione, diff, eseguito_da)
  VALUES (TG_TABLE_NAME, v_id, lower(TG_OP), v_diff, auth.uid());

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION log_audit() FROM PUBLIC;

-- ── NOTIFICHE (pattern CertDesk, con realtime in F3) ─────────────
CREATE TABLE notifiche (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario_id  UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  mittente_id      UUID REFERENCES user_profiles(id),
  tipo             notifica_tipo NOT NULL DEFAULT 'info',
  titolo           TEXT NOT NULL,
  messaggio        TEXT NOT NULL,
  letta            BOOLEAN NOT NULL DEFAULT false,
  letta_at         TIMESTAMPTZ,
  azione_url       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifiche_destinatario ON notifiche(destinatario_id, letta, created_at DESC);

ALTER TABLE notifiche ENABLE ROW LEVEL SECURITY;

-- Visibili SOLO al destinatario. Nemmeno l'admin legge le notifiche altrui.
CREATE POLICY "notifiche_select" ON notifiche
  FOR SELECT TO authenticated
  USING (destinatario_id = auth.uid());

-- Il destinatario può solo marcarle lette (il trigger sotto protegge il resto).
CREATE POLICY "notifiche_update" ON notifiche
  FOR UPDATE TO authenticated
  USING (destinatario_id = auth.uid())
  WITH CHECK (destinatario_id = auth.uid());

CREATE POLICY "notifiche_delete" ON notifiche
  FOR DELETE TO authenticated
  USING (destinatario_id = auth.uid());

-- Creazione SOLO via RPC SECURITY DEFINER (pattern CertDesk):
CREATE OR REPLACE FUNCTION crea_notifica(
  p_destinatario_id UUID,
  p_tipo notifica_tipo,
  p_titolo TEXT,
  p_messaggio TEXT,
  p_azione_url TEXT DEFAULT NULL,
  p_mittente_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO notifiche (destinatario_id, mittente_id, tipo, titolo, messaggio, azione_url)
  VALUES (p_destinatario_id, COALESCE(p_mittente_id, auth.uid()), p_tipo, p_titolo, p_messaggio, p_azione_url)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION crea_notifica FROM PUBLIC;
GRANT EXECUTE ON FUNCTION crea_notifica TO authenticated;

-- Il destinatario può aggiornare solo letta/letta_at.
CREATE OR REPLACE FUNCTION protect_notifica_update()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.destinatario_id IS DISTINCT FROM OLD.destinatario_id
     OR NEW.mittente_id IS DISTINCT FROM OLD.mittente_id
     OR NEW.tipo IS DISTINCT FROM OLD.tipo
     OR NEW.titolo IS DISTINCT FROM OLD.titolo
     OR NEW.messaggio IS DISTINCT FROM OLD.messaggio
     OR NEW.azione_url IS DISTINCT FROM OLD.azione_url THEN
    RAISE EXCEPTION 'Una notifica può solo essere marcata come letta';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notifiche_protect_update
  BEFORE UPDATE ON notifiche
  FOR EACH ROW
  EXECUTE FUNCTION protect_notifica_update();

-- ── ALLEGATI (metadati; i file vivono in Storage) ────────────────
CREATE TABLE allegati (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entita           TEXT NOT NULL,     -- 'organizzazione','deal','commessa',...
  entita_id        UUID NOT NULL,
  nome_file        TEXT NOT NULL,     -- nome sanitizzato su storage
  nome_originale   TEXT NOT NULL,
  storage_path     TEXT NOT NULL UNIQUE,
  mime_type        TEXT,
  dimensione_bytes BIGINT,
  caricato_da      UUID REFERENCES user_profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_allegati_entita ON allegati(entita, entita_id);

ALTER TABLE allegati ENABLE ROW LEVEL SECURITY;

-- F1: baseline — lettura/creazione per autenticati; delete di ciò che
-- hai caricato (admin: tutto). Le restrizioni per-entità (es. allegati
-- di fatture invisibili all'operatore) arrivano con le entità stesse.
CREATE POLICY "allegati_select" ON allegati
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "allegati_insert" ON allegati
  FOR INSERT TO authenticated
  WITH CHECK (caricato_da = auth.uid());

CREATE POLICY "allegati_delete" ON allegati
  FOR DELETE TO authenticated
  USING (caricato_da = auth.uid() OR get_user_role() = 'admin');
