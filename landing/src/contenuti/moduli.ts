/**
 * Il NUCLEO (in ogni istanza) e i cinque moduli verticali che ci si agganciano, con le
 * parole di chi li usa.
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

export const MODULI: {
  id: string;
  nome: string;
  perChi: string;
  testo: string;
  aggiunge: string[];
  aggancia: Gruppo[];
  ponte: string;
}[] = [
  {
    id: "gare",
    nome: "Gare d'appalto",
    perChi: "Per chi partecipa a bandi pubblici.",
    testo: "Bandi con CIG, offerte a colonne dalla lettura all'aggiudicazione, cauzioni con la loro scadenza.",
    aggiunge: ["Requisiti e chiarimenti", "Offerta economica e valutazione", "Cauzioni con la scadenza", "Esiti per ente e territorio"],
    aggancia: ["clienti", "lavoro"],
    ponte: "L'ente appaltante è un'azienda dell'anagrafica; la gara aggiudicata porta al suo cantiere.",
  },
  {
    id: "cantiere",
    nome: "Cantiere",
    perChi: "Per imprese edili e impiantisti.",
    testo: "Cantieri con SAL, costi, subappaltatori e DURC. La scadenza di un documento si vede prima che fermi i lavori.",
    aggiunge: ["Cronoprogramma e rapportini", "SAL e contabilità", "Imprese, DURC e personale", "Sicurezza, qualità e ambiente"],
    aggancia: ["clienti", "lavoro", "amministrazione"],
    ponte: "Il cantiere nasce da una commessa; ogni SAL diventa una fattura del registro.",
  },
  {
    id: "automezzi",
    nome: "Automezzi",
    perChi: "Per chi ha un parco mezzi.",
    testo: "Assicurazione, bollo, revisione e manutenzioni di ogni mezzo, con carburante e costi in un cruscotto.",
    aggiunge: ["Assicurazione, bollo e revisione", "Manutenzioni e pneumatici", "Rifornimenti e costo al km", "Sinistri e multe"],
    aggancia: ["lavoro", "amministrazione"],
    ponte: "I mezzi si assegnano al personale e ai cantieri; i costi finiscono nei cruscotti.",
  },
  {
    id: "agenti",
    nome: "Agenti",
    perChi: "Per chi vende con una rete commerciale.",
    testo: "Portafoglio, visite, offerte e provvigioni per ogni agente, dal telefono. La direzione vede l'insieme.",
    aggiunge: ["Portafoglio e visite", "Offerte e ordini dal telefono", "Provvigioni e obiettivi", "Mandati e note spese"],
    aggancia: ["clienti", "vendite", "amministrazione"],
    ponte: "I clienti dell'agente sono quelli dell'anagrafica; le provvigioni partono dalle fatture.",
  },
  {
    id: "poliambulatori",
    nome: "Poliambulatori",
    perChi: "Per studi e strutture sanitarie.",
    testo: "Pazienti, agenda delle visite, prestazioni e referti da validare, con la riservatezza dei dati sanitari.",
    aggiunge: ["Pazienti e convenzioni", "Agenda di ambulatori e professionisti", "Prestazioni", "Referti da validare"],
    aggancia: ["lavoro", "amministrazione"],
    ponte: "Agenda e personale sono quelli dello studio; i dati sanitari hanno permessi a parte.",
  },
];
