#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Il comando unico: da "il cliente ha pagato" a "l'istanza è in piedi".
#
# Orchestra i pezzi che esistono già, non li duplica:
#   1. crea il server su Hetzner       (hcloud)
#   2. crea il record DNS              (dns-hostinger.sh)
#   3. prepara la macchina             (setup-vps.sh, via ssh)
#   4. prepara e avvia l'istanza       (onboard-client.sh, via ssh)
#
# Si lancia dalla PROPRIA postazione, non dalla VPS.
#
# Uso:
#   FLOWCRM_TAG=<git-sha> CLIENTE_NAME="ACME Srl" MODULES="gare,cantiere" \
#     ./deploy/provision-client.sh acme
#
# Richiede: hcloud configurato (HCLOUD_TOKEN) e HOSTINGER_API_TOKEN.
# I token arrivano da ~/.config/flotta/*.env — mai in questo file, mai nel
# repository, mai stampati.
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

SLUG="${1:?Uso: provision-client.sh <slug>}"
BASE_DOMAIN="${BASE_DOMAIN:-flowcrm.it}"
TIPO_SERVER="${TIPO_SERVER:-cx32}"
LOCALITA="${LOCALITA:-nbg1}"
IMMAGINE="${IMMAGINE:-ubuntu-24.04}"
CHIAVE_SSH="${CHIAVE_SSH:?CHIAVE_SSH obbligatoria: nome della chiave SSH registrata su Hetzner}"
REPO="${REPO:-https://github.com/DocAllfix/flowcrm.git}"
PERCORSO="${PERCORSO:-/opt/flowcrm}"

: "${FLOWCRM_TAG:?FLOWCRM_TAG obbligatoria: il GIT_SHA pubblicato su GHCR, mai 'latest'}"
[ "$FLOWCRM_TAG" = "latest" ] && { echo "ERRORE: 'latest' non è una versione" >&2; exit 1; }

echo "$SLUG" | grep -Eq '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' \
  || { echo "ERRORE: slug non valido '$SLUG'" >&2; exit 1; }

DOMINIO="${SLUG}.${BASE_DOMAIN}"
NOME_SERVER="flowcrm-${SLUG}"

# I token stanno in file dedicati, non nell'ambiente della shell interattiva.
for f in ~/.config/flotta/hetzner.env ~/.config/flotta/hostinger.env; do
  [ -f "$f" ] && { set -a; . "$f"; set +a; }
done
: "${HCLOUD_TOKEN:?HCLOUD_TOKEN assente (atteso in ~/.config/flotta/hetzner.env)}"

echo "=== provisioning di '$SLUG' → $DOMINIO ==="

# ── 0. L'immagine esiste? ───────────────────────────────────────────
# Prima di accendere un server che costa, verificare che ci sia qualcosa
# da eseguirci sopra.
docker manifest inspect "ghcr.io/docallfix/flowcrm:${FLOWCRM_TAG}" >/dev/null 2>&1 \
  || { echo "ERRORE: ghcr.io/docallfix/flowcrm:${FLOWCRM_TAG} non pubblicata. La pubblica la CI." >&2; exit 1; }
echo "[0/4] immagine ${FLOWCRM_TAG} pubblicata"

# ── 1. Server ───────────────────────────────────────────────────────
if hcloud server describe "$NOME_SERVER" >/dev/null 2>&1; then
  echo "[1/4] server $NOME_SERVER già esistente — non lo ricreo"
else
  echo "[1/4] creo il server $NOME_SERVER ($TIPO_SERVER, $LOCALITA)…"
  # NOTA pagata su un altro progetto: l'API vuole `--location` e NON
  # `--datacenter`, dismesso dal 16/12/2025 e che risponde 422. La
  # disponibilità dei tipi si legge per datacenter, la creazione vuole la
  # location: è la confusione che fa perdere il pomeriggio.
  # Vedi FormazioneEvalis(working name)/infra/blog-cms/attendi-e-crea-server.py
  hcloud server create \
    --name "$NOME_SERVER" \
    --type "$TIPO_SERVER" \
    --image "$IMMAGINE" \
    --location "$LOCALITA" \
    --ssh-key "$CHIAVE_SSH" \
    --label "prodotto=flowcrm" --label "cliente=$SLUG"
fi

IP=$(hcloud server ip "$NOME_SERVER")
echo "      IP: $IP"

