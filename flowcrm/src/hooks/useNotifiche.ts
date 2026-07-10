/**
 * useNotifiche — notifiche real-time con resilienza WebSocket (port CertDesk).
 *
 * Architettura:
 *   useNotificheSubscription() — gestisce il canale Realtime (UNA VOLTA in AppLayout)
 *   useNotifiche()             — legge dalla cache TanStack Query (usabile ovunque)
 *   useNotificheCount()        — contatore non lette (cache)
 *
 * Resilienza:
 *   1. Subscription Supabase Realtime (WebSocket) via postgres_changes INSERT
 *   2. Heartbeat ogni 30s — se il canale non è 'joined', ricrea il canale
 *   3. Polling fallback ogni 60s — se il WebSocket non è SUBSCRIBED
 */
import { useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type { RealtimeChannel } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'
import {
  getNotifiche,
  markNotificaAsRead,
  markAllNotificheAsRead,
  type Notifica,
} from '@/lib/queries/notifiche'
import { setConnectionStatus } from '@/hooks/useRealtimeStatus'
import { useAuth } from '@/hooks/useAuth'

const HEARTBEAT_MS = 30_000
const POLLING_MS = 60_000

export const notificheKeys = {
  all: (userId: string) => ['notifiche', userId] as const,
}

// Toast automatico per tipo (l'enum FlowCRM: info/warning/critical/success/sistema)
function showNotificaToast(n: Notifica): void {
  const opts = { description: n.messaggio }
  switch (n.tipo) {
    case 'critical': toast.error(n.titolo, opts); break
    case 'warning':  toast.warning(n.titolo, opts); break
    case 'success':  toast.success(n.titolo, opts); break
    default: break // 'info' e 'sistema' silenziosi
  }
}

// Factory del canale: usata sia al mount sia dalla riconnessione dell'heartbeat.
function creaCanale(
  userId: string,
  onInsert: (n: Notifica) => void,
): RealtimeChannel {
  return supabase
    .channel(`notifiche-user-${userId}-${Date.now()}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'notifiche', filter: `destinatario_id=eq.${userId}` },
      (payload) => onInsert(payload.new as Notifica),
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') setConnectionStatus('connected')
      else if (status === 'TIMED_OUT' || status === 'CLOSED') setConnectionStatus('reconnecting')
      else if (status === 'CHANNEL_ERROR') setConnectionStatus('error')
    })
}

// ── Subscription hook — UNA SOLA VOLTA in AppLayout ──────────────
export function useNotificheSubscription(): void {
  const qc = useQueryClient()
  const { user } = useAuth()
  const userId = user?.id
  const channelRef = useRef<RealtimeChannel | null>(null)
  const pollingRef = useRef(false)

  useEffect(() => {
    if (!userId) return

    setConnectionStatus('connecting')

    const onInsert = (n: Notifica) => {
      qc.invalidateQueries({ queryKey: notificheKeys.all(userId) })
      showNotificaToast(n)
      pollingRef.current = false
    }

    channelRef.current = creaCanale(userId, onInsert)

    // Heartbeat: se il canale non è più 'joined', ricrealo e passa in polling.
    const heartbeat = setInterval(() => {
      if (channelRef.current?.state !== 'joined') {
        setConnectionStatus('reconnecting')
        pollingRef.current = true
        if (channelRef.current) supabase.removeChannel(channelRef.current)
        channelRef.current = creaCanale(userId, onInsert)
      }
    }, HEARTBEAT_MS)

    // Polling fallback: se siamo in stato degradato, ricarica dalla cache.
    const polling = setInterval(() => {
      if (pollingRef.current) {
        setConnectionStatus('polling')
        qc.invalidateQueries({ queryKey: notificheKeys.all(userId) })
      }
    }, POLLING_MS)

    return () => {
      clearInterval(heartbeat)
      clearInterval(polling)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      setConnectionStatus('connecting')
    }
  }, [userId, qc])
}

// ── Lettura cache — nessuna subscription ─────────────────────────
export function useNotifiche() {
  const { user } = useAuth()
  const userId = user?.id

  return useQuery({
    queryKey: userId ? notificheKeys.all(userId) : ['notifiche', 'noop'],
    queryFn: () => getNotifiche(userId!),
    enabled: !!userId,
    staleTime: 1000 * 30,
  })
}

export function useNotificheCount(): number {
  const { data = [] } = useNotifiche()
  return data.filter((n) => !n.letta).length
}

// ── Mutation: segna come letta (optimistic + rollback) ───────────
export function useMarkAsRead() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const userId = user?.id

  return useMutation({
    mutationFn: (id: string) => markNotificaAsRead(id),
    onMutate: async (id: string) => {
      if (!userId) return
      const key = notificheKeys.all(userId)
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<Notifica[]>(key)
      if (prev) {
        qc.setQueryData<Notifica[]>(key, prev.map((n) =>
          n.id === id ? { ...n, letta: true, letta_at: new Date().toISOString() } : n
        ))
      }
      return { prev }
    },
    onError: (err: Error, _id, context) => {
      if (userId && context?.prev) qc.setQueryData(notificheKeys.all(userId), context.prev)
      toast.error('Errore', { description: err.message })
    },
    onSettled: () => {
      if (userId) qc.invalidateQueries({ queryKey: notificheKeys.all(userId) })
    },
  })
}

// ── Mutation: segna tutte come lette ─────────────────────────────
export function useMarkAllAsRead() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const userId = user?.id

  return useMutation({
    mutationFn: () => {
      if (!userId) throw new Error('Utente non autenticato')
      return markAllNotificheAsRead(userId)
    },
    onMutate: async () => {
      if (!userId) return
      const key = notificheKeys.all(userId)
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<Notifica[]>(key)
      if (prev) {
        const now = new Date().toISOString()
        qc.setQueryData<Notifica[]>(key, prev.map((n) =>
          n.letta ? n : { ...n, letta: true, letta_at: now }
        ))
      }
      return { prev }
    },
    onError: (err: Error, _vars, context) => {
      if (userId && context?.prev) qc.setQueryData(notificheKeys.all(userId), context.prev)
      toast.error('Errore', { description: err.message })
    },
    onSettled: () => {
      if (userId) qc.invalidateQueries({ queryKey: notificheKeys.all(userId) })
    },
  })
}
