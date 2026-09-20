#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Controlli PRIMA di avviare lo stack di un'istanza cliente.
#
# Esiste perché ogni passo falso a questo punto costa molto più di quanto
# costi qui: un DNS non propagato brucia tentativi di emissione Let's
# Encrypt (5 a settimana per dominio, e poi si aspetta), una chiave
# mancante fa partire l'applicazione con i valori di un altro cliente, un
# disco stretto fa morire Postgres due settimane dopo la consegna.
#
# Uso:  ./deploy/preflight.sh          (dalla cartella dell'istanza)
# Exit 0 = si può procedere con `up -d`.
# ═══════════════════════════════════════════════════════════════════
set -uo pipefail

ENV_FILE="${ENV_FILE:-deploy/.env.prod}"
COMPOSE_SUPABASE="${COMPOSE_SUPABASE:-supabase-docker/docker-compose.yml}"
COMPOSE_FLOWCRM="${COMPOSE_FLOWCRM:-deploy/docker-compose.flowcrm.yml}"

ERR=0
fail() { echo "  FAIL  $1"; ERR=$((ERR + 1)); }
warn() { echo "  nota  $1"; }
ok()   { echo "  OK    $1"; }

echo "=== preflight ==="

# ── 1. I file che servono ci sono? ──────────────────────────────────
for f in "$ENV_FILE" "$COMPOSE_SUPABASE" "$COMPOSE_FLOWCRM"; do
  [ -f "$f" ] || fail "manca $f"
done
[ "$ERR" -gt 0 ] && { echo "RISULTATO: file mancanti, mi fermo"; exit 1; }
ok "i tre file di configurazione ci sono"

# Il .env contiene JWT_SECRET e le password: leggibile solo da root.
PERM=$(stat -c %a "$ENV_FILE" 2>/dev/null || echo "?")
[ "$PERM" = "600" ] && ok "$ENV_FILE ha permessi 600" \
                    || fail "$ENV_FILE ha permessi $PERM (atteso 600)"

# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a

# ── 2. Chiavi obbligatorie, nessuna vuota ───────────────────────────
# Il difetto che questo controllo intercetta è silenzioso: una variabile
# assente non dà errore, dà il valore di default — e ogni cliente si
# chiamerebbe come il default.
OBBLIGATORIE="DOMAIN ACME_EMAIL FLOWCRM_TAG POSTGRES_PASSWORD JWT_SECRET
              ANON_KEY SERVICE_ROLE_KEY SECRET_KEY_BASE REALTIME_DB_ENC_KEY
              VAULT_ENC_KEY PG_META_CRYPTO_KEY DASHBOARD_USERNAME DASHBOARD_PASSWORD
              SUPABASE_PUBLIC_URL API_EXTERNAL_URL SITE_URL"
MANCANTI=""
for k in $OBBLIGATORIE; do
  [ -z "${!k:-}" ] && MANCANTI="$MANCANTI $k"
done
[ -n "$MANCANTI" ] && fail "chiavi vuote o assenti:$MANCANTI" \
                   || ok "tutte le chiavi obbligatorie sono valorizzate"

# ── 3. Il tag non deve essere "latest" ──────────────────────────────
[ "${FLOWCRM_TAG:-}" = "latest" ] \
  && fail "FLOWCRM_TAG=latest — serve il GIT_SHA, altrimenti non si sa cosa gira" \
  || ok "FLOWCRM_TAG è una versione ($FLOWCRM_TAG)"

# ── 4. Gli URL pubblici devono combaciare con il dominio ────────────
# Se divergono, l'autenticazione reindirizza su un dominio diverso da
# quello servito e il login gira a vuoto senza un errore chiaro.
for v in SUPABASE_PUBLIC_URL API_EXTERNAL_URL SITE_URL; do
  case "${!v}" in
    "https://$DOMAIN") ;;
    *) fail "$v=${!v} non corrisponde a https://$DOMAIN" ;;
  esac
done

