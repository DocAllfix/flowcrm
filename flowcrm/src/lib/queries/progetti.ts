import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Tables, type Inserts } from '@/lib/supabase'

export type Progetto = Tables<'progetti'> & {
  organizzazione: { id: string; ragione_sociale: string } | null
}
export type ProgettoTipo = Tables<'progetti'>['tipo']
export type ProgettoStato = Tables<'progetti'>['stato']

export const progettiKeys = { all: ['progetti'] as const }

export function useProgetti() {
  return useQuery({
    queryKey: progettiKeys.all,
    queryFn: async (): Promise<Progetto[]> => {
      const { data, error } = await supabase
        .from('progetti')
        .select('*, organizzazione:organizzazioni(id, ragione_sociale)')
        .eq('attivo', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Progetto[]
    },
  })
}

export function useCreateProgetto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<Inserts<'progetti'>, 'created_by'>) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('progetti').insert({ ...input, created_by: auth.user!.id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: progettiKeys.all }),
  })
}

export function useUpdateProgetto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Partial<Inserts<'progetti'>> }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('progetti').update({ ...values, updated_by: auth.user!.id }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: progettiKeys.all }),
  })
}

export function useArchiveProgetto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('progetti').update({ attivo: false, updated_by: auth.user!.id }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: progettiKeys.all }),
  })
}

export function useDeleteProgetto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('progetti').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: progettiKeys.all }),
  })
}
