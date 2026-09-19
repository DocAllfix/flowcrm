/**
 * Guardie sulle primitive introdotte nella Fase 3.
 *
 * Verificano i comportamenti che è facile perdere in un refactoring e che
 * nessun typecheck vede: l'attivazione da tastiera delle righe, l'assenza
 * di ombra a riposo, il movimento sotto `motion-safe`, gli attributi ARIA.
 *
 * Niente `@testing-library/jest-dom`: non c'è un file di setup in
 * `vitest.config.ts`, e i suoi matcher senza setup non esistono. Si
 * asserisce sul DOM vero, che è comunque più esplicito.
 */
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Inbox } from 'lucide-react'

import { Card } from './card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, CollegamentoRiga,
} from './table'
import { Skeleton, SkeletonTabella } from './skeleton'
import { Progress } from './progress'
import { EmptyState } from './empty-state'
import { PageHeader } from './page-header'

afterEach(cleanup)

describe('TableRow — puntatore sulla riga, tastiera sul collegamento', () => {
  const RigaDiProva = ({ onActivate }: { onActivate: () => void }) => (
    <MemoryRouter>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead numerica>Importo</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow onActivate={onActivate}>
            <TableCell>
              <CollegamentoRiga to="/contatti/1">Acme Srl</CollegamentoRiga>
            </TableCell>
            <TableCell numerica>1.240,00</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </MemoryRouter>
  )

  it('la riga NON prende il focus e NON porta un aria-label', () => {
    render(<RigaDiProva onActivate={() => {}} />)
    const riga = screen.getByText('1.240,00').closest('tr')!
    // Su un elemento di riga `aria-label` sostituisce l'annuncio delle
    // celle: chi usa uno screen reader sentirebbe la stessa frase su ogni
    // riga invece del contenuto. La riga resta una riga.
    expect(riga.getAttribute('tabindex')).toBeNull()
    expect(riga.getAttribute('aria-label')).toBeNull()
  })

  it('la via da tastiera è un collegamento vero, annunciato col nome', () => {
    render(<RigaDiProva onActivate={() => {}} />)
    const collegamento = screen.getByRole('link', { name: 'Acme Srl' })
    expect(collegamento.getAttribute('href')).toBe('/contatti/1')
  })

  it('la riga intera si illumina quando il focus entra nel collegamento', () => {
    render(<RigaDiProva onActivate={() => {}} />)
    const riga = screen.getByText('1.240,00').closest('tr')!
    expect(riga.className).toContain('focus-within:bg-muted/50')
  })

  it('il puntatore apre la scheda cliccando ovunque sulla riga', () => {
    const attiva = vi.fn()
    render(<RigaDiProva onActivate={attiva} />)
    fireEvent.click(screen.getByText('1.240,00'))
    expect(attiva).toHaveBeenCalledTimes(1)
  })

  it('una riga non attivabile non diventa cliccabile', () => {
    render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Solo lettura</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    )
    const riga = screen.getByText('Solo lettura').closest('tr')!
    expect(riga.className).not.toContain('cursor-pointer')
  })

  it('numeri e date vanno a destra, testata compresa', () => {
    render(<RigaDiProva onActivate={() => {}} />)
    expect(screen.getByText('Importo').className).toContain('text-right')
    expect(screen.getByText('1.240,00').className).toContain('text-right')
    expect(screen.getByText('Nome').className).toContain('text-left')
  })

  it('la tabella sta dentro un contenitore che scorre da solo', () => {
    render(<RigaDiProva onActivate={() => {}} />)
    const contenitore = document.querySelector('[data-slot="table-container"]')!
    expect(contenitore.className).toContain('overflow-x-auto')
  })
})

describe('Card — piatta a riposo', () => {
  it('a riposo non ha ombra', () => {
    render(<Card>contenuto</Card>)
    const card = screen.getByText('contenuto')
    expect(card.className).not.toMatch(/(^|\s)shadow-/)
  })

  it('cliccabile, acquista l\'ombra solo al passaggio del puntatore', () => {
    render(<Card interattiva>cliccabile</Card>)
    const card = screen.getByText('cliccabile')
    expect(card.className).toContain('hover:shadow-risposta')
    expect(card.className).not.toMatch(/(^|\s)shadow-risposta/)
    expect(card.className).toContain('cursor-pointer')
  })
})

