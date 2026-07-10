import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export type CalTipo = 'riunione' | 'attivita' | 'incasso' | 'tassa'

export interface CalEvent {
  id: string
  title: string
  start: Date
  end: Date
  allDay: boolean
  tipo: CalTipo
  /** id del record sorgente (per aprire il dettaglio/modifica). */
  refId: string
}

/**
 * Eventi per il calendario: riunioni e attività con scadenza, più le
 * scadenze economiche (incassi/tasse). Le economiche sono vuote per
 * l'operatore (RLS). Un solo hook, aggregato lato client.
 */
export function useEventiCalendario() {
  return useQuery({
    queryKey: ['calendario', 'eventi'],
    queryFn: async (): Promise<CalEvent[]> => {
      const [att, incassi, tasse] = await Promise.all([
        supabase.from('attivita').select('id, titolo, tipo, inizio, durata_minuti, scadenza').eq('attivo', true),
        supabase.from('scadenze_pagamento').select('id, descrizione, data_prevista'),
        supabase.from('scadenze_tasse').select('id, tipo_tassa, scadenza'),
      ])

      const eventi: CalEvent[] = []

      for (const a of att.data ?? []) {
        if (a.tipo === 'riunione' && a.inizio) {
          const start = new Date(a.inizio)
          const end = new Date(start.getTime() + (a.durata_minuti ?? 60) * 60_000)
          eventi.push({ id: `att-${a.id}`, refId: a.id, title: a.titolo, start, end, allDay: false, tipo: 'riunione' })
        } else if (a.scadenza) {
          const d = new Date(a.scadenza)
          eventi.push({ id: `att-${a.id}`, refId: a.id, title: a.titolo, start: d, end: d, allDay: true, tipo: 'attivita' })
        }
      }
      for (const i of incassi.data ?? []) {
        const d = new Date(i.data_prevista)
        eventi.push({ id: `inc-${i.id}`, refId: i.id, title: `💰 ${i.descrizione}`, start: d, end: d, allDay: true, tipo: 'incasso' })
      }
      for (const t of tasse.data ?? []) {
        const d = new Date(t.scadenza)
        eventi.push({ id: `tax-${t.id}`, refId: t.id, title: `🏛️ ${t.tipo_tassa}`, start: d, end: d, allDay: true, tipo: 'tassa' })
      }
      return eventi
    },
  })
}
