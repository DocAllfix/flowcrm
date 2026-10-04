/**
 * Query comuni per le fondamenta dei moduli verticali (magazzino, asset,
 * cassa, fidelizzazione, turni, campagne, registri, eventi) e per il
 * motore food & beverage.
 *
 * Le tabelle sono tante e simili: invece di un hook per tabella, un hook
 * generico tipizzato sul nome della tabella. La RLS resta la barriera:
 * qui si legge e si scrive solo ciò che la policy consente, e un modulo
 * spento restituisce zero righe.
 */
import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, type Tables, type Inserts, type Updates } from '@/lib/supabase'
import type { Database } from '@/types/database.types'

type NomeTabella = keyof Database['public']['Tables']
type NomeVista = keyof Database['public']['Views']
type NomeFunzione = keyof Database['public']['Functions']

export type Filtri = Record<string, string | number | boolean | null | readonly (string | number)[] | undefined>

export const fondKeys = {
  tabella: (t: string) => ['fond', t] as const,
  elenco: (t: string, f: unknown) => ['fond', t, f] as const,
  rpc: (fn: string, args: unknown) => ['fond-rpc', fn, args] as const,
}

interface OpzioniElenco {
  filtri?: Filtri
  /** Intervallo su una colonna (date, istanti): `da` incluso, `a` escluso. */
  tra?: { colonna: string; da?: string; a?: string }
  ordine?: { colonna: string; crescente?: boolean }[]
  select?: string
  limite?: number
  abilitato?: boolean
  /** Aggiorna ogni N millisecondi (cucina, banco). */
  intervallo?: number
}

/** Elenco di righe da una tabella o vista, con filtri di uguaglianza / appartenenza. */
export function useElenco<T = Record<string, unknown>>(
  tabella: NomeTabella | NomeVista,
  { filtri, tra, ordine, select = '*', limite, abilitato = true, intervallo }: OpzioniElenco = {},
) {
  return useQuery({
    queryKey: fondKeys.elenco(tabella, { filtri, tra, ordine, select, limite }),
    enabled: abilitato,
    refetchInterval: intervallo,
    queryFn: async (): Promise<T[]> => {
      let q = supabase.from(tabella as 'conti').select(select)
      for (const [colonna, valore] of Object.entries(filtri ?? {})) {
        if (valore === undefined) continue
        if (valore === null) q = q.is(colonna as 'id', null)
        else if (Array.isArray(valore)) q = q.in(colonna as 'id', valore as string[])
        else q = q.eq(colonna as 'id', valore as string)
      }
      if (tra?.da) q = q.gte(tra.colonna as 'id', tra.da)
      if (tra?.a) q = q.lt(tra.colonna as 'id', tra.a)
      for (const o of ordine ?? []) q = q.order(o.colonna as 'id', { ascending: o.crescente ?? true })
      if (limite) q = q.limit(limite)
      const { data, error } = await q
      if (error) throw error
      return data as unknown as T[]
    },
  })
}

/** Una riga per id. */
export function useRiga<T = Record<string, unknown>>(tabella: NomeTabella | NomeVista, id: string | undefined,
                                                     select = '*', colonnaId = 'id') {
  return useQuery({
    queryKey: [...fondKeys.tabella(tabella), 'riga', id, select],
    enabled: !!id,
    queryFn: async (): Promise<T> => {
      const { data, error } = await supabase.from(tabella as 'conti').select(select).eq(colonnaId as 'id', id!).single()
      if (error) throw error
      return data as unknown as T
    },
  })
}

/** Chiamata a una funzione del database letta come query (cruscotti, analisi). */
export function useRpc<T>(fn: NomeFunzione, args: Record<string, unknown>,
                          { abilitato = true, intervallo }: { abilitato?: boolean; intervallo?: number } = {}) {
  return useQuery({
    queryKey: fondKeys.rpc(fn, args),
    enabled: abilitato,
    refetchInterval: intervallo,
    queryFn: async (): Promise<T> => {
      const { data, error } = await supabase.rpc(fn as 'fb_cruscotto', args as never)
      if (error) throw error
      return data as unknown as T
    },
  })
}

