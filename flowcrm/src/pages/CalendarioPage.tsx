import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Calendar, dateFnsLocalizer, Views, type View } from 'react-big-calendar'
import * as dndAddon from 'react-big-calendar/lib/addons/dragAndDrop'
import { format as fnsFormat, parse as fnsParse, startOfWeek as fnsStartOfWeek, getDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/page-header'
import { AttivitaDialog } from '@/features/attivita/AttivitaDialog'
import { useEventiCalendario, type CalEvent } from '@/lib/queries/calendario'
import { useUpdateAttivita, type Attivita } from '@/lib/queries/attivita'
import { useUpdateIncasso, useUpdateTassa } from '@/lib/queries/amministrazione'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'

const localizer = dateFnsLocalizer({
  format: fnsFormat,
  parse: fnsParse,
  startOfWeek: (date: Date) => fnsStartOfWeek(date, { locale: it }),
  getDay,
  locales: { it },
})

// Interop CJS/ESM: il default è annidato (index.default → withDragAndDrop.default).
// Scendo lungo i .default finché trovo la funzione HOC.
/* eslint-disable @typescript-eslint/no-explicit-any */
function risolviHoc(m: any): any {
  let f = m
  while (f && typeof f !== 'function' && f.default) f = f.default
  return f
}
const withDragAndDrop = risolviHoc(dndAddon)
const DnDCalendar: React.ComponentType<any> = withDragAndDrop(Calendar as any)
/* eslint-enable @typescript-eslint/no-explicit-any */

const messages = {
  today: 'Oggi', previous: 'Indietro', next: 'Avanti', month: 'Mese', week: 'Settimana',
  day: 'Giorno', agenda: 'Agenda', date: 'Data', time: 'Ora', event: 'Evento',
  noEventsInRange: 'Nessun evento in questo periodo', showMore: (n: number) => `+ altri ${n}`,
}

const TIPO_COLORE: Record<CalEvent['tipo'], string> = {
  riunione: '#ff5c35', attivita: '#3b82f6', incasso: '#16a34a', tassa: '#9333ea',
}

export function CalendarioPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: eventi = [] } = useEventiCalendario()
  const updateAtt = useUpdateAttivita()
  const updateInc = useUpdateIncasso()
  const updateTax = useUpdateTassa()
  const [view, setView] = useState<View>(Views.MONTH)
  const [date, setDate] = useState(new Date())
  const [nuovaOpen, setNuovaOpen] = useState(false)
  const [editAttivita, setEditAttivita] = useState<Attivita | null>(null)

  const onSelectSlot = useCallback(() => setNuovaOpen(true), [])

  const onSelectEvent = useCallback(async (ev: CalEvent) => {
    if (ev.tipo === 'incasso') { navigate('/incassi'); return }
    if (ev.tipo === 'tassa') { navigate('/tasse'); return }
    // riunione/attività → carica il record e apri in modifica
    const { data } = await supabase.from('attivita').select('*').eq('id', ev.refId).single()
    if (data) setEditAttivita(data as Attivita)
  }, [navigate])

  const onEventDrop = useCallback(async ({ event, start }: { event: CalEvent; start: string | Date }) => {
    const nuova = new Date(start)
    try {
      if (event.tipo === 'riunione') {
        await updateAtt.mutateAsync({ id: event.refId, values: { inizio: nuova.toISOString() } })
      } else if (event.tipo === 'attivita') {
        await updateAtt.mutateAsync({ id: event.refId, values: { scadenza: nuova.toISOString() } })
      } else if (event.tipo === 'incasso') {
        await updateInc.mutateAsync({ id: event.refId, values: { data_prevista: nuova.toISOString().slice(0, 10) } })
      } else if (event.tipo === 'tassa') {
        await updateTax.mutateAsync({ id: event.refId, values: { scadenza: nuova.toISOString().slice(0, 10) } })
      }
      qc.invalidateQueries({ queryKey: ['calendario'] })
      toast.success('Evento spostato')
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Impossibile spostare')
    }
  }, [updateAtt, updateInc, updateTax, qc])

  return (
    <div>
      <PageHeader title="Calendario"
        description="Riunioni, attività con scadenza e scadenze economiche. Clicca un giorno per creare, trascina per spostare." />

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm" style={{ height: 640 }}>
        <DnDCalendar
          localizer={localizer}
          culture="it"
          messages={messages}
          events={eventi}
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          selectable
          popup
          onSelectSlot={onSelectSlot}
          onSelectEvent={onSelectEvent}
          onEventDrop={onEventDrop}
          eventPropGetter={(ev: CalEvent) => ({ style: { backgroundColor: TIPO_COLORE[ev.tipo], border: 'none' } })}
          style={{ height: '100%' }}
        />
      </div>

      <AttivitaDialog
        open={nuovaOpen || !!editAttivita}
        tipoIniziale="riunione"
        attivita={editAttivita ?? undefined}
        onOpenChange={(o) => { if (!o) { setNuovaOpen(false); setEditAttivita(null); qc.invalidateQueries({ queryKey: ['calendario'] }) } }}
      />
    </div>
  )
}
