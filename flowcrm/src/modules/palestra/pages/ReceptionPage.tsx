/**
 * Reception (documento Palestra §7–8): l'ingresso dal badge, dal QR o dal
 * nome con il sì o il no e il motivo, chi è in sala adesso, le lezioni di
 * oggi e quello che la reception deve sistemare.
 */
import { useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { CircleCheck, CircleX, DoorOpen, LogOut, QrCode, UserPlus, CalendarClock, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { cn } from '@/lib/utils'
import { useAuth } from '@/hooks/useAuth'
import type { Database } from '@/types/database.types'
import { useElenco, useRpc, useAzione, useDalVivo, messaggioErrore } from '@/lib/queries/fondamenta'
import { usePalestra } from '@/modules/palestra/contesto'
import { ConSede, SelettoreSede } from '@/modules/palestra/componenti/ConSede'
import { CercaSocio } from '@/modules/palestra/componenti/CercaSocio'
import { NuovoSocioDialog } from '@/modules/palestra/dialogs/NuovoSocioDialog'
import { TABELLE_SOCIO, type EsitoAccesso } from '@/modules/palestra/queries'
import { SERVIZIO, fmtOra } from '@/modules/palestra/stati'

type Presente = Database['public']['Views']['pal_presenti']['Row']
interface Cruscotto {
  presenti: number; ingressi_oggi: number; negati_oggi: number; pt_oggi: number; wellness_oggi: number; scadenze_7: number
  certificati_30: number; morosi: number; rate_oggi: number; sospensioni_da_autorizzare: number; prove_oggi: number
  lezioni_oggi: { lezione_id: string; corso: string; inizio: string; iscritti: number; capienza: number; in_attesa: number; presenti: number; stato: string }[]
}

export function ReceptionPage() {
  return <ConSede><Reception_ /></ConSede>
}

function Reception_() {
  const { sedeId, sede } = usePalestra()
  const { isManager } = useAuth()
  useDalVivo(['pal_accessi', 'pal_prenotazioni', 'pal_lezioni'], [['fond-rpc']])
  const { data: c, isLoading } = useRpc<Cruscotto>('pal_cruscotto', { p_sede: sedeId }, { abilitato: !!sedeId, intervallo: 60_000 })
  const { data: presenti = [] } = useElenco<Presente>('pal_presenti', { filtri: { sede_id: sedeId ?? undefined }, ordine: [{ colonna: 'ingresso_at', crescente: false }], abilitato: !!sedeId })
  const ingresso = useAzione('pal_registra_ingresso', TABELLE_SOCIO)
  const uscita = useAzione('pal_registra_uscita', TABELLE_SOCIO)
  const [codice, setCodice] = useState('')
  const [tipo, setTipo] = useState('badge')
  const [servizio, setServizio] = useState('sala_pesi')
  const [esito, setEsito] = useState<EsitoAccesso | null>(null)
  const [nuovo, setNuovo] = useState(false)
  const campo = useRef<HTMLInputElement>(null)
  const n = (v: number | undefined) => (isLoading ? undefined : v ?? 0)

  function registra(cod: string, tipoIngresso = tipo) {
    if (!cod.trim()) return
    ingresso.mutate({ p_codice: cod.trim(), p_sede: sedeId!, p_tipo: tipoIngresso, p_servizio: servizio }, {
      onSuccess: (r) => { setEsito(r as unknown as EsitoAccesso); setCodice(''); campo.current?.focus() },
      onError: (e) => toast.error(messaggioErrore(e)),
    })
  }
  function invia(e: FormEvent) { e.preventDefault(); registra(codice) }

  return (
    <div>
      <PageHeader title={`Reception · ${sede?.nome ?? ''}`} description="Ingressi con il motivo di ogni no, chi è in sala e le lezioni di oggi."
        numeri={[
          { etichetta: 'in sala adesso', valore: n(c?.presenti), inCaricamento: isLoading },
          { etichetta: 'ingressi oggi', valore: n(c?.ingressi_oggi), inCaricamento: isLoading },
          { etichetta: 'accessi negati', valore: n(c?.negati_oggi), inCaricamento: isLoading },
          { etichetta: 'scadono in 7 giorni', valore: n(c?.scadenze_7), inCaricamento: isLoading },
        ]}
        actions={<><SelettoreSede /><BottoneScrittura variant="outline" onClick={() => setNuovo(true)}><UserPlus className="h-4 w-4" /> Nuovo socio</BottoneScrittura></>} />
      <NuovoSocioDialog open={nuovo} onOpenChange={setNuovo} />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-title text-foreground"><DoorOpen className="h-4 w-4 text-primary-testo" /> Ingresso</h2>
          <form onSubmit={invia} className="flex flex-wrap items-end gap-3">
            <div className="min-w-56 flex-1 space-y-1.5"><Label htmlFor="rc-codice">Tessera, badge o QR</Label>
              <Input id="rc-codice" ref={campo} value={codice} onChange={(e) => setCodice(e.target.value)} autoFocus autoComplete="off"
                placeholder="Passa la tessera o scrivi il codice" className="font-mono" /></div>
            <div className="w-32 space-y-1.5"><Label>Come</Label>
              <Select value={tipo} onValueChange={setTipo}><SelectTrigger aria-label="Tipo di ingresso"><SelectValue /></SelectTrigger>
                <SelectContent>{[['badge', 'Badge'], ['tessera', 'Tessera'], ['qr', 'QR'], ['app', 'App'], ['manuale', 'A mano']].map(([k, l]) =>
                  <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
            <div className="w-36 space-y-1.5"><Label>Servizio</Label>
              <Select value={servizio} onValueChange={setServizio}><SelectTrigger aria-label="Servizio"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(SERVIZIO).filter(([k]) => k !== 'pt').map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent></Select></div>
            <BottoneScrittura type="submit" disabled={!codice.trim() || ingresso.isPending}><QrCode className="h-4 w-4" /> Verifica e registra</BottoneScrittura>
          </form>
          <div className="mt-3 space-y-1.5"><Label htmlFor="rc-nome">Oppure dal nome</Label>
            <CercaSocio id="rc-nome" onScegli={(s) => registra(s.socio_id!, 'manuale')} /></div>

          {esito && (
            <div role="status" aria-live="polite"
              className={cn('mt-4 flex items-start gap-3 rounded-lg border p-4', esito.consentito ? 'border-success bg-success-tenue' : 'border-destructive bg-destructive-tenue')}>
              {esito.consentito ? <CircleCheck className="mt-0.5 h-6 w-6 shrink-0 text-success-testo" aria-hidden /> : <CircleX className="mt-0.5 h-6 w-6 shrink-0 text-destructive-testo" aria-hidden />}
              <div className="min-w-0 flex-1">
                <p className="text-title text-foreground">{esito.consentito ? 'Ingresso consentito' : 'Ingresso negato'}{esito.socio ? ` · ${esito.socio}` : ''}</p>
                <p className="text-sm text-foreground">{esito.motivo}</p>
              </div>
              {esito.socio_id && <Button asChild size="sm" variant="outline"><Link to={`/palestra/soci/${esito.socio_id}`}>Scheda</Link></Button>}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-title text-foreground"><TriangleAlert className="h-4 w-4 text-primary-testo" /> Da sistemare</h2>
          {isLoading ? <Skeleton className="h-24" /> : (
            <ul className="space-y-2 text-sm">
              {[
                [c?.rate_oggi, 'rate scadute da incassare', '/palestra/incassi'],
                [c?.morosi, 'soci morosi (accesso bloccato)', '/palestra/incassi'],
                [c?.certificati_30, 'certificati medici in scadenza entro 30 giorni', '/palestra/soci?stato=attivo'],
                [c?.scadenze_7, 'abbonamenti in scadenza entro 7 giorni', '/palestra/soci?vista=scadenze'],
                [c?.prove_oggi, 'prove e visite di oggi', '/palestra/prospect'],
                ...(isManager ? [[c?.sospensioni_da_autorizzare, 'sospensioni da autorizzare', '/palestra/soci?vista=sospensioni']] : []),
              ].filter(([v]) => Number(v) > 0).map(([v, l, to]) => (
                <li key={String(l)}><Link to={String(to)} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted">
                  <span className="text-foreground">{String(l)}</span><Badge tone="warning">{Number(v)}</Badge></Link></li>
              ))}
              {[c?.rate_oggi, c?.morosi, c?.certificati_30, c?.scadenze_7, c?.prove_oggi].every((v) => !v) && (
                <li className="py-2 text-muted-foreground">Niente in sospeso.</li>)}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-title text-foreground"><CalendarClock className="h-4 w-4 text-primary-testo" /> Lezioni di oggi</h2>
          {isLoading ? <Skeleton className="h-24" /> : (c?.lezioni_oggi.length ?? 0) === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">Nessuna lezione oggi.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {c!.lezioni_oggi.map((l) => (
                <li key={l.lezione_id}><Link to={`/palestra/corsi?lezione=${l.lezione_id}`} className="flex items-center gap-3 py-2 hover:text-primary-testo">
                  <span className="w-12 tabular-nums text-muted-foreground">{fmtOra(l.inizio)}</span>
                  <span className="min-w-0 flex-1 truncate font-medium text-foreground">{l.corso}</span>
                  <span className="tabular-nums text-muted-foreground">{l.iscritti}/{l.capienza}{l.in_attesa ? ` · ${l.in_attesa} in attesa` : ''}</span>
                  {l.stato === 'svolta' && <Badge tone="neutral">Svolta</Badge>}
                </Link></li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Oggi anche {c?.pt_oggi ?? 0} sessioni di personal training e {c?.wellness_oggi ?? 0} appuntamenti wellness.</p>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 text-title text-foreground"><DoorOpen className="h-4 w-4 text-primary-testo" /> In sala adesso</h2>
          {presenti.length === 0 ? <p className="py-2 text-sm text-muted-foreground">Nessuno in sala.</p> : (
            <ul className="divide-y divide-border text-sm">
              {presenti.map((p) => (
                <li key={p.socio_id} className="flex items-center gap-3 py-2">
                  <Link to={`/palestra/soci/${p.socio_id}`} className="min-w-0 flex-1 truncate font-medium text-foreground hover:text-primary-testo">{p.nome}</Link>
                  <span className="text-xs text-muted-foreground">dalle {fmtOra(p.ingresso_at)} · {SERVIZIO[p.servizio ?? ''] ?? p.servizio}</span>
                  <Button size="sm" variant="ghost" disabled={uscita.isPending}
                    onClick={() => uscita.mutate({ p_socio: p.socio_id! }, { onSuccess: () => toast.success(`${p.nome}: uscita registrata`), onError: (e) => toast.error(messaggioErrore(e)) })}>
                    <LogOut className="h-3.5 w-3.5" /> Uscita</Button>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted-foreground">Tornelli, lettori di badge e app del socio sono predisposti: usano la stessa verifica.</p>
        </Card>
      </div>
    </div>
  )
}
