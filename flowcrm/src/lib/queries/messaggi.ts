import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase, type Tables } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'

export type Messaggio = Tables<'messaggi'> & {
  autore: { id: string; nome: string; cognome: string | null } | null
}

/** Feed di un record ('deals'|'organizzazioni'|'commesse'+id) o canale 'team' (id undefined). */
export interface FeedTarget {
  entita: string
  entitaId?: string
}

export const messaggiKeys = {
  feed: (t: FeedTarget) => ['messaggi', t.entita, t.entitaId ?? 'team'] as const,
}

/**
 * Messaggi del feed + canale Realtime che invalida la cache a ogni INSERT.
 * Pattern CertDesk (useMessaggiPratica) generalizzato a entità polimorfica.
 */
export function useFeed(target: FeedTarget) {
  const qc = useQueryClient()
  const channelRef = useRef<RealtimeChannel | null>(null)
  const { entita, entitaId } = target

  useEffect(() => {
    const filtro = entitaId
      ? `entita_id=eq.${entitaId}`
      : `entita=eq.${entita}`
    const channel = supabase
      .channel(`messaggi-${entita}-${entitaId ?? 'team'}-${Date.now()}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messaggi', filter: filtro },
        () => qc.invalidateQueries({ queryKey: messaggiKeys.feed(target) }),
      )
      .subscribe()
    channelRef.current = channel
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entita, entitaId, qc])

  return useQuery({
    queryKey: messaggiKeys.feed(target),
    queryFn: async (): Promise<Messaggio[]> => {
      let q = supabase
        .from('messaggi')
        .select('*, autore:user_profiles!messaggi_autore_id_fkey(id, nome, cognome)')
        .eq('entita', entita)
        .order('created_at', { ascending: true })
        .limit(200)
      q = entitaId ? q.eq('entita_id', entitaId) : q.is('entita_id', null)
      const { data, error } = await q
      if (error) throw error
      return data as Messaggio[]
    },
    staleTime: 30_000,
  })
}

export function useSendMessaggio(target: FeedTarget) {
  const qc = useQueryClient()
  const { user } = useAuth()
  return useMutation({
    mutationFn: async ({ testo, menzioni }: { testo: string; menzioni?: string[] }) => {
      if (!user?.id) throw new Error('Utente non autenticato')
      const { error } = await supabase.from('messaggi').insert({
        entita: target.entita,
        entita_id: target.entitaId ?? null,
        autore_id: user.id,
        testo,
        menzioni: menzioni ?? [],
      })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: messaggiKeys.feed(target) }),
    onError: (err: Error) => toast.error("Errore nell'invio", { description: err.message }),
  })
}
