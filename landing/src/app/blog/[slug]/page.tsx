import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Meta, Righe } from "@/componenti/blog/Elenco";
import { ChiamataFinale, Piede } from "@/componenti/Chiusura";
import { Intestazione } from "@/componenti/Intestazione";
import { AUTORI } from "@/contenuti/autori";
import { MODULI } from "@/contenuti/moduli";
import { articoli, articolo, correlati, dataLeggibile } from "@/lib/blog";
import { NOMI_SETTORI } from "@/lib/blog-schema";
import { DEMO_ATTIVA, NOME, URL_CANONICO, URL_DEMO, jsonLd } from "@/lib/sito";

/** Solo gli articoli pubblicati: un indirizzo inventato, o di un articolo non ancora uscito, è un 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return articoli().map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = articolo(slug);
  if (!a) return {};
  const i = a.intestazione;
  const url = `${URL_CANONICO}/blog/${slug}`;
  const autore = AUTORI[i.autore]!;
  return {
    title: { absolute: i.titolo },
    description: i.descrizione,
    alternates: { canonical: `/blog/${slug}` },
    authors: [{ name: autore.nome, url: `${URL_CANONICO}/blog/autori/${autore.id}` }],
    openGraph: {
      type: "article",
      url,
      title: i.titolo,
      description: i.descrizione,
      locale: "it_IT",
      siteName: NOME,
      publishedTime: i.data,
      modifiedTime: i.aggiornato ?? i.data,
      authors: [autore.nome],
      section: NOMI_SETTORI[i.settore],
      ...(i.immagine ? { images: [{ url: i.immagine }] } : {}),
    },
    twitter: { card: "summary_large_image", title: i.titolo, description: i.descrizione },
  };
}

/** Il riquadro a metà articolo: porta alla pagina del modulo del settore (o all'indice dei moduli). */
function RiquadroModulo({ settore }: { settore: string }) {
  const m = MODULI.find((x) => x.id === settore);
  return (
    <aside aria-label="Il modulo di PMIFlow per questo argomento" className="my-12 rounded-lg bg-notte p-6 text-carta sm:p-8">
      <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-cotto-notte">{m ? `Modulo ${m.nome}` : "PMIFlow"}</p>
      <p className="mt-3 text-[1.25rem] font-bold leading-snug [font-stretch:104%]">
        {m ? m.testo : "Clienti, commesse, fatture e scadenze in un solo strumento, su un server dedicato alla tua azienda."}
      </p>
      <p className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 text-[0.9375rem] font-semibold">
        <a href={m ? `/moduli/${m.id}` : "/moduli"} className="underline decoration-cotto-notte decoration-2 underline-offset-[6px] hover:decoration-carta">
          {m ? `Scopri il modulo ${m.nome}` : "Scopri i moduli"}
        </a>
        {DEMO_ATTIVA && (
          <a href={URL_DEMO} className="text-tenue-notte underline decoration-filo-notte underline-offset-[6px] hover:text-carta">
            Prova la demo
          </a>
        )}
      </p>
    </aside>
  );
}

