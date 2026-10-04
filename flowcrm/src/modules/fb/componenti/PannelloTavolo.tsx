/**
 * Pannello accanto alla mappa: ciò che si fa con il tavolo scelto, in
 * linea e senza finestre modali. In servizio: aprire o raggiungere la
 * comanda, conto richiesto, cambio tavolo, cameriere, fuori servizio. In
 * disposizione (direzione): numero, posti, forma e misure.
 */
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowRightLeft, ClipboardList, Receipt, Trash2, Users, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useUsers } from '@/lib/queries/users'
import { useSalva, useElimina, messaggioErrore } from '@/lib/queries/fondamenta'
import { useFb } from '@/modules/fb/contesto'
import { TAVOLO_STATO, fmtEuro, fmtOra, minutiDa } from '@/modules/fb/stati'
import { useSaldoConto, TABELLE_SERVIZIO, type TavoloStato } from '@/modules/fb/queries'

interface Props {
  tavolo: TavoloStato
  tavoli: TavoloStato[]
  disposizione: boolean
  onChiudi: () => void
}

export function PannelloTavolo({ tavolo, tavoli, disposizione, onChiudi }: Props) {
  const st = TAVOLO_STATO[tavolo.stato ?? 'libero'] ?? TAVOLO_STATO.libero
  return (
    <aside className="rounded-xl border border-border bg-card p-5" aria-label={`Tavolo ${tavolo.numero}`}>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2 className="text-title text-foreground">Tavolo {tavolo.numero}</h2>
          <p className="text-sm text-muted-foreground">{tavolo.posti} posti{tavolo.posti_max ? ` (fino a ${tavolo.posti_max})` : ''}</p>
        </div>
        <div className="flex items-center gap-1">
          <Badge tone={st.tone}>{st.label}</Badge>
          <Button variant="ghost" size="icon" onClick={onChiudi} aria-label="Chiudi il pannello"><X className="h-4 w-4" /></Button>
        </div>
      </div>
      {disposizione ? <ModificaTavolo tavolo={tavolo} onChiudi={onChiudi} /> : <ServizioTavolo tavolo={tavolo} tavoli={tavoli} />}
    </aside>
  )
}

