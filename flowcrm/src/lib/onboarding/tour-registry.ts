/**
 * Registro tour: pattern URL → tour della pagina. Un solo punto di
 * estensione (pattern EduVault). I selettori usano attributi `data-tour`
 * dedicati sugli elementi, non classi CSS (robusti al restyling).
 */
import type { DriveStep } from 'driver.js'
import { buildTour, resetTour, isTourCompleted } from './driver-config'

interface TourEntry {
  pageId: string
  label: string
  match: RegExp
  steps: DriveStep[]
}

const REGISTRY: TourEntry[] = [
  {
    pageId: 'dashboard',
    label: 'Dashboard',
    match: /^\/$/,
    steps: [
      { element: '[data-tour="sidebar"]', popover: { title: 'Il menu', description: 'Da qui raggiungi tutte le aree: anagrafiche, vendite, attività, amministrazione.' } },
      { element: '[data-tour="global-search"]', popover: { title: 'Ricerca rapida', description: 'Premi Ctrl/Cmd + K ovunque per cercare organizzazioni e contatti al volo.' } },
      { element: '[data-tour="notifiche"]', popover: { title: 'Notifiche', description: 'Qui arrivano in tempo reale menzioni, scadenze e promemoria.' } },
    ],
  },
  {
    pageId: 'organizzazioni',
    label: 'Organizzazioni',
    match: /^\/organizzazioni$/,
    steps: [
      { element: '[data-tour="org-filtri"]', popover: { title: 'Filtra per ruolo', description: 'La stessa azienda può essere cliente, fornitore o partner: filtra per vederle raggruppate.' } },
      { element: '[data-tour="nuova-org"]', popover: { title: 'Aggiungi', description: 'Crea una nuova organizzazione, o importa un CSV con il pulsante accanto.' } },
    ],
  },
  {
    pageId: 'kanban',
    label: 'Kanban offerte',
    match: /^\/kanban$/,
    steps: [
      { element: '[data-tour="kanban-board"]', popover: { title: 'La tua pipeline', description: 'Trascina le card tra le colonne per far avanzare i deal di fase. Il valore pesato si aggiorna da solo.' } },
    ],
  },
]

export function findTour(pathname: string): TourEntry | undefined {
  return REGISTRY.find((t) => t.match.test(pathname))
}

/** Avvia il tour della pagina se non già completato (primo accesso). */
export function maybeStartTour(pathname: string): void {
  const entry = findTour(pathname)
  if (!entry || isTourCompleted(entry.pageId)) return
  // rimanda di un frame: gli elementi devono essere nel DOM
  requestAnimationFrame(() => {
    if (document.querySelector(entry.steps[0].element as string)) {
      buildTour(entry.pageId, entry.steps).drive()
    }
  })
}

/** Riavvia forzatamente il tour della pagina (dal bottone "?"). */
export function restartTour(pathname: string): void {
  const entry = findTour(pathname)
  if (!entry) return
  resetTour(entry.pageId)
  buildTour(entry.pageId, entry.steps).drive()
}
