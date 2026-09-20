import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fmtData } from '@/modules/cantiere/stati'
import { toast } from 'sonner'
import { useFigliCantiere, useCreaFiglioCantiere, useAggiornaFiglioCantiere, useEliminaFiglioCantiere, type Cantiere, type CantiereFase } from '@/modules/cantiere/queries/cantieri'
import { useState, type FormEvent } from 'react'
import { BtnElimina, card } from '@/modules/cantiere/dettaglio/comuni'

export // ── Cronoprogramma (fasi con barre e dipendenze) ─────────────────
function TabCronoprogramma({ cantiere }: { cantiere: Cantiere }) {
  const { data: fasi = [] } = useFigliCantiere<CantiereFase>(cantiere.id, 'cantiere_fasi')
  const crea = useCreaFiglioCantiere()
  const aggiorna = useAggiornaFiglioCantiere()
  const elimina = useEliminaFiglioCantiere()
  const [nome, setNome] = useState('')
  const [inizio, setInizio] = useState('')
  const [fine, setFine] = useState('')
  const [dipendeDa, setDipendeDa] = useState('')

  async function handleAggiungi(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { toast.error('Dai un nome alla fase'); return }
    try {
      await crea.mutateAsync({
        cantiereId: cantiere.id, tabella: 'cantiere_fasi',
        values: {
          nome: nome.trim(), data_inizio: inizio || null, data_fine: fine || null,
          dipende_da: dipendeDa || null,
          ordine: fasi.length + 1,
        },
      })
      setNome(''); setInizio(''); setFine(''); setDipendeDa('')
    } catch (err) { toast.error((err as Error).message) }
  }

  const nomeFase = (id: string | null) => fasi.find((x) => x.id === id)?.nome

  return (
    <div className={card}>
      <h3 className="mb-3 text-sm font-semibold text-foreground">Cronoprogramma</h3>
      {fasi.length === 0 && (
        <p className="py-2 text-sm text-muted-foreground">
          Suddividi i lavori in fasi: l'avanzamento del cantiere è la media delle fasi.
        </p>
      )}
      <div className="space-y-2">
        {fasi.map((f) => (
          <div key={f.id} className="rounded-lg border border-border p-3">
            <div className="flex items-center gap-3">
              <span className="flex-1 text-sm font-medium text-foreground">
                {f.nome}
                {f.dipende_da && nomeFase(f.dipende_da) && (
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    dopo «{nomeFase(f.dipende_da)}»
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {fmtData(f.data_inizio)} → {fmtData(f.data_fine)}
              </span>
              <Select value={String(f.avanzamento)}
                onValueChange={(v) => aggiorna.mutate({
                  cantiereId: cantiere.id, tabella: 'cantiere_fasi', id: f.id,
                  values: { avanzamento: Number(v) },
                })}>
                <SelectTrigger className="h-8 w-24 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_fasi', id: f.id })} />
            </div>
            <Progress value={f.avanzamento} etichetta={`Avanzamento della fase ${f.nome}`} className="mt-2" />
          </div>
        ))}
      </div>
      <form onSubmit={handleAggiungi} className="mt-4 flex flex-wrap items-end gap-2">
        <div className="min-w-48 flex-1 space-y-1">
          <Label>Fase</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Es. Scavi e fondazioni" />
        </div>
        <div className="w-40 space-y-1">
          <Label>Inizio</Label>
          <Input type="date" value={inizio} onChange={(e) => setInizio(e.target.value)} />
        </div>
        <div className="w-40 space-y-1">
          <Label>Fine</Label>
          <Input type="date" value={fine} onChange={(e) => setFine(e.target.value)} />
        </div>
        <div className="w-48 space-y-1">
          <Label>Dipende da</Label>
          <Select value={dipendeDa || 'nessuna'} onValueChange={(v) => setDipendeDa(v === 'nessuna' ? '' : v)}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nessuna">— Nessuna —</SelectItem>
              {fasi.map((f) => <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Aggiungi fase</Button>
      </form>
    </div>
  )
}
