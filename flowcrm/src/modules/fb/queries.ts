/**
 * Query del motore food & beverage. Le tabelle sono lette con gli hook
 * generici delle fondamenta; qui stanno i tipi, le viste composte e le
 * azioni con un nome di dominio.
 */
import { useQuery } from '@tanstack/react-query'
import { supabase, type Tables } from '@/lib/supabase'
import { useElenco, useAzione, useRpc } from '@/lib/queries/fondamenta'
import type { Database } from '@/types/database.types'

export type Sala = Tables<'fb_sale'>
export type Tavolo = Tables<'fb_tavoli'>
export type TavoloStato = Database['public']['Views']['fb_tavoli_stato']['Row']
export type Stazione = Tables<'fb_stazioni'>
export type Categoria = Tables<'fb_categorie'>
export type Prodotto = Tables<'fb_prodotti'>
export type Menu = Tables<'fb_menu'>
export type MenuVoce = Tables<'fb_menu_voci'>
export type Promozione = Tables<'fb_promozioni'>
export type Prenotazione = Tables<'fb_prenotazioni'>
export type Attesa = Tables<'fb_attesa'>
export type Comanda = Tables<'fb_comande'>
export type RigaComanda = Tables<'fb_comande_righe'>
export type Consegna = Tables<'fb_consegne'>
export type Vino = Tables<'fb_vini'>
export type ClienteFb = Tables<'fb_clienti'>
export type Spreco = Tables<'fb_sprechi'>
export type RigaKds = Database['public']['Views']['fb_kds']['Row']
export type ContoSaldo = Database['public']['Views']['conti_saldi']['Row']

/** Tabelle che cambiano insieme quando si lavora su una comanda. */
export const TABELLE_SERVIZIO = ['fb_comande', 'fb_comande_righe', 'fb_tavoli_stato', 'fb_kds', 'conti', 'conti_righe',
  'conti_saldi', 'conti_pagamenti', 'fb_prenotazioni', 'fb_attesa'] as const

export function useCatalogo() {
  const categorie = useElenco<Categoria>('fb_categorie', { ordine: [{ colonna: 'ordine' }, { colonna: 'nome' }] })
  const prodotti = useElenco<Prodotto>('fb_prodotti', { ordine: [{ colonna: 'nome' }] })
  return { categorie: categorie.data ?? [], prodotti: prodotti.data ?? [], caricamento: categorie.isLoading || prodotti.isLoading }
}

export function useTavoliStato(localeId: string | null) {
  return useElenco<TavoloStato>('fb_tavoli_stato', {
    filtri: { locale_id: localeId ?? undefined }, ordine: [{ colonna: 'numero' }], abilitato: !!localeId,
    intervallo: 60_000,   // anche lo stato «prenotato» cambia col passare del tempo
  })
}

export type ComandaCompleta = Comanda & {
  tavolo: { numero: string } | null
  righe: RigaComanda[]
  consegna: Consegna | null
}

export function useComanda(id: string | undefined) {
  return useQuery({
    queryKey: ['fond', 'fb_comande', 'dettaglio', id],
    enabled: !!id,
    queryFn: async (): Promise<ComandaCompleta> => {
      const { data, error } = await supabase.from('fb_comande')
        .select('*, tavolo:fb_tavoli(numero), righe:fb_comande_righe(*), consegna:fb_consegne(*)')
        .eq('id', id!).single()
      if (error) throw error
      const c = data as unknown as ComandaCompleta & { consegna: Consegna[] | Consegna | null }
      return { ...c, consegna: Array.isArray(c.consegna) ? c.consegna[0] ?? null : c.consegna }
    },
  })
}

export function useSaldoConto(contoId: string | null | undefined) {
  return useQuery({
    queryKey: ['fond', 'conti_saldi', contoId],
    enabled: !!contoId,
    queryFn: async (): Promise<ContoSaldo | null> => {
      const { data, error } = await supabase.from('conti_saldi').select('*').eq('conto_id', contoId!).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export function useMarciaUscita() {
  return useAzione<{ p_comanda: string; p_uscita: number }, number>('fb_marcia_uscita', TABELLE_SERVIZIO)
}
export function useRifaiRiga() {
  return useAzione<{ p_riga: string; p_motivo: string }, string>('fb_rifai_riga', TABELLE_SERVIZIO)
}
export function useImpostaDisponibilita() {
  return useAzione<{ p_prodotto: string; p_stato: string }>('fb_imposta_disponibilita', ['fb_prodotti'])
}

export interface Cruscotto {
  giorno: string
  locale: string
  sala: Record<string, number>
  cucina: Record<string, number | null>
  magazzino: Record<string, number>
  vendite: null | {
    incasso: number; conti_chiusi: number; coperti: number; ticket_medio: number | null
    spesa_per_coperto: number | null; per_fascia_oraria: Record<string, number>
  }
}
export function useCruscotto(localeId: string | null) {
  return useRpc<Cruscotto>('fb_cruscotto', { p_locale: localeId }, { abilitato: !!localeId, intervallo: 30_000 })
}

/** Prezzi applicati adesso (listini e promozioni della fascia), in una chiamata. */
export function usePrezzi(localeId: string | null, canale: string, tipologia: string | null = null) {
  return useQuery({
    queryKey: ['fond-rpc', 'fb_listino_attuale', localeId, canale, tipologia],
    enabled: !!localeId,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,   // l'happy hour comincia e finisce da solo
    queryFn: async (): Promise<Record<string, { prezzo: number; origine: string }>> => {
      const { data, error } = await supabase.rpc('fb_listino_attuale', {
        p_locale: localeId!, p_canale: canale, p_tipologia: tipologia ?? undefined,
      })
      if (error) throw error
      return Object.fromEntries((data ?? []).map((r) => [r.prodotto_id, { prezzo: Number(r.prezzo), origine: r.origine }]))
    },
  })
}
