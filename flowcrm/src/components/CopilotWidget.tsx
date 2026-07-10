import { useState, useRef, useEffect, type FormEvent } from 'react'
import { Sparkles, X, Send, Check, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { askCopilot, type CopilotMessage, type AzioneProposta } from '@/lib/queries/copilot'
import { useCreateAttivita } from '@/lib/queries/attivita'
import { useAuth } from '@/hooks/useAuth'

/**
 * CopilotWidget — assistente AI flottante. Fa domande sui dati del CRM;
 * le risposte rispettano i permessi dell'utente (la RLS è la barriera lato
 * Edge Function). Bolla in basso a destra.
 */
const SUGGERIMENTI = [
  'Quante organizzazioni ho?',
  'Quanto devo ancora incassare?',
  'Mostrami i deal per fase',
]

export function CopilotWidget() {
  const { userProfile } = useAuth()
  const createAttivita = useCreateAttivita()
  const [open, setOpen] = useState(false)
  const [messaggi, setMessaggi] = useState<CopilotMessage[]>([])
  const [input, setInput] = useState('')
  const [pending, setPending] = useState(false)
  // proposta d'azione in attesa di conferma (una alla volta)
  const [proposta, setProposta] = useState<AzioneProposta | null>(null)
  const [propostaFatta, setPropostaFatta] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messaggi, pending, proposta])

  async function invia(testo: string) {
    const q = testo.trim()
    if (!q || pending) return
    const nuovi: CopilotMessage[] = [...messaggi, { role: 'user', content: q }]
    setMessaggi(nuovi)
    setInput('')
    setPending(true)
    setProposta(null)
    setPropostaFatta(false)
    // bolla assistente vuota che si riempie in streaming
    setMessaggi([...nuovi, { role: 'assistant', content: '' }])
    try {
      const esito = await askCopilot(nuovi, (chunk) => {
        setMessaggi((prev) => {
          const copia = [...prev]
          copia[copia.length - 1] = {
            role: 'assistant',
            content: copia[copia.length - 1].content + chunk,
          }
          return copia
        })
      })
      if (esito.kind === 'proposta') {
        // rimuovo la bolla vuota e mostro la card di conferma
        setMessaggi(nuovi)
        setProposta(esito.azione)
      }
    } catch (e) {
      setMessaggi([...nuovi, { role: 'assistant', content: `⚠️ ${(e as Error).message}` }])
    } finally {
      setPending(false)
    }
  }

  async function confermaProposta() {
    if (!proposta) return
    try {
      await createAttivita.mutateAsync({
        tipo: proposta.tipo,
        titolo: proposta.titolo,
        descrizione: proposta.descrizione ?? null,
        scadenza: proposta.scadenza ? new Date(proposta.scadenza).toISOString() : null,
        assegnato_a: userProfile?.id ?? null,
      })
      toast.success('Attività creata')
      setPropostaFatta(true)
      setMessaggi((prev) => [...prev, { role: 'assistant', content: `✅ Creata: "${proposta.titolo}".` }])
      setProposta(null)
    } catch {
      toast.error('Creazione non riuscita')
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void invia(input)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg shadow-primary/30 transition-transform hover:scale-105"
        aria-label="Apri assistente AI"
        data-testid="copilot-open"
      >
        <Sparkles className="h-6 w-6" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 flex h-[520px] w-[380px] max-w-[calc(100vw-2rem)] flex-col rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Assistente</p>
            <p className="text-[11px] text-muted-foreground">Fai domande sui tuoi dati</p>
          </div>
        </div>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label="Chiudi">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messaggi.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Prova a chiedere:</p>
            {SUGGERIMENTI.map((s) => (
              <button
                key={s}
                onClick={() => invia(s)}
                className="block w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-left text-sm text-foreground hover:border-primary/40 hover:bg-muted/50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {messaggi.map((m, i) => {
          // bolla assistente ancora vuota (sta risolvendo i tool) → puntini
          if (m.role === 'assistant' && m.content === '') {
            return (
              <div key={i} className="flex justify-start">
                <div className="rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                  </span>
                </div>
              </div>
            )
          }
          return (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${
                  m.role === 'user' ? 'bg-primary text-white' : 'bg-muted text-foreground'
                }`}
              >
                {m.content}
              </div>
            </div>
          )
        })}

        {/* Card di conferma azione (mai scrittura senza conferma) */}
        {proposta && !propostaFatta && (
          <div className="rounded-xl border border-primary/40 bg-primary/5 p-3" data-testid="copilot-proposta">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">Vuoi creare questa attività?</p>
            <p className="text-sm font-medium text-foreground">{proposta.titolo}</p>
            <p className="mt-0.5 text-xs capitalize text-muted-foreground">
              {proposta.tipo}
              {proposta.scadenza && ` · scadenza ${new Date(proposta.scadenza).toLocaleDateString('it-IT')}`}
            </p>
            {proposta.descrizione && (
              <p className="mt-1 text-xs text-muted-foreground">{proposta.descrizione}</p>
            )}
            <div className="mt-3 flex gap-2">
              <button
                onClick={confermaProposta}
                disabled={createAttivita.isPending}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
                data-testid="copilot-conferma"
              >
                <Check className="h-4 w-4" /> Conferma
              </button>
              <button
                onClick={() => setProposta(null)}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted"
              >
                Annulla
              </button>
            </div>
          </div>
        )}
        {propostaFatta && (
          <div className="flex items-center gap-1.5 text-xs text-success">
            <CheckCircle2 className="h-4 w-4" /> Fatto
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-border p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Scrivi una domanda…"
          className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          data-testid="copilot-input"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40"
          aria-label="Invia"
          data-testid="copilot-send"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
