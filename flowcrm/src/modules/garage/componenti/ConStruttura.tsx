/**
 * Selettore della struttura (chi gestisce più autorimesse) e guardia delle
 * pagine: senza strutture propone la configurazione guidata — piani, posti
 * auto, moto ed elettrici, tariffa oraria con notte e tetto giornaliero —
 * che poi si cambia da «Struttura e tariffe».
 */
import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Warehouse } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { messaggioErrore } from '@/lib/queries/fondamenta'
import { useGarage } from '@/modules/garage/contesto'
import { STRUTTURA_TIPO, numero } from '@/modules/garage/stati'

export function SelettoreStruttura() {
  const { strutture, strutturaId, scegliStruttura } = useGarage()
  if (strutture.length < 2) return null
  return (
    <Select value={strutturaId ?? undefined} onValueChange={scegliStruttura}>
      <SelectTrigger className="w-56" aria-label="Struttura">
        <Warehouse className="h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="Struttura" />
      </SelectTrigger>
      <SelectContent>{strutture.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
    </Select>
  )
}

export function ConStruttura({ children }: { children: ReactNode }) {
  const { struttura, caricamento } = useGarage()
  const { isManager } = useAuth()
  const [apri, setApri] = useState(false)
  if (caricamento) return <div className="flex justify-center py-20"><Spinner etichetta="Caricamento in corso" dimensione="lg" /></div>
  if (!struttura) {
    return (
      <>
        <EmptyState icon={Warehouse} title="Autorimessa da configurare"
          description={isManager
            ? 'Bastano il nome, i piani e quanti posti ci sono: la mappa e una tariffa oraria di partenza le prepariamo noi, poi si cambiano quando vuoi.'
            : 'La direzione deve prima configurare l\'autorimessa.'}
          action={isManager ? <BottoneScrittura onClick={() => setApri(true)}>Configura l'autorimessa</BottoneScrittura> : undefined} filtrato={!isManager} />
        <ConfiguraStrutturaDialog open={apri} onOpenChange={setApri} />
      </>
    )
  }
  return <>{children}</>
}

/** Codice del posto: piano e numero («P1-07»; il piano terra è P0, gli interrati S1, S2…). */
export const codicePosto = (piano: number, n: number) => `${piano < 0 ? `S${-piano}` : `P${piano}`}-${String(n).padStart(2, '0')}`

export function ConfiguraStrutturaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { scegliStruttura } = useGarage()
  const qc = useQueryClient()
  const [f, setF] = useState({ nome: '', tipologia: 'autorimessa', indirizzo: '', comune: '', piani: '1', auto: '20', moto: '4', elettrici: '2',
    oraria: '2', notte: '8', tetto: '20', mensile: '120' })
  const [inCorso, setInCorso] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  async function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.nome.trim()) { toast.error('Dai un nome all\'autorimessa'); return }
    const piani = Math.max(1, Math.round(numero(f.piani)))
    setInCorso(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const io = auth.user!.id
      const { data: s, error: e1 } = await supabase.from('gar_strutture').insert({
        nome: f.nome.trim(), tipologia: f.tipologia, indirizzo: f.indirizzo.trim() || null, comune: f.comune.trim() || null, piani,
        orari: [], modalita_accesso: ['manuale', 'targa'], created_by: io }).select().single()
      if (e1) throw e1
      try {
        // I posti auto si dividono tra i piani; moto ed elettrici al piano terra.
        const auto = Math.max(0, Math.round(numero(f.auto)))
        const posti: { codice: string; piano: number; numero: number; tipo: string; canone: number | null }[] = []
        const perPiano = Math.ceil(auto / piani)
        let fatti = 0
        for (let p = 0; p < piani && fatti < auto; p++) {
          for (let n = 1; n <= perPiano && fatti < auto; n++, fatti++) posti.push({ codice: codicePosto(p, n), piano: p, numero: n, tipo: 'auto', canone: numero(f.mensile) || null })
        }
        const base = posti.filter((x) => x.piano === 0).length
        for (let i = 1; i <= Math.round(numero(f.elettrici)); i++) posti.push({ codice: codicePosto(0, base + i), piano: 0, numero: base + i, tipo: 'elettrico', canone: numero(f.mensile) || null })
        for (let i = 1; i <= Math.round(numero(f.moto)); i++) posti.push({ codice: `M-${String(i).padStart(2, '0')}`, piano: 0, numero: i, tipo: 'moto', canone: null })
        if (posti.length) {
          const { error } = await supabase.from('gar_posti').insert(posti.map((x) => ({ ...x, struttura_id: s.id, zona: x.tipo === 'moto' ? 'Moto' : null, created_by: io })))
          if (error) throw error
        }
        const { error: e3 } = await supabase.from('gar_tariffari').insert([
          { struttura_id: s.id, nome: 'Tariffa oraria', prezzo_frazione: numero(f.oraria), frazione_min: 60, franchigia_min: 10,
            notte_dalle: numero(f.notte) ? '22:00' : null, notte_alle: numero(f.notte) ? '07:00' : null, prezzo_notte: numero(f.notte) || null,
            tetto_giornaliero: numero(f.tetto) || null, mensile: numero(f.mensile) || null, created_by: io },
          { struttura_id: s.id, nome: 'Moto', tipo_veicolo: 'moto', prezzo_frazione: Math.round(numero(f.oraria) * 50) / 100, frazione_min: 60, franchigia_min: 10,
            notte_dalle: null, notte_alle: null, prezzo_notte: null, tetto_giornaliero: numero(f.tetto) ? Math.round(numero(f.tetto) * 50) / 100 : null, mensile: null, created_by: io },
        ])
        if (e3) throw e3
      } catch (err) {
        await supabase.from('gar_strutture').delete().eq('id', s.id)
        throw err
      }
      await qc.invalidateQueries({ queryKey: ['fond'] })
      scegliStruttura(s.id)
      toast.success(`${s.nome} è pronta: posti sulla mappa e tariffa oraria`)
      onOpenChange(false)
    } catch (err) {
      toast.error(messaggioErrore(err))
    } finally {
      setInCorso(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configura l'autorimessa</DialogTitle>
          <DialogDescription>Posti, zone, tariffe e colonnine si cambiano poi da «Struttura e tariffe».</DialogDescription>
        </DialogHeader>
        <form onSubmit={crea} className="grid grid-cols-6 gap-3">
          <div className="col-span-6 space-y-1.5 sm:col-span-4"><Label htmlFor="gs-nome">Nome *</Label>
            <Input id="gs-nome" value={f.nome} onChange={set('nome')} required autoFocus placeholder="Autorimessa Centrale" /></div>
          <div className="col-span-6 space-y-1.5 sm:col-span-2"><Label htmlFor="gs-tipo">Tipologia</Label>
            <Select value={f.tipologia} onValueChange={(v) => setF({ ...f, tipologia: v })}>
              <SelectTrigger id="gs-tipo"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(STRUTTURA_TIPO).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent>
            </Select></div>
          <div className="col-span-6 space-y-1.5 sm:col-span-4"><Label htmlFor="gs-ind">Indirizzo</Label><Input id="gs-ind" value={f.indirizzo} onChange={set('indirizzo')} /></div>
          <div className="col-span-6 space-y-1.5 sm:col-span-2"><Label htmlFor="gs-com">Comune</Label><Input id="gs-com" value={f.comune} onChange={set('comune')} /></div>
          <fieldset className="col-span-6 grid grid-cols-4 gap-3">
            <legend className="col-span-4 mb-1 text-sm font-medium text-foreground">Posti</legend>
            <div className="space-y-1.5"><Label htmlFor="gs-piani">Piani</Label><Input id="gs-piani" inputMode="numeric" value={f.piani} onChange={set('piani')} /></div>
            <div className="space-y-1.5"><Label htmlFor="gs-auto">Auto</Label><Input id="gs-auto" inputMode="numeric" value={f.auto} onChange={set('auto')} /></div>
            <div className="space-y-1.5"><Label htmlFor="gs-moto">Moto</Label><Input id="gs-moto" inputMode="numeric" value={f.moto} onChange={set('moto')} /></div>
            <div className="space-y-1.5"><Label htmlFor="gs-el">Con ricarica</Label><Input id="gs-el" inputMode="numeric" value={f.elettrici} onChange={set('elettrici')} /></div>
          </fieldset>
          <fieldset className="col-span-6 grid grid-cols-4 gap-3">
            <legend className="col-span-4 mb-1 text-sm font-medium text-foreground">Tariffe di partenza (€)</legend>
            <div className="space-y-1.5"><Label htmlFor="gs-ora">All'ora</Label><Input id="gs-ora" inputMode="decimal" value={f.oraria} onChange={set('oraria')} /></div>
            <div className="space-y-1.5"><Label htmlFor="gs-notte">Notte (22–7)</Label><Input id="gs-notte" inputMode="decimal" value={f.notte} onChange={set('notte')} /></div>
            <div className="space-y-1.5"><Label htmlFor="gs-tetto">Massimo al giorno</Label><Input id="gs-tetto" inputMode="decimal" value={f.tetto} onChange={set('tetto')} /></div>
            <div className="space-y-1.5"><Label htmlFor="gs-mese">Abbonamento al mese</Label><Input id="gs-mese" inputMode="decimal" value={f.mensile} onChange={set('mensile')} /></div>
          </fieldset>
          <DialogFooter className="col-span-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <BottoneScrittura type="submit" disabled={inCorso}>{inCorso ? 'Creazione…' : 'Crea l\'autorimessa'}</BottoneScrittura>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
