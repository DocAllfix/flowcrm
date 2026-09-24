import { DOMANDE } from "@/contenuti/domande";

/**
 * `<details>` nativo: zero JavaScript, accessibile da tastiera senza fare niente,
 * e il testo della risposta è nell'HTML anche chiuso, quindi i motori lo leggono.
 */
export function Domande() {
  return (
    <section id="domande" aria-labelledby="titolo-domande" className="border-b border-filo">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-24 sm:px-6 md:grid-cols-[0.8fr_1.2fr] md:gap-16 md:py-32">
        <div>
          <p className="occhiello">Domande</p>
          <h2 id="titolo-domande" className="titolo-sezione mt-6">Quello che ci chiedono prima di tutto.</h2>
        </div>
        <div className="border-t border-filo">
          {DOMANDE.map(([d, r]) => (
            <details key={d} className="group border-b border-filo">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 text-[1.0625rem] font-semibold [&::-webkit-details-marker]:hidden">
                {d}
                <span aria-hidden="true" className="relative mt-[0.45em] size-3 shrink-0">
                  <span className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2 bg-inchiostro" />
                  <span className="absolute inset-y-0 left-1/2 w-[1.5px] -translate-x-1/2 bg-inchiostro transition-transform duration-200 group-open:rotate-90 group-open:scale-y-0" />
                </span>
              </summary>
              <p className="prosa pb-6 pr-10 text-tenue">{r}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
