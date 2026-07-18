/**
 * Query layer del modulo Poliambulatori. I contenuti clinici (condizioni,
 * visite, referti) tornano vuoti a chi non è medico/admin: la RLS è la
 * barriera, la UI mostra l'avviso di riservatezza.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Tables, type Inserts, type Updates, type DbEnum } from '@/lib/supabase'

export type Paziente = Tables<'pazienti'> & {
  convenzione: { id: string; nome: string } | null
}
export type PazienteConsenso = Tables<'pazienti_consensi'>
export type PazienteCondizione = Tables<'pazienti_condizioni'>
export type PazienteComunicazione = Tables<'pazienti_comunicazioni'>
export type Professionista = Tables<'professionisti'>
export type Ambulatorio = Tables<'ambulatori'>
export type Prestazione = Tables<'prestazioni'>
export type Convenzione = Tables<'convenzioni'>
export type Apparecchiatura = Tables<'apparecchiature'>
export type Appuntamento = Tables<'appuntamenti'> & {
  paziente: { id: string; nome: string; cognome: string | null } | null
  professionista: { id: string; nome: string; cognome: string | null; colore: string | null } | null
  prestazione: { nome: string; durata_minuti: number } | null
}
export type Visita = Tables<'visite'>
export type Referto = Tables<'referti'>
export type RefertoStato = DbEnum<'referto_stato'>
export type ArticoloSanitario = Tables<'magazzino_sanitario'>
export type EventoQualita = Tables<'eventi_qualita'>

export const poliKeys = {
  lista: (tabella: string) => ['poli', tabella] as const,
  paziente: (id: string) => ['poli', 'pazienti', id] as const,
  figliPaziente: (id: string, sezione: string) => ['poli', 'pazienti', id, sezione] as const,
  kpi: ['poli', 'kpi'] as const,
  medico: ['poli', 'sono-medico'] as const,
}

/** true se l'utente corrente è un professionista collegato (vede la clinica). */
export function useSonoMedico() {
  return useQuery({
    queryKey: poliKeys.medico,
    queryFn: async (): Promise<boolean> => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return false
      const { data } = await supabase
        .from('professionisti')
        .select('id')
        .eq('user_id', auth.user.id)
        .eq('attivo', true)
        .maybeSingle()
      return !!data
    },
  })
}

// ── Liste generiche (professionisti, prestazioni, ambulatori…) ────

export type PoliTabella =
  | 'professionisti' | 'ambulatori' | 'prestazioni' | 'convenzioni'
  | 'apparecchiature' | 'magazzino_sanitario' | 'eventi_qualita'

export function usePoliLista<T>(tabella: PoliTabella) {
  return useQuery({
    queryKey: poliKeys.lista(tabella),
    queryFn: async (): Promise<T[]> => {
      let q = supabase.from(tabella as 'prestazioni').select('*')
      if (tabella !== 'eventi_qualita') q = q.eq('attivo', true)
      const { data, error } = await q.order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as T[]
    },
  })
}

export function useCreaPoli() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ tabella, values }: { tabella: PoliTabella; values: Record<string, unknown> }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase
        .from(tabella)
        .insert({ ...values, created_by: auth.user!.id } as never)
      if (error) throw error
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: poliKeys.lista(v.tabella) }),
  })
}

export function useAggiornaPoli() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ tabella, id, values }: {
      tabella: PoliTabella; id: string; values: Record<string, unknown>
    }) => {
      const { error } = await supabase.from(tabella).update(values as never).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: poliKeys.lista(v.tabella) }),
  })
}

export function useEliminaPoli() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ tabella, id }: { tabella: PoliTabella; id: string }) => {
      const { error } = await supabase.from(tabella).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: poliKeys.lista(v.tabella) }),
  })
}

// ── Pazienti ─────────────────────────────────────────────────────

const PAZIENTE_SELECT = '*, convenzione:convenzioni(id, nome)'

export function usePazienti() {
  return useQuery({
    queryKey: poliKeys.lista('pazienti'),
    queryFn: async (): Promise<Paziente[]> => {
      const { data, error } = await supabase
        .from('pazienti')
        .select(PAZIENTE_SELECT)
        .eq('attivo', true)
        .order('cognome', { nullsFirst: false })
      if (error) throw error
      return data as unknown as Paziente[]
    },
  })
}

export function usePaziente(id: string | undefined) {
  return useQuery({
    queryKey: poliKeys.paziente(id ?? ''),
    enabled: !!id,
    queryFn: async (): Promise<Paziente> => {
      const { data, error } = await supabase
        .from('pazienti')
        .select(PAZIENTE_SELECT)
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as Paziente
    },
  })
}

export function useSavePaziente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: {
      id?: string
      values: Omit<Inserts<'pazienti'>, 'created_by' | 'codice'> | Updates<'pazienti'>
    }) => {
      const { data: auth } = await supabase.auth.getUser()
      if (id) {
        const { error } = await supabase
          .from('pazienti')
          .update({ ...values, updated_by: auth.user?.id ?? null } as Updates<'pazienti'>)
          .eq('id', id)
        if (error) throw error
        return id
      }
      const { data, error } = await supabase
        .from('pazienti')
        .insert({ ...values, created_by: auth.user!.id } as Inserts<'pazienti'>)
        .select('id')
        .single()
      if (error) throw error
      return data.id
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: poliKeys.lista('pazienti') })
      if (v.id) qc.invalidateQueries({ queryKey: poliKeys.paziente(v.id) })
    },
  })
}

