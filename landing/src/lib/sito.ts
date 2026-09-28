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
export const URL_DEMO = process.env.NEXT_PUBLIC_URL_DEMO ?? "https://demo.pmiflow.eu/demo";

/**
 * Il pulsante della demo si mostra solo quando la demo si apre con un clic.
 * Oggi la demo chiede credenziali che il visitatore non ha: un pulsante che promette
 * e poi sbatte contro un login è peggio di nessun pulsante (lezione di gdprhub,
 * 24/09/2026).
 */
export const DEMO_ATTIVA = process.env.NEXT_PUBLIC_DEMO_ATTIVA === "1";

/**
 * Titolare del trattamento: una PERSONA FISICA (decisione del committente, 28/09/2026).
 * L'art. 13 GDPR vuole identità e recapito del titolare AL MOMENTO della raccolta:
 * senza il nome il modulo non si accende, anche se l'interruttore dice di sì.
 */
export const TITOLARE = process.env.NEXT_PUBLIC_TITOLARE ?? "";

/** Casella che riceve le richieste di sito e demo, e recapito del titolare. */
export const EMAIL_CONTATTI = process.env.NEXT_PUBLIC_EMAIL_CONTATTI ?? "contatti@pmiflow.eu";

/**
 * Il modulo contatti si mostra solo se c'è chi riceve e c'è un titolare da nominare.
 * Letto al BUILD: la pagina resta statica. Un modulo che dice «inviato» senza che niente
 * parta è peggio di nessun modulo.
 */
export const CONTATTI_ATTIVI = process.env.NEXT_PUBLIC_CONTATTI_ATTIVI === "1" && TITOLARE !== "";

/**
 * Dati dell'impresa (DITTA INDIVIDUALE del titolare) per il piede, la pagina Termini e
 * `Organization`. Obbligatori su un sito commerciale italiano:
 *  - art. 7 d.lgs. 70/2003: nome, domicilio o sede, recapiti (email compresa), REA, P. IVA;
 *  - art. 35 DPR 633/1972: partita IVA nella home page;
 *  - art. 2199 c.c.: la ditta (il nome dell'impresa) deve contenere il cognome del titolare.
 * Codice fiscale facoltativo (lo stampiamo se c'è); PEC NON obbligatoria, e non la
 * pubblichiamo: sarebbe solo un bersaglio per lo spam (indicazione del committente, 28/09/2026).
 *
 * Tutto da variabili d'ambiente di Vercel: nel repository non entra nessun dato personale.
 * Finché mancano, il piede non inventa niente e `verifica-seo.mjs` lo segnala.
 */
export const IMPRESA = {
  /** La ditta. Per una ditta individuale, di norma nome e cognome del titolare. */
  ragioneSociale: process.env.NEXT_PUBLIC_RAGIONE_SOCIALE || TITOLARE,
  partitaIva: process.env.NEXT_PUBLIC_PARTITA_IVA ?? "",
  codiceFiscale: process.env.NEXT_PUBLIC_CODICE_FISCALE ?? "",
  /** Numero REA con la sigla della provincia, es. «RM-1234567». */
  rea: process.env.NEXT_PUBLIC_REA ?? "",
  /** Domicilio o sede legale, indirizzo completo in una riga. */
  sede: process.env.NEXT_PUBLIC_SEDE ?? "",
  telefono: process.env.NEXT_PUBLIC_TELEFONO ?? "",
  email: process.env.NEXT_PUBLIC_EMAIL_CONTATTO || EMAIL_CONTATTI,
};

/** Le voci legali in ordine di stampa, senza quelle che mancano. */
export function datiImpresa(): [string, string][] {
  const v: [string, string | false][] = [
    ["Titolare", IMPRESA.ragioneSociale],
    ["Sede", IMPRESA.sede],
    ["P. IVA", IMPRESA.partitaIva],
    ["C.F.", IMPRESA.codiceFiscale],
    ["REA", IMPRESA.rea],
    ["Tel.", IMPRESA.telefono],
  ];
  return v.filter((x): x is [string, string] => Boolean(x[1]));
}

/** `tel:` vuole solo cifre e il più iniziale. */
export const hrefTelefono = (t: string) => `tel:${t.replace(/[^\d+]/g, "")}`;

/** Data vera dell'ultima revisione dei testi legali: la stessa stampata in pagina. */
export const LEGALI_AGGIORNATI_AL = "2026-09-28";

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
