import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Download } from 'lucide-react'
import { toCsv, scaricaCsv } from '@/lib/csv'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { FatturaDialog } from '@/features/amministrazione/FatturaDialog'
import { useFatture, type FatturaDirezione } from '@/lib/queries/amministrazione'
import { cn } from '@/lib/utils'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, CollegamentoRiga } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { AttesaCentrata } from '@/components/ui/spinner'

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
        <AttesaCentrata className="py-20" />
      ) : fatture.length === 0 ? (
        <EmptyState icon={FileText} title="Nessuna fattura"
          description={`Registra la prima fattura ${direzione === 'attiva' ? 'verso un cliente' : 'da un fornitore'}.`} />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numero</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>{direzione === 'attiva' ? 'Cliente' : 'Fornitore'}</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead numerica>Totale</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fatture.map((f) => (
                <TableRow key={f.id} onActivate={() => navigate(`/fatture/${f.id}`)}
                  >
                  <TableCell><CollegamentoRiga to={`/fatture/${f.id}`} className="font-semibold">{f.numero}</CollegamentoRiga></TableCell>
                  <TableCell className="text-muted-foreground">{new Date(f.data).toLocaleDateString('it-IT')}</TableCell>
                  <TableCell className="text-muted-foreground">{f.organizzazione?.ragione_sociale ?? '—'}</TableCell>
                  <TableCell><Badge tone={STATO_TONE[f.stato]}>{f.stato.replace('_', ' ')}</Badge></TableCell>
                  <TableCell numerica className="font-bold text-foreground">{fmtImporto(Number(f.totale))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <FatturaDialog open={createOpen} onOpenChange={setCreateOpen} direzione={direzione} />
    </div>
  )
}
