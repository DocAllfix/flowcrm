import { CONTATTI_ATTIVI } from "@/lib/sito";
import { ModuloContatti } from "./ModuloContatti";

/**
 * Il riquadro con il modulo contatti (`#contatti`): nella home dentro «Come si parte»,
 * nelle pagine di settore in fondo, con il modulo di quella pagina già spuntato.
 * Si monta solo con `CONTATTI_ATTIVI`.
 */
export function BloccoContatti({ modulo, className = "" }: { modulo?: string; className?: string }) {
  if (!CONTATTI_ATTIVI) return null;
  return (
    <div
      id="contatti"
      className={`grid scroll-mt-8 gap-12 rounded-lg bg-carta px-6 py-12 text-inchiostro sm:px-10 md:grid-cols-[0.8fr_1.2fr] md:gap-16 md:px-12 ${className}`}
    >
      <div>
        <h3 className="titolo-sezione text-[clamp(1.5rem,1.2rem+1.2vw,2.125rem)]">Raccontaci come lavorate.</h3>
        <p className="prosa mt-4 text-tenue">
          Ti scriviamo per fissare la presentazione. Niente telefonate a sorpresa: decidi tu quando.
        </p>
      </div>
      <ModuloContatti modulo={modulo} />
    </div>
  );
}