export default async function PaginaArticolo({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = articolo(slug);
  if (!a) notFound();
  const i = a.intestazione;
  const autore = AUTORI[i.autore]!;
  const url = `${URL_CANONICO}/blog/${slug}`;
  const altri = correlati(a);

  const dati = [
    {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "@id": `${url}#articolo`,
      headline: i.titolo,
      description: i.descrizione,
      datePublished: i.data,
      dateModified: i.aggiornato ?? i.data,
      inLanguage: "it-IT",
      mainEntityOfPage: url,
      url,
      image: i.immagine ? `${URL_CANONICO}${i.immagine}` : `${url}/opengraph-image`,
      wordCount: a.parole,
      articleSection: NOMI_SETTORI[i.settore],
      keywords: i.parolaChiave,
      author: { "@type": "Person", name: autore.nome, url: `${URL_CANONICO}/blog/autori/${autore.id}`, jobTitle: autore.ruolo },
      publisher: { "@id": `${URL_CANONICO}/#organizzazione` },
      isPartOf: { "@id": `${URL_CANONICO}/blog#blog` },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${URL_CANONICO}/` },
        { "@type": "ListItem", position: 2, name: "Blog", item: `${URL_CANONICO}/blog` },
        { "@type": "ListItem", position: 3, name: i.titolo, item: url },
      ],
    },
  ];

  return (
    <>
      {dati.map((d, n) => (
        <script key={n} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(d) }} />
      ))}
      <Intestazione />
      <main id="contenuto">
        <article>
          <header className="border-b border-filo">
            <div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-8 sm:px-6 md:pb-16 md:pt-10">
              <nav aria-label="Percorso" className="text-[0.8125rem] text-tenue">
                <ol className="flex flex-wrap items-center gap-x-2">
                  <li>
                    <a href="/" className="hover:text-inchiostro">Home</a>
                  </li>
                  <li aria-hidden="true">›</li>
                  <li>
                    <a href="/blog" className="hover:text-inchiostro">Blog</a>
                  </li>
                  <li aria-hidden="true">›</li>
                  <li>
                    <a href={`/blog/settore/${i.settore}`} className="hover:text-inchiostro">{NOMI_SETTORI[i.settore]}</a>
                  </li>
                </ol>
              </nav>
              <div className="mt-10 max-w-[48rem]">
                <p className="occhiello">{NOMI_SETTORI[i.settore]}</p>
                <h1 className="titolo-sezione mt-6 text-[clamp(2rem,1.3rem+2.2vw,3rem)]">{i.titolo}</h1>
                <p className="prosa mt-6 text-[1.125rem] text-tenue md:text-[1.25rem]">{i.descrizione}</p>
                <div className="mt-8 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <a href={`/blog/autori/${autore.id}`} className="text-[0.9375rem] font-semibold hover:underline">
                    {autore.nome}
                  </a>
                  <Meta a={a} senzaAutore />
                  {i.aggiornato && i.aggiornato !== i.data && (
                    <p className="text-[0.8125rem] text-tenue">
                      · aggiornato il <time dateTime={i.aggiornato}>{dataLeggibile(i.aggiornato)}</time>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </header>

          <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-14 sm:px-6 md:py-20 lg:grid-cols-[minmax(0,1fr)_15rem] lg:gap-16">
            <div className="min-w-0">
              <div className="articolo" dangerouslySetInnerHTML={{ __html: a.htmlPrima }} />
              <div className="max-w-[68ch]">
                <RiquadroModulo settore={i.settore} />
              </div>
              {a.htmlDopo && <div className="articolo" dangerouslySetInnerHTML={{ __html: a.htmlDopo }} />}

              {/* chi scrive: nome, ruolo, due righe, e la sua pagina */}
              <div className="mt-16 max-w-[68ch] border-t border-filo pt-8">
                <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-tenue">Scritto da</p>
                <p className="mt-3 text-[1.0625rem] font-bold">
                  <a href={`/blog/autori/${autore.id}`} className="hover:underline">{autore.nome}</a>
                  <span className="font-normal text-tenue"> · {autore.ruolo}</span>
                </p>
                <p className="prosa mt-2 text-[0.9375rem] text-tenue">{autore.bio}</p>
              </div>
            </div>

            {a.indice.length > 2 && (
              <nav aria-label="In questo articolo" className="indice-articolo hidden lg:block">
                <div className="sticky top-8">
                  <p className="mb-3 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-tenue">In questo articolo</p>
                  <ol>
                    {a.indice.map((v) => (
                      <li key={v.id}>
                        <a href={`#${v.id}`}>{v.testo}</a>
                      </li>
                    ))}
                  </ol>
                </div>
              </nav>
            )}
          </div>
        </article>

        {altri.length > 0 && (
          <section aria-labelledby="titolo-correlati" className="border-t border-filo">
            <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
              <h2 id="titolo-correlati" className="mb-6 text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-tenue">
                Da leggere dopo
              </h2>
              <Righe articoli={altri} />
            </div>
          </section>
        )}
        <ChiamataFinale />
      </main>
      <Piede />
    </>
  );
}
