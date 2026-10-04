/**
 * Configurazione guidata di un locale: sale, tavoli disposti in griglia,
 * postazioni di preparazione e, se il catalogo è vuoto, le categorie
 * tipiche del settore (documento Ristorante §1 e §12, Bar §1 e §9).
 * Tutto resta modificabile dopo, dalla mappa e dal catalogo.
 */
import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase'
import { messaggioErrore } from '@/lib/queries/fondamenta'
import { useFb } from '@/modules/fb/contesto'

interface CategoriaBase { nome: string; area: 'food' | 'beverage'; uscita: number }

const CATEGORIE_RISTORANTE: CategoriaBase[] = [
  { nome: 'Antipasti', area: 'food', uscita: 1 }, { nome: 'Primi', area: 'food', uscita: 2 },
  { nome: 'Secondi', area: 'food', uscita: 3 }, { nome: 'Contorni', area: 'food', uscita: 3 },
  { nome: 'Pizze', area: 'food', uscita: 2 }, { nome: 'Insalate', area: 'food', uscita: 2 },
  { nome: 'Dessert', area: 'food', uscita: 4 }, { nome: 'Formaggi', area: 'food', uscita: 4 },
  { nome: 'Pane', area: 'food', uscita: 0 }, { nome: 'Bevande', area: 'beverage', uscita: 0 },
  { nome: 'Vini', area: 'beverage', uscita: 0 }, { nome: 'Birre', area: 'beverage', uscita: 0 },
  { nome: 'Cocktail', area: 'beverage', uscita: 0 }, { nome: 'Caffetteria', area: 'beverage', uscita: 5 },
]
const CATEGORIE_BAR: CategoriaBase[] = [
  { nome: 'Caffetteria', area: 'beverage', uscita: 0 }, { nome: 'Bevande', area: 'beverage', uscita: 0 },
  { nome: 'Analcolici', area: 'beverage', uscita: 0 }, { nome: 'Birre', area: 'beverage', uscita: 0 },
  { nome: 'Vini', area: 'beverage', uscita: 0 }, { nome: 'Cocktail', area: 'beverage', uscita: 0 },
  { nome: 'Aperitivi', area: 'beverage', uscita: 0 }, { nome: 'Pasticceria', area: 'food', uscita: 0 },
  { nome: 'Panini e toast', area: 'food', uscita: 0 }, { nome: 'Piadine e tramezzini', area: 'food', uscita: 0 },
  { nome: 'Snack', area: 'food', uscita: 0 }, { nome: 'Gelati', area: 'food', uscita: 0 },
]

interface Props { open: boolean; onOpenChange: (o: boolean) => void }

