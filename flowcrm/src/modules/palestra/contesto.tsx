/**
 * Contesto del modulo Palestra: la sede su cui si lavora (una catena ne ha
 * più d'una), ricordata nel browser.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useElenco } from '@/lib/queries/fondamenta'
import type { Tables } from '@/lib/supabase'

export type Sede = Tables<'pal_sedi'>

interface ContestoPalestra {
  sedi: Sede[]
  sedeId: string | null
  sede: Sede | null
  scegliSede: (id: string) => void
  caricamento: boolean
}

const Ctx = createContext<ContestoPalestra | null>(null)
const CHIAVE = 'palestra-sede'

export function PalestraProvider({ children }: { children: ReactNode }) {
  const { data: sedi = [], isLoading } = useElenco<Sede>('pal_sedi', { filtri: { attiva: true }, ordine: [{ colonna: 'nome' }] })
  const [scelta, setScelta] = useState<string | null>(() => {
    try { return localStorage.getItem(CHIAVE) } catch { return null }
  })
  useEffect(() => {
    if (sedi.length && !sedi.some((s) => s.id === scelta)) setScelta(sedi[0].id)
  }, [sedi, scelta])

  const valore = useMemo<ContestoPalestra>(() => {
    // Finché l'effetto non ha scelto vale la prima: niente stato vuoto di passaggio.
    const sede = sedi.find((s) => s.id === scelta) ?? sedi[0] ?? null
    return {
      sedi,
      sedeId: sede?.id ?? null,
      sede,
      scegliSede: (id) => { setScelta(id); try { localStorage.setItem(CHIAVE, id) } catch { /* senza memoria si sceglie a ogni visita */ } },
      caricamento: isLoading,
    }
  }, [sedi, scelta, isLoading])

  return <Ctx.Provider value={valore}>{children}</Ctx.Provider>
}

export function usePalestra() {
  const c = useContext(Ctx)
  if (!c) throw new Error('usePalestra fuori da PalestraProvider')
  return c
}
