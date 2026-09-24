import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * I diagrammi di Social-Studio (`src/diagrammi/*.svg`), messi IN LINEA e non come
 * `<img>`: l'inchiostro è `currentColor`, e solo un SVG in linea eredita il colore del
 * testo della sezione (inchiostro su carta, carta su notte).
 *
 * Si leggono dal disco al BUILD: è un Server Component, la pagina resta statica e
 * nel bundle client non entra niente.
 *
 * Nessun testo dentro gli SVG, per scelta concordata: le etichette sono HTML sopra
 * (`etichette`), così restano indicizzabili, leggibili da uno screen reader e si
 * cambiano senza ridisegnare. Il disegno in sé è decorativo (`aria-hidden`): quello
 * che dice sta già scritto accanto.
 *
 * Sulle sezioni notte il cotto va schiarito (#e67e54): lo fa `.diagramma-notte` in
 * globals.css, perché `fill` da CSS vince sull'attributo di presentazione.
 */
type Nome = "istanza-privata" | "moduli" | "backup";

const cache = new Map<Nome, string>();
function svg(nome: Nome): string {
  let s = cache.get(nome);
  if (!s) {
    s = readFileSync(path.join(process.cwd(), "src/diagrammi", `${nome}.svg`), "utf8")
      .replace("<svg ", '<svg aria-hidden="true" focusable="false" ');
    cache.set(nome, s);
  }
  return s;
}

/** Etichetta posizionata in coordinate del viewBox 600 × 400. */
export type Etichetta = { x: number; y: number; testo: string; tono?: "tenue" | "accento" | "suPieno" };

export function Diagramma({
  nome,
  etichette = [],
  notte = false,
  className = "",
}: {
  nome: Nome;
  etichette?: Etichetta[];
  notte?: boolean;
  className?: string;
}) {
  return (
    <div className={`diagramma relative [container-type:inline-size] ${notte ? "diagramma-notte" : ""} ${className}`}>
      <div dangerouslySetInnerHTML={{ __html: svg(nome) }} />
      {etichette.map((e) => (
        <span
          key={e.testo}
          aria-hidden="true"
          style={{ left: `${(e.x / 600) * 100}%`, top: `${(e.y / 400) * 100}%` }}
          className={`etichetta absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap font-semibold ${
            e.tono === "tenue" ? "etichetta-tenue" : ""
          } ${e.tono === "accento" ? "etichetta-accento" : ""} ${e.tono === "suPieno" ? "etichetta-su-pieno" : ""}`}
        >
          {e.testo}
        </span>
      ))}
    </div>
  );
}
