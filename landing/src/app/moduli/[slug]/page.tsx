import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MODULI } from "@/contenuti/moduli";
import { PAGINE_SETTORE, type IdSettore } from "@/contenuti/settori";
import { PaginaSettore } from "@/componenti/settori/PaginaSettore";
import { NOME, URL_CANONICO, jsonLd } from "@/lib/sito";

/** Solo i cinque moduli: un indirizzo inventato è un 404, non una pagina vuota. */
export const dynamicParams = false;

export function generateStaticParams() {
  return MODULI.map((m) => ({ slug: m.id }));
}

function pagina(slug: string) {
  const m = MODULI.find((x) => x.id === slug);
  return m ? { m, p: PAGINE_SETTORE[m.id as IdSettore] } : null;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const x = pagina(slug);
  if (!x) return {};
  const url = `${URL_CANONICO}/moduli/${slug}`;
  return {
    // Titolo intero, senza « · PMIFlow»: il nome del sito Google lo mostra già sopra il
    // risultato, e i 60 caratteri servono alle parole del settore.
    title: { absolute: x.p.titolo },
    description: x.p.descrizione,
    alternates: { canonical: `/moduli/${slug}` },
    openGraph: { type: "website", url, title: x.p.titolo, description: x.p.descrizione, locale: "it_IT", siteName: NOME },
    twitter: { card: "summary_large_image", title: x.p.titolo, description: x.p.descrizione },
  };
}

export default async function Pagina({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const x = pagina(slug);
  if (!x) notFound();
  const { m, p } = x;
  const url = `${URL_CANONICO}/moduli/${slug}`;

  // Niente `offers`: niente prezzi, nemmeno per i motori (come in home).
  const dati = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${url}#pagina`,
      url,
      name: p.titolo,
      description: p.descrizione,
      inLanguage: "it-IT",
      isPartOf: { "@id": `${URL_CANONICO}/#sito` },
      about: {
        "@type": "SoftwareApplication",
        name: `${NOME} · modulo ${m.nome}`,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        featureList: p.funzioni.map((f) => f.titolo),
        isPartOf: { "@type": "SoftwareApplication", name: NOME, url: URL_CANONICO },
        publisher: { "@id": `${URL_CANONICO}/#organizzazione` },
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${URL_CANONICO}/` },
        { "@type": "ListItem", position: 2, name: "Moduli", item: `${URL_CANONICO}/moduli` },
        { "@type": "ListItem", position: 3, name: m.nome, item: url },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: p.domande.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];

  return (
    <>
      {dati.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(d) }} />
      ))}
      <PaginaSettore id={m.id as IdSettore} />
    </>
  );
}
