import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Tables, type Inserts } from '@/lib/supabase'

export type Fattura = Tables<'fatture'> & {
  organizzazione: { id: string; ragione_sociale: string } | null
}
export type ScadenzaPagamento = Tables<'scadenze_pagamento'> & {
  organizzazione: { id: string; ragione_sociale: string } | null
}
export type ScadenzaTassa = Tables<'scadenze_tasse'>
export type FatturaDirezione = Tables<'fatture'>['direzione']

// ── FATTURE ──────────────────────────────────────────────────────
export function useFatture(direzione: FatturaDirezione) {
  return useQuery({
    queryKey: ['fatture', direzione],
    queryFn: async (): Promise<Fattura[]> => {
      const { data, error } = await supabase
        .from('fatture')
        .select('*, organizzazione:organizzazioni(id, ragione_sociale)')
        .eq('direzione', direzione)
        .order('data', { ascending: false })
      if (error) throw error
      return data as Fattura[]
    },
  })
}

export function useCreateFattura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<Inserts<'fatture'>, 'created_by'>) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('fatture').insert({ ...input, created_by: auth.user!.id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['fatture'] }),
  })
}

// ── SCADENZE PAGAMENTO (incassi) ─────────────────────────────────
export function useIncassi() {
  return useQuery({
    queryKey: ['scadenze_pagamento'],
    queryFn: async (): Promise<ScadenzaPagamento[]> => {
      const { data, error } = await supabase
        .from('scadenze_pagamento')
        .select('*, organizzazione:organizzazioni(id, ragione_sociale)')
        .order('data_prevista')
      if (error) throw error
      return data as ScadenzaPagamento[]
    },
  })
}

export function useSetIncassato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, incassato }: { id: string; incassato: boolean }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase
        .from('scadenze_pagamento')
        .update({
          stato: incassato ? 'incassato' : 'da_incassare',
          incassato_at: incassato ? new Date().toISOString().slice(0, 10) : null,
          updated_by: auth.user!.id,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scadenze_pagamento'] }),
  })
}

// ── SCADENZE TASSE ───────────────────────────────────────────────
export function useTasse() {
  return useQuery({
    queryKey: ['scadenze_tasse'],
    queryFn: async (): Promise<ScadenzaTassa[]> => {
      const { data, error } = await supabase
        .from('scadenze_tasse')
        .select('*')
        .order('scadenza')
      if (error) throw error
      return data
    },
  })
}

export function useCreateTassa() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Omit<Inserts<'scadenze_tasse'>, 'created_by'>) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('scadenze_tasse').insert({ ...input, created_by: auth.user!.id })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scadenze_tasse'] }),
  })
}
