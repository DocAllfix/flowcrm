/**
 * Query layer Supabase per la tabella notifiche.
 * Le notifiche si creano SOLO tramite la RPC crea_notifica() (SECURITY DEFINER):
 * qui gestiamo solo lettura e mark-as-read.
 */
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/supabase'

export type Notifica = Tables<'notifiche'>

/** Ultime 100 notifiche dell'utente, non lette prima. */
export async function getNotifiche(userId: string): Promise<Notifica[]> {
  const { data, error } = await supabase
    .from('notifiche')
    .select('*')
    .eq('destinatario_id', userId)
    .order('letta', { ascending: true, nullsFirst: true })
    .order('created_at', { ascending: false, nullsFirst: false })
    .limit(100)

  if (error) throw new Error(`Errore nel caricamento delle notifiche: ${error.message}`)
  return data ?? []
}

/** Segna una singola notifica come letta. */
export async function markNotificaAsRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifiche')
    .update({ letta: true, letta_at: new Date().toISOString() })
    .eq('id', id)

  if (error) throw new Error(`Errore nel segnare la notifica come letta: ${error.message}`)
}

/** Segna tutte le notifiche non lette dell'utente come lette. */
export async function markAllNotificheAsRead(userId: string): Promise<void> {
  const { error } = await supabase
    .from('notifiche')
    .update({ letta: true, letta_at: new Date().toISOString() })
    .eq('destinatario_id', userId)
    .eq('letta', false)

  if (error) throw new Error(`Errore nel segnare tutte le notifiche come lette: ${error.message}`)
}
