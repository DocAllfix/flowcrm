#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Prova di ripristino — CANCELLO, non rapporto.
#
# Exit 0 = il backup è davvero ripristinabile. Qualsiasi altro codice va
# trattato come allarme: il backup NON è affidabile.
#
# Un backup non verificato è una speranza. E "verificato" non vuol dire che
# il file si decifra: un dump VUOTO si ripristina benissimo e non contiene
# niente. Per questo qui si ripristina su un Postgres effimero e poi si
# CONTANO LE RIGHE.
#
# ── Il controllo che conta davvero, e che è specifico di Supabase ───
# Si verifica che la **RLS sia tornata viva**. Se il ripristino perde i ruoli
# (`anon`, `authenticated`), le policy restano scritte nel dump ma non si
# applicano più a nessuno: il database non fallisce, **si apre**. Un
# ripristino andato "a buon fine" può quindi consegnare al cliente un
# database senza barriere, e nessun conteggio di righe se ne accorgerebbe.
#
# Uso:
#   RESTIC_PASSWORD_FILE=/root/.flowcrm-backup-pass \
#   SB_HOST=u123456-sub3@u123456.your-storagebox.de \
#   ./deploy/restore-test.sh [ID_SNAPSHOT]
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

: "${RESTIC_PASSWORD_FILE:?RESTIC_PASSWORD_FILE obbligatorio}"
: "${SB_HOST:?SB_HOST obbligatorio}"
export RESTIC_REPOSITORY="sftp:${SB_HOST}:backup"
export RESTIC_PASSWORD_FILE

SNAPSHOT="${1:-latest}"
LAVORO=$(mktemp -d)
EFFIMERO="flowcrm-restore-test-$$"

pulisci() {
  docker rm -f "$EFFIMERO" >/dev/null 2>&1 || true
  rm -rf "$LAVORO"
}
trap pulisci EXIT

echo "[restore-test] snapshot: $SNAPSHOT"

# ── 1. Integrità del repository ─────────────────────────────────────
# `check` verifica le strutture del repository; `--read-data-subset` rilegge
# davvero una fetta dei dati. Senza quest'ultimo si verifica l'indice, non i
# byte: un blocco corrotto sul disco remoto passerebbe inosservato.
echo "[restore-test] verifica del repository…"
restic check --read-data-subset=5% || { echo "ERRORE: repository restic non integro" >&2; exit 1; }

# ── 2. Estrazione ───────────────────────────────────────────────────
restic restore "$SNAPSHOT" --target "$LAVORO" >/dev/null
DUMP=$(find "$LAVORO" -name database.sql | head -1)
RUOLI=$(find "$LAVORO" -name ruoli.sql | head -1)
ENVP=$(find "$LAVORO" -name env.prod | head -1)

[ -n "$DUMP" ]  || { echo "ERRORE: database.sql assente dallo snapshot" >&2; exit 1; }
[ -n "$RUOLI" ] || { echo "ERRORE: ruoli.sql assente — un ripristino senza ruoli apre il database" >&2; exit 1; }
[ -n "$ENVP" ]  || { echo "ERRORE: env.prod assente dallo snapshot" >&2; exit 1; }

# JWT_SECRET: senza, ogni sessione e ogni signed URL emessi diventano
# invalidi. È il RECEIPT_PEPPER di questo prodotto.
grep -q '^JWT_SECRET=..*' "$ENVP" || { echo "ERRORE: env.prod senza JWT_SECRET" >&2; exit 1; }
echo "[restore-test] i quattro pezzi ci sono"

# ── 3. Allegati ─────────────────────────────────────────────────────
# I byte stanno su disco e i metadati in Postgres: se lo snapshot avesse
# solo il database, l'istanza ripristinata elencherebbe file inesistenti.
N_FILE=$(find "$LAVORO" -path "*/storage/*" -type f | wc -l)
echo "[restore-test] file allegati nello snapshot: $N_FILE"

# ── 4. Ripristino su Postgres effimero ──────────────────────────────
docker run -d --rm --name "$EFFIMERO" \
  -e POSTGRES_PASSWORD=restoretest -e POSTGRES_DB=postgres \
  public.ecr.aws/supabase/postgres:17.6.1.141 >/dev/null

