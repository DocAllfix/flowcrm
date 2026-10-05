/**
 * I testi delle pagine di settore (`/moduli/[slug]`), uno per modulo di `moduli.ts`.
 *
 * ⚠️ Ogni affermazione è verificata sul codice del modulo (schede in
 * `flowcrm/src/modules/<slug>/dettaglio`, stati in `stati.ts`, tabelle nelle
 * migrazioni) il 29/09/2026; i sette moduli nuovi (dal ristorante all'agenzia immobiliare)
 * il 05/10/2026, sulle matrici di conformità in `flowcrm/docs/moduli-verticali`. Cose che il prodotto NON fa, e che quindi non si scrivono:
 * - invio delle fatture allo SdI (è in programma, oggi no: la fattura si emette con il
 *   proprio programma e in PMIFlow si registra);
 * - scaricamento automatico dei bandi dalle piattaforme;
 * - calcolo automatico dei contributi Enasarco;
 * - app da installare (è un'applicazione web, funziona anche da telefono).
 *
 * ⚠️ Niente prezzi, niente «€»: il gate lo blocca.
 *
 * Lunghezze: `titolo` 50–60 caratteri (senza « · PMIFlow», che aggiunge il layout),
 * `descrizione` 140–160. Le verifica `verifica-seo.mjs` sulla pagina servita.
 */
export type IdSettore =
  | "gare"
  | "cantiere"
  | "automezzi"
  | "agenti"
  | "poliambulatori"
  | "ristorante"
  | "bar"
  | "hotel"
  | "palestra"
  | "fioraio"
  | "garage"
  | "immobiliare";

export type PaginaSettore = {
  titolo: string;
  descrizione: string;
  h1: string;
  sottotitolo: string;
  parolaChiave: string;
  paroleCorrelate: string[];
  /** Voce del menu della demo da aprire con `?vai=` (vedi flowcrm/src/lib/destinazioneDemo.ts). */
  percorsoDemo: string;
  /**
   * `false` finché il modulo non è acceso nella demo pubblica (licenza e VITE_MODULES di
   * pmiflow-demo): il pulsante «Apri … nella demo» porterebbe al cruscotto generico.
   * Si toglie quando il modulo entra in demo (docs/moduli-verticali/rilascio.md).
   */
  inDemo?: boolean;
  /** Il nome breve per il pulsante: «Apri il Cantiere nella demo». */
  nomeBreve: string;
  problemi: { problema: string; soluzione: string; funzione: string }[];
  /** Le quattro voci di «Aggiunge», con testo lungo; `anteprima` è la chiave in `componenti/settori`. */
  funzioni: { titolo: string; testo: string; dettaglio: string; anteprima: string }[];
  domande: [string, string][];
};

