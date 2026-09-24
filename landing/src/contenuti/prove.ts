/**
 * Prima del primo cliente non si mostrano loghi, testimonianze o stelle: sarebbero
 * inventati. Qui ci sono solo fatti che si possono verificare sul prodotto.
 * Quando un cliente pilota autorizza per iscritto una testimonianza, entra qui.
 */
export const PROVE = [
  {
    titolo: "Un server per ogni azienda.",
    testo:
      "Nessun condominio di dati: la tua istanza gira su una macchina dedicata, con un database che contiene solo i tuoi clienti.",
  },
  {
    titolo: "I dati restano in Europa.",
    testo:
      "Server in Germania, database e file compresi, sotto il GDPR. Dove sta ogni dato è scritto nella pagina sulla sicurezza, fornitore per fornitore.",
  },
  {
    titolo: "Il backup si prova, non si spera.",
    testo:
      "Copia ogni notte verso un secondo luogo. Una volta al mese la copia viene ripristinata davvero e contata riga per riga.",
  },
  {
    titolo: "I permessi li decide il database.",
    testo:
      "Chi vede cosa è scritto nelle regole del database, non nei menu. 241 controlli automatici lo verificano a ogni aggiornamento.",
  },
] as const;
