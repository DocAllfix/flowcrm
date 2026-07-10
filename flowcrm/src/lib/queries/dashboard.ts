import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

/** KPI operativi (Dashboard 1, visibili a tutti i ruoli). */
export function useDashboardKpi() {
  return useQuery({
    queryKey: ['dashboard', 'kpi'],
    queryFn: async () => {
      const [org, contatti, deal, commesse, pipeline] = await Promise.all([
        supabase.from('organizzazioni').select('id', { count: 'exact', head: true }).eq('attivo', true),
        supabase.from('contatti').select('id', { count: 'exact', head: true }).eq('attivo', true),
        supabase.from('deals').select('id', { count: 'exact', head: true }).eq('attivo', true),
        supabase.from('commesse').select('id', { count: 'exact', head: true }).eq('stato', 'attiva'),
        supabase.from('vw_pipeline_valore_pesato').select('valore_pesato'),
      ])
      const valorePesato = (pipeline.data ?? []).reduce((s, r) => s + Number(r.valore_pesato), 0)
      return {
        organizzazioni: org.count ?? 0,
        contatti: contatti.count ?? 0,
        deal: deal.count ?? 0,
        commesse: commesse.count ?? 0,
        pipelinePesata: valorePesato,
      }
    },
  })
}

/** Pipeline pesata per stage (grafico Dashboard 1). */
export function usePipelinePesata() {
  return useQuery({
    queryKey: ['dashboard', 'pipeline'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_pipeline_valore_pesato')
        .select('*')
        .order('ordine')
      if (error) throw error
      return data
    },
  })
}

/** Fatturato mensile (Dashboard 2 economica). Operatore riceve vuoto (RLS). */
export function useFatturatoMensile() {
  return useQuery({
    queryKey: ['dashboard', 'fatturato'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_fatturato_mensile')
        .select('*')
        .order('mese')
      if (error) throw error
      return data
    },
  })
}

/** KPI economici (una riga). Operatore riceve vuoto/zeri via RLS. */
export function useKpiEconomici() {
  return useQuery({
    queryKey: ['dashboard', 'kpi-economici'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vw_kpi_economici').select('*').maybeSingle()
      if (error) throw error
      return data
    },
  })
}

/** Top clienti per fatturato (Dashboard economica). */
export function useTopClienti(limit = 5) {
  return useQuery({
    queryKey: ['dashboard', 'top-clienti', limit],
    queryFn: async () => {
      const { data, error } = await supabase.from('vw_top_clienti').select('*').limit(limit)
      if (error) throw error
      return data
    },
  })
}

/** Fatture per stato (grafico a torta). */
export function useFatturePerStato() {
  return useQuery({
    queryKey: ['dashboard', 'fatture-stato'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vw_fatture_per_stato').select('*')
      if (error) throw error
      return data
    },
  })
}

/** Fatturato annuale di una singola organizzazione (grafico nel 360°). */
export function useFatturatoOrganizzazione(orgId: string | undefined) {
  return useQuery({
    queryKey: ['dashboard', 'fatturato-org', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_fatturato_organizzazione')
        .select('*')
        .eq('organizzazione_id', orgId!)
        .order('anno')
      if (error) throw error
      return data
    },
  })
}

/** Cash flow previsto (Dashboard 2 economica). */
export function useCashFlow() {
  return useQuery({
    queryKey: ['dashboard', 'cashflow'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_cash_flow_previsto')
        .select('*')
        .order('mese')
      if (error) throw error
      return data
    },
  })
}
