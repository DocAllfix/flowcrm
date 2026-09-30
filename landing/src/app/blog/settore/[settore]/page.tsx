import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Filtri, Righe, Testata } from "@/componenti/blog/Elenco";
import { ChiamataFinale, Piede } from "@/componenti/Chiusura";
import { Intestazione } from "@/componenti/Intestazione";
import { MODULI } from "@/contenuti/moduli";
import { articoli, articoliDelSettore } from "@/lib/blog";
import { NOMI_SETTORI, SETTORI_BLOG, type SettoreBlog } from "@/lib/blog-schema";
import { NOME, URL_CANONICO } from "@/lib/sito";

/** Una pagina per settore, solo se il settore ha almeno un articolo. */
export const dynamicParams = false;

export function generateStaticParams() {
  const presenti = new Set(articoli().map((a) => a.intestazione.settore));
  return SETTORI_BLOG.filter((s) => presenti.has(s)).map((settore) => ({ settore }));
}

const valido = (s: string): s is SettoreBlog => (SETTORI_BLOG as readonly string[]).includes(s);

export async function generateMetadata({ params }: { params: Promise<{ settore: string }> }): Promise<Metadata> {
  const { settore } = await params;
  if (!valido(settore)) return {};
  const nome = NOMI_SETTORI[settore];
  const titolo = `${nome}: articoli e metodi dal blog di PMIFlow`;
  const descrizione = `Gli articoli del blog di PMIFlow su ${nome.toLowerCase()}: metodi pratici, scadenze, errori da evitare ed esempi presi dal lavoro delle piccole imprese italiane.`;
  return {
    title: { absolute: titolo },
    description: descrizione,
    alternates: { canonical: `/blog/settore/${settore}` },
    openGraph: { type: "website", url: `${URL_CANONICO}/blog/settore/${settore}`, title: titolo, description: descrizione, locale: "it_IT", siteName: NOME },
  };
}

export default async function PaginaSettoreBlog({ params }: { params: Promise<{ settore: string }> }) {
  const { settore } = await params;
  if (!valido(settore)) notFound();
  const lista = articoliDelSettore(settore);
  const presenti = [...new Set(articoli().map((a) => a.intestazione.settore))];
  const modulo = MODULI.find((m) => m.id === settore);
  return (
    <>
      <Intestazione />
      <main id="contenuto">
        <Testata
          briciole={[["Home", "/"], ["Blog", "/blog"], [NOMI_SETTORI[settore]]]}
          occhiello="Blog"
          titolo={NOMI_SETTORI[settore]}
          testo={
            modulo
              ? `Articoli per chi lavora in questo settore. ${modulo.perChi} Il modulo di PMIFlow dedicato ha una pagina sua.`
              : "Articoli sulla gestione di tutti i giorni: clienti, vendite, commesse, fatture e scadenze."
          }
        />
        <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20">
          <div className="mb-10">
            <Filtri attivo={settore} presenti={presenti} />
          </div>
          <Righe articoli={lista} />
          {modulo && (
            <p className="mt-10">
              <a href={`/moduli/${modulo.id}`} className="collegamento-cta">
                Il modulo {modulo.nome} di PMIFlow
              </a>
            </p>
          )}
        </section>
        <ChiamataFinale />
      </main>
      <Piede />
    </>
  );
}