export const PAGINE_SETTORE: Record<IdSettore, PaginaSettore> = {
  cantiere: {
    titolo: "Gestionale di cantiere per imprese edili: SAL, DURC e costi",
    descrizione:
      "Cronoprogramma, rapportini, SAL collegati alle fatture e scadenze di DURC e SOA dei subappaltatori: il gestionale di cantiere per imprese fino a 15 persone.",
    h1: "Il cantiere sotto controllo, dal primo rapportino all'ultimo SAL.",
    sottotitolo:
      "Cronoprogramma, rapportini, costi, subappaltatori e sicurezza nella stessa scheda del cantiere. Il SAL approvato si collega alla fattura, e la scadenza di un DURC si vede prima che fermi i lavori.",
    parolaChiave: "gestionale cantiere",
    paroleCorrelate: ["software gestione cantieri", "gestione SAL", "scadenze DURC subappaltatori", "rapportino giornaliero di cantiere"],
    percorsoDemo: "/cantieri",
    nomeBreve: "il Cantiere",
    problemi: [
      {
        problema: "I SAL stanno in un foglio Excel, le fatture in un altro programma.",
        soluzione: "Ogni SAL ha il suo stato, da bozza a pagato, ed è collegato alla fattura del registro: sai cosa è maturato, cosa è fatturato e cosa è incassato.",
        funzione: "SAL e contabilità",
      },
      {
        problema: "Il DURC di un subappaltatore scade e nessuno se ne accorge.",
        soluzione: "DURC, SOA, assicurazioni, visite mediche e formazione entrano nelle scadenze del cantiere, con il promemoria prima della data.",
        funzione: "Scadenze di cantiere",
      },
      {
        problema: "Il capocantiere racconta la giornata al telefono, e il giorno dopo nessuno la ricorda.",
        soluzione: "Il rapportino giornaliero registra presenze, lavorazioni e problemi, e resta nello storico del cantiere.",
        funzione: "Rapportini giornalieri",
      },
    ],
    funzioni: [
      {
        titolo: "Cronoprogramma e rapportini",
        testo: "Le fasi del cantiere con inizio, fine e dipendenze. Ogni giorno il rapportino con presenze, lavorazioni e problemi: il capocantiere scrive, l'ufficio vede.",
        dettaglio: "Fasi collegate fra loro",
        anteprima: "cronoprogramma",
      },
      {
        titolo: "SAL e contabilità",
        testo: "Libretto delle misure, costi di cantiere e SAL con il loro stato: bozza, emesso, fatturato, pagato. L'approvazione del SAL passa dalla persona giusta.",
        dettaglio: "Collegati al registro fatture",
        anteprima: "sal",
      },
      {
        titolo: "Imprese, DURC e personale",
        testo: "Subappaltatori con referente e lavorazioni, il personale di cantiere con ruolo e presenza del giorno, e i documenti in scadenza di ciascuno.",
        dettaglio: "DURC, SOA, visite mediche, formazione",
        anteprima: "imprese",
      },
      {
        titolo: "Sicurezza, qualità e ambiente",
        testo: "Registro sicurezza con la gravità di ogni evento, controlli qualità conformi e non conformi, registro ambiente con i formulari dei rifiuti.",
        dettaglio: "Tre registri nella scheda del cantiere",
        anteprima: "sicurezza",
      },
    ],
    domande: [
      [
        "Il SAL diventa una fattura da solo?",
        "Il SAL si collega alla fattura del registro fatture di PMIFlow, e il suo stato passa a fatturato e poi a pagato. L'invio della fattura elettronica allo SdI oggi non è compreso: la fattura la emetti con il tuo programma di fatturazione e la registri in PMIFlow.",
      ],
      [
        "Posso seguire più cantieri insieme?",
        "Sì. Ogni cantiere ha la sua scheda e il suo stato (pianificato, in apertura, attivo, sospeso, chiuso), e l'elenco mostra a colpo d'occhio dove siete.",
      ],
      [
        "Il capocantiere può usarlo dal telefono?",
        "Sì. PMIFlow funziona nel browser, anche su telefono e tablet, senza app da installare. Il rapportino si compila dal cantiere.",
      ],
      [
        "I subappaltatori devono avere un account?",
        "No. Le imprese sono aziende della tua anagrafica: ne tieni referente, lavorazioni e documenti senza dare loro l'accesso al programma.",
      ],
      [
        "Si collega a una gara vinta?",
        "Sì, se usi anche il modulo Gare d'appalto: dalla gara aggiudicata si avviano la commessa e il cantiere collegato, senza ricopiare i dati.",
      ],
    ],
  },

  gare: {
    titolo: "Software per gare d'appalto: bandi, requisiti e cauzioni",
    descrizione:
      "Dalla lettura del bando all'aggiudicazione: requisiti, chiarimenti, offerta, cauzioni con la scadenza ed esiti per ente. Per le imprese che partecipano a gare.",
    h1: "Ogni gara d'appalto, dalla lettura del bando all'aggiudicazione.",
    sottotitolo:
      "Il bando con CIG e CUP, i requisiti da verificare, i chiarimenti chiesti alla stazione appaltante, le cauzioni con la loro scadenza. E alla fine sai con quali enti vincete davvero.",
    parolaChiave: "software gare d'appalto",
    paroleCorrelate: ["gestione gare d'appalto", "scadenza cauzione provvisoria", "decisione go/no-go gara", "partecipare a gare pubbliche"],
    percorsoDemo: "/gare-kanban",
    nomeBreve: "le Gare",
    problemi: [
      {
        problema: "A metà preparazione si scopre che manca un requisito.",
        soluzione: "La scheda elenca i requisiti del bando, e la decisione di partecipare arriva prima di spendere giorni sull'offerta.",
        funzione: "Requisiti e valutazione",
      },
      {
        problema: "Le cauzioni restano aperte anni dopo la gara.",
        soluzione: "Ogni cauzione ha garante, scadenza e restituzione: quelle da recuperare si vedono.",
        funzione: "Cauzioni e garanzie",
      },
      {
        problema: "Non si sa con quali enti si vince, e si partecipa a tutto.",
        soluzione: "Il cruscotto mostra gli esiti per ente e per territorio: si sceglie dove partecipare guardando i risultati.",
        funzione: "Esiti per ente e territorio",
      },
    ],
    funzioni: [
      {
        titolo: "Requisiti e chiarimenti",
        testo: "I requisiti di partecipazione del bando, le domande di chiarimento alla stazione appaltante con la risposta ricevuta e il suo effetto sull'offerta.",
        dettaglio: "CIG, CUP, CPV e RUP nella scheda",
        anteprima: "requisiti",
      },
      {
        titolo: "Offerta e decisione di partecipare",
        testo: "Criteri di valutazione con voto, decisione go/no-go, approvazione dell'offerta tecnica ed economica prima dell'invio, protocollo della piattaforma.",
        dettaglio: "Stati dalla lettura all'aggiudicazione",
        anteprima: "offerta",
      },
      {
        titolo: "Cauzioni con la scadenza",
        testo: "Cauzioni e garanzie con banca o assicurazione, scadenza e data di restituzione. Nessuna resta dimenticata in un cassetto.",
        dettaglio: "Promemoria prima della scadenza",
        anteprima: "cauzioni",
      },
      {
        titolo: "Esiti per ente e territorio",
        testo: "Quante gare avete presentato e vinto, per stazione appaltante e per territorio. Il team di gara di ognuna, con i ruoli.",
        dettaglio: "Cruscotto delle gare",
        anteprima: "esiti",
      },
    ],
    domande: [
      [
        "I bandi si scaricano da soli dalle piattaforme?",
        "No. Il bando lo inserisci tu, con CIG, CUP, CPV, importo a base di gara, piattaforma e termini. PMIFlow è il posto dove la gara si prepara e si segue, non un servizio di ricerca bandi.",
      ],
      [
        "Possiamo lavorare in più persone sulla stessa gara?",
        "Sì. Ogni gara ha il suo team, con il ruolo di ciascuno, e le approvazioni (offerta tecnica, offerta economica, autorizzazione all'invio) passano dalle persone giuste.",
      ],
      [
        "Cosa succede quando vinciamo?",
        "Dalla gara aggiudicata si avvia la commessa, e se usate anche il modulo Cantiere, il cantiere collegato. I dati del committente non si ricopiano.",
      ],
      [
        "Serve anche il modulo Cantiere?",
        "No, i moduli sono indipendenti. Gare d'appalto funziona da solo sopra il nucleo di PMIFlow; il Cantiere si aggiunge solo se vi serve.",
      ],
    ],
  },

  automezzi: {
    titolo: "Gestione parco auto aziendale: scadenze, costi, manutenzioni",
    descrizione:
      "Assicurazione, bollo e revisione, manutenzioni, rifornimenti, costo al km, sinistri e multe: la gestione della flotta aziendale per le piccole imprese.",
    h1: "Ogni mezzo con le sue scadenze, i suoi costi e chi lo sta guidando.",
    sottotitolo:
      "Assicurazione, bollo e revisione arrivano con un promemoria. Rifornimenti e manutenzioni diventano un costo al chilometro, e sai sempre a chi è assegnato il furgone.",
    parolaChiave: "gestione parco auto aziendale",
    paroleCorrelate: ["gestione flotta aziendale", "scadenze bollo assicurazione revisione", "costo al km dei mezzi aziendali", "registro manutenzioni automezzi"],
    percorsoDemo: "/automezzi-dashboard",
    nomeBreve: "gli Automezzi",
    problemi: [
      {
        problema: "La revisione scaduta si scopre al posto di blocco.",
        soluzione: "Assicurazione, bollo e revisione di ogni mezzo entrano nelle scadenze, con il promemoria prima della data.",
        funzione: "Scadenze del mezzo",
      },
      {
        problema: "Nessuno sa quanto costa davvero ogni mezzo.",
        soluzione: "Costi fissi, rifornimenti e manutenzioni si sommano nel costo totale e nel costo al chilometro, mezzo per mezzo.",
        funzione: "Costo al km",
      },
      {
        problema: "Il furgone c'è, ma chi ce l'ha?",
        soluzione: "Ogni mezzo è assegnato a una persona o a un reparto; il registro degli utilizzi tiene conducente, destinazione e chilometri.",
        funzione: "Assegnazioni e utilizzi",
      },
    ],
    funzioni: [
      {
        titolo: "Assicurazione, bollo e revisione",
        testo: "Le scadenze di ogni mezzo in un solo scadenziario, con il promemoria. Le richieste di utilizzo e le autorizzazioni alla manutenzione passano da un'approvazione.",
        dettaglio: "Scadenziario del parco",
        anteprima: "scadenze",
      },
      {
        titolo: "Manutenzioni e pneumatici",
        testo: "Il registro delle manutenzioni ordinarie e straordinarie, con officina e ore di fermo. Gli pneumatici estivi e invernali, montati o a deposito.",
        dettaglio: "Storico per ogni mezzo",
        anteprima: "manutenzioni",
      },
      {
        titolo: "Rifornimenti e costo al km",
        testo: "Litri, chilometri e carta carburante di ogni rifornimento. Da lì consumo medio, costo totale e costo al chilometro.",
        dettaglio: "Cruscotto del parco",
        anteprima: "costi",
      },
      {
        titolo: "Sinistri e multe",
        testo: "Sinistri con controparte e luogo, multe con ente accertatore, punti, pagamento ed eventuale ricorso.",
        dettaglio: "Anche le attrezzature installate",
        anteprima: "sinistri",
      },
    ],
    domande: [
      [
        "Posso assegnare un mezzo a un cantiere?",
        "Sì, se usate anche il modulo Cantiere: nella scheda del cantiere compaiono i mezzi del parco assegnati a quel lavoro.",
      ],
      [
        "Chi guida può registrare i chilometri dal telefono?",
        "Sì. PMIFlow funziona nel browser anche da telefono: il registro degli utilizzi si compila a fine giro, con chilometri iniziali e finali.",
      ],
      [
        "Tiene anche le attrezzature dei mezzi?",
        "Sì. Ogni mezzo ha le sue attrezzature installate e i suoi pneumatici, con quelli montati e quelli a deposito.",
      ],
      [
        "Funziona anche con due o tre mezzi?",
        "Sì. Il modulo serve dal primo furgone: le scadenze e il costo al chilometro sono utili già con pochi mezzi.",
      ],
    ],
  },

  agenti: {
    titolo: "Software agenti di commercio: visite, ordini e provvigioni",
    descrizione:
      "Portafoglio clienti, rapporti di visita, offerte e ordini, obiettivi e provvigioni per ogni agente, anche dal telefono. La direzione commerciale vede l'insieme.",
    h1: "La rete commerciale in un posto solo, dalla visita alla provvigione.",
    sottotitolo:
      "Ogni agente ha il suo portafoglio, i suoi rapporti di visita e le sue provvigioni da liquidare. La direzione vede obiettivi e andamento di tutti, senza chiedere fogli a fine mese.",
    parolaChiave: "software per agenti di commercio",
    paroleCorrelate: ["gestione rete vendita", "calcolo provvigioni agenti", "rapporto di visita cliente", "obiettivi commerciali agenti"],
    percorsoDemo: "/agenti",
    nomeBreve: "gli Agenti",
    problemi: [
      {
        problema: "I rapporti di visita arrivano su WhatsApp, quando arrivano.",
        soluzione: "Ogni visita ha il suo rapporto: esito, referenti incontrati, argomenti, opportunità e criticità, nella scheda del cliente.",
        funzione: "Rapporti di visita",
      },
      {
        problema: "Le provvigioni si ricalcolano a mano ogni trimestre.",
        soluzione: "Le provvigioni maturano per periodo secondo il piano dell'agente, e la liquidazione passa da un'approvazione.",
        funzione: "Provvigioni",
      },
      {
        problema: "La direzione scopre a dicembre che gli obiettivi erano lontani.",
        soluzione: "Gli obiettivi annuali di ogni agente e l'andamento dell'anno si vedono nella direzione commerciale, agente per agente.",
        funzione: "Obiettivi",
      },
    ],
    funzioni: [
      {
        titolo: "Portafoglio e visite",
        testo: "I clienti di ogni agente con la loro classe, e i rapporti di visita con esito, opportunità e criticità. La riassegnazione di un portafoglio passa da un'approvazione.",
        dettaglio: "Ogni agente vede i suoi clienti",
        anteprima: "visite",
      },
      {
        titolo: "Offerte e ordini dal telefono",
        testo: "Preventivi con validità e ordini per cliente, compilati anche fuori sede. Sconti oltre soglia e deroghe commerciali chiedono l'approvazione.",
        dettaglio: "Nel browser, senza app",
        anteprima: "ordini",
      },
      {
        titolo: "Provvigioni e obiettivi",
        testo: "Provvigioni per periodo secondo il piano provvigionale, quelle da liquidare in evidenza. Obiettivi annuali con l'andamento dell'anno.",
        dettaglio: "Direzione commerciale",
        anteprima: "provvigioni",
      },
      {
        titolo: "Mandati e note spese",
        testo: "Mandati e contratti con zone, prodotti assegnati ed esclusiva, con la scadenza. Le note spese dell'agente, voce per voce.",
        dettaglio: "Fascicolo dell'agente",
        anteprima: "mandati",
      },
    ],
    domande: [
      [
        "Ogni agente vede solo i suoi clienti?",
        "Sì. I permessi sono imposti dal database: l'agente vede il suo portafoglio, non quello dei colleghi. La direzione vede tutto.",
      ],
      [
        "Funziona per agenti esterni con partita IVA?",
        "Sì. La scheda dell'agente tiene partita IVA, iscrizione alla Camera di Commercio, posizione Enasarco e il mandato con zone e prodotti. Il calcolo dei contributi Enasarco non è automatico.",
      ],
      [
        "Gli sconti fuori listino passano da qualcuno?",
        "Sì. Sconti oltre soglia, deroghe commerciali e liquidazione delle provvigioni sono approvazioni: la richiesta parte dall'agente e arriva a chi decide.",
      ],
      [
        "Serve un'app da installare?",
        "No. PMIFlow è un'applicazione web: l'agente la apre dal browser del telefono, senza installare niente.",
      ],
    ],
  },

  poliambulatori: {
    titolo: "Gestionale per poliambulatorio: agenda, pazienti e referti",
    descrizione:
      "Agenda per ambulatorio e professionista, schede pazienti con consensi, prestazioni e convenzioni, referti da validare: il gestionale per studi e poliambulatori.",
    h1: "L'agenda, i pazienti e i referti dello studio, con la riservatezza che serve.",
    sottotitolo:
      "Ogni appuntamento dal prenotato all'eseguito, ogni referto dalla bozza alla validazione. Il contenuto clinico lo vede solo chi ha l'accesso clinico.",
    parolaChiave: "gestionale per poliambulatorio",
    paroleCorrelate: ["software studio medico", "agenda ambulatorio", "gestione referti", "gestionale studio medico GDPR"],
    percorsoDemo: "/agenda-poliambulatorio",
    nomeBreve: "il Poliambulatorio",
    problemi: [
      {
        problema: "L'agenda non sa che la sala o l'ecografo sono già occupati.",
        soluzione: "Ogni appuntamento ha ambulatorio, professionista, prestazione e apparecchiatura, con il suo stato: prenotato, confermato, in sala, eseguito.",
        funzione: "Agenda",
      },
      {
        problema: "I referti restano in bozza e nessuno li firma.",
        soluzione: "Il referto passa da bozza a da validare, validato e inviato; il cruscotto mostra quelli in attesa.",
        funzione: "Referti da validare",
      },
      {
        problema: "Dati sanitari dentro un gestionale qualsiasi.",
        soluzione: "Il contenuto clinico è riservato a chi ha l'accesso clinico, i consensi del paziente sono nella sua scheda, e i dati stanno sul server dedicato allo studio.",
        funzione: "Riservatezza",
      },
    ],
    funzioni: [
      {
        titolo: "Pazienti e convenzioni",
        testo: "La scheda del paziente con anagrafica, contatto di emergenza, consensi, anamnesi e documenti. Pazienti privati o in convenzione.",
        dettaglio: "Contenuto clinico riservato",
        anteprima: "paziente",
      },
      {
        titolo: "Agenda di ambulatori e professionisti",
        testo: "L'agenda per ambulatorio e per professionista, con prestazione e apparecchiatura. Gli stati dicono chi è in sala e chi non si è presentato.",
        dettaglio: "Anche i no show",
        anteprima: "agenda",
      },
      {
        titolo: "Prestazioni e struttura",
        testo: "Il catalogo delle prestazioni, le convenzioni con gli enti, gli ambulatori e le apparecchiature con il loro stato: operativa, in manutenzione, fuori servizio.",
        dettaglio: "Scadenze della struttura",
        anteprima: "struttura",
      },
      {
        titolo: "Referti da validare",
        testo: "Il referto nasce in bozza, passa alla validazione del professionista e poi all'invio. Nulla esce senza firma.",
        dettaglio: "Stati del referto",
        anteprima: "referti",
      },
    ],
    domande: [
      [
        "Chi vede i dati clinici?",
        "Solo chi ha l'accesso clinico. La segreteria gestisce agenda e anagrafiche senza vedere anamnesi, diagnosi e referti.",
      ],
      [
        "Si gestiscono le convenzioni?",
        "Sì. Ogni paziente è privato o in convenzione, e le convenzioni con gli enti stanno nella struttura dello studio.",
      ],
      [
        "Va bene anche per uno studio con un solo medico?",
        "Sì. Agenda, pazienti e referti servono anche a un professionista solo; ambulatori e apparecchiature si aggiungono quando ci sono.",
      ],
      [
        "Dove stanno i dati dei pazienti?",
        "Sul server dedicato allo studio, in un data center in Germania, nell'Unione Europea. Non sono condivisi con altri clienti.",
      ],
    ],
  },

  ristorante: {
    titolo: "Gestionale per ristoranti: sala, comande, cucina e food cost",
    descrizione:
      "Sala a mappa, prenotazioni, comande ai tavoli, cucina per postazioni, ricette con food cost e allergeni, magazzino a lotti e registri HACCP: tutto insieme.",
    h1: "Dalla prenotazione al conto, la serata scorre su un solo schermo.",
    sottotitolo:
      "La sala a mappa mostra chi è seduto e chi sta arrivando. Le comande vanno alla postazione giusta, le ricette calcolano food cost e allergeni, il magazzino scarica i lotti in ordine di scadenza.",
    parolaChiave: "gestionale ristorante",
    paroleCorrelate: ["software per ristoranti", "food cost ristorante", "comande al tavolo", "registro HACCP digitale"],
    percorsoDemo: "/ristorante",
    inDemo: false,
    nomeBreve: "il Ristorante",
    problemi: [
      {
        problema: "Le prenotazioni stanno su un'agenda di carta, e il tavolo da sei è promesso due volte.",
        soluzione: "Ogni prenotazione occupa i suoi tavoli per la durata del turno: lo stesso tavolo non si prenota due volte nella stessa fascia, e la lista d'attesa propone il primo tavolo adatto.",
        funzione: "Sala e prenotazioni",
      },
      {
        problema: "Il food cost si scopre a fine anno, quando è tardi per cambiare il menu.",
        soluzione: "La ricetta conosce dosi e costi di ogni ingrediente, anche dentro i semilavorati: il food cost del piatto si aggiorna quando cambia il prezzo di un ingrediente.",
        funzione: "Ricettario e food cost",
      },
      {
        problema: "Arriva il richiamo di un lotto e nessuno sa in quali piatti è finito.",
        soluzione: "Dal lotto si risale ai piatti che lo usano e alle comande che lo hanno servito: il richiamo diventa un elenco, non una caccia.",
        funzione: "Magazzino e tracciabilità",
      },
    ],
    funzioni: [
      {
        titolo: "Sala, prenotazioni e lista d'attesa",
        testo: "La mappa di sala con i tavoli liberi, prenotati, seduti e al conto. Prenotazioni con persone, occasione e allergie; lista d'attesa con la stima e il primo tavolo che si libera.",
        dettaglio: "Un tavolo, una prenotazione per fascia",
        anteprima: "sala",
      },
      {
        titolo: "Comande e cucina per postazioni",
        testo: "La comanda si prende dal tablet; ogni piatto va alla sua postazione (cucina, pasticceria, bar) e le portate escono in ordine, quando la sala dà il via.",
        dettaglio: "Tempi di preparazione misurati",
        anteprima: "cucina",
      },
      {
        titolo: "Ricettario, magazzino e food cost",
        testo: "Ricette con dosi e semilavorati, allergeni ricavati dagli ingredienti, food cost per piatto e menu engineering. Il magazzino scarica i lotti in ordine di scadenza e propone il riordino.",
        dettaglio: "Allergeni dagli ingredienti",
        anteprima: "ricette",
      },
      {
        titolo: "HACCP, cantina ed eventi",
        testo: "Registri di temperature, sanificazioni e olio di frittura con le soglie e l'azione correttiva. Carta dei vini dalla cantina, eventi e banchetti con il loro preventivo.",
        dettaglio: "Fuori soglia segnalato subito",
        anteprima: "haccp",
      },
    ],
    domande: [
      [
        "Sostituisce il registratore di cassa?",
        "No. PMIFlow tiene i conti dei tavoli, li divide e registra i pagamenti, ma non è un registratore telematico: lo scontrino continua a emetterlo la tua cassa fiscale. Il collegamento con la cassa è predisposto, non attivo.",
      ],
      [
        "Si può dividere il conto fra i commensali?",
        "Sì: in parti uguali oppure spostando le singole voci su conti separati, con pagamenti misti fra contanti, carta e buoni. Il totale torna sempre.",
      ],
      [
        "Gli allergeni sono sempre aggiornati?",
        "Gli allergeni di un piatto si ricavano dagli ingredienti, anche dentro i semilavorati: se cambi un ingrediente, cambia anche il piatto. Il registro degli allergeni è sempre consultabile dalla sala.",
      ],
      [
        "Arrivano anche gli ordini delle piattaforme di consegna?",
        "Asporto e consegna a domicilio sono canali della comanda e si gestiscono da PMIFlow. L'arrivo automatico degli ordini dalle piattaforme di consegna oggi non c'è: è predisposto.",
      ],
      [
        "Ho anche il bar: servono due programmi?",
        "No. Ristorante e Bar usano lo stesso motore: stessi prodotti, stesso magazzino, stessa cassa. Si attiva quello che serve, o entrambi.",
      ],
    ],
  },

  bar: {
    titolo: "Gestionale per bar: banco, happy hour, convenzioni e mescita",
    descrizione:
      "Comande al banco smistate per postazione, prezzi a fascia oraria, convenzioni con le aziende, fedeltà a timbri e controllo della mescita: il gestionale per bar.",
    h1: "Il banco corre veloce. I conti, finalmente, tornano.",
    sottotitolo:
      "Gli ordini vanno alla macchina del caffè o al bancone dei cocktail, l'happy hour cambia i prezzi da solo, le aziende convenzionate pagano a fine periodo e la mescita dice quanto è stato versato davvero.",
    parolaChiave: "gestionale bar",
    paroleCorrelate: ["software per bar", "gestione happy hour", "convenzioni bar aziende", "controllo mescita bar"],
    percorsoDemo: "/bar",
    inDemo: false,
    nomeBreve: "il Bar",
    problemi: [
      {
        problema: "Le bottiglie finiscono prima del previsto, e non si sa dove sia andato il resto.",
        soluzione: "Per ogni bottiglia aperta si confronta il versato teorico, ricavato dalle ricette vendute, con quello reale: le differenze oltre la soglia vengono segnalate.",
        funzione: "Mescita",
      },
      {
        problema: "I dipendenti dell'ufficio di fronte pagano a fine mese, e il conto non torna mai.",
        soluzione: "La convenzione ha il suo listino, i dipendenti autorizzati e un limite di spesa; gli addebiti si accumulano sul conto dell'azienda, che riceve la fattura.",
        funzione: "Convenzioni",
      },
      {
        problema: "L'happy hour si ricorda a memoria, e qualcuno lo applica anche alle nove.",
        soluzione: "La promozione ha giorni e orari: il prezzo cambia da solo dentro la fascia, anche a cavallo della mezzanotte.",
        funzione: "Promozioni a fascia oraria",
      },
    ],
    funzioni: [
      {
        titolo: "Banco e comande per postazione",
        testo: "Ordini dal banco, dai tavolini o da asporto; ogni prodotto va alla sua postazione, il caffè alla macchina e il cocktail al bancone, con i tempi di attesa misurati.",
        dettaglio: "Smistamento automatico",
        anteprima: "banco",
      },
      {
        titolo: "Happy hour e promozioni",
        testo: "Prezzi speciali, prendi tre paghi due e listini per fascia oraria, validi nei giorni e nei periodi che scegli. Il prezzo giusto arriva sulla comanda senza pensarci.",
        dettaglio: "Anche oltre la mezzanotte",
        anteprima: "promozioni",
      },
      {
        titolo: "Convenzioni con le aziende",
        testo: "Listino riservato, dipendenti con la loro tessera, limite giornaliero e mensile. A fine periodo l'azienda riceve una fattura con tutti gli addebiti.",
        dettaglio: "Il limite di spesa blocca l'addebito",
        anteprima: "convenzioni",
      },
      {
        titolo: "Mescita, fedeltà e riordino",
        testo: "Bottiglie aperte con versato teorico e reale, carta fedeltà a timbri (dieci caffè, uno offerto) e proposta di riordino calcolata sulle vendite.",
        dettaglio: "Dieci caffè, uno offerto",
        anteprima: "mescita",
      },
    ],
    domande: [
      [
        "Sostituisce la cassa del bar?",
        "No. PMIFlow tiene i conti e registra i pagamenti, ma lo scontrino continua a emetterlo la tua cassa fiscale. Il collegamento con la cassa è predisposto, non attivo.",
      ],
      [
        "I dipendenti convenzionati devono installare qualcosa?",
        "No. Si riconoscono dal codice della tessera o dal nome. Un dipendente non più autorizzato non può aprire comande convenzionate.",
      ],
      [
        "La carta fedeltà è di cartone?",
        "No: la tessera del cliente sta in PMIFlow. Ogni caffè aggiunge un timbro e, raggiunta la soglia, l'omaggio si applica sul conto.",
      ],
      [
        "Posso disegnare anche il dehor?",
        "Sì: sale e tavoli si disegnano sulla mappa, con il dehor come sala a parte e lo stato di ogni tavolo in tempo reale.",
      ],
      [
        "Ho anche la cucina: servono due programmi?",
        "No. Bar e Ristorante usano lo stesso motore: stessi prodotti, stesso magazzino, stessa cassa. Si attiva quello che serve, o entrambi.",
      ],
    ],
  },

  hotel: {
    titolo: "Gestionale per hotel: planning, prenotazioni e conto camera",
    descrizione:
      "Planning delle camere, prenotazioni con tariffe e trattamenti, check-in con i documenti, conto camera, pulizie e tassa di soggiorno: il gestionale per hotel.",
    h1: "Le camere, gli ospiti e i conti, dal planning al check-out.",
    sottotitolo:
      "Il planning mostra ogni camera giorno per giorno, e una camera non si assegna mai due volte. Il check-in registra gli ospiti, il conto raccoglie notti ed extra, le pulizie nascono da arrivi e partenze.",
    parolaChiave: "gestionale hotel",
    paroleCorrelate: ["software gestionale albergo", "planning camere hotel", "calcolo tassa di soggiorno", "gestionale per B&B"],
    percorsoDemo: "/hotel",
    inDemo: false,
    nomeBreve: "l'Hotel",
    problemi: [
      {
        problema: "Una camera venduta due volte, e lo si scopre all'arrivo dell'ospite.",
        soluzione: "Ogni assegnazione occupa la camera per le sue notti e il database rifiuta la seconda. L'overbooking per tipologia si vede in anticipo, mai in silenzio.",
        funzione: "Planning delle camere",
      },
      {
        problema: "La tassa di soggiorno si calcola a mano, con le esenzioni a memoria.",
        soluzione: "Le regole del comune (importo, notti massime, esenzioni e riduzioni per età) calcolano la tassa ospite per ospite al check-out.",
        funzione: "Tassa di soggiorno",
      },
      {
        problema: "Le pulizie si organizzano a voce, ogni mattina.",
        soluzione: "Partenze e soggiorni generano le pulizie del giorno; chi pulisce segna inizio e fine dal telefono, e la governante verifica.",
        funzione: "Pulizie e governante",
      },
    ],
    funzioni: [
      {
        titolo: "Planning e prenotazioni",
        testo: "Camere per tipologia e giorni in colonna: si trascina una prenotazione per spostarla. Stati dalla richiesta all'opzione, al soggiorno, alla partenza, con i gruppi e i loro blocchi di camere.",
        dettaglio: "Una camera, un ospite per notte",
        anteprima: "planning",
      },
      {
        titolo: "Tariffe, trattamenti e intermediari",
        testo: "Piani tariffari per stagione e giorno della settimana, soggiorno minimo, non rimborsabile e prenota prima; trattamenti dalla colazione alla mezza pensione; agenzie e portali con la loro commissione.",
        dettaglio: "Prezzo calcolato notte per notte",
        anteprima: "tariffe",
      },
      {
        titolo: "Check-in, conto camera e pulizie",
        testo: "Ospiti con il documento, conto camera con notti, extra e minibar, check-out con la tassa di soggiorno. Il file per la Questura e i movimenti per l'ISTAT si generano dagli ospiti registrati.",
        dettaglio: "File Alloggiati pronto da caricare",
        anteprima: "conto",
      },
      {
        titolo: "Indicatori e revenue",
        testo: "Occupazione, prezzo medio, ricavo per camera disponibile, durata media, cancellazioni, ritmo delle prenotazioni e costo dei portali. Suggerimenti di prezzo dalle regole, mai cambi automatici.",
        dettaglio: "Suggerimenti, non automatismi",
        anteprima: "indicatori",
      },
    ],
    domande: [
      [
        "Si collega ai portali di prenotazione?",
        "Oggi no. Disponibilità, prezzi e restrizioni sono pronti per un channel manager, ma il collegamento con i portali non è attivo: le loro prenotazioni si inseriscono indicando il canale e la commissione.",
      ],
      [
        "Prepara i dati per la Questura e per l'ISTAT?",
        "Sì: il file degli alloggiati e i movimenti per l'ISTAT si generano dagli ospiti registrati, e si caricano a mano sui portali ufficiali.",
      ],
      [
        "Gestisce più strutture?",
        "Sì: ogni struttura ha camere, tariffe e impostazioni proprie, e il cruscotto si sceglie struttura per struttura.",
      ],
      [
        "Il ristorante dell'hotel può addebitare in camera?",
        "Sì, se usi anche il modulo Ristorante o Bar: la consumazione va sul conto della camera e si salda al check-out.",
      ],
      [
        "Le tariffe cambiano da sole?",
        "No. Il programma suggerisce aumenti o sconti in base all'occupazione e all'anticipo della prenotazione, ma il prezzo lo decidi tu.",
      ],
    ],
  },

  palestra: {
    titolo: "Gestionale per palestre: soci, abbonamenti, ingressi e corsi",
    descrizione:
      "Soci e abbonamenti con rinnovi e rate, ingressi verificati in reception, corsi con prenotazioni e lista d'attesa, personal trainer: il gestionale per palestre.",
    h1: "Ogni socio in regola, ogni corso pieno, ogni rata al suo posto.",
    sottotitolo:
      "In reception l'ingresso dice subito sì o no, con il motivo. Gli abbonamenti si rinnovano e generano le rate, i corsi si prenotano con la lista d'attesa che scorre da sola, i trainer vedono le schede dei loro soci.",
    parolaChiave: "gestionale palestra",
    paroleCorrelate: ["software per palestre", "gestione abbonamenti palestra", "prenotazione corsi palestra", "controllo accessi palestra"],
    percorsoDemo: "/palestra",
    inDemo: false,
    nomeBreve: "la Palestra",
    problemi: [
      {
        problema: "Chi ha l'abbonamento scaduto entra lo stesso, perché nessuno lo controlla.",
        soluzione: "La verifica dell'ingresso guarda abbonamento, accessi residui, fascia oraria, certificato medico, sospensioni e rate insolute, e risponde con il motivo.",
        funzione: "Ingressi in reception",
      },
      {
        problema: "Il corso delle 19 è sempre pieno, e chi rinuncia non avvisa.",
        soluzione: "La prenotazione ha un posto o un numero in lista d'attesa: chi disdice libera il posto al primo in lista, chi non si presenta riceve la penalità che decidi tu.",
        funzione: "Corsi e prenotazioni",
      },
      {
        problema: "Le rate si inseguono con un foglio di calcolo.",
        soluzione: "Rate e scadenze nascono con l'abbonamento, i rinnovi generano le rate nuove e l'insoluto blocca l'ingresso dopo la tolleranza che hai scelto.",
        funzione: "Abbonamenti e rate",
      },
    ],
    funzioni: [
      {
        titolo: "Soci, abbonamenti e rinnovi",
        testo: "Formule mensili, trimestrali, annuali, a fasce orarie o a ingressi, carnet e pacchetti; sospensioni che spostano la scadenza; convenzioni aziendali con la quota a carico dell'azienda.",
        dettaglio: "La sospensione proroga la fine",
        anteprima: "soci",
      },
      {
        titolo: "Ingressi verificati in reception",
        testo: "Tessera, badge o QR del socio: la verifica risponde sì o no con il motivo e registra l'ingresso. Il cruscotto mostra chi è in sala, i certificati in scadenza e i soci morosi.",
        dettaglio: "Il motivo di ogni no",
        anteprima: "reception",
      },
      {
        titolo: "Corsi, prenotazioni e lista d'attesa",
        testo: "Calendario dei corsi per sala e istruttore, capienza rispettata anche sull'ultimo posto conteso, lista d'attesa che scorre, regole per le disdette tardive e per chi non si presenta.",
        dettaglio: "Mai due persone sull'ultimo posto",
        anteprima: "corsi",
      },
      {
        titolo: "Personal training e schede",
        testo: "Agenda dei trainer, sessioni a pacchetto, schede di allenamento con le versioni, misurazioni e valutazioni. I dati sulla salute li vedono solo il trainer del socio e la direzione, con il consenso.",
        dettaglio: "Dati sulla salute riservati",
        anteprima: "trainer",
      },
    ],
    domande: [
      [
        "I tornelli si aprono da soli?",
        "La verifica dell'ingresso è pronta per tornelli, lettori di badge e app del socio, ma il collegamento con l'hardware non è attivo: oggi l'ingresso si registra dalla reception, con la tessera, il QR o il nome.",
      ],
      [
        "Le rate si addebitano in automatico?",
        "Le rate hanno metodo di pagamento e tentativi di incasso, ma l'addebito ricorrente online è predisposto, non collegato: oggi le rate si incassano in reception o con bonifico.",
      ],
      [
        "Gestisce le prove e le visite di chi vuole iscriversi?",
        "Sì: ogni contatto segue la linea di vendita dal primo interesse all'iscrizione. Prove e visite si prenotano e, con l'iscrizione, la trattativa si chiude vinta.",
      ],
      [
        "E i dati sanitari dei soci?",
        "Misure, valutazioni e progressi sono dati sulla salute: li vedono solo il trainer assegnato e la direzione, e solo con il consenso del socio. La biometria non si usa.",
      ],
      [
        "Va bene per più sedi?",
        "Sì: ogni sede ha sale, corsi e regole proprie, dalla tolleranza degli insoluti alle penalità per chi non si presenta.",
      ],
    ],
  },

  fioraio: {
    titolo: "Gestionale per fioristi: ordini, consegne e composizioni",
    descrizione:
      "Ordini con committente, destinatario e biglietto, laboratorio, consegne per zona, fiori deperibili, ricorrenze e cerimonie: il gestionale per fioristi.",
    h1: "Dal biglietto alla consegna, ogni mazzo arriva a chi deve arrivare.",
    sottotitolo:
      "L'ordine tiene distinti chi ordina, chi paga e chi riceve. La composizione passa dal laboratorio e scarica i fiori dal magazzino, la consegna si organizza per zona, e la ricorrenza del cliente torna l'anno dopo.",
    parolaChiave: "gestionale fiorista",
    paroleCorrelate: ["software per fioristi", "gestione ordini fioreria", "consegna fiori a domicilio", "magazzino fiori deperibili"],
    percorsoDemo: "/fioraio",
    inDemo: false,
    nomeBreve: "il Fioraio",
    problemi: [
      {
        problema: "Il biglietto finisce sul mazzo sbagliato, o con la firma sbagliata.",
        soluzione: "Committente, destinatario e mittente del biglietto restano distinti nell'ordine, e il biglietto viaggia con l'ordine fino alla consegna.",
        funzione: "Ordini e biglietti",
      },
      {
        problema: "Le rose arrivate lunedì sono da buttare venerdì, e nessuno l'ha visto arrivare.",
        soluzione: "Ogni lotto di fiori ha la sua vita commerciale: il cruscotto avvisa due giorni prima della fine, e lo scarto si registra con il motivo.",
        funzione: "Fiori deperibili",
      },
      {
        problema: "La festa della mamma torna ogni anno, i clienti pure, ma nessuno li richiama.",
        soluzione: "Le ricorrenze dei clienti (compleanni, anniversari, onomastici) entrano nel profilo dall'ordine, e qualche giorno prima arriva il promemoria.",
        funzione: "Ricorrenze dei clienti",
      },
    ],
    funzioni: [
      {
        titolo: "Ordini, biglietti e consegne",
        testo: "Ordini dal banco, dal telefono o dai messaggi, con stati da ricevuto a consegnato. Consegne per zona e fascia oraria, con chi ha ricevuto e l'esito; il costo della consegna viene dalla zona.",
        dettaglio: "La zona si ricava dal CAP",
        anteprima: "ordini",
      },
      {
        titolo: "Composizioni e laboratorio",
        testo: "Composizioni a catalogo con la loro distinta di fiori e materiali, su misura con la stima di materiali e manodopera. Alla conferma dell'ordine nasce la commessa di laboratorio.",
        dettaglio: "Costo e prezzo dalla distinta",
        anteprima: "laboratorio",
      },
      {
        titolo: "Fiori deperibili e magazzino",
        testo: "Lotti con data di arrivo e fine vita, scarico dei materiali quando la composizione è pronta, sprechi con il motivo, scorte minime e proposta di riordino.",
        dettaglio: "Avviso a due giorni dalla fine",
        anteprima: "magazzino",
      },
      {
        titolo: "Ricorrenze, abbonamenti e cerimonie",
        testo: "Ricorrenze dei clienti con il promemoria, abbonamenti floreali per uffici e hotel che generano gli ordini da soli, matrimoni e funerali con gli allestimenti.",
        dettaglio: "L'ordine periodico nasce da solo",
        anteprima: "ricorrenze",
      },
    ],
    domande: [
      [
        "Prende gli ordini dal sito o dai marketplace?",
        "Oggi no: gli ordini online si inseriscono indicando il canale. Il collegamento con e-commerce e marketplace floreali è predisposto, non attivo.",
      ],
      [
        "Chi consegna vede il giro dal telefono?",
        "Sì: le consegne del giorno hanno una pagina pensata per il telefono, con indirizzo, fascia, chi riceve e l'esito. Il percorso ottimizzato è predisposto.",
      ],
      [
        "Posso seguire un matrimonio dall'inizio alla fine?",
        "Sì: l'evento ha cliente, location, invitati e budget, e l'allestimento floreale elenca bouquet, centrotavola e addobbi con consegna, montaggio e smontaggio.",
      ],
      [
        "Gli abbonamenti per gli uffici si rinnovano da soli?",
        "L'abbonamento genera l'ordine qualche giorno prima di ogni consegna (settimanale, quindicinale o mensile), già confermato e con la consegna in agenda.",
      ],
      [
        "Va bene anche senza consegne a domicilio?",
        "Sì: ritiro in negozio e vendita al banco sono modalità dell'ordine, e il conto si chiude in cassa.",
      ],
    ],
  },

  garage: {
    titolo: "Gestionale per autorimesse: posti, soste, abbonati e chiavi",
    descrizione:
      "Mappa dei posti, uscite con la tariffa calcolata, abbonamenti con le rate, prenotazioni, chiavi in custodia, danni e ricariche: il gestionale per autorimesse.",
    h1: "Ogni posto, ogni targa, ogni chiave: l'autorimessa sotto controllo.",
    sottotitolo:
      "La mappa mostra i posti liberi, occupati e riservati. All'uscita la tariffa si calcola da sola, con frazioni, notte e tetto giornaliero; gli abbonati entrano senza ticket e ogni chiave in custodia ha un nome.",
    parolaChiave: "gestionale autorimessa",
    paroleCorrelate: ["software per parcheggi", "gestione garage", "abbonamenti posto auto", "tariffe sosta parcheggio"],
    percorsoDemo: "/garage",
    inDemo: false,
    nomeBreve: "il Garage",
    problemi: [
      {
        problema: "La tariffa notturna si calcola a mente, e ogni cassiere fa a modo suo.",
        soluzione: "Il tariffario ha franchigia, frazioni, prezzo notturno, festivi e tetto giornaliero per tipo di veicolo: all'uscita l'importo si calcola sempre allo stesso modo.",
        funzione: "Tariffe e soste",
      },
      {
        problema: "Il posto riservato è occupato da un'altra auto.",
        soluzione: "Abbonamenti e prenotazioni occupano il loro posto per il periodo, e il database rifiuta la seconda assegnazione.",
        funzione: "Abbonamenti e prenotazioni",
      },
      {
        problema: "Le chiavi in custodia passano di mano senza lasciare traccia.",
        soluzione: "Ogni chiave ha il suo armadietto e ogni passaggio di mano è registrato: chi l'ha presa, quando e perché.",
        funzione: "Chiavi in custodia",
      },
    ],
    funzioni: [
      {
        titolo: "Mappa dei posti e soste",
        testo: "Piani, corsie e posti con lo stato in tempo reale; ingresso per targa o ticket, uscita con l'importo calcolato e il conto di cassa. Il cruscotto conta posti liberi, ingressi e incassi del giorno.",
        dettaglio: "Tariffa calcolata all'uscita",
        anteprima: "mappa",
      },
      {
        titolo: "Abbonamenti, rate e convenzioni",
        testo: "Contratti mensili e annuali con il posto, il canone e le rate; autorizzazioni per fascia oraria; convenzioni con le aziende, con i posti acquistati e la fattura del consuntivo.",
        dettaglio: "Fuori fascia, accesso negato",
        anteprima: "abbonamenti",
      },
      {
        titolo: "Prenotazioni e chiavi in custodia",
        testo: "Prenotazioni con il posto, l'anticipo e l'importo previsto; chiavi con l'armadietto e i movimenti, sempre con il nome di chi le ha in mano.",
        dettaglio: "Ogni passaggio di mano registrato",
        anteprima: "chiavi",
      },
      {
        titolo: "Danni, ricariche e servizi",
        testo: "Danni e contestazioni con foto, responsabilità e stato; colonnine con le ricariche calcolate sull'energia erogata; lavaggi, deposito gomme e altri servizi sul conto del cliente.",
        dettaglio: "Ricarica sull'energia erogata",
        anteprima: "servizi",
      },
    ],
    domande: [
      [
        "Legge le targhe in automatico?",
        "Oggi no. L'ingresso registra la targa a mano o dal ticket; lettori di targhe, tessere, telecomandi e app sono predisposti, non collegati.",
      ],
      [
        "E la videosorveglianza?",
        "Le immagini restano nel tuo impianto. Un danno o una contestazione può riportare il riferimento al filmato, nient'altro, per rispetto della privacy.",
      ],
      [
        "Gestisce le aziende con più posti?",
        "Sì: la convenzione ha i posti acquistati, la tariffa riservata e i dipendenti autorizzati; a fine periodo si emette la fattura del consuntivo.",
      ],
      [
        "Le rate degli abbonati si seguono da sole?",
        "Il contratto genera le rate del periodo; quelle scadute compaiono fra le cose da sistemare, e l'incasso si registra in cassa.",
      ],
      [
        "Va bene anche per un parcheggio all'aperto?",
        "Sì: la struttura può essere un'autorimessa, un parcheggio coperto o scoperto, un silos o un insieme di box.",
      ],
    ],
  },

  immobiliare: {
    titolo: "Gestionale agenzie immobiliari: immobili, clienti e visite",
    descrizione:
      "Fascicolo dell'immobile, incarichi, richieste con il matching, visite, proposte fino al rogito, provvigioni e antiriciclaggio: il gestionale per l'agenzia.",
    h1: "Ogni immobile con il suo fascicolo, ogni cliente con la casa giusta.",
    sottotitolo:
      "L'immobile raccoglie proprietari, documenti, incarico e storia del prezzo. Le richieste dei clienti trovano gli immobili compatibili con un punteggio, e visite e proposte portano la trattativa fino al rogito e alla provvigione.",
    parolaChiave: "gestionale agenzia immobiliare",
    paroleCorrelate: ["software per agenzie immobiliari", "CRM immobiliare", "incrocio domanda offerta immobili", "gestione incarichi immobiliari"],
    percorsoDemo: "/immobiliare",
    inDemo: false,
    nomeBreve: "l'Agenzia",
    problemi: [
      {
        problema: "Il cliente giusto per quell'immobile c'era, ma stava in un foglio di calcolo.",
        soluzione: "Ogni richiesta (zona, budget, camere, requisiti) si confronta con il portafoglio: gli immobili compatibili arrivano con un punteggio e i motivi, e la selezione si invia al cliente.",
        funzione: "Richieste e matching",
      },
      {
        problema: "L'incarico scade, e ce ne si accorge quando il proprietario chiama un'altra agenzia.",
        soluzione: "Incarichi, proposte e documenti hanno la loro scadenza, e arrivano nei promemoria in tempo per rinnovare.",
        funzione: "Incarichi e scadenze",
      },
      {
        problema: "Al rogito manca l'adeguata verifica dell'acquirente.",
        soluzione: "Il rogito non si registra senza la verifica antiriciclaggio dell'acquirente: identificazione, titolare effettivo, profilo di rischio e conservazione per dieci anni.",
        funzione: "Antiriciclaggio",
      },
    ],
    funzioni: [
      {
        titolo: "Immobili, proprietari e incarichi",
        testo: "Scheda con caratteristiche, classe energetica, prezzo al metro e storico dei ribassi; proprietari con le quote; documenti da raccogliere; incarico con esclusiva, durata e prezzo minimo; stima sui comparabili.",
        dettaglio: "Documenti mancanti in evidenza",
        anteprima: "fascicolo",
      },
      {
        titolo: "Richieste e matching",
        testo: "Richieste di acquirenti e inquilini, lead dai portali e dal sito assegnati all'agente, incrocio con il portafoglio con un punteggio su cento e selezione inviata al cliente.",
        dettaglio: "Punteggio con i motivi",
        anteprima: "matching",
      },
      {
        titolo: "Visite, proposte e rogito",
        testo: "Visite con conferma ed esito, un agente mai in due visite insieme; proposte e controproposte con lo storico; preliminare e rogito; locazioni con l'adeguamento ISTAT del canone.",
        dettaglio: "Lo storico della trattativa",
        anteprima: "trattativa",
      },
      {
        titolo: "Provvigioni, report e antiriciclaggio",
        testo: "Provvigioni dei due lati con la ripartizione fra agenti e collaboratori e la fattura; report al proprietario; contratti da modello approvati dalla direzione; antiriciclaggio e privacy.",
        dettaglio: "La ripartizione torna sempre",
        anteprima: "provvigioni",
      },
    ],
    domande: [
      [
        "Pubblica gli annunci sui portali?",
        "Gli annunci si preparano in PMIFlow e si esportano in un file per i portali; la pubblicazione automatica sui singoli portali non è attiva.",
      ],
      [
        "Ogni agente vede le provvigioni degli altri?",
        "No. Ogni agente vede le proprie, la direzione vede tutto. I permessi stanno nel database, non solo nelle schermate.",
      ],
      [
        "Gestisce anche gli affitti?",
        "Sì: immobili in locazione, contratti con il canone e il suo adeguamento ISTAT, provvigione calcolata in mensilità.",
      ],
      [
        "Il proprietario riceve aggiornamenti?",
        "Sì: il report al proprietario riassume visite, esiti, ribassi e giorni sul mercato, e si invia per email.",
      ],
      [
        "Posso lavorare con altre agenzie e segnalatori?",
        "Sì: collaboratori, segnalatori e agenzie partner hanno la loro quota nella ripartizione della provvigione.",
      ],
    ],
  },
};
