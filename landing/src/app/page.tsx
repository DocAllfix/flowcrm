import { Intestazione } from "@/componenti/Intestazione";
import { Eroe } from "@/componenti/Eroe";
import { Prove } from "@/componenti/Prove";
import { Funzioni } from "@/componenti/Funzioni";
import { Anteprima } from "@/componenti/Anteprima";
import { Moduli } from "@/componenti/Moduli";
import { ComeSiParte } from "@/componenti/ComeSiParte";
import { Domande } from "@/componenti/Domande";
import { ChiamataFinale, Piede } from "@/componenti/Chiusura";
import { DOMANDE } from "@/contenuti/domande";
import { FUNZIONI } from "@/contenuti/funzioni";
import { MODULI } from "@/contenuti/moduli";
import { PROMESSA } from "@/contenuti/promessa";
import { NOME, URL_CANONICO, jsonLd } from "@/lib/sito";

/**
 * I dati strutturati si DERIVANO dai contenuti in pagina, non si ricopiano.
 * `SoftwareApplication` è senza `offers`: niente prezzi, nemmeno per i motori.
 * Niente `aggregateRating` né `review` finché non esistono recensioni vere.
 */
const DATI = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${URL_CANONICO}/#sito`,
    name: NOME,
    url: URL_CANONICO,
    inLanguage: "it-IT",
    publisher: { "@id": `${URL_CANONICO}/#organizzazione` },
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: NOME,
    url: URL_CANONICO,
    description: PROMESSA.descrizione,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "CRM",
    operatingSystem: "Web",
    inLanguage: "it-IT",
    featureList: [...FUNZIONI.map((f) => f.titolo), ...MODULI.map((m) => `Modulo ${m.nome}`)],
    publisher: { "@id": `${URL_CANONICO}/#organizzazione` },
  },
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: DOMANDE.map(([q, a]) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  },
];

export default function Pagina() {
  return (
    <>
      {DATI.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(d) }} />
      ))}
      <Intestazione />
      <main id="contenuto">
        <Eroe />
        <Prove />
        <Funzioni />
        <Anteprima />
        <Moduli />
        <ComeSiParte />
        <Domande />
        <ChiamataFinale />
      </main>
      <Piede />
    </>
  );
}
