import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Righe, Testata } from "@/componenti/blog/Elenco";
import { ChiamataFinale, Piede } from "@/componenti/Chiusura";
import { Intestazione } from "@/componenti/Intestazione";
import { AUTORI } from "@/contenuti/autori";
import { articoli } from "@/lib/blog";
import { NOME, URL_CANONICO, jsonLd } from "@/lib/sito";

/**
 * La pagina dell'autore: chi scrive, cosa fa, cosa ha scritto. È il segnale di
 * esperienza e affidabilità (E-E-A-T) che collega gli articoli a una persona vera.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return Object.keys(AUTORI).map((autore) => ({ autore }));
}

export async function generateMetadata({ params }: { params: Promise<{ autore: string }> }): Promise<Metadata> {
  const { autore } = await params;
  const a = AUTORI[autore];
  if (!a) return {};
  const titolo = `${a.nome}, ${a.ruolo.toLowerCase()}`;
  return {
    title: titolo,
    description: a.bio.slice(0, 158),
    alternates: { canonical: `/blog/autori/${autore}` },
    openGraph: { type: "profile", url: `${URL_CANONICO}/blog/autori/${autore}`, title: titolo, description: a.bio.slice(0, 158), locale: "it_IT", siteName: NOME },
    ...(articoli().some((x) => x.intestazione.autore === autore) ? {} : { robots: { index: false, follow: true } }),
  };
}

export default async function PaginaAutore({ params }: { params: Promise<{ autore: string }> }) {
  const { autore } = await params;
  const a = AUTORI[autore];
  if (!a) notFound();
  const suoi = articoli().filter((x) => x.intestazione.autore === autore);
  const dati = {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    url: `${URL_CANONICO}/blog/autori/${autore}`,
    mainEntity: {
      "@type": "Person",
      name: a.nome,
      jobTitle: a.ruolo,
      description: a.bio,
      worksFor: { "@id": `${URL_CANONICO}/#organizzazione` },
    },
  };
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(dati) }} />
      <Intestazione />
      <main id="contenuto">
        <Testata briciole={[["Home", "/"], ["Blog", "/blog"], [a.nome]]} occhiello={a.ruolo} titolo={a.nome} testo={a.bio} />
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          {suoi.length ? (
            <>
              <h2 className="mb-6 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-tenue">Articoli</h2>
              <Righe articoli={suoi} />
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
