/**
 * Selettore della sede (catene con più palestre) e guardia delle pagine:
 * senza sedi propone la configurazione guidata — sale, formule di
 * abbonamento e carnet tipici, che si cambiano poi da «Listini e regole».
 */
import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Dumbbell } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { messaggioErrore } from '@/lib/queries/fondamenta'
import { usePalestra } from '@/modules/palestra/contesto'

export function SelettoreSede() {
  const { sedi, sedeId, scegliSede } = usePalestra()
  if (sedi.length < 2) return null
  return (
    <Select value={sedeId ?? undefined} onValueChange={scegliSede}>
      <SelectTrigger className="w-52" aria-label="Sede">
        <Dumbbell className="h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="Sede" />
      </SelectTrigger>
      <SelectContent>{sedi.map((s) => <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>)}</SelectContent>
    </Select>
  )
}

export function ConSede({ children }: { children: ReactNode }) {
  const { sede, caricamento } = usePalestra()
  const { isManager } = useAuth()
  const [apri, setApri] = useState(false)
  if (caricamento) return <div className="flex justify-center py-20"><Spinner etichetta="Caricamento in corso" dimensione="lg" /></div>
  if (!sede) {
    return (
      <>
        <EmptyState icon={Dumbbell} title="Nessuna sede configurata"
          description={isManager
            ? 'Crea la palestra con le sue sale: formule di abbonamento e carnet tipici li prepariamo noi, poi si cambiano quando vuoi.'
            : 'La direzione deve prima configurare la sede.'}
          action={isManager ? <BottoneScrittura onClick={() => setApri(true)}>Configura la palestra</BottoneScrittura> : undefined} filtrato={!isManager} />
        <ConfiguraSedeDialog open={apri} onOpenChange={setApri} />
      </>
    )
  }
  return <>{children}</>
}

const SALE = [
  { nome: 'Sala pesi', tipo: 'sala_pesi', capienza: 40 },
  { nome: 'Sala corsi', tipo: 'sala_corsi', capienza: 25 },
  { nome: 'Sala spinning', tipo: 'spinning', capienza: 20 },
  { nome: 'Sala PT', tipo: 'pt', capienza: 4 },
]
const SALA_PISCINA = { nome: 'Piscina', tipo: 'piscina', capienza: 30 }
const SALA_WELLNESS = { nome: 'Area wellness', tipo: 'wellness', capienza: 10 }

const FORMULE = [
  { nome: 'Mensile open', tipo: 'mensile', durata_mesi: 1, prezzo: 49, servizi: ['sala_pesi', 'corsi'], rinnovo_automatico: true },
  { nome: 'Trimestrale open', tipo: 'trimestrale', durata_mesi: 3, prezzo: 135, rate: 3, servizi: ['sala_pesi', 'corsi'] },
  { nome: 'Annuale open', tipo: 'annuale', durata_mesi: 12, prezzo: 450, rate: 12, servizi: ['sala_pesi', 'corsi'] },
  { nome: 'Solo sala pesi', tipo: 'sala_pesi', durata_mesi: 1, prezzo: 39, servizi: ['sala_pesi'], rinnovo_automatico: true },
  { nome: 'Mattina (7–14)', tipo: 'fasce_orarie', durata_mesi: 1, prezzo: 35, servizi: ['sala_pesi', 'corsi'],
    fasce: [{ giorni: [1, 2, 3, 4, 5, 6, 7], dalle: '07:00', alle: '14:00' }] },
  { nome: 'Studenti', tipo: 'studenti', durata_mesi: 1, prezzo: 35, servizi: ['sala_pesi', 'corsi'] },
]
const PACCHETTI = [
  { nome: '10 ingressi', voci: [{ servizio: 'ingressi', quantita: 10 }], prezzo: 80, validita_giorni: 120 },
  { nome: '20 ingressi', voci: [{ servizio: 'ingressi', quantita: 20 }], prezzo: 150, validita_giorni: 180 },
  { nome: '10 corsi', voci: [{ servizio: 'corsi', quantita: 10 }], prezzo: 90, validita_giorni: 120 },
  { nome: '10 lezioni PT', voci: [{ servizio: 'lezioni_pt', quantita: 10 }], prezzo: 400, validita_giorni: 180 },
  { nome: '5 massaggi', voci: [{ servizio: 'massaggi', quantita: 5 }], prezzo: 220, validita_giorni: 180 },
]

function ConfiguraSedeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { scegliSede } = usePalestra()
  const qc = useQueryClient()
  const [f, setF] = useState({ nome: '', comune: '', iscrizione: '25', piscina: false, wellness: false })
  const [inCorso, setInCorso] = useState(false)

  async function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.nome.trim()) { toast.error('Dai un nome alla palestra'); return }
    setInCorso(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const io = auth.user!.id
      // Prima i listini (condivisi tra le sedi, solo la prima volta), poi la sede: se qualcosa va storto non resta una sede a metà.
      const { count } = await supabase.from('pal_formule').select('id', { count: 'exact', head: true })
      if (!count) {
        const iscr = Number(f.iscrizione.replace(',', '.')) || 0
        const { error: e3 } = await supabase.from('pal_formule').insert(FORMULE.map((x, i) => ({
          rate: 1, rinnovo_automatico: false, fasce: null, ...x, quota_iscrizione: iscr, ordine: i, created_by: io })))
        if (e3) throw e3
        const { error: e4 } = await supabase.from('pal_pacchetti').insert(PACCHETTI.map((x) => ({ ...x, created_by: io })))
        if (e4) throw e4
      }
      const { data: s, error: e1 } = await supabase.from('pal_sedi')
        .insert({ nome: f.nome.trim(), comune: f.comune.trim() || null,
                  orari: [{ giorni: [1, 2, 3, 4, 5], dalle: '06:30', alle: '22:30' }, { giorni: [6, 7], dalle: '09:00', alle: '19:00' }],
                  created_by: io }).select().single()
      if (e1) throw e1
      const sale = [...SALE, ...(f.piscina ? [SALA_PISCINA] : []), ...(f.wellness ? [SALA_WELLNESS] : [])]
      const { error: e2 } = await supabase.from('pal_sale').insert(sale.map((x) => ({ ...x, sede_id: s.id, created_by: io })))
      if (e2) { await supabase.from('pal_sedi').delete().eq('id', s.id); throw e2 }
      await qc.invalidateQueries({ queryKey: ['fond'] })
      scegliSede(s.id)
      toast.success(`${s.nome} è pronta: ${sale.length} sale, formule e carnet di partenza`)
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
          <DialogTitle>Configura la palestra</DialogTitle>
          <DialogDescription>Sale, formule, carnet e regole si cambiano poi da «Listini e regole».</DialogDescription>
        </DialogHeader>
        <form onSubmit={crea} className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1.5"><Label htmlFor="ps-nome">Nome della palestra *</Label>
            <Input id="ps-nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} required autoFocus placeholder="Fit Club Centro" /></div>
          <div className="space-y-1.5"><Label htmlFor="ps-comune">Comune</Label>
            <Input id="ps-comune" value={f.comune} onChange={(e) => setF({ ...f, comune: e.target.value })} /></div>
          <div className="space-y-1.5"><Label htmlFor="ps-iscr">Quota d'iscrizione (€)</Label>
            <Input id="ps-iscr" inputMode="decimal" value={f.iscrizione} onChange={(e) => setF({ ...f, iscrizione: e.target.value })} /></div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={f.piscina} onCheckedChange={(v) => setF({ ...f, piscina: v === true })} /> Piscina</label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={f.wellness} onCheckedChange={(v) => setF({ ...f, wellness: v === true })} /> Area wellness</label>
          <DialogFooter className="col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <BottoneScrittura type="submit" disabled={inCorso}>{inCorso ? 'Creazione…' : 'Crea la palestra'}</BottoneScrittura>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