function invalida(qc: ReturnType<typeof useQueryClient>, tabelle: readonly string[]) {
  for (const t of tabelle) qc.invalidateQueries({ queryKey: fondKeys.tabella(t) })
  qc.invalidateQueries({ queryKey: ['fond-rpc'] })
}

/**
 * Salva una riga: con `id` aggiorna, senza inserisce (con l'autore).
 * `invalida` elenca le altre tabelle toccate dai trigger (es. una riga di
 * comanda cambia anche il conto).
 */
export function useSalva<N extends NomeTabella>(tabella: N, altreTabelle: readonly string[] = []) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Partial<Inserts<N>> | Updates<N> }): Promise<Tables<N>> => {
      const { data: auth } = await supabase.auth.getUser()
      if (id) {
        const { data, error } = await supabase.from(tabella as 'conti')
          .update({ ...(values as object), updated_by: auth.user?.id ?? null } as never)
          .eq('id', id).select().single()
        if (error) throw error
        return data as unknown as Tables<N>
      }
      const { data, error } = await supabase.from(tabella as 'conti')
        .insert({ ...(values as object), created_by: auth.user!.id } as never)
        .select().single()
      if (error) throw error
      return data as unknown as Tables<N>
    },
    onSuccess: () => invalida(qc, [tabella, ...altreTabelle]),
  })
}

/** Inserimento senza colonne di aggiornamento (registri append-only: movimenti, pagamenti…). */
export function useInserisci<N extends NomeTabella>(tabella: N, altreTabelle: readonly string[] = []) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Partial<Inserts<N>>): Promise<Tables<N>> => {
      const { data: auth } = await supabase.auth.getUser()
      const { data, error } = await supabase.from(tabella as 'conti')
        .insert({ ...(values as object), created_by: auth.user!.id } as never).select().single()
      if (error) throw error
      return data as unknown as Tables<N>
    },
    onSuccess: () => invalida(qc, [tabella, ...altreTabelle]),
  })
}

export function useElimina(tabella: NomeTabella, altreTabelle: readonly string[] = []) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(tabella as 'conti').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalida(qc, [tabella, ...altreTabelle]),
  })
}

/** Funzione del database che modifica dati (chiudi conto, marcia, rifai…). */
export function useAzione<A extends Record<string, unknown>, R = unknown>(fn: NomeFunzione, tabelle: readonly string[]) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: A): Promise<R> => {
      const { data, error } = await supabase.rpc(fn as 'chiudi_conto', args as never)
      if (error) throw error
      return data as unknown as R
    },
    onSuccess: () => invalida(qc, tabelle),
  })
}

/**
 * Aggiornamento dal vivo: a ogni cambiamento delle tabelle indicate (che
 * devono essere nella pubblicazione `supabase_realtime`) le query di quelle
 * tabelle si ricaricano. Raggruppa le raffiche in un solo ricaricamento.
 */
export function useDalVivo(tabelle: readonly string[], chiaviExtra: readonly QueryKey[] = []) {
  const qc = useQueryClient()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firma = tabelle.join(',')
  useEffect(() => {
    let canale: RealtimeChannel | null = supabase.channel(`dal-vivo-${firma}-${Date.now()}`)
    const ricarica = () => {
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        invalida(qc, tabelle)
        for (const k of chiaviExtra) qc.invalidateQueries({ queryKey: k })
      }, 250)
    }
    for (const t of tabelle) {
      canale = canale.on('postgres_changes', { event: '*', schema: 'public', table: t }, ricarica)
    }
    canale.subscribe()
    return () => {
      if (timer.current) clearTimeout(timer.current)
      if (canale) supabase.removeChannel(canale)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma])
}

/** Messaggio leggibile dagli errori del database (vincoli, permessi). */
export function messaggioErrore(e: unknown): string {
  const err = e as { code?: string; message?: string }
  if (err?.code === '23P01') return 'Sovrapposizione: c\'è già qualcosa in quella fascia.'
  if (err?.code === '42501') return 'Operazione non consentita al tuo ruolo.'
  if (err?.code === '23505') return 'Esiste già un elemento uguale.'
  return err?.message ?? 'Errore imprevisto'
}
