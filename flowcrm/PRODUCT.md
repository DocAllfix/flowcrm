# Product

Registro di prodotto: fonte di verità strategica per ogni decisione di design.
Scritto il 2026-09-19 dalla sessione frontend, con le risposte del committente.
Il corrispettivo visivo è `DESIGN.md`; questo file dice *chi/cosa/perché*, quello
dice *come appare*.

## Register

product

## Users

Micro e piccole imprese di servizi italiane, **1–15 utenti**, senza reparto IT.
Ogni cliente ha la **propria istanza privata** (Supabase dedicato, sottodominio
proprio): non è un SaaS multi-tenant, è un prodotto installato.

| Chi | Contesto | Lavoro da portare a casa |
|---|---|---|
| **Titolare / manager** (compra e usa) | apre il prodotto due o tre volte al giorno, spesso di fretta, spesso da portatile | *«come sta andando, cosa è in scadenza, chi devo sollecitare»* — vuole la risposta in una schermata, non un percorso |
| **Operatore / segreteria** (ci vive dentro) | otto ore sulla stessa manciata di pagine, molte righe, molta immissione dati | *«inserire senza sbagliare e ritrovare in fretta»* — tollera la densità, non tollera i clic inutili né i campi che si spostano |
| **Agente di commercio** (portale dedicato) | in mobilità, spesso da telefono, fra una visita e l'altra | *«cosa ho venduto, cosa mi devono, cosa visito oggi»* — vede solo i propri dati, per RLS |
| **Professionista sanitario** (modulo poliambulatori) | fra un paziente e l'altro, dati sensibili GDPR art. 9 | *«agenda di oggi, fascicolo, referto da validare»* — la riservatezza è visibile, non implicita |

Ruoli e permessi sono imposti dal **database** (RLS Postgres), mai dal frontend:
la UI mostra e chiama, non decide. Nascondere una voce di menu non è una misura di
sicurezza ed è trattata come una cortesia, non come una barriera.

## Product Purpose

CRM e controllo di gestione: anagrafiche, vendite con pipeline configurabili,
attività e timeline, progetti e commesse, amministrazione (fatture, incassi,
scadenze fiscali), più cinque moduli verticali attivabili per licenza (gare
d'appalto, cantiere, automezzi, agenti, poliambulatori).

Il modello commerciale è la cosa che il design deve rispettare più di ogni altra:
**una sola immagine Docker per tutti i clienti.** Nome, logo, colori e moduli
arrivano a runtime da `/config.json`. Personalizzare un cliente è un riavvio, non
una ricostruzione. Ne discende una regola che vale come un vincolo tecnico:

> **Nessun colore, raggio, ombra o carattere scritto a mano nei componenti.**
> Un valore fisso nel sorgente non è un difetto estetico: è un pezzo di prodotto
> che il cliente ha pagato e non riceve.

Successo = un rappresentante apre la demo davanti a un imprenditore e questo non
chiede «ma si può mettere il mio logo»: lo vede già.

## Brand Personality

**Sobrio, solido, italiano.**

- *Sobrio* — niente esclamazioni, niente decorazione che non porti informazione.
  Il prodotto non festeggia: conferma.
- *Solido* — dà l'impressione che i numeri siano giusti e che il lavoro non si
  perda. La fiducia si costruisce con la coerenza, non con le rassicurazioni.
- *Italiano* — non come folklore: lingua, formati (`it-IT`, €, date), e il fatto
  che le parole del dominio sono quelle che l'utente usa già (commessa, SAL,
  provvigione, DURC), mai la loro traduzione dall'inglese.

Riferimenti di categoria: **Linear e Stripe Dashboard** per la precisione e la
densità. Ma senza la freddezza anglosassone: qui l'utente non è uno sviluppatore,
è un imprenditore che ha altro da fare. Competenza tranquilla, non performance.

Voce: seconda persona, frasi brevi, il perché quando serve a decidere. Gli errori
dicono cosa fare, non cosa è andato storto.

## Anti-references

Tre, e sono in tensione fra loro: è quella tensione a definire il punto giusto.

1. **Il gestionale italiano anni 2000.** Griglie fitte grigie, icone a sedici
   colori, finestre modali su finestre modali, testo di sistema a 11px. È la
   famiglia da cui allontanarsi di più — ma *densità* non è il difetto: il difetto
   è l'assenza di gerarchia. Questo prodotto resta denso, e diventa leggibile.
2. **Il template SaaS generato dall'IA.** Gradient text, glassmorphism per
   default, griglie di card tutte uguali, hero-metric giganti, viola su nero.
   È il rischio opposto, e il più probabile quando si «moderna» in fretta.
3. **L'app consumer allegra.** Emoji nell'interfaccia, illustrazioni, tono
   colloquiale, animazioni giocose. *(Oggi in `DashboardPage` c'è un 👋: va via.)*

Non è anti-reference il prototipo HubSpot da cui nasce la palette (`#ff5c35`,
`#33475b`): resta un valore di **default** legittimo per chi non sceglie. Deve
smettere di essere un valore **fisso**, non di esistere.

## Design Principles

1. **Il database è la verità, la UI è una finestra.** Permessi, calcoli e limiti
   stanno nelle policy RLS e nei trigger. Il frontend non duplica quelle regole:
   le mostra e le chiama. Una schermata che «protegge» qualcosa da sola sta
   mentendo all'utente sulla sicurezza reale.
2. **Il colore appartiene al cliente.** Il design system definisce *relazioni*
   fra colori (contrasti, ruoli, stati), mai valori. Ogni tinta si deriva a
   runtime dai due colori configurati, e il contrasto del testo si **calcola**:
   deve restare sopra AA qualunque colore scelga il cliente, anche un giallo.
3. **Densità con gerarchia.** L'operatore vuole molte righe per schermata; il
   titolare vuole capire in tre secondi. Non è un compromesso: si risolve con
   tipografia, allineamento dei numeri e spazio, non togliendo dati.
4. **La risposta immediata vale più della velocità reale.** Uno scheletro della
   forma del contenuto, mai uno spinner al centro, e **mai un numero provvisorio
   sbagliato** al posto del dato che deve ancora arrivare.
5. **Un artefatto conta quando è stato eseguito.** Nessuna fase è «completata»
   senza accanto il comando che lo dimostra. È la regola che ha già evitato a
   questo progetto ventotto guasti; vale anche per il design.

## Accessibility & Inclusion

**WCAG 2.2 livello AA, vincolante.** Non è un obiettivo: è un criterio che fa
fallire una fase. Il prodotto si vende a studi e aziende con obblighi, e un
modulo tratta dati sanitari.

- Contrasto ≥ 4.5:1 su testo e ≥ 3:1 su controlli e icone, **in entrambi i temi**
  e con **qualunque** colore primario configurato dal cliente.
- Tastiera completa: ordine di tabulazione uguale all'ordine visivo, focus sempre
  visibile, e ogni riga cliccabile attivabile con Invio (oggi 28 file hanno righe
  che il mouse apre e la tastiera no).
- `prefers-reduced-motion` rispettato ovunque: con il movimento ridotto restano
  le dissolvenze e gli indicatori di stato, spariscono le traslazioni.
- Bersagli di tocco ≥ 44px **dove il puntatore è grossolano**, allargando l'area
  sensibile e non il disegno: su desktop la densità non si paga.
- Il colore non è mai l'unico portatore di significato: accanto c'è sempre
  un'etichetta, un'icona o una forma.
- Nessun blocco dello zoom; dimensioni in `rem`; l'impaginazione regge al 200%.
