/**
 * I cinque moduli verticali, con le parole di chi li usa. I termini (SAL, CIG, DURC,
 * cauzioni, provvigioni, referti) vengono dal codice dei moduli in `flowcrm/src/modules`:
 * non si promette niente che il prodotto non faccia già.
 */
export const MODULI = [
  {
    nome: "Gare d'appalto",
    perChi: "Per chi partecipa a bandi pubblici.",
    testo: "Bandi con CIG, offerte a colonne dalla lettura all'aggiudicazione, cauzioni con la loro scadenza.",
  },
  {
    nome: "Cantiere",
    perChi: "Per imprese edili e impiantisti.",
    testo: "Cantieri con SAL, costi, subappaltatori e DURC. La scadenza di un documento si vede prima che fermi i lavori.",
  },
  {
    nome: "Automezzi",
    perChi: "Per chi ha un parco mezzi.",
    testo: "Assicurazione, bollo, revisione e manutenzioni di ogni mezzo, con carburante e costi in un cruscotto.",
  },
  {
    nome: "Agenti",
    perChi: "Per chi vende con una rete commerciale.",
    testo: "Portafoglio, visite, offerte e provvigioni per ogni agente, dal telefono. La direzione vede l'insieme.",
  },
  {
    nome: "Poliambulatori",
    perChi: "Per studi e strutture sanitarie.",
    testo: "Pazienti, agenda delle visite, prestazioni e referti da validare, con la riservatezza dei dati sanitari.",
  },
] as const;
