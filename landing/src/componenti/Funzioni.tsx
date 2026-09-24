import { FUNZIONI } from "@/contenuti/funzioni";
import { Rivela } from "./Rivela";

/**
 * Le funzioni a tessere di misure diverse, non sei card uguali. Due tessere
 * MOSTRANO invece di dire, come i passi del riferimento FormazioneEvalis:
 *  - il white-label: lo stesso programma per tre clienti, ognuno col suo colore e il
 *    suo indirizzo (è ciò che nessun CRM in abbonamento condiviso può mostrare);
 *  - la scheda cliente con la sua storia.
 * Le altre quattro restano voci compatte. I testi vengono da `contenuti/funzioni.ts`,
 * la stessa fonte del JSON-LD.
 */
const [ANAGRAFICHE, TRATTATIVE, COMMESSE, FATTURE, RUOLI, MARCHIO] = FUNZIONI;

const CLIENTI = [
  { sigla: "RI", nome: "Rossi Impianti", indirizzo: "rossi-impianti.pmiflow.it", tinta: "oklch(0.45 0.09 250)" },
  { sigla: "SF", nome: "Studio Ferri", indirizzo: "studio-ferri.pmiflow.it", tinta: "oklch(0.47 0.1 155)" },
  { sigla: "SL", nome: "Poliambulatorio San Luca", indirizzo: "sanluca.pmiflow.it", tinta: "oklch(0.44 0.11 330)" },
] as const;

const STORIA = [
  ["Oggi", "Chiamata con Marco Bassi", "vuole l'offerta entro venerdì"],
  ["Martedì", "Offerta 41 inviata", "impianto di climatizzazione"],
  ["12 set", "Riunione in sede", "sopralluogo con il tecnico"],
  ["3 set", "Fattura 97 incassata", "nei tempi"],
] as const;

function Tessera({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-filo bg-foglio p-6 sm:p-8 ${className}`}>{children}</div>;
}

function Testo({ f, n }: { f: (typeof FUNZIONI)[number]; n: number }) {
  return (
    <div className="grid grid-cols-[2.25rem_1fr] gap-x-3">
      <span className="cifre pt-1 text-[0.8125rem] font-semibold text-cotto">{String(n).padStart(2, "0")}</span>
      <div>
        <h3 className="titolo-voce">{f.titolo}</h3>
        <p className="prosa mt-2 text-tenue">{f.testo}</p>
        <p className="mt-4 text-[0.8125rem] font-semibold">{f.dettaglio}</p>
      </div>
    </div>
  );
}

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

        <div className="mt-16 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          <Rivela>
            <Tessera className="h-full">
              <div aria-hidden="true" className="space-y-3">
                {CLIENTI.map((c, i) => (
                  <div
                    key={c.sigla}
                    className="flex items-center gap-3 rounded-md border border-filo bg-carta px-4 py-3"
                    style={{ marginLeft: `${i * 1.25}rem`, marginRight: `${(2 - i) * 1.25}rem` }}
                  >
                    <span
                      className="flex size-8 shrink-0 items-center justify-center rounded-sm text-[0.75rem] font-bold text-carta"
                      style={{ background: c.tinta }}
                    >
                      {c.sigla}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[0.9375rem] font-semibold">{c.nome}</span>
                      <span className="block truncate font-mono text-[0.75rem] text-tenue">{c.indirizzo}</span>
                    </span>
                    <span className="hidden rounded-sm px-2.5 py-1 text-[0.75rem] font-semibold text-carta sm:block" style={{ background: c.tinta }}>
                      Cruscotto
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <Testo f={MARCHIO} n={1} />
              </div>
            </Tessera>
          </Rivela>

          <Rivela>
            <Tessera className="h-full">
              <div aria-hidden="true" className="rounded-md border border-filo bg-carta p-4">
                <p className="text-[0.9375rem] font-semibold">Autotrasporti Bassi</p>
                <p className="text-[0.75rem] text-tenue">Cliente dal 2023 · referente Marco Bassi</p>
                <ol className="mt-4 space-y-3 border-l border-filo pl-4">
                  {STORIA.map(([quando, cosa, nota], i) => (
                    <li key={cosa} className="relative">
                      <span className={`absolute left-[-1.3rem] top-1.5 size-2 rounded-full ${i === 0 ? "bg-cotto" : "bg-filo"}`} />
                      <p className="text-[0.8125rem] font-semibold leading-tight">
                        {cosa} <span className="font-normal text-tenue">· {quando}</span>
                      </p>
                      <p className="text-[0.75rem] text-tenue">{nota}</p>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="mt-8">
                <Testo f={ANAGRAFICHE} n={2} />
              </div>
            </Tessera>
          </Rivela>
        </div>

        <ol className="mt-6 grid gap-x-10 gap-y-2 md:grid-cols-2">
          {[TRATTATIVE, COMMESSE, FATTURE, RUOLI].map((f, i) => (
            <Rivela come="li" key={f.titolo} className="border-t border-filo pt-6 pb-4">
              <Testo f={f} n={i + 3} />
            </Rivela>
          ))}
        </ol>
      </div>
    </section>
  );
}
