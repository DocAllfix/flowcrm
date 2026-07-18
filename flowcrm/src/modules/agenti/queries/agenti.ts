/**
 * Query layer del modulo Agenti di commercio. La RLS confina l'utente
 * collegato a un agente ai SOLI suoi dati (portale agente §19).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Tables, type Inserts, type Updates, type DbEnum } from '@/lib/supabase'

export type Agente = Tables<'agenti'>
export type AgenteTipologia = DbEnum<'agente_tipologia'>
export type AgenteMandato = Tables<'agenti_mandati'>
export type AgenteCliente = Tables<'agenti_clienti'> & {
  organizzazione: { id: string; ragione_sociale: string } | null
}
export type AgenteVisita = Tables<'agenti_visite'> & {
  organizzazione: { id: string; ragione_sociale: string } | null
}
export type AgenteOrdine = Tables<'agenti_ordini'> & {
  organizzazione: { id: string; ragione_sociale: string } | null
}
export type AgenteOrdineRiga = Tables<'agenti_ordini_righe'>
export type AgenteOfferta = Tables<'agenti_offerte'> & {
  organizzazione: { id: string; ragione_sociale: string } | null
}
export type AgentePiano = Tables<'agenti_piani_provvigionali'>
export type AgenteRegola = Tables<'agenti_provvigioni_regole'>
export type AgenteProvvigione = Tables<'agenti_provvigioni'>
export type AgenteObiettivo = Tables<'agenti_obiettivi'>
export type AgenteNotaSpese = Tables<'agenti_note_spese'>

export const agentiKeys = {
  all: ['agenti'] as const,
  one: (id: string) => ['agenti', id] as const,
  figli: (id: string, sezione: string) => ['agenti', id, sezione] as const,
  kpi: ['agenti', 'kpi'] as const,
  me: ['agenti', 'me'] as const,
}

/** L'agente collegato all'utente corrente (null = staff interno). */
export function useAgenteCorrente() {
  return useQuery({
    queryKey: agentiKeys.me,
    queryFn: async (): Promise<Agente | null> => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return null
      const { data, error } = await supabase
        .from('agenti')
        .select('*')
        .eq('user_id', auth.user.id)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useAgenti() {
  return useQuery({
    queryKey: agentiKeys.all,
    queryFn: async (): Promise<Agente[]> => {
      const { data, error } = await supabase
        .from('agenti')
        .select('*')
        .eq('attivo', true)
        .order('cognome', { nullsFirst: false })
      if (error) throw error
      return data
    },
  })
}

export function useAgente(id: string | undefined) {
  return useQuery({
    queryKey: agentiKeys.one(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<Agente> => {
      const { data, error } = await supabase.from('agenti').select('*').eq('id', id!).single()
      if (error) throw error
      return data
    },
  })
}

export function useCreateAgente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<Inserts<'agenti'>, 'created_by' | 'codice'>) => {
      const { data: auth } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('agenti')
        .insert({ ...input, created_by: auth.user!.id })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: agentiKeys.all }),
  })
}

export function useUpdateAgente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Updates<'agenti'> }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('agenti')
        .update({ ...values, updated_by: auth.user?.id ?? null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: agentiKeys.all })
      qc.invalidateQueries({ queryKey: agentiKeys.one(v.id) })
    },
  })
}

export function useArchiveAgente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('agenti').update({ attivo: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: agentiKeys.all }),
  })
}

export function useDeleteAgente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('agenti').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: agentiKeys.all }),
  })
}

// ── Figli 1:N ────────────────────────────────────────────────────

export type AgenteTabellaFiglia =
  | 'agenti_mandati' | 'agenti_clienti' | 'agenti_visite' | 'agenti_ordini'
  | 'agenti_offerte' | 'agenti_provvigioni_regole' | 'agenti_provvigioni'
  | 'agenti_obiettivi' | 'agenti_note_spese'

