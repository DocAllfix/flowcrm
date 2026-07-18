/**
 * ApprovalSection — riquadro workflow autorizzativo riusabile nelle schede
 * di dettaglio dei moduli (Go/No-Go gara, sconto oltre soglia, nota spese…).
 * Chiunque richiede; admin/manager approva o rifiuta (con motivazione).
 * Le regole vere sono nel trigger DB: qui solo UI.
 */
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, CircleDashed, ShieldCheck, Ban } from 'lucide-react'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import {
  useApprovazioni, useCreaApprovazione, useDecidiApprovazione, type Approvazione,
} from '@/lib/queries/approvazioni'
import { useAuth } from '@/hooks/useAuth'

interface Props {
  modulo: string
  entita: string
  entitaId: string
  /** Tipi di richiesta proponibili da questa scheda (es. ['go_no_go','offerta']). */
  tipiRichiesta: { value: string; label: string }[]
  /** URL della pagina per la notifica (default: pagina corrente). */
  azioneUrl?: string
}

const STATO_BADGE: Record<string, { label: string; tone: 'primary' | 'success' | 'danger' | 'neutral' }> = {
  richiesta: { label: 'In attesa', tone: 'primary' },
  approvata: { label: 'Approvata', tone: 'success' },
  rifiutata: { label: 'Rifiutata', tone: 'danger' },
  annullata: { label: 'Annullata', tone: 'neutral' },
}

const fmtData = (iso: string) =>
  new Date(iso).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })

export function ApprovalSection({ modulo, entita, entitaId, tipiRichiesta, azioneUrl }: Props) {
  const { isManager, userProfile } = useAuth()
  const { data: approvazioni = [], isLoading } = useApprovazioni(entita, entitaId)
  const crea = useCreaApprovazione()
  const decidi = useDecidiApprovazione()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [tipo, setTipo] = useState('')
  const [descrizione, setDescrizione] = useState('')
  // richiesta per cui è aperto il box rifiuto (motivazione)
  const [rifiutoId, setRifiutoId] = useState<string | null>(null)
  const [motivazione, setMotivazione] = useState('')

  async function handleRichiedi(e: FormEvent) {
    e.preventDefault()
    if (!tipo) { toast.error('Scegli il tipo di richiesta'); return }
    if (!descrizione.trim()) { toast.error('La descrizione è obbligatoria'); return }
    try {
      await crea.mutateAsync({
        modulo, entita, entitaId,
        tipoRichiesta: tipo,
        descrizione: descrizione.trim(),
        azioneUrl: azioneUrl ?? window.location.pathname,
      })
      toast.success('Richiesta inviata: admin e manager sono stati avvisati')
      setDialogOpen(false)
      setTipo(''); setDescrizione('')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  async function handleDecisione(a: Approvazione, stato: 'approvata' | 'rifiutata' | 'annullata') {
    try {
      await decidi.mutateAsync({
        id: a.id, entita, entitaId, stato,
        motivazione: stato === 'rifiutata' ? motivazione.trim() || undefined : undefined,
      })
      toast.success(
        stato === 'approvata' ? 'Richiesta approvata'
        : stato === 'rifiutata' ? 'Richiesta rifiutata'
        : 'Richiesta annullata'
      )
      setRifiutoId(null); setMotivazione('')
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  const tipoLabel = (v: string) => tipiRichiesta.find((t) => t.value === v)?.label ?? v

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Approvazioni</h3>
          {approvazioni.length > 0 && (
            <span className="text-xs text-muted-foreground">({approvazioni.length})</span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
          Richiedi approvazione
        </Button>
      </div>

      <div className="p-2">
        {isLoading && (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">Caricamento…</p>
        )}
        {!isLoading && approvazioni.length === 0 && (
          <EmptyState
            icon={CircleDashed}
            title="Nessuna richiesta"
            description="Le richieste di approvazione per questo record compariranno qui."
          />
        )}
        {approvazioni.map((a) => {
          const badge = STATO_BADGE[a.stato] ?? STATO_BADGE.richiesta
          const pendente = a.stato === 'richiesta'
          const mia = a.richiedente_id === userProfile?.id
          return (
            <div key={a.id} className="rounded-lg px-3 py-2.5 hover:bg-muted/40">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{tipoLabel(a.tipo_richiesta)}</span>
                <Badge tone={badge.tone}>{badge.label}</Badge>
                <span className="ml-auto text-xs text-muted-foreground">{fmtData(a.created_at)}</span>
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{a.descrizione}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Richiesta da {a.richiedente ? `${a.richiedente.nome} ${a.richiedente.cognome ?? ''}`.trim() : '—'}
                {a.approvatore && a.decisa_at && (
                  <> · decisa da {`${a.approvatore.nome} ${a.approvatore.cognome ?? ''}`.trim()} il {fmtData(a.decisa_at)}</>
                )}
                {a.motivazione && <> · «{a.motivazione}»</>}
              </p>

              {pendente && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {isManager && rifiutoId !== a.id && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => void handleDecisione(a, 'approvata')}
                        disabled={decidi.isPending}
                        className="gap-1.5"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approva
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setRifiutoId(a.id); setMotivazione('') }}
                        className="gap-1.5"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Rifiuta
                      </Button>
                    </>
                  )}
                  {mia && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleDecisione(a, 'annullata')}
                      disabled={decidi.isPending}
                      className="gap-1.5 text-muted-foreground"
                    >
                      <Ban className="h-3.5 w-3.5" /> Annulla richiesta
                    </Button>
                  )}
                  {rifiutoId === a.id && (
                    <div className="flex w-full items-center gap-2">
                      <Textarea
                        value={motivazione}
                        onChange={(e) => setMotivazione(e.target.value)}
                        placeholder="Motivazione del rifiuto (opzionale)"
                        rows={1}
                        className="min-h-9 flex-1"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => void handleDecisione(a, 'rifiutata')}
                        disabled={decidi.isPending}
                      >
                        Conferma rifiuto
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setRifiutoId(null)}>
                        Annulla
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Richiedi approvazione</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRichiedi} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Tipo di richiesta *</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger><SelectValue placeholder="Seleziona…" /></SelectTrigger>
                <SelectContent>
                  {tipiRichiesta.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ap-desc">Descrizione *</Label>
              <Textarea
                id="ap-desc"
                value={descrizione}
                onChange={(e) => setDescrizione(e.target.value)}
                placeholder="Cosa chiedi di approvare e perché"
                rows={3}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Annulla</Button>
              <Button type="submit" disabled={crea.isPending}>
                {crea.isPending ? 'Invio…' : 'Invia richiesta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
