/**
 * AgentiPage — rete vendita. Se l'utente È un agente (portale), viene
 * portato direttamente al proprio fascicolo: la lista è dello staff.
 */
import { useMemo, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Search, BriefcaseBusiness, Loader2, Download } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { RowActions } from '@/components/RowActions'
import { toCsv, scaricaCsv } from '@/lib/csv'
import { AgenteDialog } from '@/modules/agenti/dialogs/AgenteDialog'
import { TIPOLOGIA_LABEL, AGENTE_STATO } from '@/modules/agenti/stati'
import {
  useAgenti, useAgenteCorrente, useArchiveAgente, useDeleteAgente, type Agente,
} from '@/modules/agenti/queries/agenti'

export function AgentiPage() {
  const navigate = useNavigate()
  const { data: me } = useAgenteCorrente()
  const { data: agenti = [], isLoading } = useAgenti()
  const archive = useArchiveAgente()
  const del = useDeleteAgente()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editAgente, setEditAgente] = useState<Agente | null>(null)

  // Portale agente: chi è un agente va dritto al proprio fascicolo.
  useEffect(() => {
    if (me) navigate(`/agenti/${me.id}`, { replace: true })
  }, [me, navigate])

  const filtrati = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return agenti
    return agenti.filter((a) =>
      [a.codice, a.nome, a.cognome, a.ragione_sociale, a.zone, a.area_geografica]
        .filter(Boolean).join(' ').toLowerCase().includes(q))
  }, [agenti, search])

  function esportaCsv() {
    scaricaCsv('agenti.csv', toCsv(
      ['Codice', 'Agente', 'Tipologia', 'Stato', 'Area', 'Zone', 'Email', 'Telefono'],
      filtrati.map((a) => [
        a.codice, `${a.nome} ${a.cognome ?? ''}`.trim(), TIPOLOGIA_LABEL[a.tipologia],
        AGENTE_STATO[a.stato]?.label ?? a.stato, a.area_geografica ?? '', a.zone ?? '',
        a.email ?? '', a.telefono ?? '',
      ]),
    ))
    toast.success(`Esportati ${filtrati.length} agenti`)
  }

  return (
    <div>
      <PageHeader
        title="Agenti di commercio"
        description="La rete vendita: mandati, portafogli, visite, ordini e provvigioni."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={esportaCsv} disabled={filtrati.length === 0}>
              <Download className="h-4 w-4" /> Esporta CSV
            </Button>
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Nuovo agente</Button>
          </div>
        }
      />

      <div className="mb-4 w-72">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome, zona…" className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtrati.length === 0 ? (
        <EmptyState icon={BriefcaseBusiness} title="Nessun agente"
          description="Registra la rete vendita per gestire mandati, visite e provvigioni." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Codice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Agente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipologia</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Zone</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stato</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Portale</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtrati.map((a) => {
                const st = AGENTE_STATO[a.stato] ?? AGENTE_STATO.attivo
                return (
                  <tr key={a.id} onClick={() => navigate(`/agenti/${a.id}`)}
                    className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">{a.codice}</td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {a.nome} {a.cognome ?? ''}
                      {a.ragione_sociale && (
                        <span className="block text-xs font-normal text-muted-foreground">{a.ragione_sociale}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{TIPOLOGIA_LABEL[a.tipologia]}</td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-muted-foreground">
                      {a.zone ?? a.area_geografica ?? '—'}
                    </td>
                    <td className="px-4 py-3"><Badge tone={st.tone}>{st.label}</Badge></td>
                    <td className="px-4 py-3">
                      {a.user_id ? <Badge tone="info">Attivo</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RowActions
                        nome={`${a.nome} ${a.cognome ?? ''}`.trim()}
                        onEdit={() => setEditAgente(a)}
                        onArchive={() => archive.mutate(a.id, {
                          onSuccess: () => toast.success('Agente archiviato'),
                          onError: (e) => toast.error((e as Error)?.message ?? 'Errore'),
                        })}
                        onDelete={() => del.mutate(a.id, {
                          onSuccess: () => toast.success('Agente eliminato'),
                          onError: (e) => toast.error((e as Error)?.message ?? 'Errore'),
                        })}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <AgenteDialog
        open={createOpen || !!editAgente}
        agente={editAgente ?? undefined}
        onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditAgente(null) } }}
      />
    </div>
  )
}
