/**
 * La finestra dell'hero di una pagina di settore: la scheda di un record del modulo
 * (un cantiere, una gara, un mezzo…) dentro un browser, con le linguette delle schede
 * VERE del dettaglio (`flowcrm/src/modules/<slug>/dettaglio`). Ferma, niente viste
 * da esplorare: è la carta d'identità del modulo, l'esplorazione vera è la demo.
 *
 * Stessa cornice di `FinestraProdotto` (em dentro un @container, ombra, barra del
 * browser con l'indirizzo del CLIENTE). Nessuna cifra in euro.
 */
export type DatiFinestra = {
  indirizzo: string;
  sigla: string;
  cliente: string;
  tinta: string;
  codice?: string;
  titolo: string;
  stato: string;
  schede: string[];
  numeri: [string, string, boolean?][];
  righe: [string, string, boolean?][];
};

export function FinestraSettore({ d }: { d: DatiFinestra }) {
  return (
    <div className="[container-type:inline-size]">
      <div
        aria-hidden="true"
        className="overflow-hidden rounded-[1.1em] border border-filo bg-carta text-[clamp(6.5px,1.95cqw,11px)] shadow-[0_2.4em_4.8em_-2.4em_oklch(0.22_0.025_255/0.35),0_0.2em_0.6em_-0.2em_oklch(0.22_0.025_255/0.12)]"
      >
        <div className="flex items-center gap-[0.5em] border-b border-filo bg-foglio px-[1.2em] py-[0.9em]">
          <span className="size-[0.8em] rounded-full bg-filo" />
          <span className="size-[0.8em] rounded-full bg-filo" />
          <span className="size-[0.8em] rounded-full bg-filo" />
          <span className="mx-auto rounded-[0.5em] bg-carta-2 px-[1.2em] py-[0.35em] font-mono text-[0.95em] text-tenue">{d.indirizzo}</span>
        </div>

        <div className="p-[1.8em]">
          <div className="flex items-center gap-[0.8em]">
            <span className="flex size-[2.2em] shrink-0 items-center justify-center rounded-[0.5em] text-[0.9em] font-bold text-carta" style={{ background: d.tinta }}>
              {d.sigla}
            </span>
            <span className="text-[1.05em] font-semibold text-tenue">{d.cliente}</span>
          </div>

          <div className="mt-[1.4em] flex items-start justify-between gap-[1em]">
            <div className="min-w-0">
              {d.codice && <p className="font-mono text-[0.95em] text-tenue">{d.codice}</p>}
              <p className="text-[1.6em] font-bold leading-tight tracking-[-0.02em] [font-stretch:108%]">{d.titolo}</p>
            </div>
            <span className="shrink-0 rounded-[0.4em] bg-cotto/10 px-[0.8em] py-[0.3em] text-[0.95em] font-semibold text-cotto-scuro">{d.stato}</span>
          </div>

          {/* le linguette vere del dettaglio: la prima è quella aperta */}
          <div className="mt-[1.2em] flex gap-[0.3em] overflow-hidden border-b border-filo">
            {d.schede.map((s, i) => (
              <span
                key={s}
                className={`shrink-0 whitespace-nowrap px-[0.8em] pb-[0.6em] text-[1em] ${
                  i === 0 ? "border-b-2 border-inchiostro font-semibold text-inchiostro" : "text-tenue"
                }`}
              >
                {s}
              </span>
            ))}
          </div>

          <div className="mt-[1.4em] grid grid-cols-3 gap-[0.8em]">
            {d.numeri.map(([etichetta, valore, accento]) => (
              <div key={etichetta} className="rounded-[0.7em] border border-filo bg-foglio p-[1em]">
                <p className="truncate text-[0.95em] text-tenue">{etichetta}</p>
                <p className={`cifre mt-[0.2em] truncate text-[1.9em] font-bold leading-none [font-stretch:108%] ${accento ? "text-cotto" : ""}`}>{valore}</p>
              </div>
            ))}
          </div>

          <div className="mt-[1.2em] rounded-[0.7em] border border-filo bg-foglio px-[1.2em] py-[0.4em]">
            {d.righe.map(([etichetta, valore, accento], i) => (
              <div key={etichetta} className={`flex items-baseline justify-between gap-[1em] py-[0.65em] text-[1em] ${i ? "border-t border-filo" : ""}`}>
                <span className="shrink-0 text-tenue">{etichetta}</span>
                <span className={`truncate text-right font-medium ${accento ? "text-cotto-scuro" : ""}`}>{valore}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
