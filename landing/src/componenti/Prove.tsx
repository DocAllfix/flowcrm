import { PROVE } from "@/contenuti/prove";
import { Rivela } from "./Rivela";

/**
 * «Perché fidarsi», senza inventare. Frasi verificabili in un elenco rigato, non
 * numeri giganti con un'etichetta sotto: quello è il template da landing generica,
 * e prima del primo cliente non ci sono numeri di clienti da mostrare.
 * Il 241 è scritto nell'HTML dal server: chi non esegue JavaScript (i crawler degli
 * assistenti, le anteprime dei link) legge il valore vero, non uno zero.
 */
export function Prove() {
  return (
    <section aria-labelledby="titolo-prove" className="sezione-notte bg-notte text-carta">
      <div className="mx-auto grid w-full max-w-6xl gap-12 px-4 py-24 sm:px-6 md:grid-cols-[0.8fr_1.2fr] md:gap-16 md:py-32">
        <div>
          <p className="occhiello">Perché fidarsi</p>
          <h2 id="titolo-prove" className="titolo-sezione mt-6 leading-[1.14]">
            Un gestionale si giudica il giorno in cui qualcosa va storto.
          </h2>
        </div>
        <ol className="border-t border-filo-notte">
          {PROVE.map((p, i) => (
            <Rivela come="li" key={p.titolo} ritardo={i * 60} className="grid grid-cols-[3rem_1fr] gap-x-4 border-b border-filo-notte py-8">
              <span className="cifre pt-1 text-[0.8125rem] font-semibold text-cotto-notte">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="titolo-voce">{p.titolo}</h3>
                <p className="prosa mt-2 leading-[1.7] text-tenue-notte">{p.testo}</p>
              </div>
            </Rivela>
          ))}
        </ol>
      </div>
    </section>
  );
}
