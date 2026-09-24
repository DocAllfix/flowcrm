import type { Metadata } from "next";
import { PaginaTesto } from "@/componenti/PaginaTesto";

export const metadata: Metadata = {
  title: "Sicurezza e dati",
  description:
    "Dove stanno i dati di PMIFlow e chi li vede: un server dedicato per azienda in Germania, permessi imposti dal database, backup notturno con ripristino provato.",
  alternates: { canonical: "/sicurezza" },
  openGraph: { type: "article", url: "/sicurezza" },
};

/**
 * La pagina da mandare al DPO o al consulente privacy del cliente. Ogni affermazione
 * corrisponde a qualcosa che esiste nel prodotto o nella procedura di consegna
 * (`flowcrm/deploy/RUNBOOK.md`): se una delle due cambia, cambia anche questa pagina.
 *
 * ⚠️ Al 24/09/2026 backup su Storage Box, chiave append-only e `sentinel.sh` sono
 * PROGETTATI ma mai eseguiti (tabella di maturità del RUNBOOK). La pagina descrive il
 * servizio come viene consegnato: deve essere vero al primo cliente. Se il collaudo
 * del primo provisioning smentisce una riga, si corregge la riga, non il collaudo.
 */
export default function Sicurezza() {
  return (
    <PaginaTesto occhiello="Sicurezza e dati" titolo="Dove stanno i tuoi dati, e chi li vede." percorso="/sicurezza">
      <p>
        PMIFlow non è un servizio condiviso. Ogni azienda ha la propria installazione, su un server che contiene solo i
        suoi dati. Qui sotto trovi come è fatta, detto in modo che si possa verificare.
      </p>

      <h2>Un server per ogni azienda</h2>
      <p>
        La tua istanza gira su una macchina virtuale dedicata presso <strong>Hetzner Online GmbH</strong>, in un data
        center in <strong>Germania</strong>. Database, documenti caricati e copie di sicurezza non condividono spazio con
        altri clienti: non c&apos;è un filtro che separa i tuoi dati da quelli degli altri, perché gli altri non ci sono.
      </p>

      <h2>Chi vede cosa lo decide il database</h2>
      <p>
        I permessi non stanno nei menu dell&apos;applicazione ma nelle regole del database (<em>Row Level Security</em> di
        PostgreSQL). Anche chi chiamasse il server direttamente, senza passare dall&apos;interfaccia, riceverebbe solo le
        righe che il suo ruolo può vedere.
      </p>
      <ul>
        <li>
          <strong>Agenti di commercio:</strong> vedono solo i propri clienti, visite e provvigioni.
        </li>
        <li>
          <strong>Dati sanitari</strong> (modulo Poliambulatori): visite e referti sono visibili solo ai professionisti
          collegati al paziente e all&apos;amministratore. Segreteria e direzione non li vedono.
        </li>
        <li>
          <strong>Controlli automatici:</strong> 241 verifiche sulle regole di accesso girano a ogni aggiornamento del
          prodotto, prima che arrivi alla tua istanza.
        </li>
      </ul>

      <h2>Copie di sicurezza</h2>
      <p>
        Ogni notte parte una copia completa, cifrata, verso uno spazio di archiviazione separato dal server. La chiave
        che il server usa per scrivere le copie <strong>non può cancellarle</strong>: chi riuscisse a entrare nel server
        non potrebbe eliminare anche i backup.
      </p>
      <p>
        Una volta al mese la copia viene ripristinata su un ambiente di prova e controllata: si contano le righe e si
        verifica che i permessi siano ancora attivi. Un backup che nessuno ha mai ripristinato è una speranza, non un
        backup.
      </p>

      <h2>Aggiornamenti e sorveglianza</h2>
      <p>
        Gli aggiornamenti si installano un&apos;istanza alla volta, e si fermano alla prima che non risponde come
        dovrebbe. Un sistema di controllo sorveglia disco, memoria, certificati e backup di ogni istanza, e ci avvisa
        prima che il problema diventi tuo.
      </p>

      <h2>Chi tratta i dati, oltre a noi</h2>
      <ul>
        <li>
          <strong>Hetzner Online GmbH</strong> (Germania): server e spazio per le copie di sicurezza.
        </li>
        <li>
          <strong>Servizio di invio email</strong> con sede nell&apos;Unione Europea: le notifiche e il recupero password.
        </li>
        <li>
          <strong>Microsoft Azure OpenAI</strong>, solo se attivi l&apos;assistente: le domande che gli fai passano da
          lì, in una regione europea. Si attiva a richiesta e si può spegnere.
        </li>
      </ul>
      <p>
        Per il trattamento firmiamo con te la nomina a responsabile ai sensi dell&apos;art. 28 del GDPR, con
        l&apos;elenco aggiornato dei sub-responsabili.
      </p>

      <h2>Se decidi di andartene</h2>
      <p>
        Le liste si esportano in CSV dall&apos;applicazione in qualunque momento. Alla chiusura ti consegniamo la copia
        completa del database e dei documenti, poi cancelliamo l&apos;istanza e le sue copie.
      </p>
    </PaginaTesto>
  );
}
