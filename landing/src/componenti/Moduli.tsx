import { MODULI } from "@/contenuti/moduli";
import { Rivela } from "./Rivela";

/** I moduli di settore come righe di un indice: il nome pesa, il resto spiega. */
export function Moduli() {
  return (
    <section id="moduli" aria-labelledby="titolo-moduli" className="sezione-notte bg-notte text-carta">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 md:py-32">
        <div className="grid gap-8 md:grid-cols-[1fr_1fr] md:items-end md:gap-16">
          <div>
            <p className="occhiello">Moduli di settore</p>
            <h2 id="titolo-moduli" className="titolo-sezione mt-6">Il nucleo è uguale per tutti. Il resto è il tuo mestiere.</h2>
          </div>
          <p className="prosa text-tenue-notte">
            Cinque moduli si agganciano al CRM e parlano la lingua del settore. Si attivano solo quelli che servono, e i
            dati restano collegati: il cliente del cantiere è lo stesso della fattura.
          </p>
        </div>
        <ul className="mt-16 border-t border-filo-notte">
          {MODULI.map((m, i) => (
            <Rivela come="li" key={m.nome} ritardo={i * 50} className="grid gap-x-12 gap-y-2 border-b border-filo-notte py-8 md:grid-cols-[1fr_1.4fr]">
              <div>
                <h3 className="text-[1.5rem] font-bold leading-tight tracking-[-0.02em] [font-stretch:110%] md:text-[1.75rem]">{m.nome}</h3>
                <p className="mt-1 text-[0.9375rem] text-cotto-notte">{m.perChi}</p>
              </div>
              <p className="prosa leading-[1.7] text-tenue-notte md:pt-2">{m.testo}</p>
            </Rivela>
          ))}
        </ul>
        <p className="mt-12">
          <a href="/sicurezza" className="font-semibold underline decoration-filo-notte underline-offset-4 hover:decoration-cotto-notte">
            Dove stanno i dati e chi li vede
          </a>
        </p>
      </div>
    </section>
  );
}
