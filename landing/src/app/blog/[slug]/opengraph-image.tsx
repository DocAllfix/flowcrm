import { ImageResponse } from "next/og";
import { AUTORI } from "@/contenuti/autori";
import { articoli, articolo, dataLeggibile } from "@/lib/blog";
import { NOMI_SETTORI } from "@/lib/blog-schema";

/**
 * L'anteprima social di un articolo: tipografica, generata dal codice (nessuna immagine
 * prodotta da AI), stessa composizione dell'anteprima della home. Se l'articolo ha una
 * `immagine` sua, i metadati usano quella e questa resta per i motori.
 */
export const alt = "Articolo del blog di PMIFlow";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export function generateStaticParams() {
  return articoli().map((a) => ({ slug: a.slug }));
}

const NOTTE = "#0e141d";
const CARTA = "#fcfaf6";
const COTTO_NOTTE = "#e67e54";
const TENUE_NOTTE = "#b3b8bf";
const GLIFO =
  "M12 52V20A10 10 0 0 1 22 10H40A13 13 0 0 1 40 36H27V28H40A5 5 0 0 0 40 18H22A2 2 0 0 0 20 20V52ZM27 44H53V52H27Z";

export default async function Immagine({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = articolo(slug)!;
  const i = a.intestazione;
  const lungo = i.titolo.length > 48;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: NOTTE, padding: "72px 80px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="52" height="52" viewBox="0 0 64 64">
            <path fill={COTTO_NOTTE} fillRule="evenodd" d={GLIFO} />
          </svg>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 800, letterSpacing: -1, color: CARTA }}>PMIFlow</div>
          <div style={{ display: "flex", fontSize: 24, color: COTTO_NOTTE, marginLeft: 12, letterSpacing: 4, textTransform: "uppercase" }}>
            {`· Blog · ${NOMI_SETTORI[i.settore]}`}
          </div>
        </div>
        <div style={{ display: "flex", fontSize: lungo ? 58 : 68, fontWeight: 800, lineHeight: 1.08, letterSpacing: -2, color: CARTA }}>{i.titolo}</div>
        <div style={{ display: "flex", fontSize: 26, color: TENUE_NOTTE }}>{`${AUTORI[i.autore]?.nome} · ${dataLeggibile(i.data)} · pmiflow.eu`}</div>
      </div>
    ),
    size,
  );
}
