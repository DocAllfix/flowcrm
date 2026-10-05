/**
 * Guardia delle pagine del Fioraio: al primo accesso propone la
 * configurazione del negozio — ricarico, costo della manodopera e zone di
 * consegna — che poi si cambia da «Negozio e zone».
 */
import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Flower2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { messaggioErrore } from '@/lib/queries/fondamenta'
import { useImpostazioni } from '@/modules/fioraio/queries'

export function ConNegozio({ children }: { children: ReactNode }) {
  const { impostazioni, caricamento } = useImpostazioni()
  const { isManager } = useAuth()
  const [apri, setApri] = useState(false)
  if (caricamento) return <div className="flex justify-center py-20"><Spinner etichetta="Caricamento in corso" dimensione="lg" /></div>
  if (!impostazioni) {
    return (
      <>
        <EmptyState icon={Flower2} title="Negozio da configurare"
          description={isManager
            ? 'Bastano il nome del negozio e le zone di consegna: ricarico e costo della manodopera hanno valori di partenza che poi si cambiano.'
            : 'La direzione deve prima configurare il negozio.'}
          action={isManager ? <BottoneScrittura onClick={() => setApri(true)}>Configura il negozio</BottoneScrittura> : undefined} filtrato={!isManager} />
        <ConfiguraDialog open={apri} onOpenChange={setApri} />
      </>
    )
  }
  return <>{children}</>
}

function ConfiguraDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const [f, setF] = useState({ negozio: '', indirizzo: '', ricarico: '150', orario: '20', zona1: 'Centro', cap1: '', prezzo1: '5', zona2: 'Fuori città', cap2: '', prezzo2: '10' })
  const [inCorso, setInCorso] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const num = (s: string) => Number(s.replace(',', '.')) || 0
  const cap = (s: string) => s.split(/[\s,;]+/).map((x) => x.trim()).filter(Boolean)

  async function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.negozio.trim()) { toast.error('Dai un nome al negozio'); return }
    setInCorso(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const io = auth.user!.id
      const zone = [{ nome: f.zona1.trim(), cap: cap(f.cap1), importo: num(f.prezzo1), ordine: 0 }, { nome: f.zona2.trim(), cap: cap(f.cap2), importo: num(f.prezzo2), ordine: 1 }]
        .filter((z) => z.nome)
      if (zone.length) {
        const { error } = await supabase.from('fior_zone').upsert(zone.map((z) => ({ ...z, created_by: io })), { onConflict: 'nome', ignoreDuplicates: true })
        if (error) throw error
      }
      const { error: e2 } = await supabase.from('fior_impostazioni')
        .insert({ negozio: f.negozio.trim(), indirizzo: f.indirizzo.trim() || null, ricarico_pct: num(f.ricarico), costo_orario: num(f.orario), created_by: io })
      if (e2) throw e2
      await qc.invalidateQueries({ queryKey: ['fond'] })
      toast.success(`${f.negozio.trim()} è pronto: ora il catalogo e le composizioni`)
      onOpenChange(false)
    } catch (err) { toast.error(messaggioErrore(err)) } finally { setInCorso(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configura il negozio</DialogTitle>
          <DialogDescription>Il ricarico serve a proporre il prezzo delle composizioni su misura: costo dei fiori più manodopera, aumentato della percentuale.</DialogDescription>
        </DialogHeader>
        <form onSubmit={crea} className="grid grid-cols-6 gap-3">
          <div className="col-span-6 space-y-1.5"><Label htmlFor="fn-nome">Nome del negozio *</Label><Input id="fn-nome" value={f.negozio} onChange={set('negozio')} required autoFocus placeholder="Fiori di Campo" /></div>
          <div className="col-span-6 space-y-1.5"><Label htmlFor="fn-ind">Indirizzo</Label><Input id="fn-ind" value={f.indirizzo} onChange={set('indirizzo')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="fn-ric">Ricarico sul costo (%)</Label><Input id="fn-ric" inputMode="decimal" value={f.ricarico} onChange={set('ricarico')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="fn-ora">Manodopera (€ l'ora)</Label><Input id="fn-ora" inputMode="decimal" value={f.orario} onChange={set('orario')} /></div>
          {([['1', 'Prima zona di consegna'], ['2', 'Seconda zona']] as const).map(([n, l]) => (
            <fieldset key={n} className="col-span-6 grid grid-cols-6 gap-3">
              <legend className="col-span-6 mb-1 text-sm font-medium text-foreground">{l}</legend>
              <div className="col-span-2 space-y-1.5"><Label htmlFor={`fn-z${n}`}>Nome</Label><Input id={`fn-z${n}`} value={f[`zona${n}`]} onChange={set(`zona${n}`)} /></div>
              <div className="col-span-3 space-y-1.5"><Label htmlFor={`fn-c${n}`}>CAP serviti</Label><Input id={`fn-c${n}`} value={f[`cap${n}`]} onChange={set(`cap${n}`)} placeholder="40121, 40122" /></div>
              <div className="col-span-1 space-y-1.5"><Label htmlFor={`fn-p${n}`}>€</Label><Input id={`fn-p${n}`} inputMode="decimal" value={f[`prezzo${n}`]} onChange={set(`prezzo${n}`)} /></div>
            </fieldset>
          ))}
          <DialogFooter className="col-span-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <BottoneScrittura type="submit" disabled={inCorso}>{inCorso ? 'Creazione…' : 'Crea il negozio'}</BottoneScrittura>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
