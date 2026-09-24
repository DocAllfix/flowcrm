import { PROMESSA } from "@/contenuti/promessa";
import { CONTATTI_ATTIVI, DEMO_ATTIVA, URL_DEMO } from "@/lib/sito";
import { CruscottoHero } from "./CruscottoHero";
import { Freccia } from "./Freccia";

/** Niente `Rivela` qui dentro: l'h1 è l'elemento LCP e deve esserci al primo frame. */
export function Eroe() {
  return (
    <section aria-labelledby="titolo-eroe" className="border-b border-filo">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-16 pt-12 sm:px-6 md:grid-cols-[1.1fr_1fr] md:gap-12 lg:gap-16 md:pb-24 md:pt-20">
        <div>
          <p className="occhiello">{PROMESSA.occhiello}</p>
          <h1 id="titolo-eroe" className="titolo-display mt-6">
            {PROMESSA.titolo[0]}
            <span className="block text-cotto">{PROMESSA.titolo[1]}</span>
          </h1>
          <p className="prosa mt-6 max-w-[34rem] text-[1.0625rem] text-tenue md:text-[1.125rem]">{PROMESSA.sottotitolo}</p>
          {(CONTATTI_ATTIVI || DEMO_ATTIVA) && (
            <div className="mt-10 flex flex-wrap items-center gap-4">
              {CONTATTI_ATTIVI && (
                <a href="#contatti" className="bottone bottone-primario">
                  Richiedi una presentazione <Freccia />
                </a>
              )}
              {DEMO_ATTIVA && (
                <a href={URL_DEMO} className="bottone bottone-secondario">
                  Prova la demo
                </a>
              )}
            </div>
          )}
        </div>
        <CruscottoHero />
      </div>
    </section>
  );
}
