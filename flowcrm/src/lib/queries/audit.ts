import { useQuery } from '@tanstack/react-query'
import { supabase, type Tables } from '@/lib/supabase'

export type AuditEntry = Tables<'audit_log'> & {
  eseguito_da_profilo?: { nome: string; cognome: string | null } | null
}

/** Storico modifiche di una singola entità (audit_log immutabile). */
export function useAuditLog(entita: string, entitaId: string) {
  return useQuery({
    queryKey: ['audit', entita, entitaId],
    queryFn: async (): Promise<AuditEntry[]> => {
      const { data, error } = await supabase
        .from('audit_log')
        .select('*, eseguito_da_profilo:user_profiles!audit_log_eseguito_da_fkey(nome, cognome)')
        .eq('entita', entita)
        .eq('entita_id', entitaId)
        .order('created_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data as AuditEntry[]
    },
  })
}