# Query reale e non `pg_isready`: durante l'inizializzazione Postgres avvia
# un server TEMPORANEO che accetta connessioni e poi si riavvia. pg_isready
# darebbe un "pronto" falso e il ripristino colpirebbe l'attimo in cui il
# socket sparisce. (Lezione già pagata in WhistleVault.)
echo "[restore-test] attendo il Postgres effimero…"
for _ in $(seq 1 90); do
  docker exec "$EFFIMERO" psql -U postgres -d postgres -c 'SELECT 1' >/dev/null 2>&1 && break
  sleep 1
done
docker exec "$EFFIMERO" psql -U postgres -d postgres -c 'SELECT 1' >/dev/null 2>&1 \
  || { echo "ERRORE: il Postgres effimero non è mai diventato pronto" >&2; exit 1; }

# Prima i ruoli, poi lo schema: l'ordine non è negoziabile, le policy del
# dump fanno riferimento a ruoli che devono già esistere.
docker exec -i "$EFFIMERO" psql -q -U postgres -d postgres < "$RUOLI" >/dev/null 2>&1 || true
docker exec -i "$EFFIMERO" psql -q -U postgres -d postgres < "$DUMP"  >/dev/null 2>&1 || true

interroga() { docker exec "$EFFIMERO" psql -tA -U postgres -d postgres -c "$1" 2>/dev/null | tr -d '[:space:]'; }

# ── 5. Conta le righe ───────────────────────────────────────────────
TABELLE=$(interroga "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r';")
UTENTI=$(interroga  "select count(*) from auth.users;")
ORG=$(interroga     "select count(*) from public.organizzazioni;")

echo "[restore-test] tabelle=$TABELLE utenti=$UTENTI organizzazioni=$ORG"
[ "${TABELLE:-0}" -ge 40 ] || { echo "ERRORE: solo $TABELLE tabelle — ripristino incompleto" >&2; exit 1; }
[ "${UTENTI:-0}"  -ge 1 ]  || { echo "ERRORE: nessun utente in auth.users — istanza inutilizzabile" >&2; exit 1; }

# ── 6. La RLS è tornata viva? ───────────────────────────────────────
# ATTENZIONE al valore di questo controllo: l'immagine Supabase CREA da sé
# `anon`, `authenticated`, `service_role` e `authenticator` all'inizializzazione,
# quindi ripristinando su quell'immagine risultano sempre presenti anche se il
# backup non li conteneva. Qui intercetta solo un ripristino su un Postgres
# NUDO. La prova che vale in ogni caso è quella viva più sotto: leggere come
# `authenticated` e ottenere zero righe. Verificato sul campo.
RUOLI_MANCANTI=$(interroga "select count(*) from (values ('anon'),('authenticated'),('service_role'),('authenticator')) r(n) where not exists (select 1 from pg_roles where rolname=r.n);")
[ "${RUOLI_MANCANTI:-9}" = "0" ] || { echo "ERRORE: $RUOLI_MANCANTI ruoli di sistema mancanti — la RLS non si riaggancia" >&2; exit 1; }

SENZA_RLS=$(interroga "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and not c.relrowsecurity;")
[ "${SENZA_RLS:-9}" = "0" ] || { echo "ERRORE: $SENZA_RLS tabelle ripristinate SENZA row level security" >&2; exit 1; }

POLICY=$(interroga "select count(*) from pg_policies where schemaname='public';")
[ "${POLICY:-0}" -ge 50 ] || { echo "ERRORE: solo $POLICY policy RLS ripristinate" >&2; exit 1; }

# Prova viva: come `authenticated` senza JWT, una tabella riservata deve
# restituire ZERO righe. Se ne restituisce, il database è aperto.
#
# Due `-c` separati e `tail -1`, e non è pignoleria: con `set role` e la SELECT
# nello stesso comando psql stampa PRIMA la riga "SET" e poi il conteggio, e il
# confronto riceve "SET0" invece di "0". Il cancello griderebbe al database
# aperto su un ripristino perfettamente sano — un falso allarme che blocca ogni
# verifica e insegna a ignorare il rosso. Verificato: succedeva davvero.
FUGA=$(docker exec "$EFFIMERO" psql -tA -U postgres -d postgres \
  -c "set role authenticated" \
  -c "select count(*) from public.fatture;" 2>/dev/null | tail -1 | tr -d '[:space:]')
[ "${FUGA:-0}" = "0" ] || { echo "ERRORE: come 'authenticated' senza JWT si leggono $FUGA fatture — RLS NON attiva" >&2; exit 1; }

echo "[restore-test] RLS viva: $POLICY policy, 0 tabelle scoperte, 0 righe leggibili senza identità"
echo "[restore-test] PASSED — lo snapshot $SNAPSHOT è ripristinabile"
