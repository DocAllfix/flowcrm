-- ═══════════════════════════════════════════════════════════════════
-- F1.2 — user_profiles (estende auth.users) + get_user_role()
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE user_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome        TEXT NOT NULL,
  cognome     TEXT,
  ruolo       user_role NOT NULL DEFAULT 'operatore',
  avatar_url  TEXT,
  attivo      BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Helper per le policy RLS: ruolo dell'utente corrente.
-- SECURITY DEFINER per evitare ricorsione RLS su user_profiles.
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT ruolo FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Obbligatorio dopo la creazione (pattern CertDesk):
REVOKE ALL ON FUNCTION get_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Ogni utente autenticato vede i profili (serve per assegnazioni,
-- avatar in chat/notifiche); i dati sensibili NON stanno qui.
CREATE POLICY "user_profiles_select" ON user_profiles
  FOR SELECT TO authenticated
  USING (true);

-- Solo admin crea profili (la creazione utente passa da invito admin).
CREATE POLICY "user_profiles_insert" ON user_profiles
  FOR INSERT TO authenticated
  WITH CHECK (get_user_role() = 'admin');

-- Update: admin su tutti; l'utente su se stesso MA senza cambiare
-- ruolo/attivo (anti privilege-escalation, verificato dal trigger sotto).
CREATE POLICY "user_profiles_update_admin" ON user_profiles
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'admin')
  WITH CHECK (get_user_role() = 'admin');

CREATE POLICY "user_profiles_update_self" ON user_profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- DELETE: solo admin (regola generale: cancellazione definitiva = admin).
CREATE POLICY "user_profiles_delete" ON user_profiles
  FOR DELETE TO authenticated
  USING (get_user_role() = 'admin');

-- ── Anti privilege-escalation ────────────────────────────────────
-- La policy self-update non può esprimere "tutte le colonne tranne
-- ruolo e attivo": lo impone questo trigger.
CREATE OR REPLACE FUNCTION protect_ruolo_attivo()
RETURNS TRIGGER AS $$
BEGIN
  IF get_user_role() IS DISTINCT FROM 'admin' THEN
    IF NEW.ruolo IS DISTINCT FROM OLD.ruolo THEN
      RAISE EXCEPTION 'Solo un admin può modificare il ruolo';
    END IF;
    IF NEW.attivo IS DISTINCT FROM OLD.attivo THEN
      RAISE EXCEPTION 'Solo un admin può attivare/disattivare un account';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_profiles_protect_ruolo
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_ruolo_attivo();
