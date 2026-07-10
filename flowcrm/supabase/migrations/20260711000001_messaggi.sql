-- ═══════════════════════════════════════════════════════════════════
-- F6.1 — Collaborazione: feed commenti per record + canale team
-- Un'unica tabella polimorfica:
--   entita='deals'|'organizzazioni'|'commesse' + entita_id → feed del record
--   entita='team' + entita_id IS NULL                      → canale generale
-- Menzioni (@utente) → notifica automatica via trigger.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE messaggi (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entita      TEXT NOT NULL,
  entita_id   UUID,                 -- NULL solo per il canale 'team'
  autore_id   UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  testo       TEXT NOT NULL CHECK (char_length(testo) BETWEEN 1 AND 5000),
  allegato_id UUID REFERENCES allegati(id) ON DELETE SET NULL,
  menzioni    UUID[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- il canale team non ha entita_id; ogni altro feed ce l'ha
  CHECK ((entita = 'team' AND entita_id IS NULL) OR (entita <> 'team' AND entita_id IS NOT NULL))
);

CREATE INDEX idx_messaggi_feed ON messaggi (entita, entita_id, created_at);

ALTER TABLE messaggi ENABLE ROW LEVEL SECURITY;

-- Feed CRM + canale team leggibili/scrivibili da tutti gli autenticati.
-- (I feed su entità amministrative non esistono in v1: la chat è su
--  deal/organizzazione/commessa/team, non su fatture.)
CREATE POLICY "messaggi_select" ON messaggi FOR SELECT TO authenticated USING (true);
CREATE POLICY "messaggi_insert" ON messaggi FOR INSERT TO authenticated
  WITH CHECK (autore_id = auth.uid());
-- Nessun UPDATE (niente edit in v1). Delete solo del proprio messaggio o admin.
CREATE POLICY "messaggi_delete" ON messaggi FOR DELETE TO authenticated
  USING (autore_id = auth.uid() OR get_user_role() = 'admin');

-- ── Trigger: menzioni → notifica ─────────────────────────────────
CREATE OR REPLACE FUNCTION notifica_menzioni()
RETURNS TRIGGER AS $$
DECLARE
  uid UUID;
  autore_nome TEXT;
  contesto TEXT;
BEGIN
  SELECT nome INTO autore_nome FROM user_profiles WHERE id = NEW.autore_id;
  contesto := CASE NEW.entita
    WHEN 'team' THEN 'nel canale del team'
    ELSE 'in un commento'
  END;

  FOREACH uid IN ARRAY NEW.menzioni LOOP
    IF uid <> NEW.autore_id THEN
      INSERT INTO notifiche (destinatario_id, mittente_id, tipo, titolo, messaggio, azione_url)
      VALUES (
        uid, NEW.autore_id, 'info',
        COALESCE(autore_nome, 'Qualcuno') || ' ti ha menzionato',
        left(NEW.testo, 140),
        CASE WHEN NEW.entita <> 'team'
          THEN '/' || NEW.entita || '/' || NEW.entita_id
          ELSE NULL END
      );
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER messaggi_notifica_menzioni
  AFTER INSERT ON messaggi
  FOR EACH ROW
  WHEN (array_length(NEW.menzioni, 1) > 0)
  EXECUTE FUNCTION notifica_menzioni();

-- Realtime per il feed live
ALTER PUBLICATION supabase_realtime ADD TABLE messaggi;
