import { useState, type FormEvent } from 'react'
import { Plus, Receipt, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useTasse, useCreateTassa } from '@/lib/queries/amministrazione'

const fmtImporto = (n: number) =>
  new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)

const STATO_TONE = { da_pagare: 'warning', pagata: 'success', scaduta: 'danger' } as const

export function TassePage() {
  const { data: tasse = [], isLoading } = useTasse()
  const create = useCreateTassa()
  const [open, setOpen] = useState(false)
  const [tipo, setTipo] = useState('')
  const [importo, setImporto] = useState('')
  const [scadenza, setScadenza] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!tipo.trim() || !importo || !scadenza) { toast.error('Tutti i campi sono obbligatori'); return }
    try {
      await create.mutateAsync({ tipo_tassa: tipo.trim(), importo: Number(importo), scadenza })
      toast.success('Scadenza fiscale aggiunta')
      setOpen(false); setTipo(''); setImporto(''); setScadenza('')
    } catch {
      toast.error('Errore durante il salvataggio')
    }
  }

  return (
    <div>
      <PageHeader
        title="Scadenze tasse"
        description="Le scadenze fiscali da tenere sotto controllo."
        actions={<Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Nuova scadenza</Button>}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : tasse.length === 0 ? (
        <EmptyState icon={Receipt} title="Nessuna scadenza fiscale"
          description="Aggiungi le scadenze di IVA, imposte e contributi." />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scadenza</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stato</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Importo</th>
              </tr>
            </thead>
            <tbody>
              {tasse.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{t.tipo_tassa}</td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(t.scadenza).toLocaleDateString('it-IT')}</td>
                  <td className="px-4 py-3"><Badge tone={STATO_TONE[t.stato]}>{t.stato.replace('_', ' ')}</Badge></td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">{fmtImporto(Number(t.importo))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nuova scadenza fiscale</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="tipo">Tipo tassa *</Label>
              <Input id="tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}
                placeholder="Es. IVA trimestrale, IRPEF, INPS" required data-testid="tassa-tipo" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="importo">Importo (€) *</Label>
                <Input id="importo" type="number" min="0" step="0.01" value={importo}
                  onChange={(e) => setImporto(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="scad">Scadenza *</Label>
                <Input id="scad" type="date" value={scadenza}
                  onChange={(e) => setScadenza(e.target.value)} required />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Annulla</Button>
              <Button type="submit" disabled={create.isPending} data-testid="tassa-salva">
                {create.isPending ? 'Salvataggio…' : 'Aggiungi'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