function ServizioTavolo({ tavolo, tavoli }: { tavolo: TavoloStato; tavoli: TavoloStato[] }) {
  const navigate = useNavigate()
  const { base, localeId } = useFb()
  const { data: utenti = [] } = useUsers()
  const salvaComanda = useSalva('fb_comande', TABELLE_SERVIZIO)
  const salvaTavolo = useSalva('fb_tavoli', ['fb_tavoli_stato'])
  const { data: saldo } = useSaldoConto(tavolo.conto_id)
  const [coperti, setCoperti] = useState(String(tavolo.prenotazione_persone ?? tavolo.posti ?? 2))
  const [nuovoTavolo, setNuovoTavolo] = useState('')
  useEffect(() => { setCoperti(String(tavolo.prenotazione_persone ?? tavolo.posti ?? 2)) }, [tavolo.tavolo_id, tavolo.prenotazione_persone, tavolo.posti])

  const liberi = tavoli.filter((t) => t.stato === 'libero' && t.tavolo_id !== tavolo.tavolo_id)

  async function apri() {
    try {
      const c = await salvaComanda.mutateAsync({ values: {
        locale_id: localeId!, tavolo_id: tavolo.tavolo_id, coperti: Number(coperti) || null,
        prenotazione_id: tavolo.prenotazione_id ?? null, canale: 'sala', modulo: tavolo.modulo!,
      } })
      navigate(`${base}/comande/${c.id}`)
    } catch (e) { toast.error(messaggioErrore(e)) }
  }

  async function cambia() {
    if (!nuovoTavolo || !tavolo.comanda_id) return
    try {
      await salvaComanda.mutateAsync({ id: tavolo.comanda_id, values: { tavolo_id: nuovoTavolo } })
      toast.success('Tavolo cambiato')
      setNuovoTavolo('')
    } catch (e) { toast.error(messaggioErrore(e)) }
  }

  return (
    <div className="space-y-5">
      {tavolo.prenotazione_id && (
        <div className="rounded-lg bg-info-tenue px-3 py-2 text-sm text-info-testo">
          Prenotato da <strong>{tavolo.prenotazione_nome}</strong> alle {fmtOra(tavolo.prenotazione_inizio)},
          {' '}{tavolo.prenotazione_persone} persone
        </div>
      )}

      {tavolo.comanda_id ? (
        <div className="space-y-3">
          <dl className="grid grid-cols-3 gap-2 text-sm">
            <div><dt className="text-muted-foreground">Coperti</dt><dd className="font-medium tabular-nums">{tavolo.coperti ?? '—'}</dd></div>
            <div><dt className="text-muted-foreground">Da</dt><dd className="font-medium tabular-nums">{minutiDa(tavolo.aperta_at)} min</dd></div>
            <div><dt className="text-muted-foreground">Conto</dt><dd className="font-medium tabular-nums">{saldo ? fmtEuro(saldo.totale) : '—'}</dd></div>
          </dl>
          <Button className="w-full" onClick={() => navigate(`${base}/comande/${tavolo.comanda_id}`)}>
            <ClipboardList className="h-4 w-4" /> Apri la comanda
          </Button>
          <BottoneScrittura variant="outline" className="w-full"
            onClick={() => salvaComanda.mutate({ id: tavolo.comanda_id!, values: {
              conto_richiesto_at: tavolo.conto_richiesto_at ? null : new Date().toISOString() } },
              { onError: (e) => toast.error(messaggioErrore(e)) })}>
            <Receipt className="h-4 w-4" /> {tavolo.conto_richiesto_at ? 'Annulla la richiesta del conto' : 'Il tavolo chiede il conto'}
          </BottoneScrittura>
          <div className="space-y-1.5">
            <Label>Cambia tavolo</Label>
            <div className="flex gap-2">
              <Select value={nuovoTavolo} onValueChange={setNuovoTavolo}>
                <SelectTrigger aria-label="Nuovo tavolo"><SelectValue placeholder={liberi.length ? 'Tavolo libero…' : 'Nessun tavolo libero'} /></SelectTrigger>
                <SelectContent>
                  {liberi.map((t) => <SelectItem key={t.tavolo_id} value={t.tavolo_id!}>Tavolo {t.numero} · {t.posti} posti</SelectItem>)}
                </SelectContent>
              </Select>
              <BottoneScrittura variant="outline" size="icon" onClick={cambia} disabled={!nuovoTavolo} aria-label="Sposta la comanda">
                <ArrowRightLeft className="h-4 w-4" />
              </BottoneScrittura>
            </div>
          </div>
        </div>
      ) : tavolo.stato !== 'chiuso' ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="pt-coperti">Coperti</Label>
            <Input id="pt-coperti" type="number" min={1} value={coperti} onChange={(e) => setCoperti(e.target.value)} />
          </div>
          <BottoneScrittura className="w-full" onClick={apri} disabled={salvaComanda.isPending}>
            <Users className="h-4 w-4" /> {tavolo.prenotazione_id ? 'Fai accomodare e apri la comanda' : 'Apri la comanda'}
          </BottoneScrittura>
        </div>
      ) : null}

      <div className="space-y-3 border-t border-border pt-4">
        <div className="space-y-1.5">
          <Label>Cameriere</Label>
          <Select value={tavolo.cameriere_id ?? 'nessuno'}
            onValueChange={(v) => salvaTavolo.mutate({ id: tavolo.tavolo_id!, values: { cameriere_id: v === 'nessuno' ? null : v } },
              { onError: (e) => toast.error(messaggioErrore(e)) })}>
            <SelectTrigger aria-label="Cameriere assegnato"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="nessuno">Nessuno</SelectItem>
              {utenti.filter((u) => u.attivo).map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.nome} {u.cognome ?? ''}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Fuori servizio</span>
          <Switch checked={tavolo.stato === 'chiuso'} disabled={!!tavolo.comanda_id}
            onCheckedChange={(v) => salvaTavolo.mutate({ id: tavolo.tavolo_id!, values: { fuori_servizio: v } },
              { onError: (e) => toast.error(messaggioErrore(e)) })} />
        </label>
      </div>
    </div>
  )
}

