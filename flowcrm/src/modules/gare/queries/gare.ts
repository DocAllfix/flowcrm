/**
 * Query layer del modulo Gare d'appalto. Stesso pattern di lib/queries/*:
 * TanStack Query + client Supabase (la RLS con licenza è la barriera).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Tables, type Inserts, type Updates, type DbEnum } from '@/lib/supabase'

export type Gara = Tables<'gare'> & {
  ente: { id: string; ragione_sociale: string } | null
  responsabile: { nome: string; cognome: string | null } | null
}
export type GaraStato = DbEnum<'gara_stato'>
export type GaraTipologia = DbEnum<'gara_tipologia'>
export type GaraProcedura = DbEnum<'gara_procedura'>
export type GaraValutazione = Tables<'gare_valutazioni'>
export type GaraRequisito = Tables<'gare_requisiti'>
export type GaraRequisitoTipo = DbEnum<'gara_requisito_tipo'>
export type GaraTeamMembro = Tables<'gare_team'> & {
  utente: { nome: string; cognome: string | null } | null
}
export type GaraChiarimento = Tables<'gare_chiarimenti'>
export type GaraOffertaEconomica = Tables<'gare_offerte_economiche'>
export type GaraPartecipante = Tables<'gare_partecipanti'> & {
  organizzazione: { id: string; ragione_sociale: string } | null
}
export type GaraCauzione = Tables<'gare_cauzioni'>

const GARA_SELECT = `*,
  ente:organizzazioni!gare_ente_appaltante_id_fkey(id, ragione_sociale),
  responsabile:user_profiles!gare_responsabile_id_fkey(nome, cognome)`

export const gareKeys = {
  all: ['gare'] as const,
  one: (id: string) => ['gare', id] as const,
  figli: (id: string, sezione: string) => ['gare', id, sezione] as const,
  kpi: ['gare', 'kpi'] as const,
}

// ── GARE ─────────────────────────────────────────────────────────

export function useGare() {
  return useQuery({
    queryKey: gareKeys.all,
    queryFn: async (): Promise<Gara[]> => {
      const { data, error } = await supabase
        .from('gare')
        .select(GARA_SELECT)
        .eq('attivo', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as Gara[]
    },
  })
}

export function useGara(id: string | undefined) {
  return useQuery({
    queryKey: gareKeys.one(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<Gara> => {
      const { data, error } = await supabase
        .from('gare')
        .select(GARA_SELECT)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as Gara
    },
  })
}

export function useCreateGara() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<Inserts<'gare'>, 'created_by' | 'codice'>) => {
      const { data: auth } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('gare')
        .insert({ ...input, created_by: auth.user!.id })
        .select(GARA_SELECT)
        .single()
      if (error) throw error
      return data as unknown as Gara
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: gareKeys.all }),
  })
}

export function useUpdateGara() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Updates<'gare'> }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('gare')
        .update({ ...values, updated_by: auth.user?.id ?? null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: gareKeys.all })
      qc.invalidateQueries({ queryKey: gareKeys.one(v.id) })
    },
  })
}

/** Cambio stato dal Kanban (drag) o dal dettaglio. */
export function useMoveGaraStato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, stato }: { id: string; stato: GaraStato }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('gare')
        .update({ stato, updated_by: auth.user?.id ?? null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: gareKeys.all }),
  })
}

export function useArchiveGara() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gare').update({ attivo: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: gareKeys.all }),
  })
}

export function useDeleteGara() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('gare').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: gareKeys.all }),
  })
}

// ── Factory per i figli 1:N (valutazioni, requisiti, chiarimenti…) ──
// Stesso schema: lista per gara + insert/update/delete con invalidazione.

function useFigli<T>(garaId: string | undefined, tabella: string, orderBy = 'created_at') {
  return useQuery({
    queryKey: gareKeys.figli(garaId ?? '', tabella),
    enabled: !!garaId,
    queryFn: async (): Promise<T[]> => {
      let sel = '*'
      if (tabella === 'gare_team') sel = '*, utente:user_profiles!gare_team_user_id_fkey(nome, cognome)'
      if (tabella === 'gare_partecipanti') sel = '*, organizzazione:organizzazioni(id, ragione_sociale)'
      const { data, error } = await supabase
        .from(tabella as 'gare_valutazioni')
        .select(sel)
        .eq('gara_id', garaId!)
        .order(orderBy)
      if (error) throw error
      return data as unknown as T[]
    },
  })
}

