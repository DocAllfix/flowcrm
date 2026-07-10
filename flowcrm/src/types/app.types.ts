import type { Tables, DbEnum } from '@/lib/supabase'

/** Ruoli applicativi — enforcement reale via RLS Postgres, non nel frontend. */
export type UserRole = 'admin' | 'manager' | 'operatore'

export type UserProfile = Tables<'user_profiles'>

export type NotificaTipo = DbEnum<'notifica_tipo'>
