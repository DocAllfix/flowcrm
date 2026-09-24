import { FUNZIONI } from "@/contenuti/funzioni";
import { Rivela } from "./Rivela";

/**
 * Le funzioni come un indice, non come sei card identiche con icona: la griglia di
 * card uguali è la prima cosa che fa dire «l'ha fatta un generatore».
 * Il dettaglio in fondo a ogni voce è il fatto concreto che la distingue.
 */
export function Funzioni() {
  return (
    <section id="funzioni" aria-labelledby="titolo-funzioni" className="border-b border-filo">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 md:py-32">
        <div className="max-w-2xl">
          <p className="occhiello">Ogni giorno</p>
          <h2 id="titolo-funzioni" className="titolo-sezione mt-6">
            Tutto quello che oggi sta in tre programmi, due fogli Excel e un quaderno.
          </h2>
        </div>
        <ol className="mt-16 grid gap-x-16 md:grid-cols-2">
          {FUNZIONI.map((f, i) => (
            <Rivela come="li" key={f.titolo} ritardo={(i % 2) * 80} className="border-t border-filo py-8">
              <article className="grid grid-cols-[2.5rem_1fr] gap-x-4">
                <span className="cifre pt-1 text-[0.8125rem] font-semibold text-cotto">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="titolo-voce">{f.titolo}</h3>
                  <p className="prosa mt-2 text-tenue">{f.testo}</p>
                  <p className="mt-4 text-[0.8125rem] font-semibold text-inchiostro">{f.dettaglio}</p>
                </div>
              </article>
            </Rivela>
          ))}
        </ol>
      </div>
    </section>
  );
}
