---
name: FlowCRM
description: Sistema di design per un CRM denso e silenzioso, in cui la tinta appartiene al cliente e non al prodotto.
colors:
  primary: "oklch(0.6861 0.2054 34.6)"
  primary-foreground: "oklch(0.9900 0.0050 34.6)"
  accent-brand: "oklch(0.3898 0.0425 249.0)"
  surface-base: "oklch(0.9774 0.0042 236.5)"
  surface-raised: "oklch(1.0000 0.0000 0)"
  surface-sunken: "oklch(0.9650 0.0059 239.8)"
  ink: "oklch(0.2781 0.0296 256.8)"
  ink-muted: "oklch(0.5006 0.0250 259.2)"
  hairline: "oklch(0.8713 0.0205 250.4)"
  state-danger: "oklch(0.6616 0.1935 21.7)"
  state-success: "oklch(0.7150 0.1303 179.3)"
  state-warning: "oklch(0.7686 0.1647 70.1)"
  night-base: "oklch(0.2086 0.0128 264.2)"
  night-raised: "oklch(0.2425 0.0147 261.7)"
  night-ink: "oklch(0.9297 0.0092 258.3)"
typography:
  display:
    fontFamily: "InterVariable, Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "InterVariable, Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  title:
    fontFamily: "InterVariable, Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.01em"
  body:
    fontFamily: "InterVariable, Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  data:
    fontFamily: "InterVariable, Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "tabular-nums"
  label:
    fontFamily: "InterVariable, Inter, 'Segoe UI', system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "0.08em"
  code:
    fontFamily: "ui-monospace, 'Cascadia Mono', 'Segoe UI Mono', Menlo, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: "normal"
rounded:
  control: "6px"
  surface: "10px"
  panel: "14px"
  pill: "9999px"
spacing:
  hairline: "4px"
  tight: "8px"
  snug: "12px"
  base: "16px"
  loose: "24px"
  section: "32px"
  page: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "36px"
    typography: "{typography.body}"
  button-ghost:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink-muted}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "36px"
  input-field:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "36px"
    typography: "{typography.body}"
  card-surface:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.surface}"
    padding: "20px"
  table-row:
    backgroundColor: "{colors.surface-raised}"
    textColor: "{colors.ink}"
    typography: "{typography.data}"
    height: "44px"
  nav-item-active:
    backgroundColor: "{colors.surface-sunken}"
    textColor: "{colors.primary}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "38px"
---

# Design System: FlowCRM

> **Registro di design vincolante.** I valori vivono in `src/index.css` (variabili CSS +
> `@theme` di Tailwind v4). Nessun colore, raggio, ombra o carattere scritto a mano nei
> componenti: solo token. Il corrispettivo strategico è `PRODUCT.md`.
>
> **Stato al 2026-09-19.** Questo documento descrive il bersaglio, non ciò che è già in
> piedi. Alla data di scrittura sono veri: i ruoli dei token, il tema chiaro e scuro, il
> raggio unico a 12px. Devono ancora diventarlo: lo spazio OKLCH (Fase 1), Inter
> auto-ospitato (Fase 1), i numeri tabellari (Fase 1), la derivazione della tinta dal
> cliente (Fase 2) e la bonifica dei 79 colori fissi (Fase 4). Una riga di questo file non
> è vera finché non esiste il comando che lo dimostra.

## 1. Overview

**Creative North Star: "Il registro di studio"**

Il libro mastro di un commercialista serio. Righe allineate, numeri in colonna, margini
stretti e regolari, niente che sia lì per bellezza. Lo si apre e si ha la sensazione, prima
ancora di leggere, che i conti tornino. La densità non è affollamento: è competenza. Chi
tiene un registro così non ha bisogno di dire che è affidabile.

Da qui discende tutto il resto. Le superfici sono piatte perché una pagina di registro è
piatta, e l'ombra compare solo quando qualcosa si solleva davvero. I numeri sono tabellari
perché in un registro le cifre si leggono in colonna, non in riga. Il colore è raro perché
in un registro il rosso vuol dire qualcosa. La tipografia porta quasi tutta la gerarchia,
perché è quello che fa la carta stampata quando non ha altri mezzi.

Il sistema rifiuta tre famiglie, nominate in `PRODUCT.md`: **il gestionale italiano anni
2000**, da cui eredita la densità e non l'assenza di gerarchia; **il template SaaS generato
dall'IA**, con i suoi gradient text e le sue griglie di card identiche; **l'app consumer
allegra**, con emoji e illustrazioni. Il punto giusto sta nella tensione fra il primo e il
secondo: denso come un gestionale, ordinato come uno strumento moderno.

