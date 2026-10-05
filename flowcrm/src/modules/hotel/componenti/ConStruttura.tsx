/**
 * Selettore della struttura (gruppi con più hotel) e guardia delle pagine:
 * senza strutture propone la configurazione guidata — camere per piano,
 * tipologie, trattamenti e i due piani tariffari di partenza.
 */
import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Hotel } from 'lucide-react'
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
import { useHotel } from '@/modules/hotel/contesto'

export function SelettoreStruttura() {
  const { strutture, strutturaId, scegliStruttura } = useHotel()
  if (strutture.length < 2) return null
  return (
    <Select value={strutturaId ?? undefined} onValueChange={scegliStruttura}>
      <SelectTrigger className="w-56" aria-label="Struttura">
        <Hotel className="h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="Struttura" />
      </SelectTrigger>
      <SelectContent>{strutture.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
    </Select>
  )
}

export function ConStruttura({ children }: { children: ReactNode }) {
  const { struttura, caricamento } = useHotel()
  const { isManager } = useAuth()
  const [apri, setApri] = useState(false)
  if (caricamento) {
    return <div className="flex justify-center py-20"><Spinner etichetta="Caricamento in corso" dimensione="lg" /></div>
  }
  if (!struttura) {
    return (
      <>
        <EmptyState icon={Hotel} title="Nessuna struttura configurata"
          description={isManager
            ? 'Crea l\'hotel con piani, camere e tipologie: tariffe e trattamenti di partenza li prepariamo noi, poi si cambiano quando vuoi.'
            : 'La direzione deve prima configurare la struttura.'}
          action={isManager ? <BottoneScrittura onClick={() => setApri(true)}>Configura la struttura</BottoneScrittura> : undefined} />
        <ConfiguraStrutturaDialog open={apri} onOpenChange={setApri} />
      </>
    )
  }
  return <>{children}</>
}

interface TipologiaBase { codice: string; nome: string; categoria: string; base: number; max: number; prezzo: number }
const TIPOLOGIE: TipologiaBase[] = [
  { codice: 'SGL', nome: 'Singola', categoria: 'singola', base: 1, max: 1, prezzo: 80 },
  { codice: 'DBL', nome: 'Doppia', categoria: 'doppia', base: 2, max: 3, prezzo: 120 },
  { codice: 'JS', nome: 'Junior suite', categoria: 'junior_suite', base: 2, max: 4, prezzo: 190 },
]
const TRATTAMENTI = [
  { codice: 'SO', nome: 'Solo pernottamento', colazione: false, pranzo: false, cena: false, supplemento_adulto: 0, supplemento_bambino: 0 },
  { codice: 'BB', nome: 'Bed & Breakfast', colazione: true, pranzo: false, cena: false, supplemento_adulto: 12, supplemento_bambino: 6 },
  { codice: 'HB', nome: 'Mezza pensione', colazione: true, pranzo: false, cena: true, supplemento_adulto: 35, supplemento_bambino: 18 },
  { codice: 'FB', nome: 'Pensione completa', colazione: true, pranzo: true, cena: true, supplemento_adulto: 55, supplemento_bambino: 28 },
]

function ConfiguraStrutturaDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { scegliStruttura } = useHotel()
  const qc = useQueryClient()
  const [f, setF] = useState({ nome: '', comune: '', categoria: '4 stelle', piani: '3', SGL: '4', DBL: '14', JS: '2' })
  const [inCorso, setInCorso] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  async function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.nome.trim()) { toast.error('Dai un nome alla struttura'); return }
    const piani = Math.max(1, Number(f.piani) || 1)
    setInCorso(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const io = auth.user!.id
      const { data: s, error: e1 } = await supabase.from('hotel_strutture')
        .insert({ nome: f.nome.trim(), comune: f.comune.trim() || null, categoria: f.categoria || null, piani, created_by: io }).select().single()
      if (e1) throw e1

      const scelte = TIPOLOGIE.filter((t) => Number(f[t.codice as 'SGL']) > 0)
      const { data: tip, error: e2 } = await supabase.from('hotel_tipologie').insert(scelte.map((t, i) => ({
        struttura_id: s.id, codice: t.codice, nome: t.nome, categoria: t.categoria, occupazione_base: t.base, occupazione_min: 1,
        occupazione_max: t.max, prezzo_base: t.prezzo, ordine: i, created_by: io,
      }))).select('id, codice')
      if (e2) throw e2

      // Camere distribuite piano per piano: 101, 102… 201, 202…
      const elenco = scelte.flatMap((t) => Array.from({ length: Number(f[t.codice as 'SGL']) }, () => tip.find((x) => x.codice === t.codice)!.id))
      const perPiano = Math.ceil(elenco.length / piani)
      const camere = elenco.map((tipologia, i) => {
        const piano = Math.floor(i / perPiano) + 1
        return { struttura_id: s.id, tipologia_id: tipologia, piano, numero: String(piano * 100 + (i % perPiano) + 1), ordine: i, created_by: io }
      })
      if (camere.length) {
        const { error: e3 } = await supabase.from('hotel_camere').insert(camere)
        if (e3) throw e3
      }
      const { error: e4 } = await supabase.from('hotel_trattamenti').insert(TRATTAMENTI.map((t, i) => ({ ...t, struttura_id: s.id, ordine: i, created_by: io })))
      if (e4) throw e4
      const { data: bar, error: e5 } = await supabase.from('hotel_piani_tariffari')
        .insert({ struttura_id: s.id, codice: 'BAR', nome: 'Miglior tariffa disponibile', tipo: 'bar', cancellazione_giorni: 2, penale_pct: 100, ordine: 0, created_by: io })
        .select('id').single()
      if (e5) throw e5
      const { error: e6 } = await supabase.from('hotel_piani_tariffari').insert({
        struttura_id: s.id, codice: 'NR', nome: 'Non rimborsabile', tipo: 'non_rimborsabile', base_piano_id: bar.id, variazione_pct: -10,
        rimborsabile: false, caparra_pct: 100, ordine: 1, created_by: io })
      if (e6) throw e6

      await qc.invalidateQueries({ queryKey: ['fond'] })
      scegliStruttura(s.id)
      toast.success(`${s.nome} è pronto: ${camere.length} camere su ${piani} ${piani === 1 ? 'piano' : 'piani'}`)
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
          <DialogTitle>Configura la struttura</DialogTitle>
          <DialogDescription>Tipologie, prezzi, camere e trattamenti si cambiano poi da «Camere e tariffe».</DialogDescription>
        </DialogHeader>
        <form onSubmit={crea} className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5"><Label htmlFor="cs-nome">Nome della struttura *</Label>
            <Input id="cs-nome" value={f.nome} onChange={set('nome')} required autoFocus placeholder="Hotel Belvedere" /></div>
          <div className="space-y-1.5"><Label htmlFor="cs-comune">Comune</Label>
            <Input id="cs-comune" value={f.comune} onChange={set('comune')} placeholder="Per la tassa di soggiorno" /></div>
          <div className="space-y-1.5"><Label htmlFor="cs-cat">Categoria</Label>
            <Input id="cs-cat" value={f.categoria} onChange={set('categoria')} /></div>
          <div className="space-y-1.5"><Label htmlFor="cs-piani">Piani</Label>
            <Input id="cs-piani" type="number" min={1} max={40} value={f.piani} onChange={set('piani')} /></div>
          <div />
          {TIPOLOGIE.map((t) => (
            <div key={t.codice} className="space-y-1.5"><Label htmlFor={`cs-${t.codice}`}>Camere {t.nome.toLowerCase()}</Label>
              <Input id={`cs-${t.codice}`} type="number" min={0} max={300} value={f[t.codice as 'SGL']} onChange={set(t.codice as 'SGL')} /></div>
          ))}
          <DialogFooter className="col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <BottoneScrittura type="submit" disabled={inCorso}>{inCorso ? 'Creazione…' : 'Crea la struttura'}</BottoneScrittura>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
