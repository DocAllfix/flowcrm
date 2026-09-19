import { useCallback, useSyncExternalStore } from 'react'

/**
 * Tema chiaro/scuro dell'istanza.
 *
 * ── Il difetto che questa revisione corregge ────────────────────────
 * `useTheme()` era consumato da **un solo componente**: `ui/sonner.tsx`,
 * che serve a mostrare i toast ed è montato sempre. Il suo effetto
 * scriveva `.dark` su `<html>`. Conseguenza: su una macchina col sistema
 * in tema scuro **l'applicazione diventava scura da sola**, perché un
 * componente di notifiche aveva chiamato un hook — e non esisteva **nessun
 * interruttore** in tutta l'interfaccia per tornare indietro
 * (`toggleTheme` aveva zero utilizzi). Nel frattempo 79 classi di colore
 * fisse non avevano variante scura e diventavano lastre chiare su fondo
 * nero.
 *
 * ── Perché uno store di modulo e non `useState` ─────────────────────
 * Due componenti che chiamano `useTheme()` con `useState` hanno due stati
 * **separati**: l'interruttore nell'intestazione cambierebbe il proprio,
 * e il tema dei toast resterebbe indietro. Qui lo stato è uno solo, del
 * modulo, e `useSyncExternalStore` lo distribuisce a chi lo osserva.
 *
 * ── Perché si applica all'avvio e non al primo render ───────────────
 * `inizializzaTema()` viene chiamata in `main.tsx` accanto al tema del
 * cliente, prima che React monti: applicarlo dopo il primo render
 * mostrerebbe un lampo chiaro a chi lavora in scuro.
 */

export type Tema = 'chiaro' | 'scuro'

// `certdesk-theme` era il nome di un ALTRO prodotto, rimasto da un
// riutilizzo. Due prodotti serviti dallo stesso dominio si sarebbero
// scambiati la preferenza.
const CHIAVE = 'flowcrm-tema'

function leggiPreferenza(): Tema | null {
  try {
    const v = localStorage.getItem(CHIAVE)
    return v === 'scuro' || v === 'chiaro' ? v : null
  } catch {
    // Finestra anonima o cookie di terze parti bloccati: non è un errore,
    // si ricade sulla preferenza di sistema.
    return null
  }
}

const preferenzaDiSistema = (): Tema =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'scuro'
    : 'chiaro'

let corrente: Tema = 'chiaro'
const osservatori = new Set<() => void>()

function applica(tema: Tema): void {
  document.documentElement.classList.toggle('dark', tema === 'scuro')
  // `color-scheme` fa seguire il tema anche alle barre di scorrimento e ai
  // controlli disegnati dal sistema operativo: senza, in tema scuro un
  // <select> nativo resta bianco accecante.
  document.documentElement.style.colorScheme = tema === 'scuro' ? 'dark' : 'light'
}

/** Da chiamare una volta sola all'avvio, prima che React monti. */
export function inizializzaTema(): void {
  corrente = leggiPreferenza() ?? preferenzaDiSistema()
  applica(corrente)

  // Finché l'utente non sceglie esplicitamente, si segue il sistema anche
  // se cambia mentre l'applicazione è aperta (succede all'imbrunire con le
  // impostazioni automatiche di Windows e macOS).
  if (!leggiPreferenza()) {
    window
      .matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (e) => {
        if (leggiPreferenza()) return
        corrente = e.matches ? 'scuro' : 'chiaro'
        applica(corrente)
        osservatori.forEach((o) => o())
      })
  }
}

export function impostaTema(tema: Tema): void {
  corrente = tema
  applica(tema)
  try {
    localStorage.setItem(CHIAVE, tema)
  } catch {
    // La scelta vale comunque per questa sessione.
  }
  osservatori.forEach((o) => o())
}

function sottoscrivi(osservatore: () => void): () => void {
  osservatori.add(osservatore)
  return () => osservatori.delete(osservatore)
}

const leggi = (): Tema => corrente

export function useTheme() {
  const tema = useSyncExternalStore(sottoscrivi, leggi, leggi)
  const alterna = useCallback(
    () => impostaTema(corrente === 'scuro' ? 'chiaro' : 'scuro'),
    [],
  )
  return { tema, isDark: tema === 'scuro', impostaTema, alterna }
}
