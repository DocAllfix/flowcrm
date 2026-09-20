#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Sentinella — variante Supabase.
#
# Gira da cron ogni 5 minuti su ogni istanza cliente e spinge lo stato verso
# il control plane. Il principio che la governa: **una sonda che deve
# ARRIVARE batte una sonda che deve fallire.** Un controllo di uptime vede
# "il sito non risponde"; questa vede "l'istanza non ha chiamato", e quindi
# intercetta anche la VPS spenta, il cron morto e il disco pieno — che sono
# proprio i guasti che non generano alcun errore applicativo.
#
# Quello che misura è scelto sui modi in cui questo stack si rompe davvero:
# non "la CPU è alta", ma "il backup non gira da due giorni", "i container
# ripartono in ciclo", "le connessioni stanno finendo".
#
# Content-free: nessun dato di cliente esce da qui, solo numeri e stati.
#
# Uso (cron ogni 5 minuti):
#   */5 * * * * cd /opt/flowcrm && SENTINEL_URL=https://monitor.../api/push/xxx \
#               ./deploy/sentinel.sh >> /var/log/flowcrm-sentinel.log 2>&1
# ═══════════════════════════════════════════════════════════════════
set -uo pipefail   # niente -e: una sonda che fallisce non deve zittire le altre

COMPOSE_SUPABASE="${COMPOSE_SUPABASE:-supabase-docker/docker-compose.yml}"
COMPOSE_FLOWCRM="${COMPOSE_FLOWCRM:-deploy/docker-compose.flowcrm.yml}"
ENV_FILE="${ENV_FILE:-deploy/.env.prod}"
SENTINEL_URL="${SENTINEL_URL:-}"

# Soglie. Superarne una mette lo stato a "degradato": l'allarme parte PRIMA
# del guasto, che è tutto il punto dell'esercizio.
MAX_DISCO_PCT="${MAX_DISCO_PCT:-85}"
MAX_ETA_BACKUP_H="${MAX_ETA_BACKUP_H:-26}"
MAX_RIAVVII="${MAX_RIAVVII:-3}"
MAX_CONNESSIONI_PCT="${MAX_CONNESSIONI_PCT:-70}"
MIN_GIORNI_CERT="${MIN_GIORNI_CERT:-14}"

PROBLEMI=()
segnala() { PROBLEMI+=("$1"); }

dc() { docker compose -f "$COMPOSE_SUPABASE" -f "$COMPOSE_FLOWCRM" --env-file "$ENV_FILE" "$@" 2>/dev/null; }
sql() { dc exec -T db psql -tA -U postgres -d postgres -c "$1" 2>/dev/null | tr -d '[:space:]'; }

# ── Disco ───────────────────────────────────────────────────────────
# Prima causa di fermo su una VPS che nessuno guarda: il disco si riempie,
# Postgres non riesce più a scrivere e l'istanza si ferma. Va visto all'85%,
# non al 100%.
DISCO=$(df -P / | awk 'NR==2 {gsub(/%/,"",$5); print $5}')
[ "${DISCO:-0}" -ge "$MAX_DISCO_PCT" ] && segnala "disco al ${DISCO}%"

# ── Memoria ─────────────────────────────────────────────────────────
MEM=$(free | awk '/Mem:/ {printf "%d", $3/$2*100}')
[ "${MEM:-0}" -ge 90 ] && segnala "memoria al ${MEM}%"

# ── Container: non in salute, e soprattutto in CICLO di riavvio ─────
# Un container che riparte di continuo risponde a intermittenza: un controllo
# di uptime lo vede "su" una volta su tre e non allarma mai.
NON_SANI=$(docker ps --filter "health=unhealthy" --format '{{.Names}}' | tr '\n' ' ')
[ -n "$NON_SANI" ] && segnala "container non sani: ${NON_SANI}"

FERMI=$(dc ps --status exited --format '{{.Name}}' | tr '\n' ' ')
[ -n "$FERMI" ] && segnala "container fermi: ${FERMI}"

for c in $(docker ps --format '{{.Names}}'); do
  N=$(docker inspect -f '{{.RestartCount}}' "$c" 2>/dev/null || echo 0)
  [ "${N:-0}" -ge "$MAX_RIAVVII" ] && segnala "${c} riavviato ${N} volte"
done

# ── Postgres ────────────────────────────────────────────────────────
if [ "$(sql 'select 1')" != "1" ]; then
  segnala "database non raggiungibile"