describe('Skeleton — il movimento è facoltativo, il segnaposto no', () => {
  it('pulsa solo con motion-safe ed è invisibile agli screen reader', () => {
    render(<Skeleton className="h-4 w-20" />)
    const s = document.querySelector('[data-slot="skeleton"]')!
    expect(s.className).toContain('motion-safe:animate-pulse')
    expect(s.className).not.toMatch(/(^|\s)animate-pulse/)
    expect(s.getAttribute('aria-hidden')).toBe('true')
  })

  it('lo scheletro di tabella riproduce righe e colonne richieste', () => {
    const { container } = render(<SkeletonTabella righe={3} colonne={5} />)
    const segnaposti = container.querySelectorAll('[data-slot="skeleton"]')
    // 5 nell'intestazione + 3 righe da 5
    expect(segnaposti.length).toBe(5 + 3 * 5)
  })
})

describe('Progress', () => {
  it('espone valore, minimo, massimo ed etichetta', () => {
    render(<Progress value={30} max={120} etichetta="Avanzamento commessa" />)
    const barra = screen.getByRole('progressbar')
    expect(barra.getAttribute('aria-valuenow')).toBe('30')
    expect(barra.getAttribute('aria-valuemax')).toBe('120')
    expect(barra.getAttribute('aria-label')).toBe('Avanzamento commessa')
  })

  it('anima transform e non width, e riporta dentro i valori fuori scala', () => {
    render(<Progress value={250} etichetta="Oltre il massimo" />)
    const indicatore = document.querySelector<HTMLElement>(
      '[data-slot="progress-indicator"]',
    )!
    expect(indicatore.style.transform).toBe('scaleX(1)')
    expect(indicatore.className).toContain('motion-safe:transition-transform')
    expect(indicatore.className).not.toContain('transition-[width]')
  })

  it('un massimo a zero non produce NaN', () => {
    render(<Progress value={5} max={0} etichetta="Nessun obiettivo" />)
    const indicatore = document.querySelector<HTMLElement>(
      '[data-slot="progress-indicator"]',
    )!
    expect(indicatore.style.transform).toBe('scaleX(0)')
  })
})

describe('EmptyState — mai un vuoto grigio', () => {
  it('avvisa in sviluppo se non propone un passo successivo', () => {
    const avviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<EmptyState icon={Inbox} title="Nessuna commessa" />)
    expect(avviso).toHaveBeenCalledOnce()
    avviso.mockRestore()
  })

  it('non avvisa quando il vuoto è dovuto a un filtro', () => {
    const avviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<EmptyState icon={Inbox} title="Nessun risultato" filtrato />)
    expect(avviso).not.toHaveBeenCalled()
    avviso.mockRestore()
  })

  it('non avvisa quando l\'azione c\'è', () => {
    const avviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(
      <EmptyState icon={Inbox} title="Nessuna commessa" action={<button>Crea</button>} />,
    )
    expect(avviso).not.toHaveBeenCalled()
    avviso.mockRestore()
  })
})

describe('PageHeader', () => {
  const conRouter = (ui: React.ReactElement) =>
    render(<MemoryRouter>{ui}</MemoryRouter>)

  it('mantiene la firma che usano le 31 pagine esistenti', () => {
    conRouter(<PageHeader title="Contatti" description="Tutte le persone" />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Contatti')
    expect(screen.getByText('Tutte le persone')).toBeTruthy()
  })

  it('le briciole segnano la voce corrente e non la rendono un collegamento', () => {
    conRouter(
      <PageHeader
        title="Acme Srl"
        briciole={[{ label: 'Organizzazioni', to: '/organizzazioni' }, { label: 'Acme Srl' }]}
      />,
    )
    expect(screen.getByRole('link', { name: 'Organizzazioni' })).toBeTruthy()
    const corrente = screen.getByText('Acme Srl', { selector: 'span' })
    expect(corrente.getAttribute('aria-current')).toBe('page')
  })

  it('i numeri portano data-slot="kpi" — è ciò che li rende tabellari', () => {
    conRouter(
      <PageHeader
        title="Fatture"
        numeri={[{ etichetta: 'da incassare', valore: '12.400,00' }]}
      />,
    )
    const kpi = document.querySelector('[data-slot="kpi"]')!
    expect(kpi.textContent).toBe('12.400,00')
  })

  it('in caricamento mostra un segnaposto, MAI uno zero provvisorio', () => {
    conRouter(
      <PageHeader
        title="Fatture"
        numeri={[{ etichetta: 'da incassare', valore: 0, inCaricamento: true }]}
      />,
    )
    const kpi = document.querySelector('[data-slot="kpi"]')!
    expect(kpi.textContent).toBe('')
    expect(kpi.querySelector('[aria-hidden]')).toBeTruthy()
  })
})
