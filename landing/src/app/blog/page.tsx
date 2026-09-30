import type { Metadata } from "next";
import { Filtri, InEvidenza, Righe, Testata } from "@/componenti/blog/Elenco";
import { ChiamataFinale, Piede } from "@/componenti/Chiusura";
import { Intestazione } from "@/componenti/Intestazione";
import { articoli } from "@/lib/blog";
import { NOME, URL_CANONICO, jsonLd } from "@/lib/sito";

const TITOLO = "Blog di PMIFlow: metodi per chi guida una piccola impresa";
const DESCRIZIONE =
  "Cantieri, gare d'appalto, parco mezzi, agenti, studi medici e gestione d'impresa: articoli pratici per le piccole imprese italiane, da chi fa PMIFlow.";

/** Senza articoli la pagina esiste ma non si indicizza: un blog vuoto non va nei risultati. */
export function generateMetadata(): Metadata {
  const vuoto = articoli().length === 0;
  return {
    title: { absolute: TITOLO },
    description: DESCRIZIONE,
    alternates: { canonical: "/blog", types: { "application/rss+xml": `${URL_CANONICO}/blog/feed.xml` } },
    openGraph: { type: "website", url: `${URL_CANONICO}/blog`, title: TITOLO, description: DESCRIZIONE, locale: "it_IT", siteName: NOME },
    ...(vuoto ? { robots: { index: false, follow: true } } : {}),
  };
}

export default function PaginaBlog() {
  const tutti = articoli();
  const [primo, ...resto] = tutti;
  const presenti = [...new Set(tutti.map((a) => a.intestazione.settore))];
  const dati = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${URL_CANONICO}/blog#blog`,
    url: `${URL_CANONICO}/blog`,
    name: TITOLO,
    description: DESCRIZIONE,
    inLanguage: "it-IT",
    publisher: { "@id": `${URL_CANONICO}/#organizzazione` },
    blogPost: tutti.slice(0, 20).map((a) => ({
      "@type": "BlogPosting",
      headline: a.intestazione.titolo,
      url: `${URL_CANONICO}/blog/${a.slug}`,
      datePublished: a.intestazione.data,
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(dati) }} />
      <Intestazione />
      <main id="contenuto">
        <Testata
          briciole={[["Home", "/"], ["Blog"]]}
          occhiello="Blog"
          titolo="Metodi e strumenti per chi manda avanti una piccola impresa."
          testo="Articoli pratici sui settori per cui PMIFlow ha un modulo e sulla gestione di tutti i giorni: scadenze, commesse, clienti, dati. Niente teoria, esempi presi dal lavoro vero."
        />
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          {primo ? (
            <>
              {presenti.length > 1 && (
                <div className="mb-10">
                  <Filtri presenti={presenti} />
                </div>
              )}
              <InEvidenza a={primo} />
              {resto.length > 0 && (
                <div className="mt-16">
                  <h2 className="mb-6 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-tenue">Tutti gli articoli</h2>
                  <Righe articoli={resto} />
                </div>
              )}
              <p className="mt-10 text-[0.875rem] text-tenue">
                <a href="/blog/feed.xml" className="underline decoration-filo underline-offset-4 hover:decoration-inchiostro">
                  Segui il blog con il feed RSS
                </a>
              </p>
            </>
          ) : (
            <p className="prosa text-tenue">I primi articoli arrivano a breve.</p>
          )}
        </section>
        <ChiamataFinale />
      </main>
      <Piede />
    </>
  );
}
