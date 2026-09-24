# Registro guasti — FlowCRM

Una voce per guasto, nel formato **SINTOMO / CAUSA / RIMEDIO / VERIFICATO**.
Formato condiviso con `gdprhub` e `sistemacommercialisti`: i tre registri si
leggono come uno.

**La regola che tiene vivo questo file**: ogni guasto incontrato in un deploy
reale diventa una voce **prima** che l'istanza sia dichiarata consegnata. Non
dopo, non "quando c'è tempo". Un registro aggiornato a posteriori è un
registro di ciò che ci si ricorda, non di ciò che è successo.

**Come leggere il campo VERIFICATO**:

| Dicitura | Significato |
|---|---|
| `provato il <data>` | riprodotto e corretto su questa macchina, con il comando indicato |
| `ereditato da <progetto>` | pagato su un altro prodotto, non ancora riprodotto qui |
| `da verificare` | dedotto dal codice o dalla documentazione, **mai eseguito** |

Le voci `da verificare` non sono conoscenza: sono ipotesi in attesa. Quando
una viene esercitata in un deploy vero, si aggiorna la riga.

## Categoria ricorrente · Ambienti condivisi scambiati per isolati

Su una macchina che ospita più progetti, tutto ciò che non **dichiara**
esplicitamente il proprio spazio dei nomi ne condivide uno con gli altri:
progetti Compose, `/tmp`, nomi di immagini, porte dell'host, volumi anonimi.
Nessuno di questi dà errore quando collide: **sovrascrive, mescola o
attribuisce male, in silenzio.**

**REGOLA** — Dichiarare il nome, non dedurlo: `name:` nel compose, cartella di
sessione per i file temporanei, prefisso del prodotto sulle immagini, porte
diverse in sviluppo.

**CONTROLLO** — Quando un esito sorprende, prima di interpretarlo verificare
di chi sia:
```bash
ls -l <file>                          # l'orario è quello della MIA esecuzione?
grep -c <un-mio-identificativo> <file>   # se è 0, non è mio
```

