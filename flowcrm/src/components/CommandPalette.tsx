import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Building2, User, Gavel, HardHat } from 'lucide-react'
import { useRicercaGlobale } from '@/lib/queries/ricerca'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

/**
 * Ricerca globale (Cmd/Ctrl+K) su organizzazioni e contatti.
 * Palette leggera senza dipendenze extra: Dialog + input + lista con
 * navigazione da tastiera.
 */
export function CommandPalette() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const { data: results = [] } = useRicercaGlobale(query)

  // Scorciatoia globale Cmd/Ctrl+K
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  useEffect(() => setActive(0), [query])

  function go(r: (typeof results)[number]) {
    setOpen(false)
    if (r.tipo === 'organizzazione') navigate(`/organizzazioni/${r.id}`)
    else if (r.tipo === 'gara') navigate(`/gare/${r.id}`)
    else if (r.tipo === 'cantiere') navigate(`/cantieri/${r.id}`)
    else navigate(`/contatti/${r.id}`)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    else if (e.key === 'Enter' && results[active]) { e.preventDefault(); go(results[active]) }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl gap-0 overflow-hidden p-0" showClose={false}>
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Cerca organizzazioni, contatti, gare…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground sm:inline">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {query.trim().length < 2 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Digita almeno 2 caratteri per cercare.
            </p>
          ) : results.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">Nessun risultato.</p>
          ) : (
            results.map((r, i) => {
              const Icon =
                r.tipo === 'organizzazione' ? Building2
                : r.tipo === 'gara' ? Gavel
                : r.tipo === 'cantiere' ? HardHat
                : User
              return (
                <button
                  key={`${r.tipo}-${r.id}`}
                  onClick={() => go(r)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors',
                    i === active ? 'bg-accent text-accent-foreground' : 'text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.titolo}</p>
                    {r.sottotitolo && <p className="truncate text-xs text-muted-foreground">{r.sottotitolo}</p>}
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {r.tipo === 'organizzazione' ? 'Org'
                      : r.tipo === 'gara' ? 'Gara'
                      : r.tipo === 'cantiere' ? 'Cantiere'
                      : 'Contatto'}
                  </span>
                </button>
              )
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
