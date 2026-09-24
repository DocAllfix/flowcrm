import { INCLUSO, PASSI } from "@/contenuti/partenza";
import { CONTATTI_ATTIVI } from "@/lib/sito";
import { ModuloContatti } from "./ModuloContatti";
import { Rivela } from "./Rivela";

/** Cosa è incluso e come si comincia. Nessun prezzo: si vende su presentazione. */
export function ComeSiParte() {
  return (
    <section id="come-si-parte" aria-labelledby="titolo-partenza" className="border-b border-filo">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 md:py-32">
        <div className="grid gap-16 md:grid-cols-[1fr_1fr]">
          <div>
            <p className="occhiello">Come si parte</p>
            <h2 id="titolo-partenza" className="titolo-sezione mt-6">Tre passi, e nessuno si fa da solo.</h2>
            <ol className="mt-12 space-y-10">
              {PASSI.map((p, i) => (
                <Rivela come="li" key={p.titolo} ritardo={i * 80} className="grid grid-cols-[3rem_1fr] gap-x-4">
                  <span className="cifre flex size-10 items-center justify-center rounded-full border border-inchiostro text-[0.9375rem] font-semibold">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="titolo-voce">{p.titolo}</h3>
                    <p className="prosa mt-2 text-tenue">{p.testo}</p>
                  </div>
                </Rivela>
              ))}
            </ol>
          </div>
          <div className="md:pt-3">
            <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-tenue">Sempre incluso</h3>
            <ul className="mt-6 border-t border-filo">
              {INCLUSO.map((voce) => (
                <li key={voce} className="flex items-baseline gap-4 border-b border-filo py-4">
                  <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0 translate-y-[1px] text-cotto">
                    <path d="M2 7.5 5.5 11 12 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{voce}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {CONTATTI_ATTIVI && (
          <div id="contatti" className="mt-24 grid gap-12 rounded-lg bg-carta-2 px-6 py-12 sm:px-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16 md:px-12">
            <div>
              <h3 className="titolo-sezione text-[clamp(1.5rem,1.2rem+1.2vw,2.125rem)]">Raccontaci come lavorate.</h3>
              <p className="prosa mt-4 text-tenue">
                Ti scriviamo per fissare la presentazione. Niente telefonate a sorpresa: ti
                scriviamo, e decidi tu quando.
              </p>
            </div>
            <ModuloContatti />
          </div>
        )}
      </div>
    </section>
  );
}
