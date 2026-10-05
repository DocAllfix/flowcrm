/**
 * Contesto del motore food & beverage: le stesse pagine servono il
 * Ristorante e il Bar; cambiano il modulo, il percorso di base e le
 * parole. Il locale scelto (un hotel può averne più d'uno) resta ricordato
 * nel browser.
 */
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useElenco } from '@/lib/queries/fondamenta'
import type { Tables } from '@/lib/supabase'

export type ModuloFb = 'ristorante' | 'bar'
export type Locale = Tables<'fb_locali'>

interface ContestoFb {
  modulo: ModuloFb
  base: string
  nome: string
  locali: Locale[]
  localeId: string | null
  locale: Locale | null
  scegliLocale: (id: string) => void
  caricamento: boolean
}

const Ctx = createContext<ContestoFb | null>(null)

const chiave = (m: ModuloFb) => `fb-locale-${m}`
function leggi(m: ModuloFb): string | null {
  try { return localStorage.getItem(chiave(m)) } catch { return null }
}
function scrivi(m: ModuloFb, id: string) {
  try { localStorage.setItem(chiave(m), id) } catch { /* navigazione privata: si sceglie a ogni visita */ }
}

export function FbProvider({ modulo, children }: { modulo: ModuloFb; children: ReactNode }) {
  const { data: locali = [], isLoading } = useElenco<Locale>('fb_locali', {
    filtri: { modulo, attivo: true }, ordine: [{ colonna: 'nome' }],
  })
  const [scelto, setScelto] = useState<string | null>(() => leggi(modulo))

  useEffect(() => {
    if (locali.length && !locali.some((l) => l.id === scelto)) setScelto(locali[0].id)
  }, [locali, scelto])

  const valore = useMemo<ContestoFb>(() => {
    // Finché l'effetto non ha scelto, vale il primo: niente «Nessun locale configurato» di passaggio.
    const locale = locali.find((l) => l.id === scelto) ?? locali[0] ?? null
    return {
      modulo,
      base: `/${modulo}`,
      nome: modulo === 'ristorante' ? 'Ristorante' : 'Bar',
      locali,
      localeId: locale?.id ?? null,
      locale,
      scegliLocale: (id) => { setScelto(id); scrivi(modulo, id) },
      caricamento: isLoading,
    }
  }, [modulo, locali, scelto, isLoading])

  return <Ctx.Provider value={valore}>{children}</Ctx.Provider>
}

export function useFb(): ContestoFb {
  const c = useContext(Ctx)
  if (!c) throw new Error('useFb fuori da <FbProvider>')
  return c
}
