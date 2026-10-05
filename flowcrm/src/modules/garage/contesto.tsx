/**
 * Contesto del modulo Garage: la struttura su cui si lavora (chi gestisce
 * più autorimesse ne ha più d'una), ricordata nel browser.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useElenco } from '@/lib/queries/fondamenta'
import type { Struttura } from '@/modules/garage/queries'

interface ContestoGarage {
  strutture: Struttura[]
  strutturaId: string | null
  struttura: Struttura | null
  scegliStruttura: (id: string) => void
  caricamento: boolean
}

const Ctx = createContext<ContestoGarage | null>(null)
const CHIAVE = 'garage-struttura'

export function GarageProvider({ children }: { children: ReactNode }) {
  const { data: strutture = [], isLoading } = useElenco<Struttura>('gar_strutture', { filtri: { attiva: true }, ordine: [{ colonna: 'nome' }] })
  const [scelta, setScelta] = useState<string | null>(() => {
    try { return localStorage.getItem(CHIAVE) } catch { return null }
  })
  useEffect(() => {
    if (strutture.length && !strutture.some((s) => s.id === scelta)) setScelta(strutture[0].id)
  }, [strutture, scelta])

  const valore = useMemo<ContestoGarage>(() => {
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

export function useGarage() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useGarage fuori da GarageProvider')
  return c
}
