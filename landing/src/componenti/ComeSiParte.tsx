import { INCLUSO, PASSI } from "@/contenuti/partenza";
import { CONTATTI_ATTIVI } from "@/lib/sito";
import { ModuloContatti } from "./ModuloContatti";
import { Rivela } from "./Rivela";

/**
 * Come si comincia, su fondo scuro, con un ARTEFATTO per passo: la struttura del
 * «Come funziona» di FormazioneEvalis, dove ogni carta contiene un pezzo di interfaccia
 * invece di sole parole. Nessun prezzo: si vende su presentazione.
 */
function Invito() {
  return (
    <div className="rounded-md border border-filo-notte bg-notte-2 p-4 text-[0.875rem]">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold">Presentazione PMIFlow</span>
        <span className="text-[0.75rem] text-cotto-notte">confermata</span>
      </div>
      <p className="mt-2 text-tenue-notte">Giovedì · 10:30 · 30 minuti</p>
      <p className="text-tenue-notte">Videochiamata, sui vostri casi</p>
    </div>
  );
}

function IstanzaProva() {
  return (
    <div className="rounded-md border border-filo-notte bg-notte-2 text-[0.875rem]">
      <div className="border-b border-filo-notte px-4 py-2 font-mono text-[0.75rem] text-tenue-notte">rossi-impianti.pmiflow.it</div>
      <div className="flex items-center gap-3 p-4">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-[oklch(0.45_0.09_250)] text-[0.75rem] font-bold">RI</span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold">Rossi Impianti</span>
          <span className="block text-[0.8125rem] text-tenue-notte">212 contatti importati</span>
        </span>
        <span className="text-[0.75rem] text-cotto-notte">pronta</span>
      </div>
    </div>
  );
}

function Produzione() {
  return (
    <ul className="divide-y divide-filo-notte rounded-md border border-filo-notte bg-notte-2 px-4 text-[0.875rem]">
      {[
        ["Backup di stanotte", "completato"],
        ["Ripristino di prova", "riuscito"],
        ["Ultimo aggiornamento", "domenica"],
      ].map(([k, v]) => (
        <li key={k} className="flex justify-between gap-3 py-2.5">
          <span className="text-tenue-notte">{k}</span>
          <span className="font-semibold">{v}</span>
        </li>
      ))}
    </ul>
  );
}

const ARTEFATTI = [Invito, IstanzaProva, Produzione];

export function ComeSiParte() {
  return (
    <section id="come-si-parte" aria-labelledby="titolo-partenza" className="sezione-notte bg-notte text-carta">
      <div className="mx-auto w-full max-w-6xl px-4 py-24 sm:px-6 md:py-32">
        <div className="max-w-2xl">
          <p className="occhiello">Come si parte</p>
          <h2 id="titolo-partenza" className="titolo-sezione mt-6">
            Tre passi, e nessuno si fa da solo.
          </h2>
        </div>

        <ol className="mt-16 grid gap-6 lg:grid-cols-3">
          {PASSI.map((p, i) => {
            const Artefatto = ARTEFATTI[i]!;
            return (
              <Rivela come="li" key={p.titolo} className="flex flex-col rounded-lg border border-filo-notte p-6 sm:p-8">
                <span className="cifre text-[2.5rem] font-extrabold leading-none text-cotto-notte/70 [font-stretch:115%]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="titolo-voce mt-6">{p.titolo}</h3>
                <p className="prosa mt-2 flex-1 leading-[1.7] text-tenue-notte">{p.testo}</p>
                <div aria-hidden="true" className="mt-8">
                  <Artefatto />
                </div>
              </Rivela>
            );
          })}
        </ol>

        <div className="mt-16 grid gap-8 border-t border-filo-notte pt-10 md:grid-cols-[0.6fr_1.4fr]">
          <h3 className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-cotto-notte">Sempre incluso</h3>
          <ul className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
            {INCLUSO.map((voce) => (
              <li key={voce} className="flex items-baseline gap-3">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0 translate-y-px text-cotto-notte">
                  <path d="M2 7.5 5.5 11 12 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{voce}</span>
              </li>
            ))}
          </ul>
        </div>

        {CONTATTI_ATTIVI && (
          <div id="contatti" className="mt-24 grid gap-12 rounded-lg bg-carta px-6 py-12 text-inchiostro sm:px-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16 md:px-12">
            <div>
              <h3 className="titolo-sezione text-[clamp(1.5rem,1.2rem+1.2vw,2.125rem)]">Raccontaci come lavorate.</h3>
              <p className="prosa mt-4 text-tenue">
                Ti scriviamo per fissare la presentazione. Niente telefonate a sorpresa: decidi tu quando.
              </p>
            </div>
            <ModuloContatti />
          </div>
        )}
      </div>
    </section>
  );
}
