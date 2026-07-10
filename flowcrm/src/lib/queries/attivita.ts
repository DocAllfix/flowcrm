import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Tables, type Inserts } from '@/lib/supabase'

export type Attivita = Tables<'attivita'>
export type AttivitaTipo = Tables<'attivita'>['tipo']
export type AttivitaStato = Tables<'attivita'>['stato']

/** Filtro entità per la timeline dei 360° (uno solo valorizzato). */
export interface AttivitaScope {
  organizzazione_id?: string
  contatto_id?: string
  deal_id?: string
}

export const attivitaKeys = {
  scope: (s: AttivitaScope) => ['attivita', s] as const,
  mine: (userId: string) => ['attivita', 'mine', userId] as const,
}

/** Attività collegate a una singola entità (timeline del 360°). */
export function useAttivitaScope(scope: AttivitaScope) {
  const [key, value] = Object.entries(scope)[0] ?? []
  return useQuery({
    queryKey: attivitaKeys.scope(scope),
    enabled: !!value,
    queryFn: async (): Promise<Attivita[]> => {
      const { data, error } = await supabase
        .from('attivita')
        .select('*')
        .eq(key as 'deal_id', value!)
        .eq('attivo', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/** I task/attività assegnati all'utente corrente, non completati prima. */
export function useMieAttivita(userId: string | undefined) {
  return useQuery({
    queryKey: attivitaKeys.mine(userId ?? 'noop'),
    enabled: !!userId,
    queryFn: async (): Promise<Attivita[]> => {
      const { data, error } = await supabase
        .from('attivita')
        .select('*')
        .eq('assegnato_a', userId!)
        .eq('attivo', true)
        .order('stato')
        .order('scadenza', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data
    },
  })
}

/** Tutte le riunioni del team (attività di tipo riunione), per la pagina Riunioni. */
export function useRiunioni() {
  return useQuery({
    queryKey: ['attivita', 'riunioni'],
    queryFn: async (): Promise<Attivita[]> => {
      const { data, error } = await supabase
        .from('attivita')
        .select('*')
        .eq('tipo', 'riunione')
        .eq('attivo', true)
        .order('inizio', { ascending: true, nullsFirst: false })
      if (error) throw error
      return data
    },
  })
}

export function useCreateAttivita() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<Inserts<'attivita'>, 'created_by'>) => {
      const { data: auth } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('attivita')
        .insert({ ...input, created_by: auth.user!.id })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attivita'] }),
  })
}

export function useUpdateAttivita() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Inserts<'attivita'>> }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('attivita').update({ ...values, updated_by: auth.user!.id }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attivita'] }),
  })
}

export function useArchiveAttivita() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('attivita').update({ attivo: false, updated_by: auth.user!.id }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attivita'] }),
  })
}

export function useDeleteAttivita() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('attivita').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attivita'] }),
  })
}

export function useToggleAttivitaStato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, stato }: { id: string; stato: AttivitaStato }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('attivita')
        .update({ stato, updated_by: auth.user!.id })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attivita'] }),
  })
}
