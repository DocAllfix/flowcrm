import { BASE_NUCLEO, FAMIGLIE, MODULI, NUCLEO } from "@/contenuti/moduli";
import { Rivela } from "./Rivela";

/**
 * Nucleo e moduli come una STRUTTURA, non come un elenco: in alto il nucleo che ogni
 * istanza ha (quattro aree, con le voci vere del menu), sotto i dodici moduli appesi
 * con un filo e raggruppati per famiglia. Ogni modulo dice cosa AGGIUNGE e a quali
 * aree del nucleo si AGGANCIA.
 *
 * Ogni scheda è il collegamento alla pagina del modulo (`/moduli/<id>`).
 *
 * Passando su un modulo (o raggiungendolo da tastiera) le aree a cui si aggancia si
 * accendono e le altre si spengono: si vede che il cantiere usa commesse e fatture
 * senza doverlo leggere. Zero JavaScript: `:has()` più una regola per modulo, generata
 * qui dagli stessi dati (`aggancia`) così testo ed evidenza non possono divergere.
 * Senza `:has()` resta tutto visibile e fermo, con i collegamenti scritti nelle schede.
 *
 * Sostituisce il diagramma a raggiera: diceva «ci sono cinque moduli intorno al CRM»,
 * non cosa c'è nel CRM né cosa aggiunge ciascuno.
 */
const NOMI_GRUPPI = Object.fromEntries(NUCLEO.map((g) => [g.id, g.nome]));

/*
 * Regole FUORI da ogni @layer: vincono sulle utilità di Tailwind (`border-filo-notte`)
 * senza `!important`. Quelle comuni (transizioni, spegnimento) stanno in globals.css.
 */
const EVIDENZA = [
  ...MODULI.map(
    (m) =>
      `.sezione-moduli:has([data-modulo="${m.id}"]:is(:hover,:focus-visible)) :is(${m.aggancia
        .map((g) => `[data-gruppo="${g}"]`)
        .join(",")}){opacity:1;border-color:var(--color-cotto-notte);background:oklch(0.7 0.14 42 / 0.1)}`,
  ),
  ".sezione-moduli .modulo-settore:is(:hover,:focus-visible){border-color:var(--color-cotto-notte);background:oklch(1 0 0 / 0.03)}",
].join("\n");

const etichetta = "text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-tenue-notte";

