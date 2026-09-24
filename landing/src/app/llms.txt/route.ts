import { PROMESSA } from "@/contenuti/promessa";
import { FUNZIONI } from "@/contenuti/funzioni";
import { MODULI } from "@/contenuti/moduli";
import { URL_CANONICO } from "@/lib/sito";

export const dynamic = "force-static";

/**
 * `llms.txt`: cosa è PMIFlow, detto agli assistenti. Si DERIVA dai contenuti della
 * pagina, così non racconta una cosa diversa. Nessun prezzo, come in pagina.
 */
export function GET() {
  const testo = [
    "# PMIFlow",
    "",
    `> ${PROMESSA.descrizione}`,
    "",
    "PMIFlow è un CRM e gestionale per micro e piccole imprese italiane (1-15 utenti). Ogni azienda ha la propria istanza su un server dedicato in Germania, con il proprio sottodominio e il proprio marchio. Non è un servizio multi-tenant.",
    "",
    "## Funzioni del nucleo",
    ...FUNZIONI.map((f) => `- ${f.titolo}: ${f.testo}`),
    "",
    "## Moduli di settore",
    ...MODULI.map((m) => `- ${m.nome}. ${m.perChi} ${m.testo}`),
    "",
    "## Pagine",
    `- [Presentazione](${URL_CANONICO}/): funzioni, moduli, come si parte, domande frequenti`,
    `- [Sicurezza e dati](${URL_CANONICO}/sicurezza): dove stanno i dati, permessi, backup, sub-responsabili`,
    "",
    "## Prezzi",
    "Il costo dipende dal numero di utenti e dai moduli, e si definisce dopo una presentazione. Non esiste un listino pubblico.",
    "",
  ].join("\n");
  return new Response(testo, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
