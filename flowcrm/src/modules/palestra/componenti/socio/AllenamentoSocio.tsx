/**
 * Allenamento e progressi (documento Palestra §16–18): scheda con esercizi,
 * serie, ripetizioni, carichi e recuperi e lo storico delle versioni;
 * misure, grafico e valutazioni. Misure e valutazioni sono dati sulla
 * salute: li vedono solo l'amministratore e il trainer assegnato, con il
 * consenso del socio.
 */
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ClipboardList, LineChart as IconaGrafico, Lock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useAuth } from '@/hooks/useAuth'
import { useElenco, useRpc, useSalva, useInserisci, useElimina, useAzione, messaggioErrore } from '@/lib/queries/fondamenta'
import type { Esercizio, Misurazione, Scheda, SocioStato, Valutazione } from '@/modules/palestra/queries'
import { fmtData, fmtNumero } from '@/modules/palestra/stati'

export function AllenamentoSocio({ socio }: { socio: SocioStato }) {
  const { isManager } = useAuth()
  const { data: mioTrainer } = useRpc<string | null>('pal_trainer_corrente', {})
  const { data: puoSalute } = useRpc<boolean>('pal_puo_salute', { p_socio: socio.socio_id })
  const puoScheda = isManager || !!mioTrainer
  return (
    <div className="space-y-5">
      <SchedaAllenamento socio={socio} puoScrivere={puoScheda} trainerId={mioTrainer ?? socio.trainer_id ?? null} />
      {puoSalute ? <Progressi socio={socio} trainerId={mioTrainer ?? null} /> : (
        <Card className="flex items-start gap-3 p-5">
          <Lock className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
          <div className="text-sm">
            <p className="font-medium text-foreground">Progressi e valutazioni riservati</p>
            <p className="text-muted-foreground">{socio.consenso_salute
              ? 'Misure, progressi e valutazioni sono dati sulla salute: li vede solo il personal trainer assegnato al socio (e l\'amministratore).'
              : 'Il socio non ha dato il consenso al trattamento dei dati sulla salute: senza consenso misure e valutazioni non si registrano.'}</p>
          </div>
        </Card>
      )}
    </div>
  )
}

