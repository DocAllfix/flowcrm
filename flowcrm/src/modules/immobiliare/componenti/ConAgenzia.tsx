/**
 * Guardia delle pagine dell'Agenzia immobiliare: al primo accesso propone la
 * configurazione — nome dell'agenzia, provvigioni, quota degli agenti — e,
 * se chi la fa è un agente, lo registra come tale. Tutto si cambia poi da
 * «Regole dell'agenzia».
 */
import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Building } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { EmptyState } from '@/components/ui/empty-state'
import { Spinner } from '@/components/ui/spinner'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/lib/supabase'
import { messaggioErrore } from '@/lib/queries/fondamenta'
import { useImpostazioni } from '@/modules/immobiliare/queries'
import { numero } from '@/modules/immobiliare/stati'

export function ConAgenzia({ children }: { children: ReactNode }) {
  const { impostazioni, caricamento } = useImpostazioni()
  const { isManager } = useAuth()
  const [apri, setApri] = useState(false)
  if (caricamento) return <div className="flex justify-center py-20"><Spinner etichetta="Caricamento in corso" dimensione="lg" /></div>
  if (!impostazioni) {
    return (
      <>
        <EmptyState icon={Building} title="Agenzia da configurare"
          description={isManager
            ? 'Bastano il nome dell\'agenzia e le provvigioni abituali: le regole si cambiano poi quando vuoi.'
            : 'La direzione deve prima configurare l\'agenzia.'}
          action={isManager ? <BottoneScrittura onClick={() => setApri(true)}>Configura l'agenzia</BottoneScrittura> : undefined} />
        <ConfiguraDialog open={apri} onOpenChange={setApri} />
      </>
    )
  }
  return <>{children}</>
}

function ConfiguraDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient()
  const [f, setF] = useState({ agenzia: '', venditore: '3', acquirente: '3', mensilita: '1', quota: '50', agente: true })
  const [inCorso, setInCorso] = useState(false)
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })

  async function crea(e: FormEvent) {
    e.preventDefault()
    if (!f.agenzia.trim()) { toast.error('Dai un nome all\'agenzia'); return }
    setInCorso(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const io = auth.user!.id
      const { error } = await supabase.from('imm_impostazioni').insert({ agenzia: f.agenzia.trim(), provvigione_venditore_pct: numero(f.venditore),
        provvigione_acquirente_pct: numero(f.acquirente), locazione_mensilita: numero(f.mensilita), quota_agente_pct: numero(f.quota), created_by: io })
      if (error) throw error
      if (f.agente) {
        const { error: e2 } = await supabase.from('imm_agenti').upsert({ user_id: io, created_by: io }, { onConflict: 'user_id', ignoreDuplicates: true })
        if (e2) throw e2
      }
      await qc.invalidateQueries({ queryKey: ['fond'] })
      toast.success(`${f.agenzia.trim()} è pronta: ora il primo immobile`)
      onOpenChange(false)
    } catch (err) { toast.error(messaggioErrore(err)) } finally { setInCorso(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Configura l'agenzia</DialogTitle>
          <DialogDescription>Le provvigioni sono quelle proposte di default: ogni incarico può averne di sue.</DialogDescription>
        </DialogHeader>
        <form onSubmit={crea} className="grid grid-cols-6 gap-3">
          <div className="col-span-6 space-y-1.5"><Label htmlFor="ia-nome">Nome dell'agenzia *</Label><Input id="ia-nome" value={f.agenzia} onChange={set('agenzia')} required autoFocus placeholder="Case Centrali" /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="ia-ven">Provvigione venditore (%)</Label><Input id="ia-ven" inputMode="decimal" value={f.venditore} onChange={set('venditore')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="ia-acq">Provvigione acquirente (%)</Label><Input id="ia-acq" inputMode="decimal" value={f.acquirente} onChange={set('acquirente')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="ia-men">Locazione: mensilità per lato</Label><Input id="ia-men" inputMode="decimal" value={f.mensilita} onChange={set('mensilita')} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor="ia-quo">Quota dell'agente (%)</Label><Input id="ia-quo" inputMode="decimal" value={f.quota} onChange={set('quota')} /></div>
          <label className="col-span-6 flex items-center gap-2 text-sm text-foreground"><Checkbox checked={f.agente} onCheckedChange={(v) => setF({ ...f, agente: v === true })} /> Anch'io seguo immobili e clienti come agente</label>
          <DialogFooter className="col-span-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <BottoneScrittura type="submit" disabled={inCorso}>{inCorso ? 'Creazione…' : 'Crea l\'agenzia'}</BottoneScrittura>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
