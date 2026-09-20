/**
 * Guardia sul senso del luogo.
 *
 * `posizioneCorrente` è ciò che permette all'intestazione di dire dove si
 * è e, dentro una scheda di dettaglio, di offrire la via di ritorno
 * all'elenco. Le regole che sembrano dettagli e non lo sono: la voce `/`
 * è prefisso di qualunque percorso, e `/commesse/42` deve risolvere in
 * «Commesse», non nella voce il cui percorso è stato dichiarato per primo.
 */
import { describe, it, expect } from 'vitest'
import { LayoutDashboard } from 'lucide-react'
import { posizioneCorrente, type NavSection } from './nav.config'

const SEZIONI: NavSection[] = [
  {
    id: 'dashboard',
    title: null,
    items: [{ label: 'Dashboard', path: '/', icon: LayoutDashboard }],
  },
  {
    id: 'crm',
    title: 'CRM',
    items: [
      { label: 'Organizzazioni', path: '/organizzazioni', icon: LayoutDashboard },
      { label: 'Contatti', path: '/contatti', icon: LayoutDashboard },
    ],
  },
  {
    id: 'lavoro',
    title: 'Lavoro',
    items: [
      { label: 'Commesse', path: '/commesse', icon: LayoutDashboard },
      // Volutamente dopo, e con un percorso più lungo: è il caso che
      // rompe una ricerca «primo che corrisponde».
      { label: 'Commesse archiviate', path: '/commesse/archivio', icon: LayoutDashboard },
    ],
  },
]

describe('posizioneCorrente', () => {
  it('riconosce una voce di elenco e la marca come non-dettaglio', () => {
    const p = posizioneCorrente('/contatti', SEZIONI)
    expect(p).toEqual({
      sezione: 'CRM',
      voce: 'Contatti',
      path: '/contatti',
      dettaglio: false,
    })
  })

  it('una pagina di dettaglio risale alla propria voce di elenco', () => {
    const p = posizioneCorrente('/contatti/8f3c', SEZIONI)
    expect(p?.voce).toBe('Contatti')
    expect(p?.path).toBe('/contatti')
    // È questo che fa comparire il collegamento di ritorno all'elenco.
    expect(p?.dettaglio).toBe(true)
  })

  it('la radice NON cattura tutti gli altri percorsi', () => {
    // `/` è prefisso di qualunque cosa: accettarlo per prefisso farebbe
    // dire «Dashboard» in ogni schermata del prodotto.
    expect(posizioneCorrente('/', SEZIONI)?.voce).toBe('Dashboard')
    expect(posizioneCorrente('/contatti', SEZIONI)?.voce).toBe('Contatti')
  })

  it('vince il percorso più lungo, non il primo dichiarato', () => {
    expect(posizioneCorrente('/commesse/archivio', SEZIONI)?.voce).toBe(
      'Commesse archiviate',
    )
    expect(posizioneCorrente('/commesse/42', SEZIONI)?.voce).toBe('Commesse')
  })

  it('un prefisso parziale non conta come corrispondenza', () => {
    // `/commessenuove` comincia per `/commesse` ma non è sotto di essa.
    expect(posizioneCorrente('/commessenuove', SEZIONI)).toBeNull()
  })

  it('un percorso sconosciuto non inventa una posizione', () => {
    expect(posizioneCorrente('/pagina-che-non-esiste', SEZIONI)).toBeNull()
  })

  it('una sezione senza titolo non ne inventa uno', () => {
    expect(posizioneCorrente('/', SEZIONI)?.sezione).toBeNull()
  })
})
