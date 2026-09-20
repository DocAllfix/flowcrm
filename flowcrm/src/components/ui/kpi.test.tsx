/**
 * Guardie sulla scheda KPI.
 *
 * La prima è quella che conta: **mentre il dato arriva non deve comparire
 * nessuna cifra**. Non è una preferenza estetica. Le cinque copie che questa
 * primitiva sostituisce scrivevano `String(kpi?.campo ?? 0)`, e per tutto il
 * tempo della query mostravano uno `0` — un numero falso, leggibile, sotto
 * un'etichetta che lo dichiara vero. Su un cruscotto economico qualcuno può
 * guardarlo e basta. Un typecheck non lo vede, un occhio distratto in
 * revisione nemmeno: l'unico modo di impedirne il ritorno è asserirlo.
 *
 * Niente `@testing-library/jest-dom` (nessun file di setup in
 * `vitest.config.ts`): si asserisce sul DOM vero.
 */
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Euro } from 'lucide-react'

import { SchedaKpi } from './kpi'

afterEach(cleanup)

const conRouter = (nodo: React.ReactNode) =>
  render(<MemoryRouter>{nodo}</MemoryRouter>)

describe('SchedaKpi', () => {
  it('mentre il dato non è arrivato non mostra NESSUNA cifra', () => {
    const { container } = conRouter(
      <SchedaKpi icona={Euro} etichetta="Fatturato anno" tinta="bg-muted" valore={undefined} />,
    )
    // Nessun carattere numerico in tutto il testo reso: né 0, né altro.
    expect(container.textContent).not.toMatch(/[0-9]/)
    // E c'è un segnaposto, quindi la scatola non cambia misura dopo.
    expect(container.querySelector('[aria-hidden]')).not.toBeNull()
  })

  it('dichiara «dato in arrivo» nel nome accessibile, non un numero', () => {
    conRouter(
      <SchedaKpi icona={Euro} etichetta="Scaduto" tinta="bg-muted" valore={undefined} />,
    )
    expect(screen.getByLabelText(/Scaduto: dato in arrivo/)).toBeTruthy()
  })

  it('uno zero VERO si vede, e non va confuso col dato mancante', () => {
    const { container } = conRouter(
      <SchedaKpi icona={Euro} etichetta="Scaduto" tinta="bg-muted" valore={0} />,
    )
    expect(container.textContent).toMatch(/0/)
    expect(screen.getByLabelText(/Scaduto: 0/)).toBeTruthy()
  })

  it('porta il data-slot che attiva le cifre tabellari', () => {
    const { container } = conRouter(
      <SchedaKpi icona={Euro} etichetta="Contatti" tinta="bg-muted" valore={42} />,
    )
    expect(container.querySelector('[data-slot="kpi"]')).not.toBeNull()
  })

  it('con `a` diventa un collegamento, e il nome dice dove porta', () => {
    conRouter(
      <SchedaKpi icona={Euro} etichetta="Contatti" tinta="bg-muted" valore={7} a="/contatti" ampia />,
    )
    const collegamento = screen.getByRole('link')
    expect(collegamento.getAttribute('href')).toBe('/contatti')
    expect(collegamento.getAttribute('aria-label')).toMatch(/Contatti: 7\. Apri l'elenco/)
  })

  it('senza `a` non è un collegamento: niente bersagli finti', () => {
    conRouter(
      <SchedaKpi icona={Euro} etichetta="Contatti" tinta="bg-muted" valore={7} />,
    )
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('un valore non numerico («—») passa intatto e non viene formattato', () => {
    const { container } = conRouter(
      <SchedaKpi icona={Euro} etichetta="Tasso" tinta="bg-muted" valore="—" formato="percentuale" />,
    )
    expect(container.textContent).toContain('—')
    expect(container.textContent).not.toMatch(/[0-9]/)
  })

  it('la nota non compare finché il dato non è arrivato', () => {
    // Altrimenti si leggerebbe «+3 nel mese» accanto a un segnaposto vuoto,
    // cioè un dettaglio di un numero che non c'è ancora.
    const { container } = conRouter(
      <SchedaKpi icona={Euro} etichetta="Pazienti" tinta="bg-muted" valore={undefined} nota="+3 nel mese" />,
    )
    expect(container.textContent).not.toContain('nel mese')
  })
})
