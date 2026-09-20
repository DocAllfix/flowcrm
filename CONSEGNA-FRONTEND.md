# Consegna all'agente frontend

Scritto il 2026-09-19 dalla sessione che ha lavorato su infrastruttura,
sicurezza e deploy. **Quella sessione è ancora aperta e sta lavorando sullo
stesso repository.** Leggi questo file prima di toccare `src/`.

Non è un riassunto del progetto: è l'elenco delle cose che **non puoi
indovinare** guardando il codice, e che se ignori ti costano una giornata.

---

## 1. Non sei solo nel repository

Ci sono **11 file in `src/` modificati e non committati** da un'altra
sessione, più 7 file nuovi. Se parti da qui senza saperlo, il primo conflitto
è irrecuperabile perché non esiste uno stato pulito da cui ripartire.

**Prima di scrivere una riga**, chiedi conferma che il lavoro dell'altra
sessione sia stato committato, e verifica:

```bash
git status --porcelain | grep -v '^??'      # deve essere vuoto
git log --oneline -3
```

File toccati di recente, i più esposti a un refactoring frontend:

| File | Perché ci hanno messo mano |
|---|---|
| `src/main.tsx` | avvio asincrono: configurazione a runtime + import dinamico |
| `src/config/app.config.ts` | configurazione da `/config.json`, non più da `VITE_*` |
| `src/lib/supabase.ts` | client pigro dietro un `Proxy` |
| `src/lib/telemetria.ts` | scrubbing privacy (nuovo) |
| `src/components/ErrorBoundary.tsx` | nuovo |
| `src/pages/auth/` | `LoginPage` modificata, 2 pagine nuove per il recupero password |
| `src/App.tsx` | 3 rotte nuove |

---

## 2. Cinque cose che sembrano da sistemare e NON vanno toccate

Ognuna è stata scritta così per una ragione pagata sul campo. Sono tutte
documentate in `flowcrm/deploy/GUASTI.md` con il comando per riprodurle.

**2.1 `src/lib/supabase.ts` esporta un `Proxy`, non un client.**
Sembra una complicazione inutile. Serve perché la configurazione arriva a
runtime: con un client creato all'import, il modulo va importato *dopo* il
caricamento della configurazione, e `window.__supabase` — che i test
end-to-end usano in 20 punti — compare qualche istante **dopo** la pagina.
Semplificarlo rimette una corsa che fa fallire i test a caso. *(G-24)*

**2.2 `src/main.tsx` fa `await caricaConfigurazione()` prima di `import('./App')`.**
Non è un ritardo da ottimizzare. Nome cliente, logo, colori e moduli
arrivano da `/config.json`, generato all'avvio del container: è ciò che
permette **una sola immagine Docker per tutti i clienti**. Se rimetti le
`VITE_*`, Vite le cuoce nel bundle a build time e serve un'immagine per
cliente. *(G-14)*

**2.3 I `data-testid` sono un contratto, non decorazione.**
36 in `src/`, di cui **24 usati da 19 spec Playwright**. Un refactoring che
rinomina o rimuove markup li rompe, e la suite diventa rossa per una ragione
che non c'entra con il design. Prima di consegnare:

```bash
grep -rho 'getByTestId(.[^\x27"]*' flowcrm/e2e/ | sort -u   # quelli che DEVONO sopravvivere
```

**2.4 `vite.config.ts` ha `sourcemap: 'hidden'`.**
Non è un errore: le mappe si generano per il collettore degli errori, e il
`Dockerfile` le cancella prima di creare l'immagine. Non metterle a `true`
(le serviresti ai clienti) né a `false` (ogni traccia diventa illeggibile).

**2.5 `ErrorBoundary` avvolge tutto in `main.tsx`.**
Senza, un'eccezione in render dà **pagina bianca**. Il fallback mostra un
codice evento che il cliente detta al telefono. Se ricomponi l'albero,
tienilo fuori dai provider: deve funzionare anche quando è il tema a rompersi.

---

## 3. Un gap che il tuo compito dovrebbe includere

**I colori white-label esistono nella configurazione ma non sono cablati.**

`APP_CONFIG.primaryColor` e `accentColor` arrivano da `/config.json` per ogni
cliente, e **non sono usati in nessun punto della UI**. Verificato:

```bash
grep -rn "primaryColor\|accentColor" flowcrm/src/ | grep -v app.config.ts   # vuoto
```

Il progetto ha già 114 variabili CSS in `src/index.css` (token shadcn) e 19
componenti in `src/components/ui/`. Il ponte fra le due cose non esiste.

È esattamente il tuo terreno, e ha un vincolo preciso: **i colori cambiano a
runtime, per cliente, senza ricostruire l'immagine**. Quindi vanno applicati
scrivendo le variabili CSS all'avvio a partire da `APP_CONFIG` — non
compilati in Tailwind né scritti a mano nei componenti. Se il tuo piano
introduce colori fissi, rompe il modello commerciale del prodotto.

---

## 4. Vincoli tecnici che limitano le librerie

**4.1 La CSP di produzione è severa sugli script.** In
`flowcrm/deploy/Caddyfile`:

```
script-src 'self'          ← niente inline, niente eval, niente CDN
style-src  'self' 'unsafe-inline'   ← gli stili inline invece passano
```

Qualunque libreria che inietti `<script>` a runtime, usi `eval`/`new Function`
o si carichi da CDN **non funziona in produzione** — e funziona benissimo in
sviluppo, quindi il difetto si scopre dal cliente. Verifica la voce
`script-src` prima di scegliere, non dopo.

**4.2 Budget del bundle.** Questa sezione diceva «il chunk iniziale è 429 kB,
ricontrolla il numero dopo `npx vite build`». **Quel controllo era rotto, e la
correzione insegna più del numero.**

