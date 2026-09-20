import type { GaraRequisitoTipo } from '@/modules/gare/queries/gare'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Pencil } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { fmtData } from '@/modules/gare/stati'
import { toast } from 'sonner'
import { useState } from 'react'
import { useUpdateGara, type Gara } from '@/modules/gare/queries/gare'

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

export // ── Esito (§13): graduatoria, aggiudicatario, ricorsi ────────────
function SezioneEsito({ gara }: { gara: Gara }) {
  const update = useUpdateGara()
  const [editing, setEditing] = useState(false)
  const [posizione, setPosizione] = useState(
    gara.posizione_graduatoria != null ? String(gara.posizione_graduatoria) : '')
  const [aggiudicatario, setAggiudicatario] = useState(gara.aggiudicatario ?? '')
  const [ricorso, setRicorso] = useState(gara.ricorso)
  const [noteEsito, setNoteEsito] = useState(gara.note_esito ?? '')
  const [protocollo, setProtocollo] = useState(gara.protocollo_invio ?? '')

  async function salva() {
    try {
      await update.mutateAsync({
        id: gara.id,
        values: {
          posizione_graduatoria: posizione === '' ? null : Number(posizione),
          aggiudicatario: aggiudicatario.trim() || null,
          ricorso,
          note_esito: noteEsito.trim() || null,
          protocollo_invio: protocollo.trim() || null,
        },
      })
      toast.success('Esito aggiornato')
      setEditing(false)
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className={card}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Presentazione ed esito</h3>
        {!editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="h-3.5 w-3.5" /> Registra esito
          </Button>
        )}
      </div>
      {!editing ? (
        <>
          <Riga label="Presentata il">{gara.presentata_at ? fmtData(gara.presentata_at) : '—'}</Riga>
          <Riga label="Protocollo invio">{gara.protocollo_invio ?? '—'}</Riga>
          {gara.esito_at && <Riga label="Esito il">{fmtData(gara.esito_at)}</Riga>}
          <Riga label="Posizione in graduatoria">
            {gara.posizione_graduatoria != null ? `${gara.posizione_graduatoria}°` : '—'}
          </Riga>
          <Riga label="Aggiudicatario">{gara.aggiudicatario ?? '—'}</Riga>
          <Riga label="Ricorso">{gara.ricorso ? 'In corso' : 'No'}</Riga>
          {gara.note_esito && <p className="mt-2 text-sm text-muted-foreground">{gara.note_esito}</p>}
        </>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="esito-pos">Posizione in graduatoria</Label>
              <Input id="esito-pos" type="number" min="1" value={posizione} onChange={(e) => setPosizione(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="esito-agg">Aggiudicatario</Label>
              <Input id="esito-agg" value={aggiudicatario} onChange={(e) => setAggiudicatario(e.target.value)}
                placeholder="Chi si è aggiudicato la gara" />
            </div>
            <div className="space-y-1">
              <Label htmlFor="esito-prot">Protocollo invio</Label>
              <Input id="esito-prot" value={protocollo} onChange={(e) => setProtocollo(e.target.value)} />
            </div>
            <label className="flex items-end gap-2 pb-2 text-sm text-muted-foreground">
              <Checkbox checked={ricorso} onCheckedChange={(v) => setRicorso(v === true)} />
              Ricorso in corso
            </label>
          </div>
          <div className="space-y-1">
            <Label>Note esito (soccorso istruttorio, integrazioni…)</Label>
            <Textarea value={noteEsito} onChange={(e) => setNoteEsito(e.target.value)} rows={2} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void salva()} disabled={update.isPending}>Salva esito</Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Annulla</Button>
          </div>
        </div>
      )}
    </div>
  )
}


export const ATI_RUOLI = [
  { value: 'mandataria', label: 'Mandataria' },
  { value: 'mandante', label: 'Mandante' },
  { value: 'consorziata', label: 'Consorziata' },
]











export const CAUZIONE_TIPI = [
  { value: 'provvisoria', label: 'Cauzione provvisoria' },
  { value: 'definitiva', label: 'Cauzione definitiva' },
  { value: 'fideiussione', label: 'Polizza fideiussoria' },
  { value: 'polizza_assicurativa', label: 'Garanzia assicurativa' },
]

export const CRITERI_GO_NO_GO = [
  'Compatibilità con l\'attività aziendale', 'Requisiti economici', 'Requisiti tecnici',
  'Requisiti SOA', 'Capacità finanziaria', 'Disponibilità delle risorse',
  'Marginalità prevista', 'Livello di concorrenza', 'Rischi contrattuali', 'Interesse strategico',
]

export const REQUISITO_TIPI: { value: GaraRequisitoTipo; label: string }[] = [
  { value: 'generale', label: 'Generale' },
  { value: 'economico_finanziario', label: 'Economico-finanziario' },
  { value: 'tecnico_professionale', label: 'Tecnico-professionale' },
  { value: 'certificazione', label: 'Certificazione ISO' },
  { value: 'soa', label: 'Attestazione SOA' },
  { value: 'referenze', label: 'Referenze' },
  { value: 'personale', label: 'Personale qualificato' },
  { value: 'attrezzature', label: 'Attrezzature' },
  { value: 'altro', label: 'Altro' },
]

export const RUOLI_TEAM = [
  'Responsabile di gara', 'Ufficio tecnico', 'Ufficio amministrativo',
  'Direzione commerciale', 'Consulente esterno', 'Progettista', 'Legale',
]