export function Moduli() {
  return (
    <section id="moduli" aria-labelledby="titolo-moduli" className="sezione-moduli sezione-notte bg-notte text-carta">
      <style dangerouslySetInnerHTML={{ __html: EVIDENZA }} />
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 md:py-32">
        <div className="grid gap-8 md:grid-cols-[1.1fr_1fr] md:items-end md:gap-16">
          <div>
            <p className="occhiello">Moduli di settore</p>
            <h2 id="titolo-moduli" className="titolo-sezione mt-6">
              Il nucleo è uguale per tutti. Il resto è il tuo mestiere.
            </h2>
          </div>
          <p className="prosa text-tenue-notte">
            Ogni azienda riceve il nucleo intero. I moduli si attivano solo se servono, e non sono programmi a parte:
            lavorano sugli stessi clienti, sulle stesse commesse e sulle stesse fatture.
          </p>
        </div>

        {/* Il nucleo */}
        <Rivela className="mt-16">
          <div className="rounded-lg border border-filo-notte bg-[oklch(1_0_0/0.03)] p-4 sm:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
              <p className={etichetta}>
                <span className="text-cotto-notte">Il nucleo</span> · in ogni istanza
              </p>
              <p className="text-[0.8125rem] text-tenue-notte">Sotto tutto: {BASE_NUCLEO.join(", ").toLowerCase()}</p>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
              {NUCLEO.map((g) => (
                <div key={g.id} data-gruppo={g.id} className="gruppo-nucleo min-w-0 rounded-md border border-filo-notte p-3.5 sm:p-5">
                  <h3 className="text-[0.9375rem] font-bold tracking-[-0.01em] [font-stretch:104%] sm:text-[1.0625rem] sm:[font-stretch:108%]">
                    {g.nome}
                  </h3>
                  <ul className="mt-3 space-y-1.5 text-[0.8125rem] leading-snug text-pretty text-tenue-notte sm:text-[0.875rem]">
                    {g.voci.map((v) => (
                      <li key={v}>{v}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </Rivela>

        {/* Il filo: dal nucleo ai moduli. */}
        <div aria-hidden="true" className="relative hidden h-12 lg:block">
          <span className="absolute left-1/2 top-0 h-12 w-px bg-filo-notte" />
          <span className={`absolute left-1/2 top-3 ml-3 ${etichetta}`}>Si agganciano al nucleo</span>
        </div>
        <p className={`mt-10 lg:hidden ${etichetta}`}>I moduli · si agganciano al nucleo</p>

        {/* I moduli, famiglia per famiglia (le famiglie del selettore dell'applicazione).
            Ogni scheda è una SUBGRID di tre righe (testa, «Aggiunge», «Usa dal nucleo»):
            le sezioni partono alla stessa altezza in tutte le schede di una riga. */}
        <div className="mt-6 space-y-12 lg:mt-0 lg:rounded-lg lg:border lg:border-filo-notte lg:p-8">
          {FAMIGLIE.map((famiglia) => {
            const moduli = MODULI.filter((m) => m.famiglia === famiglia);
            return (
              <div key={famiglia} role="group" aria-labelledby={`famiglia-${moduli[0]!.id}`}>
                <h3 id={`famiglia-${moduli[0]!.id}`} className={`mb-4 ${etichetta}`}>
                  <span className="text-carta">{famiglia}</span> · {moduli.length === 1 ? "1 modulo" : `${moduli.length} moduli`}
                </h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {moduli.map((m, i) => (
                    <Rivela key={m.id} ritardo={i * 50} className="row-span-3 grid grid-rows-subgrid">
                      <a
                        href={`/moduli/${m.id}`}
                        data-modulo={m.id}
                        aria-labelledby={`modulo-${m.id}`}
                        className="modulo-settore relative row-span-3 grid grid-rows-subgrid gap-y-6 rounded-lg border border-filo-notte p-5"
                      >
                        <div>
                          <h4 id={`modulo-${m.id}`} className="text-[1.25rem] font-bold leading-tight tracking-[-0.02em] [font-stretch:110%]">
                            {m.nome}
                          </h4>
                          <p className="mt-1 text-[0.8125rem] text-pretty text-cotto-notte">{m.perChi}</p>
                        </div>

                        <div>
                          <p className={etichetta}>Aggiunge</p>
                          <ul className="mt-2 space-y-1.5 text-[0.875rem] leading-snug text-pretty">
                            {m.aggiunge.map((v) => (
                              <li
                                key={v}
                                className="relative pl-3 before:absolute before:left-0 before:top-[0.5em] before:size-1 before:rounded-full before:bg-cotto-notte"
                              >
                                {v}
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="border-t border-filo-notte pt-4">
                          <p className={etichetta}>Usa dal nucleo</p>
                          <p className="mt-2 flex flex-wrap gap-1.5">
                            {m.aggancia.map((g) => (
                              <span key={g} className="rounded-sm border border-filo-notte px-2 py-0.5 text-[0.75rem] font-semibold">
                                {NOMI_GRUPPI[g]}
                              </span>
                            ))}
                          </p>
                          <p className="mt-3 text-[0.8125rem] leading-relaxed text-pretty text-tenue-notte">{m.ponte}</p>
                          <p className="mt-4 text-[0.8125rem] font-semibold text-cotto-notte">
                            Scopri il modulo <span aria-hidden="true">→</span>
                          </p>
                        </div>
                      </a>
                    </Rivela>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-12">
          <a href="/sicurezza" className="font-semibold underline decoration-filo-notte underline-offset-4 hover:decoration-cotto-notte">
            Dove stanno i dati e chi li vede
          </a>
        </p>
      </div>
    </section>
  );
}