Appartengono a questa categoria: [G-01](#g-01--postgres-resta-esposto-a-internet-dopo-aver-chiuso-le-porte),
[G-18](#g-18--un-altro-progetto-ricrea-i-tuoi-container-e-azzera-il-volume),
[G-20](#g-20--i-risultati-di-un-test-sono-di-un-altro-progetto).
Formulazione condivisa con `gdprhub` e `sistemacommercialisti`.

---

## G-01 · Postgres resta esposto a Internet dopo aver "chiuso" le porte

**SINTOMO** — `docker compose config` mostra il binding su `127.0.0.1` che hai
scritto tu, e sembra a posto. Ma `ss -tlnp` sulla VPS mostra `0.0.0.0:5432` in
ascolto, e Postgres risponde dall'esterno.

**CAUSA** — In un file di sovrapposizione Compose **`ports` non sostituisce:
accoda**. Il binding dell'upstream su tutte le interfacce resta accanto al
tuo. Aggravante: **le porte pubblicate da Docker scavalcano UFW** — il
firewall dell'host non le ferma, perché Docker scrive le proprie regole
iptables a monte. L'unica barriera sarebbe il firewall cloud Hetzner, cioè
una configurazione manuale fuori dal repository, che si dimentica.

**RIMEDIO** — Non riscrivere `ports`: **escludere il servizio** con un profilo
mai attivato.
```yaml
supavisor:
  profiles: ["non-avviare"]
```
Verificare sempre con `docker compose ... config --services`: il servizio non
deve comparire. Per `api-gw`, che invece serve, legarlo a loopback dal `.env`
(`API_GW_HTTP_PORT=127.0.0.1:8000`) — lì si può, perché quella variabile è
usata **solo** nel mapping delle porte.
Controllo finale sulla VPS, che è quello che conta:
```bash
ss -tlnp | grep -vE '127\.0\.0\.1|::1'   # devono restare solo 80 e 443
```

**VERIFICATO** — provato il 2026-09-18 con `docker compose -f base.yml -f over.yml config`.

---

## G-02 · Lo stack non parte dopo aver messo le porte su loopback

**SINTOMO** — Dopo aver impostato `POSTGRES_PORT=127.0.0.1:5432` nel `.env`,
`auth`, `rest` e `storage` vanno in crash-loop. Nei log compaiono stringhe di
connessione come `postgres://…@db:127.0.0.1:5432/postgres`.

**CAUSA** — `POSTGRES_PORT` nell'upstream Supabase non è solo il mapping della
porta: è usata in **dieci** punti come porta **interna** (`GOTRUE_DB_DATABASE_URL`,
`PGRST_DB_URI`, `PG_META_DB_PORT`, `PGPORT`, `DATABASE_URL` di supavisor…).
Metterci un indirizzo IP corrompe tutte le stringhe di connessione insieme.

**RIMEDIO** — `POSTGRES_PORT=5432` e basta. Per non esporre Postgres si usa
G-01. Prima di trattare una variabile come "solo una porta":
```bash
grep -n 'NOME_VARIABILE' supabase-docker/docker-compose.yml
```
Se compare in più di una riga, non è solo un mapping.

**VERIFICATO** — provato il 2026-09-18 (ispezione delle 10 occorrenze nel compose ufficiale).

---

## G-03 · Gli allegati spariscono a ogni aggiornamento, ma restano in elenco

**SINTOMO** — Dopo un `docker compose up -d --build` l'applicazione elenca i
documenti caricati, ma ogni download dà 404. L'elenco è pieno, il disco vuoto.

**CAUSA** — Supabase Storage con `STORAGE_BACKEND=file` scrive i **byte** in
`/var/lib/storage` dentro il container, mentre i **metadati** stanno in
Postgres. Se quel percorso non è un volume o un bind mount dichiarato, i file
vivono nel layer effimero e vengono cancellati alla ricostruzione — ma il
database continua a elencarli, perché lui è persistito.

**RIMEDIO** — Verificare che il bind mount ci sia (l'upstream lo ha:
`./volumes/storage:/var/lib/storage`) e che `backup.sh` includa quella
cartella. La prova che lo dimostra è una sola, e va fatta a ogni modifica del
compose:
```
carica un allegato → docker compose down && up -d → riscaricalo
```
Non si vede leggendo il codice.

**VERIFICATO** — ereditato da gdprhub (stesso difetto con archivio su volume); **da verificare** nella variante Supabase.

---

## G-04 · `FORCE ROW LEVEL SECURITY` può togliere la manutenzione

**SINTOMO** — Dopo aver attivato FORCE RLS, i job pg_cron falliscono, la suite
pgTAP diventa rossa e le query di manutenzione da `psql` restituiscono zero
righe su tabelle piene.

**CAUSA** — FORCE applica la RLS **anche al proprietario** delle tabelle. Se il
ruolo con cui girano manutenzione e job non ha `BYPASSRLS`, si ritrova
soggetto alle policy e non vede più nulla.

**RIMEDIO** — Controllare **prima** di applicarla:
```sql
select rolname, rolsuper, rolbypassrls from pg_roles
where rolname in ('postgres','authenticator','anon','authenticated','service_role');
```
Su Supabase self-hosted `postgres` e `service_role` hanno `rolbypassrls = t`,
quindi FORCE è sicura e protegge solo dal proprietario non privilegiato — che
è esattamente il rischio nuovo del self-hosting. **Su un `postgres:17-alpine`
nudo la risposta può essere diversa**: verificare, non assumere.

**VERIFICATO** — provato il 2026-09-18: FORCE su 91/91 tabelle, poi `npx supabase test db` → 241/241 verdi.

---

## G-05 · Un file `.env.*.example` non arriva sulla VPS

**SINTOMO** — La procedura dice `git clone` sulla VPS, ma sulla macchina nuova
il template manca e l'installazione si ferma al primo passo. In locale il file
c'è: si vede nella cartella.

**CAUSA** — La regola `.gitignore` `.env.*` cattura anche
`deploy/.env.prod.example`, e la negazione `!.env.example` copre **solo il nome
esatto**. Il file non è mai stato tracciato, in silenzio.

**RIMEDIO** — Aggiungere `!.env.*.example` dopo la regola generale, e
verificare confrontando i **due elenchi**, non guardando la cartella:
```bash
find . -name ".env*" -not -path "*/node_modules/*"   # su disco
git ls-files | grep env                              # tracciati
```
È la differenza fra i due il punto.

**VERIFICATO** — ereditato da gdprhub (accaduto davvero lì); prevenuto qui il 2026-09-18 prima di creare il file.

---

## G-06 · `git check-ignore` dice che un file è ignorato quando non lo è

**SINTOMO** — `git check-ignore -v percorso` stampa una regola ed esce con
codice 0, quindi sembra confermare che il file è escluso. Ma il file è
tracciabile benissimo.

**CAUSA** — `check-ignore` riporta l'ultima regola che **corrisponde**, comprese
le **negazioni**, ed esce 0 in entrambi i casi. Con un `!pattern` la sua
risposta è l'opposto di quella che sembra.

**RIMEDIO** — Usare la prova che non mente:
```bash
git ls-files --others --exclude-standard | grep <file>   # se compare, è aggiungibile
```

**VERIFICATO** — provato il 2026-09-18 (mi ha fatto concludere che una correzione giusta fosse rotta).

---

## G-07 · Il controllo anti-segreti passa su un repository che contiene password

**SINTOMO** — `check-no-secrets.sh` dice "pulito", ma nel repository ci sono
credenziali funzionanti scritte in chiaro in un `.md`.

**CAUSA** — Il controllo ereditato da WhistleVault cerca **esadecimale di
almeno 24 caratteri** assegnato a `PASSWORD|SECRET|PEPPER`. Una password vera
come `Manutenzione2026!` in una tabella markdown non ha `=`, non è esadecimale
e non ha parole chiave accanto: passa indenne.

**RIMEDIO** — Aggiungere un controllo a **segnale composto**: sulla stessa riga
di un `.md`, un indirizzo email **e** un token fra backtick di almeno 8
caratteri con lettere e cifre. Avvertenza pagata subito: **togliere le email
dalla riga prima di cercare la password**, altrimenti `demo1@flowcrm.local` ha
lettere e cifre, si auto-segnala, e il controllo diventa rumore che si impara
a ignorare. Implementazione in `deploy/check-no-secrets.sh`, controllo 5.
Provare un rilevatore contro un caso noto-cattivo prima di fidarsene:
```bash
git show <commit-con-la-fuga>:<file> | <la-pipeline-del-controllo>
```

**VERIFICATO** — provato il 2026-09-18 contro `f5f5340`: intercettate tutte e 5 le credenziali.

---

## G-08 · In CI il controllo anti-segreti passa sempre

**SINTOMO** — In locale il controllo trova cose; in CI dice sempre "pulito".

**CAUSA** — `actions/checkout` fa un clone **superficiale**: `git log --all` non
trova niente e **anche `git grep` vede solo il commit di punta**. Il cancello
dice OK su un repository che pulito non è — ed è peggio di non averlo, perché
ci si smette di pensare.

**RIMEDIO** — `fetch-depth: 0` nello step di checkout.

**VERIFICATO** — ereditato da gdprhub; **da verificare** qui quando il controllo sarà agganciato alla CI.

---

## G-09 · La creazione del server Hetzner risponde 422

**SINTOMO** — La chiamata all'API Hetzner Cloud per creare il server fallisce
con **422**, pur avendo un token valido e parametri apparentemente corretti.

**CAUSA** — Il campo `datacenter` è **dismesso dal 16/12/2025**. L'API vuole
`location`. Confusione facile perché la **disponibilità** dei tipi di server si
legge **per datacenter**, mentre la **creazione** vuole la **location**.

**RIMEDIO** — Non riscrivere da zero: esiste già uno script che lo fa bene,
`FormazioneEvalis(working name)/infra/blog-cms/attendi-e-crea-server.py`.

**VERIFICATO** — ereditato da FormazioneEvalis (pagato lì); **da verificare** al primo provisioning FlowCRM.

---

## G-10 · Un record DNS cancella la zona di tutti gli altri clienti

**SINTOMO** — Dopo aver aggiunto il record del cliente nuovo, **tutti** gli
altri sottodomini smettono di risolvere. Ogni istanza già attiva è
irraggiungibile.

**CAUSA** — L'API DNS Hostinger (`PUT /api/dns/v1/zones/{domain}`) con
`overwrite: true` **sostituisce l'intera zona**, non aggiunge un record.

**RIMEDIO** — `overwrite: false` sempre, e `GET` della zona salvato come
snapshot **prima** di ogni scrittura. Lo script è condiviso fra i tre
prodotti (`dns-hostinger.sh`, scritto da gdprhub) proprio perché tre
implementazioni separate sarebbero tre modi diversi di azzerare una zona.

**VERIFICATO** — ereditato da gdprhub (letto nella documentazione dell'API); **da verificare** al primo provisioning.

---

## G-11 · La prova di ripristino passa ma consegna un database aperto

**SINTOMO** — Il ripristino riesce, i conteggi delle righe tornano, tutto
sembra a posto. Ma con un JWT qualsiasi si leggono dati di chiunque.

**CAUSA** — Il dump conteneva solo lo schema `public`. In uno stack Supabase i
**ruoli** (`anon`, `authenticated`, `service_role`, `authenticator`) vivono nel
cluster, non nel database: senza `pg_dumpall --roles-only` le policy RLS
vengono ripristinate ma non si applicano più a nessuno. Il ripristino non
fallisce: **si apre**. Nessun conteggio di righe se ne accorge.

**RIMEDIO** — Il set di backup ha quattro pezzi, non uno: ruoli, dump di
**tutti** gli schemi (`public`, `auth`, `storage`, `graphql_public`), volume
dei file, `.env` con `JWT_SECRET`. E `restore-test.sh` deve verificare che la
RLS sia **viva**, non solo che le righe ci siano:
```sql
set role authenticated; select count(*) from public.fatture;  -- deve dare 0
```
Nota: **la documentazione ufficiale Supabase sul backup self-hosted non
esiste**; la discussione aperta si chiude con un manutentore che consiglia di
copiare le cartelle dei volumi — a caldo quello produce un backup incoerente
che si ripristina benissimo e contiene spazzatura.

**VERIFICATO** — logica implementata in `deploy/restore-test.sh`; **da verificare** contro un backup reale.

---

## G-12 · Il ripristino sul Postgres effimero fallisce a intermittenza

**SINTOMO** — `restore-test.sh` fallisce circa una volta su tre con "connection
refused", in un punto diverso ogni volta.

**CAUSA** — Durante l'inizializzazione Postgres avvia un server **temporaneo**
che accetta connessioni e poi si riavvia. `pg_isready` dà un "pronto" falso e
il ripristino colpisce l'attimo in cui il socket sparisce.

**RIMEDIO** — Attendere con una query vera sul database finale, non con
`pg_isready`:
```bash
docker exec "$C" psql -U postgres -d postgres -c 'SELECT 1'
```

**VERIFICATO** — ereditato da WhistleVault (corretto lì dopo averlo pagato); adottato qui in `restore-test.sh`.

---

## G-13 · Il backup smette di girare e nessuno se ne accorge

**SINTOMO** — Si scopre al momento del bisogno che l'ultimo backup risale a
settimane prima.

**CAUSA** — Lo script scrive l'esito su un file di log che nessuno apre. Un
fallimento silenzioso di un processo notturno non produce alcun segnale.

**RIMEDIO** — Heartbeat a fine backup verso un monitor **push** con intervallo
26 ore: se il backup non gira, l'allarme scatta **da solo**, senza scrivere
altro codice. Stesso principio in `sentinel.sh`: **una sonda che deve arrivare
batte una sonda che deve fallire** — una VPS spenta non manda eccezioni.

**VERIFICATO** — implementato in `backup.sh` (`HEARTBEAT_URL`); **da verificare** con il control plane attivo.

---

## G-14 · Configurazione cambiata, ma l'istanza mostra ancora quella vecchia

**SINTOMO** — Cambiato nome cliente, logo o moduli nel `.env`, riavviato: non
cambia niente. Oppure due clienti mostrano lo stesso nome.

**CAUSA** — Vite sostituisce `import.meta.env.VITE_*` con il valore letterale
**al momento della build**: le variabili sono cotte nel bundle e un riavvio non
le tocca. Peggio: una variabile mancante non dà errore, dà il **default**
silenzioso.

**RIMEDIO** — La configurazione arriva da `/config.json`, generato
dall'entrypoint e validato con zod **`.strict()`** — così una chiave scritta
male (`nomeCliente` invece di `clienteName`) **ferma l'avvio** invece di
ricadere sul default. L'entrypoint valida anche gli slug dei moduli contro
l'elenco chiuso e rifiuta una `SUPABASE_ANON_KEY` che contenga `service_role`.
Diagnosi rapida:
```bash
curl -s https://<dominio>/config.json | jq .
```

**VERIFICATO** — provato il 2026-09-18 (typecheck, build e 13/13 unit test verdi dopo lo spostamento a runtime).

---

## G-15 · Dopo qualche `up -d` l'istanza resta senza HTTPS per giorni

**SINTOMO** — Il certificato non viene più emesso e il browser dà errore. Nei
log di Caddy compaiono errori di rate limit da Let's Encrypt.

**CAUSA** — I volumi `caddy_data`/`caddy_config` non sono persistiti, quindi a
ogni ricreazione del container Caddy richiede un certificato **nuovo**. Let's
Encrypt ne concede 5 per dominio a settimana: esauriti quelli, si aspetta.

**RIMEDIO** — Volumi dichiarati nel compose (`caddy_data:/data`,
`caddy_config:/config`). In prova usare lo **staging** di Let's Encrypt, che
non ha limiti stretti.

**VERIFICATO** — **da verificare** al primo provisioning reale.

---

## G-16 · Il disco si riempie e l'istanza si ferma

**SINTOMO** — L'applicazione smette di rispondere; Postgres non riesce più a
scrivere.

**CAUSA** — I log dei container crescono senza limite. È la prima causa di
fermo su una VPS che nessuno guarda da mesi. Contribuisce il peso dello stack:
le sole immagini Supabase occupano **~8 GB**.

**RIMEDIO** — `max-size: 10m` e `max-file: 3` su **ogni** servizio (in
`docker-compose.flowcrm.yml` sono elencati uno per uno, perché un'ancora YAML
non attraversa i file). `sentinel.sh` allarma all'85%, non al 100%: al 100% è
già tardi. Dimensionare il disco tenendo conto degli 8 GB di immagini più il
database più gli allegati.

**VERIFICATO** — misura delle immagini provata il 2026-09-18 (`docker images`); soglie **da verificare** in esercizio.

---

## G-17 · Su Windows i mount Docker puntano a percorsi inesistenti

**SINTOMO** — Provando uno script in un container da Git Bash su Windows:
`sh: can't open '/e.sh': No such file or directory`, oppure Caddy che cerca
il file in `C:/Program Files/Git/etc/caddy/Caddyfile`. Lo stesso comando
funziona su Linux.

**CAUSA** — Git Bash (MSYS) riscrive automaticamente gli argomenti che
sembrano percorsi POSIX: `/etc/caddy/Caddyfile` — che è il percorso **dentro
il container** — viene convertito nel percorso Windows corrispondente prima
che Docker lo veda.

**RIMEDIO** — Disattivare la conversione e usare il percorso in forma Windows
per il lato host:
```bash
export MSYS_NO_PATHCONV=1
docker run --rm -v "$(pwd -W)/deploy/file.sh:/f.sh:ro" ...
```
Riguarda solo chi prova dalla postazione Windows: in CI e sulle VPS (Linux)
il problema non esiste. Vale la pena saperlo perché altrimenti si passa
mezz'ora a cercare un difetto nello script, che è invece corretto.

**VERIFICATO** — provato il 2026-09-18.

---

## G-18 · Un altro progetto ricrea i tuoi container e azzera il volume

**SINTOMO** — Il database di sviluppo risponde con errori incomprensibili
(`role "..." does not exist`), oppure i dati di prova sono spariti. Nessun
errore, nessun avviso, nessuno ha toccato niente consapevolmente.

**CAUSA** — Compose ricava il nome del progetto dalla **cartella** che contiene
il file. Tutti e tre i prodotti tengono i compose in `deploy/`, quindi per
Docker sono lo **stesso progetto** `deploy`: un `up` di un altro prodotto sulla
stessa macchina ricrea i container omonimi con la propria configurazione e
reinizializza i volumi. Senza errori e senza avvisi.

**Sfumatura verificata qui, che cambia la diagnosi**: il compose Supabase
upstream **dichiara già `name: supabase`** (riga 11). Il nostro progetto non
sarebbe quindi diventato `deploy`, ma **`supabase`** — altrettanto generico, e
in collisione con qualunque altro stack Supabase self-hostato sulla stessa
macchina. Il difetto è reale, il meccanismo è diverso da quello degli altri due
prodotti: vale la pena saperlo, perché cercare un progetto `deploy` inesistente
farebbe concludere che il problema non c'è.

Il rischio è alto perché i nomi dei servizi Supabase (`db`, `auth`, `rest`,
`storage`, `studio`, `meta`) sono i più generici possibili, e il volume che si
perde contiene le 42 migrazioni e i dati di prova.

**RIMEDIO** — Nome del progetto esplicito nella sovrapposizione:
```yaml
name: flowcrm
```
**L'ordine dei file conta**: fra più file vince il `name:` dell'**ultimo**.
Verificato: con `-f upstream -f flowcrm` il progetto è `flowcrm`; invertendo i
due `-f` torna `supabase` e la correzione è annullata in silenzio. L'ordine
scritto nel RUNBOOK non è estetico.
Per capire di chi è un container sospetto:
```bash
docker inspect <container> --format '{{index .Config.Labels "com.docker.compose.project.config_files"}}'
```
In sviluppo, inoltre, non pubblicare porte o pubblicarle su numeri diversi:
la 5432 e la 1025 sono già contese fra i progetti su questa macchina.

**VERIFICATO** — accaduto davvero su questa macchina il 2026-09-18 (segnalato da sistemacommercialisti, container `deploy-db-1` ricreato da un'altra sessione); mancanza del `name:` confermata sul nostro compose e corretta.

---

## G-19 · Un comando di migrazione colpisce l'istanza sbagliata

**SINTOMO** — Nel caso fortunato: un comando fallisce con errori di permessi
inspiegabili. Nel caso sfortunato: **riesce**, e ha modificato l'istanza di un
altro cliente o la demo online.

**CAUSA** — Il CLI Supabase applica le migrazioni al progetto **collegato**
(`supabase/.temp/project-ref`), non a quello suggerito dalla cartella in cui ti
trovi. In questo repository il collegamento è `ozwqvriqhkckzxcumelr`, che è la
**demo online** — lo stesso ref che compare nella CSP di `vercel.json`. Un
`supabase db push` senza `--local` né `--db-url` la modifica.

Stessa famiglia, per gli script Node: `node --env-file` fa vincere l'**ultimo**
file, mentre `dotenv` con `config({path})` non sovrascrive le chiavi già
caricate e fa quindi vincere il **primo**. Precedenze opposte, e un
`--env-file-if-exists=.env.local --env-file-if-exists=.env` può collegare al
database di **produzione** chi credeva di puntare al locale.

**RIMEDIO** — Il bersaglio va **scritto nel comando** e **stampato prima**, mai
dedotto dal nome di un file:
```bash
cat supabase/.temp/project-ref              # dove punterebbe ora
npx supabase db reset --local               # locale: esplicito
npx supabase db push --db-url "postgresql://…"   # remoto: bersaglio nel comando
```
Regola generale: prima di un comando che scrive, stampa l'host a cui sei
collegato. Il nome del file non è una prova.

**VERIFICATO** — collegamento alla demo online confermato il 2026-09-18 (`supabase/.temp/project-ref` = ref della CSP di produzione); famiglia dei caricatori env segnalata da sistemacommercialisti dopo esserci incappato.

---

## G-20 · I risultati di un test sono di un altro progetto

**SINTOMO** — Si leggono gli esiti di una suite e fra i test falliti compaiono
nomi che nel progetto **non esistono**. Oppure il conteggio finale appare due
volte con numeri diversi (`6 failed, 8 passed` e poi `25 failed, 2 passed`),
come se la suite fosse girata due volte.

**CAUSA** — Più sessioni di lavoro attive sulla stessa macchina scrivono i log
nello stesso percorso condiviso. In Git Bash su Windows `/tmp` **non è privato
del processo**: è una cartella comune, quindi `> /tmp/e2e.log` di due progetti
diversi è lo stesso file. L'ultimo che scrive vince, e i due esiti si mescolano.

È lo stesso difetto di [G-18](#g-18--un-altro-progetto-ricrea-i-tuoi-container-e-azzera-il-volume)
visto da un'altra angolazione: **uno spazio dei nomi condiviso che si crede
privato.** Lì erano i progetti Compose, qui i percorsi dei file temporanei.

Il motivo per cui è pericoloso non è il log perso: è che si può **concludere
che i propri test falliscono quando passano, o che passano quando falliscono**,
e agire di conseguenza. Un esito di test è una prova solo se si sa da dove viene.

**RIMEDIO** — Scrivere i log in un percorso specifico della sessione, non in
`/tmp`. Se un esito contiene nomi che non riconosci, **non interpretarlo**:
rieseguilo isolato.
```bash
# no:   npx playwright test > /tmp/e2e.log
# sì:   npx playwright test > "$CARTELLA_SESSIONE/e2e-flowcrm.log"
```
Verifica rapida quando un esito sorprende:
```bash
ls -l <file-di-log>        # l'orario è quello della TUA esecuzione?
grep -c 'nome-di-un-tuo-spec' <file-di-log>
```

**VERIFICATO** — provato il 2026-09-18: un'esecuzione Playwright di FlowCRM ha restituito fallimenti di `isolamento.spec.ts`, `recupero-password.spec.ts` e `report-pdf.spec.ts`, spec che appartengono a un altro progetto sulla stessa macchina.

---

## G-21 · L'istanza consegnata non fa entrare nessuno

**SINTOMO** — L'istanza è in piedi, le pagine si caricano, il database risponde,
ma **ogni tentativo di accesso** — compreso quello dell'amministratore appena
creato — fallisce. Dall'API la risposta è:
```json
{"code":422,"error_code":"email_provider_disabled","msg":"Email logins are disabled"}
```
Dal browser si resta sulla pagina di accesso senza un errore chiaro.

**CAUSA** — Due variabili con nomi che ingannano, e che fanno cose diverse:

| variabile | mappata su | effetto |
|---|---|---|
| `DISABLE_SIGNUP` | `GOTRUE_DISABLE_SIGNUP` | blocca l'**auto-registrazione** |
| `ENABLE_EMAIL_SIGNUP` | `GOTRUE_EXTERNAL_EMAIL_ENABLED` | accende/spegne **l'intero provider email**, quindi anche il **login** |

Il ragionamento che porta all'errore è quello sensato: «su un CRM aziendale
gli utenti li crea l'amministratore, quindi la registrazione via email va
spenta» → `ENABLE_EMAIL_SIGNUP=false`. Il nome dice *signup*, il
comportamento è *tutto il provider*. L'istanza diventa **inaccessibile a
chiunque**, e lo si scopre solo provando ad accedere — non leggendo la
configurazione, dove la riga sembra corretta e perfino prudente.

La coppia giusta è:
```
DISABLE_SIGNUP=true        # niente auto-registrazione
ENABLE_EMAIL_SIGNUP=true   # ma il provider email ACCESO, altrimenti nessuno entra
```

Lo stesso vale nel `config.toml` locale: sotto `[auth.email]`, `enable_signup`
governa il **provider**, mentre l'auto-registrazione resta bloccata da
`enable_signup = false` nella sezione `[auth]`. Con il provider spento la
suite end-to-end non riesce nemmeno ad autenticarsi, e i suoi fallimenti
sembrano difetti dell'applicazione.

**RIMEDIO** — Verificare **le due cose insieme**, perché una sola non basta:
```bash
# 1. l'accesso deve funzionare
curl -s -X POST "$API/auth/v1/token?grant_type=password" -H "apikey: $ANON" \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@…","password":"…"}' | grep -q access_token && echo OK

# 2. l'auto-registrazione deve essere NEGATA
curl -s -X POST "$API/auth/v1/signup" -H "apikey: $ANON" \
  -H 'Content-Type: application/json' \
  -d '{"email":"intruso@x.it","password":"Password123!"}'   # atteso: signup_disabled
```
Sono due voci della lista di consegna, non una.

**VERIFICATO** — provato il 2026-09-18: con `ENABLE_EMAIL_SIGNUP=false` l'accesso torna 422; corretto a `true`, accesso OK e registrazione negata con `signup_disabled`. Trovato solo eseguendo la suite end-to-end contro uno stack vero — nella configurazione la riga sbagliata sembrava quella giusta.

---

## G-22 · Un test fallisce, il database dice che tutto è a posto

**SINTOMO** — Un test end-to-end non trova un elemento che dipende da un dato
(«il bottone appare perché lo stage è vinto»). Si controlla il database e il
dato **è corretto**. Sembra un difetto dell'applicazione: la pagina non
mostra ciò che il database contiene.

**CAUSA** — Due cause distinte, spesso insieme, ed entrambe stanno nel test:

1. **Si naviga prima che la scrittura sia persistita.** L'interfaccia aggiorna
   subito ciò che si vede e scrive sul database in modo asincrono. Chi apre il
   dettaglio nell'istante successivo legge il valore **vecchio**. Quando poi si
   controlla a mano, la scrittura è arrivata — ed è ciò che rende il guasto
   ingannevole: la prova che si raccoglie *dopo* contraddice ciò che il test
   ha visto *durante*.
2. **Un avviso a schermo contiene lo stesso testo.** Dopo l'operazione compare
   un messaggio tipo «"X" spostato in Vinto»: `getByText('X')` trova due
   elementi e Playwright si rifiuta di scegliere
   (`strict mode violation`), fallendo con un errore che non nomina l'avviso.

**RIMEDIO** — Attendere lo **stato**, non il tempo, e puntare l'**elemento**,
non il testo:
```ts
// attendere che la scrittura sia davvero persistita
await expect.poll(async () => page.evaluate(/* query al database */)).toBe(true)

// cliccare la scheda, non un testo che può comparire anche altrove
await card.click()          // non: page.getByText(nome).click()
```
Correggere solo la prima fa emergere la seconda, perché l'attesa dà il tempo
all'avviso di comparire.

**VERIFICATO** — provato il 2026-09-18 su `e2e/commesse.spec.ts`: entrambe le cause presenti, il test passa dopo aver corretto tutte e due.

---

## G-23 · Un test rosso che non riguarda il codice

**SINTOMO** — Una spec fallisce sempre, in locale e in CI, mentre la
funzionalità in produzione funziona.

**CAUSA** — La spec richiede un servizio esterno non configurato
nell'ambiente di prova. Nel nostro caso `copilot-azioni.spec.ts` chiama la
Edge Function del copilot, che ha bisogno delle credenziali Azure OpenAI:
nel runtime locale le variabili `AZURE_*` sono **zero**, quindi la funzione
risponde errore e il test fallisce per un motivo che non riguarda il codice.

Il danno non è il rosso in sé: è che **si impara a ignorarlo**. Un cruscotto
con un rosso permanente smette di segnalare quando compare il secondo.

**RIMEDIO** — Saltare in modo **esplicito e dichiarato**, con lo stesso
schema già usato per le credenziali:
```ts
test.skip(!process.env.E2E_COPILOT, 'copilot non configurato (E2E_COPILOT assente)')
```
Un test saltato dice «non verificato qui»; un test rosso permanente non dice
più niente.

**VERIFICATO** — provato il 2026-09-18: `docker exec <edge-runtime> env | grep -c AZURE` → 0.

---

## G-24 · Il test chiama il database prima che la sessione sia ripristinata

**SINTOMO** — Subito dopo una navigazione, un `page.evaluate` che usa il
client Supabase fallisce con `Cannot read properties of null (reading 'id')`
su `(await sb.auth.getUser()).data.user.id`. **Passa quasi sempre e fallisce
ogni tanto**, quindi si archivia come «instabilità dei test».

**CAUSA** — Dopo una navigazione supabase-js rilegge la sessione
dall'archivio del browser in modo **asincrono**. `getUser()` chiamato
nell'istante successivo torna `user: null`. Che il client esista non
significa che sia autenticato: sono due condizioni diverse e si avverano in
momenti diversi.

Nota su come è emerso: prima era `window.__supabase` stesso a non esistere
ancora ([G-20](#g-20--i-risultati-di-un-test-sono-di-un-altro-progetto) e la
correzione del client pigro). Rendendolo disponibile subito, il guasto si è
**spostato** invece di sparire — dall'oggetto mancante alla sessione
mancante. Correggere una corsa spesso rivela la successiva.

**RIMEDIO** — Attendere lo **stato di autenticazione**, non l'esistenza
dell'oggetto:
```ts
await expect.poll(async () => page.evaluate(async () => {
  const { data } = await window.__supabase.auth.getUser()
  return Boolean(data?.user?.id)
}), { timeout: 10_000 }).toBe(true)
```

**Corollario, stessa famiglia**: un inserimento fatto col client diretto è
invisibile a React Query, che continua a servire l'elenco dalla cache
(`staleTime` 30s) — un menu a tendina non mostrerà mai la voce appena
creata. Serve un `page.reload()`. Non è un difetto dell'applicazione: è il
prezzo di scavalcare il livello dati nei test.

**VERIFICATO** — provato il 2026-09-18 su `e2e/agenti.spec.ts`: corretti entrambi, il test avanza oltre i due punti.

---

## G-25 · Le credenziali di sviluppo finiscono nell'immagine di ogni cliente

**SINTOMO** — Nessuno. L'immagine si costruisce, l'applicazione funziona, e
ogni istanza cliente parla con il database di **sviluppo** invece che con il
proprio. Oppure funziona per caso, perché la configurazione a runtime
sovrascrive, e il difetto resta latente finché qualcosa non cambia l'ordine.

**CAUSA** — Manca il file `.dockerignore`. Con `COPY . .` il contesto di
build porta dentro tutto, **`.env.local` compreso** — e `vite build` legge i
file `.env` e sostituisce le variabili nel bundle. Le credenziali finiscono
**cotte nel JavaScript** distribuito a tutti i clienti, e l'immagine smette
di essere unica.

Non si vede leggendo il Dockerfile: il difetto è in un file **che non
esiste**. Si vede solo chiedendosi che cosa il build stia inviando al demone.

**RIMEDIO** — `.dockerignore` che escluda almeno `.env`, `.env.*`,
`node_modules`, `dist`, `test-results`. E verificare **dentro** l'immagine,
non fidandosi del file:
```bash
docker run --rm --entrypoint sh <img> -c 'find /srv -name ".env*" | wc -l'   # 0
docker run --rm --entrypoint sh <img> -c 'grep -cE "eyJ[A-Za-z0-9_-]{20,}\.eyJ" /srv/assets/*.js'
docker image inspect --format '{{.Config.Env}}' <img>                        # nessun segreto
```
Avvertenza sul secondo comando: cercare `supabase\.co` dà un falso positivo,
perché quella stringa è dentro la libreria supabase-js (`*.supabase.co`). Il
segnale vero è il formato JWT completo, non il nome del dominio.

**VERIFICATO** — provato il 2026-09-18: `.dockerignore` era assente; aggiunto e verificato dentro l'immagine (0 file `.env`, 0 sorgenti, 0 sourcemap, 0 JWT).

---

## G-26 · `npm ci` fallisce nel build ma funziona sulla macchina di chi sviluppa

**SINTOMO** — Il build si ferma su `RUN npm ci`, mentre in locale lo stesso
comando gira senza problemi.

**CAUSA** — Il `package-lock.json` è generato su **Windows** e **omette le
dipendenze opzionali per Linux** (bug npm #4828). `npm ci` pretende un
lockfile completo e coerente con la piattaforma e si rifiuta di procedere;
`npm install` invece le risolve.

Il difetto interessante non è tecnico: **la lezione era già scritta nel
repository**, nel commento di `.github/workflows/ci.yml`, ed è stata
contraddetta scrivendo `npm ci` nel Dockerfile con una motivazione di
principio («in CI la build deve fallire se il lockfile non è coerente»). Il
principio è corretto in generale e sbagliato qui. **Prima di applicare una
regola generale, cercare se il repository ha già una nota sul caso
specifico.**

**RIMEDIO** — `npm install --no-audit --no-fund`, con il rimando alla nota in
`ci.yml`. La soluzione migliore resta `npm ci`, e ci si arriva rigenerando il
lockfile in ambiente Linux e committandolo: è un cambio che tocca il flusso
di chi sviluppa su Windows, quindi va deciso, non fatto di nascosto.

**VERIFICATO** — provato il 2026-09-18: build fallita a `npm ci`, riuscita con `npm install`; immagine finale 93,1 MB, avviata e servita correttamente.

---

## G-27 · Il cancello di ripristino grida su un backup sano, e tace su uno rotto

**SINTOMO** — `restore-test.sh` fallisce con «come 'authenticated' senza JWT si
leggono SET0 fatture — RLS NON attiva» su un ripristino perfettamente valido.
Oppure, all'opposto, dichiara il ripristino a posto perché «i ruoli ci sono»
quando il backup non li conteneva affatto.

**CAUSA** — Tre difetti distinti nello stesso cancello, tutti emersi solo
eseguendolo:

1. **Falso allarme.** `psql -c "set role authenticated; select count(*) …"`
   stampa PRIMA la riga `SET` e poi il conteggio: il confronto riceve `SET0`
   invece di `0`. Il cancello grida al database aperto su un ripristino sano —
   e un allarme che suona sempre insegna a ignorarlo.
2. **Controllo cieco.** L'immagine `supabase/postgres` **crea da sé** `anon`,
   `authenticated`, `service_role` e `authenticator` all'inizializzazione.
   Verificare che esistano dopo un ripristino su quell'immagine non dimostra
   nulla: risultano presenti anche se `ruoli.sql` era vuoto. Il controllo
   serve solo contro un Postgres nudo.
3. **Corsa all'avvio, di nuovo.** [G-12](#g-12--il-ripristino-sul-postgres-effimero-fallisce-a-intermittenza)
   prescrive `SELECT 1` al posto di `pg_isready`, ma sull'immagine Supabase
   **non basta**: `SELECT 1` riesce mentre le migrazioni interne dell'immagine
   sono ancora in corso, e il ripristino lanciato lì produce **zero tabelle**.

**RIMEDIO** — Due `-c` separati più `tail -1`; il controllo sui ruoli
declassato a quello che è (utile solo su Postgres nudo) con la nota accanto; e
**la prova viva come unico criterio che vale sempre**: leggere come
`authenticated` e ottenere zero righe.
Per la corsa all'avvio, attendere uno stato che l'inizializzazione ha davvero
finito di produrre — per esempio una tabella di sistema attesa — non la sola
capacità di accettare una connessione.

**La lezione generale**: un cancello va provato **in entrambi i versi**. Che
passi su un caso buono non dice se scatterebbe su uno cattivo, e che scatti
non dice che scatti per la ragione giusta.

**VERIFICATO** — provato il 2026-09-18 contro un ripristino reale di 91 tabelle e 329 policy: tutti e tre i difetti riprodotti e corretti.

---

## G-28 · Il collegamento di recupero password funziona una volta sola

**SINTOMO** — Si prova il flusso di recupero, si estrae il collegamento dalla
mail, lo si apre per controllare che risponda, e poi il passo successivo —
impostare la nuova password — fallisce con **401**. La vecchia password
continua a funzionare. Sembra che l'aggiornamento sia rotto.

**CAUSA** — Il collegamento è **monouso**. La prima chiamata a
`/auth/v1/verify` consuma il token e restituisce la sessione (303 con
`#access_token=` nel frammento); la seconda trova un token già speso. Se la
prima chiamata era «solo un controllo», la sessione è stata emessa e buttata
via, e da lì in poi si sta provando con un token morto.

È lo stesso inganno di tutta la giornata in forma nuova: **l'atto di
verificare ha cambiato ciò che si stava verificando.**

**RIMEDIO** — Un flusso monouso si prova **in un colpo solo**, dalla richiesta
all'esito, senza controlli intermedi che consumino il token. E la verifica
deve arrivare fino in fondo: non basta che la nuova password funzioni, deve
smettere di funzionare la **vecchia**.

```bash
# richiesta → mail → collegamento → sessione → nuova password → doppia prova
curl -X POST "$API/auth/v1/recover" -d '{"email":"…"}'
TOK=$(curl -s -o /dev/null -D - "$LINK" | grep -i ^location | sed -n 's/.*access_token=\([^&]*\).*/\1/p')
curl -X PUT "$API/auth/v1/user" -H "Authorization: Bearer $TOK" -d '{"password":"…"}'
# NUOVA → 200   e   VECCHIA → 400
```

**Avvertenza pratica**: se si prova su un'istanza condivisa, la password
dell'utente di prova resta cambiata e la suite end-to-end non entra più.
Va ripristinata subito via API di amministrazione.

**VERIFICATO** — provato il 2026-09-18 contro Mailpit dello stack locale: consumo accidentale riprodotto (401), flusso completo poi superato — nuova 200, vecchia 400.

---

## G-29 · Una cancellazione ricorsiva attraversa un collegamento e svuota l'originale

**SINTOMO** — Dopo aver smontato una cartella di lavoro temporanea, `npx` non
esegue più niente: i pacchetti risultano installati ma gli eseguibili in
`node_modules/.bin` sono spariti. Codice e git intatti, quindi non sembra una
cancellazione.

**CAUSA** — Per confrontare due build senza reinstallare centinaia di
pacchetti è comodo collegare `node_modules` con una giunzione (Windows) o un
collegamento simbolico. Ma una cancellazione ricorsiva della cartella
temporanea **attraversa il collegamento** e agisce sull'originale: si è
cancellato il `node_modules` vero credendo di togliere una copia.

Si ferma solo quando incontra un file in uso — quindi il danno è **parziale**,
e questo lo rende peggiore: qualche eseguibile resta, l'installazione sembra
intera, e l'errore che arriva parla di un comando mancante invece che di
un'installazione mutilata.

**RIMEDIO** — Togliere il collegamento **prima** della cartella che lo
contiene:
```bash
rmdir node_modules        # Windows: rimuove la giunzione, non il bersaglio
rm -rf <cartella-temporanea>
```
Su Linux e macOS vale lo stesso: `rm link` prima di `rm -rf dir/`. E prima di
qualunque cancellazione ricorsiva in una cartella preparata a mano:
```bash
find <cartella> -maxdepth 2 \( -type l -o -xtype l \) -print
```
Se stampa qualcosa, quella cosa punta altrove.

Riparazione: `npm install` ricostruisce `.bin`, poi si rilancia la suite per
avere la prova che l'installazione sia di nuovo intera — non basta che `npx`
risponda.

**VERIFICATO** — accaduto il 2026-09-21 sulla macchina di sviluppo (segnalato dalla sessione frontend): `.bin` svuotato, ripristinato con `npm install` e riverificato con 669 test verdi.

---

## G-30 · La demo in produzione non parte: «Avvio interrotto»

**SINTOMO** — L'istanza su Vercel mostra una pagina rossa:
*«Configurazione non caricata: /config.json non è raggiungibile o non è JSON
valido (SyntaxError: Unexpected token '<', "<!doctype "...)»*. Nessuno riesce
ad accedere.

**CAUSA** — Il caricatore della configurazione a runtime era stato progettato
per l'immagine Docker, dove l'entrypoint **genera** `/config.json`. Ma il
prodotto aveva **già** un'altra via di produzione: la demo su Vercel, che
rideploya da sola a ogni push su `main`. Lì il file non esiste, e il rewrite
SPA (`/(.*)` → `/index.html`) risponde a `/config.json` con la pagina HTML,
200. Il parse fallisce sul `<!doctype` e il codice, in produzione, trattava
«file assente» come errore fatale.

È passato inosservato fino alla fusione in `main` perché **ogni verifica era
stata fatta sulla via nuova**: in sviluppo (dove il file mancante ricade su
`.env.local`) e nel container (dove il file c'è). La via di produzione già
esistente non è mai stata provata.

**RIMEDIO** — Distinguere i due casi con il **content-type**, non con l'esito
del parse:
- file **assente** (risposta non JSON o non 200) → si usa la configurazione
  delle `VITE_*` inlined a build time;
- file **presente ma rotto** → errore che ferma l'avvio.

La lezione vale più del codice: **prima di cambiare come parte
l'applicazione, elencare TUTTE le vie da cui parte in produzione** — non solo
quella che si sta costruendo. Qui erano due: Docker (nuova) e Vercel (già
viva, e collegata a `main`).

Riproduzione della condizione di Vercel in locale:
```bash
npx vite build && npx vite preview
curl -sI http://localhost:4173/config.json   # deve dare 200 text/html
```

**VERIFICATO** — 2026-09-21: rotto in produzione dopo la fusione in `main`; condizione riprodotta in locale (200 text/html), corretto, e produzione verificata sul sito live con pagina di accesso e zero errori JavaScript.

---

## G-31 · Lo scatto mostra la pagina di un altro progetto

**SINTOMO** — `next start -p 3100` per la landing esce con errore in
background, ma lo script di scatto riesce lo stesso e produce immagini
«corrette»: sono la home di **Legisboard** (gdprhub), che già occupava la porta.

**CAUSA** — È la categoria ricorrente in testa a questo registro, «ambienti condivisi scambiati per isolati»: sul PC girano più progetti, e una
porta «libera» non lo è. L'errore del server finiva in un file di output che
nessuno leggeva; lo script non verificava *chi* rispondeva.

**RIMEDIO** — Prima di ogni scatto o gate, verificare l'identità della pagina
(`<title>` con «PMIFlow»), non solo il 200. Porte alte e poco comuni (3417).

**VERIFICATO** — 2026-09-24: `curl -s localhost:3100 | grep title` → «Legisboard»; dopo il cambio di porta e il controllo del titolo, scatti corretti.

---

## G-32 · Il server fermato è ancora lì, con la build vecchia

**SINTOMO** — Dopo una nuova build, sitemap vuota e `/grazie` in 404: sono
le pagine della build precedente.

**CAUSA** — Su Windows, fermare il comando in background (`TaskStop`) chiude
il guscio bash ma **non** il `node` figlio di `next start`, che resta in
ascolto sulla porta con la build vecchia. Il nuovo `next start` fallisce con
EADDRINUSE, in silenzio.

**RIMEDIO** — Fermare il processo che tiene la porta, **dopo aver verificato
che è il nostro** dalla riga di comando:
```powershell
$c = Get-NetTCPConnection -LocalPort 3417 -State Listen | Select -First 1
$p = Get-CimInstance Win32_Process -Filter "ProcessId=$($c.OwningProcess)"
if ($p.CommandLine -like "*\landing\node_modules\*next*") { Stop-Process -Id $p.ProcessId -Force }
```

**VERIFICATO** — 2026-09-24: processo orfano 7184 con `next start -p 3417`, fermato; il nuovo server serve la build corrente.

---

## G-33 · Spazio sparito dopo un grassetto, solo nell'HTML

**SINTOMO** — Su `/sicurezza` si legge «Row Level Security)di PostgreSQL»,
«Dati sanitari(modulo», «emailcon sede». Nel sorgente lo spazio c'è.

**CAUSA** — Il compilatore JSX toglie lo spazio iniziale di un nodo di testo
che va a capo **quando il testo contiene un'entità** (`&apos;`). La stessa
struttura senza entità, nella privacy, esce corretta. Non si vede leggendo il
codice: si vede solo nella pagina servita.

**RIMEDIO** — `{" "}` esplicito dopo il tag in linea. E un controllo nel gate
`landing/scripts/verifica-seo.mjs` che cerca `</strong>`, `</em>`, `</a>`
attaccati a una lettera nell'HTML servito: al primo giro ha trovato un quarto
caso su `/cookie` che la ricerca a mano aveva perso.

**VERIFICATO** — 2026-09-24: gate verde su tutte le pagine dopo la correzione.

---

## G-34 · Sezioni vuote nello scatto a pagina intera

**SINTOMO** — Lo scatto a tutta pagina della landing mostra solo i titoli
delle sezioni: elenchi, schede e moduli sono spariti.

**CAUSA** — Le comparse allo scroll usano `animation-timeline: view()` con
opacità da 0 a 1. Tutto ciò che non è ancora entrato nella finestra resta
all'inizio dell'animazione, cioè **invisibile**: per chi scorre va bene, per
uno scatto a pagina intera, una stampa o un anteprimatore no.

**RIMEDIO** — Animare solo `transform` (24 px verso l'alto), mai l'opacità.
Il contenuto è sempre visibile; il movimento è solo un di più. Stessa regola
che gdprhub e FormazioneEvalis avevano già scritto.

**VERIFICATO** — 2026-09-24: scatto a pagina intera senza forzature, tutte le sezioni visibili.

---

## G-35 · La demo di produzione mostra dati di test

**SINTOMO** — Scattando la demo `flowcrm-orcin.vercel.app` per la landing, la
pipeline è piena di «E2E Att 1784890193689», «E2E Kanban…», «E2E Comm…», con
importi a zero. È ciò che vede un potenziale cliente.

**CAUSA** — Le suite e2e sono state lanciate contro il **database della demo**
(gli utenti di verifica `claude.*` vivono lì) e creano record che non
cancellano. Il blocco di sola lettura non le ferma per costruzione: quegli
account sono **manutentori** («account di test automatici» nel commento della
colonna `user_profiles.manutentore`). E `playwright.config.ts` prende
`VITE_SUPABASE_URL` dall'ambiente: con il `.env.local` di sviluppo, che punta
alla demo, un `npx playwright test` in locale scrive in produzione.

**RIMEDIO** — Da fare: (1) le e2e non devono più girare contro la demo, ma su
un'istanza di collaudo o sullo stack locale; (2) ripulire i record `E2E %`
dalla demo; (3) la sezione della landing che doveva mostrare schermate vere è
stata rifatta con artefatti HTML scritti a mano, così non dipende dallo stato
della demo.

**VERIFICATO** — 2026-09-24: sintomo osservato sulle schermate (poi cancellate, mai pubblicate). Pulizia **non ancora eseguita**.

---

## G-36 · Un visitatore della demo può chiudere fuori tutti gli altri

**SINTOMO** — Le password degli account demo condivisi risultano cambiate da
qualcuno (nota in memoria del progetto: «FlowDemo2026 non più valide»).

**CAUSA** — La sola lettura della demo è un trigger sulle tabelle `public`. La
password sta in `auth.users` e la cambia GoTrue: il trigger non la vede. Il
profilo chiama `supabase.auth.updateUser({ password })` per chiunque, anche per
gli account dimostrativi. Chi conosce le credenziali (sono state pubbliche su
GitHub) può cambiarle.

**RIMEDIO** — Blocco lato server (lezione di gdprhub: un blocco nel database,
non un pulsante nascosto), migrazione `20260924000001_blocco_credenziali_demo.sql`:
trigger su `auth.users` (password, email) e `auth.mfa_factors` (nuovo secondo
fattore). Con l'istanza in sola lettura, ciò che passa da GoTrue (sessione
`supabase_auth_admin`) viene rifiutato per chi non è manutentore; la
manutenzione da SQL resta libera, un normale accesso passa sempre.

Dopo averla applicata: ruotare le password degli account demo **da SQL** (è
la via che resta aperta) e valutare l'ingresso in demo con un clic.

**VERIFICATO** — 2026-09-24: pgTAP `020_credenziali_demo.sql` nella CI (PR #5). **Non ancora applicata al database della demo**: serve `npx supabase login` sul PC, poi `npx supabase db push`.

---

## G-37 · DNS giusto, dominio verificato, ma HTTPS non si apre

**SINTOMO** — Dopo lo switch di `pmiflow.eu` su Vercel i resolver pubblici
danno gli IP giusti e Vercel segna i quattro host `misconfigured=false`, ma per
più di dieci minuti `https://pmiflow.eu` fallisce l'handshake TLS (curl 000,
«SSL/TLS connection failed»). Lo stesso IP serve senza problemi
`pmiflow-landing.vercel.app`.

**CAUSA** — Nessun certificato emesso per i domini nuovi: l'elenco dei
certificati del team (`GET /v4/certs`) non conteneva niente per `pmiflow`.
L'emissione automatica non era partita dopo che il DNS era diventato corretto.

**RIMEDIO** — Chiedere il certificato esplicitamente:
```bash
curl -X POST "https://api.vercel.com/v8/certs?teamId=<team>" \
  -H "Authorization: Bearer $VERCEL_TOKEN" -H "Content-Type: application/json" \
  -d '{"cns":["pmiflow.eu","www.pmiflow.eu"]}'
```
La risposta arriva in pochi secondi, con la scadenza (rinnovo automatico di
Vercel). Controllare sempre l'HTTPS vero, non lo stato «verificato» del dominio:
sono due cose diverse.

Trappola collegata: il PC risolveva ancora `pmiflow.eu` su 127.0.0.1 per la
cache DNS di Windows. `Clear-DnsClientCache` e si allinea.

**VERIFICATO** — 2026-09-24: certificati emessi per `.eu` e `.it` (scadenza 23/12/2026); `https://pmiflow.eu` 200 con HSTS, `www` e `.it` in 308, gate SEO verde sul dominio vero.
