import type { Metadata } from "next";
import { PaginaTesto } from "@/componenti/PaginaTesto";
import { CONTATTI_ATTIVI, IMPRESA, LEGALI_AGGIORNATI_AL } from "@/lib/sito";

export const metadata: Metadata = {
  title: "Informativa sulla privacy",
  description: "Come il sito pmiflow.eu tratta i dati personali di chi lo visita e di chi ci scrive.",
  alternates: { canonical: "/privacy" },
};

/** Informativa del SITO (art. 13 GDPR). Quella del prodotto sta nel contratto e nella nomina art. 28. */
export default function Privacy() {
  return (
    <PaginaTesto occhiello="Legale" titolo="Informativa sulla privacy" percorso="/privacy" aggiornata={LEGALI_AGGIORNATI_AL}>
      <p>
        Questa informativa riguarda il sito <strong>pmiflow.eu</strong>. Non riguarda i dati che i clienti gestiscono
        dentro PMIFlow: per quelli il titolare è il cliente, e noi agiamo come suoi responsabili del trattamento.
      </p>

      <h2>Titolare del trattamento</h2>
      <p>
        {IMPRESA.ragioneSociale ? (
          <>
            {IMPRESA.ragioneSociale}
            {IMPRESA.sede && `, ${IMPRESA.sede}`}
            {IMPRESA.partitaIva && `, P. IVA ${IMPRESA.partitaIva}`}
            {IMPRESA.email && (
              <>
                . Per qualsiasi richiesta: <a href={`mailto:${IMPRESA.email}`}>{IMPRESA.email}</a>
              </>
            )}
            .
          </>
        ) : (
          "I dati del titolare vengono pubblicati qui prima dell'apertura del modulo contatti."
        )}
      </p>

      <h2>Cosa raccogliamo visitando il sito</h2>
      <p>
        Il sito non usa cookie di profilazione né strumenti di tracciamento di terze parti. Il fornitore che lo ospita
        registra, come ogni server web, i dati tecnici della richiesta (indirizzo IP, data e ora, pagina richiesta) per
        garantire sicurezza e funzionamento. Base giuridica: legittimo interesse (art. 6.1.f GDPR).
      </p>

      {CONTATTI_ATTIVI && (
        <>
          <h2>Se ci scrivi dal modulo contatti</h2>
          <p>
            Nome, azienda, email, numero di utenti, moduli di interesse ed eventuale messaggio servono solo a risponderti
            e a organizzare la presentazione. Base giuridica: misure precontrattuali richieste da te (art. 6.1.b GDPR).
            Non salviamo la richiesta in un archivio: arriva come email e resta nella nostra corrispondenza per il tempo
            necessario a seguirla, e comunque non oltre 24 mesi dall&apos;ultimo contatto.
          </p>
        </>
      )}

      <h2>Chi tratta i dati per nostro conto</h2>
      <ul>
        <li>
          <strong>Vercel Inc.</strong> (Stati Uniti), che ospita il sito. Il trasferimento è coperto dal Data Privacy
          Framework UE-USA e dalle clausole contrattuali standard.
        </li>
        {CONTATTI_ATTIVI && (
          <li>
            <strong>Il servizio di invio email</strong> che recapita le richieste del modulo.
          </li>
        )}
      </ul>

      <h2>I tuoi diritti</h2>
      <p>
        Puoi chiedere accesso, rettifica, cancellazione, limitazione e portabilità dei tuoi dati, e opporti al
        trattamento (artt. 15-22 GDPR), scrivendo al titolare. Puoi anche proporre reclamo al Garante per la protezione
        dei dati personali (garanteprivacy.it).
      </p>
    </PaginaTesto>
  );
}