C'è una quarta cosa che rende questo sistema diverso da quasi ogni altro: **la tinta
primaria non ci appartiene**. Arriva dalla configurazione del cliente a runtime. Il sistema
non può quindi definire *quale* colore usare: definisce **relazioni fra colori** — contrasti,
ruoli, gradini — che devono reggere qualunque tinta il cliente scelga, arancione o giallo o
blu notte.

**Key Characteristics:**

- Densità leggibile: molte righe per schermata, gerarchia dalla tipografia e dallo spazio
- Colore raro e in prestito dal cliente, mai deciso dal prodotto
- Piatto a riposo: bordi e gradini di fondo separano le superfici, le ombre rispondono
- Numeri sempre in colonna, mai a larghezza variabile
- Movimento breve, che comunica uno stato e mai una personalità
- Due temi paritari: nessuna schermata è progettata in uno solo

## 2. Colors

Neutri freddi tintati verso la tinta del cliente, una sola voce di accento, tre stati. La
strategia è **Restrained**: l'accento copre meno del 10% di qualunque schermata, ed è
proprio la sua rarità a farlo funzionare.

### Primary

- **Arancio in prestito** (di default): azioni primarie, voce di navigazione corrente,
  anello di focus, riempimento delle barre di avanzamento. **Questo valore è soltanto il
  ripiego** per l'istanza che non configura nulla: eredità del prototipo, non una decisione
  di marca. Per ogni cliente arriva da `/config.json → primaryColor` e viene riscritto sulle
  variabili CSS prima che React monti.
- **Testo sull'accento**: **si calcola, non si assume.** Vedi *La regola del contrasto
  calcolato*.

### Secondary

- **Ardesia di marca** (di default, da `accentColor`): intestazioni di superficie fredda,
  barre di stato, elementi strutturali che non devono competere con l'accento. Usata poco:
  se compete con la Primary, una delle due è di troppo.

### Neutral

- **Fondo pagina**: il piano più basso, mai bianco puro.
- **Superficie sollevata**: card, tabelle, pannelli. Il bianco è riservato a ciò che sta
  *sopra* il fondo, così il gradino si legge senza bisogno di un'ombra.
- **Superficie incassata**: intestazioni di tabella, campi in sola lettura, fondo della voce
  di navigazione attiva.
- **Inchiostro**: testo principale. Mai `#000`.
- **Inchiostro tenue**: etichette, metadati, testo secondario. È il valore più basso ammesso
  su superficie sollevata: sotto, si va sotto AA.
- **Filo**: bordi e divisori. Un solo peso, 1px.

In tema scuro i tre piani si invertono di ruolo ma non di logica: **fondo notte** sotto,
**superficie notte** sopra, **inchiostro notte** per il testo. Mai nero puro: il nero
assoluto su schermo fa vibrare il testo chiaro.

### Stati

- **Pericolo**, **Riuscita**, **Attenzione**. Tre, non di più. Non sono colori decorativi e
  non entrano mai in un grafico: in un grafico il verde vorrebbe dire «positivo» mentre sta
  solo dicendo «terza serie».

### Named Rules

**La regola del colore in prestito.** La tinta primaria appartiene al cliente. Nessun
componente scrive un colore: né un esadecimale, né una classe di palette Tailwind
(`bg-orange-50`, `text-blue-600`). Un valore fisso nel sorgente non è un errore estetico: è
una funzione che il cliente ha pagato e non riceve. La guardia è un test che confronta le
classi usate in `src/` con i token dichiarati in `index.css`, e **fallisce la build**.

**La regola del contrasto calcolato.** `--primary-foreground` non è bianco: è il risultato
di una soglia sulla lightness OKLCH della tinta del cliente. Un cliente con primario giallo
deve avere testo scuro sui bottoni, senza che nessuno se ne accorga. Il contrasto va
verificato con almeno tre tinte estreme, non con quella di default.

**La regola delle due scale.** I colori dei dati (serie dei grafici, stati delle commesse,
colori delle pipeline) vivono in una scala propria, separata dai colori semantici della UI.
La stessa tinta non può voler dire due cose nello stesso prodotto.

**La regola del dieci per cento.** Se l'accento copre più di un decimo della schermata, ha
smesso di indicare qualcosa. Otto riquadri con otto tinte diverse non sono una palette: sono
coriandoli.