const FIGLI_SELECT: Partial<Record<AgenteTabellaFiglia, string>> = {
  agenti_clienti: '*, organizzazione:organizzazioni(id, ragione_sociale)',
  agenti_visite: '*, organizzazione:organizzazioni(id, ragione_sociale)',
  agenti_ordini: '*, organizzazione:organizzazioni(id, ragione_sociale)',
  agenti_offerte: '*, organizzazione:organizzazioni(id, ragione_sociale)',
}
const FIGLI_ORDER: Partial<Record<AgenteTabellaFiglia, string>> = {
  agenti_visite: 'data', agenti_ordini: 'data', agenti_note_spese: 'data',
  agenti_provvigioni: 'periodo',
}

export function useFigliAgente<T>(agenteId: string | undefined, tabella: AgenteTabellaFiglia) {
  return useQuery({
    queryKey: agentiKeys.figli(agenteId ?? '', tabella),
    enabled: !!agenteId,
    queryFn: async (): Promise<T[]> => {
      const { data, error } = await supabase
        .from(tabella as 'agenti_visite')
        .select(FIGLI_SELECT[tabella] ?? '*')
        .eq('agente_id', agenteId!)
        .order(FIGLI_ORDER[tabella] ?? 'created_at', { ascending: false })
      if (error) throw error
      return data as unknown as T[]
    },
  })
}

interface FiglioInput {
  agenteId: string
  tabella: AgenteTabellaFiglia
  values: Record<string, unknown>
}

export function useCreaFiglioAgente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ agenteId, tabella, values }: FiglioInput) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase
        .from(tabella)
        .insert({ ...values, agente_id: agenteId, created_by: auth.user!.id } as never)
      if (error) throw error
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: agentiKeys.figli(v.agenteId, v.tabella) }),
  })
}

export function useAggiornaFiglioAgente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ tabella, id, values }: FiglioInput & { id: string }) => {
      const { error } = await supabase.from(tabella).update(values as never).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: agentiKeys.figli(v.agenteId, v.tabella) }),
  })
}

export function useEliminaFiglioAgente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ tabella, id }: { agenteId: string; tabella: AgenteTabellaFiglia; id: string }) => {
      const { error } = await supabase.from(tabella).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: agentiKeys.figli(v.agenteId, v.tabella) }),
  })
}

// ── Piano provvigionale (1:1) + calcolo ──────────────────────────

export function useAgentePiano(agenteId: string | undefined) {
  return useQuery({
    queryKey: agentiKeys.figli(agenteId ?? '', 'piano'),
    enabled: !!agenteId,
    queryFn: async (): Promise<AgentePiano | null> => {
      const { data, error } = await supabase
        .from('agenti_piani_provvigionali')
        .select('*')
        .eq('agente_id', agenteId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useSalvaAgentePiano() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ agenteId, percentualeBase, premiNote }: {
      agenteId: string; percentualeBase: number; premiNote?: string
    }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { data: esistente } = await supabase
        .from('agenti_piani_provvigionali')
        .select('id')
        .eq('agente_id', agenteId)
        .maybeSingle()
      if (esistente) {
        const { error } = await supabase
          .from('agenti_piani_provvigionali')
          .update({ percentuale_base: percentualeBase, premi_note: premiNote ?? null })
          .eq('id', esistente.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('agenti_piani_provvigionali')
          .insert({
            agente_id: agenteId, percentuale_base: percentualeBase,
            premi_note: premiNote ?? null, created_by: auth.user!.id,
          })
        if (error) throw error
      }
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: agentiKeys.figli(v.agenteId, 'piano') }),
  })
}

export function useCalcolaProvvigioni() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ agenteId, periodo }: { agenteId: string; periodo: string }) => {
      const { data, error } = await supabase.rpc('calcola_provvigioni', {
        p_agente: agenteId, p_periodo: periodo,
      })
      if (error) throw error
      return Number(data)
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: agentiKeys.figli(v.agenteId, 'agenti_provvigioni') }),
  })
}

// ── KPI direzione commerciale ────────────────────────────────────

export function useAgentiKpi() {
  return useQuery({
    queryKey: agentiKeys.kpi,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_agenti_kpi')
        .select('*')
        .order('valore_ordini', { ascending: false })
      if (error) throw error
      return data
    },
  })
}
