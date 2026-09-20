import { ApprovalSection } from '@/components/ApprovalSection'
import { Building2, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fmtImporto } from '@/modules/cantiere/stati'
import { toast } from 'sonner'
import { useFigliCantiere, useCreaFiglioCantiere, useEliminaFiglioCantiere, type Cantiere, type CantiereImpresa } from '@/modules/cantiere/queries/cantieri'
import { useOrganizzazioni } from '@/lib/queries/organizzazioni'
import { useState } from 'react'
import { BtnElimina, card } from '@/modules/cantiere/dettaglio/comuni'

export // ── Imprese e subappaltatori ─────────────────────────────────────
function TabImprese({ cantiere }: { cantiere: Cantiere }) {
  const { data: imprese = [] } = useFigliCantiere<CantiereImpresa>(cantiere.id, 'cantiere_imprese')
  const { data: organizzazioni = [] } = useOrganizzazioni()
  const crea = useCreaFiglioCantiere()
  const elimina = useEliminaFiglioCantiere()
  const [orgId, setOrgId] = useState('')
  const [lavorazioni, setLavorazioni] = useState('')
  const [importo, setImporto] = useState('')
  const [referente, setReferente] = useState('')

  return (
    <div className="space-y-4">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Imprese e subappaltatori</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          DURC, SOA e assicurazioni si caricano nei Documenti e si monitorano nelle Scadenze.
        </p>
        {imprese.map((i) => (
          <div key={i.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1">
              <p className="font-medium text-foreground">{i.organizzazione?.ragione_sociale ?? '—'}</p>
              <p className="text-xs text-muted-foreground">
                {[i.lavorazioni, i.referente && `ref. ${i.referente}`].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            {i.importo_affidato != null && (
              <span className="text-sm font-medium text-foreground">{fmtImporto(Number(i.importo_affidato))}</span>
            )}
            <BtnElimina onClick={() => elimina.mutate({ cantiereId: cantiere.id, tabella: 'cantiere_imprese', id: i.id })} />
          </div>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!orgId) { toast.error("Scegli l'impresa"); return }
            crea.mutate({
              cantiereId: cantiere.id, tabella: 'cantiere_imprese',
              values: {
                organizzazione_id: orgId, lavorazioni: lavorazioni.trim() || null,
                importo_affidato: importo === '' ? null : Number(importo),
                referente: referente.trim() || null,
              },
            }, {
              onSuccess: () => { setOrgId(''); setLavorazioni(''); setImporto(''); setReferente('') },
              onError: (err) => toast.error((err as Error).message),
            })
          }}
          className="mt-3 flex flex-wrap items-end gap-2"
        >
          <div className="min-w-48 flex-1 space-y-1">
            <Label>Impresa</Label>
            <Select value={orgId} onValueChange={setOrgId}>
              <SelectTrigger><SelectValue placeholder="Organizzazione…" /></SelectTrigger>
              <SelectContent>
                {organizzazioni.map((o) => <SelectItem key={o.id} value={o.id}>{o.ragione_sociale}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="min-w-40 flex-1 space-y-1">
            <Label>Lavorazioni</Label>
            <Input value={lavorazioni} onChange={(e) => setLavorazioni(e.target.value)}
              placeholder="Es. Impianti elettrici" />
          </div>
          <div className="w-36 space-y-1">
            <Label>Importo (€)</Label>
            <Input type="number" step="0.01" value={importo} onChange={(e) => setImporto(e.target.value)} />
          </div>
          <div className="w-40 space-y-1">
            <Label>Referente</Label>
            <Input value={referente} onChange={(e) => setReferente(e.target.value)} />
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Aggiungi</Button>
        </form>
      </div>

      <ApprovalSection
        modulo="cantiere" entita="cantieri" entitaId={cantiere.id}
        tipiRichiesta={[
          { value: 'acquisto', label: 'Approvazione acquisto' },
          { value: 'variante', label: 'Approvazione variante' },
          { value: 'sal', label: 'Approvazione SAL' },
          { value: 'documento', label: 'Approvazione documento' },
          { value: 'ordine', label: 'Approvazione ordine' },
        ]}
        azioneUrl={`/cantieri/${cantiere.id}`}
      />
    </div>
  )
}
