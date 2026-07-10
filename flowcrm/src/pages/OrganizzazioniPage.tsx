import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Building2, Search, Upload, Download } from 'lucide-react'
import {
  useOrganizzazioni, ORG_RUOLI, RUOLO_LABEL, type OrgRuolo,
} from '@/lib/queries/organizzazioni'
import { toCsv, scaricaCsv } from '@/lib/csv'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { OrganizzazioneDialog } from '@/features/organizzazioni/OrganizzazioneDialog'
import { cn } from '@/lib/utils'

const RUOLO_TONE: Record<OrgRuolo, Parameters<typeof Badge>[0]['tone']> = {
  cliente: 'primary',
  fornitore: 'info',
  partner: 'purple',
  potenziale_partner: 'warning',
  prospect: 'neutral',
}

export function OrganizzazioniPage() {
  const navigate = useNavigate()
  const [ruolo, setRuolo] = useState<OrgRuolo | undefined>(undefined)
  const [q, setQ] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const { data, isLoading } = useOrganizzazioni(ruolo)

  const filtered = (data ?? []).filter((o) =>
    !q || o.ragione_sociale.toLowerCase().includes(q.toLowerCase()) ||
    (o.citta ?? '').toLowerCase().includes(q.toLowerCase())
  )

  return (
    <div>
      <PageHeader
        title="Organizzazioni"
        description="Clienti, fornitori, partner e prospect in un'unica anagrafica."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const rows = (data ?? []).map((o) => [o.ragione_sociale, o.piva, o.email, o.telefono, o.citta, o.settore, o.ruoli.map((r) => RUOLO_LABEL[r]).join(' · ')])
              scaricaCsv('organizzazioni', toCsv(['Ragione sociale', 'P.IVA', 'Email', 'Telefono', 'Città', 'Settore', 'Ruoli'], rows))
            }}>
              <Download className="h-4 w-4" /> Esporta CSV
            </Button>
            <Button variant="outline" onClick={() => navigate('/importa')}>
              <Upload className="h-4 w-4" /> Importa CSV
            </Button>
            <Button onClick={() => setDialogOpen(true)} data-tour="nuova-org">
              <Plus className="h-4 w-4" /> Nuova
            </Button>
          </div>
        }
      />

      {/* Filtri per ruolo */}
      <div data-tour="org-filtri" className="mb-4 flex flex-wrap items-center gap-2">
        <FilterChip active={!ruolo} onClick={() => setRuolo(undefined)}>Tutte</FilterChip>
        {ORG_RUOLI.map((r) => (
          <FilterChip key={r} active={ruolo === r} onClick={() => setRuolo(r)}>
            {RUOLO_LABEL[r]}
          </FilterChip>
        ))}
      </div>

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cerca per nome o città…" value={q}
          onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Caricamento…</div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nessuna organizzazione"
          description={ruolo ? 'Nessuna organizzazione con questo ruolo.' : 'Aggiungi la prima organizzazione per iniziare.'}
          action={<Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> Nuova organizzazione</Button>}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ragione sociale</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ruoli</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Città</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Settore</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => (
                <tr key={o.id}
                  onClick={() => navigate(`/organizzazioni/${o.id}`)}
                  className="cursor-pointer border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{o.ragione_sociale}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {o.ruoli.length === 0
                        ? <span className="text-xs text-muted-foreground">—</span>
                        : o.ruoli.map((r) => (
                            <Badge key={r} tone={RUOLO_TONE[r]}>{RUOLO_LABEL[r]}</Badge>
                          ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{o.citta ?? '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{o.settore ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <OrganizzazioneDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}

function FilterChip({ active, onClick, children }: {
  active: boolean; onClick: () => void; children: React.ReactNode
}) {
  return (
    <button onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-muted-foreground hover:border-primary/40'
      )}>
      {children}
    </button>
  )
}