Rendendo pigre le 26 pagine interne, rollup ha ridisegnato i confini dei chunk:
il client Supabase — che `main.tsx` importa staticamente per esporre
`window.__supabase` ai test — è finito dentro `index`, e react-router ne è
uscito. Il chunk `index` è così passato da 429 a 637 kB **mentre il carico reale
scendeva da 1823 a 919 kB**. La soglia segnalava un peggioramento durante un
dimezzamento.

La ragione è che «quanto pesa il chunk che si chiama index» è il contenuto di una
scatola il cui perimetro decide il bundler: con lo stesso codice e un
`manualChunks` diverso quel numero si muove di 200 kB senza che un byte cambi
posto nella rete. Non misurava il carico dell'utente.

**Cosa si misura adesso**: il grafo degli import *statici* a partire dall'entry di
`index.html`, più il chunk `App`, che `main.tsx` attende con
`await import('./App')` prima di montare React — pigro per rollup, obbligatorio
per chi guarda lo schermo.

**E non è più una frase in un documento.** `scripts/peso-avvio.mjs` è un plugin
registrato in `vite.config.ts`, quindi gira a ogni `vite build` — compreso quello
nudo della CI, dove un controllo appeso a `npm run build` non girerebbe. Il
riferimento sta in `flowcrm/peso-avvio.json`; il build **fallisce** se il peso
cresce oltre il 5%.

Se la crescita è voluta, si aggiorna `peso-avvio.json` **nello stesso commit** che
la introduce, scrivendo in `perche` cosa l'ha causata. Il margine esiste perché un
tetto fissato al numero di oggi fa fallire la prima aggiunta legittima, e chi la
subisce alza la soglia per sbloccarsi: a quel punto il controllo è diventato la
cosa che si alza quando è scomoda. Un delta costringe invece a **nominare** la
crescita, che è lo scopo.

Per vedere chi occupa cosa dentro un chunk non serve installare nulla: le
sourcemap in `dist/assets/*.js.map` elencano i moduli sorgente e la loro
dimensione (il `Dockerfile` le cancella comunque dall'immagine).

**4.3 `prefers-reduced-motion` non è opzionale qui.** Il prodotto si vende a
studi e aziende con obblighi di accessibilità; è anche nel tuo prompt.

---

## 5. Come lavorare senza rompere l'ambiente

**5.1 Lo sviluppo non richiede Docker.** `npm run dev` basta: in sviluppo
`/config.json` non esiste e la configurazione ricade su `.env.local`.

**5.2 ⚠️ `.env.local` punta all'ISTANZA DEMO ONLINE**, non a un database
locale. Non lanciare comandi che scrivono (`supabase db push`, `db reset`
senza `--local`, script di seed). Verifica sempre prima:

```bash
cat flowcrm/supabase/.temp/project-ref     # se c'è un ref, punti al REMOTO
```
*(G-19: il nome di un file non è una prova del bersaglio)*

**5.3 Sulla demo le scritture sono bloccate di proposito.** Un trigger nega
INSERT/UPDATE/DELETE e mostra *«Funzione disponibile solo nella versione
completa»*. **Non è un difetto da correggere**: è una funzione di prodotto
(`flowcrm/provisioning/sola_lettura.md`). Se ti serve scrivere, chiedi uno
stack locale.

**5.4 Disciplina Docker, se proprio ti serve.** Il 18/09 il disco è arrivato
a 1,5 GB su 238 e Docker ha cominciato a fallire a caso, con tre progetti
attivi sulla stessa macchina. Regole concordate fra le sessioni: uno stack
alla volta, spegnerlo quando non serve, `docker builder prune -af` a fine
sessione, `df -h` prima di avviare, **mai `docker volume prune`** (cancella
per esclusione i dati di chi ha solo lo stack spento).

---

## 6. Prima di dichiarare finito

```bash
cd flowcrm
npx tsc -b            # deve uscire 0
npx oxlint src/       # deve uscire 0
npx vite build        # stampa il peso di avvio e fallisce se e' cresciuto
npx vitest run        # 13/13
```

E soprattutto, contro uno stack locale con utenti di prova:

```bash
npx playwright test --workers=1    # 25 passati, 0 falliti, 2 saltati
```

`--workers=1` non è prudenza: in parallelo le spec si autenticano tutte con
lo stesso utente e le sessioni si invalidano a vicenda. *(nel `ci.yml` c'è la
nota completa)*

Se la suite diventa rossa dopo un tuo refactoring, nove volte su dieci è un
`data-testid` sparito, non un difetto tuo.

---

## 7. Dove sta il resto

| | |
|---|---|
| `flowcrm/deploy/GUASTI.md` | 28 guasti reali, formato SINTOMO/CAUSA/RIMEDIO/VERIFICATO |
| `flowcrm/deploy/RUNBOOK.md` | installazione, con tabella di cosa è **provato** e cosa no |
| `README.md` (radice) | stack, moduli, ruoli |
| `flowcrm/provisioning/` | modello white-label e licenze moduli |

Le skill `ui-ux-pro-max` e `impeccable` sono disponibili in questo ambiente
con questi nomi esatti: non serve cercarle altrove.

**Una nota sul metodo, che in questo progetto è costata cara.** Quasi tutti i
28 guasti nascono da artefatti scritti bene e mai eseguiti fino in fondo:
l'uscita di un comando non prova il suo effetto, un file di log non prova
niente finché non verifichi che contenga qualcosa, e un test verde può essere
di un altro progetto. Se il tuo piano dice «fase completata», accanto ci deve
essere il comando che lo dimostra.
