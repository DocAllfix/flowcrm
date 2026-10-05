/**
 * Catalogo visuale delle composizioni (documento Fioraio §24): foto, prezzo,
 * varianti e disponibilità, da mostrare al cliente su tablet o telefono.
 * Le foto sono gli allegati della composizione (categoria «foto»).
 */
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Flower2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'
import type { Composizione } from '@/modules/fioraio/queries'
import { fmtEuro } from '@/modules/fioraio/stati'

/** Una foto per composizione (la più recente), con indirizzo firmato per un'ora. */
export function useFotoComposizioni(ids: string[]) {
  return useQuery({
    queryKey: ['fior-foto-composizioni', ids],
    enabled: ids.length > 0,
    staleTime: 30 * 60_000,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await supabase.from('allegati').select('entita_id, storage_path, mime_type, created_at')
        .eq('entita', 'distinte_base').in('entita_id', ids).like('mime_type', 'image/%').order('created_at', { ascending: false })
      if (error) throw error
      const prima = new Map<string, string>()
      for (const a of data) if (!prima.has(a.entita_id)) prima.set(a.entita_id, a.storage_path)
      if (prima.size === 0) return {}
      const { data: firmati, error: e2 } = await supabase.storage.from('allegati').createSignedUrls([...prima.values()], 3600)
      if (e2) throw e2
      const perPercorso = new Map(firmati.map((f) => [f.path, f.signedUrl]))
      return Object.fromEntries([...prima].map(([id, percorso]) => [id, perPercorso.get(percorso) ?? '']).filter(([, u]) => u))
    },
  })
}

export function CatalogoVisuale({ composizioni, azione }: { composizioni: Composizione[]; azione?: (c: Composizione) => ReactNode }) {
  const { data: foto = {} } = useFotoComposizioni(composizioni.map((c) => c.distinta_id))
  return (
    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {composizioni.map((c) => {
        const attr = (c.attributi ?? {}) as Record<string, string>
        return (
          <li key={c.distinta_id} className="flex flex-col overflow-hidden rounded-lg border border-border bg-card">
            <div className="flex aspect-[4/3] items-center justify-center bg-muted">
              {foto[c.distinta_id]
                ? <img src={foto[c.distinta_id]} alt={c.nome} loading="lazy" className="h-full w-full object-cover" />
                : <Flower2 className="h-8 w-8 text-muted-foreground" aria-hidden />}
            </div>
            <div className="flex flex-1 flex-col gap-1.5 p-3 text-sm">
              <p className="font-medium text-foreground">{c.nome}</p>
              <p className="text-xs text-muted-foreground">{[attr.colori, attr.dimensioni, attr.varianti].filter(Boolean).join(' · ') || (c.categoria ?? '')}</p>
              <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
                <span className="tabular-nums text-foreground">{c.prezzo != null ? fmtEuro(c.prezzo) : 'Prezzo da definire'}</span>
                <Badge tone={c.realizzabili > 0 ? 'success' : 'warning'}>{c.realizzabili > 0 ? `${c.realizzabili} subito` : 'Su ordinazione'}</Badge>
              </div>
              {azione?.(c)}
            </div>
          </li>
        )
      })}
    </ul>
  )
}
