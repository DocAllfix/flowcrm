import type { Metadata } from "next";
import { PaginaTesto } from "@/componenti/PaginaTesto";
import { LEGALI_AGGIORNATI_AL } from "@/lib/sito";

export const metadata: Metadata = {
  title: "Termini di utilizzo del sito",
  description: "Condizioni di utilizzo del sito pmiflow.eu: natura delle informazioni pubblicate, proprietà dei contenuti, collegamenti esterni e legge applicabile.",
  alternates: { canonical: "/termini" },
};

/** Termini del SITO. Il servizio PMIFlow ha un contratto proprio, firmato con il cliente. */
export default function Termini() {
  return (
    <PaginaTesto occhiello="Legale" titolo="Termini di utilizzo del sito" percorso="/termini" aggiornata={LEGALI_AGGIORNATI_AL}>
      <p>
        Questo sito presenta il servizio PMIFlow. Le informazioni pubblicate hanno scopo descrittivo e non costituiscono
        un&apos;offerta contrattuale: le condizioni del servizio sono quelle del contratto firmato con ciascun cliente.
      </p>
      <h2>Proprietà dei contenuti</h2>
      <p>
        Testi, marchio PMIFlow e grafica del sito appartengono ai rispettivi titolari. Puoi citarli con indicazione della
        fonte; per altri usi scrivici.
      </p>
      <h2>Collegamenti esterni</h2>
      <p>I collegamenti verso siti di terzi sono forniti per comodità: non rispondiamo dei loro contenuti.</p>
      <h2>Legge applicabile</h2>
      <p>Questi termini sono regolati dalla legge italiana.</p>
    </PaginaTesto>
  );
}
