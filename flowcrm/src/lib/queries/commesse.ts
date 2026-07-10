import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Tables, type Inserts } from '@/lib/supabase'

export type Commessa = Tables<'commesse'> & {
  organizzazione: { id: string; ragione_sociale: string } | null
}
export type CommessaStato = Tables<'commesse'>['stato']

export const commesseKeys = { all: ['commesse'] as const }

export function useCommesse() {
  return useQuery({
    queryKey: commesseKeys.all,
    queryFn: async (): Promise<Commessa[]> => {
      const { data, error } = await supabase
        .from('commesse')
        .select('*, organizzazione:organizzazioni(id, ragione_sociale)')
        .eq('attivo', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Commessa[]
    },
  })
}

/** Commesse collegate a un deal (tab nel 360° del deal). */
export function useCommessePerDeal(dealId: string | undefined) {
  return useQuery({
    queryKey: ['commesse', 'deal', dealId],
    enabled: !!dealId,
    queryFn: async (): Promise<Commessa[]> => {
      const { data, error } = await supabase
        .from('commesse')
        .select('*, organizzazione:organizzazioni(id, ragione_sociale)')
        .eq('deal_id', dealId!)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Commessa[]
    },
  })
}

export function useCreateCommessa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<Inserts<'commesse'>, 'created_by' | 'codice'>) => {
      const { data: auth } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('commesse')
        .insert({ ...input, created_by: auth.user!.id })
        .select('*, organizzazione:organizzazioni(id, ragione_sociale)')
        .single()
      if (error) throw error
      return data as Commessa
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commesse'] }),
  })
}

export function useUpdateCommessaStato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, stato }: { id: string; stato: CommessaStato }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('commesse')
        .update({ stato, updated_by: auth.user!.id })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commesse'] }),
  })
}

export function useUpdateCommessa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Inserts<'commesse'>> }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('commesse').update({ ...values, updated_by: auth.user!.id }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commesse'] }),
  })
}

export function useArchiveCommessa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('commesse').update({ attivo: false, updated_by: auth.user!.id }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commesse'] }),
  })
}

export function useDeleteCommessa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('commesse').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['commesse'] }),
  })
}
