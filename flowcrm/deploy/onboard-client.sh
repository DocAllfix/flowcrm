#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Preparazione dell'istanza di UN cliente su una VPS già predisposta
# (cioè dopo setup-vps.sh).
#
# Genera i segreti, scrive deploy/.env.prod, avvia lo stack, applica lo
# schema, attiva i moduli acquistati e fa il collaudo.
#
# Uso, dalla cartella dell'istanza:
#   ./deploy/onboard-client.sh <slug> [--avvia]
#
#   senza --avvia : genera solo l'ambiente e stampa cosa manca
#   con --avvia   : prosegue e mette in piedi l'istanza
#
# Variabili: BASE_DOMAIN (default pmiflow.it), CLIENTE_NAME, MODULES,
#            FLOWCRM_TAG (obbligatoria), ACME_EMAIL, SMTP_*
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

SLUG="${1:?Uso: onboard-client.sh <slug> [--avvia]}"
AVVIA="${2:-}"
BASE_DOMAIN="${BASE_DOMAIN:-pmiflow.it}"
ENV_FILE="deploy/.env.prod"
COMPOSE_SUPABASE="supabase-docker/docker-compose.yml"
COMPOSE_FLOWCRM="deploy/docker-compose.flowcrm.yml"

# Lo slug finisce nel dominio e non è più cambiabile senza rifare l'istanza.
echo "$SLUG" | grep -Eq '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' \
  || { echo "ERRORE: slug non valido '$SLUG' (solo a-z, 0-9, trattino)" >&2; exit 1; }

DOMINIO="${SLUG}.${BASE_DOMAIN}"

dc() { docker compose -f "$COMPOSE_SUPABASE" -f "$COMPOSE_FLOWCRM" --env-file "$ENV_FILE" "$@"; }

# ── Firma dei JWT Supabase ──────────────────────────────────────────
# anon e service_role sono JWT firmati HS256 con JWT_SECRET. Vanno
# generati QUI, a partire dal segreto di QUESTO cliente: riusare le chiavi
# di un'altra istanza significa che un token di un cliente vale
# sull'istanza di un altro.
b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
firma_jwt() {
  local ruolo="$1" segreto="$2"
  local iat exp header payload dati firma
  iat=$(date +%s); exp=$((iat + 60*60*24*365*10))   # dieci anni, come Supabase
  header=$(printf '{"alg":"HS256","typ":"JWT"}' | b64url)
  payload=$(printf '{"role":"%s","iss":"supabase","iat":%s,"exp":%s}' "$ruolo" "$iat" "$exp" | b64url)
  dati="${header}.${payload}"
  firma=$(printf '%s' "$dati" | openssl dgst -binary -sha256 -hmac "$segreto" | b64url)
  printf '%s.%s' "$dati" "$firma"
}

# ═══ 1. Ambiente ════════════════════════════════════════════════════
if [ -f "$ENV_FILE" ]; then
  echo "[onboard] $ENV_FILE esiste già — non lo sovrascrivo (una VPS, un cliente)."
  echo "          Per avviare l'istanza già preparata:  $0 $SLUG --avvia"