export function ConfiguraLocaleDialog({ open, onOpenChange }: Props) {
  const { modulo, nome: nomeModulo, scegliLocale } = useFb()
  const qc = useQueryClient()
  const [nome, setNome] = useState('')
  const [sale, setSale] = useState(modulo === 'bar' ? 'Sala, Banco, Dehor' : 'Sala, Terrazza')
  const [tavoliPerSala, setTavoliPerSala] = useState(modulo === 'bar' ? 6 : 10)
  const [posti, setPosti] = useState(modulo === 'bar' ? 2 : 4)
  const [inCorso, setInCorso] = useState(false)

  async function crea(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { toast.error('Dai un nome al locale'); return }
    setInCorso(true)
    try {
      const { data: auth } = await supabase.auth.getUser()
      const io = auth.user!.id
      const { data: locale, error: e1 } = await supabase.from('fb_locali')
        .insert({ modulo, nome: nome.trim(), created_by: io }).select().single()
      if (e1) throw e1

      const nomiSale = sale.split(',').map((s) => s.trim()).filter(Boolean)
      for (const [i, s] of nomiSale.entries()) {
        const tipo = /terrazz/i.test(s) ? 'terrazza' : /dehor/i.test(s) ? 'dehor' : /banco/i.test(s) ? 'banco'
          : /privat/i.test(s) ? 'sala_privata' : 'sala'
        const file = Math.ceil((tipo === 'banco' ? Math.min(tavoliPerSala, 6) : tavoliPerSala) / 5)
        const { data: sala, error: e2 } = await supabase.from('fb_sale')
          .insert({ locale_id: locale.id, nome: s, tipo, ordine: i, created_by: io, modulo,
            larghezza: 960, altezza: Math.max(360, 60 + file * 160 + 40) }).select().single()
        if (e2) throw e2
        const n = tipo === 'banco' ? Math.min(tavoliPerSala, 6) : tavoliPerSala
        const tavoli = Array.from({ length: n }, (_, k) => ({
          sala_id: sala.id, locale_id: locale.id, modulo,
          numero: nomiSale.length > 1 ? `${s.slice(0, 1).toUpperCase()}${k + 1}` : String(k + 1),
          posti: tipo === 'banco' ? 1 : posti,
          forma: (tipo === 'banco' ? 'rotondo' : k % 3 === 2 ? 'rettangolare' : 'quadrato') as 'quadrato',
          x: 60 + (k % 5) * 180, y: 60 + Math.floor(k / 5) * 160,
          larghezza: k % 3 === 2 && tipo !== 'banco' ? 130 : 80, altezza: 80,
          created_by: io,
        }))
        if (tavoli.length) {
          const { error: e3 } = await supabase.from('fb_tavoli').insert(tavoli)
          if (e3) throw e3
        }
      }

      // Catalogo: categorie tipiche solo se non ce ne sono ancora.
      const { count } = await supabase.from('fb_categorie').select('id', { count: 'exact', head: true })
      let categorie: { id: string; area: string }[] = []
      if (!count) {
        const base = modulo === 'bar' ? CATEGORIE_BAR : CATEGORIE_RISTORANTE
        const { data, error: e4 } = await supabase.from('fb_categorie')
          .insert(base.map((c, i) => ({ ...c, ordine: i, created_by: io }))).select('id, area')
        if (e4) throw e4
        categorie = data
      } else {
        const { data } = await supabase.from('fb_categorie').select('id, area')
        categorie = data ?? []
      }
      const cibo = categorie.filter((c) => c.area === 'food').map((c) => c.id)
      const bevande = categorie.filter((c) => c.area === 'beverage').map((c) => c.id)
      const stazioni = modulo === 'bar'
        ? [{ nome: 'Banco bar', tipo: 'banco', categorie: bevande, predefinita: true },
           { nome: 'Cucina', tipo: 'cucina', categorie: cibo, predefinita: false }]
        : [{ nome: 'Cucina', tipo: 'cucina', categorie: cibo, predefinita: true },
           { nome: 'Bar', tipo: 'bar', categorie: bevande, predefinita: false }]
      const { error: e5 } = await supabase.from('fb_stazioni').insert(stazioni.map((s, i) => ({
        ...s, locale_id: locale.id, modulo, ordine: i, created_by: io,
      })) as never)
      if (e5) throw e5

      await qc.invalidateQueries({ queryKey: ['fond'] })
      scegliLocale(locale.id)
      toast.success(`${nome.trim()} è pronto: sistema la mappa e il catalogo quando vuoi`)
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
          <DialogTitle>Configura il {nomeModulo.toLowerCase()}</DialogTitle>
          <DialogDescription>
            Sale e tavoli si spostano poi sulla mappa; postazioni e categorie si cambiano dal catalogo.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={crea} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="cl-nome">Nome del locale *</Label>
            <Input id="cl-nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus
              placeholder={modulo === 'bar' ? 'Bar Centrale' : 'Trattoria da Mario'} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cl-sale">Sale e zone</Label>
            <Input id="cl-sale" value={sale} onChange={(e) => setSale(e.target.value)} />
            <p className="text-xs text-muted-foreground">Separate da virgola: Sala, Terrazza, Dehor, Sala privata, Banco.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="cl-tavoli">Tavoli per sala</Label>
              <Input id="cl-tavoli" type="number" min={1} max={60} value={tavoliPerSala}
                onChange={(e) => setTavoliPerSala(Math.max(1, Number(e.target.value)))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cl-posti">Posti per tavolo</Label>
              <Input id="cl-posti" type="number" min={1} max={30} value={posti}
                onChange={(e) => setPosti(Math.max(1, Number(e.target.value)))} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={inCorso}>{inCorso ? 'Creazione…' : 'Crea il locale'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
