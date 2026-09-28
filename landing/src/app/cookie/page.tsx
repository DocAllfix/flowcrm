import type { Metadata } from "next";
import { PaginaTesto } from "@/componenti/PaginaTesto";
import { DEMO_ATTIVA, LEGALI_AGGIORNATI_AL } from "@/lib/sito";

export const metadata: Metadata = {
  title: "Cookie",
  description:
    "Il sito pmiflow.eu non usa cookie. La demo pubblica usa solo memoria tecnica del browser, necessaria a farla funzionare: ecco quale, e perché non serve il consenso.",
  alternates: { canonical: "/cookie" },
};

/**
 * Cookie policy su misura. Nessun banner, perché non ce n'è bisogno: il sito non usa
 * cookie, e la demo usa solo memoria TECNICA del browser, esente da consenso (art. 122
 * Codice privacy; Garante, linee guida cookie del 10/06/2021). Va però dichiarata, ed è
 * quello che fa la tabella.
 *
 * ⚠️ La tabella deve combaciare con il codice dell'app (`flowcrm/src`): se la demo
 * comincia a salvare una chiave nuova nel browser, la chiave si aggiunge qui.
 */
const MEMORIA_DEMO: [string, string, string][] = [
  ["sb-…-auth-token", "Tiene aperta la sessione della demo mentre navighi.", "Fino all'uscita o alla scadenza della sessione"],
  ["flowcrm-tour-completed:…", "Ricorda che hai già visto il giro guidato di una pagina, così non riparte.", "Finché non cancelli i dati del browser"],
  ["flowcrm-sidebar-compressa", "Ricorda se hai chiuso la barra laterale.", "Finché non cancelli i dati del browser"],
  ["flowcrm-vista-modulo", "Ricorda quale modulo di settore stai guardando.", "Finché non cancelli i dati del browser"],
  ["certdesk-theme", "Ricorda se hai scelto il tema chiaro o scuro.", "Finché non cancelli i dati del browser"],
  ["pmiflow-invito-contatto", "Evita che l'invito a contattarci ricompaia dopo che l'hai chiuso.", "Fino alla chiusura della scheda"],
];

export default function Cookie() {
  return (
    <PaginaTesto occhiello="Legale" titolo="Cookie" percorso="/cookie" aggiornata={LEGALI_AGGIORNATI_AL}>
      <h2>Il sito</h2>
      <p>
        <strong>pmiflow.eu non usa cookie</strong>: né tecnici, né di profilazione, né di terze parti. Non salva niente
        nel tuo browser e non carica servizi esterni. Caratteri tipografici e immagini arrivano dal nostro stesso
        dominio, quindi la visita non genera richieste verso Google, reti pubblicitarie o social. Per questo non ti
        chiediamo alcun consenso all&apos;apertura della pagina.
      </p>

      {DEMO_ATTIVA && (
        <>
          <h2>La demo</h2>
          <p>
            La demo pubblica su <strong>demo.pmiflow.eu</strong> non usa cookie, ma salva alcune informazioni tecniche
            nella memoria del browser (<em>local storage</em> e <em>session storage</em>). Servono solo a farla
            funzionare: senza la prima non potresti restare dentro mentre navighi. Non servono a riconoscerti, non
            vengono lette da terzi e non profilano nessuno. Per questo, come prevedono le linee guida del Garante
            (10 giugno 2021), non richiedono consenso.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-[0.9375rem]">
              <thead>
                <tr className="border-b border-filo">
                  <th className="py-2 pr-4 font-semibold text-inchiostro">Nome</th>
                  <th className="py-2 pr-4 font-semibold text-inchiostro">A cosa serve</th>
                  <th className="py-2 font-semibold text-inchiostro">Durata</th>
                </tr>
              </thead>
              <tbody>
                {MEMORIA_DEMO.map(([nome, scopo, durata]) => (
                  <tr key={nome} className="border-b border-filo align-top">
                    <td className="py-3 pr-4 font-mono text-[0.8125rem] text-inchiostro">{nome}</td>
                    <td className="py-3 pr-4 text-tenue">{scopo}</td>
                    <td className="py-3 text-tenue">{durata}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Puoi cancellare tutto in ogni momento dalle impostazioni del browser (dati dei siti per
            demo.pmiflow.eu). La demo poi riparte da capo.
          </p>
        </>
      )}

      <h2>Se un giorno cambierà</h2>
      <p>
        Se aggiungeremo uno strumento per misurare le visite, sarà senza cookie e con dati aggregati, e lo scriveremo
        qui prima di attivarlo. Per tutto il resto sui tuoi dati c&apos;è l&apos;<a href="/privacy">informativa sulla
        privacy</a>.
      </p>
    </PaginaTesto>
  );
}
