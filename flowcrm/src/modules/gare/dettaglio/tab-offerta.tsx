import { ApprovalSection } from '@/components/ApprovalSection'
import { Badge } from '@/components/ui/badge'
import { Building2, Landmark, Trash2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { fmtImporto, fmtData } from '@/modules/gare/stati'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useOrganizzazioni } from '@/lib/queries/organizzazioni'
import { useState } from 'react'
import { useUpdateGara, useGaraPartecipanti, useGaraCauzioni, useGaraOfferta, useSalvaGaraOfferta, useCreaFiglioGara, useAggiornaFiglioGara, useEliminaFiglioGara, type Gara } from '@/modules/gare/queries/gare'
import { card, ATI_RUOLI, CAUZIONE_TIPI } from '@/modules/gare/dettaglio/comuni'

export // ── Offerta (economica manager-only + ATI + cauzioni) ────────────
function TabOfferta({ gara }: { gara: Gara }) {
  const { isManager } = useAuth()
  const { data: offerta } = useGaraOfferta(gara.id)
  const salva = useSalvaGaraOfferta()
  const { data: partecipanti = [] } = useGaraPartecipanti(gara.id)
  const { data: cauzioni = [] } = useGaraCauzioni(gara.id)
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const crea = useCreaFiglioGara()
  const elimina = useEliminaFiglioGara()
  const aggiornaFiglio = useAggiornaFiglioGara()
  const update = useUpdateGara()

  const [ribasso, setRibasso] = useState<string | null>(null)
  const [importoOfferto, setImportoOfferto] = useState<string | null>(null)
  const [manodopera, setManodopera] = useState<string | null>(null)
  const [marginalita, setMarginalita] = useState<string | null>(null)
  const [computo, setComputo] = useState<string | null>(null)
  const [oneriOfferta, setOneriOfferta] = useState<string | null>(null)
  const [noteTecnica, setNoteTecnica] = useState<string | null>(null)
  const [protocollo, setProtocollo] = useState<string | null>(null)
  // ATI
  const [orgId, setOrgId] = useState('')
  const [ruoloAti, setRuoloAti] = useState('mandante')
  const [quota, setQuota] = useState('')
  // Cauzioni
  const [tipoCauzione, setTipoCauzione] = useState('provvisoria')
  const [importoCauzione, setImportoCauzione] = useState('')
  const [garante, setGarante] = useState('')
  const [scadenzaCauzione, setScadenzaCauzione] = useState('')

  const v = {
    ribasso: ribasso ?? (offerta?.ribasso_percentuale != null ? String(offerta.ribasso_percentuale) : ''),
    importoOfferto: importoOfferto ?? (offerta?.importo_offerto != null ? String(offerta.importo_offerto) : ''),
    manodopera: manodopera ?? (offerta?.costi_manodopera != null ? String(offerta.costi_manodopera) : ''),
    marginalita: marginalita ?? (offerta?.marginalita_percentuale != null ? String(offerta.marginalita_percentuale) : ''),
    computo: computo ?? (offerta?.computo_importo != null ? String(offerta.computo_importo) : ''),
    oneriOfferta: oneriOfferta ?? (offerta?.oneri_sicurezza != null ? String(offerta.oneri_sicurezza) : ''),
    noteTecnica: noteTecnica ?? (gara.offerta_tecnica_note ?? ''),
    protocollo: protocollo ?? (gara.protocollo_invio ?? ''),
  }

  async function salvaOfferta() {
    const num = (s: string) => (s.trim() === '' ? null : Number(s))
    try {
      await salva.mutateAsync({
        garaId: gara.id,
        values: {
          ribasso_percentuale: num(v.ribasso),
          importo_offerto: num(v.importoOfferto),
          costi_manodopera: num(v.manodopera),
          marginalita_percentuale: num(v.marginalita),
          computo_importo: num(v.computo),
          oneri_sicurezza: num(v.oneriOfferta),
        },
      })
      await update.mutateAsync({
        id: gara.id,
        values: { offerta_tecnica_note: v.noteTecnica.trim() || null, protocollo_invio: v.protocollo.trim() || null },
      })
      toast.success('Offerta salvata')
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="space-y-4">
      {isManager ? (
        <div className={card}>
          <h3 className="mb-3 text-sm font-semibold text-foreground">Offerta economica (riservata)</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="off-computo">Computo metrico (€)</Label>
              <Input id="off-computo" type="number" step="0.01" value={v.computo} onChange={(e) => setComputo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="off-ribasso">Ribasso (%)</Label>
              <Input id="off-ribasso" type="number" step="0.001" value={v.ribasso} onChange={(e) => setRibasso(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="off-importo">Importo offerto (€)</Label>
              <Input id="off-importo" type="number" step="0.01" value={v.importoOfferto} onChange={(e) => setImportoOfferto(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="off-manodopera">Costi manodopera (€)</Label>
              <Input id="off-manodopera" type="number" step="0.01" value={v.manodopera} onChange={(e) => setManodopera(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="off-oneri">Oneri sicurezza offerta (€)</Label>
              <Input id="off-oneri" type="number" step="0.01" value={v.oneriOfferta} onChange={(e) => setOneriOfferta(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="off-marg">Marginalità prevista (%)</Label>
              <Input id="off-marg" type="number" step="0.01" value={v.marginalita} onChange={(e) => setMarginalita(e.target.value)} />
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Offerta tecnica — sintesi/capitoli</Label>
              <Textarea rows={2} value={v.noteTecnica} onChange={(e) => setNoteTecnica(e.target.value)}
                placeholder="Struttura capitoli, migliorie offerte… (gli elaborati vanno nei Documenti, archivio Offerta)" />
            </div>
            <div className="space-y-1.5">
              <Label>Protocollo di invio</Label>
              <Input value={v.protocollo} onChange={(e) => setProtocollo(e.target.value)}
                placeholder="Ricevuta/protocollo della piattaforma" />
            </div>
          </div>
          <div className="mt-4">
            <Button onClick={() => void salvaOfferta()} disabled={salva.isPending}>
              {salva.isPending ? 'Salvataggio…' : 'Salva offerta'}
            </Button>
          </div>
        </div>
      ) : (
        <div className={card}>
          <p className="text-sm text-muted-foreground">
            L'offerta economica (ribasso, margini) è riservata ad admin e manager.
          </p>
        </div>
      )}

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">ATI / RTI / Consorzio</h3>
        {partecipanti.length === 0 && (
          <p className="py-1 text-sm text-muted-foreground">Partecipazione singola. Aggiungi i partner per una partecipazione aggregata.</p>
        )}
        {partecipanti.map((p) => (
          <div key={p.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 font-medium text-foreground">{p.organizzazione?.ragione_sociale ?? '—'}</span>
            <Badge tone={p.ruolo === 'mandataria' ? 'primary' : 'neutral'}>
              {ATI_RUOLI.find((r) => r.value === p.ruolo)?.label}
            </Badge>
            {p.quota_percentuale != null && (
              <span className="text-xs text-muted-foreground">{Number(p.quota_percentuale)}%</span>
            )}
            <button
              onClick={() => elimina.mutate({ garaId: gara.id, tabella: 'gare_partecipanti', id: p.id })}
              className="rounded-md p-1 text-muted-foreground hover:text-destructive" aria-label="Rimuovi">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!orgId) { toast.error('Scegli il partner'); return }
            crea.mutate({
              garaId: gara.id, tabella: 'gare_partecipanti',
              values: { organizzazione_id: orgId, ruolo: ruoloAti, quota_percentuale: quota === '' ? null : Number(quota) },
            }, { onSuccess: () => { setOrgId(''); setQuota('') }, onError: (err) => toast.error((err as Error).message) })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-48 flex-1 space-y-1">
            <Label>Partner</Label>
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger><SelectValue placeholder="Organizzazione…" /></SelectTrigger>
              <SelectContent>
                {organizzazioni.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40 space-y-1">
            <Label>Ruolo</Label>
            <Select value={ruoloAti} onValueChange={setRuoloAti}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ATI_RUOLI.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-24 space-y-1">
            <Label>Quota %</Label>
            <Input type="number" min="0" max="100" value={quota} onChange={(e) => setQuota(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Aggiungi</Button>
        </form>
      </div>

      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Cauzioni e garanzie</h3>
        {cauzioni.map((c) => (
          <div key={c.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <Landmark className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-foreground">
              {CAUZIONE_TIPI.find((t) => t.value === c.tipo)?.label}
              {c.garante && <span className="text-muted-foreground"> · {c.garante}</span>}
            </span>
            <span className="font-medium text-foreground">{fmtImporto(Number(c.importo))}</span>
            {c.data_scadenza && (
              <span className="text-xs text-muted-foreground">scad. {fmtData(c.data_scadenza)}</span>
            )}
            {c.restituita ? (
              <Badge tone="success">Restituita</Badge>
            ) : (
              <Button size="sm" variant="ghost" className="text-xs"
                onClick={() => aggiornaFiglio.mutate({
                  garaId: gara.id, tabella: 'gare_cauzioni', id: c.id, values: { restituita: true },
                })}>
                Segna restituita
              </Button>
            )}
            <button
              onClick={() => elimina.mutate({ garaId: gara.id, tabella: 'gare_cauzioni', id: c.id })}
              className="rounded-md p-1 text-muted-foreground hover:text-destructive" aria-label="Rimuovi">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const imp = Number(importoCauzione)
            if (!importoCauzione || Number.isNaN(imp)) { toast.error('Importo non valido'); return }
            crea.mutate({
              garaId: gara.id, tabella: 'gare_cauzioni',
              values: {
                tipo: tipoCauzione, importo: imp, garante: garante.trim() || null,
                data_scadenza: scadenzaCauzione || null,
              },
            }, {
              onSuccess: () => { setImportoCauzione(''); setGarante(''); setScadenzaCauzione('') },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="w-48 space-y-1">
            <Label>Tipo</Label>
            <Select value={tipoCauzione} onValueChange={setTipoCauzione}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CAUZIONE_TIPI.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-32 space-y-1">
            <Label>Importo (€)</Label>
            <Input type="number" step="0.01" value={importoCauzione} onChange={(e) => setImportoCauzione(e.target.value)} />
          </div>
          <div className="min-w-36 flex-1 space-y-1">
            <Label>Garante</Label>
            <Input value={garante} onChange={(e) => setGarante(e.target.value)} placeholder="Banca/assicurazione" />
          </div>
          <div className="w-40 space-y-1">
            <Label>Scadenza</Label>
            <Input type="date" value={scadenzaCauzione} onChange={(e) => setScadenzaCauzione(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Aggiungi</Button>
        </form>
      </div>

      <ApprovalSection
        modulo="gare" entita="gare" entitaId={gara.id}
        tipiRichiesta={[
          { value: 'offerta_tecnica', label: 'Approvazione offerta tecnica' },
          { value: 'offerta_economica', label: 'Approvazione offerta economica' },
          { value: 'presentazione', label: 'Autorizzazione alla presentazione' },
          { value: 'accettazione_aggiudicazione', label: 'Accettazione aggiudicazione' },
        ]}
        azioneUrl={`/gare/${gara.id}`}
      />
    </div>
  )
}
