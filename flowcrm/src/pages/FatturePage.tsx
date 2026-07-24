import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Loader2, Download } from 'lucide-react'
import { toCsv, scaricaCsv } from '@/lib/csv'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { FatturaDialog } from '@/features/amministrazione/FatturaDialog'
import { useFatture, type FatturaDirezione } from '@/lib/queries/amministrazione'
import { cn } from '@/lib/utils'
import { BottoneScrittura } from '@/components/BottoneScrittura'

const fmtImporto = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)

const STATO_TONE = {
  da_pagare: 'warning', pagata: 'success', scaduta: 'danger', parziale: 'info',
} as const

export function FatturePage() {
  const navigate = useNavigate()
  const [direzione, setDirezione] = useState<FatturaDirezione>('attiva')
  const { data: fatture = [], isLoading } = useFatture(direzione)
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div>
      <PageHeader
        title="Registro fatture"
        description="Fatture emesse ai clienti e ricevute dai fornitori."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const rows = fatture.map((f) => [f.numero, new Date(f.data).toLocaleDateString('it-IT'), f.organizzazione?.ragione_sociale, f.stato, f.imponibile, f.totale])
              scaricaCsv(`fatture-${direzione}`, toCsv(['Numero', 'Data', direzione === 'attiva' ? 'Cliente' : 'Fornitore', 'Stato', 'Imponibile', 'Totale'], rows))
            }}>
              <Download className="h-4 w-4" /> Esporta CSV
            </Button>
            <BottoneScrittura onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Nuova fattura</BottoneScrittura>
          </div>
        }
      />

      {/* Switch direzione attiva/passiva */}
      <div className="mb-4 inline-flex rounded-lg border border-border bg-muted/40 p-1">
        {(['attiva', 'passiva'] as const).map((d) => (
          <button
            key={d}
            onClick={() => setDirezione(d)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm font-medium transition-colors',
              direzione === d ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {d === 'attiva' ? 'Attive (clienti)' : 'Passive (fornitori)'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : fatture.length === 0 ? (
        <EmptyState icon={FileText} title="Nessuna fattura"
          description={`Registra la prima fattura ${direzione === 'attiva' ? 'verso un cliente' : 'da un fornitore'}.`} />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Numero</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Data</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{direzione === 'attiva' ? 'Cliente' : 'Fornitore'}</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stato</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Totale</th>
              </tr>
            </thead>
            <tbody>
              {fatture.map((f) => (
                <tr key={f.id} onClick={() => navigate(`/fatture/${f.id}`)}
                  className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-semibold text-foreground">{f.numero}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(f.data).toLocaleDateString('it-IT')}</td>
                  <td className="px-4 py-3 text-muted-foreground">{f.organizzazione?.ragione_sociale ?? '—'}</td>
                  <td className="px-4 py-3"><Badge tone={STATO_TONE[f.stato]}>{f.stato.replace('_', ' ')}</Badge></td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">{fmtImporto(Number(f.totale))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FatturaDialog open={createOpen} onOpenChange={setCreateOpen} direzione={direzione} />
    </div>
  )
}
