import { ImageResponse } from "next/og";
import { MODULI } from "@/contenuti/moduli";
import { PAGINE_SETTORE, type IdSettore } from "@/contenuti/settori";

/**
 * L'anteprima social di una pagina di settore: stessa composizione di
 * `app/opengraph-image.tsx` (glifo, fondo notte), con il nome del modulo e il suo h1.
 * Tipografica, generata dal codice: nessuna immagine prodotta da AI.
 */
export const alt = "PMIFlow · modulo di settore";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return MODULI.map((m) => ({ slug: m.id }));
}

const NOTTE = "#0e141d";
const CARTA = "#fcfaf6";
const COTTO_NOTTE = "#e67e54";
const TENUE_NOTTE = "#b3b8bf";
const GLIFO =
  "M12 52V20A10 10 0 0 1 22 10H40A13 13 0 0 1 40 36H27V28H40A5 5 0 0 0 40 18H22A2 2 0 0 0 20 20V52ZM27 44H53V52H27Z";

export default async function Immagine({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const m = MODULI.find((x) => x.id === slug)!;
  const p = PAGINE_SETTORE[m.id as IdSettore];
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
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800, letterSpacing: -1, color: CARTA }}>PMIFlow</div>
          <div style={{ display: "flex", fontSize: 26, color: COTTO_NOTTE, marginLeft: 12, letterSpacing: 4, textTransform: "uppercase" }}>
            {`· Modulo ${m.nome}`}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2, color: CARTA }}>{p.h1}</div>
        <div style={{ display: "flex", fontSize: 26, color: TENUE_NOTTE }}>{`${m.perChi} · pmiflow.eu`}</div>
      </div>
    ),
    size,
  );
}
