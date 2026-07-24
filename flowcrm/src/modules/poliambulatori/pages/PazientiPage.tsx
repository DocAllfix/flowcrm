/**
 * PazientiPage — anagrafica pazienti (amministrativa, per la segreteria).
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Search, HeartPulse, Loader2, Download } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { RowActions } from '@/components/RowActions'
import { toCsv, scaricaCsv } from '@/lib/csv'
import { PazienteDialog } from '@/modules/poliambulatori/dialogs/PazienteDialog'
import { fmtData } from '@/modules/poliambulatori/stati'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import {
  usePazienti, useArchivePaziente, useDeletePaziente, type Paziente,
} from '@/modules/poliambulatori/queries/poliambulatorio'

export function PazientiPage() {
  const navigate = useNavigate()
  const { data: pazienti = [], isLoading } = usePazienti()
  const archive = useArchivePaziente()
  const del = useDeletePaziente()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editPaziente, setEditPaziente] = useState<Paziente | null>(null)

  const filtrati = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return pazienti
    return pazienti.filter((p) =>
      [p.codice, p.nome, p.cognome, p.codice_fiscale, p.telefono]
        .filter(Boolean).join(' ').toLowerCase().includes(q))
  }, [pazienti, search])

  function esportaCsv() {
    scaricaCsv('pazienti.csv', toCsv(
      ['Codice', 'Nome', 'Cognome', 'Codice fiscale', 'Nascita', 'Telefono', 'Email', 'Convenzione'],
      filtrati.map((p) => [
        p.codice, p.nome, p.cognome ?? '', p.codice_fiscale ?? '',
        fmtData(p.data_nascita), p.telefono ?? '', p.email ?? '',
        p.convenzione?.nome ?? 'Privato',
      ]),
    ))
    toast.success(`Esportati ${filtrati.length} pazienti`)
  }

  return (
    <div>
      <PageHeader
        title="Pazienti"
        description="Anagrafica e fascicoli. I contenuti clinici sono visibili solo ai medici."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={esportaCsv} disabled={filtrati.length === 0}>
              <Download className="h-4 w-4" /> Esporta CSV
            </Button>
            <BottoneScrittura onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Nuovo paziente</BottoneScrittura>
          </div>
        }
      />

      <div className="mb-4 w-72">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per nome, CF, telefono…" className="pl-9" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtrati.length === 0 ? (
        <EmptyState icon={HeartPulse} title="Nessun paziente"
          description="Registra il primo paziente per gestire agenda e fascicoli." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Codice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Paziente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Codice fiscale</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nascita</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Telefono</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Convenzione</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtrati.map((p) => (
                <tr key={p.id} onClick={() => navigate(`/pazienti/${p.id}`)}
                  className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-foreground">{p.codice}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{p.nome} {p.cognome ?? ''}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{p.codice_fiscale ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtData(p.data_nascita)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.telefono ?? '—'}</td>
                  <td className="px-4 py-3">
                    {p.convenzione
                      ? <Badge tone="info">{p.convenzione.nome}</Badge>
                      : <span className="text-xs text-muted-foreground">Privato</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RowActions
                      nome={`${p.nome} ${p.cognome ?? ''}`.trim()}
                      onEdit={() => setEditPaziente(p)}
                      onArchive={() => archive.mutate(p.id, {
                        onSuccess: () => toast.success('Paziente archiviato'),
                        onError: (e) => toast.error((e as Error)?.message ?? 'Errore'),
                      })}
                      onDelete={() => del.mutate(p.id, {
                        onSuccess: () => toast.success('Paziente eliminato'),
                        onError: (e) => toast.error((e as Error)?.message ?? 'Errore'),
                      })}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PazienteDialog
        open={createOpen || !!editPaziente}
        paziente={editPaziente ?? undefined}
        onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEditPaziente(null) } }}
      />
    </div>
  )
}
