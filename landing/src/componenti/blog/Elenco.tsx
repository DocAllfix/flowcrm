import { AUTORI } from "@/contenuti/autori";
import { dataLeggibile, type Articolo } from "@/lib/blog";
import { NOMI_SETTORI, SETTORI_BLOG, type SettoreBlog } from "@/lib/blog-schema";

/**
 * Pezzi comuni delle pagine del blog: l'articolo in evidenza, le righe dell'elenco,
 * i filtri per settore. Niente copertine fotografiche (nessuna immagine generata): il
 * peso lo danno la tipografia e l'occhiello del settore, come nel resto del sito.
 */

/** Autore, data e tempo di lettura. `senzaAutore`: quando il nome è già scritto accanto, come collegamento. */
export function Meta({ a, senzaAutore = false }: { a: Articolo; senzaAutore?: boolean }) {
  const i = a.intestazione;
  return (
    <p className="text-[0.8125rem] text-tenue">
      {senzaAutore ? "· " : `${AUTORI[i.autore]?.nome} · `}
      <time dateTime={i.data}>{dataLeggibile(i.data)}</time> · {a.minuti} min di lettura
    </p>
  );
}

export function InEvidenza({ a }: { a: Articolo }) {
  const i = a.intestazione;
  return (
    <a href={`/blog/${a.slug}`} className="group grid gap-6 rounded-lg border border-filo bg-foglio p-6 hover:border-inchiostro sm:p-10 md:grid-cols-[1.2fr_0.8fr] md:gap-12">
      <div>
        <p className="occhiello">{NOMI_SETTORI[i.settore]}</p>
        <h2 className="titolo-sezione mt-5 text-[clamp(1.75rem,1.2rem+1.6vw,2.5rem)] group-hover:underline group-hover:decoration-cotto group-hover:decoration-2 group-hover:underline-offset-[6px]">
          {i.titolo}
        </h2>
      </div>
      <div className="flex flex-col justify-end gap-4">
        <p className="prosa text-tenue">{i.descrizione}</p>
        <Meta a={a} />
      </div>
    </a>
  );
}

export function Righe({ articoli }: { articoli: Articolo[] }) {
  return (
    <ul className="border-t border-filo">
      {articoli.map((a) => {
        const i = a.intestazione;
        return (
          <li key={a.slug} className="border-b border-filo">
            <a href={`/blog/${a.slug}`} className="group grid gap-2 py-7 md:grid-cols-[10rem_1fr] md:gap-10">
              <span className="text-[0.8125rem] text-tenue">
                <time dateTime={i.data}>{dataLeggibile(i.data)}</time>
                <span className="mt-1 block font-semibold text-cotto">{NOMI_SETTORI[i.settore]}</span>
              </span>
              <span>
                <span className="block text-[1.25rem] font-bold leading-snug tracking-[-0.01em] [font-stretch:104%] group-hover:underline group-hover:decoration-cotto group-hover:decoration-2 group-hover:underline-offset-4">
                  {i.titolo}
                </span>
                <span className="prosa mt-2 block text-tenue">{i.descrizione}</span>
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

/** I filtri sono collegamenti a pagine vere (`/blog/settore/…`): si indicizzano e funzionano senza JavaScript. */
export function Filtri({ attivo, presenti }: { attivo?: SettoreBlog; presenti: SettoreBlog[] }) {
  const voci = SETTORI_BLOG.filter((s) => presenti.includes(s));
  const base = "rounded-sm border px-3.5 py-2 text-[0.875rem] font-semibold";
  return (
    <nav aria-label="Settori del blog" className="flex flex-wrap gap-2">
      <a href="/blog" aria-current={attivo ? undefined : "page"} className={`${base} ${attivo ? "border-filo text-tenue hover:border-inchiostro hover:text-inchiostro" : "border-inchiostro bg-inchiostro text-carta"}`}>
        Tutti
      </a>
      {voci.map((s) => (
        <a
          key={s}
          href={`/blog/settore/${s}`}
          aria-current={attivo === s ? "page" : undefined}
          className={`${base} ${attivo === s ? "border-inchiostro bg-inchiostro text-carta" : "border-filo text-tenue hover:border-inchiostro hover:text-inchiostro"}`}
        >
          {NOMI_SETTORI[s]}
        </a>
      ))}
    </nav>
  );
}

/** La testata comune di /blog, /blog/settore/… e /blog/autori/…, con le briciole di pane. */
export function Testata({ briciole, occhiello, titolo, testo }: { briciole: [string, string?][]; occhiello: string; titolo: string; testo: string }) {
  return (
    <section aria-labelledby="titolo-blog" className="relative isolate overflow-hidden border-b border-filo">
      <div aria-hidden="true" className="trama-punti absolute inset-0 -z-10" />
      <div className="mx-auto w-full max-w-6xl px-4 pb-14 pt-8 sm:px-6 md:pb-16 md:pt-10">
        <nav aria-label="Percorso" className="text-[0.8125rem] text-tenue">
          <ol className="flex flex-wrap items-center gap-x-2">
            {briciole.map(([nome, href], i) => (
              <li key={nome} className="flex items-center gap-x-2">
                {i > 0 && <span aria-hidden="true">›</span>}
                {href ? (
                  <a href={href} className="hover:text-inchiostro">{nome}</a>
                ) : (
                  <span aria-current="page" className="font-semibold text-inchiostro">{nome}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <p className="occhiello mt-10">{occhiello}</p>
        <h1 id="titolo-blog" className="titolo-display mt-6 max-w-3xl lg:text-[clamp(2.25rem,1rem+2.4vw,3.125rem)]">{titolo}</h1>
        <p className="prosa mt-6 max-w-[40rem] text-[1.0625rem] text-tenue md:text-[1.125rem]">{testo}</p>
      </div>
    </section>
  );
}
