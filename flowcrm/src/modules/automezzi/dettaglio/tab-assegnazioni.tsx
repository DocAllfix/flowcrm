import { ApprovalSection } from '@/components/ApprovalSection'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, User } from 'lucide-react'
import { fmtData } from '@/modules/automezzi/stati'
import { toast } from 'sonner'
import { useFigliAutomezzo, useCreaFiglioAutomezzo, useAggiornaFiglioAutomezzo, useEliminaFiglioAutomezzo, type Automezzo, type AutomezzoAssegnazione } from '@/modules/automezzi/queries/automezzi'
import { useState, type FormEvent } from 'react'
import { BtnElimina, card } from '@/modules/automezzi/dettaglio/comuni'

export // ── Assegnazioni ─────────────────────────────────────────────────
function TabAssegnazioni({ mezzo }: { mezzo: Automezzo }) {
  const { data: assegnazioni = [] } = useFigliAutomezzo<AutomezzoAssegnazione>(mezzo.id, 'automezzi_assegnazioni')
  const crea = useCreaFiglioAutomezzo()
  const aggiorna = useAggiornaFiglioAutomezzo()
  const elimina = useEliminaFiglioAutomezzo()
  const [assegnatario, setAssegnatario] = useState('')
  const [motivo, setMotivo] = useState('')
  const [reparto, setReparto] = useState('')

  return (
    <div className="space-y-4">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Assegnazioni</h3>
        {assegnazioni.map((a) => (
          <div key={a.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <User className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">
                {a.dipendente ? `${a.dipendente.nome} ${a.dipendente.cognome ?? ''}` : a.assegnatario ?? '—'}
              </p>
              <p className="text-xs text-muted-foreground">
                dal {fmtData(a.data_inizio)}{a.data_fine ? ` al ${fmtData(a.data_fine)}` : ' (in corso)'}
                {a.reparto ? ` · ${a.reparto}` : ''}{a.motivo ? ` · ${a.motivo}` : ''}
              </p>
            </div>
            {!a.data_fine && (
              <Button size="sm" variant="ghost" className="text-xs"
                onClick={() => aggiorna.mutate({
                  automezzoId: mezzo.id, tabella: 'automezzi_assegnazioni', id: a.id,
                  values: { data_fine: new Date().toISOString().slice(0, 10), km_finali: mezzo.km_attuali },
                })}>
                Chiudi assegnazione
              </Button>
            )}
            <BtnElimina onClick={() => elimina.mutate({ automezzoId: mezzo.id, tabella: 'automezzi_assegnazioni', id: a.id })} />
          </div>
        ))}
        <form
          onSubmit={(e: FormEvent) => {
            e.preventDefault()
            if (!assegnatario.trim()) { toast.error("Indica l'assegnatario"); return }
            crea.mutate({
              automezzoId: mezzo.id, tabella: 'automezzi_assegnazioni',
              values: {
                assegnatario: assegnatario.trim(), motivo: motivo.trim() || null,
                reparto: reparto.trim() || null,
                km_iniziali: mezzo.km_attuali,
              },
            }, {
              onSuccess: () => { setAssegnatario(''); setMotivo(''); setReparto('') },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-40 flex-1 space-y-1">
            <Label>Assegnatario</Label>
            <Input value={assegnatario} onChange={(e) => setAssegnatario(e.target.value)}
              placeholder="Nome del conducente" />
          </div>
          <div className="w-36 space-y-1">
            <Label>Reparto</Label>
            <Input value={reparto} onChange={(e) => setReparto(e.target.value)}
              placeholder="Es. Cantieri Nord" />
          </div>
          <div className="min-w-32 flex-1 space-y-1">
            <Label>Motivo</Label>
            <Input value={motivo} onChange={(e) => setMotivo(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Assegna</Button>
        </form>
      </div>

      <ApprovalSection
        modulo="automezzi" entita="automezzi" entitaId={mezzo.id}
        tipiRichiesta={[
          { value: 'utilizzo', label: 'Richiesta utilizzo mezzo' },
          { value: 'prenotazione', label: 'Prenotazione' },
          { value: 'manutenzione', label: 'Autorizzazione manutenzione' },
          { value: 'ricambi', label: 'Acquisto ricambi' },
          { value: 'riparazione', label: 'Approvazione riparazione' },
        ]}
        azioneUrl={`/automezzi/${mezzo.id}`}
      />
    </div>
  )
}
