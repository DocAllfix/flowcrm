/**
 * AgendaPoliPage — agenda prenotazioni (documento §3): vista settimana/
 * giorno per professionista (filtro), colori per stato, click su slot
 * per prenotare, drag&drop per spostare (il DB blocca le sovrapposizioni).
 * Stesso stack del Calendario core (react-big-calendar localizzato IT).
 */
import { useMemo, useState, useCallback } from 'react'
import { Calendar, dateFnsLocalizer, Views, type View } from 'react-big-calendar'
import * as dndAddon from 'react-big-calendar/lib/addons/dragAndDrop'
import { format as fnsFormat, parse as fnsParse, startOfWeek as fnsStartOfWeek, getDay } from 'date-fns'
import { it } from 'date-fns/locale'
import { toast } from 'sonner'
import { PageHeader } from '@/components/ui/page-header'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { AppuntamentoDialog } from '@/modules/poliambulatori/dialogs/AppuntamentoDialog'
import { APPUNTAMENTO_STATO, nomePaziente } from '@/modules/poliambulatori/stati'
import {
  useAppuntamenti, useSaveAppuntamento, usePoliLista,
  type Appuntamento, type Professionista,
} from '@/modules/poliambulatori/queries/poliambulatorio'
import 'react-big-calendar/lib/css/react-big-calendar.css'
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'

const localizer = dateFnsLocalizer({
  format: fnsFormat,
  parse: fnsParse,
  startOfWeek: (date: Date) => fnsStartOfWeek(date, { locale: it }),
  getDay,
  locales: { it },
})

// Interop CJS/ESM del HOC drag&drop (pattern del Calendario core)
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
  day: 'Giorno', agenda: 'Agenda', date: 'Data', time: 'Ora', event: 'Appuntamento',
  noEventsInRange: 'Nessun appuntamento in questo periodo', showMore: (n: number) => `+ altri ${n}`,
}

interface EventoAgenda {
  id: string
  title: string
  start: Date
  end: Date
  appuntamento: Appuntamento
}

export function AgendaPoliPage() {
  const { data: appuntamenti = [] } = useAppuntamenti()
  const { data: professionisti = [] } = usePoliLista<Professionista>('professionisti')
  const save = useSaveAppuntamento()
  const [view, setView] = useState<View>(Views.WEEK)
  const [date, setDate] = useState(new Date())
  const [profFiltro, setProfFiltro] = useState('tutti')
  const [nuovoSlot, setNuovoSlot] = useState<Date | null>(null)
  const [editApp, setEditApp] = useState<Appuntamento | null>(null)

  const eventi: EventoAgenda[] = useMemo(() =>
    appuntamenti
      .filter((a) => a.stato !== 'annullato')
      .filter((a) => profFiltro === 'tutti' || a.professionista_id === profFiltro)
      .map((a) => {
        const start = new Date(a.inizio)
        return {
          id: a.id,
          title: `${nomePaziente(a.paziente)}${a.prestazione ? ` · ${a.prestazione.nome}` : ''}`,
          start,
          end: new Date(start.getTime() + a.durata_minuti * 60000),
          appuntamento: a,
        }
      }),
    [appuntamenti, profFiltro])

  const onSelectSlot = useCallback(({ start }: { start: Date }) => setNuovoSlot(start), [])
  const onSelectEvent = useCallback((ev: EventoAgenda) => setEditApp(ev.appuntamento), [])

  const onEventDrop = useCallback(async ({ event, start }: { event: EventoAgenda; start: string | Date }) => {
    try {
      await save.mutateAsync({
        id: event.id,
        values: { inizio: new Date(start).toISOString() },
      })
      toast.success('Appuntamento spostato')
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Impossibile spostare')
    }
  }, [save])

  const eventPropGetter = useCallback((ev: EventoAgenda) => {
    const st = APPUNTAMENTO_STATO[ev.appuntamento.stato] ?? APPUNTAMENTO_STATO.prenotato
    const colore = ev.appuntamento.professionista?.colore ?? st.colore
    return {
      style: {
        backgroundColor: colore,
        borderColor: colore,
        opacity: ev.appuntamento.stato === 'eseguito' ? 0.6 : 1,
      },
    }
  }, [])

  return (
    <div>
      <PageHeader
        title="Agenda"
        description="Prenotazioni per professionista. Clicca uno slot per prenotare, trascina per spostare: le sovrapposizioni sono bloccate."
        actions={
          <Select value={profFiltro} onValueChange={setProfFiltro}>
            <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="tutti">Tutti i professionisti</SelectItem>
              {professionisti.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.nome} {p.cognome ?? ''}{p.specializzazione ? ` (${p.specializzazione})` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

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
          defaultView={Views.WEEK}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          selectable
          onSelectSlot={onSelectSlot}
          onSelectEvent={onSelectEvent}
          onEventDrop={onEventDrop}
          eventPropGetter={eventPropGetter}
          step={15}
          timeslots={4}
          min={new Date(1970, 0, 1, 7, 0)}
          max={new Date(1970, 0, 1, 21, 0)}
          style={{ height: '100%' }}
        />
      </div>

      <AppuntamentoDialog
        open={!!nuovoSlot}
        slotIniziale={nuovoSlot ?? undefined}
        onOpenChange={(o) => { if (!o) setNuovoSlot(null) }}
      />
      <AppuntamentoDialog
        open={!!editApp}
        appuntamento={editApp ?? undefined}
        onOpenChange={(o) => { if (!o) setEditApp(null) }}
      />
    </div>
  )
}
