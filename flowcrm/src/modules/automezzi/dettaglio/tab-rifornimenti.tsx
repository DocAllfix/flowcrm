import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Fuel, Upload } from 'lucide-react'
import { fmtImporto, fmtData } from '@/modules/automezzi/stati'
import { parseCsv } from '@/lib/csv'
import { toast } from 'sonner'
import { useFigliAutomezzo, useCreaFiglioAutomezzo, useEliminaFiglioAutomezzo, type Automezzo, type AutomezzoRifornimento } from '@/modules/automezzi/queries/automezzi'
import { useState, useRef, type FormEvent } from 'react'
import { BtnElimina, card, fmtKm } from '@/modules/automezzi/dettaglio/comuni'

export // ── Rifornimenti ─────────────────────────────────────────────────
function TabRifornimenti({ mezzo }: { mezzo: Automezzo }) {
  const { data: rifornimenti = [] } = useFigliAutomezzo<AutomezzoRifornimento>(mezzo.id, 'automezzi_rifornimenti')
  const crea = useCreaFiglioAutomezzo()
  const elimina = useEliminaFiglioAutomezzo()
  const [litri, setLitri] = useState('')
  const [costo, setCosto] = useState('')
  const [km, setKm] = useState('')
  const [fornitore, setFornitore] = useState('')
  const [carta, setCarta] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [importando, setImportando] = useState(false)

  /** Import CSV fuel card: colonne riconosciute per nome (data, litri,
   *  costo/importo, km, fornitore, carta) — separatore , o ; */
  async function importaCsv(file: File) {
    setImportando(true)
    try {
      const testo = await file.text()
      const primaRiga = testo.split('\n')[0] ?? ''
      const sep = (primaRiga.match(/;/g)?.length ?? 0) > (primaRiga.match(/,/g)?.length ?? 0) ? ';' : ','
      const { headers, rows } = parseCsv(testo, sep)
      const trova = (nomi: string[]) =>
        headers.find((h) => nomi.some((n) => h.toLowerCase().includes(n)))
      const hData = trova(['data']); const hLitri = trova(['litri', 'liter'])
      const hCosto = trova(['costo', 'importo', 'amount'])
      const hKm = trova(['km', 'chilometr']); const hForn = trova(['fornitore', 'gestore'])
      const hCarta = trova(['carta', 'card'])
      if (!hLitri || !hCosto) {
        toast.error('CSV non riconosciuto: servono almeno le colonne litri e costo')
        return
      }
      let ok = 0; let scartate = 0
      for (const r of rows) {
        const litriN = Number(String(r[hLitri] ?? '').replace(',', '.'))
        const costoN = Number(String(r[hCosto] ?? '').replace(',', '.'))
        if (Number.isNaN(litriN) || Number.isNaN(costoN)) { scartate++; continue }
        const dataRaw = hData ? String(r[hData] ?? '').trim() : ''
        const dataIso = /^\d{2}\/\d{2}\/\d{4}$/.test(dataRaw)
          ? dataRaw.split('/').reverse().join('-')
          : /^\d{4}-\d{2}-\d{2}/.test(dataRaw) ? dataRaw.slice(0, 10) : null
        await crea.mutateAsync({
          automezzoId: mezzo.id, tabella: 'automezzi_rifornimenti',
          values: {
            litri: litriN, costo: costoN,
            data: dataIso ?? new Date().toISOString().slice(0, 10),
            km: hKm && r[hKm] !== '' ? Number(String(r[hKm] ?? '').replace('.', '')) || null : null,
            fornitore: hForn ? String(r[hForn] ?? '').trim() || null : null,
            carta: hCarta ? String(r[hCarta] ?? '').trim() || null : null,
          },
        })
        ok++
      }
      toast.success(`Import fuel card: ${ok} rifornimenti importati${scartate ? `, ${scartate} righe scartate` : ''}`)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setImportando(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className={card}>
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Rifornimenti</h3>
        <div>
          <input ref={fileRef} type="file" accept=".csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void importaCsv(f) }} />
          <Button size="sm" variant="outline" disabled={importando}
            onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> {importando ? 'Import…' : 'Importa CSV fuel card'}
          </Button>
        </div>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        I km inseriti aggiornano automaticamente il contachilometri del mezzo.
      </p>
      {rifornimenti.map((r) => (
        <div key={r.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <Fuel className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{fmtData(r.data)}</span>
          <span className="flex-1 text-foreground">
            {Number(r.litri)} l
            {(r.fornitore || r.carta) && (
              <span className="ml-2 text-xs text-muted-foreground">
                {[r.fornitore, r.carta && `carta ${r.carta}`].filter(Boolean).join(' · ')}
              </span>
            )}
          </span>
          <span className="font-medium text-foreground">{fmtImporto(Number(r.costo))}</span>
          {r.km != null && <span className="text-xs text-muted-foreground">{fmtKm(r.km)}</span>}
          <BtnElimina onClick={() => elimina.mutate({ automezzoId: mezzo.id, tabella: 'automezzi_rifornimenti', id: r.id })} />
        </div>
      ))}
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault()
          const l = Number(litri); const c = Number(costo)
          if (!litri || Number.isNaN(l) || !costo || Number.isNaN(c)) {
            toast.error('Litri e costo obbligatori'); return
          }
          crea.mutate({
            automezzoId: mezzo.id, tabella: 'automezzi_rifornimenti',
            values: {
              litri: l, costo: c, km: km === '' ? null : Number(km),
              fornitore: fornitore.trim() || null, carta: carta.trim() || null,
            },
          }, {
            onSuccess: () => { setLitri(''); setCosto(''); setKm('') },
            onError: (err) => toast.error((err as Error).message),
          })
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <div className="w-24 space-y-1">
          <Label>Litri</Label>
          <Input type="number" step="0.01" value={litri} onChange={(e) => setLitri(e.target.value)} />
        </div>
        <div className="w-28 space-y-1">
          <Label>Costo (€)</Label>
          <Input type="number" step="0.01" value={costo} onChange={(e) => setCosto(e.target.value)} />
        </div>
        <div className="w-28 space-y-1">
          <Label>Km attuali</Label>
          <Input type="number" value={km} onChange={(e) => setKm(e.target.value)}
            placeholder={String(mezzo.km_attuali)} />
        </div>
        <div className="w-32 space-y-1">
          <Label>Fornitore</Label>
          <Input value={fornitore} onChange={(e) => setFornitore(e.target.value)} placeholder="Es. Q8" />
        </div>
        <div className="w-28 space-y-1">
          <Label>Carta</Label>
          <Input value={carta} onChange={(e) => setCarta(e.target.value)} />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Registra</Button>
      </form>
    </div>
  )
}
