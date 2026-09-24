/**
 * Le funzioni del nucleo, con le parole che il titolare usa già. Ogni voce ha un
 * dettaglio concreto: senza, sei righe di funzioni si leggono come sei righe di
 * qualunque CRM. Da qui si deriva anche `featureList` del JSON-LD.
 */
export const FUNZIONI = [
  {
    titolo: "Anagrafiche con la storia dentro",
    testo:
      "Aziende e contatti con la loro linea del tempo: chiamate, riunioni, offerte, fatture. Chi apre la scheda sa tutto senza chiedere a nessuno.",
    dettaglio: "Importazione da file CSV",
  },
  {
    titolo: "Trattative che si vedono",
    testo:
      "Pipeline a colonne, configurabili per ogni linea di vendita. Si trascina una trattativa e il valore pesato di ogni fase si ricalcola da solo.",
    dettaglio: "Più pipeline, fasi a scelta",
  },
  {
    titolo: "Commesse e progetti",
    testo:
      "La trattativa vinta diventa commessa con un clic, senza ricopiare niente. Stato, budget, documenti e storico sulla stessa pagina.",
    dettaglio: "Allegati e storico delle modifiche",
  },
  {
    titolo: "Fatture, incassi, scadenze",
    testo:
      "Chi deve pagare, entro quando, e cosa è già entrato. Le scadenze fiscali arrivano con un promemoria, prima che diventino urgenze.",
    dettaglio: "Promemoria automatici",
  },
  {
    titolo: "Ognuno vede il suo",
    testo:
      "Titolare, segreteria, agente, professionista sanitario: ogni ruolo vede solo ciò che gli spetta. L'agente dal telefono vede i suoi clienti, non quelli del collega.",
    dettaglio: "Permessi imposti dal database",
  },
  {
    titolo: "Il tuo nome in alto a sinistra",
    testo:
      "Logo, colori e indirizzo sono i tuoi: la tua squadra lavora su nomeazienda.pmiflow.it, non su un prodotto che porta il nome di qualcun altro.",
    dettaglio: "Marchio e sottodominio propri",
  },
] as const;
