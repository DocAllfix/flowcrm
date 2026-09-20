# ═══════════════════════════════════════════════════════════════════
# FlowCRM — immagine UNICA per tutti i clienti.
#
# Non contiene nulla di specifico di un cliente: nome, logo, colori, moduli,
# URL e chiave Supabase arrivano a runtime da /srv/config.json, generato
# dall'entrypoint a partire dall'ambiente (vedi deploy/docker-entrypoint.sh).
#
# È deliberato: l'immagine si costruisce in CI, si pubblica su GHCR taggata
# con il GIT_SHA e ogni istanza fa `pull`. Così tutti i clienti girano
# ESATTAMENTE lo stesso binario e un difetto che compare da uno solo non può
# essere la sua build. Costruire a bordo della VPS, oltre a chiedere RAM che
# serve allo stack Supabase, toglierebbe questa garanzia.
# ═══════════════════════════════════════════════════════════════════

# ── Stadio 1: build ─────────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app

# Le dipendenze si installano prima del codice: finché package*.json non
# cambia, questo strato resta in cache e la build è di secondi.
COPY package.json package-lock.json ./

# `npm install` e NON `npm ci`, per la stessa ragione già annotata in
# .github/workflows/ci.yml: il lockfile di questo progetto è generato su
# Windows e **omette le dipendenze opzionali per Linux** (bug npm #4828).
# `npm ci` pretende un lockfile completo e coerente con la piattaforma, e
# qui fallisce — verificato: la build si ferma a questo passo.
#
# Sarebbe preferibile `npm ci`, che è riproducibile: il modo per arrivarci
# è rigenerare il lockfile in ambiente Linux (per esempio dentro questa
# stessa immagine) e committarlo. È un cambio che tocca il flusso di lavoro
# di chi sviluppa su Windows, quindi va deciso, non fatto di nascosto qui.
RUN npm install --no-audit --no-fund

COPY . .

# Niente variabili VITE_* qui dentro: se ne comparisse una, tornerebbe a
# essere cotta nel bundle e l'immagine smetterebbe di essere unica.
RUN npx tsc -b && npx vite build

# Le source map servono al collettore degli errori, non al cliente: con
# `sourcemap: 'hidden'` il bundle non le referenzia, ma se restassero qui
# Caddy le servirebbe e chiunque ne conosca il nome scaricherebbe il
# sorgente. La CI le carica su GlitchTip prima di costruire l'immagine.
RUN find dist -name '*.map' -delete

# ── Stadio 2: esecuzione ────────────────────────────────────────────
FROM caddy:2-alpine

# jq serve all'entrypoint per generare config.json con l'escaping corretto:
# comporre JSON concatenando stringhe si rompe al primo cliente che ha un
# apostrofo nel nome.
RUN apk add --no-cache jq

COPY --from=build /app/dist /srv
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Sonda interna: dice se Caddy serve l'applicazione. NON sostituisce
# l'health check applicativo (Edge Function `health`), che invece verifica
# database, auth e storage.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/index.html || exit 1

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["caddy", "run", "--config", "/etc/caddy/Caddyfile", "--adapter", "caddyfile"]
