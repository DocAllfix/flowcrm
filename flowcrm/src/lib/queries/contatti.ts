import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Tables, type Inserts } from '@/lib/supabase'

export type Contatto = Tables<'contatti'>

export interface ContattoConOrg extends Contatto {
  organizzazione: { id: string; ragione_sociale: string } | null
}

const KEY = 'contatti'

/** Lista contatti; se orgId è passato, solo quelli dell'organizzazione. */
export function useContatti(orgId?: string) {
  return useQuery({
    queryKey: [KEY, 'list', orgId ?? 'all'],
    queryFn: async (): Promise<ContattoConOrg[]> => {
      let q = supabase
        .from('contatti')
        .select('*, organizzazione:organizzazioni!contatti_organizzazione_id_fkey(id, ragione_sociale)')
        .eq('attivo', true)
        .order('cognome', { nullsFirst: false })
      if (orgId) q = q.eq('organizzazione_id', orgId)
      const { data, error } = await q
      if (error) throw error
      return (data ?? []) as unknown as ContattoConOrg[]
    },
  })
}

type ContattoInput = Omit<Inserts<'contatti'>, 'created_by' | 'updated_by'>

export function useSaveContatto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: ContattoInput }) => {
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth.user!.id
      if (id) {
        const { error } = await supabase
          .from('contatti')
          .update({ ...values, updated_by: uid })
          .eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('contatti')
          .insert({ ...values, created_by: uid })
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteContatto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('contatti').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
