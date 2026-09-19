#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Ripristino a un ISTANTE PRECISO (PITR).
#
# Procedura d'emergenza, non di manutenzione: si usa quando serve tornare
# a com'era il database **prima** di un fatto preciso — una cancellazione
# di massa, un aggiornamento sbagliato, un'importazione andata storta —
# perdendo il meno possibile del lavoro successivo.
#
#   ./deploy/pitr-restore.sh "2026-09-18 14:30:00"
#
# Il ripristino avviene su un cluster SEPARATO, non sull'istanza viva.
# È deliberato: si guarda il risultato PRIMA di decidere se sostituire la
# produzione. Un PITR fatto direttamente sull'istanza in esercizio, se il
# momento scelto è sbagliato, distrugge anche ciò che si voleva salvare —
# e il momento giusto quasi mai si conosce al primo tentativo.
#
# Differenza dal ripristino ordinario (restore-test.sh, dump logico):
#   - il dump logico riporta all'ULTIMA NOTTE e attraversa le versioni
#     maggiori di Postgres;
#   - il PITR riporta a QUALUNQUE ISTANTE, ma richiede la stessa versione
#     maggiore e una copia fisica del cluster.
# Servono entrambi, e per ragioni diverse.
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

ISTANTE="${1:?Uso: pitr-restore.sh \"AAAA-MM-GG HH:MM:SS\"  (ora del server, UTC)}"
: "${RESTIC_PASSWORD_FILE:?RESTIC_PASSWORD_FILE obbligatorio}"
: "${SB_HOST:?SB_HOST obbligatorio}"
export RESTIC_REPOSITORY="sftp:${SB_HOST}:backup"
export RESTIC_PASSWORD_FILE

IMMAGINE="${IMMAGINE:-public.ecr.aws/supabase/postgres:17.6.1.141}"
LAVORO=$(mktemp -d)
CONTENITORE="flowcrm-pitr-$$"
PORTA="${PORTA:-55432}"

pulisci() { docker rm -f "$CONTENITORE" >/dev/null 2>&1 || true; }
trap pulisci EXIT

echo "=== PITR verso $ISTANTE ==="

# ── 1. Lo snapshot giusto è quello PRECEDENTE all'istante ───────────
# Un backup di base preso DOPO il momento a cui si vuole tornare non
# serve a niente: i WAL si riapplicano solo in avanti.
echo "[1/5] cerco l'ultimo backup di base precedente a $ISTANTE…"
SNAP=$(restic snapshots --json --tag flowcrm 2>/dev/null \
  | python3 -c "
import sys,json,datetime
limite=datetime.datetime.fromisoformat('$ISTANTE'.replace(' ','T'))
cands=[s for s in json.load(sys.stdin)
       if datetime.datetime.fromisoformat(s['time'][:19]) <= limite]
print(cands[-1]['short_id'] if cands else '')")
[ -n "$SNAP" ] || { echo "ERRORE: nessun backup di base precedente a $ISTANTE" >&2; exit 1; }
echo "      snapshot $SNAP"

# ── 2. Estrazione ───────────────────────────────────────────────────
echo "[2/5] estraggo base e archivio WAL…"
restic restore "$SNAP" --target "$LAVORO" >/dev/null
BASE=$(find "$LAVORO" -type d -name base | head -1)
WAL=$(find "$LAVORO" -type d -name '*wal_archivio*' -o -type d -name 'wal' | head -1)
[ -n "$BASE" ] || { echo "ERRORE: lo snapshot non contiene un backup di base — PITR impossibile" >&2; exit 1; }
[ -n "$WAL" ]  || { echo "ERRORE: lo snapshot non contiene l'archivio WAL" >&2; exit 1; }

# ── 3. Istruzioni di recupero ───────────────────────────────────────
# `recovery_target_action = promote`: a obiettivo raggiunto il cluster
# diventa scrivibile. Con `pause` resterebbe in sola lettura e sembrerebbe
# rotto a chi non conosce la procedura.
cat > "$BASE/postgresql.auto.conf" <<CONF
restore_command = 'gunzip -c /wal/%f.gz > %p 2>/dev/null || cp /wal/%f %p'
recovery_target_time = '$ISTANTE'
recovery_target_action = 'promote'
CONF
touch "$BASE/recovery.signal"
chmod 700 "$BASE"

# ── 4. Avvio del cluster ricostruito ────────────────────────────────
echo "[3/5] avvio il cluster ricostruito sulla porta $PORTA…"
docker run -d --name "$CONTENITORE" -p "127.0.0.1:${PORTA}:5432" \
  -e POSTGRES_PASSWORD=pitr \
  -v "$BASE:/var/lib/postgresql/data" \
  -v "$WAL:/wal:ro" \
  "$IMMAGINE" >/dev/null

echo "[4/5] attendo la riapplicazione dei WAL…"
for _ in $(seq 1 120); do
  docker exec "$CONTENITORE" psql -U postgres -c 'SELECT 1' >/dev/null 2>&1 && break
  sleep 2
done
docker exec "$CONTENITORE" psql -U postgres -c 'SELECT 1' >/dev/null 2>&1 \
  || { echo "ERRORE: il cluster non è arrivato in stato utilizzabile. Log:" >&2
       docker logs --tail 40 "$CONTENITORE" >&2; exit 1; }

# ── 5. Che cosa c'è dentro ──────────────────────────────────────────
echo "[5/5] verifica:"
docker exec "$CONTENITORE" psql -tA -U postgres -c "
  select '      ora del cluster: '||now()::text
  union all select '      organizzazioni: '||count(*)::text from organizzazioni
  union all select '      utenti:         '||count(*)::text from auth.users
  union all select '      policy RLS:     '||count(*)::text from pg_policies where schemaname='public';"

cat <<FINE

=== cluster ricostruito allo stato del $ISTANTE ===

È in esecuzione su 127.0.0.1:$PORTA, SEPARATO dalla produzione.
  psql "postgresql://postgres:pitr@127.0.0.1:$PORTA/postgres"

Guardare i dati PRIMA di decidere. Se l'istante non è quello giusto,
rilanciare con un orario diverso: la produzione non è stata toccata.

Per promuoverlo a produzione (operazione irreversibile, con l'istanza
ferma e un backup fresco già fatto):
  1. docker compose ... down
  2. sostituire supabase-docker/volumes/db/data con questo cluster
  3. docker compose ... up -d
  4. ./deploy/security-headers-check.sh https://<dominio>

Questo contenitore viene rimosso all'uscita dello script: copiare altrove
ciò che serve prima di chiudere.
FINE

read -r -p "Invio per terminare il cluster temporaneo… " _
