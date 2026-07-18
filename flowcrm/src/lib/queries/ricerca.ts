import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export interface RisultatoRicerca {
  tipo: 'organizzazione' | 'contatto' | 'gara'
  id: string
  titolo: string
  sottotitolo: string
}

/** Ricerca globale full-text (cmd+K): organizzazioni, contatti e gare. */
export function useRicercaGlobale(query: string) {
  const q = query.trim()
  return useQuery({
    enabled: q.length >= 2,
    queryKey: ['ricerca', q],
    queryFn: async (): Promise<RisultatoRicerca[]> => {
      const { data, error } = await supabase.rpc('ricerca_globale', { q })
      if (error) throw error
      return (data ?? []) as RisultatoRicerca[]
    },
  })
}
