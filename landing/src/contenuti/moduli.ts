/**
 * Il NUCLEO (in ogni istanza) e i dodici moduli verticali che ci si agganciano, con le
 * parole di chi li usa, raggruppati per famiglia come nel selettore dell'applicazione
 * (`flowcrm/src/config/moduli.config.ts`, campo `famiglia`).
 *
 * ⚠️ Tutto viene dal prodotto, non dal marketing: le voci del nucleo sono i menu di
 * `flowcrm/src/config/nav.config.ts`; ciò che ogni modulo «aggiunge» sono le schede
 * del suo dettaglio (`flowcrm/src/modules/<modulo>/dettaglio`); gli agganci sono le
 * chiavi esterne delle sue tabelle (cantieri → commesse e gare, SAL → fatture, visite
 * degli agenti → organizzazioni e fatture, automezzi → cantieri). Non si promette niente
 * che il prodotto non faccia già.
 */
export type Gruppo = "clienti" | "vendite" | "lavoro" | "amministrazione";

export const NUCLEO: { id: Gruppo; nome: string; voci: string[] }[] = [
  { id: "clienti", nome: "Clienti", voci: ["Aziende e contatti", "La storia di ogni cliente", "Importazione da CSV"] },
  { id: "vendite", nome: "Vendite", voci: ["Trattative a colonne", "Offerte e valore pesato", "Più linee di vendita"] },
  { id: "lavoro", nome: "Lavoro", voci: ["Attività e calendario", "Riunioni", "Progetti e commesse", "Canale del team"] },
  { id: "amministrazione", nome: "Amministrazione", voci: ["Registro fatture", "Incassi previsti", "Scadenze fiscali", "Personale"] },
];

/** Sotto tutto, in ogni istanza: la base su cui poggiano nucleo e moduli. */
export const BASE_NUCLEO = ["Ruoli e permessi", "Cruscotti", "Il tuo marchio"];

/** Le famiglie, nell'ordine in cui si mostrano. Stessi nomi dell'applicazione. */
export const FAMIGLIE = ["Edilizia e appalti", "Ospitalità e ristorazione", "Servizi e commercio", "Sanità"] as const;
export type Famiglia = (typeof FAMIGLIE)[number];