## 3. Typography

**Family:** InterVariable, auto-ospitata (con ripiego `"Segoe UI", system-ui, sans-serif`).
**Mono:** stack di sistema (`ui-monospace, "Cascadia Mono", "Segoe UI Mono", Menlo`), zero
byte scaricati.

Una sola famiglia porta titoli, etichette, corpo e dati: un'interfaccia di prodotto non ha
bisogno di un accoppiamento display+testo, e due caratteri simili creerebbero tensione senza
gerarchia. Inter è auto-ospitata per obbligo, non per gusto: la CSP di produzione dichiara
`font-src 'self' data:` e qualunque CDN di caratteri viene bloccato in silenzio — funziona
in sviluppo e fallisce dal cliente.

**Character:** neutra e paziente. Non ha opinioni sulla pagina, le lascia al contenuto. Le
varianti stilistiche `cv02 cv03 cv04` (una `l` con la coda, una `1` senza base, una `a` a
due piani) esistono per una ragione sola: distinguere caratteri che in un codice cliente o in
una partita IVA si confondono.

### Hierarchy

- **Display** (600, 1.875rem/30px, 1.2, -0.02em): solo login, errore di avvio, schermate
  senza shell. Non compare mai dentro l'applicazione.
- **Headline** (600, 1.5rem/24px, 1.25, -0.02em): titolo di pagina, uno solo per schermata.
  Semibold e non bold: a 24px il peso 700 grida.
- **Title** (600, 1rem/16px, 1.4, -0.01em): titolo di sezione, intestazione di card, nome
  nella riga di dettaglio.
- **Body** (400, 0.875rem/14px, 1.5): testo dell'interfaccia. La prosa non supera i 70ch.
- **Data** (400, 0.8125rem/13px, 1.45, `tabular-nums`): tabelle e liste dense. Un gradino
  sotto il corpo: è ciò che permette la densità senza stringere le righe.
- **Label** (600, 0.6875rem/11px, 1.3, +0.08em, maiuscoletto): intestazioni di colonna,
  titoli di sezione nella navigazione, occhielli. Le maiuscole senza spaziatura si toccano:
  il tracking non è opzionale.
- **Code** (500, 0.8125rem/13px, monospazio): codici generati (`PAZ-2026-0001`,
  `AGEN-2026-0004`), partite IVA, codici fiscali, chiavi. Tutto ciò che si detta al telefono.

### Named Rules

**La regola dei numeri in colonna.** `font-variant-numeric: tabular-nums` su ogni `table` e
su ogni elemento `[data-slot="kpi"]`, come regola globale in `index.css`, non componente per
componente. In un prodotto pieno di euro e di date, cifre a larghezza variabile significano
colonne che non si allineano, e una colonna che non si allinea si legge come un errore di
calcolo anche quando il numero è giusto.

**La regola della scala corta.** Sette ruoli tipografici, non quattordici. Il rapporto fra
gradini è ~1.2 e la scala è fissa in `rem`: mai `clamp()` in un'interfaccia di prodotto, dove
l'utente lavora a DPI costante e un titolo che si restringe dentro un pannello peggiora la
lettura invece di migliorarla.

**La regola del peso prima della dimensione.** Fra due elementi vicini si cambia prima il
peso e il colore, poi la dimensione. Una schermata densa con sei dimensioni diverse diventa
un elenco di prezzi.

## 4. Elevation

Il sistema è **piatto a riposo**. Le superfici si separano con un filo da 1px e un gradino di
fondo (incassato → pagina → sollevato), che è lo stesso meccanismo in tema chiaro e in tema
scuro. L'ombra non descrive la gerarchia: **descrive uno stato**. Compare quando qualcosa
risponde al puntatore, o quando qualcosa galleggia davvero sopra il contenuto.

Le ombre sono fredde e trasparenti — costruite sulla tinta dell'inchiostro, mai nero puro — e
discrete: se la vedi chiaramente, è troppo forte.

### Shadow Vocabulary

- **risposta** (`box-shadow: 0 1px 2px oklch(0.28 0.03 257 / 0.06), 0 2px 8px oklch(0.28 0.03 257 / 0.06)`):
  card e righe al passaggio del puntatore. È l'unico caso in cui un elemento a riposo la
  acquista.
- **sospeso** (`box-shadow: 0 8px 30px oklch(0.28 0.03 257 / 0.14)`): menu a comparsa,
  popover, pannello delle notifiche, palette dei comandi. Ciò che sta nel livello superiore.
