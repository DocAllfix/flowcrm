# Runbook — installazione di un'istanza FlowCRM

Procedura da seguire **alla lettera** per ogni nuovo cliente. Chi la esegue
non deve dover capire l'architettura: se un passo richiede una decisione, è un
difetto di questo documento — segnalalo invece di improvvisare.

Documento vivo: ogni guasto incontrato diventa una voce in
[GUASTI.md](GUASTI.md) **prima** che l'istanza sia dichiarata consegnata.

---

## ⚠️ Stato di maturità — leggere prima di usarlo con un cliente vero

Questo runbook è stato scritto **insieme** agli script, e gli script non hanno
ancora provisionato una VPS reale. La distinzione conta più di qualunque altra
cosa in questo file:

| Parte | Stato |
|---|---|
| Migrazioni di sicurezza (Fase 0) | **provata** — 241/241 pgTAP verdi il 2026-09-18 |
| Build applicativa e configurazione a runtime | **provata** — typecheck, build, 13/13 unit test |
| `check-no-secrets.sh` | **provato** contro una fuga reale in history, e **in CI** dopo la correzione del bit di esecuzione (prima non poteva partire: usciva 126) |
| CI, lavoro `immagine` | **provato in produzione** — immagine costruita e pubblicata su GHCR al primo push su `main` |
| Suite end-to-end (19 spec) | **provata** contro uno stack Supabase reale: **25 passati, 0 falliti, 2 saltati per prerequisito dichiarato** (da 21 fallimenti iniziali) |
| Recupero password | **provato end-to-end** — richiesta, mail in casella, collegamento seguito (303 con sessione), password cambiata; nuova 200 e **vecchia 400** |
| Caddyfile | **provato** — `caddy validate` OK, redirect http→https confermato |
| Entrypoint e generazione `config.json` | **provato** — incluse le guardie su modulo ignoto e chiave `service_role` |
| Compose unito (upstream + sovrapposizione) | **provato** — `config` valido, 0 avvisi, `supavisor` escluso |
| Dockerfile e immagine applicativa | **provata** — costruita (93,1 MB), avviata, `config.json` generato, index e rotte SPA a 200, nessun segreto dentro |
| Stack completo avviato fino in fondo | **mai eseguito** (richiede una VPS: il collaudo è stato sul solo servizio `app`) |
| Outbox posta + hook `send_email_hook` | **provato** — migrazione applicata, hook chiamato con payload GoTrue, messaggio accodato, tentativo incrementato al prelievo, 241/241 pgTAP ancora verdi |
| Edge Function `drena-posta` | **scritta, mai eseguita** — serve un relay configurato |
| `restore-test.sh` (logica dei cancelli) | **provata** su un ripristino reale — 91 tabelle, 329 policy, lettura senza identità a 0; tre difetti del cancello trovati e corretti |
| `backup.sh` (produzione dei quattro pezzi) | **provata** — ruoli e dump multi-schema generati e ripristinati |
| Trasporto verso Storage Box, `sentinel.sh` | **mai eseguiti** (servono Storage Box e control plane) |
| Provisioning Hetzner + DNS | `provision-client.sh` **scritto, mai eseguito** (serve il token Hetzner) |
| PITR (archiviazione WAL + `pitr-restore.sh`) | **scritti, mai eseguiti** — merge compose validato, 0 avvisi |

> **Nota sull'outbox della posta (2026-09-18).** La coda è verificata a
> livello di database: l'hook accoda, il prelievo incrementa il tentativo
> prima dell'invio, il messaggio esce dalla coda quando è segnato inviato.
> **Resta da provare il giro completo con un relay vero**: relay spento →
> la richiesta dell'utente deve riuscire lo stesso e i tentativi salire;
> relay riacceso → il messaggio deve partire da solo. Senza quella prova
> si è verificato che la mail *si accoda*, non che *arriva*.

