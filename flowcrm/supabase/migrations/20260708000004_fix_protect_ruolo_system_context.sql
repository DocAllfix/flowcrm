-- ═══════════════════════════════════════════════════════════════════
-- Fix — protect_ruolo_attivo deve applicarsi SOLO a utenti autenticati
-- reali. In contesto di sistema/service_role auth.uid() è NULL: quelle
-- operazioni sono già privilegiate (seed, inviti admin via Edge Function,
-- migrazioni) e non vanno bloccate. Un utente autenticato non-admin ha
-- SEMPRE auth.uid() non-null, quindi la protezione anti-escalation resta
-- integra su quel percorso.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION protect_ruolo_attivo()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo per richieste autenticate reali (non service_role/seed/migrazioni)
  IF auth.uid() IS NOT NULL AND get_user_role() IS DISTINCT FROM 'admin' THEN
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
