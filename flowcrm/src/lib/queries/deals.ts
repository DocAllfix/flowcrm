import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Tables, type Inserts } from '@/lib/supabase'

export type PipelineStage = Tables<'pipeline_stages'>
export type Deal = Tables<'deals'>

/** Deal arricchito con nome organizzazione (per card e liste). */
export type DealWithOrg = Deal & {
  organizzazione: { id: string; ragione_sociale: string } | null
}

export const dealsKeys = {
  all: ['deals'] as const,
  stages: ['pipeline_stages'] as const,
}

/** Stage della pipeline di default, ordinati (colonne del Kanban). */
export function usePipelineStages() {
  return useQuery({
    queryKey: dealsKeys.stages,
    queryFn: async (): Promise<PipelineStage[]> => {
      const { data, error } = await supabase
        .from('pipeline_stages')
        .select('*, pipelines!inner(is_default)')
        .eq('pipelines.is_default', true)
        .eq('attivo', true)
        .order('ordine')
      if (error) throw error
      // scarta la relazione pipelines dal tipo di ritorno
      return (data as (PipelineStage & { pipelines: unknown })[]).map(({ pipelines: _p, ...s }) => s)
    },
  })
}

/** Tutti i deal attivi con l'organizzazione collegata. */
export function useDeals() {
  return useQuery({
    queryKey: dealsKeys.all,
    queryFn: async (): Promise<DealWithOrg[]> => {
      const { data, error } = await supabase
        .from('deals')
        .select('*, organizzazione:organizzazioni(id, ragione_sociale)')
        .eq('attivo', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as DealWithOrg[]
    },
  })
}

/** Singolo deal con organizzazione e stage correnti. */
export function useDeal(id: string | undefined) {
  return useQuery({
    queryKey: ['deal', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deals')
        .select('*, organizzazione:organizzazioni(id, ragione_sociale), stage:pipeline_stages(*)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as DealWithOrg & { stage: PipelineStage }
    },
  })
}

export function useCreateDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<Inserts<'deals'>, 'created_by'>) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('deals').insert({ ...input, created_by: auth.user!.id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: dealsKeys.all }),
  })
}

/**
 * Sposta un deal in un altro stage. Il trigger DB registra lo storico e
 * gestisce chiuso_at. Il chiamante Kanban fa l'optimistic update locale.
 */
export function useMoveDeal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ dealId, stageId }: { dealId: string; stageId: string }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('deals')
        .update({ stage_id: stageId, updated_by: auth.user!.id })
        .eq('id', dealId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: dealsKeys.all }),
  })
}
