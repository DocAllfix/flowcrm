/**
 * Guardie sulla shell autenticata.
 *
 * ── Perché in jsdom e non in browser ────────────────────────────────
 * Barra laterale e intestazione vivono dentro l'area autenticata, e
 * questo ambiente non ha credenziali di prova (le 25 spec Playwright che
 * le richiedono si auto-saltano per lo stesso motivo). Ciò che si può
 * verificare senza un server si verifica qui, invece di dichiararlo e
 * basta.
 *
 * Coprono i due difetti veri corretti nella Fase 5: la voce di menu
 * corrente che spostava il testo di 3px a ogni navigazione, e il bottone
 * di ricerca che apriva la palette **fabbricando una pressione di tasti**.
 */
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// I moduli verticali dipendono dalla configurazione dell'istanza: qui si
// prova la shell del CRM base, che è ciò che vede ogni cliente.
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'u1' },
    userProfile: { id: 'u1', nome: 'Giulia', cognome: 'Rossi', ruolo: 'admin' },
    isAdmin: true,
    isManager: true,
    isLoading: false,
    logout: vi.fn(),
  }),
}))

import { Sidebar } from './Sidebar'
import { apriPalette } from '@/components/CommandPalette'
import { TooltipProvider } from '@/components/ui/tooltip'
import { VistaModuloProvider } from './VistaModuloContext'

afterEach(cleanup)
beforeEach(() => localStorage.clear())

function rendiSidebar(percorso = '/contatti', compressa = false) {
  return render(
    <MemoryRouter initialEntries={[percorso]}>
      <TooltipProvider>
        <VistaModuloProvider>
          <Sidebar
            open
            onClose={vi.fn()}
            compressa={compressa}
            onToggleCompressa={vi.fn()}
          />
        </VistaModuloProvider>
      </TooltipProvider>
    </MemoryRouter>,
  )
}

describe('voce di navigazione corrente', () => {
  it('non porta una striscia laterale colorata', () => {
    rendiSidebar('/contatti')
    const attiva = screen.getByRole('link', { name: 'Contatti' })
    // `border-l-[3px]` è il divieto assoluto n.1 di DESIGN.md ed era anche
    // la causa dello spostamento: un bordo allarga la scatola.
    expect(attiva.className).not.toMatch(/border-l/)
  })

  it('attiva e inattiva hanno lo stesso rientro: il testo non si sposta', () => {
    rendiSidebar('/contatti')
    const attiva = screen.getByRole('link', { name: 'Contatti' })
    const inattiva = screen.getByRole('link', { name: 'Organizzazioni' })

    const rientro = (c: string) => c.match(/(?:^|\s)(px-\d+(?:\.\d+)?)/)?.[1]
    expect(rientro(attiva.className)).toBe(rientro(inattiva.className))

    // L'indicatore c'è, ma come pseudo-elemento posizionato: sta fuori dal
    // flusso, quindi non muove niente.
    expect(attiva.className).toMatch(/before:absolute/)
  })

  it('la voce corrente è annunciata come tale', () => {
    rendiSidebar('/contatti')
    expect(
      screen.getByRole('link', { name: 'Contatti' }).getAttribute('aria-current'),
    ).toBe('page')
  })

  it('la radice non resta attiva sulle altre pagine', () => {
    rendiSidebar('/contatti')
    expect(
      screen.getByRole('link', { name: 'Dashboard' }).getAttribute('aria-current'),
    ).toBeNull()
  })
})

describe('barra compressa', () => {
  it('le etichette restano leggibili da uno screen reader', () => {
    rendiSidebar('/contatti', true)
    // Compressa mostra solo icone: senza questo, chi usa uno screen reader
    // troverebbe una fila di collegamenti senza nome.
    const voce = screen.getByRole('link', { name: 'Contatti' })
    expect(voce.querySelector('.sr-only')?.textContent).toBe('Contatti')
  })

  it('offre il comando per riaprirla', () => {
    rendiSidebar('/contatti', true)
    expect(
      screen.getByRole('button', { name: 'Espandi la barra laterale' }),
    ).toBeTruthy()
  })
})

describe('apertura della ricerca globale', () => {
  it('usa un evento con un nome proprio, non una pressione di tasti finta', () => {
    const tasti = vi.fn()
    const nostro = vi.fn()
    window.addEventListener('keydown', tasti)
    window.addEventListener('flowcrm:apri-palette', nostro)

    apriPalette()

    expect(nostro).toHaveBeenCalledOnce()
    // Prima si costruiva un KeyboardEvent Ctrl+K e lo si lanciava su
    // window: attivava anche qualunque altro ascoltatore di quella
    // scorciatoia, estensioni del browser comprese.
    expect(tasti).not.toHaveBeenCalled()

    window.removeEventListener('keydown', tasti)
    window.removeEventListener('flowcrm:apri-palette', nostro)
  })
})

describe('bersagli di tocco', () => {
  it('i comandi solo-icona portano la classe che allarga l\'area sensibile', () => {
    rendiSidebar('/contatti')
    const chiudi = screen.getByRole('button', { name: 'Chiudi il menu' })
    // `tocco-comodo` allarga l'area a 44px SOLO con pointer:coarse, così
    // il dito arriva senza che il desktop perda densità.
    expect(chiudi.className).toContain('tocco-comodo')
  })
})

describe('comportamento su mobile', () => {
  it('un clic su una voce chiude il menu su mobile', () => {
    const onClose = vi.fn()
    render(
      <MemoryRouter initialEntries={['/']}>
        <TooltipProvider>
          <VistaModuloProvider>
            <Sidebar
              open
              onClose={onClose}
              compressa={false}
              onToggleCompressa={vi.fn()}
            />
          </VistaModuloProvider>
        </TooltipProvider>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('link', { name: 'Contatti' }))
    expect(onClose).toHaveBeenCalled()
  })
})
