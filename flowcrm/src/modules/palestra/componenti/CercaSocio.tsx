/**
 * Ricerca di un socio per nome, codice, email o telefono mentre si scrive.
 */
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import type { SocioStato } from '@/modules/palestra/queries'
import { SOCIO_STATO } from '@/modules/palestra/stati'

interface Props {
  id: string
  onScegli: (s: SocioStato) => void
  segnaposto?: string
  autoFocus?: boolean
}

export function CercaSocio({ id, onScegli, segnaposto = 'Nome, codice, email o telefono', autoFocus }: Props) {
  const [testo, setTesto] = useState('')
  const [q, setQ] = useState('')
  const [aperto, setAperto] = useState(false)
  useEffect(() => { const t = setTimeout(() => setQ(testo.trim()), 200); return () => clearTimeout(t) }, [testo])
  const { data: trovati = [] } = useQuery({
    queryKey: ['pal-soci-ricerca', q],
    enabled: q.length >= 2,
    queryFn: async (): Promise<SocioStato[]> => {
      const f = q.replace(/[%,()]/g, ' ')
      const { data, error } = await supabase.from('pal_soci_stato').select('*')
        .or(`nome.ilike.%${f}%,codice.ilike.%${f}%,email.ilike.%${f}%,telefono.ilike.%${f}%`).order('nome').limit(8)
      if (error) throw error
      return data
    },
  })
  return (
    <div className="relative">
      <Input id={id} value={testo} autoComplete="off" placeholder={segnaposto} autoFocus={autoFocus}
        onChange={(e) => { setTesto(e.target.value); setAperto(true) }}
        onFocus={() => setAperto(true)} onBlur={() => setTimeout(() => setAperto(false), 150)}
        role="combobox" aria-autocomplete="list" aria-expanded={aperto && trovati.length > 0} aria-controls={`${id}-elenco`} />
      {aperto && trovati.length > 0 && (
        <ul id={`${id}-elenco`} role="listbox" className="absolute z-20 mt-1 w-full overflow-hidden rounded-md border border-border bg-popover shadow-sospeso">
          {trovati.map((s) => {
            const st = SOCIO_STATO[s.stato ?? 'senza_titolo'] ?? SOCIO_STATO.senza_titolo
            return (
              <li key={s.socio_id} role="option" aria-selected={false}>
                <button type="button" onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { onScegli(s); setTesto(''); setAperto(false) }}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-muted">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-foreground">{s.nome}</span>
                    <span className="block font-mono text-xs text-muted-foreground">{s.codice}</span>
                  </span>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
