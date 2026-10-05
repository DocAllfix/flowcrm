/**
 * Tipi e query del modulo Agenzia immobiliare (sopra gli hook generici delle fondamenta).
 */
import type { Tables } from '@/lib/supabase'
import type { Database } from '@/types/database.types'
import { useElenco } from '@/lib/queries/fondamenta'
import { useAuth } from '@/hooks/useAuth'

type Vista<V extends keyof Database['public']['Views']> = Database['public']['Views'][V]['Row']

export type Impostazioni = Tables<'imm_impostazioni'>
export type Agente = Tables<'imm_agenti'>
export type AgenteRiepilogo = Vista<'imm_agenti_riepilogo'>
export type Collaboratore = Tables<'imm_collaboratori'>
export type Immobile = Tables<'imm_immobili'>
export type Proprietario = Tables<'imm_proprietari'>
export type Documento = Tables<'imm_documenti'>
export type Incarico = Tables<'imm_incarichi'>
export type Valutazione = Tables<'imm_valutazioni'>
export type Annuncio = Tables<'imm_annunci'>
export type Marketing = Tables<'imm_marketing'>
export type Richiesta = Tables<'imm_richieste'>
export type Selezione = Tables<'imm_selezioni'>
export type Lead = Tables<'imm_lead'>
export type Visita = Tables<'imm_visite'>
export type Proposta = Tables<'imm_proposte'>
export type Chiusura = Tables<'imm_chiusure'>
export type Locazione = Tables<'imm_locazioni'>
export type Canone = Tables<'imm_canoni'>
export type Provvigione = Tables<'imm_provvigioni'>
export type Ripartizione = Tables<'imm_ripartizioni'>
export type Modello = Tables<'imm_modelli'>
export type ContrattoDoc = Tables<'imm_contratti'>
export type Aml = Tables<'imm_aml_verifiche'>
export type Privacy = Tables<'imm_privacy'>
export type ContattoBreve = Pick<Tables<'contatti'>, 'id' | 'nome' | 'cognome' | 'email' | 'telefono'>
export type Utente = Pick<Tables<'user_profiles'>, 'id' | 'nome' | 'cognome' | 'attivo'>
export type Match = { immobile_id: string; punteggio: number; motivi: string[] }
export type MatchImmobile = { richiesta_id: string; contatto_id: string; punteggio: number; motivi: string[] }
export type VoceAgenda = Database['public']['Functions']['imm_agenda']['Returns'][number]

export interface Stima {
  superficie: number | null; valore_mq: number | null; correttivi_pct: number; valore: number | null; valore_min: number | null; valore_max: number | null
  comparabili: { codice: string; indirizzo: string; superficie: number; prezzo: number; prezzo_mq: number; fonte: string }[]
  storico_prezzi: { dal: string; prezzo: number | null; canone: number | null }[]
}
export interface Report {
  codice: string; indirizzo: string; comune: string; stato: string; giorni_sul_mercato: number | null; visite: number; visite_30_giorni: number; richieste: number
  clienti_compatibili: number; prezzo_iniziale: number | null; prezzo_attuale: number | null; riduzioni: number; riduzione_pct: number; offerte: number
  offerta_migliore: number | null; probabilita: number; gradimento_medio: number | null; commenti: string[]; attivita_agente: number
}

/** Tabelle toccate dal lavoro commerciale (per ricaricare dopo un'azione). */
export const TABELLE_COMMERCIALI = ['imm_immobili', 'imm_incarichi', 'imm_visite', 'imm_proposte', 'imm_chiusure', 'imm_locazioni', 'imm_provvigioni', 'imm_ripartizioni',
  'imm_richieste', 'imm_selezioni', 'imm_lead', 'imm_agenti_riepilogo', 'deals', 'attivita', 'scadenze_moduli', 'imm_documenti', 'imm_prezzi', 'imm_annunci']

export function useImpostazioni() {
  const q = useElenco<Impostazioni>('imm_impostazioni')
  return { impostazioni: q.data?.[0] ?? null, caricamento: q.isLoading }
}

/** Agenti attivi con il loro nome, e l'agente che sta usando l'app (se lo è). */
export function useAgenti() {
  const { user } = useAuth()
  const agenti = useElenco<AgenteRiepilogo>('imm_agenti_riepilogo', { ordine: [{ colonna: 'nome' }] })
  const lista = (agenti.data ?? []).filter((a) => a.attivo)
  return { agenti: lista, tutti: agenti.data ?? [], io: lista.find((a) => a.user_id === user?.id) ?? null }
}

export function useImmobiliBrevi(filtri?: Record<string, string | readonly string[]>) {
  return useElenco<Pick<Immobile, 'id' | 'codice' | 'titolo' | 'tipologia' | 'indirizzo' | 'comune' | 'prezzo' | 'canone' | 'stato' | 'contratto' | 'agente_id'>>('imm_immobili', {
    select: 'id, codice, titolo, tipologia, indirizzo, comune, prezzo, canone, stato, contratto, agente_id', filtri, ordine: [{ colonna: 'codice', crescente: false }] }).data ?? []
}

export const nomeAgente = (agenti: AgenteRiepilogo[], id: string | null | undefined) => agenti.find((a) => a.agente_id === id)?.nome ?? null
export const etichettaImmobile = (i: Pick<Immobile, 'codice' | 'indirizzo' | 'comune'> | null | undefined) => (i ? `${i.codice} · ${i.indirizzo}, ${i.comune}` : '')
