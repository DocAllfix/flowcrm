import { ImageResponse } from "next/og";
import { PROMESSA } from "@/contenuti/promessa";

/**
 * L'anteprima che compare quando qualcuno incolla il link su WhatsApp o LinkedIn.
 * Si genera AL BUILD dalla stessa promessa dell'h1: se cambia la pagina, cambia
 * l'anteprima, e le due non possono divergere.
 * Il glifo è il tracciato di Social-Studio (`public/marchio/simbolo.svg`), ricopiato qui
 * perché `ImageResponse` non legge file SVG dal disco: se cambia il marchio, cambia anche qui.
 * `ImageResponse` non conosce le variabili CSS: i colori sono gli esadecimali dei token.
 */
export const alt = `PMIFlow · ${PROMESSA.titolo.join(" ")}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const NOTTE = "#0e141d";
const CARTA = "#fcfaf6";
const COTTO_NOTTE = "#e67e54";
const TENUE_NOTTE = "#b3b8bf";
const GLIFO =
  "M12 52V20A10 10 0 0 1 22 10H40A13 13 0 0 1 40 36H27V28H40A5 5 0 0 0 40 18H22A2 2 0 0 0 20 20V52ZM27 44H53V52H27Z";

export default function Immagine() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: NOTTE,
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="56" height="56" viewBox="0 0 64 64">
            <path fill={COTTO_NOTTE} fillRule="evenodd" d={GLIFO} />
          </svg>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800, letterSpacing: -1, color: CARTA }}>
            PMIFlow
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2.5, color: CARTA }}>
            {PROMESSA.titolo[0]}
          </div>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.04, letterSpacing: -2.5, color: COTTO_NOTTE }}>
            {PROMESSA.titolo[1]}
          </div>
        </div>
        <div style={{ fontSize: 26, color: TENUE_NOTTE }}>CRM e gestione per le piccole imprese italiane · pmiflow.eu</div>
      </div>
    ),
    size,
  );
}
