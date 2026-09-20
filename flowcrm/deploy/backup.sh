#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Backup di un'istanza FlowCRM verso Hetzner Storage Box (restic).
#
# ── Perché NON basta un pg_dump del solo schema `public` ────────────
# In uno stack Supabase il database non è solo i dati: l'autenticazione
# (schema `auth`), i metadati dei file (schema `storage`) e soprattutto i
# RUOLI (`anon`, `authenticated`, `service_role`, `authenticator`) vivono
# nello stesso cluster. Ripristinare senza i ruoli dà un database in cui le
# policy RLS non si riagganciano a nulla: non fallisce, **si apre**.
# Per questo il set di backup è composto da quattro pezzi, e il test di
# ripristino verifica esplicitamente che la RLS sia tornata viva.
#
# La documentazione ufficiale Supabase sul backup self-hosted NON esiste: la
# discussione aperta sul loro GitHub si chiude con un manutentore che
# consiglia di copiare le cartelle dei volumi. Copiare una data-directory a
# caldo produce un backup incoerente che si ripristina benissimo e contiene
# spazzatura. Qui si usa il dump logico, a database vivo e coerente.
#
# ── Perché restic e non gpg+rclone ─────────────────────────────────
#   - cifratura lato client nativa (la Storage Box vede solo blocchi opachi);
#   - deduplica reale: con gpg ogni dump è un blob nuovo, 365 copie intere
#     all'anno dello stesso database;
#   - retention dichiarativa e `check --read-data-subset`, che verifica il
#     repository e non solo il checksum del file appena scritto;
#   - **chiave SSH append-only**: chi entra nella VPS può scrivere backup ma
#     non cancellarli. Con rclone le credenziali sulla VPS permettono anche
#     la cancellazione del remoto, ed è la prima cosa che fa un ransomware.
#
# ── Particolarità della Storage Box (pagate sul campo in WhistleVault) ──
#   - SSH sulla porta **23**, non 22;
#   - shell ristretta: ls, mkdir, rm, stat — **niente `find`**;
#   - un **sotto-account per cliente** (u######-subN), jailato: i percorsi
#     sono RELATIVI, un path assoluto non funziona.
#
# Uso (dalla cartella dell'istanza, via cron):
#   RESTIC_PASSWORD_FILE=/root/.flowcrm-backup-pass \
#   SB_HOST=u123456-sub3@u123456.your-storagebox.de \
#   ./deploy/backup.sh
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

COMPOSE_SUPABASE="${COMPOSE_SUPABASE:-supabase-docker/docker-compose.yml}"
COMPOSE_FLOWCRM="${COMPOSE_FLOWCRM:-deploy/docker-compose.flowcrm.yml}"
ENV_FILE="${ENV_FILE:-deploy/.env.prod}"
STORAGE_DIR="${STORAGE_DIR:-supabase-docker/volumes/storage}"
LAVORO="${LAVORO:-/var/backups/flowcrm-lavoro}"

# Heartbeat: URL di un monitor push (Uptime Kuma) sul control plane. Se il
# backup smette di girare, l'allarme scatta DA SOLO dopo la scadenza, senza
# che nessuno legga un log. Un backup che fallisce in silenzio su un file
# che nessuno apre è il difetto più comune di tutti.
HEARTBEAT_URL="${HEARTBEAT_URL:-}"

: "${RESTIC_PASSWORD_FILE:?RESTIC_PASSWORD_FILE obbligatorio (file chmod 600 fuori dal repo)}"
: "${SB_HOST:?SB_HOST obbligatorio (es. u123456-sub3@u123456.your-storagebox.de)}"

# Percorso RELATIVO: i sotto-account jailati non scrivono su path assoluti.
export RESTIC_REPOSITORY="sftp:${SB_HOST}:backup"
export RESTIC_PASSWORD_FILE

[ -f "$ENV_FILE" ] || { echo "ERRORE: $ENV_FILE non trovato (lanciare dalla cartella dell'istanza)" >&2; exit 1; }

POSTGRES_DB=$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | cut -d= -f2-)
POSTGRES_DB="${POSTGRES_DB:-postgres}"

dc() { docker compose -f "$COMPOSE_SUPABASE" -f "$COMPOSE_FLOWCRM" --env-file "$ENV_FILE" "$@"; }

# Come si raggiunge il database. Normalmente passa dal compose dell'istanza,
# ma è SOSTITUIBILE con DB_EXEC — per esempio:
#   DB_EXEC="docker exec -i supabase_db_flowcrm" ./deploy/backup.sh
#
# Non è una comodità: cablare l'accesso sul compose rende questo script
# collaudabile soltanto su una VPS con un'istanza cliente viva. E uno script
# che si può provare solo in produzione è uno script che si prova in
# produzione, la prima volta che serve davvero.
db() {
  if [ -n "${DB_EXEC:-}" ]; then $DB_EXEC "$@"; else dc exec -T db "$@"; fi
}

STAMP=$(date +%F-%H%M%S)
DEST="$LAVORO/$STAMP"
mkdir -p "$DEST"
chmod 700 "$LAVORO"

# La cartella di lavoro contiene un dump IN CHIARO fino a che restic non
# l'ha cifrato: va rimossa comunque, anche se lo script fallisce a metà.
trap 'rm -rf "$DEST"' EXIT

echo "[backup] $STAMP — inizio"

