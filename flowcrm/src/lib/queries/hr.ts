import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Tables, type Inserts } from '@/lib/supabase'

export type Dipendente = Tables<'dipendenti'>
export type Assenza = Tables<'assenze'>
export type Formazione = Tables<'formazione'>
export type TipoContratto = Tables<'dipendenti'>['tipo_contratto']

// ── DIPENDENTI ──────────────────────────────────────────────────
export function useDipendenti() {
  return useQuery({
    queryKey: ['dipendenti'],
    queryFn: async (): Promise<Dipendente[]> => {
      const { data, error } = await supabase.from('dipendenti').select('*').eq('attivo', true).order('cognome', { nullsFirst: false }).order('nome')
      if (error) throw error
      return data
    },
  })
}

export function useDipendente(id: string | undefined) {
  return useQuery({
    queryKey: ['dipendenti', 'detail', id],
    enabled: !!id,
    queryFn: async (): Promise<Dipendente> => {
      const { data, error } = await supabase.from('dipendenti').select('*').eq('id', id!).single()
      if (error) throw error
      return data
    },
  })
}

export function useSaveDipendente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id?: string; values: Omit<Inserts<'dipendenti'>, 'created_by' | 'updated_by'> }) => {
      const { data: auth } = await supabase.auth.getUser()
      const uid = auth.user!.id
      if (id) {
        const { error } = await supabase.from('dipendenti').update({ ...values, updated_by: uid }).eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('dipendenti').insert({ ...values, created_by: uid })
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dipendenti'] }),
  })
}

export function useArchiveDipendente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('dipendenti').update({ attivo: false, updated_by: auth.user!.id }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dipendenti'] }),
  })
}

export function useDeleteDipendente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('dipendenti').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['dipendenti'] }),
  })
}

// ── ASSENZE (ferie/permessi/malattia) ───────────────────────────
export function useAssenze(dipId: string | undefined) {
  return useQuery({
    queryKey: ['assenze', dipId],
    enabled: !!dipId,
    queryFn: async (): Promise<Assenza[]> => {
      const { data, error } = await supabase.from('assenze').select('*').eq('dipendente_id', dipId!).order('data_inizio', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useCreateAssenza() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<Inserts<'assenze'>, 'created_by'>) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('assenze').insert({ ...values, created_by: auth.user!.id })
      if (error) throw error
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['assenze', v.dipendente_id] }),
  })
}

export function useSetAssenzaStato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, stato }: { id: string; stato: Assenza['stato']; dipendente_id: string }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('assenze').update({ stato, updated_by: auth.user!.id }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['assenze', v.dipendente_id] }),
  })
}

export function useDeleteAssenza() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; dipendente_id: string }) => {
      const { error } = await supabase.from('assenze').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['assenze', v.dipendente_id] }),
  })
}

// ── FORMAZIONE ──────────────────────────────────────────────────
export function useFormazione(dipId: string | undefined) {
  return useQuery({
    queryKey: ['formazione', dipId],
    enabled: !!dipId,
    queryFn: async (): Promise<Formazione[]> => {
      const { data, error } = await supabase.from('formazione').select('*').eq('dipendente_id', dipId!).order('data', { ascending: false, nullsFirst: false })
      if (error) throw error
      return data
    },
  })
}

export function useCreateFormazione() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (values: Omit<Inserts<'formazione'>, 'created_by'>) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('formazione').insert({ ...values, created_by: auth.user!.id })
      if (error) throw error
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['formazione', v.dipendente_id] }),
  })
}

export function useToggleFormazione() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, completato }: { id: string; completato: boolean; dipendente_id: string }) => {
      const { data: auth } = await supabase.auth.getUser()
      const { error } = await supabase.from('formazione').update({ completato, updated_by: auth.user!.id }).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['formazione', v.dipendente_id] }),
  })
}

export function useDeleteFormazione() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; dipendente_id: string }) => {
      const { error } = await supabase.from('formazione').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['formazione', v.dipendente_id] }),
  })
}