export function useArchivePaziente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pazienti').update({ attivo: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: poliKeys.lista('pazienti') }),
  })
}

export function useDeletePaziente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('pazienti').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: poliKeys.lista('pazienti') }),
  })
}

// Figli del paziente: consensi, condizioni (clinica), comunicazioni,
// visite (clinica), referti (clinica), appuntamenti.
export type PazienteFiglio =
  | 'pazienti_consensi' | 'pazienti_condizioni' | 'pazienti_comunicazioni'
  | 'visite' | 'referti' | 'appuntamenti'

export function useFigliPaziente<T>(pazienteId: string | undefined, tabella: PazienteFiglio) {
  return useQuery({
    queryKey: poliKeys.figliPaziente(pazienteId ?? '', tabella),
    enabled: !!pazienteId,
    queryFn: async (): Promise<T[]> => {
      const ord = tabella === 'appuntamenti' ? 'inizio'
        : tabella === 'visite' ? 'data'
        : tabella === 'pazienti_comunicazioni' ? 'data'
        : 'created_at'
      const { data, error } = await supabase
        .from(tabella as 'visite')
        .select('*')
        .eq('paziente_id', pazienteId!)
        .order(ord, { ascending: false })
      if (error) throw error
      return data as unknown as T[]
    },
  })
}

export function useCreaFiglioPaziente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ pazienteId, tabella, values }: {
      pazienteId: string; tabella: PazienteFiglio; values: Record<string, unknown>
    }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase
        .from(tabella)
        .insert({ ...values, paziente_id: pazienteId, created_by: auth.user!.id } as never)
      if (error) throw error
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: poliKeys.figliPaziente(v.pazienteId, v.tabella) }),
  })
}

export function useAggiornaFiglioPaziente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ tabella, id, values }: {
      pazienteId: string; tabella: PazienteFiglio; id: string; values: Record<string, unknown>
    }) => {
      const { error } = await supabase.from(tabella).update(values as never).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: poliKeys.figliPaziente(v.pazienteId, v.tabella) }),
  })
}

export function useEliminaFiglioPaziente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ tabella, id }: { pazienteId: string; tabella: PazienteFiglio; id: string }) => {
      const { error } = await supabase.from(tabella).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: poliKeys.figliPaziente(v.pazienteId, v.tabella) }),
  })
}

// ── Agenda ───────────────────────────────────────────────────────

const APP_SELECT = `*,
  paziente:pazienti(id, nome, cognome),
  professionista:professionisti(id, nome, cognome, colore),
  prestazione:prestazioni(nome, durata_minuti)`

export function useAppuntamenti() {
  return useQuery({
    queryKey: poliKeys.lista('appuntamenti'),
    queryFn: async (): Promise<Appuntamento[]> => {
      const { data, error } = await supabase
        .from('appuntamenti')
        .select(APP_SELECT)
        .order('inizio')
      if (error) throw error
      return data as unknown as Appuntamento[]
    },
  })
}

export function useSaveAppuntamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: {
      id?: string
      values: Omit<Inserts<'appuntamenti'>, 'created_by'> | Updates<'appuntamenti'>
    }) => {
      const { data: auth } = await supabase.auth.getUser()
      if (id) {
        const { error } = await supabase
          .from('appuntamenti')
          .update({ ...values, updated_by: auth.user?.id ?? null } as Updates<'appuntamenti'>)
          .eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('appuntamenti')
          .insert({ ...values, created_by: auth.user!.id } as Inserts<'appuntamenti'>)
        if (error) throw error
      }
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: poliKeys.lista('appuntamenti') })
      const pid = (v.values as { paziente_id?: string }).paziente_id
      if (pid) qc.invalidateQueries({ queryKey: poliKeys.figliPaziente(pid, 'appuntamenti') })
    },
  })
}

export function useDeleteAppuntamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('appuntamenti').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: poliKeys.lista('appuntamenti') }),
  })
}

// ── Referti (lista trasversale per la validazione) ───────────────

export function useRefertiDaValidare() {
  return useQuery({
    queryKey: poliKeys.lista('referti-da-validare'),
    queryFn: async (): Promise<Referto[]> => {
      const { data, error } = await supabase
        .from('referti')
        .select('*')
        .eq('stato', 'da_validare')
        .order('created_at')
      if (error) throw error
      return data
    },
  })
}

// ── KPI ──────────────────────────────────────────────────────────

export function usePoliKpi() {
  return useQuery({
    queryKey: poliKeys.kpi,
    queryFn: async () => {
      const { data, error } = await supabase.from('vw_poliambulatorio_kpi').select('*').maybeSingle()
      if (error) throw error
      return data
    },
  })
}
