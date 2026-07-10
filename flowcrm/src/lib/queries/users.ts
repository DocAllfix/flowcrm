import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Tables } from '@/lib/supabase'
import type { UserRole } from '@/types/app.types'

export type UserProfile = Tables<'user_profiles'>

const KEY = ['user_profiles'] as const

/** Elenco profili del team (RLS: visibile a tutti gli autenticati). */
export function useUsers() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<UserProfile[]> => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('nome')
      if (error) throw error
      return data
    },
  })
}

/** Aggiorna il proprio profilo (nome/cognome/avatar). */
export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<Pick<UserProfile, 'nome' | 'cognome' | 'avatar_url'>> & { id: string }) => {
      const { id, ...fields } = patch
      const { error } = await supabase.from('user_profiles').update(fields).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

/** Admin: cambia ruolo di un utente (RLS: solo admin passa). */
export function useSetUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ruolo }: { id: string; ruolo: UserRole }) => {
      const { error } = await supabase.from('user_profiles').update({ ruolo }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

/** Admin: attiva/disattiva un account (soft-lock, RLS: solo admin). */
export function useSetUserAttivo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, attivo }: { id: string; attivo: boolean }) => {
      const { error } = await supabase.from('user_profiles').update({ attivo }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