function SchedaAllenamento({ socio, puoScrivere, trainerId }: { socio: SocioStato; puoScrivere: boolean; trainerId: string | null }) {
  const { data: schede = [] } = useElenco<Scheda>('pal_schede', { filtri: { socio_id: socio.socio_id! }, ordine: [{ colonna: 'versione', crescente: false }] })
  const attiva = schede.find((s) => s.attiva) ?? null
  const [vistaId, setVistaId] = useState<string | null>(null)
  const scheda = schede.find((s) => s.id === vistaId) ?? attiva
  const { data: esercizi = [] } = useElenco<Esercizio>('pal_schede_esercizi', {
    filtri: { scheda_id: scheda?.id }, ordine: [{ colonna: 'giorno' }, { colonna: 'ordine' }], abilitato: !!scheda })
  const salva = useSalva('pal_schede')
  const aggiungi = useInserisci('pal_schede_esercizi')
  const togli = useElimina('pal_schede_esercizi')
  const versione = useAzione('pal_nuova_versione_scheda', ['pal_schede', 'pal_schede_esercizi'])
  const [e, setE] = useState({ giorno: 'A', esercizio: '', serie: '3', ripetizioni: '10', carico: '', recupero: '90 s' })
  const modificabile = puoScrivere && !!scheda && scheda.attiva

  function nuovoEsercizio(ev: FormEvent) {
    ev.preventDefault()
    if (!e.esercizio.trim() || !scheda) return
    aggiungi.mutate({ scheda_id: scheda.id, giorno: e.giorno.trim().toUpperCase() || 'A', esercizio: e.esercizio.trim(), serie: Number(e.serie) || null,
      ripetizioni: e.ripetizioni || null, carico: e.carico || null, recupero: e.recupero || null, ordine: esercizi.filter((x) => x.giorno === e.giorno).length }, {
      onSuccess: () => setE({ ...e, esercizio: '', carico: '' }), onError: (err) => toast.error(messaggioErrore(err)) })
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-title text-foreground"><ClipboardList className="h-4 w-4 text-primary-testo" /> Scheda di allenamento</h3>
        <div className="flex flex-wrap items-center gap-2">
          {schede.length > 1 && (
            <Select value={scheda?.id ?? ''} onValueChange={setVistaId}>
              <SelectTrigger className="w-56" aria-label="Versione della scheda"><SelectValue /></SelectTrigger>
              <SelectContent>{schede.map((s) => <SelectItem key={s.id} value={s.id}>Versione {s.versione}{s.attiva ? ' · in uso' : ` · fino al ${fmtData(s.valida_fino)}`}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {puoScrivere && attiva && scheda?.id === attiva.id && (
            <BottoneScrittura size="sm" variant="outline" disabled={versione.isPending}
              onClick={() => versione.mutate({ p_scheda: attiva.id }, {
                onSuccess: () => { setVistaId(null); toast.success('Nuova versione: la precedente resta nello storico') }, onError: (err) => toast.error(messaggioErrore(err)) })}>
              Nuova versione</BottoneScrittura>
          )}
        </div>
      </div>
      {!scheda ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted-foreground">{puoScrivere ? 'Ancora nessuna scheda.' : 'Ancora nessuna scheda: la prepara il trainer.'}</p>
          {puoScrivere && <BottoneScrittura variant="outline" onClick={() => salva.mutate({ values: { socio_id: socio.socio_id!, trainer_id: trainerId } },
            { onError: (err) => toast.error(messaggioErrore(err)) })}>Crea la scheda</BottoneScrittura>}
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {([['obiettivi', 'Obiettivi', 'Tonificazione, forza, dimagrimento…'], ['programma', 'Programma', 'Split A/B, full body…'], ['frequenza', 'Frequenza', '3 volte a settimana']] as const).map(([k, l, ph]) => (
              <div key={k} className="space-y-1.5"><Label htmlFor={`sc-${k}`}>{l}</Label>
                <Input id={`sc-${k}`} defaultValue={scheda[k] ?? ''} key={scheda.id + k} placeholder={ph} disabled={!modificabile}
                  onBlur={(ev) => { const v = ev.target.value.trim() || null; if (v !== scheda[k]) salva.mutate({ id: scheda.id, values: { [k]: v } }, { onError: (err) => toast.error(messaggioErrore(err)) }) }} /></div>
            ))}
            <div className="space-y-1.5 sm:col-span-3"><Label htmlFor="sc-note">Note del trainer</Label>
              <Textarea id="sc-note" rows={2} defaultValue={scheda.note_trainer ?? ''} key={scheda.id + 'note'} disabled={!modificabile}
                onBlur={(ev) => { const v = ev.target.value.trim() || null; if (v !== scheda.note_trainer) salva.mutate({ id: scheda.id, values: { note_trainer: v } }, { onError: (err) => toast.error(messaggioErrore(err)) }) }} /></div>
          </div>
          {esercizi.length > 0 && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Seduta</TableHead><TableHead>Esercizio</TableHead><TableHead className="text-right">Serie</TableHead>
                  <TableHead>Ripetizioni</TableHead><TableHead>Carico</TableHead><TableHead>Recupero</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>{esercizi.map((x) => (
                  <TableRow key={x.id}>
                    <TableCell><Badge tone="neutral">{x.giorno}</Badge></TableCell>
                    <TableCell className="font-medium text-foreground">{x.esercizio}</TableCell>
                    <TableCell numerica>{x.serie ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{x.ripetizioni ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{x.carico ?? '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{x.recupero ?? '—'}</TableCell>
                    <TableCell className="text-right">{modificabile && <Button size="sm" variant="ghost" aria-label={`Togli ${x.esercizio}`} onClick={() => togli.mutate(x.id)}><Trash2 className="h-3.5 w-3.5" /></Button>}</TableCell>
                  </TableRow>))}</TableBody>
              </Table>
            </div>
          )}
          {modificabile && (
            <form onSubmit={nuovoEsercizio} className="mt-3 grid grid-cols-2 items-end gap-2 sm:grid-cols-[4rem_minmax(0,1fr)_4.5rem_6rem_7rem_6rem_auto]">
              <div className="space-y-1.5"><Label htmlFor="es-g">Seduta</Label><Input id="es-g" value={e.giorno} onChange={(ev) => setE({ ...e, giorno: ev.target.value })} maxLength={2} /></div>
              <div className="space-y-1.5"><Label htmlFor="es-n">Esercizio</Label><Input id="es-n" value={e.esercizio} onChange={(ev) => setE({ ...e, esercizio: ev.target.value })} placeholder="Squat, panca piana…" /></div>
              <div className="space-y-1.5"><Label htmlFor="es-s">Serie</Label><Input id="es-s" type="number" min={1} value={e.serie} onChange={(ev) => setE({ ...e, serie: ev.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="es-r">Ripetizioni</Label><Input id="es-r" value={e.ripetizioni} onChange={(ev) => setE({ ...e, ripetizioni: ev.target.value })} /></div>
              <div className="space-y-1.5"><Label htmlFor="es-c">Carico</Label><Input id="es-c" value={e.carico} onChange={(ev) => setE({ ...e, carico: ev.target.value })} placeholder="40 kg" /></div>
              <div className="space-y-1.5"><Label htmlFor="es-p">Recupero</Label><Input id="es-p" value={e.recupero} onChange={(ev) => setE({ ...e, recupero: ev.target.value })} /></div>
              <BottoneScrittura type="submit" variant="outline" disabled={!e.esercizio.trim()}>Aggiungi</BottoneScrittura>
            </form>
          )}
          {!scheda.attiva && <p className="mt-3 text-xs text-muted-foreground">Versione archiviata: valida dal {fmtData(scheda.valida_dal)} al {fmtData(scheda.valida_fino)}.</p>}
        </>
      )}
    </Card>
  )
}

function Progressi({ socio, trainerId }: { socio: SocioStato; trainerId: string | null }) {
  const { data: misure = [] } = useElenco<Misurazione>('pal_misurazioni', { filtri: { socio_id: socio.socio_id! }, ordine: [{ colonna: 'data' }] })
  const { data: valutazioni = [] } = useElenco<Valutazione>('pal_valutazioni', { filtri: { socio_id: socio.socio_id! }, ordine: [{ colonna: 'data', crescente: false }] })
  const nuovaMisura = useInserisci('pal_misurazioni')
  const nuovaValutazione = useInserisci('pal_valutazioni')
  const [m, setM] = useState({ peso: '', altezza: '', grasso: '', vita: '', fianchi: '', nota: '' })
  const [v, setV] = useState({ tipo: 'iniziale', obiettivi: '', livello: 'principiante', test: '', valutazione: '', programma: '', followUp: '' })
  const num = (s: string) => (s.trim() ? Number(s.replace(',', '.')) : null)
  const serie = misure.filter((x) => x.peso !== null).map((x) => ({ data: fmtData(x.data).slice(0, 5), peso: Number(x.peso) }))

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      <Card className="p-5">
        <h3 className="mb-3 flex items-center gap-2 text-title text-foreground"><IconaGrafico className="h-4 w-4 text-primary-testo" /> Misure e progressi</h3>
        {serie.length > 1 && (
          <div className="mb-3 h-44" role="img" aria-label={`Andamento del peso: da ${fmtNumero(serie[0].peso, 1)} a ${fmtNumero(serie[serie.length - 1].peso, 1)} kg`}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={serie} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="data" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <YAxis domain={['dataMin - 2', 'dataMax + 2']} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickLine={false} axisLine={false} />
                <Tooltip formatter={(x) => [`${fmtNumero(Number(x), 1)} kg`, 'Peso']} contentStyle={{ borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }} />
                <Line type="monotone" dataKey="peso" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <form className="grid grid-cols-3 gap-2" onSubmit={(ev) => { ev.preventDefault()
          if (!m.peso && !m.vita && !m.fianchi && !m.grasso) { toast.error('Scrivi almeno una misura'); return }
          nuovaMisura.mutate({ socio_id: socio.socio_id!, trainer_id: trainerId, peso: num(m.peso), altezza: num(m.altezza), massa_grassa_pct: num(m.grasso),
            misure: { ...(m.vita ? { vita: num(m.vita) } : {}), ...(m.fianchi ? { fianchi: num(m.fianchi) } : {}) }, note: m.nota.trim() || null }, {
            onSuccess: () => { toast.success('Misure registrate'); setM({ peso: '', altezza: m.altezza, grasso: '', vita: '', fianchi: '', nota: '' }) },
            onError: (err) => toast.error(messaggioErrore(err)) }) }}>
          {([['peso', 'Peso (kg)'], ['altezza', 'Altezza (cm)'], ['grasso', 'Massa grassa %'], ['vita', 'Vita (cm)'], ['fianchi', 'Fianchi (cm)']] as const).map(([k, l]) => (
            <div key={k} className="space-y-1.5"><Label htmlFor={`mi-${k}`}>{l}</Label><Input id={`mi-${k}`} inputMode="decimal" value={m[k]} onChange={(ev) => setM({ ...m, [k]: ev.target.value })} /></div>))}
          <div className="flex items-end"><BottoneScrittura type="submit" variant="outline" className="w-full" disabled={nuovaMisura.isPending}>Registra</BottoneScrittura></div>
        </form>
        {misure.length > 0 && (
          <ul className="mt-3 divide-y divide-border text-sm">{[...misure].reverse().slice(0, 8).map((x) => (
            <li key={x.id} className="flex flex-wrap gap-x-4 gap-y-0.5 py-1.5">
              <span className="w-24 text-muted-foreground">{fmtData(x.data)}</span>
              {x.peso !== null && <span className="tabular-nums text-foreground">{fmtNumero(x.peso, 1)} kg</span>}
              {x.massa_grassa_pct !== null && <span className="tabular-nums text-muted-foreground">grasso {fmtNumero(x.massa_grassa_pct, 1)}%</span>}
              {Object.entries((x.misure ?? {}) as Record<string, number>).map(([k, val]) => <span key={k} className="tabular-nums text-muted-foreground">{k} {fmtNumero(val, 1)} cm</span>)}
            </li>))}</ul>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="mb-3 text-title text-foreground">Valutazioni</h3>
        <form className="grid grid-cols-2 gap-2" onSubmit={(ev) => { ev.preventDefault()
          if (!v.valutazione.trim() && !v.obiettivi.trim()) { toast.error('Scrivi gli obiettivi o la valutazione'); return }
          nuovaValutazione.mutate({ socio_id: socio.socio_id!, trainer_id: trainerId, tipo: v.tipo, obiettivi: v.obiettivi.trim() || null, livello: v.livello,
            test: v.test.trim() ? v.test.split('\n').filter(Boolean).map((r) => ({ nome: r.split(':')[0].trim(), esito: r.split(':').slice(1).join(':').trim() })) : [],
            valutazione: v.valutazione.trim() || null, programma_proposto: v.programma.trim() || null, follow_up: v.followUp || null }, {
            onSuccess: () => { toast.success('Valutazione registrata'); setV({ ...v, obiettivi: '', test: '', valutazione: '', programma: '', followUp: '' }) },
            onError: (err) => toast.error(messaggioErrore(err)) }) }}>
          <Select value={v.tipo} onValueChange={(x) => setV({ ...v, tipo: x })}><SelectTrigger aria-label="Tipo di valutazione"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="iniziale">Valutazione iniziale</SelectItem><SelectItem value="follow_up">Follow-up</SelectItem></SelectContent></Select>
          <Select value={v.livello} onValueChange={(x) => setV({ ...v, livello: x })}><SelectTrigger aria-label="Livello"><SelectValue /></SelectTrigger>
            <SelectContent>{[['principiante', 'Principiante'], ['intermedio', 'Intermedio'], ['avanzato', 'Avanzato']].map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select>
          <Input className="col-span-2" value={v.obiettivi} onChange={(ev) => setV({ ...v, obiettivi: ev.target.value })} placeholder="Obiettivi" aria-label="Obiettivi" />
          <Textarea className="col-span-2" rows={2} value={v.test} onChange={(ev) => setV({ ...v, test: ev.target.value })} placeholder={'Test funzionali, uno per riga — es. «Squat test: 18 ripetizioni»'} aria-label="Test funzionali" />
          <Textarea className="col-span-2" rows={2} value={v.valutazione} onChange={(ev) => setV({ ...v, valutazione: ev.target.value })} placeholder="Valutazione e parametri" aria-label="Valutazione" />
          <Input value={v.programma} onChange={(ev) => setV({ ...v, programma: ev.target.value })} placeholder="Programma proposto" aria-label="Programma proposto" />
          <Input type="date" value={v.followUp} onChange={(ev) => setV({ ...v, followUp: ev.target.value })} aria-label="Follow-up il" />
          <BottoneScrittura type="submit" variant="outline" className="col-span-2" disabled={nuovaValutazione.isPending}>Registra la valutazione</BottoneScrittura>
        </form>
        {valutazioni.length > 0 && (
          <ul className="mt-3 space-y-3 text-sm">{valutazioni.map((x) => (
            <li key={x.id} className="rounded-lg border border-border p-3">
              <p className="font-medium text-foreground">{x.tipo === 'iniziale' ? 'Valutazione iniziale' : 'Follow-up'} · {fmtData(x.data)}{x.livello ? ` · ${x.livello}` : ''}</p>
              {x.obiettivi && <p className="text-muted-foreground">Obiettivi: {x.obiettivi}</p>}
              {Array.isArray(x.test) && (x.test as { nome: string; esito: string }[]).map((t, i) => <p key={i} className="text-muted-foreground">{t.nome}: {t.esito}</p>)}
              {x.valutazione && <p className="text-foreground">{x.valutazione}</p>}
              {x.programma_proposto && <p className="text-muted-foreground">Programma: {x.programma_proposto}</p>}
              {x.follow_up && <p className="text-xs text-muted-foreground">Follow-up il {fmtData(x.follow_up)}</p>}
            </li>))}</ul>
        )}
      </Card>
    </div>
  )
}
