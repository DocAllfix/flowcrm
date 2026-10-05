/**
 * Tipi e query del modulo Fioraio (sopra gli hook generici delle fondamenta).
 */
import type { Tables } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { useElenco, useRpc } from '@/lib/queries/fondamenta'

export type Impostazioni = Tables<'fior_impostazioni'>
export type Zona = Tables<'fior_zone'>
export type Ordine = Tables<'fior_ordini'>
export type RigaOrdine = Tables<'fior_ordini_righe'>
export type Materiale = Tables<'fior_righe_materiali'>
export type Produzione = Tables<'fior_produzione'>
export type Consegna = Tables<'fior_consegne'>
export type Ricorrenza = Tables<'fior_ricorrenze'>
export type Abbonamento = Tables<'fior_abbonamenti'>
export type Cerimonia = Tables<'fior_cerimonie'>
export type Reso = Tables<'fior_resi'>
export type Articolo = Tables<'mag_articoli'>
export type Composizione = Database['public']['Functions']['fior_composizioni_disponibili']['Returns'][number]
export type ClienteRiepilogo = Database['public']['Views']['fior_clienti_riepilogo']['Row']
export type Persona = Pick<Tables<'user_profiles'>, 'id' | 'nome' | 'cognome' | 'attivo'>

export interface Stima { materiali: number; manodopera: number; costo: number; prezzo: number; ricarico_pct: number }

/** Tabelle toccate da un ordine (per ricaricare dopo un'azione). */
export const TABELLE_ORDINE = ['fior_ordini', 'fior_ordini_righe', 'fior_righe_materiali', 'fior_produzione', 'fior_consegne', 'fior_ricorrenze', 'fior_resi',
  'fior_clienti_riepilogo', 'conti', 'conti_righe', 'conti_saldi', 'conti_pagamenti', 'mag_giacenze', 'mag_movimenti', 'mag_lotti_stato']

export function useImpostazioni() {
  const q = useElenco<Impostazioni>('fior_impostazioni')
  return { impostazioni: q.data?.[0] ?? null, caricamento: q.isLoading }
}

export function useCatalogoFioraio() {
  const articoli = useElenco<Articolo>('mag_articoli', { filtri: { modulo: 'fioraio', attivo: true }, ordine: [{ colonna: 'descrizione' }] })
  const composizioni = useRpc<Composizione[]>('fior_composizioni_disponibili', {})
  const zone = useElenco<Zona>('fior_zone', { filtri: { attiva: true }, ordine: [{ colonna: 'ordine' }, { colonna: 'nome' }] })
  const persone = useElenco<Persona>('user_profiles', { select: 'id, nome, cognome, attivo', ordine: [{ colonna: 'nome' }] })
  return {
    articoli: articoli.data ?? [], composizioni: composizioni.data ?? [], zone: zone.data ?? [],
    persone: (persone.data ?? []).filter((p) => p.attivo),
  }
}

export const nomePersona = (persone: Persona[], id: string | null) => {
  const p = persone.find((x) => x.id === id)
  return p ? `${p.nome} ${p.cognome ?? ''}`.trim() : null
}