- **modale** (`box-shadow: 0 16px 48px oklch(0.28 0.03 257 / 0.20)`): dialog, con velo dietro.

In tema scuro le tre voci **perdono forza e guadagnano un filo più chiaro** sul bordo
superiore: su fondo notte un'ombra non si vede, mentre un bordo che cattura luce sì.

### Named Rules

**La regola del piatto a riposo.** Una card che non è stata toccata non ha ombra. Se una
schermata mostra dodici ombre contemporaneamente, nessuna di esse sta più dicendo «questo è
sollevato».

**La prova del 2014.** Se sembra un'app del 2014, l'ombra è troppo scura e la sfocatura
troppo piccola. Le ombre di questo sistema sono larghe, tenui e fredde.

## 5. Components

Carattere generale: **precisi e trattenuti**. Rispondono subito, non si fanno notare, e non
cambiano mai le proprie dimensioni per uno stato.

### Buttons

- **Shape:** spigoli appena addolciti (6px, `{rounded.control}`); altezza 36px, 32px nella
  taglia compatta dentro le tabelle.
- **Primary:** fondo accento, testo calcolato, padding `0 16px`. Uno per schermata: se ce ne
  sono due primari, uno dei due non lo è.
- **Hover / Focus:** l'hover scurisce il fondo di un gradino di lightness in 120ms, **senza
  sollevamento e senza scala**. Il focus da tastiera è un anello di 2px a 2px di distacco,
  nel colore dell'anello, sempre visibile (`:focus-visible`).
- **Active:** fondo più scuro di un altro gradino. Nessun affondamento geometrico.
- **Secondary / Ghost:** il ghost è la scelta abituale nelle barre di utilità: testo tenue,
  fondo che compare solo al passaggio. Il secondary porta bordo da 1px e fondo di superficie.
- **Disabled:** opacità 50%, puntatore neutro, e **l'etichetta dice perché** quando la ragione
  non è ovvia (permesso mancante, istanza dimostrativa in sola lettura).
- **Loading:** l'etichetta resta, l'indicatore la affianca, **la larghezza non cambia**.

### Cards / Containers

- **Corner Style:** 10px (`{rounded.surface}`); 14px per i pannelli che contengono altre card.
- **Background:** superficie sollevata su fondo pagina.
- **Shadow Strategy:** nessuna a riposo (vedi *La regola del piatto a riposo*); *risposta*
  solo se la card è cliccabile.
- **Border:** filo da 1px, sempre. È il bordo a separare, non l'ombra.
- **Internal Padding:** 20px; 16px nelle griglie fitte. Mai card dentro card.

### Inputs / Fields

- **Style:** fondo di superficie, filo da 1px, 6px di raggio, altezza 36px, testo a 14px.
- **Label:** sempre visibile sopra il campo. Il segnaposto non è un'etichetta: sparisce
  appena si scrive, e chi si distrae non sa più cosa stava compilando.
- **Focus:** il bordo passa al colore dell'anello e compare l'anello a 2px. Nessun bagliore.
- **Error:** bordo di pericolo, messaggio **sotto** il campo, legato con `aria-describedby`,
  e il messaggio dice cosa fare. La validazione scatta all'uscita dal campo, non a ogni tasto.

### Navigation

- **Sidebar:** larghezza 256px, comprimibile su desktop, fuori tela su mobile. Sezioni con
  etichetta in maiuscoletto (Label), voci a 38px.
- **Voce corrente:** fondo incassato e testo nel colore dell'accento. **Nessuna barra laterale
  colorata**: vedi *La regola della scatola immobile*.
- **Hover:** fondo incassato attenuato, 120ms, solo colore.
- **Header:** barra di utilità *più* il senso del luogo — dove sono e come ci sono arrivato.
  Una barra che porta solo comandi lascia l'utente senza orientamento.

### Tables

Il componente più importante del prodotto: quindici pagine ne vivono.

- **Intestazione:** Label in maiuscoletto su superficie incassata, filo sotto, sticky quando
  la lista supera lo schermo.
- **Righe:** 44px, testo Data a 13px tabellare, filo fra le righe, `hover` sul fondo incassato.
- **Riga cliccabile:** è un collegamento a tutti gli effetti — raggiungibile con Tab,
  attivabile con Invio, con il focus visibile. Una riga che il mouse apre e la tastiera no è
  metà interfaccia.
- **Allineamento:** numeri e date a destra, testo a sinistra, **sempre**. Una colonna di
  importi allineata a sinistra non si può confrontare a colpo d'occhio.
