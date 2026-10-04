/**
 * Ricerca di un cliente in anagrafica mentre si scrive il nome: chi torna
 * si riconosce (storico, allergie, preferenze), chi è nuovo si registra
 * senza uscire dal modulo.
 */
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { UserRound } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export interface ContattoScelto { id: string; nome: string; cognome: string | null; telefono: string | null; email: string | null }

interface Props {
  id: string
  valore: string
  onTesto: (v: string) => void
  onScegli: (c: ContattoScelto) => void
  contattoId: string | null
  segnaposto?: string
}

export function CercaContatto({ id, valore, onTesto, onScegli, contattoId, segnaposto }: Props) {
  const [aperto, setAperto] = useState(false)
  const [q, setQ] = useState('')
  useEffect(() => { const t = setTimeout(() => setQ(valore.trim()), 200); return () => clearTimeout(t) }, [valore])
  const { data: trovati = [] } = useQuery({
    queryKey: ['contatti-ricerca-fb', q],
    enabled: q.length >= 2 && !contattoId,
    queryFn: async (): Promise<ContattoScelto[]> => {
      const filtro = q.replace(/[%,()]/g, ' ')
      const { data, error } = await supabase.from('contatti').select('id, nome, cognome, telefono, email')
        .eq('attivo', true).or(`nome.ilike.%${filtro}%,cognome.ilike.%${filtro}%,telefono.ilike.%${filtro}%`).limit(6)
      if (error) throw error
      return data
    },
  })
  return (
    <div className="relative">
      <Input id={id} value={valore} autoComplete="off" placeholder={segnaposto}
        onChange={(e) => { onTesto(e.target.value); setAperto(true) }}
        onFocus={() => setAperto(true)} onBlur={() => setTimeout(() => setAperto(false), 150)}
        aria-autocomplete="list" aria-expanded={aperto && trovati.length > 0} role="combobox" aria-controls={`${id}-elenco`} />
      {contattoId && (
        <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
          <UserRound className="h-3 w-3" aria-hidden /> In anagrafica
        </span>
      )}
      {aperto && trovati.length > 0 && (
        <ul id={`${id}-elenco`} role="listbox"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-sospeso">
          {trovati.map((c) => (
            <li key={c.id} role="option" aria-selected={false}>
              <button type="button" onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onScegli(c); setAperto(false) }}
                className={cn('flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted')}>
                <span className="font-medium text-foreground">{c.nome} {c.cognome ?? ''}</span>
                <span className="text-xs text-muted-foreground">{c.telefono ?? c.email ?? ''}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