function ModificaTavolo({ tavolo, onChiudi }: { tavolo: TavoloStato; onChiudi: () => void }) {
  const salva = useSalva('fb_tavoli', ['fb_tavoli_stato'])
  const elimina = useElimina('fb_tavoli', ['fb_tavoli_stato'])
  const [v, setV] = useState({ numero: '', posti: '', posti_max: '', forma: 'quadrato', larghezza: '', altezza: '', rotazione: '' })
  useEffect(() => {
    setV({ numero: tavolo.numero ?? '', posti: String(tavolo.posti ?? 2), posti_max: tavolo.posti_max ? String(tavolo.posti_max) : '',
      forma: tavolo.forma ?? 'quadrato', larghezza: String(tavolo.larghezza ?? 80), altezza: String(tavolo.altezza ?? 80),
      rotazione: String(tavolo.rotazione ?? 0) })
  }, [tavolo])

  async function salvaModifiche() {
    try {
      await salva.mutateAsync({ id: tavolo.tavolo_id!, values: {
        numero: v.numero.trim(), posti: Number(v.posti), posti_max: v.posti_max ? Number(v.posti_max) : null,
        forma: v.forma, larghezza: Number(v.larghezza), altezza: Number(v.altezza), rotazione: Number(v.rotazione),
      } })
      toast.success('Tavolo aggiornato')
    } catch (e) { toast.error(messaggioErrore(e)) }
  }
  async function togli() {
    try {
      await elimina.mutateAsync(tavolo.tavolo_id!)
      toast.success('Tavolo tolto dalla sala')
      onChiudi()
    } catch {
      // Ha uno storico di comande: si disattiva invece di cancellarlo.
      await salva.mutateAsync({ id: tavolo.tavolo_id!, values: { attivo: false } })
      toast.success('Il tavolo ha uno storico: è stato disattivato')
      onChiudi()
    }
  }

  const campo = (k: keyof typeof v, etichetta: string, tipo = 'number') => (
    <div className="space-y-1.5">
      <Label htmlFor={`mt-${k}`}>{etichetta}</Label>
      <Input id={`mt-${k}`} type={tipo} value={v[k]} onChange={(e) => setV({ ...v, [k]: e.target.value })} />
    </div>
  )
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        {campo('numero', 'Numero', 'text')}
        <div className="space-y-1.5">
          <Label>Forma</Label>
          <Select value={v.forma} onValueChange={(f) => setV({ ...v, forma: f })}>
            <SelectTrigger aria-label="Forma"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="quadrato">Quadrato</SelectItem>
              <SelectItem value="rotondo">Rotondo</SelectItem>
              <SelectItem value="rettangolare">Rettangolare</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {campo('posti', 'Posti')}
        {campo('posti_max', 'Posti massimi')}
        {campo('larghezza', 'Larghezza')}
        {campo('altezza', 'Altezza')}
        {campo('rotazione', 'Rotazione (gradi)')}
      </div>
      <p className="text-xs text-muted-foreground">Trascina il tavolo sulla mappa, oppure selezionalo e usa le frecce (Maiusc per passi lunghi).</p>
      <div className="flex gap-2">
        <BottoneScrittura className="flex-1" onClick={salvaModifiche} disabled={salva.isPending}>Salva</BottoneScrittura>
        <BottoneScrittura variant="outline" onClick={togli} aria-label="Togli il tavolo"><Trash2 className="h-4 w-4" /></BottoneScrittura>
      </div>
    </div>
  )
}
