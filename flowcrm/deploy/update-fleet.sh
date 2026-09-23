#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Aggiornamento della flotta — una istanza alla volta, stop al primo malato.
#
# Inventario in deploy/fleet.txt (NON committato: contiene gli host reali),
# una riga per istanza:
#   <slug>  <utente@host>  <percorso-istanza>  <dominio>
#   acme    root@203.0.113.10  /opt/flowcrm  acme.pmiflow.it
#
# Le due regole che lo rendono sicuro:
#
#   1. SEQUENZIALE, con arresto al primo fallimento. Mai propagare una
#      versione rotta a tutta la flotta: se la seconda istanza non torna
#      sana, dalla terza in poi restano tutte alla versione precedente e si
#      ha tempo di capire, invece di avere venti clienti fermi.
#
#   2. `docker compose pull`, MAI `--build`. L'immagine è già stata
#      costruita in CI e pubblicata su GHCR con il tag = GIT_SHA. Costruire
#      a bordo di ogni VPS darebbe binari diversi da cliente a cliente, e
#      un difetto che compare da uno solo diventerebbe impossibile da
#      attribuire: è la build o è l'istanza?
#
# Uso:  FLOWCRM_TAG=<git-sha> ./deploy/update-fleet.sh [deploy/fleet.txt]
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

FLEET="${1:-deploy/fleet.txt}"
: "${FLOWCRM_TAG:?FLOWCRM_TAG obbligatorio: il GIT_SHA pubblicato su GHCR, mai 'latest'}"
[ -f "$FLEET" ] || { echo "ERRORE: inventario '$FLEET' non trovato" >&2; exit 1; }

# "latest" renderebbe impossibile sapere cosa sta girando su quale istanza.
[ "$FLOWCRM_TAG" = "latest" ] && { echo "ERRORE: 'latest' non è una versione" >&2; exit 1; }

QUI="$(cd "$(dirname "$0")" && pwd)"
FATTE=0

while read -r SLUG HOST PERCORSO DOMINIO; do
  case "$SLUG" in ''|\#*) continue ;; esac
  echo ""
  echo "════ [$SLUG] $DOMINIO ════"

  # Versione attuale, per poter tornare indietro senza indovinare.
  PRECEDENTE=$(ssh -o BatchMode=yes -o ConnectTimeout=10 "$HOST" \
    "grep -E '^FLOWCRM_TAG=' '$PERCORSO/deploy/.env.prod' | cut -d= -f2-" 2>/dev/null || echo "sconosciuta")
  echo "[$SLUG] $PRECEDENTE → $FLOWCRM_TAG"

  # `if ! cmd <<EOF ... EOF; then` e non `cmd <<EOF || { }`: con il secondo
  # la parentesi finisce PRIMA del corpo dell'heredoc e bash non chiude più
  # il ciclo (errore di sintassi sul `done`).
  if ! ssh -o BatchMode=yes -o ConnectTimeout=15 "$HOST" bash -s <<SSH
set -euo pipefail
cd '$PERCORSO'
sed -i 's|^FLOWCRM_TAG=.*|FLOWCRM_TAG=$FLOWCRM_TAG|' deploy/.env.prod
docker compose -f supabase-docker/docker-compose.yml -f deploy/docker-compose.flowcrm.yml \
  --env-file deploy/.env.prod pull app
docker compose -f supabase-docker/docker-compose.yml -f deploy/docker-compose.flowcrm.yml \
  --env-file deploy/.env.prod up -d
SSH
  then
    echo "ERRORE: [$SLUG] aggiornamento fallito — STOP (le istanze successive restano a $PRECEDENTE)" >&2
    exit 1
  fi

  # ── Cancello 1: l'applicazione è viva E lo sono database, auth, storage ──
  echo "[$SLUG] attendo il riavvio…"
  SANO=0
  for i in $(seq 1 18); do
    if curl -fsS --max-time 10 "https://${DOMINIO}/functions/v1/health" 2>/dev/null | grep -q '"status":"ok"'; then
      SANO=1; echo "[$SLUG] health ok"; break
    fi
    sleep 10
  done
  [ "$SANO" = "1" ] || {
    echo "ERRORE: [$SLUG] health KO dopo l'aggiornamento — STOP. Rientro: FLOWCRM_TAG=$PRECEDENTE" >&2
    exit 1
  }

  # ── Cancello 2: le protezioni non devono essere regredite ──
  "$QUI/security-headers-check.sh" "https://${DOMINIO}" || {
    echo "ERRORE: [$SLUG] intestazioni di sicurezza regredite — STOP" >&2
    exit 1
  }

  FATTE=$((FATTE + 1))
  echo "[$SLUG] aggiornata a $FLOWCRM_TAG"
done < "$FLEET"

echo ""
echo "════ flotta aggiornata: $FATTE istanze, tutte sane ════"
