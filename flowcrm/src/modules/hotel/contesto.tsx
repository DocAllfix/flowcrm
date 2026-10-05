/**
 * Contesto del modulo Hotel: la struttura su cui si lavora (un gruppo
 * alberghiero ne ha più d'una), ricordata nel browser.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useElenco } from '@/lib/queries/fondamenta'
import type { Tables } from '@/lib/supabase'

export type Struttura = Tables<'hotel_strutture'>

interface ContestoHotel {
  strutture: Struttura[]
  strutturaId: string | null
  struttura: Struttura | null
  scegliStruttura: (id: string) => void
  caricamento: boolean
}

const Ctx = createContext<ContestoHotel | null>(null)
const CHIAVE = 'hotel-struttura'

export function HotelProvider({ children }: { children: ReactNode }) {
  const { data: strutture = [], isLoading } = useElenco<Struttura>('hotel_strutture', {
    filtri: { attiva: true }, ordine: [{ colonna: 'nome' }],
  })
  const [scelta, setScelta] = useState<string | null>(() => {
    try { return localStorage.getItem(CHIAVE) } catch { return null }
  })
  useEffect(() => {
    if (strutture.length && !strutture.some((s) => s.id === scelta)) setScelta(strutture[0].id)
  }, [strutture, scelta])

  const valore = useMemo<ContestoHotel>(() => {
    // Finché l'effetto non ha scelto vale la prima: niente stato vuoto di passaggio.
    const struttura = strutture.find((s) => s.id === scelta) ?? strutture[0] ?? null
    return {
      strutture,
      strutturaId: struttura?.id ?? null,
      struttura,
      scegliStruttura: (id) => { setScelta(id); try { localStorage.setItem(CHIAVE, id) } catch { /* senza memoria si sceglie a ogni visita */ } },
      caricamento: isLoading,
    }
  }, [strutture, scelta, isLoading])

  return <Ctx.Provider value={valore}>{children}</Ctx.Provider>
}

export function useHotel() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useHotel fuori da HotelProvider')
  return c
}