export const useGaraValutazioni = (id?: string) => useFigli<GaraValutazione>(id, 'gare_valutazioni')
export const useGaraRequisiti = (id?: string) => useFigli<GaraRequisito>(id, 'gare_requisiti')
export const useGaraTeam = (id?: string) => useFigli<GaraTeamMembro>(id, 'gare_team')
export const useGaraChiarimenti = (id?: string) => useFigli<GaraChiarimento>(id, 'gare_chiarimenti', 'data_invio')
export const useGaraPartecipanti = (id?: string) => useFigli<GaraPartecipante>(id, 'gare_partecipanti')
export const useGaraCauzioni = (id?: string) => useFigli<GaraCauzione>(id, 'gare_cauzioni')

interface FiglioInput {
  garaId: string
  tabella: 'gare_valutazioni' | 'gare_requisiti' | 'gare_team' | 'gare_chiarimenti' | 'gare_partecipanti' | 'gare_cauzioni'
  values: Record<string, unknown>
}

export function useCreaFiglioGara() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ garaId, tabella, values }: FiglioInput) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase
        .from(tabella)
        .insert({ ...values, gara_id: garaId, created_by: auth.user!.id } as never)
      if (error) throw error
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: gareKeys.figli(v.garaId, v.tabella) }),
  })
}

export function useAggiornaFiglioGara() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ tabella, id, values }: FiglioInput & { id: string }) => {
      const { error } = await supabase.from(tabella).update(values as never).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: gareKeys.figli(v.garaId, v.tabella) }),
  })
}

export function useEliminaFiglioGara() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ tabella, id }: { garaId: string; tabella: FiglioInput['tabella']; id: string }) => {
      const { error } = await supabase.from(tabella).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: gareKeys.figli(v.garaId, v.tabella) }),
  })
}

// ── OFFERTA ECONOMICA (manager-only: l'operatore riceve null) ─────

export function useGaraOfferta(garaId: string | undefined) {
  return useQuery({
    queryKey: gareKeys.figli(garaId ?? '', 'offerta'),
    enabled: !!garaId,
    queryFn: async (): Promise<GaraOffertaEconomica | null> => {
      const { data, error } = await supabase
        .from('gare_offerte_economiche')
        .select('*')
        .eq('gara_id', garaId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useSalvaGaraOfferta() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ garaId, values }: { garaId: string; values: Partial<GaraOffertaEconomica> }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { data: esistente } = await supabase
        .from('gare_offerte_economiche')
        .select('id')
        .eq('gara_id', garaId)
        .maybeSingle()
      if (esistente) {
        const { error } = await supabase
          .from('gare_offerte_economiche')
          .update({ ...values, updated_by: auth.user?.id ?? null } as never)
          .eq('id', esistente.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('gare_offerte_economiche')
          .insert({ ...values, gara_id: garaId, created_by: auth.user!.id } as never)
        if (error) throw error
      }
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: gareKeys.figli(v.garaId, 'offerta') }),
  })
}

// ── KPI (viste security_invoker) ─────────────────────────────────

export function useGareKpi() {
  return useQuery({
    queryKey: gareKeys.kpi,
    queryFn: async () => {
      const { data, error } = await supabase.from('vw_gare_kpi').select('*').maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useGarePerStato() {
  return useQuery({
    queryKey: ['gare', 'per-stato'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vw_gare_per_stato').select('*')
      if (error) throw error
      return data
    },
  })
}

export function useGareSuccessoEnte(limit = 6) {
  return useQuery({
    queryKey: ['gare', 'successo-ente', limit],
    queryFn: async () => {
      const { data, error } = await supabase.from('vw_gare_successo_ente').select('*').limit(limit)
      if (error) throw error
      return data
    },
  })
}

export function useGareSuccessoTerritorio(limit = 6) {
  return useQuery({
    queryKey: ['gare', 'successo-territorio', limit],
    queryFn: async () => {
      const { data, error } = await supabase.from('vw_gare_successo_territorio').select('*').limit(limit)
      if (error) throw error
      return data
    },
  })
}
