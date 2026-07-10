import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Tables, type Inserts, type DbEnum } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export type Organizzazione = Tables<'organizzazioni'>
export type OrgRuolo = DbEnum<'org_ruolo'>

export interface OrganizzazioneConRuoli extends Organizzazione {
  ruoli: OrgRuolo[]
}

const KEY = 'organizzazioni'

export const ORG_RUOLI: OrgRuolo[] = [
  'cliente', 'fornitore', 'partner', 'potenziale_partner', 'prospect',
]

export const RUOLO_LABEL: Record<OrgRuolo, string> = {
  cliente: 'Cliente',
  fornitore: 'Fornitore',
  partner: 'Partner',
  potenziale_partner: 'Potenziale partner',
  prospect: 'Prospect',
}

/** Lista organizzazioni, opzionalmente filtrata per ruolo. */
export function useOrganizzazioni(ruolo?: OrgRuolo) {
  return useQuery({
    queryKey: [KEY, 'list', ruolo ?? 'all'],
    queryFn: async (): Promise<OrganizzazioneConRuoli[]> => {
      const { data, error } = await supabase
        .from('organizzazioni')
        .select('*, organizzazioni_ruoli(ruolo)')
        .eq('attivo', true)
        .order('ragione_sociale')
      if (error) throw error
      const mapped = (data ?? []).map((o) => {
        const { organizzazioni_ruoli, ...rest } = o as typeof o & {
          organizzazioni_ruoli: { ruolo: OrgRuolo }[]
        }
        return { ...rest, ruoli: organizzazioni_ruoli.map((r) => r.ruolo) }
      })
      return ruolo ? mapped.filter((o) => o.ruoli.includes(ruolo)) : mapped
    },
  })
}

/** Singola organizzazione con ruoli (per la scheda 360°). */
export function useOrganizzazione(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: [KEY, 'detail', id],
    queryFn: async (): Promise<OrganizzazioneConRuoli> => {
      const { data, error } = await supabase
        .from('organizzazioni')
        .select('*, organizzazioni_ruoli(ruolo)')
        .eq('id', id!)
        .single()
      if (error) throw error
      const { organizzazioni_ruoli, ...rest } = data as typeof data & {
        organizzazioni_ruoli: { ruolo: OrgRuolo }[]
      }
      return { ...rest, ruoli: organizzazioni_ruoli.map((r) => r.ruolo) }
    },
  })
}

type OrgInput = Omit<Inserts<'organizzazioni'>, 'created_by' | 'updated_by'>

export function useSaveOrganizzazione() {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({
      id, values, ruoli,
    }: { id?: string; values: OrgInput; ruoli: OrgRuolo[] }) => {
      let orgId = id
      if (id) {
        const { error } = await supabase
          .from('organizzazioni')
          .update({ ...values, updated_by: user!.id })
          .eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('organizzazioni')
          .insert({ ...values, created_by: user!.id })
          .select('id')
          .single()
        if (error) throw error
        orgId = data.id
      }

      // Sincronizza i ruoli (delete+insert: set piccolo, semplice)
      await supabase.from('organizzazioni_ruoli').delete().eq('organizzazione_id', orgId!)
      if (ruoli.length > 0) {
        const { error } = await supabase
          .from('organizzazioni_ruoli')
          .insert(ruoli.map((ruolo) => ({ organizzazione_id: orgId!, ruolo })))
        if (error) throw error
      }
      return orgId!
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}

export function useDeleteOrganizzazione() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('organizzazioni').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [KEY] }),
  })
}
