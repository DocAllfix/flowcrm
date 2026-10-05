/**
 * Tipi e query del modulo Garage (sopra gli hook generici delle fondamenta).
 */
import type { Tables } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { useElenco } from '@/lib/queries/fondamenta'

type Vista<V extends keyof Database['public']['Views']> = Database['public']['Views'][V]['Row']

export type Struttura = Tables<'gar_strutture'>
export type Area = Tables<'gar_aree'>
export type Posto = Tables<'gar_posti'>
export type PostoStato = Vista<'gar_posti_stato'>
export type Cliente = Tables<'gar_clienti'>
export type ClienteRiepilogo = Vista<'gar_clienti_riepilogo'>
export type Veicolo = Tables<'gar_veicoli'>
export type Tariffario = Tables<'gar_tariffari'>
export type Festivo = Tables<'gar_festivi'>
export type Convenzione = Tables<'gar_convenzioni'>
export type Contratto = Tables<'gar_contratti'>
export type Rata = Tables<'gar_rate'>
export type Autorizzazione = Tables<'gar_autorizzazioni'>
export type Prenotazione = Tables<'gar_prenotazioni'>
export type Sosta = Tables<'gar_soste'>
export type Chiave = Tables<'gar_chiavi'>
export type MovimentoChiave = Tables<'gar_chiavi_movimenti'>
export type Danno = Tables<'gar_danni'>
export type Colonnina = Tables<'gar_colonnine'>
export type ColonninaStato = Vista<'gar_colonnine_stato'>
export type Ricarica = Tables<'gar_ricariche'>
export type VoceListino = Tables<'gar_servizi_listino'>
export type Servizio = Tables<'gar_servizi'>
export type Pneumatici = Tables<'gar_pneumatici'>
export type Attesa = Tables<'gar_attese'>

export interface EsitoAccesso {
  consentito: boolean; titolo: string; motivo: string; avviso?: string | null
  cliente_id?: string | null; veicolo_id?: string | null; posto_id?: string | null; contratto_id?: string | null
}
export interface EsitoIngresso { sosta_id: string; ticket: string; posto_id: string; posto: string; titolo: string; motivo: string; avviso: string | null }
export interface EsitoUscita { sosta_id: string; ticket: string; minuti: number; importo: number; conto_id: string | null; titolo: string }

/** Tabelle toccate da ingressi, uscite e incassi (per ricaricare dopo un'azione). */
export const TABELLE_SOSTA = ['gar_soste', 'gar_posti_stato', 'gar_prenotazioni', 'gar_clienti_riepilogo', 'gar_ricariche', 'gar_colonnine_stato',
  'conti', 'conti_righe', 'conti_saldi', 'conti_pagamenti']
export const TABELLE_CONTRATTO = ['gar_contratti', 'gar_rate', 'gar_posti_stato', 'gar_clienti_riepilogo', 'gar_posti_assegnabili', 'gar_attese',
  'conti', 'conti_saldi', 'conti_pagamenti', 'scadenze_moduli']

/** Clienti attivi e veicoli: servono a quasi tutti i dialoghi. */
export function useAnagrafica() {
  const clienti = useElenco<Cliente>('gar_clienti', { filtri: { attivo: true }, ordine: [{ colonna: 'nome' }] })
  const veicoli = useElenco<Veicolo>('gar_veicoli', { ordine: [{ colonna: 'targa' }] })
  return { clienti: clienti.data ?? [], veicoli: veicoli.data ?? [] }
}

export const nomeCliente = (clienti: Pick<Cliente, 'id' | 'nome'>[], id: string | null | undefined) => clienti.find((c) => c.id === id)?.nome ?? null
