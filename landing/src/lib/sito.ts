/**
 * Le costanti del sito, in un posto solo.
 *
 * `URL_CANONICO` è lo stesso in produzione e in anteprima: le anteprime di Vercel
 * escono già con `noindex`, e un canonical che punta al deploy di turno insegnerebbe
 * ai motori un indirizzo che fra un'ora non esiste più. Evalisdeck ha già pagato
 * l'errore opposto: l'URL `vercel.app` rimasto nel JSON-LD.
 */
export const URL_CANONICO = "https://pmiflow.eu";
export const NOME = "PMIFlow";

/** Dove porta «Prova la demo». `flowcrm-orcin.vercel.app` resta attivo come alias. */
export const URL_DEMO = process.env.NEXT_PUBLIC_URL_DEMO ?? "https://demo.pmiflow.eu";

/**
 * Il pulsante della demo si mostra solo quando la demo si apre con un clic.
 * Oggi la demo chiede credenziali che il visitatore non ha: un pulsante che promette
 * e poi sbatte contro un login è peggio di nessun pulsante (lezione di gdprhub,
 * 24/09/2026).
 */
export const DEMO_ATTIVA = process.env.NEXT_PUBLIC_DEMO_ATTIVA === "1";

/**
 * Il modulo contatti si mostra solo se c'è chi riceve. Letto al BUILD: la pagina resta
 * statica. Un modulo che dice «inviato» senza che niente parta è peggio di nessun modulo.
 */
export const CONTATTI_ATTIVI = process.env.NEXT_PUBLIC_CONTATTI_ATTIVI === "1";

/**
 * Dati dell'impresa per il piede e per `Organization`. Obbligatori per legge su un sito
 * commerciale italiano (art. 2250 c.c., art. 7 d.lgs. 70/2003). Finché mancano, il piede
 * non inventa niente e `verifica-seo.mjs` lo segnala.
 */
export const IMPRESA = {
  ragioneSociale: process.env.NEXT_PUBLIC_RAGIONE_SOCIALE ?? "",
  partitaIva: process.env.NEXT_PUBLIC_PARTITA_IVA ?? "",
  sede: process.env.NEXT_PUBLIC_SEDE ?? "",
  email: process.env.NEXT_PUBLIC_EMAIL_CONTATTO ?? "",
};

/** Data vera dell'ultima revisione dei testi legali: la stessa stampata in pagina. */
export const LEGALI_AGGIORNATI_AL = "2026-09-24";

/**
 * JSON dentro `<script type="application/ld+json">`. Si neutralizzano `<` e `>` perché
 * una stringa con `</script>` chiuderebbe il tag in anticipo. Stesso trattamento di
 * `evalisdeck/src/features/blog/seo.ts`.
 */
export function jsonLd(dato: unknown): string {
  return JSON.stringify(dato)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
