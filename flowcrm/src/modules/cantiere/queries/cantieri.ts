/**
 * Query layer del modulo Cantiere. Pattern identico al modulo Gare:
 * entità principale + factory per i figli 1:N + viste (economia solo
 * manager via RLS/vista).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Tables, type Inserts, type Updates, type DbEnum } from '@/lib/supabase'

export type Cantiere = Tables<'cantieri'> & {
  cliente: { id: string; ragione_sociale: string } | null
  committente: { id: string; ragione_sociale: string } | null
  responsabile: { nome: string; cognome: string | null } | null
  capocantiere: { nome: string; cognome: string | null } | null
}
export type CantiereStato = DbEnum<'cantiere_stato'>
export type CantiereFase = Tables<'cantiere_fasi'>
export type CantierePersonale = Tables<'cantiere_personale'> & {
  dipendente: { nome: string; cognome: string | null } | null
  impresa: { ragione_sociale: string } | null
}
export type CantierePresenza = Tables<'cantiere_presenze'>
export type CantiereImpresa = Tables<'cantiere_imprese'> & {
  organizzazione: { id: string; ragione_sociale: string } | null
}
export type CantiereMezzo = Tables<'cantiere_mezzi'>
export type CantiereMateriale = Tables<'cantiere_materiali'> & {
  fornitore: { ragione_sociale: string } | null
}
export type CantiereSal = Tables<'cantiere_sal'>
export type CantiereCosto = Tables<'cantiere_costi'>
export type CantiereRapportino = Tables<'cantiere_rapportini'> & {
  capocantiere: { nome: string; cognome: string | null } | null
}
export type CantiereEventoSicurezza = Tables<'cantiere_eventi_sicurezza'>
export type CantiereControlloQualita = Tables<'cantiere_controlli_qualita'>
export type CantiereRegistroAmbiente = Tables<'cantiere_registri_ambiente'>

const CANTIERE_SELECT = `*,
  cliente:organizzazioni!cantieri_cliente_id_fkey(id, ragione_sociale),
  committente:organizzazioni!cantieri_committente_id_fkey(id, ragione_sociale),
  responsabile:user_profiles!cantieri_responsabile_interno_id_fkey(nome, cognome),
  capocantiere:user_profiles!cantieri_capocantiere_id_fkey(nome, cognome)`

export const cantieriKeys = {
  all: ['cantieri'] as const,
  one: (id: string) => ['cantieri', id] as const,
  figli: (id: string, sezione: string) => ['cantieri', id, sezione] as const,
}

export function useCantieri() {
  return useQuery({
    queryKey: cantieriKeys.all,
    queryFn: async (): Promise<Cantiere[]> => {
      const { data, error } = await supabase
        .from('cantieri')
        .select(CANTIERE_SELECT)
        .eq('attivo', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as Cantiere[]
    },
  })
}

export function useCantiere(id: string | undefined) {
  return useQuery({
    queryKey: cantieriKeys.one(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<Cantiere> => {
      const { data, error } = await supabase
        .from('cantieri')
        .select(CANTIERE_SELECT)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as Cantiere
    },
  })
}

export function useCreateCantiere() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<Inserts<'cantieri'>, 'created_by' | 'codice'>) => {
      const { data: auth } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('cantieri')
        .insert({ ...input, created_by: auth.user!.id })
        .select(CANTIERE_SELECT)
        .single()
      if (error) throw error
      return data as unknown as Cantiere
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: cantieriKeys.all }),
  })
}

export function useUpdateCantiere() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Updates<'cantieri'> }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('cantieri')
        .update({ ...values, updated_by: auth.user?.id ?? null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: cantieriKeys.all })
      qc.invalidateQueries({ queryKey: cantieriKeys.one(v.id) })
    },
  })
}

export function useArchiveCantiere() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cantieri').update({ attivo: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: cantieriKeys.all }),
  })
}

export function useDeleteCantiere() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cantieri').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: cantieriKeys.all }),
  })
}

// ── Figli 1:N (factory generica come nel modulo Gare) ────────────

export type CantiereTabellaFiglia =
  | 'cantiere_fasi' | 'cantiere_personale' | 'cantiere_presenze'
  | 'cantiere_imprese' | 'cantiere_mezzi' | 'cantiere_materiali'
  | 'cantiere_sal' | 'cantiere_misure' | 'cantiere_costi'
  | 'cantiere_rapportini' | 'cantiere_eventi_sicurezza'
  | 'cantiere_controlli_qualita' | 'cantiere_registri_ambiente'

const FIGLI_SELECT: Partial<Record<CantiereTabellaFiglia, string>> = {
  cantiere_personale: '*, dipendente:dipendenti(nome, cognome), impresa:organizzazioni(ragione_sociale)',
  cantiere_imprese: '*, organizzazione:organizzazioni(id, ragione_sociale)',
  cantiere_materiali: '*, fornitore:organizzazioni(ragione_sociale)',
  cantiere_rapportini: '*, capocantiere:user_profiles!cantiere_rapportini_capocantiere_id_fkey(nome, cognome)',
}
const FIGLI_ORDER: Partial<Record<CantiereTabellaFiglia, { col: string; asc: boolean }>> = {
  cantiere_fasi: { col: 'ordine', asc: true },
  cantiere_rapportini: { col: 'data', asc: false },
  cantiere_presenze: { col: 'data', asc: false },
  cantiere_sal: { col: 'numero', asc: true },
  cantiere_materiali: { col: 'data', asc: false },
  cantiere_eventi_sicurezza: { col: 'data', asc: false },
  cantiere_controlli_qualita: { col: 'data', asc: false },
  cantiere_registri_ambiente: { col: 'data', asc: false },
}

export function useFigliCantiere<T>(cantiereId: string | undefined, tabella: CantiereTabellaFiglia) {
  return useQuery({
    queryKey: cantieriKeys.figli(cantiereId ?? '', tabella),
    enabled: !!cantiereId,
    queryFn: async (): Promise<T[]> => {
      const ord = FIGLI_ORDER[tabella] ?? { col: 'created_at', asc: true }
      const { data, error } = await supabase
        .from(tabella as 'cantiere_fasi')
        .select(FIGLI_SELECT[tabella] ?? '*')
        .eq('cantiere_id', cantiereId!)
        .order(ord.col, { ascending: ord.asc })
      if (error) throw error
      return data as unknown as T[]
    },
  })
}

interface FiglioInput {
  cantiereId: string
  tabella: CantiereTabellaFiglia
  values: Record<string, unknown>
}

export function useCreaFiglioCantiere() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ cantiereId, tabella, values }: FiglioInput) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase
        .from(tabella)
        .insert({ ...values, cantiere_id: cantiereId, created_by: auth.user!.id } as never)
      if (error) throw error
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: cantieriKeys.figli(v.cantiereId, v.tabella) }),
  })
}

export function useAggiornaFiglioCantiere() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ tabella, id, values }: FiglioInput & { id: string }) => {
      const { error } = await supabase.from(tabella).update(values as never).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: cantieriKeys.figli(v.cantiereId, v.tabella) }),
  })
}

export function useEliminaFiglioCantiere() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ tabella, id }: { cantiereId: string; tabella: CantiereTabellaFiglia; id: string }) => {
      const { error } = await supabase.from(tabella).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: cantieriKeys.figli(v.cantiereId, v.tabella) }),
  })
}

// ── Viste ────────────────────────────────────────────────────────

export function useCantiereEconomia(cantiereId: string | undefined) {
  return useQuery({
    queryKey: cantieriKeys.figli(cantiereId ?? '', 'economia'),
    enabled: !!cantiereId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_cantiere_economia')
        .select('*')
        .eq('cantiere_id', cantiereId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useCantiereKpi(cantiereId: string | undefined) {
  return useQuery({
    queryKey: cantieriKeys.figli(cantiereId ?? '', 'kpi'),
    enabled: !!cantiereId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_cantiere_kpi')
        .select('*')
        .eq('cantiere_id', cantiereId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useCantieriKpiTutti() {
  return useQuery({
    queryKey: ['cantieri', 'kpi-tutti'],
    queryFn: async () => {
      const { data, error } = await supabase.from('vw_cantiere_kpi').select('*')
      if (error) throw error
      return data
    },
  })
}
