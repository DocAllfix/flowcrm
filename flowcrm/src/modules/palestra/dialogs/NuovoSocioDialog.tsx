/**
 * Iscrizione (documento Palestra §1): il cliente (anche già in anagrafica)
 * diventa socio, con contatto d'emergenza, tessera, certificato, firme e
 * consensi; se si vende subito l'abbonamento, nascono anche le rate.
 */
import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { CercaContatto, type ContattoScelto } from '@/components/condivisi/CercaContatto'
import { supabase } from '@/lib/supabase'
import { useElenco, messaggioErrore } from '@/lib/queries/fondamenta'
import { usePalestra } from '@/modules/palestra/contesto'
import { CercaSocio } from '@/modules/palestra/componenti/CercaSocio'
import { useCatalogoPalestra, type Convenzione, type SocioStato } from '@/modules/palestra/queries'
import { METODO, fmtEuro } from '@/modules/palestra/stati'

const NESSUNA = 'nessuna'
const oNull = (v: string) => (v.trim() ? v.trim() : null)

export function NuovoSocioDialog({ open, onOpenChange, contattoIniziale }: {
  open: boolean; onOpenChange: (o: boolean) => void
  /** Il prospect che si iscrive: già scelto. */
  contattoIniziale?: ContattoScelto | null
}) {
  const { sedeId, sede } = usePalestra()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { formule } = useCatalogoPalestra(sedeId)
  const { data: convenzioni = [] } = useElenco<Convenzione & { organizzazioni: { ragione_sociale: string } | null }>('pal_convenzioni', {
    filtri: { attiva: true }, select: '*, organizzazioni(ragione_sociale)', abilitato: open,
  })
  const [nome, setNome] = useState('')
  const [contatto, setContatto] = useState<ContattoScelto | null>(null)
  const [presentatore, setPresentatore] = useState<SocioStato | null>(null)
  const vuoto = {
    cognome: '', email: '', telefono: '', nascita: '', emergenzaNome: '', emergenzaTel: '', badge: '', certificato: '',
    condizioni: false, salute: false, marketing: false, convenzione: NESSUNA, formula: NESSUNA, metodo: 'pos',
  }
  const [f, setF] = useState(vuoto)
  const [inCorso, setInCorso] = useState(false)
  useEffect(() => {
    if (!open) return
    setContatto(contattoIniziale ?? null)
    setNome(contattoIniziale ? `${contattoIniziale.nome} ${contattoIniziale.cognome ?? ''}`.trim() : '')
    setPresentatore(null); setF(vuoto)
  }, [open, contattoIniziale?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const formula = formule.find((x) => x.id === f.formula)

  async function crea(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { toast.error('Scrivi il nome'); return }
    setInCorso(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const io = auth.user!.id
      let contattoId = contatto?.id
      if (!contattoId) {
        const [n, ...resto] = nome.trim().split(/\s+/)
        const { data, error } = await supabase.from('contatti').insert({
          nome: n, cognome: oNull(f.cognome) ?? (resto.join(' ') || null), email: oNull(f.email), telefono: oNull(f.telefono),
          consenso_marketing: f.marketing, consenso_marketing_fonte: f.marketing ? `Iscrizione ${sede?.nome ?? 'palestra'}` : null, created_by: io,
        }).select('id').single()
        if (error) throw error
        contattoId = data.id
      } else if (f.marketing) {
        await supabase.from('contatti').update({ consenso_marketing: true, consenso_marketing_fonte: `Iscrizione ${sede?.nome ?? 'palestra'}` }).eq('id', contattoId)
      }
      const { data: socio, error: e2 } = await supabase.from('pal_soci').insert({
        contatto_id: contattoId, sede_id: sedeId!, data_nascita: oNull(f.nascita), emergenza_nome: oNull(f.emergenzaNome),
        emergenza_telefono: oNull(f.emergenzaTel), badge: oNull(f.badge), certificato_scadenza: oNull(f.certificato),
        condizioni_accettate: f.condizioni, consenso_salute: f.salute, convenzione_id: f.convenzione === NESSUNA ? null : f.convenzione,
        presentato_da: presentatore?.socio_id ?? null, created_by: io,
      }).select('id, codice').single()
      if (e2) throw e2
      if (formula) {
        const { error: e3 } = await supabase.from('pal_abbonamenti').insert({
          socio_id: socio.id, formula_id: formula.id, metodo_pagamento: f.metodo as 'pos', created_by: io })
        if (e3) throw e3
      }
      await qc.invalidateQueries({ queryKey: ['fond'] })
      toast.success(`Socio ${socio.codice} iscritto${formula ? `: ${formula.nome}, rate da incassare nella scheda` : ''}`)
      onOpenChange(false)
      navigate(`/palestra/soci/${socio.id}`)
    } catch (err) {
      toast.error(/23505/.test(JSON.stringify(err)) ? 'Questo cliente è già socio, oppure la tessera è già assegnata' : messaggioErrore(err))
    } finally {
      setInCorso(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuovo socio</DialogTitle>
          <DialogDescription>Chi è già in anagrafica si ritrova scrivendo il nome; il resto si completa poi nella scheda.</DialogDescription>
        </DialogHeader>
        <form onSubmit={crea} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ns-nome">Nome e cognome *</Label>
            <CercaContatto id="ns-nome" valore={nome} contattoId={contatto?.id ?? null} segnaposto="Cerca in anagrafica o scrivi il nome"
              onTesto={(v) => { setNome(v); setContatto(null) }}
              onScegli={(c) => { setContatto(c); setNome(`${c.nome} ${c.cognome ?? ''}`.trim()); setF({ ...f, email: c.email ?? '', telefono: c.telefono ?? '' }) }} /></div>
          {!contatto && <>
            <div className="space-y-1.5"><Label htmlFor="ns-email">Email</Label><Input id="ns-email" type="email" value={f.email} onChange={set('email')} /></div>
            <div className="space-y-1.5"><Label htmlFor="ns-tel">Telefono</Label><Input id="ns-tel" type="tel" value={f.telefono} onChange={set('telefono')} /></div>
          </>}
          <div className="space-y-1.5"><Label htmlFor="ns-nascita">Data di nascita</Label><Input id="ns-nascita" type="date" value={f.nascita} onChange={set('nascita')} /></div>
          <div className="space-y-1.5"><Label htmlFor="ns-badge">Tessera o badge</Label><Input id="ns-badge" value={f.badge} onChange={set('badge')} className="font-mono" placeholder="Facoltativo: c'è anche il QR" /></div>
          <div className="space-y-1.5"><Label htmlFor="ns-emn">Contatto d'emergenza</Label><Input id="ns-emn" value={f.emergenzaNome} onChange={set('emergenzaNome')} placeholder="Nome" /></div>
          <div className="space-y-1.5"><Label htmlFor="ns-emt">Telefono d'emergenza</Label><Input id="ns-emt" type="tel" value={f.emergenzaTel} onChange={set('emergenzaTel')} /></div>
          <div className="space-y-1.5"><Label htmlFor="ns-cert">Certificato medico valido fino al</Label>
            <Input id="ns-cert" type="date" value={f.certificato} onChange={set('certificato')} /></div>
          <div className="space-y-1.5"><Label>Convenzione aziendale</Label>
            <Select value={f.convenzione} onValueChange={(v) => setF({ ...f, convenzione: v })}>
              <SelectTrigger aria-label="Convenzione aziendale"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={NESSUNA}>Nessuna</SelectItem>
                {convenzioni.map((c) => <SelectItem key={c.id} value={c.id}>{c.organizzazioni?.ragione_sociale ?? c.nome}{Number(c.sconto_pct) ? ` · −${Number(c.sconto_pct)}%` : ''}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="ns-amico">Presentato da (porta un amico)</Label>
            {presentatore ? (
              <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
                <span className="text-foreground">{presentatore.nome} <span className="font-mono text-xs text-muted-foreground">{presentatore.codice}</span></span>
                <Button type="button" size="sm" variant="ghost" onClick={() => setPresentatore(null)}>Togli</Button></div>
            ) : <CercaSocio id="ns-amico" onScegli={setPresentatore} segnaposto="Facoltativo: il socio che l'ha portato" />}</div>

          <div className="space-y-2 rounded-lg border border-border p-3 text-sm sm:col-span-2">
            <label className="flex items-start gap-2 text-foreground"><Checkbox checked={f.condizioni} onCheckedChange={(v) => setF({ ...f, condizioni: v === true })} className="mt-0.5" />
              Ha firmato le condizioni d'iscrizione e il regolamento (senza firma l'ingresso è negato)</label>
            <label className="flex items-start gap-2 text-foreground"><Checkbox checked={f.salute} onCheckedChange={(v) => setF({ ...f, salute: v === true })} className="mt-0.5" />
              Consenso al trattamento dei dati sulla salute (misure, progressi, valutazioni: li vede solo il suo trainer)</label>
            <label className="flex items-start gap-2 text-foreground"><Checkbox checked={f.marketing} onCheckedChange={(v) => setF({ ...f, marketing: v === true })} className="mt-0.5" />
              Consenso a ricevere offerte e novità</label>
          </div>

          <div className="space-y-1.5"><Label>Abbonamento da vendere ora</Label>
            <Select value={f.formula} onValueChange={(v) => setF({ ...f, formula: v })}>
              <SelectTrigger aria-label="Formula"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={NESSUNA}>Più tardi</SelectItem>
                {formule.map((x) => <SelectItem key={x.id} value={x.id}>{x.nome} · {fmtEuro(x.prezzo)}</SelectItem>)}</SelectContent>
            </Select></div>
          {formula && (
            <div className="space-y-1.5"><Label>Pagamento</Label>
              <Select value={f.metodo} onValueChange={(v) => setF({ ...f, metodo: v })}>
                <SelectTrigger aria-label="Metodo di pagamento"><SelectValue /></SelectTrigger>
                <SelectContent>{['contanti', 'pos', 'carta', 'bonifico', 'addebito_ricorrente'].map((k) => <SelectItem key={k} value={k}>{METODO[k]}</SelectItem>)}</SelectContent>
              </Select></div>
          )}
          {formula && (
            <p className="text-xs text-muted-foreground sm:col-span-2">
              {formula.rate > 1 ? `${formula.rate} rate mensili` : 'Un\'unica rata'}{Number(formula.quota_iscrizione) > 0 ? `, più ${fmtEuro(formula.quota_iscrizione)} d'iscrizione sulla prima` : ''}.
              {f.convenzione !== NESSUNA ? ' Lo sconto e la quota dell\'azienda li applica la convenzione.' : ''}
            </p>
          )}
          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <BottoneScrittura type="submit" disabled={inCorso}>{inCorso ? 'Iscrizione…' : 'Iscrivi'}</BottoneScrittura>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
