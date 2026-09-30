import type { Metadata } from "next";
import { ChiamataFinale, Piede } from "@/componenti/Chiusura";
import { Intestazione } from "@/componenti/Intestazione";
import { Moduli } from "@/componenti/Moduli";
import { MODULI } from "@/contenuti/moduli";
import { NOME, URL_CANONICO, jsonLd } from "@/lib/sito";

const TITOLO = "Moduli di settore: cantiere, gare, automezzi, agenti, sanità";
const DESCRIZIONE =
  "Il nucleo di PMIFlow è uguale per tutti; i moduli di settore aggiungono cantieri, gare d'appalto, parco mezzi, rete agenti e poliambulatori, sugli stessi dati.";

export const metadata: Metadata = {
  title: { absolute: TITOLO },
  description: DESCRIZIONE,
  alternates: { canonical: "/moduli" },
  openGraph: { type: "website", url: `${URL_CANONICO}/moduli`, title: TITOLO, description: DESCRIZIONE, locale: "it_IT", siteName: NOME },
};

/** L'indice dei moduli: la struttura nucleo più moduli della home, con le schede che portano alle pagine. */
export default function PaginaModuli() {
  const dati = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      url: `${URL_CANONICO}/moduli`,
      name: TITOLO,
      description: DESCRIZIONE,
      inLanguage: "it-IT",
      isPartOf: { "@id": `${URL_CANONICO}/#sito` },
      hasPart: MODULI.map((m) => ({ "@type": "WebPage", name: m.nome, url: `${URL_CANONICO}/moduli/${m.id}` })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${URL_CANONICO}/` },
        { "@type": "ListItem", position: 2, name: "Moduli", item: `${URL_CANONICO}/moduli` },
      ],
    },
  ];
  return (
    <>
      {dati.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(d) }} />
      ))}
      <Intestazione />
      <main id="contenuto">
        <section aria-labelledby="titolo-pagina-moduli" className="relative isolate overflow-hidden border-b border-filo">
          <div aria-hidden="true" className="trama-punti absolute inset-0 -z-10" />
          <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-8 sm:px-6 md:pb-20 md:pt-10">
            <nav aria-label="Percorso" className="text-[0.8125rem] text-tenue">
              <ol className="flex items-center gap-x-2">
                <li>
                  <a href="/" className="hover:text-inchiostro">Home</a>
                </li>
                <li aria-hidden="true">›</li>
                <li aria-current="page" className="font-semibold text-inchiostro">Moduli</li>
              </ol>
            </nav>
            <p className="occhiello mt-10">Moduli di settore</p>
            <h1 id="titolo-pagina-moduli" className="titolo-display mt-6 max-w-3xl lg:text-[clamp(2.25rem,1rem+2.4vw,3.125rem)]">
              Un nucleo per tutti, un modulo per il tuo mestiere.
            </h1>
            <p className="prosa mt-6 max-w-[40rem] text-[1.0625rem] text-tenue md:text-[1.125rem]">
              Clienti, vendite, lavoro e amministrazione ci sono sempre. Sopra si aggiungono solo i moduli che servono alla
              tua azienda: scegli il tuo settore per vedere cosa fa, scheda per scheda.
            </p>
          </div>
        </section>
        <Moduli />
        <ChiamataFinale />
      </main>
      <Piede />
    </>
  );
}
