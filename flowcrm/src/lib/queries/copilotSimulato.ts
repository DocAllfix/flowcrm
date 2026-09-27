import { supabase } from '@/lib/supabase'

/**
 * Copilot SIMULATO per l'ospite della demo pubblica.
 *
 * Il Copilot vero chiama Azure OpenAI e costa: nella demo la funzione server lo
 * rifiuta (403) prima di qualunque chiamata. Qui si fa vedere come funziona con tre
 * domande d'esempio, le cui risposte si costruiscono dai DATI VERI della demo con
 * query semplici, senza intelligenza artificiale. Tutto ciò che il visitatore vede
 * è quindi esatto; le domande libere ricevono l'invito alla versione completa.
 */

export const DOMANDE_SIMULATE = [
  'Chi devo sollecitare questa settimana?',
  'Come va la pipeline?',
  'Cosa ho in agenda nei prossimi giorni?',
] as const

export const AVVISO_SIMULAZIONE =
  'Anteprima: nella versione completa l\'assistente risponde a qualunque domanda sui tuoi dati.'

const euro = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

const giorno = (d: string) =>
  new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(d))

async function daSollecitare(): Promise<string> {
  const { data, error } = await supabase
    .from('scadenze_pagamento')
    .select('importo, data_prevista, organizzazioni(ragione_sociale), fatture(numero)')
    .eq('stato', 'in_ritardo')
    .order('data_prevista')
  if (error) throw error
  if (!data?.length) return 'Nessun incasso in ritardo: non c\'è nessuno da sollecitare.'
  const righe = data.map((s) => {
    const cliente = (s.organizzazioni as { ragione_sociale: string } | null)?.ragione_sociale ?? 'cliente'
    const numero = (s.fatture as { numero: string } | null)?.numero
    return `• ${cliente}${numero ? `, fattura ${numero}` : ''}: ${euro(Number(s.importo))}, attesa dal ${giorno(s.data_prevista)}`
  })
  const totale = data.reduce((t, s) => t + Number(s.importo), 0)
  return `Hai ${data.length} incassi in ritardo, per ${euro(totale)}:\n${righe.join('\n')}`
}

async function pipeline(): Promise<string> {
  const { data, error } = await supabase.from('vw_pipeline_valore_pesato').select('nome, n_deal, valore, valore_pesato, ordine').order('ordine')
  if (error) throw error
  if (!data?.length) return 'La pipeline è vuota.'
  const righe = data.map((f) => `• ${f.nome}: ${f.n_deal ?? 0} trattative, ${euro(Number(f.valore ?? 0))} (pesato ${euro(Number(f.valore_pesato ?? 0))})`)
  const pesato = data.reduce((t, f) => t + Number(f.valore_pesato ?? 0), 0)
  return `Valore pesato della pipeline: ${euro(pesato)}.\n${righe.join('\n')}`
}

async function agenda(utente: string): Promise<string> {
  const oggi = new Date()
  const fra7 = new Date(oggi.getTime() + 7 * 86_400_000)
  const { data, error } = await supabase
    .from('attivita')
    .select('titolo, tipo, scadenza, inizio')
    .eq('assegnato_a', utente)
    .eq('attivo', true)
    .in('stato', ['da_fare', 'in_corso'])
  if (error) throw error
  const prossime = (data ?? [])
    .map((a) => ({ ...a, quando: a.inizio ?? a.scadenza }))
    .filter((a) => a.quando && new Date(a.quando) <= fra7)
    .sort((a, b) => String(a.quando).localeCompare(String(b.quando)))
  if (!prossime.length) return 'Nei prossimi sette giorni non hai attività in programma.'
  return `Nei prossimi sette giorni hai ${prossime.length} attività:\n${prossime
    .map((a) => `• ${giorno(a.quando!)}: ${a.titolo}`)
    .join('\n')}`
}

/** Risposta dell'assistente simulato alla domanda `q`. */
export async function rispostaSimulata(q: string, utente: string): Promise<string> {
  const t = q.toLowerCase()
  if (t.includes('sollecit') || t.includes('incass') || t.includes('ritardo')) return daSollecitare()
  if (t.includes('pipeline') || t.includes('trattativ') || t.includes('deal')) return pipeline()
  if (t.includes('agenda') || t.includes('attivit') || t.includes('oggi') || t.includes('settimana')) return agenda(utente)
  return `${AVVISO_SIMULAZIONE} Nella demo prova una delle domande d'esempio qui sotto.`
}
