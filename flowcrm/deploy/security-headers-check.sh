#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Verifica delle intestazioni di sicurezza — CANCELLO BLOCCANTE.
#
# Va usato come gate in update-fleet.sh: se un aggiornamento fa regredire le
# protezioni, l'aggiornamento della flotta si ferma lì e le istanze
# successive restano alla versione precedente.
#
# Il motivo per cui è un cancello e non un rapporto: la CSP e HSTS si
# perdono per distrazione (una riga spostata nel Caddyfile, una regola che
# non corrisponde più) e la perdita non si vede — il sito continua a
# funzionare benissimo, semplicemente senza protezioni. Nessuno se ne
# accorge finché non serve.
#
# Uso:  ./deploy/security-headers-check.sh https://acme.flowcrm.it
# ═══════════════════════════════════════════════════════════════════
set -uo pipefail

URL="${1:?Uso: security-headers-check.sh https://dominio}"
ERR=0
fail() { echo "  FAIL  $1"; ERR=$((ERR + 1)); }
ok()   { echo "  OK    $1"; }

echo "=== intestazioni di sicurezza — $URL ==="

HDRS=$(curl -fsSI --max-time 20 "$URL" 2>/dev/null) || {
  echo "ERRORE: $URL non risponde" >&2; exit 1; }

# minuscolo: i nomi delle intestazioni non sono sensibili alle maiuscole e
# proxy diversi le scrivono in modi diversi.
H=$(echo "$HDRS" | tr '[:upper:]' '[:lower:]')

verifica() { # nome, sottostringa-attesa, descrizione
  local riga
  riga=$(echo "$H" | grep -i "^$1:" || true)
  if [ -z "$riga" ]; then fail "$3 — intestazione '$1' assente"
  elif [ -n "$2" ] && ! echo "$riga" | grep -q "$2"; then fail "$3 — '$1' presente ma senza '$2'"
  else ok "$3"; fi
}

verifica "strict-transport-security" "max-age=63072000" "HSTS a due anni"
verifica "content-security-policy"   "frame-ancestors 'none'" "CSP con frame-ancestors none"
verifica "x-content-type-options"    "nosniff"          "niente sniffing del content-type"
verifica "x-frame-options"           "deny"             "niente incorniciamento"
verifica "referrer-policy"           ""                 "referrer-policy impostata"
verifica "permissions-policy"        ""                 "permissions-policy impostata"

# La CSP non deve contenere 'unsafe-eval' né 'unsafe-inline' sugli script:
# con quelli attivi la protezione dagli script iniettati non esiste più.
CSP=$(echo "$H" | grep -i "^content-security-policy:" || true)
if echo "$CSP" | grep -qE "script-src[^;]*unsafe-(eval|inline)"; then
  fail "la CSP ammette unsafe-eval/unsafe-inline sugli script"
else
  ok "CSP senza unsafe-eval/unsafe-inline sugli script"
fi

# Il redirect da http a https deve esserci: senza, la prima richiesta di un
# utente viaggia in chiaro e HSTS non ha mai occasione di installarsi.
SCHEMA_HTTP="http://${URL#https://}"
CODICE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$SCHEMA_HTTP" 2>/dev/null || echo "000")
case "$CODICE" in
  30*) ok "http reindirizza a https ($CODICE)" ;;
  *)   fail "http NON reindirizza a https (codice $CODICE)" ;;
esac

# Il server non deve dichiarare prodotto e versione.
if echo "$H" | grep -qE "^server:.*(caddy|nginx|envoy)/[0-9]"; then
  fail "l'intestazione 'server' rivela prodotto e versione"
else
  ok "nessuna versione del server esposta"
fi

echo ""
if [ "$ERR" -gt 0 ]; then
  echo "RISULTATO: $ERR regressioni — NON procedere con l'aggiornamento"
  exit 1
fi
echo "RISULTATO: tutte le protezioni sono al loro posto"
