import type { Metadata } from "next";
import { PaginaTesto } from "@/componenti/PaginaTesto";
import { LEGALI_AGGIORNATI_AL } from "@/lib/sito";

export const metadata: Metadata = {
  title: "Cookie",
  description: "Il sito pmiflow.eu non usa cookie di profilazione né strumenti di tracciamento di terze parti.",
  alternates: { canonical: "/cookie" },
};

/**
 * Nessun cookie, quindi nessun banner. Il banner è anche il primo peggioratore di CLS e
 * INP delle landing italiane: non averne bisogno è una scelta di prodotto, non un caso.
 */
export default function Cookie() {
  return (
    <PaginaTesto occhiello="Legale" titolo="Cookie" percorso="/cookie" aggiornata={LEGALI_AGGIORNATI_AL}>
      <p>
        Il sito <strong>pmiflow.eu</strong> non installa cookie di profilazione, cookie di terze parti o altri strumenti
        di tracciamento. Per questo non ti chiediamo alcun consenso all&apos;apertura della pagina.
      </p>
      <p>
        Caratteri tipografici e immagini sono serviti dal nostro stesso dominio: la visita non genera richieste verso
        servizi esterni come Google Fonts o reti pubblicitarie.
      </p>
      <p>
        Se in futuro aggiungeremo uno strumento di misura, sarà senza cookie e aggregato, e lo indicheremo qui prima di
        attivarlo.
      </p>
    </PaginaTesto>
  );
}