Il `RUNBOOK.md` di WhistleVault è scritto bene, esiste da mesi e non ha
impedito nessuno dei sei difetti trovati quando quegli artefatti sono stati
eseguiti per la prima volta. **Un runbook scritto prima descrive ciò che si
crede che accada.** Il primo cliente va installato con questo documento
aperto accanto, correggendolo mentre si procede.

---

## 0 · Prima di cominciare

**Accessi necessari** (se ne manca uno, fermarsi qui):

- token API Hetzner Cloud — crea e cancella i server di **tutti** i clienti
  dei tre prodotti: va nel password manager, non in un file sul disco;
- credenziali Storage Box `wv-backup` (BX11, già attiva) per creare il
  **sotto-account dedicato** a questo cliente;
- token API Hostinger (hPanel → API) per il record DNS;
- accesso al control plane per creare progetto GlitchTip e monitor;
- **casella di posta del dominio Hostinger**: `ops@<dominio>` più gli alias
  `no-reply@`, `postmaster@`, `abuse@`, `dmarc@`. Arriva col dominio, non
  serve un fornitore esterno. **Credenziali distinte per istanza.**
  Verificare SPF, DKIM e DMARC prima del go-live: senza DKIM i messaggi
  finiscono nello spam e la prova del recupero password fallisce per una
  ragione che non sembra tecnica.

**Da decidere col commerciale**:

- `<slug>` del cliente: solo `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`, finisce nel
  dominio ed è irreversibile senza rifare l'istanza;
- moduli acquistati fra `gare`, `cantiere`, `automezzi`, `agenti`,
  `poliambulatori`;
- ragione sociale, logo, colori.

---

## 1 · Preparare l'immagine

L'immagine si costruisce **in CI**, mai sulla VPS: tutti i clienti devono
girare lo stesso binario, altrimenti un difetto che compare da uno solo non è
attribuibile.

```bash
git tag -a v1.x.y -m "release" && git push --tags
# attendere che la CI pubblichi ghcr.io/docallfix/flowcrm:<GIT_SHA>
```

Annotare il `GIT_SHA`: è il valore di `FLOWCRM_TAG`. **Mai `latest`** — con
`latest` due istanze aggiornate in giorni diversi eseguono codice diverso e
non c'è modo di sapere quale.

La CI pubblica l'immagine con **due tag**, lo SHA completo e quello corto a 7
caratteri, quindi va bene sia `git rev-parse HEAD` sia quello che si legge in
`git log --oneline`.

> **Se si verifica per digest, dire QUALE.** `docker manifest inspect`
> restituisce una **lista**: c'è il digest dell'indice e, dentro, quello del
> manifest di piattaforma. Sono valori diversi dello stesso oggetto, e due
> persone che controllano «lo stesso digest» guardando campi diversi si
> confermano a vicenda senza parlarsi. Successo davvero, fra due sessioni, su
> `2c6f1c0`. Per l'indice:
> ```bash
> docker buildx imagetools inspect ghcr.io/docallfix/flowcrm:<tag> | grep -i digest
> ```
> Quello che conta per ancorare un deploy è **l'indice**, perché è ciò che
> `docker pull` risolve.

Il doppio tag è deliberato: chiedere di copiare a mano 40 caratteri esatti è
una richiesta che prima o poi qualcuno sbaglia, e l'errore si manifesta come
«immagine non pubblicata» — un messaggio che manda a cercare il guasto nella
CI invece che nel tag.

---

## 2 · Creare il server

**CX32 (4 vCPU / 8 GB)**, Ubuntu 24.04, località UE (Norimberga/Helsinki).

Il dimensionamento non è negoziabile verso il basso: lo stack Supabase sono
~10 container che a regime chiedono 8 GB, e le sole immagini occupano **~8 GB
di disco** prima di qualunque dato. Gli altri due prodotti stanno su CX22
perché non self-hostano Supabase — non è un'incoerenza, è un carico diverso.