else
  : "${FLOWCRM_TAG:?FLOWCRM_TAG obbligatoria: il GIT_SHA pubblicato su GHCR, mai 'latest'}"
  [ "$FLOWCRM_TAG" = "latest" ] && { echo "ERRORE: 'latest' non è una versione" >&2; exit 1; }

  [ -f deploy/.env.prod.example ] \
    || { echo "ERRORE: manca deploy/.env.prod.example (il clone è incompleto?)" >&2; exit 1; }

  JWT_SECRET=$(openssl rand -hex 32)
  ANON_KEY=$(firma_jwt anon "$JWT_SECRET")
  SERVICE_ROLE_KEY=$(firma_jwt service_role "$JWT_SECRET")

  # Si parte dal template tracciato e si sostituisce: così una chiave
  # aggiunta al template in futuro non viene dimenticata qui.
  cp deploy/.env.prod.example "$ENV_FILE"
  chmod 600 "$ENV_FILE"

  imposta() { # chiave, valore
    local v; v=$(printf '%s' "$2" | sed -e 's/[&|\\]/\\&/g')
    if grep -qE "^$1=" "$ENV_FILE"; then
      sed -i "s|^$1=.*|$1=$v|" "$ENV_FILE"
    else
      printf '%s=%s\n' "$1" "$2" >> "$ENV_FILE"
    fi
  }

  imposta DOMAIN                "$DOMINIO"
  imposta ACME_EMAIL            "${ACME_EMAIL:-ops@${BASE_DOMAIN}}"
  imposta CLIENTE_NAME          "${CLIENTE_NAME:-$SLUG}"
  imposta FLOWCRM_TAG           "$FLOWCRM_TAG"
  imposta MODULES               "${MODULES:-}"
  imposta SUPABASE_PUBLIC_URL   "https://${DOMINIO}"
  imposta API_EXTERNAL_URL      "https://${DOMINIO}"
  imposta SITE_URL              "https://${DOMINIO}"
  imposta STUDIO_DEFAULT_PROJECT "$SLUG"
  imposta POOLER_TENANT_ID      "$SLUG"
  imposta JWT_SECRET            "$JWT_SECRET"
  imposta ANON_KEY              "$ANON_KEY"
  imposta SERVICE_ROLE_KEY      "$SERVICE_ROLE_KEY"
  imposta POSTGRES_PASSWORD     "$(openssl rand -hex 24)"
  imposta SECRET_KEY_BASE       "$(openssl rand -hex 32)"
  imposta REALTIME_DB_ENC_KEY   "$(openssl rand -hex 16)"
  imposta VAULT_ENC_KEY         "$(openssl rand -hex 16)"
  imposta PG_META_CRYPTO_KEY    "$(openssl rand -hex 16)"
  imposta DASHBOARD_USERNAME    "admin-${SLUG}"
  imposta DASHBOARD_PASSWORD    "$(openssl rand -hex 12)"
  imposta SMTP_HOST             "${SMTP_HOST:-}"
  imposta SMTP_USER             "${SMTP_USER:-}"
  imposta SMTP_PASS             "${SMTP_PASS:-}"
  imposta SMTP_ADMIN_EMAIL      "${SMTP_ADMIN_EMAIL:-ops@${BASE_DOMAIN}}"

  echo "[onboard] $ENV_FILE creato (chmod 600), segreti unici per questo cliente."
  echo "[onboard] Finisce CIFRATO nel backup: perdere JWT_SECRET invalida ogni"
  echo "          sessione e ogni signed URL emessi."

  IP=$(curl -fsS -4 --max-time 10 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
  cat <<FINE

[onboard] Record DNS da creare (se non l'ha già fatto provision-client.sh):

    ${SLUG}    A    ${IP}    →  https://${DOMINIO}

FINE
fi

if [ "$AVVIA" != "--avvia" ]; then
  echo "[onboard] Quando il DNS ha propagato:  $0 $SLUG --avvia"
  exit 0
fi

# ═══ 2. Cancello prima di toccare qualsiasi cosa ════════════════════
echo "[onboard] preflight…"
./deploy/preflight.sh || { echo "ERRORE: preflight fallito — non avvio." >&2; exit 1; }

# ═══ 3. Avvio ═══════════════════════════════════════════════════════
echo "[onboard] avvio dello stack…"
dc pull
dc up -d

# Controllo che è già costato caro altrove: nessuna porta oltre 80 e 443.
echo "[onboard] verifica delle porte esposte…"
ESPOSTE=$(ss -tlnp 2>/dev/null | grep -vE '127\.0\.0\.1|::1|State' | grep -oE ':[0-9]+ ' | tr -d ': ' | sort -u | grep -vE '^(80|443|22)$' || true)
[ -n "$ESPOSTE" ] && { echo "ERRORE: porte esposte oltre 80/443/22: $ESPOSTE" >&2
                       echo "Vedi deploy/GUASTI.md G-01 prima di proseguire." >&2; exit 1; }
echo "[onboard] solo 22, 80 e 443 pubbliche."

# ═══ 4. Schema e licenze ════════════════════════════════════════════
echo "[onboard] attendo il database…"
for _ in $(seq 1 60); do
  dc exec -T db psql -U postgres -d postgres -c 'SELECT 1' >/dev/null 2>&1 && break
  sleep 3
done

echo "[onboard] applico le migrazioni…"
# Bersaglio ESPLICITO nel comando: il CLI applicherebbe altrimenti al
# progetto collegato, che può essere tutt'altra istanza (GUASTI.md G-19).
set -a; . "$ENV_FILE"; set +a
supabase db push --db-url "postgresql://postgres:${POSTGRES_PASSWORD}@127.0.0.1:5432/postgres"

if [ -n "${MODULES:-}" ]; then
  echo "[onboard] attivo le licenze dei moduli: $MODULES"
  for m in $(echo "$MODULES" | tr ',' ' '); do
    dc exec -T db psql -U postgres -d postgres \
      -c "INSERT INTO moduli_licenze (slug) VALUES ('$m') ON CONFLICT DO NOTHING;" >/dev/null
  done
fi

# Un'istanza cliente NON è in sola lettura: quella è la modalità della demo.
dc exec -T db psql -U postgres -d postgres \
  -c "UPDATE impostazioni_istanza SET sola_lettura = false;" >/dev/null

# ═══ 5. Collaudo ════════════════════════════════════════════════════
echo "[onboard] collaudo (attendo TLS, max ~3 minuti)…"
for i in $(seq 1 18); do
  if curl -fsS --max-time 10 "https://${DOMINIO}/functions/v1/health" 2>/dev/null | grep -q '"status":"ok"'; then
    echo "[onboard] health ok"
    break
  fi
  [ "$i" -eq 18 ] && { echo "ERRORE: health non risponde — controllare DNS, certificato e log." >&2; exit 1; }
  sleep 10
done

./deploy/security-headers-check.sh "https://${DOMINIO}" \
  || { echo "ERRORE: intestazioni di sicurezza mancanti." >&2; exit 1; }

cat <<FINE

=== istanza '${SLUG}' in piedi su https://${DOMINIO} ===

Restano da fare a mano (RUNBOOK §6-9):
  - creare l'utente amministratore del cliente;
  - schedulare backup, restore-test e sentinella (RUNBOOK §7);
  - creare progetto GlitchTip e monitor sul control plane (§8);
  - eseguire la lista di verifica di consegna (§9) — nessuna voce si salta;
  - aggiungere '${SLUG}' a deploy/fleet.txt.
FINE
