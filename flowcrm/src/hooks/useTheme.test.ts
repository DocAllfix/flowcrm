/**
 * Guardia sul tema chiaro/scuro.
 *
 * Copre il difetto vero che questa revisione corregge: `useTheme()` era
 * consumato SOLO dal Toaster, e siccome applicava la classe dentro un
 * effetto, era un componente di notifiche a decidere il tema di tutta
 * l'applicazione — su una macchina col sistema in scuro la rendeva scura,
 * senza che esistesse un comando per tornare indietro.
 *
 * L'interruttore vive nell'intestazione, che sta dentro l'area
 * autenticata: in browser non è raggiungibile senza le credenziali di
 * prova, quindi il comportamento si verifica qui.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { inizializzaTema, impostaTema, useTheme } from './useTheme'

const CHIAVE = 'flowcrm-tema'

function sistemaScuro(scuro: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: scuro && query.includes('dark'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })),
  )
}

beforeEach(() => {
  localStorage.clear()
  document.documentElement.classList.remove('dark')
  document.documentElement.style.colorScheme = ''
  impostaTema('chiaro')
  localStorage.clear()
})

describe('avvio', () => {
  it('segue la preferenza di sistema quando l\'utente non ha ancora scelto', () => {
    sistemaScuro(true)
    inizializzaTema()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('la scelta dell\'utente batte la preferenza di sistema', () => {
    sistemaScuro(true)
    localStorage.setItem(CHIAVE, 'chiaro')
    inizializzaTema()
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('imposta color-scheme, altrimenti i controlli nativi restano chiari', () => {
    sistemaScuro(true)
    inizializzaTema()
    // Senza questo, in tema scuro un <select> disegnato dal sistema
    // operativo resta bianco accecante in mezzo alla pagina.
    expect(document.documentElement.style.colorScheme).toBe('dark')
  })

  it('usa una chiave di memorizzazione di QUESTO prodotto', () => {
    sistemaScuro(false)
    inizializzaTema()
    impostaTema('scuro')
    expect(localStorage.getItem(CHIAVE)).toBe('scuro')
    // `certdesk-theme` era il nome di un altro prodotto: due prodotti sullo
    // stesso dominio si sarebbero scambiati la preferenza.
    expect(localStorage.getItem('certdesk-theme')).toBeNull()
  })

  it('non esplode se localStorage non è accessibile', () => {
    sistemaScuro(false)
    const getItem = vi
      .spyOn(Storage.prototype, 'getItem')
      .mockImplementation(() => {
        throw new Error('accesso negato')
      })
    expect(() => inizializzaTema()).not.toThrow()
    getItem.mockRestore()
  })
})

describe('stato condiviso', () => {
  it('due consumatori vedono lo stesso tema, non due stati separati', () => {
    sistemaScuro(false)
    inizializzaTema()

    // Uno è l'interruttore nell'intestazione, l'altro è il Toaster.
    const interruttore = renderHook(() => useTheme())
    const toaster = renderHook(() => useTheme())

    expect(interruttore.result.current.isDark).toBe(false)
    expect(toaster.result.current.isDark).toBe(false)

    act(() => interruttore.result.current.alterna())

    expect(interruttore.result.current.isDark).toBe(true)
    // Questa è l'asserzione che conta: con `useState` per consumatore, il
    // Toaster sarebbe rimasto chiaro dentro un'applicazione scura.
    expect(toaster.result.current.isDark).toBe(true)
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('alterna avanti e indietro, e la scelta resta memorizzata', () => {
    sistemaScuro(false)
    inizializzaTema()
    const { result } = renderHook(() => useTheme())

    act(() => result.current.alterna())
    expect(localStorage.getItem(CHIAVE)).toBe('scuro')

    act(() => result.current.alterna())
    expect(localStorage.getItem(CHIAVE)).toBe('chiaro')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })
})
