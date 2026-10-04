/**
 * ProdottoDialog — scheda del prodotto (Ristorante §1, §6; Bar §1): prezzo
 * e IVA, disponibilità e stagionalità, tempo di preparazione, da dove viene
 * il costo (ricetta, articolo venduto così com'è, menu composto, a mano),
 * allergeni potenziali e contaminazioni, canali di vendita, foto.
 */
import { useEffect, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { AllegatiSection } from '@/components/allegati/AllegatiSection'
import { cn } from '@/lib/utils'
import type { Tables } from '@/lib/supabase'
import { useElenco, useSalva, messaggioErrore } from '@/lib/queries/fondamenta'
import { ALLERGENI, BEVERAGE_LABEL, CANALE_LABEL } from '@/modules/fb/stati'
import type { Categoria, Prodotto } from '@/modules/fb/queries'

interface Props { open: boolean; onOpenChange: (o: boolean) => void; prodotto?: Prodotto; categorie: Categoria[]; prodotti: Prodotto[] }

const MESI = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic']
const CANALI = ['sala', 'banco', 'asporto', 'delivery', 'online']
type Origine = 'ricetta' | 'articolo' | 'menu' | 'manuale'

export function ProdottoDialog({ open, onOpenChange, prodotto, categorie, prodotti }: Props) {
  const salva = useSalva('fb_prodotti', ['fb_prodotti_economia'])
  const { data: distinte = [] } = useElenco<Tables<'distinte_base'>>('distinte_base', { filtri: { modulo: ['fb', 'ristorante', 'bar'], attivo: true }, ordine: [{ colonna: 'nome' }], abilitato: open })
  const { data: articoli = [] } = useElenco<Tables<'mag_articoli'>>('mag_articoli', { filtri: { modulo: ['fb', 'ristorante', 'bar'], attivo: true }, ordine: [{ colonna: 'descrizione' }], abilitato: open })
  const [f, setF] = useState({ nome: '', descrizione: '', categoria: '', prezzo: '', iva: '10', unita: 'pz', stato: 'attivo', tempo: '',
    distinta: '', articolo: '', articoloQ: '1', costo: '', sostituibili: '', contaminazioni: '', note: '', beverage: '' })
  const [origine, setOrigine] = useState<Origine>('manuale')
  const [componenti, setComponenti] = useState<string[]>([])
  const [potenziali, setPotenziali] = useState<string[]>([])
  const [canali, setCanali] = useState<string[]>(CANALI)
  const [mesi, setMesi] = useState<number[]>([])
  const [mescita, setMescita] = useState(false)

  useEffect(() => {
    if (!open) return
    const p = prodotto
    setF({ nome: p?.nome ?? '', descrizione: p?.descrizione ?? '', categoria: p?.categoria_id ?? categorie[0]?.id ?? '', prezzo: p ? String(p.prezzo) : '',
      iva: String(p?.aliquota_iva ?? 10), unita: p?.unita_vendita ?? 'pz', stato: p?.stato ?? 'attivo', tempo: p?.tempo_preparazione_min ? String(p.tempo_preparazione_min) : '',
      distinta: p?.distinta_id ?? '', articolo: p?.articolo_id ?? '', articoloQ: String(p?.articolo_quantita ?? 1), costo: p?.costo_manuale ? String(p.costo_manuale) : '',
      sostituibili: p?.ingredienti_sostituibili ?? '', contaminazioni: p?.contaminazioni ?? '', note: p?.note_operative ?? '', beverage: p?.beverage_tipo ?? '' })
    setOrigine(p?.componenti.length ? 'menu' : p?.distinta_id ? 'ricetta' : p?.articolo_id ? 'articolo' : 'manuale')
    setComponenti(p?.componenti ?? []); setPotenziali(p?.allergeni_potenziali ?? []); setCanali(p?.canali ?? CANALI)
    setMesi(p?.mesi_disponibili ?? []); setMescita(p?.mescita ?? false)
  }, [open, prodotto, categorie])

  async function invia(e: FormEvent) {
    e.preventDefault()
    if (!f.nome.trim() || !f.categoria) { toast.error('Nome e categoria sono obbligatori'); return }
    const n = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')))
    try {
      await salva.mutateAsync({ id: prodotto?.id, values: {
        nome: f.nome.trim(), descrizione: f.descrizione.trim() || null, categoria_id: f.categoria, prezzo: n(f.prezzo) ?? 0,
        aliquota_iva: Number(f.iva), unita_vendita: f.unita.trim() || 'pz', stato: f.stato, tempo_preparazione_min: n(f.tempo),
        distinta_id: origine === 'ricetta' ? f.distinta || null : null, articolo_id: origine === 'articolo' ? f.articolo || null : null,
        articolo_quantita: n(f.articoloQ) ?? 1, costo_manuale: origine === 'manuale' ? n(f.costo) : null,
        componenti: origine === 'menu' ? componenti : [], allergeni_potenziali: potenziali,
        ingredienti_sostituibili: f.sostituibili.trim() || null, contaminazioni: f.contaminazioni.trim() || null, note_operative: f.note.trim() || null,
        beverage_tipo: f.beverage || null, mescita, canali, mesi_disponibili: mesi,
      } })
      toast.success(prodotto ? 'Prodotto aggiornato' : 'Prodotto creato')
      onOpenChange(false)
    } catch (err) { toast.error(messaggioErrore(err)) }
  }

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value })
  const chip = (attivo: boolean) => cn('rounded-full border px-2.5 py-0.5 text-xs transition-colors',
    attivo ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{prodotto ? `Modifica ${prodotto.codice ?? prodotto.nome}` : 'Nuovo prodotto'}</DialogTitle></DialogHeader>
        <form onSubmit={invia} className="space-y-5">
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-4 space-y-1.5 sm:col-span-2"><Label htmlFor="pd-nome">Nome *</Label><Input id="pd-nome" value={f.nome} onChange={set('nome')} required autoFocus /></div>
            <div className="col-span-2 space-y-1.5 sm:col-span-1"><Label>Categoria *</Label>
              <Select value={f.categoria} onValueChange={(v) => setF({ ...f, categoria: v })}>
                <SelectTrigger aria-label="Categoria"><SelectValue /></SelectTrigger>
                <SelectContent>{categorie.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="col-span-2 space-y-1.5 sm:col-span-1"><Label>Stato</Label>
              <Select value={f.stato} onValueChange={(v) => setF({ ...f, stato: v })}>
                <SelectTrigger aria-label="Stato"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="attivo">Disponibile</SelectItem><SelectItem value="esaurito">Finito</SelectItem><SelectItem value="sospeso">Sospeso</SelectItem></SelectContent>
              </Select></div>
            <div className="col-span-4 space-y-1.5"><Label htmlFor="pd-desc">Descrizione</Label><Textarea id="pd-desc" rows={2} value={f.descrizione} onChange={set('descrizione')} /></div>
            <div className="space-y-1.5"><Label htmlFor="pd-prezzo">Prezzo (€, IVA inclusa)</Label><Input id="pd-prezzo" inputMode="decimal" value={f.prezzo} onChange={set('prezzo')} /></div>
            <div className="space-y-1.5"><Label>Aliquota IVA</Label>
              <Select value={f.iva} onValueChange={(v) => setF({ ...f, iva: v })}>
                <SelectTrigger aria-label="Aliquota IVA"><SelectValue /></SelectTrigger>
                <SelectContent>{['4', '5', '10', '22'].map((a) => <SelectItem key={a} value={a}>{a}%</SelectItem>)}</SelectContent>
              </Select></div>
            <div className="space-y-1.5"><Label htmlFor="pd-unita">Unità di vendita</Label><Input id="pd-unita" value={f.unita} onChange={set('unita')} placeholder="pz, porzione, calice…" /></div>
            <div className="space-y-1.5"><Label htmlFor="pd-tempo">Preparazione (min)</Label><Input id="pd-tempo" type="number" min={0} value={f.tempo} onChange={set('tempo')} /></div>
          </div>

          <fieldset className="space-y-3 rounded-lg border border-border p-4">
            <legend className="px-1 text-sm font-medium text-foreground">Da dove viene il costo</legend>
            <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Origine del costo">
              {([['ricetta', 'Dalla ricetta'], ['articolo', 'Articolo venduto così com\'è'], ['menu', 'Menu o combo'], ['manuale', 'A mano']] as const).map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={origine === v} className={chip(origine === v)} onClick={() => setOrigine(v)}>{l}</button>
              ))}
            </div>
            {origine === 'ricetta' && (
              <Select value={f.distinta} onValueChange={(v) => setF({ ...f, distinta: v })}>
                <SelectTrigger aria-label="Ricetta"><SelectValue placeholder="Scegli la ricetta…" /></SelectTrigger>
                <SelectContent>{distinte.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
              </Select>
            )}
            {origine === 'articolo' && (
              <div className="flex gap-3">
                <Select value={f.articolo} onValueChange={(v) => setF({ ...f, articolo: v })}>
                  <SelectTrigger aria-label="Articolo"><SelectValue placeholder="Bottiglia, lattina, prodotto confezionato…" /></SelectTrigger>
                  <SelectContent>{articoli.map((a) => <SelectItem key={a.id} value={a.id}>{a.descrizione} ({a.unita_misura})</SelectItem>)}</SelectContent>
                </Select>
                <div className="w-36"><Input inputMode="decimal" value={f.articoloQ} onChange={set('articoloQ')} aria-label="Quantità dell'articolo per una vendita" /></div>
              </div>
            )}
            {origine === 'menu' && (
              <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto" role="group" aria-label="Piatti del menu">
                {prodotti.filter((p) => p.id !== prodotto?.id && p.componenti.length === 0).map((p) => (
                  <button key={p.id} type="button" aria-pressed={componenti.includes(p.id)} className={chip(componenti.includes(p.id))}
                    onClick={() => setComponenti(componenti.includes(p.id) ? componenti.filter((x) => x !== p.id) : [...componenti, p.id])}>{p.nome}</button>
                ))}
              </div>
            )}
            {origine === 'manuale' && (
              <div className="w-40 space-y-1.5"><Label htmlFor="pd-costo">Costo (€)</Label><Input id="pd-costo" inputMode="decimal" value={f.costo} onChange={set('costo')} /></div>
            )}
          </fieldset>

          <div className="space-y-1.5">
            <Label>Allergeni potenziali (tracce)</Label>
            <p className="text-xs text-muted-foreground">Gli allergeni presenti si calcolano dagli ingredienti; qui quelli che possono esserci per contaminazione.</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Allergeni potenziali">
              {ALLERGENI.map((a) => <button key={a.valore} type="button" aria-pressed={potenziali.includes(a.valore)} className={chip(potenziali.includes(a.valore))}
                onClick={() => setPotenziali(potenziali.includes(a.valore) ? potenziali.filter((x) => x !== a.valore) : [...potenziali, a.valore])}>{a.label}</button>)}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5"><Label htmlFor="pd-sost">Ingredienti sostituibili</Label><Input id="pd-sost" value={f.sostituibili} onChange={set('sostituibili')} /></div>
            <div className="space-y-1.5"><Label htmlFor="pd-cont">Contaminazioni</Label><Input id="pd-cont" value={f.contaminazioni} onChange={set('contaminazioni')} /></div>
            <div className="space-y-1.5"><Label htmlFor="pd-note">Note operative</Label><Input id="pd-note" value={f.note} onChange={set('note')} /></div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Canali di vendita</Label>
              <div className="flex flex-wrap gap-3">
                {CANALI.map((c) => (
                  <label key={c} className="flex items-center gap-1.5 text-sm">
                    <Checkbox checked={canali.includes(c)} onCheckedChange={(v) => setCanali(v ? [...canali, c] : canali.filter((x) => x !== c))} />{CANALE_LABEL[c]}
                  </label>
                ))}
              </div>
            </div>
            <div className="flex items-end gap-4">
              <div className="flex-1 space-y-1.5"><Label>Bevanda</Label>
                <Select value={f.beverage || 'no'} onValueChange={(v) => setF({ ...f, beverage: v === 'no' ? '' : v })}>
                  <SelectTrigger aria-label="Tipo di bevanda"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="no">Non è una bevanda</SelectItem>
                    {Object.entries(BEVERAGE_LABEL).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}</SelectContent>
                </Select></div>
              <label className="flex items-center gap-1.5 pb-2 text-sm"><Checkbox checked={mescita} onCheckedChange={(v) => setMescita(!!v)} />A mescita</label>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Stagionalità</Label>
            <p className="text-xs text-muted-foreground">Nessun mese scelto = tutto l'anno. Fuori stagione il piatto non si ordina.</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Mesi di disponibilità">
              {MESI.map((m, i) => <button key={m} type="button" aria-pressed={mesi.includes(i + 1)} className={chip(mesi.includes(i + 1))}
                onClick={() => setMesi(mesi.includes(i + 1) ? mesi.filter((x) => x !== i + 1) : [...mesi, i + 1].sort((a, b) => a - b))}>{m}</button>)}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={salva.isPending}>{salva.isPending ? 'Salvataggio…' : prodotto ? 'Salva' : 'Crea'}</Button>
          </DialogFooter>
        </form>
        {/* Fuori dal form: i suoi pulsanti non devono inviare la scheda. */}
        {prodotto && (
          <div className="space-y-1.5 border-t border-border pt-4"><Label>Foto e schede</Label>
            <AllegatiSection entita="fb_prodotti" entitaId={prodotto.id} categorie={['foto', 'scheda tecnica']} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
