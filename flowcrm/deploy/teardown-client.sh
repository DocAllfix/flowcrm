#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
# Dismissione di un'istanza cliente.
#
# L'ORDINE NON È NEGOZIABILE: **il record DNS si toglie per primo.**
# Un sottodominio che punta a un IP non più nostro è un subdomain
# takeover: Hetzner riassegna quell'indirizzo a qualcun altro, e da quel
# momento uno sconosciuto serve contenuti su `cliente.flowcrm.it` — con
# un certificato valido, perché se lo fa emettere lui. È il modo più
# rapido di trasformare una dismissione ordinaria in un incidente che
# riguarda il nome del cliente e il nostro.
#
# Su WhistleVault questa procedura era solo un capitolo di runbook, cioè
# una cosa che si fa a memoria di venerdì sera. Qui è uno script.
#
# Uso:  ./deploy/teardown-client.sh <slug> [--conferma]
# Senza --conferma mostra soltanto che cosa farebbe.
# ═══════════════════════════════════════════════════════════════════
set -euo pipefail

SLUG="${1:?Uso: teardown-client.sh <slug> [--conferma]}"
CONFERMA="${2:-}"
BASE_DOMAIN="${BASE_DOMAIN:-flowcrm.it}"
PERCORSO="${PERCORSO:-/opt/flowcrm}"
DOMINIO="${SLUG}.${BASE_DOMAIN}"

COMPOSE_SUPABASE="${COMPOSE_SUPABASE:-supabase-docker/docker-compose.yml}"
COMPOSE_FLOWCRM="${COMPOSE_FLOWCRM:-deploy/docker-compose.flowcrm.yml}"
ENV_FILE="${ENV_FILE:-deploy/.env.prod}"

echo "$SLUG" | grep -Eq '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' \
  || { echo "ERRORE: slug non valido '$SLUG'" >&2; exit 1; }

if [ "$CONFERMA" != "--conferma" ]; then
  cat <<FINE
=== PROVA A VUOTO — non verrà toccato nulla ===

Dismissione di '$SLUG' ($DOMINIO). Con --conferma verrebbero eseguiti, in
quest'ordine:

  1. rimozione del record DNS $DOMINIO            ← PER PRIMO (anti-takeover)
  2. arresto dello stack in $PERCORSO
  3. cancellazione dei volumi (database e allegati)  ← IRREVERSIBILE
  4. promemoria: monitor, sotto-account Storage Box, server Hetzner

PRIMA di lanciarlo con --conferma, accertarsi che:
  - esista un backup finale VERIFICATO (restore-test.sh → PASSED);
  - il cliente abbia ricevuto l'esportazione dei propri dati, se prevista;
  - la retention dei backup residui sia quella scritta nel CONTRATTO:
    la decide il contratto, non chi esegue questo script.

FINE
  exit 0
fi

echo "=== dismissione di '$SLUG' ($DOMINIO) ==="

# ── 1. DNS, per primo ───────────────────────────────────────────────
echo "[1/4] rimozione record DNS…"
if [ -x ./deploy/dns-hostinger.sh ]; then
  ./deploy/dns-hostinger.sh --rimuovi "$SLUG" \
    || { echo "ERRORE: rimozione DNS fallita — MI FERMO QUI." >&2
         echo "Spegnere lo stack lasciando il record attivo espone al subdomain takeover." >&2
         exit 1; }
  echo "      record rimosso"
else
  echo "      ATTENZIONE: dns-hostinger.sh non disponibile."
  echo "      Rimuovere A RECORD di $DOMINIO dal pannello ADESSO, poi premere Invio."
  read -r _
fi

# ── 2. Stack giù ────────────────────────────────────────────────────
echo "[2/4] arresto dello stack…"
if [ -d "$PERCORSO" ]; then
  ( cd "$PERCORSO" && docker compose -f "$COMPOSE_SUPABASE" -f "$COMPOSE_FLOWCRM" \
      --env-file "$ENV_FILE" down ) || echo "      (già fermo)"
else
  echo "      $PERCORSO non presente — salto"
fi

# ── 3. Volumi ───────────────────────────────────────────────────────
# Per NOME, mai `docker volume prune`: il prune cancella per esclusione
# (tutto ciò che nessun container sta usando in questo istante) e su una
# macchina con più progetti porta via i dati di chi ha solo lo stack
# spento. Qui si nomina ciò che si vuole distruggere.
echo "[3/4] cancellazione volumi…"
for v in flowcrm_caddy_data flowcrm_caddy_config; do
  docker volume rm "$v" >/dev/null 2>&1 && echo "      rimosso $v" || true
done
if [ -d "$PERCORSO/supabase-docker/volumes" ]; then
  rm -rf "$PERCORSO/supabase-docker/volumes"
  echo "      rimossi database e allegati (bind mount)"
fi

# ── 4. Ciò che questo script NON può fare ───────────────────────────
cat <<FINE
[4/4] da completare a mano (fuori da questa macchina):

  - monitor sul control plane: rimuovere uptime, heartbeat backup e
    sentinella di '$SLUG', altrimenti allarmeranno per sempre su
    un'istanza che non esiste più;
  - progetto GlitchTip: archiviare (contiene stack trace del cliente);
  - sotto-account Storage Box: disattivare. I backup NON si cancellano
    qui — la loro retention la fissa il contratto;
  - server Hetzner: hcloud server delete <nome>;
  - rimuovere la riga di '$SLUG' da deploy/fleet.txt.

=== dismissione completata su questa macchina ===
FINE