# ── 5. La anon key non deve essere la service_role ──────────────────
# Stesso aspetto, stessa lunghezza, conseguenze opposte: la service_role
# nel browser scavalca la RLS, che qui è l'unica barriera di sicurezza.
if echo "${ANON_KEY:-}" | cut -d. -f2 | base64 -d 2>/dev/null | grep -q 'service_role'; then
  fail "ANON_KEY contiene una chiave service_role — MAI esporla al browser"
else
  ok "ANON_KEY è una chiave anonima"
fi
[ "${ANON_KEY:-}" = "${SERVICE_ROLE_KEY:-}" ] && fail "ANON_KEY e SERVICE_ROLE_KEY sono identiche"

# ── 6. Moduli: slug dall'elenco chiuso ──────────────────────────────
NOTI="gare cantiere automezzi agenti poliambulatori"
for m in $(echo "${MODULES:-}" | tr ',' ' '); do
  echo " $NOTI " | grep -q " $m " || fail "modulo sconosciuto '$m' (ammessi: $NOTI)"
done
[ -n "${MODULES:-}" ] && ok "moduli richiesti: $MODULES" || warn "nessun modulo verticale (solo CRM base)"

# ── 7. DNS propagato? ───────────────────────────────────────────────
# Avviare prima della propagazione fa fallire la verifica ACME e consuma
# tentativi di emissione: Let's Encrypt ne concede 5 a settimana per
# dominio, esauriti i quali l'istanza resta senza HTTPS per giorni.
IP_LOCALE=$(curl -fsS -4 --max-time 10 https://ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}')
IP_DNS=$(dig +short "$DOMAIN" A | tail -1)
if [ -z "$IP_DNS" ]; then
  fail "$DOMAIN non risolve ancora — attendere la propagazione"
elif [ "$IP_DNS" != "$IP_LOCALE" ]; then
  fail "$DOMAIN risolve $IP_DNS ma questa macchina è $IP_LOCALE"
else
  ok "$DOMAIN risolve correttamente su questa macchina"
fi

# ── 8. Risorse ──────────────────────────────────────────────────────
# Le sole immagini Supabase occupano ~8 GB prima di qualunque dato, e lo
# stack a regime chiede 8 GB di RAM.
DISCO_GB=$(df -BG --output=avail / | tail -1 | tr -dc '0-9')
[ "${DISCO_GB:-0}" -ge 25 ] && ok "disco libero ${DISCO_GB} GB" \
                            || fail "solo ${DISCO_GB} GB liberi (servono almeno 25: ~8 di immagini più dati)"

RAM_GB=$(free -g | awk '/Mem:/ {print $2}')
[ "${RAM_GB:-0}" -ge 7 ] && ok "RAM ${RAM_GB} GB" \
                         || fail "solo ${RAM_GB} GB di RAM (lo stack Supabase ne chiede 8)"

swapon --show 2>/dev/null | grep -q . && ok "swap attiva" || warn "nessuna swap: un picco può far uccidere Postgres dall'OOM killer"

# ── 9. Porte 80 e 443 libere ────────────────────────────────────────
for p in 80 443; do
  ss -tlnp 2>/dev/null | grep -qE ":${p}\b" && fail "porta $p già occupata" || ok "porta $p libera"
done

# ── 10. L'immagine esiste sul registro? ─────────────────────────────
# Meglio scoprire adesso che il tag non è stato pubblicato, che a metà
# dell'avvio con il cliente al telefono.
if command -v docker >/dev/null; then
  if docker manifest inspect "ghcr.io/docallfix/flowcrm:${FLOWCRM_TAG}" >/dev/null 2>&1; then
    ok "immagine ghcr.io/docallfix/flowcrm:${FLOWCRM_TAG} pubblicata"
  else
    fail "immagine con tag ${FLOWCRM_TAG} non trovata su GHCR (la pubblica la CI)"
  fi
fi

echo ""
if [ "$ERR" -gt 0 ]; then
  echo "RISULTATO: $ERR problemi — NON avviare lo stack"
  exit 1
fi
echo "RISULTATO: si può procedere con 'docker compose ... up -d'"
