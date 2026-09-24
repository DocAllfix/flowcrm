import { NOME, CONTATTI_ATTIVI, DEMO_ATTIVA, URL_DEMO } from "@/lib/sito";

const VOCI = [
  ["Funzioni", "#funzioni"],
  ["Moduli", "#moduli"],
  ["Sicurezza", "/sicurezza"],
  ["Domande", "#domande"],
] as const;

/**
 * Il logotipo di Social-Studio (glifo «P che scorre» + nome in tracciati), viewBox
 * 194.3 × 42. Si impagina per ALTEZZA: 28 px nell intestazione, 20 nel piede.
 * `<img>` e non SVG in linea: 2,5 KB in cache per tutte le pagine, invece che
 * ripetuti nell HTML di ciascuna.
 */
export function Logotipo({ altezza = 28, suScuro = false }: { altezza?: number; suScuro?: boolean }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={suScuro ? "/marchio/logotipo-su-scuro.svg" : "/marchio/logotipo-su-chiaro.svg"}
      alt="PMIFlow"
      width={Math.round((altezza * 194.3) / 42)}
      height={altezza}
      decoding="async"
      className="block"
    />
  );
}

export function Intestazione() {
  return (
    <header className="border-b border-filo">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <a href="/" aria-label={`${NOME}, pagina iniziale`}>
          <Logotipo />
        </a>
        <nav aria-label="Principale" className="hidden md:block">
          <ul className="flex items-center gap-8 text-[0.9375rem] text-tenue">
            {VOCI.map(([etichetta, href]) => (
              <li key={href}>
                <a href={href} className="hover:text-inchiostro">
                  {etichetta}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-3">
          {DEMO_ATTIVA && (
            <a href={URL_DEMO} className="hidden text-[0.9375rem] font-semibold underline decoration-filo underline-offset-4 hover:decoration-inchiostro sm:inline">
              Prova la demo
            </a>
          )}
          {CONTATTI_ATTIVI && (
            <a href="#contatti" className="bottone bottone-primario min-h-10 px-4 text-[0.875rem]">
              Richiedi una presentazione
            </a>
          )}
        </div>
      </div>
    </header>
  );
}