# ── 1. Ruoli del cluster ────────────────────────────────────────────
# Senza questi il ripristino produce un database SENZA `anon` e
# `authenticated`: le policy RLS restano scritte ma non si applicano più a
# nessuno. È il pezzo che si dimentica sempre.
db pg_dumpall -U postgres --roles-only > "$DEST/ruoli.sql"
echo "[backup] ruoli.sql ok"

# ── 2. Database, TUTTI gli schemi ───────────────────────────────────
# --compress=0 di proposito: comprimere qui annulla la deduplica di restic,
# che è la ragione per cui restic è stato scelto. Comprime lui, a blocchi.
db pg_dump -U postgres --compress=0 --format=plain \
  --schema=public --schema=auth --schema=storage --schema=graphql_public \
  "$POSTGRES_DB" > "$DEST/database.sql"
echo "[backup] database.sql ok ($(du -h "$DEST/database.sql" | cut -f1))"

# Un dump vuoto si ripristina benissimo. Meglio accorgersene adesso.
RIGHE=$(wc -l < "$DEST/database.sql")
[ "$RIGHE" -gt 100 ] || { echo "ERRORE: dump sospetto ($RIGHE righe)" >&2; exit 1; }

# ── 3. Segreti dell'istanza ─────────────────────────────────────────
# Contiene JWT_SECRET: perderlo invalida ogni sessione e ogni signed URL
# emessi. È l'equivalente del RECEIPT_PEPPER di WhistleVault.
cp "$ENV_FILE" "$DEST/env.prod"
echo "[backup] env.prod ok"

# ── 4. File degli allegati ──────────────────────────────────────────
# Supabase Storage tiene i BYTE su disco e i METADATI in Postgres: salvarne
# uno solo dei due dà un archivio che elenca file inesistenti (o viceversa).
if [ ! -d "$STORAGE_DIR" ]; then
  echo "ERRORE: cartella allegati '$STORAGE_DIR' non trovata — il backup sarebbe senza file" >&2
  exit 1
fi

# ── 4b. Backup di BASE + archivio WAL (per il ripristino a un istante) ──
# Il dump logico da solo non basta al PITR: serve una copia FISICA del
# cluster (`pg_basebackup`) su cui riapplicare i WAL. Il dump resta perché
# è ciò che si ripristina nel caso ordinario, ed è l'unico leggibile fra
# versioni maggiori di Postgres diverse.
WAL_VOLUME=$(docker volume inspect flowcrm_wal_archivio --format '{{.Mountpoint}}' 2>/dev/null || true)
if [ -n "$WAL_VOLUME" ]; then
  echo "[backup] backup di base per il PITR…"
  rm -rf "$DEST/base"
  db pg_basebackup -U postgres -D - -Ft -X none     | tar -xf - -C "$(mkdir -p "$DEST/base" && echo "$DEST/base")" 2>/dev/null     || echo "[backup] ATTENZIONE: pg_basebackup non riuscito — il PITR non sarà possibile da questo snapshot"
else
  echo "[backup] nota: archivio WAL assente (PITR non attivo su questa istanza)"
fi

# ── 5. Snapshot restic ──────────────────────────────────────────────
restic snapshots >/dev/null 2>&1 || { echo "[backup] inizializzo il repository…"; restic init; }

restic backup \
  --tag "flowcrm" --tag "$STAMP" \
  --host "$(hostname)" \
  "$DEST" "$STORAGE_DIR" ${WAL_VOLUME:+"$WAL_VOLUME"}
echo "[backup] snapshot creato"

# ── 6. Retention ────────────────────────────────────────────────────
# `forget` senza `--prune`: con la chiave APPEND-ONLY la cancellazione è
# negata dal server, ed è voluto. A potare è il control plane, che è l'unico
# a possedere la chiave piena. Se questo script potesse cancellare, la
# protezione append-only non servirebbe a niente.
restic forget --tag "flowcrm" \
  --keep-daily 14 --keep-weekly 8 --keep-monthly 12 \
  || echo "[backup] nota: forget non applicato (atteso con chiave append-only)"

echo "[backup] $STAMP — completato"

# ── 7. Heartbeat ────────────────────────────────────────────────────
if [ -n "$HEARTBEAT_URL" ]; then
  curl -fsS --max-time 10 "$HEARTBEAT_URL" >/dev/null \
    && echo "[backup] heartbeat inviato" \
    || echo "[backup] ATTENZIONE: heartbeat non inviato (il backup però è a posto)"
else
  echo "[backup] ATTENZIONE: nessun HEARTBEAT_URL — un fallimento futuro passerebbe inosservato"
fi

# --- Cron consigliato (crontab -e come root) -------------------------------
#   15 2 * * *  cd /opt/flowcrm && RESTIC_PASSWORD_FILE=/root/.flowcrm-backup-pass \
#               SB_HOST=u123456-sub3@u123456.your-storagebox.de \
#               HEARTBEAT_URL=https://monitor.../api/push/xxxx \
#               ./deploy/backup.sh >> /var/log/flowcrm-backup.log 2>&1
#   0  4 1 * *  cd /opt/flowcrm && RESTIC_PASSWORD_FILE=/root/.flowcrm-backup-pass \
#               SB_HOST=u123456-sub3@u123456.your-storagebox.de \
#               ./deploy/restore-test.sh >> /var/log/flowcrm-restore-test.log 2>&1
