/**
 * Rete di sicurezza per gli errori di rendering.
 *
 * Senza questo, un'eccezione lanciata dentro un componente smonta l'intero
 * albero React e l'utente resta davanti a una **pagina bianca**, senza alcun
 * messaggio e senza modo di dirci cosa è successo.
 *
 * Il fallback mostra il codice dell'evento: il cliente ci legge quella stringa
 * al telefono e noi cerchiamo l'errore sul collettore senza chiedergli nulla
 * di ciò che stava facendo.
 *
 * Volutamente povero di dipendenze: deve funzionare anche quando è il tema,
 * un provider o il layout ad essere rotto, quindi niente componenti UI del
 * progetto e stili inline.
 */
import * as Sentry from '@sentry/react'
import type { ReactNode } from 'react'
import { telemetriaAttiva } from '@/lib/telemetria'

function Fallback({ eventId }: { eventId: string | null }) {
  return (
    <div
      role="alert"
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        fontFamily: 'system-ui, sans-serif',
        background: '#f8fafc',
        color: '#0f172a',
      }}
    >
      <div style={{ maxWidth: '32rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 8px' }}>
          Qualcosa è andato storto
        </h1>
        <p style={{ margin: '0 0 20px', lineHeight: 1.5, color: '#475569' }}>
          La pagina non è riuscita a caricarsi. I dati salvati non sono stati
          toccati: puoi ricaricare e riprendere da dove eri.
        </p>

        {eventId && (
          <p style={{ margin: '0 0 20px', fontSize: '0.875rem', color: '#64748b' }}>
            Codice da comunicare all'assistenza:{' '}
            <code
              style={{
                fontFamily: 'ui-monospace, monospace',
                background: '#e2e8f0',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              {eventId}
            </code>
          </p>
        )}

        <button
          onClick={() => window.location.reload()}
          style={{
            padding: '10px 20px',
            fontSize: '0.938rem',
            fontWeight: 500,
            color: '#fff',
            background: '#0f172a',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Ricarica la pagina
        </button>
      </div>
    </div>
  )
}

export function ErrorBoundary({ children }: { children: ReactNode }) {
  // Senza DSN configurato non c'è eventId da mostrare, ma la protezione dalla
  // pagina bianca deve valere lo stesso: il boundary resta sempre montato.
  return (
    <Sentry.ErrorBoundary
      fallback={({ eventId }) => (
        <Fallback eventId={telemetriaAttiva() ? eventId : null} />
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  )
}
