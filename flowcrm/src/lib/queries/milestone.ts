import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Tables } from '@/lib/supabase'

export type Milestone = Tables<'milestone'>

export function useMilestone(progettoId: string | undefined) {
  return useQuery({
    queryKey: ['milestone', progettoId],
    enabled: !!progettoId,
    queryFn: async (): Promise<Milestone[]> => {
      const { data, error } = await supabase
        .from('milestone')
        .select('*')
        .eq('progetto_id', progettoId!)
        .order('ordine')
        .order('created_at')
      if (error) throw error
      return data
    },
  })
}

export function useCreateMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ progetto_id, titolo, data, ordine }: { progetto_id: string; titolo: string; data?: string | null; ordine?: number }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('milestone').insert({
        progetto_id, titolo, data: data ?? null, ordine: ordine ?? 0, created_by: auth.user!.id,
      })
      if (error) throw error
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['milestone', v.progetto_id] }),
  })
}

export function useToggleMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, completata }: { id: string; completata: boolean; progetto_id: string }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('milestone').update({ completata, updated_by: auth.user!.id }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['milestone', v.progetto_id] }),
  })
}

export function useDeleteMilestone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; progetto_id: string }) => {
      const { error } = await supabase.from('milestone').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['milestone', v.progetto_id] }),
  })
}
