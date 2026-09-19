import { useState } from 'react'
import { toast } from 'sonner'
import { Plus, Banknote, Loader2, Check } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { RowActions } from '@/components/RowActions'
import { IncassoDialog } from '@/features/amministrazione/IncassoDialog'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import {
  useIncassi, useSetIncassato, useDeleteIncasso, type ScadenzaPagamento,
} from '@/lib/queries/amministrazione'

const fmtImporto = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)

const STATO_TONE = {
  da_incassare: 'warning', incassato: 'success', in_ritardo: 'danger', parziale: 'info',
} as const

export function IncassiPage() {
  const { data: incassi = [], isLoading } = useIncassi()
  const setIncassato = useSetIncassato()
  const del = useDeleteIncasso()
  const [createOpen, setCreateOpen] = useState(false)
  const [edit, setEdit] = useState<ScadenzaPagamento | null>(null)

  const totaleAtteso = incassi
    .filter((i) => i.stato !== 'incassato')
    .reduce((s, i) => s + Number(i.importo), 0)

  return (
    <div>
      <PageHeader
        title="Incassi previsti"
        description="Le scadenze in entrata: generate dalle fatture attive o aggiunte a mano (contratti in essere)."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Aggiungi
          </Button>
        }
      />

      {!isLoading && incassi.length > 0 && (
        <Card className="mb-4 p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Ancora da incassare</p>
          <p className="mt-1 text-headline text-foreground">{fmtImporto(totaleAtteso)}</p>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : incassi.length === 0 ? (
        <EmptyState icon={Banknote} title="Nessun incasso previsto"
          description="Gli incassi compaiono qui quando registri una fattura attiva." />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Descrizione</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data prevista</TableHead>
                <TableHead>Stato</TableHead>
                <TableHead numerica>Importo</TableHead>
                <TableHead><span className="sr-only">Azioni</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {incassi.map((i) => {
                const done = i.stato === 'incassato'
                return (
                  <TableRow key={i.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <TableCell className="font-medium text-foreground">{i.descrizione}</TableCell>
                    <TableCell className="text-muted-foreground">{i.organizzazione?.ragione_sociale ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{new Date(i.data_prevista).toLocaleDateString('it-IT')}</TableCell>
                    <TableCell><Badge tone={STATO_TONE[i.stato]}>{i.stato.replace('_', ' ')}</Badge></TableCell>
                    <TableCell numerica className="font-bold text-foreground">{fmtImporto(Number(i.importo))}</TableCell>
                    <TableCell numerica>
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => setIncassato.mutate({ id: i.id, incassato: !done })}
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
                            done ? 'text-success hover:bg-muted' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          }`}
                        >
                          <Check className="h-3.5 w-3.5" /> {done ? 'Incassato' : 'Segna incassato'}
                        </button>
                        <RowActions
                          nome={i.descrizione}
                          onEdit={() => setEdit(i)}
                          onDelete={() => del.mutate(i.id, {
                            onSuccess: () => toast.success('Incasso eliminato'),
                            onError: (e) => toast.error((e as Error)?.message ?? 'Errore'),
                          })}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      <IncassoDialog
        open={createOpen || !!edit}
        incasso={edit ?? undefined}
        onOpenChange={(o) => { if (!o) { setCreateOpen(false); setEdit(null) } }}
      />
    </div>
  )
}
