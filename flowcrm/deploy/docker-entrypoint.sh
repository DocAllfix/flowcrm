#!/bin/sh
# ═══════════════════════════════════════════════════════════════════
# Genera /srv/config.json dall'ambiente, poi avvia Caddy.
#
# È il punto in cui l'immagine unica diventa l'istanza di UN cliente.
# Regola che governa tutto il file: **meglio non partire che partire con la
# configurazione sbagliata**. Un container che si rifiuta di avviarsi lo si
# vede subito; un'istanza che parte con il nome o i moduli di un altro
# cliente la scopre il cliente.
#
# Le chiavi scritte qui devono corrispondere ESATTAMENTE allo schema zod in
# src/config/app.config.ts, che è `.strict()`: un nome sbagliato ferma
# l'avvio dell'applicazione invece di ricadere in silenzio sul default.
# ═══════════════════════════════════════════════════════════════════
set -eu

CONFIG=/srv/config.json

errore() { echo "[entrypoint] ERRORE: $*" >&2; exit 1; }

# ── Obbligatorie ────────────────────────────────────────────────────
[ -n "${SUPABASE_URL:-}" ]      || errore "SUPABASE_URL non impostata"
[ -n "${SUPABASE_ANON_KEY:-}" ] || errore "SUPABASE_ANON_KEY non impostata"

# La anon key è un JWT. Se qui finisse per sbaglio la service_role (stesso
# aspetto, stessa lunghezza) il browser riceverebbe una chiave che scavalca
# la RLS: sarebbe la fuga di dati peggiore possibile in questo prodotto.
case "$SUPABASE_ANON_KEY" in
  eyJ*) ;;
  *) errore "SUPABASE_ANON_KEY non sembra un JWT" ;;
esac
if echo "$SUPABASE_ANON_KEY" | cut -d. -f2 | base64 -d 2>/dev/null | grep -q 'service_role'; then
  errore "SUPABASE_ANON_KEY contiene una chiave service_role — MAI esporla al browser"
fi

# ── Moduli: validazione contro l'elenco chiuso ──────────────────────
# Uno slug sbagliato ("poliambulatorio" invece di "poliambulatori") darebbe
# un menu senza quella voce e nessun errore: il cliente pagherebbe un modulo
# che non vede. Qui invece l'avvio si ferma.
MODULI_NOTI="gare cantiere automezzi agenti poliambulatori"
MODULES="${MODULES:-}"
if [ -n "$MODULES" ]; then
  for m in $(echo "$MODULES" | tr ',' ' '); do
    echo " $MODULI_NOTI " | grep -q " $m " \
      || errore "modulo sconosciuto '$m' (ammessi: $MODULI_NOTI)"
  done
fi

# ── Generazione ─────────────────────────────────────────────────────
# jq e non `echo` a mano: un apostrofo nella ragione sociale del cliente
# romperebbe un JSON composto per concatenazione.
jq -n \
  --arg  supabaseUrl     "$SUPABASE_URL" \
  --arg  supabaseAnonKey "$SUPABASE_ANON_KEY" \
  --arg  appName         "${APP_NAME:-FlowCRM}" \
  --arg  clienteName     "${CLIENTE_NAME:-}" \
  --arg  logoUrl         "${LOGO_URL:-/logo-default.svg}" \
  --arg  faviconUrl      "${FAVICON_URL:-/favicon.svg}" \
  --arg  primaryColor    "${PRIMARY_COLOR:-#ff5c35}" \
  --arg  accentColor     "${ACCENT_COLOR:-#33475b}" \
  --argjson demoMode     "$([ "${DEMO_MODE:-false}" = "true" ] && echo true || echo false)" \
  --argjson tourEnabled  "$([ "${TOUR_ENABLED:-false}" = "true" ] && echo true || echo false)" \
  --arg  moduli          "$MODULES" \
  --arg  sentryDsn       "${SENTRY_DSN:-}" \
  --arg  release         "${RELEASE:-}" \
  '{
     supabaseUrl: $supabaseUrl,
     supabaseAnonKey: $supabaseAnonKey,
     appName: $appName,
     clienteName: $clienteName,
     logoUrl: $logoUrl,
     faviconUrl: $faviconUrl,
     primaryColor: $primaryColor,
     accentColor: $accentColor,
     demoMode: $demoMode,
     tourEnabled: $tourEnabled,
     moduli: ($moduli | if . == "" then [] else split(",") | map(gsub("^\\s+|\\s+$";"")) end),
     sentryDsn: $sentryDsn,
     release: $release
   }' > "$CONFIG" || errore "generazione di $CONFIG fallita"

# Rilettura: se jq avesse prodotto qualcosa di illeggibile è meglio saperlo
# adesso che al primo caricamento di pagina.
jq -e . "$CONFIG" >/dev/null || errore "$CONFIG generato ma non è JSON valido"

echo "[entrypoint] config.json generato per '${CLIENTE_NAME:-senza nome}' — moduli: [${MODULES:-nessuno}]"

exec "$@"
