/**
 * Query layer scadenze_moduli — scadenzario generico dei moduli verticali
 * (DURC, revisioni, bolli, cauzioni, tarature…). Le notifiche a soglie
 * [30,7,1,0] le crea il cron processa_scadenze_moduli sul DB.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Tables } from '@/lib/supabase'

export type ScadenzaModulo = Tables<'scadenze_moduli'>

export const scadenzeModuliKeys = {
  perEntita: (entita: string, entitaId: string) => ['scadenze-moduli', entita, entitaId] as const,
  perModulo: (modulo: string) => ['scadenze-moduli', 'modulo', modulo] as const,
}

export function useScadenzeModulo(entita: string, entitaId: string) {
  return useQuery({
    queryKey: scadenzeModuliKeys.perEntita(entita, entitaId),
    queryFn: async (): Promise<ScadenzaModulo[]> => {
      const { data, error } = await supabase
        .from('scadenze_moduli')
        .select('*')
        .eq('entita', entita)
        .eq('entita_id', entitaId)
        .order('data_scadenza')
      if (error) throw error
      return data
    },
  })
}

/** Tutte le scadenze aperte di un modulo (per dashboard/liste modulo). */
export function useScadenzeAperteModulo(modulo: string, limite = 20) {
  return useQuery({
    queryKey: scadenzeModuliKeys.perModulo(modulo),
    queryFn: async (): Promise<ScadenzaModulo[]> => {
      const { data, error } = await supabase
        .from('scadenze_moduli')
        .select('*')
        .eq('modulo', modulo)
        .eq('stato', 'aperta')
        .order('data_scadenza')
        .limit(limite)
      if (error) throw error
      return data
    },
  })
}

interface NuovaScadenza {
  modulo: string
  entita: string
  entitaId: string
  tipo: string
  descrizione: string
  dataScadenza: string // ISO YYYY-MM-DD
  soloManager?: boolean
  azioneUrl?: string
}

export function useCreaScadenzaModulo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: NuovaScadenza) => {
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('Utente non autenticato')
      const { error } = await supabase.from('scadenze_moduli').insert({
        modulo: input.modulo,
        entita: input.entita,
        entita_id: input.entitaId,
        tipo: input.tipo,
        descrizione: input.descrizione,
        data_scadenza: input.dataScadenza,
        solo_manager: input.soloManager ?? false,
        azione_url: input.azioneUrl ?? null,
        created_by: auth.user.id,
      })
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: scadenzeModuliKeys.perEntita(v.entita, v.entitaId) })
      qc.invalidateQueries({ queryKey: scadenzeModuliKeys.perModulo(v.modulo) })
    },
  })
}

export function useAggiornaScadenzaModulo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      entita: string
      entitaId: string
      modulo: string
      patch: Partial<Pick<ScadenzaModulo, 'stato' | 'descrizione' | 'data_scadenza' | 'tipo'>>
    }) => {
      const { error } = await supabase.from('scadenze_moduli').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: scadenzeModuliKeys.perEntita(v.entita, v.entitaId) })
      qc.invalidateQueries({ queryKey: scadenzeModuliKeys.perModulo(v.modulo) })
    },
  })
}

export function useEliminaScadenzaModulo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id }: { id: string; entita: string; entitaId: string; modulo: string }) => {
      const { error } = await supabase.from('scadenze_moduli').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: scadenzeModuliKeys.perEntita(v.entita, v.entitaId) })
      qc.invalidateQueries({ queryKey: scadenzeModuliKeys.perModulo(v.modulo) })
    },
  })
}
