/**
 * I testi delle pagine di settore (`/moduli/[slug]`), uno per modulo di `moduli.ts`.
 *
 * ⚠️ Ogni affermazione è verificata sul codice del modulo (schede in
 * `flowcrm/src/modules/<slug>/dettaglio`, stati in `stati.ts`, tabelle nelle
 * migrazioni) il 29/09/2026. Cose che il prodotto NON fa, e che quindi non si scrivono:
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
export type IdSettore = "gare" | "cantiere" | "automezzi" | "agenti" | "poliambulatori";

export type PaginaSettore = {
  titolo: string;
  descrizione: string;
  h1: string;
  sottotitolo: string;
  parolaChiave: string;
  paroleCorrelate: string[];
  /** Voce del menu della demo da aprire con `?vai=` (vedi flowcrm/src/lib/destinazioneDemo.ts). */
  percorsoDemo: string;
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
};
