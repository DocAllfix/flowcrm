/**
 * ScadenzeModuliSection — riquadro scadenzario riusabile nelle schede dei
 * moduli (DURC impresa, revisione mezzo, cauzione gara, taratura…). Le
 * notifiche automatiche a 30/7/1/0 giorni le genera il cron sul DB.
 */
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { CalendarClock, Check, Trash2, Lock } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import {
  useScadenzeModulo, useCreaScadenzaModulo, useAggiornaScadenzaModulo,
  useEliminaScadenzaModulo, type ScadenzaModulo,
} from '@/lib/queries/scadenzeModuli'
import { useAuth } from '@/hooks/useAuth'

interface Props {
  modulo: string
  entita: string
  entitaId: string
  /** Tipi di scadenza suggeriti per questa entità (es. DURC, SOA, polizza). */
  tipi: string[]
  azioneUrl?: string
}

const fmtData = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

function giorniA(iso: string): number {
  const oggi = new Date(); oggi.setHours(0, 0, 0, 0)
  return Math.round((new Date(iso + 'T00:00:00').getTime() - oggi.getTime()) / 86400000)
}

function BadgeUrgenza({ s }: { s: ScadenzaModulo }) {
  if (s.stato === 'completata') return <Badge tone="success">Completata</Badge>
  if (s.stato === 'annullata') return <Badge tone="neutral">Annullata</Badge>
  const gg = giorniA(s.data_scadenza)
  if (gg < 0) return <Badge tone="danger">Scaduta da {-gg} gg</Badge>
  if (gg === 0) return <Badge tone="danger">Oggi</Badge>
  if (gg <= 7) return <Badge tone="warning">Tra {gg} gg</Badge>
  return <Badge tone="neutral">Tra {gg} gg</Badge>
}

export function ScadenzeModuliSection({ modulo, entita, entitaId, tipi, azioneUrl }: Props) {
  const { isAdmin, isManager } = useAuth()
  const { data: scadenze = [], isLoading } = useScadenzeModulo(entita, entitaId)
  const crea = useCreaScadenzaModulo()
  const aggiorna = useAggiornaScadenzaModulo()
  const elimina = useEliminaScadenzaModulo()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [tipo, setTipo] = useState('')
  const [descrizione, setDescrizione] = useState('')
  const [data, setData] = useState('')
  const [soloManager, setSoloManager] = useState(false)

  async function handleCrea(e: FormEvent) {
    e.preventDefault()
    if (!tipo) { toast.error('Scegli il tipo di scadenza'); return }
    if (!descrizione.trim()) { toast.error('La descrizione è obbligatoria'); return }
    if (!data) { toast.error('La data di scadenza è obbligatoria'); return }
    try {
      await crea.mutateAsync({
        modulo, entita, entitaId, tipo,
        descrizione: descrizione.trim(),
        dataScadenza: data,
        soloManager,
        azioneUrl: azioneUrl ?? window.location.pathname,
      })
      toast.success('Scadenza aggiunta: notifiche automatiche a 30/7/1 giorni e alla scadenza')
      setDialogOpen(false)
      setTipo(''); setDescrizione(''); setData(''); setSoloManager(false)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleCompleta(s: ScadenzaModulo) {
    try {
      await aggiorna.mutateAsync({ id: s.id, entita, entitaId, modulo, patch: { stato: 'completata' } })
      toast.success('Scadenza completata')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleElimina(s: ScadenzaModulo) {
    try {
      await elimina.mutateAsync({ id: s.id, entita, entitaId, modulo })
      toast.success('Scadenza eliminata')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Scadenze</h3>
          {scadenze.length > 0 && (
            <span className="text-xs text-muted-foreground">({scadenze.length})</span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
          Aggiungi scadenza
        </Button>
      </div>

      <div className="p-2">
        {isLoading && (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">Caricamento…</p>
        )}
        {!isLoading && scadenze.length === 0 && (
          <EmptyState
            icon={CalendarClock}
            title="Nessuna scadenza"
            description="Aggiungi le scadenze da monitorare: le notifiche arrivano da sole."
          />
        )}
        {scadenze.map((s) => (
          <div key={s.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/40">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-foreground">{s.tipo}</p>
                <BadgeUrgenza s={s} />
                {s.solo_manager && <Lock className="h-3 w-3 text-muted-foreground" aria-label="Riservata" />}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {s.descrizione} · {fmtData(s.data_scadenza)}
              </p>
            </div>
            {s.stato === 'aperta' && (
              <button
                onClick={() => void handleCompleta(s)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-success"
                aria-label="Segna completata"
                title="Segna completata"
              >
                <Check className="h-4 w-4" />
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => void handleElimina(s)}
                disabled={elimina.isPending}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Elimina"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nuova scadenza</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCrea} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tipo *</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue placeholder="Seleziona…" /></SelectTrigger>
                <SelectContent>
                  {tipi.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sc-desc">Descrizione *</Label>
              <Input
                id="sc-desc"
                value={descrizione}
                onChange={(e) => setDescrizione(e.target.value)}
                placeholder="Es. DURC impresa Rossi Srl"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sc-data">Data di scadenza *</Label>
              <Input
                id="sc-data" type="date" value={data}
                onChange={(e) => setData(e.target.value)} required
              />
            </div>
            {isManager && (
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={soloManager}
                  onCheckedChange={(v) => setSoloManager(v === true)}
                />
                Riservata ad admin e manager (dato economico)
              </label>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
              <Button type="submit" disabled={crea.isPending}>
                {crea.isPending ? 'Salvataggio…' : 'Aggiungi'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
