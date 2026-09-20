import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Pencil, Plus, TriangleAlert } from 'lucide-react'
import { RapportinoDialog } from '@/modules/cantiere/dialogs/RapportinoDialog'
import { fmtData, METEO_LABEL } from '@/modules/cantiere/stati'
import { useAuth } from '@/hooks/useAuth'
import { useFigliCantiere, useEliminaFiglioCantiere, type Cantiere, type CantiereRapportino } from '@/modules/cantiere/queries/cantieri'
import { useState } from 'react'
import { BtnElimina, card } from '@/modules/cantiere/dettaglio/comuni'

export // ── Rapportini ───────────────────────────────────────────────────
function TabRapportini({ cantiere }: { cantiere: Cantiere }) {
  const { data: rapportini = [] } = useFigliCantiere<CantiereRapportino>(cantiere.id, 'cantiere_rapportini')
  const elimina = useEliminaFiglioCantiere()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [edit, setEdit] = useState<CantiereRapportino | null>(null)
  const { isAdmin } = useAuth()

  return (
    <div className={card}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Rapportini giornalieri</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" /> Rapportino di oggi
        </Button>
      </div>
      {rapportini.length === 0 && (
        <p className="py-2 text-sm text-muted-foreground">
          Il capocantiere registra ogni giorno lavorazioni, presenze, mezzi, meteo e problemi — anche dal telefono.
        </p>
      )}
      {rapportini.map((r) => (
        <div key={r.id} className="border-b border-border py-3 last:border-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{fmtData(r.data)}</span>
            {r.meteo && <Badge tone="neutral">{METEO_LABEL[r.meteo] ?? r.meteo}</Badge>}
            {r.problemi && <Badge tone="warning">Problemi</Badge>}
            <span className="ml-auto text-xs text-muted-foreground">
              {r.capocantiere ? `${r.capocantiere.nome} ${r.capocantiere.cognome ?? ''}` : ''}
            </span>
            <button onClick={() => setEdit(r)} aria-label="Modifica"
              className="rounded-md p-1 text-muted-foreground hover:text-foreground">
              <Pencil className="h-3.5 w-3.5" />
            </button>
            {isAdmin && (
              <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_rapportini', id: r.id })} />
            )}
          </div>
          <p className="mt-1 text-sm text-foreground">{r.lavorazioni}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[r.personale && `Personale: ${r.personale}`, r.mezzi && `Mezzi: ${r.mezzi}`,
              r.materiali && `Materiali: ${r.materiali}`].filter(Boolean).join(' · ')}
          </p>
          {r.problemi && (
            <p className="mt-1 flex items-start gap-1.5 text-sm text-warning-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{r.problemi}</span>
            </p>
          )}
        </div>
      ))}
      <RapportinoDialog
        open={dialogOpen || !!edit}
        cantiereId={cantiere.id}
        rapportino={edit ?? undefined}
        onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEdit(null) } }}
      />
    </div>
  )
}