> Per l'automazione riusare
> `FormazioneEvalis(working name)/infra/blog-cms/attendi-e-crea-server.py`.
> L'API vuole `location` e **non** `datacenter` (dismesso, risponde 422) — vedi
> [G-09](GUASTI.md#g-09--la-creazione-del-server-hetzner-risponde-422).

Poi, **firewall cloud Hetzner** (non solo UFW): consentire solo 22, 80, 443.
Serve davvero, perché le porte pubblicate da Docker scavalcano UFW —
[G-01](GUASTI.md#g-01--postgres-resta-esposto-a-internet-dopo-aver-chiuso-le-porte).

```bash
ssh root@<IP> 'bash -s' < deploy/setup-vps.sh
```

---

## 3 · Record DNS

```bash
./deploy/dns-hostinger.sh <slug> <IP>
```

**`overwrite: false` sempre**, e snapshot della zona prima di scrivere: con
`overwrite: true` l'API sostituisce l'**intera zona** e cancella i record di
tutti i clienti già attivi —
[G-10](GUASTI.md#g-10--un-record-dns-cancella-la-zona-di-tutti-gli-altri-clienti).

Attendere la propagazione prima del passo 5, altrimenti Let's Encrypt fallisce
e si consumano tentativi di emissione:

```bash
dig +short <slug>.pmiflow.it   # deve rispondere l'IP nuovo
```

---

## 4 · Configurare l'istanza

```bash
ssh root@<IP>
git clone <repo> /opt/flowcrm && cd /opt/flowcrm
git checkout <GIT_SHA>
curl -fsSL -o supabase-docker/docker-compose.yml \
  https://raw.githubusercontent.com/supabase/supabase/master/docker/docker-compose.yml

cp deploy/.env.prod.example deploy/.env.prod
chmod 600 deploy/.env.prod
```

Compilare `deploy/.env.prod`. Ogni segreto **unico per cliente** — riusarli
significa che un token di un cliente vale sull'istanza di un altro:

```bash
openssl rand -hex 32   # per POSTGRES_PASSWORD, JWT_SECRET, SECRET_KEY_BASE,
                       # REALTIME_DB_ENC_KEY, VAULT_ENC_KEY, PG_META_CRYPTO_KEY
```

`ANON_KEY` e `SERVICE_ROLE_KEY` si generano dal `JWT_SECRET` (payload
`{"role":"anon"}` e `{"role":"service_role"}`).

Poi il controllo che evita il passo falso più costoso:

```bash
./deploy/preflight.sh     # chiavi attese, DNS risolto, disco, RAM
```

---

## 5 · Avviare

```bash
docker compose -f supabase-docker/docker-compose.yml \
               -f deploy/docker-compose.flowcrm.yml \
               --env-file deploy/.env.prod up -d
```

**Subito dopo, prima di qualunque altra cosa** — è il controllo che ha già
evitato di consegnare istanze con Postgres esposto:

```bash
ss -tlnp | grep -vE '127\.0\.0\.1|::1'   # devono restare SOLO 80 e 443
```

Se compare 5432 o 6543, fermarsi e leggere
[G-01](GUASTI.md#g-01--postgres-resta-esposto-a-internet-dopo-aver-chiuso-le-porte).

---

## 6 · Schema, licenze, amministratore

> ⛔ **Prima di lanciare qualunque comando di migrazione, stampare dove punta.**
> Il CLI Supabase applica le migrazioni al progetto **collegato**, non a quello
> che suggerisce il nome della cartella. In questo repository il collegamento
> è `ozwqvriqhkckzxcumelr`, cioè **l'istanza demo online**: un `supabase db push`
> distratto la modifica. Il nome del file o della cartella non è una prova —
> [G-19](GUASTI.md#g-19--un-comando-di-migrazione-colpisce-listanza-sbagliata).
>
> ```bash
> cat supabase/.temp/project-ref   # deve essere il ref DI QUESTO cliente
> ```

```bash
# --db-url esplicito: il bersaglio è scritto nel comando, non dedotto altrove.
npx supabase db push --db-url "postgresql://postgres:<PASSWORD>@127.0.0.1:5432/postgres"
npx supabase functions deploy health crea-utente cron-scadenze
```

Licenze dei moduli acquistati — **senza queste righe l'API restituisce zero
righe anche all'admin**, perché la barriera è la RLS e non il menu:

```sql
INSERT INTO moduli_licenze (slug) VALUES ('gare'), ('cantiere');
```

Creare l'admin del cliente, e verificare che l'istanza **non** sia in sola
lettura (quella è la modalità della demo):

```sql
SELECT sola_lettura FROM impostazioni_istanza;   -- deve essere false
```

---

## 7 · Backup

Creare un **sotto-account Storage Box dedicato a questo cliente** — mai
condiviso: una chiave rubata da una VPS non deve dare accesso ai backup degli
altri clienti.

Due chiavi SSH, ed è il punto che rende il backup resistente a un ransomware:

- sulla VPS cliente: chiave **append-only** — scrive, non cancella;
- sul control plane: chiave piena, l'unica che pota e verifica.

```bash
install -m 600 /dev/stdin /root/.flowcrm-backup-pass   # passphrase restic
crontab -e
```

```cron
15 2 * * *  cd /opt/flowcrm && RESTIC_PASSWORD_FILE=/root/.flowcrm-backup-pass \
            SB_HOST=u######-subN@u######.your-storagebox.de \
            HEARTBEAT_URL=<push-uptime-kuma> \
            ./deploy/backup.sh >> /var/log/flowcrm-backup.log 2>&1
0  4 1 * *  cd /opt/flowcrm && RESTIC_PASSWORD_FILE=/root/.flowcrm-backup-pass \
            SB_HOST=u######-subN@u######.your-storagebox.de \
            ./deploy/restore-test.sh >> /var/log/flowcrm-restore-test.log 2>&1
*/5 * * * * cd /opt/flowcrm && SENTINEL_URL=<push-sentinella> \
            ./deploy/sentinel.sh >> /var/log/flowcrm-sentinel.log 2>&1
```

Ricordare: SSH sulla porta **23**, percorsi **relativi**, niente `find` nella
shell ristretta della Storage Box.

**Eseguire subito un backup e una prova di ripristino a mano.** Il go-live non
si dichiara finché `restore-test.sh` non stampa `PASSED`.

---

## 8 · Monitoraggio

Sul control plane: progetto GlitchTip per questa istanza
(`environment = <slug>`, `release = GIT_SHA`), monitor Uptime Kuma su
`https://<slug>.pmiflow.it/functions/v1/health`, monitor **push** per backup
(26 h) e sentinella (15 min).

Il DSN va in `SENTRY_DSN` **e** l'origine in `SENTRY_ORIGIN`: senza la seconda
la CSP blocca l'invio e la telemetria sembra "non funzionare".

**Prima di consegnare, provocare un errore vero e guardare l'evento su
GlitchTip**: deve arrivare con le sourcemap risolte e **senza PII nel
payload**. Ispezionarlo a mano — non fidarsi del fatto che il codice di
scrubbing esista.

---

## 9 · Verifiche di consegna

Nessuna si salta. Ognuna corrisponde a un modo reale di consegnare un'istanza
rotta o insicura.

- [ ] `ss -tlnp` → solo 80 e 443 pubbliche
- [ ] `./deploy/security-headers-check.sh https://<slug>.pmiflow.it` → tutto OK
- [ ] **accesso amministratore funziona** (`token?grant_type=password` → `access_token`)
- [ ] **auto-registrazione NEGATA** (`/auth/v1/signup` → `signup_disabled`)
      — sono due voci, non una: spegnere il provider email per bloccare la
      registrazione blocca anche l'accesso ([G-21](GUASTI.md#g-21--listanza-consegnata-non-fa-entrare-nessuno))
- [ ] `curl -s https://<slug>.pmiflow.it/config.json | jq .` → nome, moduli e colori giusti
- [ ] `curl -s https://<slug>.pmiflow.it/functions/v1/health` → `"status":"ok"`
- [ ] operatore: **0 righe** su fatture/incassi/tasse/HR via API
- [ ] moduli **non** acquistati: 0 righe via API **anche per l'admin**
- [ ] (se agenti) utente-agente vede solo i propri dati
- [ ] (se poliambulatori) segreteria: 0 righe su fascicolo/visite/referti
- [ ] **carica un allegato → riavvia lo stack → riscaricalo** ([G-03](GUASTI.md#g-03--gli-allegati-spariscono-a-ogni-aggiornamento-ma-restano-in-elenco))
- [ ] scadenzari attivi (riga in `cron.job`) e notifiche in-app funzionanti
- [ ] prova reale di "password dimenticata": **il messaggio deve arrivare**
- [ ] e il collegamento nel messaggio deve portare a una pagina che accetta
      la nuova password, e la vecchia deve smettere di funzionare
- [ ] `backup.sh` eseguito e `restore-test.sh` → `PASSED`
- [ ] errore provocato → visibile su GlitchTip, **senza PII**
- [ ] istanza spenta per prova → **l'allarme arriva da solo**
- [ ] `npx supabase test db` → 241/241 contro l'istanza
- [ ] `sola_lettura = false`
- [ ] documento di consegna generato, credenziali su canale sicuro

---

## 9-bis · Ripristino a un istante preciso

Due meccanismi distinti, e servono **entrambi**:

| | riporta a | attraversa versioni Postgres | quando si usa |
|---|---|---|---|
| dump logico (`restore-test.sh`) | ultima notte | sì | perdita totale, migrazione, collaudo mensile |
| PITR (`pitr-restore.sh`) | qualunque istante | no | cancellazione di massa, importazione sbagliata |

```bash
RESTIC_PASSWORD_FILE=/root/.flowcrm-backup-pass SB_HOST=u######-subN@u######.your-storagebox.de ./deploy/pitr-restore.sh "2026-09-18 14:30:00"
```

Ricostruisce il cluster **a parte**, su `127.0.0.1:55432`, senza toccare la
produzione: l'istante giusto quasi mai si indovina al primo tentativo, e un
PITR fatto direttamente sull'istanza viva con il momento sbagliato distrugge
anche ciò che si voleva salvare.

> ⚠️ Lo slot di replica `flowcrm_pitr` è una protezione a doppio taglio: se
> l'archivista resta fermo, Postgres **conserva i WAL all'infinito** e riempie
> il disco fino a bloccare il database. `sentinel.sh` sorveglia sia il ritardo
> dello slot sia il fatto che sia attivo.

---

## 10 · Manutenzione ricorrente

**Aggiornare la flotta** — sequenziale, si ferma alla prima istanza che non
torna sana, così un difetto non arriva a tutti i clienti:

```bash
FLOWCRM_TAG=<git-sha> ./deploy/update-fleet.sh
```

**Aggiornare lo stack Supabase**: riscaricare il compose upstream, leggere le
note di rilascio (i cambi di versione maggiore di Postgres e di Auth chiedono
passi di migrazione), provare su un'istanza di collaudo **prima** della flotta.

---

## 11 · Dismissione

```bash
./deploy/teardown-client.sh <slug>
```

**Il record DNS si toglie per primo.** Un record che punta a un IP non più
nostro è un subdomain takeover: chi riceve quell'IP da Hetzner si ritrova a
servire contenuti sul dominio del nostro cliente.

Poi: stack giù, volumi rimossi, monitor rimossi, sotto-account Storage Box
disattivato. La retention dei backup la fissa il **contratto**, non noi.

---

## Come si aggiorna questo documento

1. Ogni guasto incontrato → voce in [GUASTI.md](GUASTI.md) nel formato
   **SINTOMO / CAUSA / RIMEDIO / VERIFICATO**, **prima** della consegna.
2. Ogni passo che ha richiesto una decisione non scritta qui → si riscrive il
   passo. Se chi esegue ha dovuto pensare, il runbook è incompleto.
3. Le righe `da verificare` in GUASTI.md diventano `provato il <data>` **solo**
   dopo che qualcuno le ha esercitate davvero.
4. Formato condiviso con `gdprhub` e `sistemacommercialisti`: se si cambia, si
   cambia per tutti e tre.

---

## Landing pmiflow.eu (cartella `landing/`)

Nome commerciale **PMIFlow**; FlowCRM resta il nome tecnico. La landing è un
progetto separato, e un suo difetto non tocca la demo, né viceversa.

| | |
|---|---|
| codice | `landing/` (Next.js 16, tutto statico tranne `/api/contatti`) |
| progetto Vercel | `pmiflow-landing` (team `docallfixs-projects`), `rootDirectory: landing`, produzione da `main` |
| demo | progetto Vercel `flowcrm`, `rootDirectory: flowcrm`, sempre da `main` |
| token | `~/.config/flotta/vercel.env` → `VERCEL_TOKEN`; `~/.config/flotta/hostinger.env` → `HOSTINGER_API_TOKEN` |
| vincolo | **nessun prezzo**, in nessuna pagina (decisione del committente, 24/09/2026) |

Entrambi i `vercel.json` hanno `ignoreCommand: git diff --quiet HEAD^ HEAD -- .`,
quindi un push che tocca solo una cartella non ricompila l'altro progetto.

### Rilascio

```bash
cd landing
npx tsc --noEmit && npx next build
npx next start -p 3417 &                     # porta poco comune: vedi GUASTI G-31
curl -s localhost:3417 | grep -o '<title>[^<]*'   # deve dire PMIFlow
node scripts/verifica-seo.mjs http://localhost:3417   # gate: h1, canonical, JSON-LD, niente prezzi, spazi
```
Poi push; dopo il deploy, **lo stesso gate sul sito vivo**:
`node scripts/verifica-seo.mjs https://pmiflow-landing.vercel.app`.

`flowcrm/deploy/security-headers-check.sh` segnala `unsafe-inline` su
`script-src`: sulla landing è un **compromesso dichiarato** in `next.config.ts`
(il nonce renderebbe dinamiche le pagine). Non vale per le istanze cliente.

### Interruttori (variabili Vercel, lette al build)

| variabile | effetto | stato al 24/09/2026 |
|---|---|---|
| `NEXT_PUBLIC_CONTATTI_ATTIVI=1` | mostra il modulo e le CTA «Richiedi una presentazione» | spento: mancano titolare e casella |
| `RESEND_API_KEY`, `CONTATTI_DESTINATARIO`, `CONTATTI_MITTENTE` | invio del modulo (server-only) | non impostate |
| `NEXT_PUBLIC_RAGIONE_SOCIALE`, `_PARTITA_IVA`, `_SEDE`, `_EMAIL_CONTATTO` | piede, privacy, JSON-LD | non impostate: **obbligatorie prima di pmiflow.eu** |
| `NEXT_PUBLIC_DEMO_ATTIVA=1`, `NEXT_PUBLIC_URL_DEMO` | pulsante «Prova la demo» | spento: vedi GUASTI G-35, G-36 |

### Switch DNS (Hostinger → Vercel)

Zone attuali di `pmiflow.eu` e `pmiflow.it`: solo parcheggio (`A @ 2.57.91.91`,
`CNAME www @`), nessun MX. I record attesi si leggono da Vercel al momento, non da
qui (`GET /v6/domains/<dominio>/config`). Al 24/09 erano `A @ 216.150.1.1`
(alternativa `76.76.21.21`) e `CNAME www 72ee11c69c4ea431.vercel-dns-016.com.`.

1. Snapshot della zona (`GET /api/dns/v1/zones/<dominio>`) salvato con la data.
2. Eliminare **solo** il record di parcheggio, con filtro `name=@ type=A`.
3. Aggiungere i record Vercel con `overwrite: false`. Mai `overwrite: true`.
4. Finché il dominio non spedisce posta: `TXT @ "v=spf1 -all"` e `TXT _dmarc "v=DMARC1; p=reject"`.
5. Verificare da `1.1.1.1` e `8.8.8.8`, non dal resolver di casa (Telecom risponde 127.0.0.1).
6. `curl -sI https://pmiflow.eu` → 200 con HSTS; `https://pmiflow.it` e `www` → 308.
