/**
 * Query layer del modulo Parco automezzi (pattern factory dei moduli).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Tables, type Inserts, type Updates, type DbEnum } from '@/lib/supabase'

export type Automezzo = Tables<'automezzi'>
export type AutomezzoStato = DbEnum<'automezzo_stato'>
export type AutomezzoCategoria = DbEnum<'automezzo_categoria'>
export type AutomezzoAssegnazione = Tables<'automezzi_assegnazioni'> & {
  dipendente: { nome: string; cognome: string | null } | null
}
export type AutomezzoManutenzione = Tables<'automezzi_manutenzioni'>
export type AutomezzoPneumatico = Tables<'automezzi_pneumatici'>
export type AutomezzoRifornimento = Tables<'automezzi_rifornimenti'>
export type AutomezzoUtilizzo = Tables<'automezzi_utilizzi'>
export type AutomezzoSinistro = Tables<'automezzi_sinistri'>
export type AutomezzoMulta = Tables<'automezzi_multe'>
export type AutomezzoCosto = Tables<'automezzi_costi'>
export type AutomezzoAttrezzatura = Tables<'automezzi_attrezzature'>
export type DipendentePatente = Tables<'dipendenti_patenti'> & {
  dipendente: { nome: string; cognome: string | null } | null
}

export const automezziKeys = {
  all: ['automezzi'] as const,
  one: (id: string) => ['automezzi', id] as const,
  figli: (id: string, sezione: string) => ['automezzi', id, sezione] as const,
}

export function useAutomezzi() {
  return useQuery({
    queryKey: automezziKeys.all,
    queryFn: async (): Promise<Automezzo[]> => {
      const { data, error } = await supabase
        .from('automezzi')
        .select('*')
        .eq('attivo', true)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useAutomezzo(id: string | undefined) {
  return useQuery({
    queryKey: automezziKeys.one(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<Automezzo> => {
      const { data, error } = await supabase.from('automezzi').select('*').eq('id', id!).single()
      if (error) throw error
      return data
    },
  })
}

export function useCreateAutomezzo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<Inserts<'automezzi'>, 'created_by' | 'codice'>) => {
      const { data: auth } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('automezzi')
        .insert({ ...input, created_by: auth.user!.id })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: automezziKeys.all }),
  })
}

export function useUpdateAutomezzo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: Updates<'automezzi'> }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('automezzi')
        .update({ ...values, updated_by: auth.user?.id ?? null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: automezziKeys.all })
      qc.invalidateQueries({ queryKey: automezziKeys.one(v.id) })
    },
  })
}

export function useArchiveAutomezzo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('automezzi').update({ attivo: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: automezziKeys.all }),
  })
}

export function useDeleteAutomezzo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('automezzi').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: automezziKeys.all }),
  })
}

// ── Figli 1:N ────────────────────────────────────────────────────

export type AutomezzoTabellaFiglia =
  | 'automezzi_assegnazioni' | 'automezzi_manutenzioni' | 'automezzi_pneumatici'
  | 'automezzi_rifornimenti' | 'automezzi_utilizzi' | 'automezzi_sinistri'
  | 'automezzi_multe' | 'automezzi_costi' | 'automezzi_attrezzature'

const FIGLI_SELECT: Partial<Record<AutomezzoTabellaFiglia, string>> = {
  automezzi_assegnazioni: '*, dipendente:dipendenti(nome, cognome)',
}
const FIGLI_ORDER: Partial<Record<AutomezzoTabellaFiglia, string>> = {
  automezzi_assegnazioni: 'data_inizio',
  automezzi_manutenzioni: 'data',
  automezzi_rifornimenti: 'data',
  automezzi_utilizzi: 'data',
  automezzi_sinistri: 'data',
  automezzi_multe: 'data',
  automezzi_costi: 'data',
}

export function useFigliAutomezzo<T>(automezzoId: string | undefined, tabella: AutomezzoTabellaFiglia) {
  return useQuery({
    queryKey: automezziKeys.figli(automezzoId ?? '', tabella),
    enabled: !!automezzoId,
    queryFn: async (): Promise<T[]> => {
      const { data, error } = await supabase
        .from(tabella as 'automezzi_manutenzioni')
        .select(FIGLI_SELECT[tabella] ?? '*')
        .eq('automezzo_id', automezzoId!)
        .order(FIGLI_ORDER[tabella] ?? 'created_at', { ascending: false })
      if (error) throw error
      return data as unknown as T[]
    },
  })
}

interface FiglioInput {
  automezzoId: string
  tabella: AutomezzoTabellaFiglia
  values: Record<string, unknown>
}

export function useCreaFiglioAutomezzo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ automezzoId, tabella, values }: FiglioInput) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase
        .from(tabella)
        .insert({ ...values, automezzo_id: automezzoId, created_by: auth.user!.id } as never)
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: automezziKeys.figli(v.automezzoId, v.tabella) })
      // I rifornimenti aggiornano i km del mezzo → refresh anagrafica e viste
      qc.invalidateQueries({ queryKey: automezziKeys.one(v.automezzoId) })
      qc.invalidateQueries({ queryKey: automezziKeys.figli(v.automezzoId, 'consumi') })
      qc.invalidateQueries({ queryKey: automezziKeys.figli(v.automezzoId, 'costo-km') })
    },
  })
}

export function useAggiornaFiglioAutomezzo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ tabella, id, values }: FiglioInput & { id: string }) => {
      const { error } = await supabase.from(tabella).update(values as never).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: automezziKeys.figli(v.automezzoId, v.tabella) }),
  })
}

export function useEliminaFiglioAutomezzo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ tabella, id }: { automezzoId: string; tabella: AutomezzoTabellaFiglia; id: string }) => {
      const { error } = await supabase.from(tabella).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: automezziKeys.figli(v.automezzoId, v.tabella) }),
  })
}

// ── Viste ────────────────────────────────────────────────────────

export function useAutomezzoConsumi(automezzoId: string | undefined) {
  return useQuery({
    queryKey: automezziKeys.figli(automezzoId ?? '', 'consumi'),
    enabled: !!automezzoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_automezzo_consumi')
        .select('*')
        .eq('automezzo_id', automezzoId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useAutomezzoCostoKm(automezzoId: string | undefined) {
  return useQuery({
    queryKey: automezziKeys.figli(automezzoId ?? '', 'costo-km'),
    enabled: !!automezzoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vw_automezzo_costo_km')
        .select('*')
        .eq('automezzo_id', automezzoId!)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

// ── Patenti conducenti (HR, manager-only) ────────────────────────

export function usePatenti() {
  return useQuery({
    queryKey: ['dipendenti-patenti'],
    queryFn: async (): Promise<DipendentePatente[]> => {
      const { data, error } = await supabase
        .from('dipendenti_patenti')
        .select('*, dipendente:dipendenti(nome, cognome)')
        .order('scadenza', { nullsFirst: false })
      if (error) throw error
      return data as unknown as DipendentePatente[]
    },
  })
}

export function useCreaPatente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<Inserts<'dipendenti_patenti'>, 'created_by'>) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('dipendenti_patenti')
        .insert({ ...values, created_by: auth.user!.id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dipendenti-patenti'] }),
  })
}

export function useEliminaPatente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dipendenti_patenti').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dipendenti-patenti'] }),
  })
}
