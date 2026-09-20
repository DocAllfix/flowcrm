#!/usr/bin/env bash
# Cancello anti-fuga di segreti. Gira in CI su ogni push e prima di ogni tag.
# Esce con 1 (e blocca) se nel repo TRACCIATO c'è materiale che non deve uscire.
#
# Evoluzione di WhistleBlower/deploy/check-no-secrets.sh. La differenza che
# conta è il controllo 5: le credenziali che sono davvero sfuggite a questo
# progetto (`manutenzione@flowcrm.local` / `Manutenzione2026!` in un file .md)
# NON erano hex lunghe e sarebbero passate indenni dal controllo originale.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1

ERR=0
fail() { echo "  FAIL  $1"; ERR=$((ERR + 1)); }
ok()   { echo "  OK    $1"; }

echo "=== check-no-secrets ==="

# 1. Nessun file .env reale tracciato (gli .example sono ammessi).
ENVS=$(git ls-files | grep -E '(^|/)\.env(\.[A-Za-z0-9._-]+)?$' | grep -vE '\.example$' || true)
[ -n "$ENVS" ] && fail "file .env tracciati: $(echo "$ENVS" | tr '\n' ' ')" || ok "nessun file .env tracciato"

# 2. Nessun documento Office / archivio tracciato (contengono credenziali e contratti).
DOCS=$(git ls-files | grep -Ei '\.(docx?|xlsx?|pptx?|zip)$' || true)
[ -n "$DOCS" ] && fail "documenti/archivi tracciati: $(echo "$DOCS" | tr '\n' ' ')" || ok "nessun documento Office tracciato"

# 3. Nessuna chiave privata.
KEYS=$(git grep -lE 'BEGIN (RSA |OPENSSH |EC |PGP )?PRIVATE KEY' -- . 2>/dev/null || true)
[ -n "$KEYS" ] && fail "blocchi PRIVATE KEY: $(echo "$KEYS" | tr '\n' ' ')" || ok "nessuna chiave privata"

# 4. Nessun JWT letterale. Le chiavi Supabase (anon E service_role) sono JWT:
#    un token vero committato è sempre un errore, anche se "solo" l'anon key.
JWTS=$(git grep -nE 'eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.' \
  -- . ':!*/check-no-secrets.sh' 2>/dev/null || true)
if [ -n "$JWTS" ]; then
  fail "JWT letterali nel repo (possibili chiavi Supabase):"
  echo "$JWTS" | cut -c1-120 | sed 's/^/        /'
else
  ok "nessun JWT letterale"
fi

# 5. Credenziali in chiaro nella documentazione.
#    Segnale composto: sulla stessa riga un indirizzo email E un token che
#    sembra una password (>=8 caratteri, almeno una lettera e una cifra).
#    È il controllo che avrebbe intercettato le credenziali demo in
#    provisioning/sola_lettura.md prima che finissero in un commit.
#    Nota: le email vanno RIMOSSE dalla riga prima di cercare la password,
#    altrimenti l'indirizzo stesso ("demo1@flowcrm.local" ha lettere e cifre)
#    si auto-segnala e il controllo diventa rumore che si impara a ignorare.
CREDS=$(git grep -nE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' -- '*.md' 2>/dev/null \
  | sed -E 's/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}//g' \
  | grep -E '`[A-Za-z0-9!@#$%^&*_-]{8,}`' \
  | grep -E '`[^`]*[A-Za-z][^`]*[0-9][^`]*`|`[^`]*[0-9][^`]*[A-Za-z][^`]*`' \
  | grep -viE 'example|esempio|placeholder|xxx|password manager' || true)
if [ -n "$CREDS" ]; then
  fail "possibili credenziali in chiaro nella documentazione:"
  echo "$CREDS" | cut -c1-120 | sed 's/^/        /'
else
  ok "nessuna credenziale in chiaro nei .md"
fi

# 6. Segreti hardcoded assegnati a variabili sensibili.
HITS=$(git grep -nE '(PASSWORD|PASSPHRASE|SECRET|SERVICE_ROLE|API_KEY|TOKEN)[A-Za-z_]*"?\s*[:=]\s*"?[A-Za-z0-9/+_-]{16,}' \
  -- . ':!*.example' ':!*/check-no-secrets.sh' ':!*.test.ts' 2>/dev/null \
  | grep -viE 'process\.env|import\.meta\.env|Deno\.env|placeholder|your-|xxx' || true)
if [ -n "$HITS" ]; then
  fail "possibili segreti hardcoded:"
  echo "$HITS" | cut -c1-120 | sed 's/^/        /'
else
  ok "nessun segreto hardcoded sospetto"
fi

# 7. Bundle buildato: nel JS non deve MAI finire una chiave service_role.
#
# Si cercano JWT VERI e se ne decodifica il ruolo, non la stringa
# "service_role": quella compare come COMMENTO nel sorgente della libreria
# supabase-js («Requires the `service_role` key») e finisce in ogni
# source map. Cercarla faceva fallire il controllo su qualunque macchina
# avesse fatto un build — un allarme che suona sempre smette di allarmare.
#
# La chiave `anon` invece è attesa: viaggia in ogni browser per progetto.
for D in flowcrm/dist; do
  [ -d "$D" ] || continue
  TROVATI=""
  for TOK in $(grep -rhoE 'eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}' "$D" --include='*.js' 2>/dev/null | sort -u); do
    RUOLO=$(printf '%s' "$TOK" | cut -d. -f2 | tr '_-' '/+' | base64 -d 2>/dev/null | grep -oE '"role"[[:space:]]*:[[:space:]]*"[^"]+"' | cut -d'"' -f4)
    case "$RUOLO" in
      service_role) TROVATI="$TROVATI service_role" ;;
    esac
  done
  if [ -n "$TROVATI" ]; then
    fail "chiave service_role dentro il bundle $D — MAI esporla al browser"
  else
    ok "bundle $D senza chiavi service_role"
  fi
done

echo ""
if [ "$ERR" -gt 0 ]; then
  echo "RISULTATO: $ERR problemi — NON rilasciare finché non sono risolti"
  exit 1
fi
echo "RISULTATO: pulito"