# ── 1b. Firewall cloud ──────────────────────────────────────────────
# Non è ridondante rispetto a UFW: le porte pubblicate da Docker
# SCAVALCANO UFW, quindi questo è l'unico filtro che le ferma davvero.
if ! hcloud firewall describe flowcrm-clienti >/dev/null 2>&1; then
  echo "[1b] creo il firewall cloud 'flowcrm-clienti'…"
  hcloud firewall create --name flowcrm-clienti
  for p in 22 80 443; do
    hcloud firewall add-rule flowcrm-clienti \
      --direction in --protocol tcp --port "$p" --source-ips 0.0.0.0/0 --source-ips ::/0
  done
fi
hcloud firewall apply-to-resource flowcrm-clienti --type server --server "$NOME_SERVER" 2>/dev/null \
  && echo "      firewall applicato" || echo "      firewall già applicato"

# ── 2. DNS ──────────────────────────────────────────────────────────
echo "[2/4] record DNS…"
if [ -x ./deploy/dns-hostinger.sh ]; then
  # Lo script è condiviso fra i tre prodotti proprio perché tre
  # implementazioni sarebbero tre modi diversi di azzerare una zona:
  # l'API Hostinger con `overwrite: true` sostituisce l'INTERA zona.
  ./deploy/dns-hostinger.sh --aggiungi "$SLUG" "$IP"
else
  echo "      ATTENZIONE: dns-hostinger.sh non ancora disponibile."
  echo "      Creare a mano:   ${SLUG}  A  ${IP}   sulla zona ${BASE_DOMAIN}"
  echo "      Poi premere Invio."
  read -r _
fi

echo "      attendo la propagazione (max 5 minuti)…"
for i in $(seq 1 30); do
  [ "$(dig +short "$DOMINIO" A | tail -1)" = "$IP" ] && { echo "      $DOMINIO → $IP"; break; }
  [ "$i" -eq 30 ] && { echo "ERRORE: DNS non propagato. Non avvio: senza DNS la verifica ACME fallisce e brucia tentativi di emissione (5 a settimana per dominio)." >&2; exit 1; }
  sleep 10
done

# ── 3. Preparazione della macchina ──────────────────────────────────
echo "[3/4] preparo la VPS…"
SSH="ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 root@${IP}"
for i in $(seq 1 30); do
  $SSH 'echo pronta' >/dev/null 2>&1 && break
  [ "$i" -eq 30 ] && { echo "ERRORE: SSH non risponde su $IP" >&2; exit 1; }
  sleep 10
done
$SSH 'bash -s' < deploy/setup-vps.sh

# ── 4. Istanza ──────────────────────────────────────────────────────
echo "[4/4] preparo e avvio l'istanza…"
$SSH bash -s <<SSH_FINE
set -euo pipefail
[ -d '$PERCORSO' ] || git clone '$REPO' '$PERCORSO'
cd '$PERCORSO'
git fetch --all --tags && git checkout '$FLOWCRM_TAG'

mkdir -p supabase-docker
curl -fsSL -o supabase-docker/docker-compose.yml \
  https://raw.githubusercontent.com/supabase/supabase/master/docker/docker-compose.yml

export FLOWCRM_TAG='$FLOWCRM_TAG'
export BASE_DOMAIN='$BASE_DOMAIN'
export CLIENTE_NAME='${CLIENTE_NAME:-$SLUG}'
export MODULES='${MODULES:-}'
export ACME_EMAIL='${ACME_EMAIL:-ops@$BASE_DOMAIN}'
export SMTP_HOST='${SMTP_HOST:-}' SMTP_USER='${SMTP_USER:-}' SMTP_PASS='${SMTP_PASS:-}'

./deploy/onboard-client.sh '$SLUG' --avvia
SSH_FINE

cat <<FINE

=== '$SLUG' è in piedi su https://${DOMINIO} ===

  server   $NOME_SERVER ($TIPO_SERVER, $LOCALITA)  —  $IP
  versione $FLOWCRM_TAG
  moduli   ${MODULES:-nessuno}

Restano i passi che toccano sistemi fuori da questa macchina (RUNBOOK §7-9):
  - sotto-account Storage Box per '$SLUG' + chiave append-only, poi cron di
    backup, restore-test e sentinella;
  - progetto GlitchTip e monitor sul control plane;
  - utente amministratore del cliente;
  - lista di verifica di consegna (§9): nessuna voce si salta;
  - aggiungere la riga a deploy/fleet.txt:
      ${SLUG}  root@${IP}  ${PERCORSO}  ${DOMINIO}
FINE
