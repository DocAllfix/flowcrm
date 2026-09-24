/**
 * La promessa, detta una volta sola. La leggono l'`h1`, il `<title>`, l'anteprima
 * Open Graph e `llms.txt`: se cambia qui, cambia ovunque. Un'anteprima social che
 * racconta una cosa diversa dalla pagina è il difetto che nessuno vede, perché chi la
 * guarda non è chi la controlla.
 *
 * ⚠️ NIENTE PREZZI, in nessun testo del sito. Decisione del committente, 24/09/2026.
 * `scripts/verifica-seo.mjs` fallisce se trova una cifra in euro nell'HTML generato.
 */
export const PROMESSA = {
  occhiello: "CRM e gestione per le piccole imprese italiane",
  titolo: ["Clienti, commesse e fatture.", "In un posto solo, tuo."] as const,
  sottotitolo:
    "Dalla prima telefonata all'ultimo incasso: anagrafiche, trattative, commesse, SAL, scadenze fiscali e provvigioni in un unico strumento. Ogni azienda ha il suo server, i suoi dati, il suo marchio.",
  descrizione:
    "CRM e gestionale per piccole imprese italiane: clienti, trattative, commesse, fatture e scadenze in un solo strumento, su un server dedicato in Unione Europea.",
};
