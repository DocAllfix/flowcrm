/**
 * Registrazione di un ospite del soggiorno (documento Hotel §5, §14, §34):
 * anagrafica, documento e dati per Alloggiati Web, residenza per l'ISTAT,
 * tipo alloggiato ed eventuale esenzione dalla tassa di soggiorno.
 */
import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { CercaContatto, type ContattoScelto } from '@/components/condivisi/CercaContatto'
import { supabase } from '@/lib/supabase'
import { messaggioErrore } from '@/lib/queries/fondamenta'
import { DOCUMENTO_TIPO, TIPO_ALLOGGIATO } from '@/modules/hotel/stati'
import type { Ospite } from '@/modules/hotel/queries'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  prenotazioneId: string
  /** Primo ospite registrato: di solito capofamiglia o ospite singolo. */
  primo: boolean
  esenzioni: string[]
  /** Nome scritto sulla prenotazione: proposto per il primo ospite. */
  nomePrenotazione?: string
}

const VUOTO = 'nessuno'

export function OspiteDialog({ open, onOpenChange, prenotazioneId, primo, esenzioni, nomePrenotazione }: Props) {
  const qc = useQueryClient()
  const [nome, setNome] = useState('')
  const [contatto, setContatto] = useState<ContattoScelto | null>(null)
  const [f, setF] = useState({
    cognome: '', sesso: '', nascita: '', comune: '', codComune: '', provincia: '', stato: 'Italia', codStato: '100000100',
    cittadinanza: 'Italia', codCittadinanza: '100000100', docTipo: 'IDENT', docNumero: '', docLuogo: '', codDocLuogo: '', docScadenza: '',
    resComune: '', resProvincia: '', resStato: 'Italia', tipo: primo ? '16' : '19', esenzione: VUOTO, vip: false, preferenze: '', allergie: '',
  })
  const [inCorso, setInCorso] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  useEffect(() => {
    if (!open) return
    // Il primo ospite è di solito chi ha prenotato: nome e cognome già scritti.
    const [n = '', ...resto] = primo && nomePrenotazione ? nomePrenotazione.trim().split(/\s+/) : []
    setNome(n); setContatto(null)
    setF((x) => ({ ...x, cognome: resto.join(' '), tipo: primo ? '16' : '19', docNumero: '' }))
  }, [open, primo, nomePrenotazione])

  // Ospite già noto: si riprendono i suoi dati di registrazione.
  useEffect(() => {
    if (!contatto) return
    supabase.from('hotel_ospiti').select('*').eq('contatto_id', contatto.id).maybeSingle().then(({ data }) => {
      const o = data as Ospite | null
      setF((x) => ({
        ...x, cognome: contatto.cognome ?? '', sesso: o?.sesso ?? x.sesso, nascita: o?.data_nascita ?? '', comune: o?.comune_nascita ?? '',
        codComune: o?.codice_comune_nascita ?? '', provincia: o?.provincia_nascita ?? '', stato: o?.stato_nascita ?? x.stato,
        codStato: o?.codice_stato_nascita ?? x.codStato, cittadinanza: o?.cittadinanza ?? x.cittadinanza,
        codCittadinanza: o?.codice_cittadinanza ?? x.codCittadinanza, docTipo: o?.documento_tipo ?? x.docTipo, docNumero: o?.documento_numero ?? '',
        docLuogo: o?.documento_luogo ?? '', codDocLuogo: o?.codice_luogo_documento ?? '', docScadenza: o?.documento_scadenza ?? '',
        resComune: o?.residenza_comune ?? '', resProvincia: o?.residenza_provincia ?? '', resStato: o?.residenza_stato ?? x.resStato,
        vip: o?.vip ?? false, preferenze: o?.preferenze ?? '', allergie: o?.allergie ?? '',
      }))
    })
  }, [contatto])

  const conDocumento = ['16', '17', '18'].includes(f.tipo)

  async function registra(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { toast.error('Scrivi il nome'); return }
    if (conDocumento && (!f.docTipo || !f.docNumero.trim())) { toast.error('Per questo ospite serve il documento'); return }
    setInCorso(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const io = auth.user!.id
      let contattoId = contatto?.id
      if (!contattoId) {
        const [n, ...resto] = nome.trim().split(/\s+/)
        const { data, error } = await supabase.from('contatti')
          .insert({ nome: n, cognome: f.cognome.trim() || resto.join(' ') || null, created_by: io }).select('id').single()
        if (error) throw error
        contattoId = data.id
      }
      const dati = {
        contatto_id: contattoId, sesso: f.sesso || null, data_nascita: f.nascita || null, comune_nascita: f.comune || null,
        codice_comune_nascita: f.codComune || null, provincia_nascita: f.provincia || null, stato_nascita: f.stato || null,
        codice_stato_nascita: f.codStato || null, cittadinanza: f.cittadinanza || null, codice_cittadinanza: f.codCittadinanza || null,
        documento_tipo: conDocumento ? f.docTipo : null, documento_numero: conDocumento ? f.docNumero.trim().toUpperCase() : null,
        documento_luogo: conDocumento ? f.docLuogo || null : null, codice_luogo_documento: conDocumento ? f.codDocLuogo || null : null,
        documento_scadenza: conDocumento ? f.docScadenza || null : null, residenza_comune: f.resComune || null,
        residenza_provincia: f.resProvincia || null, residenza_stato: f.resStato || null, vip: f.vip,
        preferenze: f.preferenze || null, allergie: f.allergie || null,
      }
      const { data: esistente } = await supabase.from('hotel_ospiti').select('id').eq('contatto_id', contattoId).maybeSingle()
      let ospiteId = esistente?.id
      if (ospiteId) {
        const { error } = await supabase.from('hotel_ospiti').update({ ...dati, updated_by: io }).eq('id', ospiteId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('hotel_ospiti').insert({ ...dati, created_by: io }).select('id').single()
        if (error) throw error
        ospiteId = data.id
      }
      const { error: e3 } = await supabase.from('hotel_soggiorno_ospiti').insert({
        prenotazione_id: prenotazioneId, ospite_id: ospiteId, tipo_alloggiato: f.tipo,
        esenzione_tassa: f.esenzione === VUOTO ? null : f.esenzione, created_by: io })
      if (e3) throw e3
      await qc.invalidateQueries({ queryKey: ['fond'] })
      await qc.invalidateQueries({ queryKey: ['fond-rpc'] })
      toast.success(`Ospite registrato: ${[nome.trim(), f.cognome.trim()].filter(Boolean).join(' ')}`)
      onOpenChange(false)
    } catch (err) {
      toast.error(/23505/.test(JSON.stringify(err)) ? 'Questo ospite è già registrato nel soggiorno' : messaggioErrore(err))
    } finally { setInCorso(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registra un ospite</DialogTitle>
          <DialogDescription>I codici di comune, stato e cittadinanza sono quelli delle tabelle di Alloggiati Web.</DialogDescription>
        </DialogHeader>
        <form onSubmit={registra} className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="col-span-2 space-y-1.5"><Label htmlFor="og-nome">Nome *</Label>
            <CercaContatto id="og-nome" valore={nome} contattoId={contatto?.id ?? null} segnaposto="Nome, o cerca un ospite già venuto"
              onTesto={(v) => { setNome(v); setContatto(null) }} onScegli={(c) => { setContatto(c); setNome(c.nome) }} /></div>
          <div className="space-y-1.5"><Label htmlFor="og-cognome">Cognome</Label><Input id="og-cognome" value={f.cognome} onChange={set('cognome')} /></div>
          <div className="space-y-1.5"><Label>Tipo alloggiato</Label>
            <Select value={f.tipo} onValueChange={(v) => setF({ ...f, tipo: v })}>
              <SelectTrigger aria-label="Tipo alloggiato"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(TIPO_ALLOGGIATO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="space-y-1.5"><Label>Sesso</Label>
            <Select value={f.sesso || VUOTO} onValueChange={(v) => setF({ ...f, sesso: v === VUOTO ? '' : v })}>
              <SelectTrigger aria-label="Sesso"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value={VUOTO}>—</SelectItem><SelectItem value="M">Maschile</SelectItem><SelectItem value="F">Femminile</SelectItem></SelectContent>
            </Select></div>
          <div className="space-y-1.5"><Label htmlFor="og-nascita">Data di nascita</Label><Input id="og-nascita" type="date" value={f.nascita} onChange={set('nascita')} /></div>
          <div className="space-y-1.5"><Label htmlFor="og-comune">Comune di nascita</Label><Input id="og-comune" value={f.comune} onChange={set('comune')} /></div>
          <div className="space-y-1.5"><Label htmlFor="og-ccomune">Codice comune</Label><Input id="og-ccomune" value={f.codComune} onChange={set('codComune')} className="font-mono" /></div>
          <div className="space-y-1.5"><Label htmlFor="og-prov">Provincia</Label><Input id="og-prov" maxLength={2} value={f.provincia} onChange={set('provincia')} /></div>
          <div className="space-y-1.5"><Label htmlFor="og-stato">Stato di nascita</Label><Input id="og-stato" value={f.stato} onChange={set('stato')} /></div>
          <div className="space-y-1.5"><Label htmlFor="og-cstato">Codice stato</Label><Input id="og-cstato" value={f.codStato} onChange={set('codStato')} className="font-mono" /></div>
          <div className="space-y-1.5"><Label htmlFor="og-citt">Cittadinanza</Label><Input id="og-citt" value={f.cittadinanza} onChange={set('cittadinanza')} /></div>
          <div className="space-y-1.5"><Label htmlFor="og-ccitt">Codice cittadinanza</Label><Input id="og-ccitt" value={f.codCittadinanza} onChange={set('codCittadinanza')} className="font-mono" /></div>
          {conDocumento && (
            <>
              <div className="space-y-1.5"><Label>Documento *</Label>
                <Select value={f.docTipo} onValueChange={(v) => setF({ ...f, docTipo: v })}>
                  <SelectTrigger aria-label="Tipo di documento"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(DOCUMENTO_TIPO).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select></div>
              <div className="space-y-1.5"><Label htmlFor="og-doc">Numero *</Label><Input id="og-doc" value={f.docNumero} onChange={set('docNumero')} className="font-mono uppercase" /></div>
              <div className="space-y-1.5"><Label htmlFor="og-docs">Scadenza</Label><Input id="og-docs" type="date" value={f.docScadenza} onChange={set('docScadenza')} /></div>
              <div className="space-y-1.5"><Label htmlFor="og-docl">Rilasciato a</Label><Input id="og-docl" value={f.docLuogo} onChange={set('docLuogo')} /></div>
              <div className="space-y-1.5"><Label htmlFor="og-cdocl">Codice luogo di rilascio</Label><Input id="og-cdocl" value={f.codDocLuogo} onChange={set('codDocLuogo')} className="font-mono" /></div>
              <div />
            </>
          )}
          <div className="space-y-1.5"><Label htmlFor="og-rcom">Residenza: comune</Label><Input id="og-rcom" value={f.resComune} onChange={set('resComune')} /></div>
          <div className="space-y-1.5"><Label htmlFor="og-rprov">Provincia</Label><Input id="og-rprov" maxLength={2} value={f.resProvincia} onChange={set('resProvincia')} /></div>
          <div className="space-y-1.5"><Label htmlFor="og-rstato">Stato</Label><Input id="og-rstato" value={f.resStato} onChange={set('resStato')} /></div>
          <div className="space-y-1.5"><Label>Esenzione dalla tassa</Label>
            <Select value={f.esenzione} onValueChange={(v) => setF({ ...f, esenzione: v })}>
              <SelectTrigger aria-label="Esenzione dalla tassa di soggiorno"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={VUOTO}>Nessuna</SelectItem>
                {esenzioni.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                {!esenzioni.length && <SelectItem value="altro motivo previsto dal regolamento">Altro motivo del regolamento</SelectItem>}
              </SelectContent>
            </Select></div>
          <div className="col-span-2 space-y-1.5"><Label htmlFor="og-pref">Preferenze</Label><Input id="og-pref" value={f.preferenze} onChange={set('preferenze')} placeholder="Cuscino in piuma, piano alto…" /></div>
          <div className="space-y-1.5"><Label htmlFor="og-all">Allergie</Label><Input id="og-all" value={f.allergie} onChange={set('allergie')} /></div>
          <label className="flex items-center gap-2 text-sm text-foreground"><Switch checked={f.vip} onCheckedChange={(v) => setF({ ...f, vip: v })} aria-label="Ospite VIP" /> VIP</label>
          <DialogFooter className="col-span-2 sm:col-span-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <BottoneScrittura type="submit" disabled={inCorso}>{inCorso ? 'Registrazione…' : 'Registra'}</BottoneScrittura>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
