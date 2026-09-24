import { PROMESSA } from "@/contenuti/promessa";
import { CONTATTI_ATTIVI, DEMO_ATTIVA, URL_DEMO } from "@/lib/sito";
import { FinestraProdotto } from "./FinestraProdotto";
import { Freccia } from "./Freccia";

/**
 * L'hero: promessa a sinistra, il programma vero a destra (in una finestra da
 * esplorare, vedi FinestraProdotto).
 *
 * I pulsanti portano sempre da qualche parte. Finché modulo contatti e demo sono
 * spenti, il primario porta alla pagina stessa («Guarda come si lavora»): un hero
 * senza pulsanti si legge come una pagina ferma.
 *
 * Niente `Rivela` qui dentro: l'h1 è l'elemento LCP e deve esserci al primo frame.
 */
const FIDUCIA = ["Un server per ogni azienda", "Dati in Germania, sotto il GDPR", "Backup provato ogni mese"];

export function Eroe() {
  return (
    <section aria-labelledby="titolo-eroe" className="relative isolate overflow-hidden border-b border-filo">
      <div aria-hidden="true" className="trama-punti absolute inset-0 -z-10" />
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:pb-24 md:pt-20 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14">
        <div>
          <p className="occhiello">{PROMESSA.occhiello}</p>
          <h1 id="titolo-eroe" className="titolo-display mt-6 lg:text-[clamp(2.75rem,1.2rem+3vw,3.75rem)]">
            {PROMESSA.titolo[0]}
            <span className="block text-cotto">{PROMESSA.titolo[1]}</span>
          </h1>
          <p className="prosa mt-6 max-w-[34rem] text-[1.0625rem] text-tenue md:text-[1.125rem]">{PROMESSA.sottotitolo}</p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            {CONTATTI_ATTIVI ? (
              <a href="#contatti" className="bottone bottone-primario">
                Richiedi una presentazione <Freccia />
              </a>
            ) : (
              <a href="#anteprima" className="bottone bottone-primario">
                Guarda come si lavora <Freccia />
              </a>
            )}
            {DEMO_ATTIVA ? (
              <a href={URL_DEMO} className="bottone bottone-secondario">
                Prova la demo
              </a>
            ) : (
              <a href="#come-si-parte" className="bottone bottone-secondario">
                Come si parte
              </a>
            )}
          </div>
          <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-[0.875rem] text-tenue">
            {FIDUCIA.map((f) => (
              <li key={f} className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" className="shrink-0 text-cotto">
                  <path d="M2 7.5 5.5 11 12 3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>
        <FinestraProdotto />
      </div>
    </section>
  );
}