- **Vuoto:** mai una riga «nessun risultato». Uno stato vuoto che dice cosa fare dopo.

### Skeletons

- Della **forma** del contenuto che sta arrivando (testata, righe, fascia di numeri), non un
  rettangolo generico e mai uno spinner al centro della pagina.
- Pulsano solo con `motion-safe`; con il movimento ridotto restano fermi e visibili.

### Named Rules

**La regola della scatola immobile.** Nessuno stato — hover, focus, attivo, selezionato —
può cambiare le dimensioni della scatola di un elemento. Un bordo che compare va compensato,
o sostituito da fondo e peso. Una voce di menu che sposta il testo di 3px quando si attiva fa
tremare la navigazione a ogni clic.

**La regola della forma attesa.** Durante il caricamento si mostra la forma del dato, mai il
dato provvisorio. Uno `0` al posto di un numero che sta arrivando non è un segnaposto: è una
informazione falsa, e l'utente la legge prima di capire che lo era.

**La regola degli otto stati.** Ogni componente interattivo nasce con default, hover, focus,
attivo, disabilitato, in caricamento, in errore e completato. Consegnarne metà significa che
l'altra metà la scoprirà il cliente.

## 6. Do's and Don'ts

### Do:

- **Do** far arrivare ogni tinta da `/config.json` attraverso le variabili CSS, riscritte a
  runtime prima che React monti. Il colore è una funzione venduta, non una costante.
- **Do** calcolare `--primary-foreground` dalla lightness OKLCH della tinta del cliente, e
  verificarlo con almeno tre tinte estreme (scura, chiara satura, media).
- **Do** mettere `font-variant-numeric: tabular-nums` su `table` e `[data-slot="kpi"]` come
  regola globale.
- **Do** allineare a destra numeri, importi e date; a sinistra il testo.
- **Do** usare lo scheletro della forma del contenuto, e lasciare la cella vuota finché il
  numero vero non arriva.
- **Do** rendere ogni riga cliccabile raggiungibile con Tab e attivabile con Invio.
- **Do** allargare l'area sensibile a 44px **solo** con `@media (pointer: coarse)`, tramite
  uno pseudo-elemento: su desktop la densità non si paga.
- **Do** racchiudere ogni animazione in `motion-safe:`, e verificare il risultato con il
  movimento ridotto attivo.
- **Do** animare solo `transform`, `opacity` e colore, con `--ease-out-quart`
  (`cubic-bezier(0.25, 1, 0.5, 1)`) e durate di 120ms (istante), 200ms (stato), 280ms
  (pannello).
- **Do** progettare ogni schermata nuova in entrambi i temi prima di considerarla finita.

### Don't:

- **Don't** scrivere un esadecimale o una classe di palette Tailwind (`bg-orange-50`,
  `text-blue-600`, `from-blue-400`) dentro un componente. Mai. Il test di guardia fallisce.
- **Don't** usare un `border-left` o `border-right` maggiore di 1px come striscia colorata su
  card, righe o voci di menu. Non è mai intenzionale ed è anche un salto di layout.
- **Don't** usare gradient text (`background-clip: text` su un gradiente), glassmorphism per
  default, griglie di card tutte uguali o hero-metric giganti: è il **template SaaS generato
  dall'IA**, anti-reference dichiarata in `PRODUCT.md`.
- **Don't** mettere emoji nell'interfaccia. Le icone sono SVG di un solo insieme (Lucide). È
  l'**app consumer allegra**, seconda anti-reference.
- **Don't** compensare la densità togliendo gerarchia: griglie grigie fitte con tutto dello
  stesso peso sono il **gestionale italiano anni 2000**, terza anti-reference.
- **Don't** animare `width`, `height`, `top`, `left` o i margini. Nemmeno una volta.
- **Don't** usare rimbalzi, elastici o parallasse. Gli oggetti reali decelerano, non
  rimbalzano.
- **Don't** caricare caratteri da un CDN: `font-src 'self' data:` li blocca in produzione e
  il difetto si scopre dal cliente.
- **Don't** aprire una modale come prima idea. Prima si esaurisce ciò che si può fare in linea.
- **Don't** usare il colore come unico portatore di significato: accanto ci vuole sempre
  un'etichetta, un'icona o una forma.
- **Don't** usare `#000`, `#fff` o un grigio a chroma zero. Ogni neutro è tintato verso la
  tinta corrente (chroma 0.004–0.03).
