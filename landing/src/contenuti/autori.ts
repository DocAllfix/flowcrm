/**
 * Gli autori del blog. Oggi uno solo: tutti gli articoli, anche quelli preparati
 * dall'agente di redazione, escono firmati da Alessandro Di Lonardo (decisione del
 * titolare, 29/09/2026). Per questo ogni articolo automatico passa 48 ore in una PR
 * prima di uscire, con una mail che lo avvisa: è la sua finestra di revisione.
 *
 * ⚠️ La biografia la scrive e la corregge il titolare: qui solo fatti verificabili.
 */
export type Autore = {
  id: string;
  nome: string;
  ruolo: string;
  bio: string;
};

export const AUTORI: Record<string, Autore> = {
  alessandro: {
    id: "alessandro",
    nome: "Alessandro Di Lonardo",
    ruolo: "Fondatore di PMIFlow",
    bio: "Ha fondato PMIFlow per dare alle piccole imprese italiane un gestionale su misura del loro lavoro: clienti, commesse, scadenze e fatture in un solo posto, su un server dedicato. Scrive di organizzazione del lavoro, di gestione dei dati e dei settori per cui PMIFlow ha un modulo.",
  },
};