else
  USATE=$(sql "select count(*) from pg_stat_activity;")
  MAX=$(sql "select setting::int from pg_settings where name='max_connections';")
  if [ -n "${USATE:-}" ] && [ -n "${MAX:-}" ] && [ "$MAX" -gt 0 ]; then
    PCT=$(( USATE * 100 / MAX ))
    [ "$PCT" -ge "$MAX_CONNESSIONI_PCT" ] && segnala "connessioni al ${PCT}% (${USATE}/${MAX})"
  fi

  # Query lunghe: un blocco che si sta formando adesso. Aspettare che
  # diventi un timeout dell'utente significa aspettare il ticket.
  LENTE=$(sql "select count(*) from pg_stat_activity where state='active' and now()-query_start > interval '30 seconds';")
  [ "${LENTE:-0}" -gt 0 ] && segnala "${LENTE} query oltre i 30s"

  BLOCCATE=$(sql "select count(*) from pg_locks where not granted;")
  [ "${BLOCCATE:-0}" -gt 5 ] && segnala "${BLOCCATE} lock non concessi"

  # Ritardo dello slot di replica del PITR. È una sorveglianza a doppio
  # taglio e va spiegata: lo slot garantisce che nessun WAL vada perso,
  # MA se l'archivista si ferma Postgres conserva i WAL all'infinito e
  # riempie il disco fino a bloccare il database. Qui il pericolo non è
  # perdere dati: è che la protezione stessa fermi l'istanza.
  RITARDO_MB=$(sql "select coalesce(round(max(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn))/1048576),0)::int from pg_replication_slots where slot_name='flowcrm_pitr';")
  [ "${RITARDO_MB:-0}" -gt 512 ] && segnala "archivio WAL indietro di ${RITARDO_MB} MB (l'archivista è fermo?)"

  INATTIVI=$(sql "select count(*) from pg_replication_slots where slot_name='flowcrm_pitr' and active = false;")
  [ "${INATTIVI:-0}" -gt 0 ] && segnala "slot PITR presente ma NON attivo: i WAL si accumulano sul disco del database"

  # Il cron degli scadenzari: se muore, il cliente smette di ricevere gli
  # avvisi e se ne accorge settimane dopo, quando ha saltato una scadenza.
  CRON_KO=$(sql "select count(*) from cron.job_run_details where status='failed' and start_time > now() - interval '1 day';")
  [ "${CRON_KO:-0}" -gt 0 ] && segnala "${CRON_KO} esecuzioni cron fallite nelle 24h"
fi

# ── Backup: quando è andato l'ultimo ────────────────────────────────
# Il backup che ha smesso di girare è il guasto più costoso e il più
# silenzioso: non rompe niente finché non serve.
if [ -n "${RESTIC_PASSWORD_FILE:-}" ] && [ -n "${SB_HOST:-}" ]; then
  export RESTIC_REPOSITORY="sftp:${SB_HOST}:backup" RESTIC_PASSWORD_FILE
  ULTIMO=$(restic snapshots --latest 1 --json 2>/dev/null | grep -oE '"time":"[^"]+"' | head -1 | cut -d'"' -f4)
  if [ -n "$ULTIMO" ]; then
    ORE=$(( ( $(date +%s) - $(date -d "$ULTIMO" +%s) ) / 3600 ))
    [ "$ORE" -ge "$MAX_ETA_BACKUP_H" ] && segnala "ultimo backup ${ORE}h fa"
  else
    segnala "nessuno snapshot di backup leggibile"
  fi
fi

# ── Certificato TLS ─────────────────────────────────────────────────
# Caddy rinnova da solo, ma se il rinnovo fallisce (DNS cambiato, limiti di
# emissione raggiunti) l'istanza diventa irraggiungibile di colpo, e con un
# preavviso di zero. Meglio saperlo due settimane prima.
DOMINIO=$(grep -E '^DOMAIN=' "$ENV_FILE" 2>/dev/null | cut -d= -f2-)
if [ -n "${DOMINIO:-}" ]; then
  FINE=$(echo | openssl s_client -servername "$DOMINIO" -connect "$DOMINIO:443" 2>/dev/null \
    | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
  if [ -n "$FINE" ]; then
    GG=$(( ( $(date -d "$FINE" +%s) - $(date +%s) ) / 86400 ))
    [ "$GG" -le "$MIN_GIORNI_CERT" ] && segnala "certificato scade fra ${GG} giorni"
  else
    segnala "certificato TLS non leggibile"
  fi
fi

# ── Health applicativo ──────────────────────────────────────────────
# Verifica database, auth e storage insieme: è l'unica sonda che distingue
# "il sito risponde" da "l'applicazione funziona".
if [ -n "${DOMINIO:-}" ]; then
  HEALTH=$(curl -fsS --max-time 10 "https://${DOMINIO}/functions/v1/health" 2>/dev/null)
  echo "$HEALTH" | grep -q '"status":"ok"' || segnala "health applicativo: ${HEALTH:-nessuna risposta}"
fi

# ── Esito ───────────────────────────────────────────────────────────
if [ ${#PROBLEMI[@]} -eq 0 ]; then
  STATO="ok"; MSG="tutto regolare (disco ${DISCO}%, memoria ${MEM}%)"
else
  STATO="degradato"; MSG=$(printf '%s; ' "${PROBLEMI[@]}")
fi

echo "[$(date +%F' '%T)] ${STATO}: ${MSG}"

# Il ping DEVE partire in entrambi i casi: è la sua assenza a far scattare
# l'allarme sul control plane. Un'istanza che tace è già un guasto.
if [ -n "$SENTINEL_URL" ]; then
  curl -fsS --max-time 15 -G "$SENTINEL_URL" \
    --data-urlencode "status=$([ "$STATO" = ok ] && echo up || echo down)" \
    --data-urlencode "msg=${MSG}" >/dev/null 2>&1 \
    || echo "ATTENZIONE: ping al control plane non riuscito"
fi

[ "$STATO" = "ok" ] || exit 1
