import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Trash2, Plus } from 'lucide-react'
import { fmtImporto } from '@/modules/agenti/stati'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'

/**
 * Pezzi condivisi dalle schede di questa scheda di dettaglio.
 *
 * Stavano in fondo a un file da oltre mille righe, insieme alle schede che
 * li usano: un file che nessuno apriva per intero, e in cui una modifica a
 * una scheda costringeva a scorrere tutte le altre.
 */
export const card = 'rounded-lg border border-border bg-card p-5'

export function Riga({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-sm">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="text-right font-medium text-foreground">{children}</span>
    </div>
  )
}

export function BtnElimina({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} aria-label="Rimuovi"
      className="rounded-md p-1 text-muted-foreground hover:text-destructive">
      <Trash2 className="h-3.5 w-3.5" />
    </button>
  )
}

export // Righe di un ordine (§8): prodotti, quantità, prezzi — il valore
// dell'ordine si ricalcola dal trigger sul DB.
function RigheOrdine({ agenteId, ordineId }: { agenteId: string; ordineId: string }) {
  const qc = useQueryClient()
  const { data: righe = [] } = useQuery({
    queryKey: ['agenti', agenteId, 'righe', ordineId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agenti_ordini_righe')
        .select('*')
        .eq('ordine_id', ordineId)
        .order('created_at')
      if (error) throw error
      return data
    },
  })
  const [prodotto, setProdotto] = useState('')
  const [quantita, setQuantita] = useState('1')
  const [prezzo, setPrezzo] = useState('')

  async function invalida() {
    await qc.invalidateQueries({ queryKey: ['agenti', agenteId, 'righe', ordineId] })
    await qc.invalidateQueries({ queryKey: ['agenti', agenteId, 'agenti_ordini'] })
  }

  async function aggiungi(e: FormEvent) {
    e.preventDefault()
    const q = Number(quantita); const p = Number(prezzo)
    if (!prodotto.trim() || Number.isNaN(q) || Number.isNaN(p) || !prezzo) {
      toast.error('Prodotto, quantità e prezzo obbligatori'); return
    }
    const { data: auth } = await supabase.auth.getUser()
    const { error } = await supabase.from('agenti_ordini_righe').insert({
      ordine_id: ordineId, prodotto: prodotto.trim(), quantita: q,
      prezzo_unitario: p, created_by: auth.user!.id,
    })
    if (error) { toast.error(error.message); return }
    setProdotto(''); setQuantita('1'); setPrezzo('')
    await invalida()
  }

  async function rimuovi(id: string) {
    const { error } = await supabase.from('agenti_ordini_righe').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    await invalida()
  }

  return (
    <div className="mt-2 rounded-lg bg-muted/40 p-3">
      {righe.map((r) => (
        <div key={r.id} className="flex items-center gap-3 border-b border-border/60 py-1.5 text-sm last:border-0">
          <span className="min-w-0 flex-1 truncate text-foreground">{r.prodotto}</span>
          <span className="text-muted-foreground">
            {Number(r.quantita)} × {fmtImporto(Number(r.prezzo_unitario))}
          </span>
          <span className="font-medium text-foreground">
            {fmtImporto(Number(r.quantita) * Number(r.prezzo_unitario))}
          </span>
          <button onClick={() => void rimuovi(r.id)} aria-label="Rimuovi riga"
            className="rounded-md p-1 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
      <form onSubmit={aggiungi} className="mt-2 flex flex-wrap items-end gap-2">
        <div className="min-w-36 flex-1 space-y-1">
          <Label className="text-xs">Prodotto</Label>
          <Input className="h-8 text-sm" value={prodotto} onChange={(e) => setProdotto(e.target.value)} />
        </div>
        <div className="w-20 space-y-1">
          <Label className="text-xs">Q.tà</Label>
          <Input className="h-8 text-sm" type="number" step="0.01" value={quantita}
            onChange={(e) => setQuantita(e.target.value)} />
        </div>
        <div className="w-28 space-y-1">
          <Label className="text-xs">Prezzo (€)</Label>
          <Input className="h-8 text-sm" type="number" step="0.01" value={prezzo}
            onChange={(e) => setPrezzo(e.target.value)} />
        </div>
        <Button type="submit" size="sm"><Plus className="h-3.5 w-3.5" /> Riga</Button>
      </form>
    </div>
  )
}
