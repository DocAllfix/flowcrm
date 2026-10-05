/**
 * Tipi e query del modulo Palestra (sopra gli hook generici delle fondamenta).
 */
import type { Tables } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { useElenco } from '@/lib/queries/fondamenta'

type Viste = Database['public']['Views']
export type SocioStato = Viste['pal_soci_stato']['Row']
export type Socio = Tables<'pal_soci'>
export type Formula = Tables<'pal_formule'>
export type Pacchetto = Tables<'pal_pacchetti'>
export type Abbonamento = Tables<'pal_abbonamenti'>
export type CarnetStato = Viste['pal_carnet_stato']['Row']
export type Rata = Tables<'pal_rate'>
export type Accesso = Tables<'pal_accessi'>
export type Sala = Tables<'pal_sale'>
export type Trainer = Tables<'pal_trainer'>
export type Corso = Tables<'pal_corsi'>
export type LezionePosti = Viste['pal_lezioni_posti']['Row']
export type PrenotazioneCorso = Tables<'pal_prenotazioni'>
export type SessionePt = Tables<'pal_sessioni_pt'>
export type Scheda = Tables<'pal_schede'>
export type Esercizio = Tables<'pal_schede_esercizi'>
export type Misurazione = Tables<'pal_misurazioni'>
export type Valutazione = Tables<'pal_valutazioni'>
export type ServizioWellness = Tables<'pal_servizi'>
export type Appuntamento = Tables<'pal_appuntamenti'>
export type Armadietto = Tables<'pal_armadietti'>
export type Convenzione = Tables<'pal_convenzioni'>
export type Sospensione = Tables<'pal_sospensioni'>
export type Prova = Tables<'pal_prove'>

/** Esito del controllo d'accesso. */
export interface EsitoAccesso {
  consentito: boolean
  motivo: string
  socio_id?: string
  socio?: string
  codice?: string
  abbonamento_id?: string
  carnet_id?: string
  residui?: number | null
  scadenza?: string | null
}

/** Tabelle toccate da vendite, incassi e ingressi (per ricaricare dopo un'azione). */
export const TABELLE_SOCIO = ['pal_soci', 'pal_soci_stato', 'pal_abbonamenti', 'pal_carnet', 'pal_carnet_stato', 'pal_rate', 'pal_accessi',
  'pal_presenti', 'pal_sospensioni', 'conti', 'conti_righe', 'conti_pagamenti', 'conti_saldi', 'scadenze_moduli']
export const TABELLE_CORSI = ['pal_lezioni', 'pal_lezioni_posti', 'pal_prenotazioni', 'pal_carnet', 'pal_carnet_stato', 'pal_rate', 'pal_soci']

export function useCatalogoPalestra(sedeId: string | null) {
  const on = !!sedeId
  const formule = useElenco<Formula>('pal_formule', { filtri: { attiva: true }, ordine: [{ colonna: 'ordine' }, { colonna: 'nome' }] })
  const pacchetti = useElenco<Pacchetto>('pal_pacchetti', { filtri: { attivo: true }, ordine: [{ colonna: 'nome' }] })
  const sale = useElenco<Sala>('pal_sale', { filtri: { sede_id: sedeId ?? undefined, attiva: true }, ordine: [{ colonna: 'nome' }], abilitato: on })
  const trainer = useElenco<Trainer>('pal_trainer', { filtri: { attivo: true }, ordine: [{ colonna: 'nome' }] })
  return {
    formule: formule.data ?? [], pacchetti: pacchetti.data ?? [], sale: sale.data ?? [], trainer: trainer.data ?? [],
    caricamento: formule.isLoading || sale.isLoading,
  }
}