export const MODULI: {
  id: string;
  nome: string;
  famiglia: Famiglia;
  perChi: string;
  testo: string;
  aggiunge: string[];
  aggancia: Gruppo[];
  ponte: string;
}[] = [
  {
    id: "gare",
    famiglia: "Edilizia e appalti",
    nome: "Gare d'appalto",
    perChi: "Per chi partecipa a bandi pubblici.",
    testo: "Bandi con CIG, offerte a colonne dalla lettura all'aggiudicazione, cauzioni con la loro scadenza.",
    aggiunge: ["Requisiti e chiarimenti", "Offerta economica e valutazione", "Cauzioni con la scadenza", "Esiti per ente e territorio"],
    aggancia: ["clienti", "lavoro"],
    ponte: "L'ente appaltante è un'azienda dell'anagrafica; la gara aggiudicata porta al suo cantiere.",
  },
  {
    id: "cantiere",
    famiglia: "Edilizia e appalti",
    nome: "Cantiere",
    perChi: "Per imprese edili e impiantisti.",
    testo: "Cantieri con SAL, costi, subappaltatori e DURC. La scadenza di un documento si vede prima che fermi i lavori.",
    aggiunge: ["Cronoprogramma e rapportini", "SAL e contabilità", "Imprese, DURC e personale", "Sicurezza, qualità e ambiente"],
    aggancia: ["clienti", "lavoro", "amministrazione"],
    ponte: "Il cantiere nasce da una commessa; ogni SAL diventa una fattura del registro.",
  },
  {
    id: "automezzi",
    famiglia: "Edilizia e appalti",
    nome: "Automezzi",
    perChi: "Per chi ha un parco mezzi.",
    testo: "Assicurazione, bollo, revisione e manutenzioni di ogni mezzo, con carburante e costi in un cruscotto.",
    aggiunge: ["Assicurazione, bollo e revisione", "Manutenzioni e pneumatici", "Rifornimenti e costo al km", "Sinistri e multe"],
    aggancia: ["lavoro", "amministrazione"],
    ponte: "I mezzi si assegnano al personale e ai cantieri; i costi finiscono nei cruscotti.",
  },
  {
    id: "agenti",
    famiglia: "Servizi e commercio",
    nome: "Agenti",
    perChi: "Per chi vende con una rete commerciale.",
    testo: "Portafoglio, visite, offerte e provvigioni per ogni agente, dal telefono. La direzione vede l'insieme.",
    aggiunge: ["Portafoglio e visite", "Offerte e ordini dal telefono", "Provvigioni e obiettivi", "Mandati e note spese"],
    aggancia: ["clienti", "vendite", "amministrazione"],
    ponte: "I clienti dell'agente sono quelli dell'anagrafica; le provvigioni partono dalle fatture.",
  },
  {
    id: "poliambulatori",
    famiglia: "Sanità",
    nome: "Poliambulatori",
    perChi: "Per studi e strutture sanitarie.",
    testo: "Pazienti, agenda delle visite, prestazioni e referti da validare, con la riservatezza dei dati sanitari.",
    aggiunge: ["Pazienti e convenzioni", "Agenda di ambulatori e professionisti", "Prestazioni", "Referti da validare"],
    aggancia: ["lavoro", "amministrazione"],
    ponte: "Agenda e personale sono quelli dello studio; i dati sanitari hanno permessi a parte.",
  },
  {
    id: "ristorante",
    nome: "Ristorante",
    famiglia: "Ospitalità e ristorazione",
    perChi: "Per ristoranti, trattorie e pizzerie.",
    testo: "Sala a mappa, prenotazioni, comande ai tavoli, cucina per postazioni, ricette con il food cost e registri HACCP.",
    aggiunge: ["Sala, prenotazioni e lista d'attesa", "Comande e cucina per postazioni", "Ricettario, magazzino e food cost", "HACCP, cantina ed eventi"],
    aggancia: ["clienti", "lavoro", "amministrazione"],
    ponte: "I clienti abituali sono contatti dell'anagrafica; il conto chiuso può diventare una fattura del registro.",
  },
  {
    id: "bar",
    nome: "Bar",
    famiglia: "Ospitalità e ristorazione",
    perChi: "Per bar, caffetterie e locali serali.",
    testo: "Banco in tempo reale, comande smistate fra banco e macchina del caffè, happy hour, convenzioni con le aziende e mescita sotto controllo.",
    aggiunge: ["Banco e comande per postazione", "Happy hour a fascia oraria", "Convenzioni con le aziende vicine", "Mescita, fedeltà e riordino"],
    aggancia: ["clienti", "amministrazione"],
    ponte: "Le aziende convenzionate sono quelle dell'anagrafica, e a fine periodo ricevono la loro fattura.",
  },
  {
    id: "hotel",
    nome: "Hotel",
    famiglia: "Ospitalità e ristorazione",
    perChi: "Per hotel, B&B e strutture ricettive.",
    testo: "Planning delle camere, prenotazioni con tariffe e trattamenti, check-in e conto camera, pulizie, tassa di soggiorno e indicatori di revenue.",
    aggiunge: ["Planning e prenotazioni", "Tariffe, trattamenti e intermediari", "Check-in, conto camera e pulizie", "Tassa di soggiorno e indicatori"],
    aggancia: ["clienti", "lavoro", "amministrazione"],
    ponte: "Ospiti e aziende sono contatti dell'anagrafica; i conti del soggiorno diventano una fattura del registro.",
  },
  {
    id: "palestra",
    nome: "Palestra",
    famiglia: "Servizi e commercio",
    perChi: "Per palestre, centri fitness e studi sportivi.",
    testo: "Soci e abbonamenti, ingressi verificati in reception, corsi con prenotazioni e lista d'attesa, personal trainer e rinnovi.",
    aggiunge: ["Soci, abbonamenti e rinnovi", "Ingressi verificati in reception", "Corsi, prenotazioni e lista d'attesa", "Personal training e schede"],
    aggancia: ["clienti", "vendite", "amministrazione"],
    ponte: "Chi chiede informazioni segue una linea di vendita del nucleo, dalla prova all'iscrizione.",
  },
  {
    id: "fioraio",
    nome: "Fioraio",
    famiglia: "Servizi e commercio",
    perChi: "Per fioristi e negozi di fiori.",
    testo: "Ordini con chi ordina, chi paga e chi riceve, laboratorio delle composizioni, consegne del giorno, fiori deperibili e ricorrenze dei clienti.",
    aggiunge: ["Ordini, biglietti e consegne", "Composizioni e laboratorio", "Fiori deperibili e magazzino", "Ricorrenze, abbonamenti e cerimonie"],
    aggancia: ["clienti", "lavoro", "amministrazione"],
    ponte: "Chi ordina è un contatto dell'anagrafica, e le sue ricorrenze tornano come promemoria.",
  },
  {
    id: "garage",
    nome: "Garage e autorimesse",
    famiglia: "Servizi e commercio",
    perChi: "Per autorimesse e parcheggi custoditi.",
    testo: "Mappa dei posti, ingressi e uscite con la tariffa calcolata, abbonamenti, prenotazioni, chiavi in custodia, danni e colonnine di ricarica.",
    aggiunge: ["Mappa dei posti e soste", "Abbonamenti, rate e convenzioni", "Prenotazioni e chiavi in custodia", "Danni, ricariche e servizi"],
    aggancia: ["clienti", "amministrazione"],
    ponte: "I clienti dell'autorimessa sono quelli dell'anagrafica; le convenzioni aziendali si fatturano dal registro.",
  },
  {
    id: "immobiliare",
    nome: "Agenzia immobiliare",
    famiglia: "Servizi e commercio",
    perChi: "Per agenzie immobiliari e agenti indipendenti.",
    testo: "Fascicolo dell'immobile, incarichi, richieste dei clienti con il matching, visite, proposte fino al rogito e provvigioni.",
    aggiunge: ["Immobili, proprietari e incarichi", "Richieste e matching", "Visite, proposte e rogito", "Provvigioni, locazioni e antiriciclaggio"],
    aggancia: ["clienti", "vendite", "lavoro", "amministrazione"],
    ponte: "Acquisizioni e trattative sono due linee di vendita del nucleo; la provvigione diventa una fattura del registro.",
  },
];
