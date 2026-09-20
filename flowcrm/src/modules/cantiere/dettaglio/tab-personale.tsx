import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, HardHat } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useFigliCantiere, useCreaFiglioCantiere, useEliminaFiglioCantiere, type Cantiere, type CantierePersonale, type CantierePresenza } from '@/modules/cantiere/queries/cantieri'
import { useOrganizzazioni } from '@/lib/queries/organizzazioni'
import { useState, type FormEvent } from 'react'
import { useDipendentiHr, BtnElimina, card } from '@/modules/cantiere/dettaglio/comuni'

export // ── Personale + presenze ─────────────────────────────────────────
function TabPersonale({ cantiere }: { cantiere: Cantiere }) {
  const { isManager } = useAuth()
  const { data: personale = [] } = useFigliCantiere<CantierePersonale>(cantiere.id, 'cantiere_personale')
  const { data: presenze = [] } = useFigliCantiere<CantierePresenza>(cantiere.id, 'cantiere_presenze')
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const { data: dipendentiHr = [] } = useDipendentiHr(isManager)
  const crea = useCreaFiglioCantiere()
  const elimina = useEliminaFiglioCantiere()
  const [nominativo, setNominativo] = useState('')
  const [dipendenteId, setDipendenteId] = useState('')
  const [ruolo, setRuolo] = useState('')
  const [impresaId, setImpresaId] = useState('')
  const [dpi, setDpi] = useState('')
  const [oreDefault, setOreDefault] = useState('8')

  const oggi = new Date().toISOString().slice(0, 10)
  const presentiOggi = new Set(presenze.filter((p) => p.data === oggi).map((p) => p.personale_id))

  async function handleAggiungi(e: FormEvent) {
    e.preventDefault()
    if (!nominativo.trim() && !dipendenteId) {
      toast.error('Inserisci il nominativo o scegli un dipendente'); return
    }
    try {
      await crea.mutateAsync({
        cantiereId: cantiere.id, tabella: 'cantiere_personale',
        values: {
          nominativo: nominativo.trim() || null,
          dipendente_id: dipendenteId || null,
          ruolo: ruolo.trim() || null,
          impresa_id: impresaId || null,
          dpi_assegnati: dpi.trim() || null,
        },
      })
      setNominativo(''); setDipendenteId(''); setRuolo(''); setImpresaId(''); setDpi('')
    } catch (err) { toast.error((err as Error).message) }
  }

  function segnaPresenza(p: CantierePersonale) {
    const ore = Number(oreDefault) || 8
    crea.mutate({
      cantiereId: cantiere.id, tabella: 'cantiere_presenze',
      values: { personale_id: p.id, data: oggi, ore },
    }, {
      onSuccess: () => toast.success(`Presenza registrata (${ore} ore)`),
      onError: (err) => toast.error((err as Error).message),
    })
  }

  const oreTotali = presenze.reduce((s, p) => s + Number(p.ore), 0)

  return (
    <div className={card}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Personale di cantiere</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{oreTotali} ore registrate</span>
          <span>·</span>
          <label className="flex items-center gap-1">
            Ore presenza
            <Input type="number" min="1" max="24" step="0.5" value={oreDefault}
              onChange={(e) => setOreDefault(e.target.value)} className="h-7 w-16 text-xs" />
          </label>
        </div>
      </div>
      {personale.map((p) => (
        <div key={p.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
          <HardHat className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <p className="font-medium text-foreground">
              {p.dipendente ? `${p.dipendente.nome} ${p.dipendente.cognome ?? ''}` : p.nominativo}
            </p>
            <p className="text-xs text-muted-foreground">
              {[p.ruolo, p.impresa?.ragione_sociale, p.dpi_assegnati && `DPI: ${p.dpi_assegnati}`]
                .filter(Boolean).join(' · ') || '—'}
            </p>
          </div>
          {presentiOggi.has(p.id) ? (
            <Badge tone="success">Presente oggi</Badge>
          ) : (
            <Button size="sm" variant="outline" onClick={() => segnaPresenza(p)}>
              Segna presente
            </Button>
          )}
          <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_personale', id: p.id })} />
        </div>
      ))}
      <form onSubmit={handleAggiungi} className="mt-3 flex flex-wrap items-end gap-2">
        {isManager && dipendentiHr.length > 0 && (
          <div className="w-48 space-y-1">
            <Label>Dipendente (HR)</Label>
            <Select value={dipendenteId || 'esterno'}
              onValueChange={(v) => setDipendenteId(v === 'esterno' ? '' : v)}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="esterno">— Esterno —</SelectItem>
                {dipendentiHr.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.nome} {d.cognome ?? ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div className="min-w-40 flex-1 space-y-1">
          <Label>Nominativo</Label>
          <Input value={nominativo} onChange={(e) => setNominativo(e.target.value)} placeholder="Nome e cognome" />
        </div>
        <div className="w-32 space-y-1">
          <Label>Ruolo</Label>
          <Input value={ruolo} onChange={(e) => setRuolo(e.target.value)} placeholder="Es. Operaio" />
        </div>
        <div className="w-44 space-y-1">
          <Label>Impresa</Label>
          <Select value={impresaId || 'interna'} onValueChange={(v) => setImpresaId(v === 'interna' ? '' : v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="interna">— Interno —</SelectItem>
              {organizzazioni.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40 space-y-1">
          <Label>DPI assegnati</Label>
          <Input value={dpi} onChange={(e) => setDpi(e.target.value)} placeholder="Casco, imbrago…" />
        </div>
        <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Aggiungi</Button>
      </form>
    </div>
  )
}
