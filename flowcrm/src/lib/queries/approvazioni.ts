/**
 * Query layer approvazioni — workflow autorizzativo generico dei moduli.
 * Le transizioni di stato sono governate dal trigger DB (solo admin/manager
 * decide, richiesta decisa immutabile, approvatore_id derivato).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Tables } from '@/lib/supabase'

export type Approvazione = Tables<'approvazioni'> & {
  richiedente: { nome: string; cognome: string | null } | null
  approvatore: { nome: string; cognome: string | null } | null
}

export const approvazioniKeys = {
  perEntita: (entita: string, entitaId: string) => ['approvazioni', entita, entitaId] as const,
}

const SELECT = `*,
  richiedente:user_profiles!approvazioni_richiedente_id_fkey(nome, cognome),
  approvatore:user_profiles!approvazioni_approvatore_id_fkey(nome, cognome)`

export function useApprovazioni(entita: string, entitaId: string) {
  return useQuery({
    queryKey: approvazioniKeys.perEntita(entita, entitaId),
    queryFn: async (): Promise<Approvazione[]> => {
      const { data, error } = await supabase
        .from('approvazioni')
        .select(SELECT)
        .eq('entita', entita)
        .eq('entita_id', entitaId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as Approvazione[]
    },
  })
}

interface NuovaApprovazione {
  modulo: string
  entita: string
  entitaId: string
  tipoRichiesta: string
  descrizione: string
  dati?: Record<string, unknown>
  azioneUrl?: string
}

export function useCreaApprovazione() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: NuovaApprovazione) => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Utente non autenticato')
      const { error } = await supabase.from('approvazioni').insert({
        modulo: input.modulo,
        entita: input.entita,
        entita_id: input.entitaId,
        tipo_richiesta: input.tipoRichiesta,
        descrizione: input.descrizione,
        dati: (input.dati ?? {}) as never,
        azione_url: input.azioneUrl ?? null,
        richiedente_id: auth.user.id,
      })
      if (error) throw error
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: approvazioniKeys.perEntita(v.entita, v.entitaId) }),
  })
}

interface Decisione {
  id: string
  entita: string
  entitaId: string
  stato: 'approvata' | 'rifiutata' | 'annullata'
  motivazione?: string
}

export function useDecidiApprovazione() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, stato, motivazione }: Decisione) => {
      const { error } = await supabase
        .from('approvazioni')
        .update({ stato, motivazione: motivazione ?? null })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: approvazioniKeys.perEntita(v.entita, v.entitaId) }),
  })
}
