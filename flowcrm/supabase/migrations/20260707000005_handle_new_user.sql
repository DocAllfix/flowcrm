-- ═══════════════════════════════════════════════════════════════════
-- F1.5 — Auto-creazione user_profiles alla registrazione di un auth user
-- Così creando un utente dal dashboard (o via invito) il profilo nasce
-- subito, con nome/ruolo presi dai metadata se presenti.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, nome, cognome, ruolo)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'nome', ''), split_part(NEW.email, '@', 1)),
    NULLIF(NEW.raw_user_meta_data->>'cognome', ''),
    COALESCE((NEW.raw_user_meta_data->>'ruolo')::user_role, 'operatore')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
