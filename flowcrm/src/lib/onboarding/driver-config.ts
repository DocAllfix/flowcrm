/**
 * Onboarding driver.js — config base (port EduVault, adattato a FlowCRM).
 * Spotlight calmo, professionale; brand arancio discreto. Testi in italiano.
 */
import { driver as createDriver, type Driver } from 'driver.js'
import type { Config, DriverHook, DriveStep } from 'driver.js'

const TOUR_KEY_PREFIX = 'flowcrm-tour-completed:'

export function isTourCompleted(pageId: string): boolean {
  return window.localStorage.getItem(`${TOUR_KEY_PREFIX}${pageId}`) === '1'
}
export function markTourCompleted(pageId: string): void {
  window.localStorage.setItem(`${TOUR_KEY_PREFIX}${pageId}`, '1')
}
export function resetTour(pageId: string): void {
  window.localStorage.removeItem(`${TOUR_KEY_PREFIX}${pageId}`)
}

const BASE_CONFIG: Partial<Config> = {
  showProgress: true,
  allowClose: true,
  smoothScroll: true,
  disableActiveInteraction: true,
  stagePadding: 8,
  stageRadius: 8,
  popoverClass: 'flowcrm-popover',
  overlayColor: 'rgb(15 23 42 / 0.5)',
  nextBtnText: 'Avanti →',
  prevBtnText: '← Indietro',
  doneBtnText: 'Fatto',
  // driver.js v1.4: allowClose mostra la X ma non la wira al destroy → esplicito
  onCloseClick: (_el, _step, opts) => opts.driver.destroy(),
}

/** Crea un tour con la config base; marca completato alla chiusura. */
export function buildTour(pageId: string, steps: DriveStep[]): Driver {
  const onDestroyStarted: DriverHook = (_el, _step, opts) => {
    markTourCompleted(pageId)
    // completa il ciclo di vita di driver.js (altrimenti resta "attivo")
    opts.driver.destroy()
  }
  return createDriver({ ...BASE_CONFIG, steps, onDestroyStarted })
}
