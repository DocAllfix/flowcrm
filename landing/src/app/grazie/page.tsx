import type { Metadata } from "next";
import { PaginaTesto } from "@/componenti/PaginaTesto";

export const metadata: Metadata = {
  title: "Richiesta ricevuta",
  robots: { index: false, follow: false },
  alternates: { canonical: "/grazie" },
};

export default function Grazie() {
  return (
    <PaginaTesto occhiello="Richiesta ricevuta" titolo="Grazie, ti scriviamo noi." percorso="/grazie">
      <p>
        La tua richiesta è arrivata. Ti rispondiamo via email per fissare la presentazione, nel giorno e all&apos;ora che
        preferisci.
      </p>
      <p>
        <a href="/">Torna alla pagina iniziale</a>
      </p>
    </PaginaTesto>
  );
}
