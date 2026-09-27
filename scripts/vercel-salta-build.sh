#!/bin/sh
# ═══════════════════════════════════════════════════════════════════
# Filtro dei rilasci Vercel («Ignored Build Step») per i due progetti che
# vivono in questo repository: pmiflow-demo (cartella flowcrm/) e
# pmiflow-landing (cartella landing/). Si lancia dalla cartella del progetto:
#   "ignoreCommand": "sh ../scripts/vercel-salta-build.sh"
#
# Vercel conosce SOLO due uscite: 0 = salta il rilascio, 1 = compila.
# Qualunque altro codice è un ERRORE della build. Quindi qui si esce solo
# con 0 o 1, e nel dubbio con 1: un rilascio in più è meglio di uno in meno.
#
# Tre trappole già pagate (GUASTI G-41):
#  1. confrontare con HEAD^ salta le modifiche di una fusione di più commit:
#     si confronta con l'ULTIMO RILASCIO RIUSCITO ($VERCEL_GIT_PREVIOUS_SHA);
#  2. il clone di Vercel è superficiale e quel commit può mancare: git diff
#     esce con 128 (errore). Si prova a scaricarlo, altrimenti si compila;
#  3. rilasciare lo STESSO commit è sempre voluto (variabili d'ambiente
#     cambiate, rilascio forzato): si compila.
# In più: `ignoreCommand` nel vercel.json non può superare 256 caratteri,
# per questo la logica sta qui.
# ═══════════════════════════════════════════════════════════════════
P="$VERCEL_GIT_PREVIOUS_SHA"
[ -n "$P" ] || exit 1
[ "$P" = "$VERCEL_GIT_COMMIT_SHA" ] && exit 1
git cat-file -e "$P^{commit}" 2>/dev/null || git fetch --quiet --depth=1 origin "$P" 2>/dev/null || exit 1
if git diff --quiet "$P" HEAD -- .; then
  echo "Nessuna modifica in $(basename "$PWD") dall'ultimo rilascio: salto."
  exit 0
fi
exit 1
