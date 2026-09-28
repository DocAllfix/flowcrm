import type { Metadata } from "next";
import { PaginaTesto } from "@/componenti/PaginaTesto";
import { CONTATTI_ATTIVI, DEMO_ATTIVA, EMAIL_CONTATTI, IMPRESA, LEGALI_AGGIORNATI_AL, TITOLARE, hrefTelefono } from "@/lib/sito";

export const metadata: Metadata = {
  title: "Informativa sulla privacy",
  description:
    "Come pmiflow.eu e la demo pubblica di PMIFlow trattano i dati di chi li visita e di chi ci scrive: pochi dati, nessuna profilazione, nessun cookie.",
  alternates: { canonical: "/privacy" },
};

/**
 * Informativa del SITO e della DEMO PUBBLICA (art. 13 GDPR), scritta su misura: niente
 * generatori, perché dichiara solo ciò che il sito fa davvero. Le sezioni su modulo e
 * demo compaiono solo quando quelle funzioni sono accese (stessi interruttori delle
 * pagine), così il testo non promette né nasconde trattamenti.
 *
 * Quella del PRODOTTO, per i dati che i clienti gestiscono in PMIFlow, sta nel contratto
 * e nella nomina a responsabile (art. 28): lì il titolare è il cliente.
 *
 * ⚠️ Se cambia un fornitore o un trattamento, si aggiorna questa pagina E la data in
 * `LEGALI_AGGIORNATI_AL` (lib/sito.ts), che è la stessa della sitemap.
 */
export default function Privacy() {
  const recapito = <a href={`mailto:${EMAIL_CONTATTI}`}>{EMAIL_CONTATTI}</a>;
  return (
    <PaginaTesto occhiello="Legale" titolo="Informativa sulla privacy" percorso="/privacy" aggiornata={LEGALI_AGGIORNATI_AL}>
      <p>
        Questa informativa riguarda il sito <strong>pmiflow.eu</strong>
        {DEMO_ATTIVA && (
          <>
            {" "}e la demo pubblica su <strong>demo.pmiflow.eu</strong>
          </>
        )}
        . In breve: raccogliamo pochissimi dati, solo quelli che servono a far funzionare il sito e a risponderti se ci
        scrivi. Nessuna profilazione, nessuna pubblicità, nessun cookie.
      </p>
      <p>
        Non riguarda i dati che i clienti gestiscono dentro PMIFlow: per quelli il titolare è il cliente, e noi agiamo
        come suoi responsabili del trattamento, secondo il contratto.
      </p>

      <h2>Titolare del trattamento</h2>
      {TITOLARE ? (
        <p>
          <strong>{TITOLARE}</strong>
          {IMPRESA.sede && <>, {IMPRESA.sede}</>}. Per qualsiasi richiesta sui tuoi dati: {recapito}
          {IMPRESA.telefono && (
            <>
              {" "}o <a href={hrefTelefono(IMPRESA.telefono)}>{IMPRESA.telefono}</a>
            </>
          )}
          .
        </p>
      ) : (
        <p>Il nome del titolare viene pubblicato qui prima dell&apos;apertura del modulo contatti.</p>
      )}

      <h2>Quali dati trattiamo, e perché</h2>
      <ul>
        <li>
          <strong>Navigazione.</strong> Come ogni sito, il servizio che lo ospita registra i dati tecnici delle
          richieste: indirizzo IP, data e ora, pagina richiesta, tipo di browser. Servono alla sicurezza e al
          funzionamento del sito. Base giuridica: legittimo interesse (art. 6.1.f GDPR).
        </li>
        {CONTATTI_ATTIVI && (
          <li>
            <strong>Modulo contatti</strong> (sul sito e dentro la demo). Nome, azienda, email, numero di persone che
            userebbero il programma, moduli di interesse ed eventuale messaggio. Servono solo a risponderti e a
            organizzare una presentazione. Base giuridica: misure precontrattuali richieste da te (art. 6.1.b GDPR).
            Non li salviamo in un archivio: la richiesta arriva come email nella casella {recapito}.
          </li>
        )}
        {DEMO_ATTIVA && (
          <li>
            <strong>Demo pubblica.</strong> Si apre senza registrazione, con un account dimostrativo condiviso: non ti
            chiediamo nome né email. Il servizio che la ospita registra gli accessi (indirizzo IP, data e ora) per
            sicurezza e per limitare gli abusi. Quello che scrivi nella demo è visibile agli altri visitatori: non
            inserire dati reali. Base giuridica: legittimo interesse (art. 6.1.f GDPR).
          </li>
        )}
      </ul>

      <h2>Per quanto tempo</h2>
      <ul>
        <li>
          <strong>Dati di navigazione e accessi:</strong> per il tempo previsto dai fornitori che ospitano sito e demo,
          di norma pochi giorni o settimane.
        </li>
        {CONTATTI_ATTIVI && (
          <li>
            <strong>Richieste dal modulo:</strong>{" "}per il tempo necessario a seguirle, e comunque non oltre 24 mesi
            dall&apos;ultimo contatto.
          </li>
        )}
        {DEMO_ATTIVA && (
          <li>
            <strong>Contenuti inseriti nella demo:</strong> cancellati ogni notte, quando la demo torna come nuova.
          </li>
        )}
      </ul>

      <h2>Chi tratta i dati per nostro conto</h2>
      <ul>
        <li>
          <strong>Vercel Inc.</strong>, che ospita il sito, con sede negli Stati Uniti. Il trasferimento è coperto dal
          Data Privacy Framework UE-USA e dalle clausole contrattuali standard della Commissione europea.
        </li>
        {DEMO_ATTIVA && (
          <li>
            <strong>Supabase</strong>, che ospita il database della demo nell&apos;Unione Europea (Francoforte).
          </li>
        )}
        {CONTATTI_ATTIVI && (
          <li>
            <strong>Hostinger</strong>, che gestisce la casella di posta a cui arrivano le richieste del modulo.
          </li>
        )}
      </ul>
      <p>
        Non vendiamo e non cediamo i tuoi dati a nessuno, non li usiamo per pubblicità, non li iscriviamo a newsletter e
        non prendiamo decisioni automatizzate che ti riguardano.
      </p>

      <h2>I tuoi diritti</h2>
      <p>
        Puoi chiedere in ogni momento di accedere ai tuoi dati, correggerli, cancellarli, limitarne l&apos;uso, riceverli
        in un formato leggibile, e opporti al trattamento (artt. 15-22 GDPR)
        {TITOLARE ? <>, scrivendo a {recapito}</> : ", scrivendo al titolare"}. Ti rispondiamo entro un mese. Puoi
        anche proporre reclamo al Garante per la protezione dei dati personali (garanteprivacy.it).
      </p>
      <p>
        Sui cookie, e sulla memoria tecnica che usa la demo, c&apos;è una pagina apposta: <a href="/cookie">Cookie</a>.
      </p>
    </PaginaTesto>
  );
}
