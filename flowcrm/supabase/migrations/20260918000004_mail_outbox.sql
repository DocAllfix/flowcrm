-- ═══════════════════════════════════════════════════════════════════
-- Posta in uscita — coda transazionale (pattern outbox).
--
-- Perché una coda e non l'invio diretto: se GoTrue parla direttamente con
-- il relay SMTP, un timeout del relay fa fallire la RICHIESTA DELL'UTENTE.
-- Su un recupero password questo lascia la persona chiusa fuori in modo
-- definitivo: l'unica strada per rientrare è proprio quella che non
-- funziona. Con la coda la richiesta riesce comunque, il messaggio resta
-- in attesa e parte da solo quando il relay torna.
--
-- Struttura e casi limite ripresi dall'outbox già collaudato end-to-end su
-- `sistemacommercialisti` (registrazione → coda → worker → arrivo → link
-- seguito → vecchia password respinta), adattati a GoTrue.
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS mail_outbox (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario  text NOT NULL,
  oggetto       text NOT NULL,
  corpo_testo   text NOT NULL,
  corpo_html    text,
  tentativi     integer NOT NULL DEFAULT 0,
  ultimo_errore text,
  inviata_at    timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Indice PARZIALE: la coda da drenare resta piccola e veloce anche quando
-- la tabella è cresciuta di anni, senza bisogno di archiviare nulla.
CREATE INDEX IF NOT EXISTS mail_outbox_da_inviare_idx
  ON mail_outbox (created_at) WHERE inviata_at IS NULL;

-- RLS: nessuna policy. La tabella contiene token di recupero password in
-- chiaro dentro il corpo del messaggio — chi la legge può impossessarsi di
-- qualunque account. Si tocca SOLO da funzioni SECURITY DEFINER e dal
-- worker con service_role. Coerente con copilot_usage.
ALTER TABLE mail_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE mail_outbox FORCE ROW LEVEL SECURITY;

-- ── Hook di GoTrue ──────────────────────────────────────────────────
-- Con GOTRUE_HOOK_SEND_EMAIL_URI = pg-functions://postgres/public/send_email_hook
-- GoTrue chiama QUESTA funzione invece di spedire. Accoda e basta: il
-- relay non viene mai contattato durante la richiesta dell'utente.
CREATE OR REPLACE FUNCTION send_email_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  destinatario text := event #>> '{user,email}';
  azione       text := event #>> '{email_data,email_action_type}';
  token_hash   text := event #>> '{email_data,token_hash}';
  redirect_to  text := event #>> '{email_data,redirect_to}';
  site_url     text := coalesce(event #>> '{email_data,site_url}', '');
  percorso     text;
  oggetto      text;
  intro        text;
  collegamento text;
BEGIN
  IF destinatario IS NULL THEN
    -- Si restituisce un errore a GoTrue invece di sollevare eccezione:
    -- un'eccezione qui farebbe fallire l'intera operazione di autenticazione.
    RETURN jsonb_build_object('error', jsonb_build_object(
      'http_code', 400, 'message', 'destinatario mancante'));
  END IF;

  CASE azione
    WHEN 'recovery' THEN
      percorso := '/auth/recupero';
      oggetto  := 'Reimposta la tua password';
      intro    := 'Hai chiesto di reimpostare la password. Il collegamento vale un''ora.';
    WHEN 'invite' THEN
      percorso := '/auth/invito';
      oggetto  := 'Sei stato invitato';
      intro    := 'Ti è stato creato un accesso. Usa il collegamento per impostare la password.';
    WHEN 'signup' THEN
      percorso := '/auth/conferma';
      oggetto  := 'Conferma il tuo indirizzo';
      intro    := 'Conferma l''indirizzo per attivare l''accesso.';
    WHEN 'email_change' THEN
      percorso := '/auth/cambio-email';
      oggetto  := 'Conferma il nuovo indirizzo';
      intro    := 'Conferma il nuovo indirizzo per completare il cambio.';
    ELSE
      percorso := '/auth/recupero';
      oggetto  := 'Notifica di sicurezza';
      intro    := 'È stata richiesta un''operazione sul tuo accesso.';
  END CASE;

  collegamento := site_url || '/auth/v1/verify?token=' || coalesce(token_hash, '')
                  || '&type=' || coalesce(azione, 'recovery')
                  || '&redirect_to=' || coalesce(redirect_to, site_url || percorso);

  INSERT INTO mail_outbox (destinatario, oggetto, corpo_testo, corpo_html)
  VALUES (
    destinatario,
    oggetto,
    intro || E'\n\n' || collegamento || E'\n\nSe non hai richiesto nulla, ignora questo messaggio.',
    '<p>' || intro || '</p><p><a href="' || collegamento || '">Apri il collegamento</a></p>'
      || '<p style="color:#64748b;font-size:12px">Se non hai richiesto nulla, ignora questo messaggio.</p>'
  );

  RETURN '{}'::jsonb;
END;
$$;

-- GoTrue chiama la funzione come `supabase_auth_admin`: senza questo GRANT
-- l'hook fallisce e l'autenticazione con lui.
GRANT EXECUTE ON FUNCTION send_email_hook(jsonb) TO supabase_auth_admin;
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION send_email_hook(jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION send_email_hook(jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION send_email_hook(jsonb) FROM authenticated;

-- ── Prelievo per il worker ──────────────────────────────────────────
-- `FOR UPDATE SKIP LOCKED`: se un giorno girassero due worker insieme si
-- dividono la coda invece di spedire due volte lo stesso messaggio.
-- Il tentativo si incrementa QUI, cioè PRIMA dell'invio: se il worker
-- muore a metà, il contatore è già salito e un messaggio velenoso non
-- blocca la coda in un ciclo infinito. È l'errore classico dell'outbox.
CREATE OR REPLACE FUNCTION preleva_mail_da_inviare(quante integer DEFAULT 20)
RETURNS SETOF mail_outbox
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  RETURN QUERY
  WITH scelte AS (
    SELECT id FROM mail_outbox
    WHERE inviata_at IS NULL AND tentativi < 5
    ORDER BY created_at
    LIMIT quante
    FOR UPDATE SKIP LOCKED
  )
  UPDATE mail_outbox m
  SET tentativi = m.tentativi + 1
  FROM scelte s WHERE m.id = s.id
  RETURNING m.*;
END;
$$;

REVOKE EXECUTE ON FUNCTION preleva_mail_da_inviare(integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION preleva_mail_da_inviare(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION preleva_mail_da_inviare(integer) FROM authenticated;

-- ── Esiti ───────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION segna_mail_inviata(mail_id uuid)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public
AS $$ UPDATE mail_outbox SET inviata_at = now(), ultimo_errore = NULL WHERE id = mail_id; $$;

CREATE OR REPLACE FUNCTION segna_mail_fallita(mail_id uuid, errore text)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = pg_catalog, public
-- Troncato: `ultimo_errore` serve a diagnosticare, non a fare da log.
AS $$ UPDATE mail_outbox SET ultimo_errore = left(errore, 500) WHERE id = mail_id; $$;

REVOKE EXECUTE ON FUNCTION segna_mail_inviata(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION segna_mail_fallita(uuid, text) FROM PUBLIC, anon, authenticated;
