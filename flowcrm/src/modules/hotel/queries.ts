/**
 * Tipi e query del modulo Hotel (sopra gli hook generici delle fondamenta).
 */
import type { Tables } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { useElenco, useRpc } from '@/lib/queries/fondamenta'

export type Tipologia = Tables<'hotel_tipologie'>
export type Camera = Tables<'hotel_camere'>
export type CameraStato = Database['public']['Views']['hotel_camere_stato']['Row']
export type Trattamento = Tables<'hotel_trattamenti'>
export type Piano = Tables<'hotel_piani_tariffari'>
export type Tariffa = Tables<'hotel_tariffe'>
export type Prenotazione = Tables<'hotel_prenotazioni'>
export type Notte = Tables<'hotel_notti'>
export type Ospite = Tables<'hotel_ospiti'>
export type SoggiornoOspite = Tables<'hotel_soggiorno_ospiti'>
export type Gruppo = Tables<'hotel_gruppi'>
export type Intermediario = Tables<'hotel_intermediari'>
export type Pulizia = Tables<'hotel_pulizie'>
export type Manutenzione = Tables<'hotel_manutenzioni'>
export type Servizio = Tables<'hotel_servizi'>
export type ServizioPrenotazione = Tables<'hotel_servizi_prenotazioni'>
export type Disponibilita = Database['public']['Functions']['hotel_disponibilita']['Returns'][number]

export interface Quota {
  notti: { data: string; camera: number; trattamento: number }[]
  numero_notti: number
  totale: number
  valida: boolean
  motivi: string[]
  caparra: number
  trattamento: string | null
}

/** Tabelle toccate dal soggiorno (per ricaricare dopo un'azione). */
export const TABELLE_SOGGIORNO = ['hotel_prenotazioni', 'hotel_notti', 'hotel_camere', 'hotel_camere_stato', 'hotel_soggiorno_ospiti',
  'hotel_pulizie', 'conti', 'conti_righe', 'conti_pagamenti', 'conti_saldi', 'conti_rimborsi', 'hotel_conti_in_casa']

export function useCatalogoHotel(strutturaId: string | null) {
  const on = !!strutturaId
  const tipologie = useElenco<Tipologia>('hotel_tipologie', { filtri: { struttura_id: strutturaId ?? undefined }, ordine: [{ colonna: 'ordine' }, { colonna: 'nome' }], abilitato: on })
  const camere = useElenco<Camera>('hotel_camere', { filtri: { struttura_id: strutturaId ?? undefined, attiva: true }, ordine: [{ colonna: 'piano' }, { colonna: 'numero' }], abilitato: on })
  const trattamenti = useElenco<Trattamento>('hotel_trattamenti', { filtri: { struttura_id: strutturaId ?? undefined }, ordine: [{ colonna: 'ordine' }], abilitato: on })
  const piani = useElenco<Piano>('hotel_piani_tariffari', { filtri: { struttura_id: strutturaId ?? undefined }, ordine: [{ colonna: 'ordine' }, { colonna: 'nome' }], abilitato: on })
  return {
    tipologie: tipologie.data ?? [], camere: camere.data ?? [], trattamenti: trattamenti.data ?? [], piani: piani.data ?? [],
    caricamento: tipologie.isLoading || camere.isLoading,
  }
}

export function useCamereStato(strutturaId: string | null) {
  return useElenco<CameraStato>('hotel_camere_stato', {
    filtri: { struttura_id: strutturaId ?? undefined }, ordine: [{ colonna: 'piano' }, { colonna: 'numero' }], abilitato: !!strutturaId, intervallo: 60_000,
  })
}

/** Prenotazioni che toccano il periodo (arrivo prima della fine, partenza dopo l'inizio). */
export function usePrenotazioniPeriodo(strutturaId: string | null, dal: string, al: string, stati?: string[]) {
  const q = useElenco<Prenotazione>('hotel_prenotazioni', {
    filtri: { struttura_id: strutturaId ?? undefined, stato: stati },
    tra: { colonna: 'arrivo', a: al }, ordine: [{ colonna: 'arrivo' }], limite: 2000, abilitato: !!strutturaId,
  })
  return { ...q, data: (q.data ?? []).filter((p) => p.partenza > dal) }
}

export function useQuota(args: {
  p_struttura: string | null; p_tipologia: string; p_arrivo: string; p_partenza: string; p_adulti: number; p_bambini: number
  p_piano: string | null; p_trattamento: string | null; p_canale: string
}) {
  const valido = !!args.p_struttura && !!args.p_tipologia && !!args.p_arrivo && !!args.p_partenza && args.p_partenza > args.p_arrivo
  return useRpc<Quota>('hotel_quota', { ...args, p_piano: args.p_piano || undefined, p_trattamento: args.p_trattamento || undefined },
    { abilitato: valido })
}
