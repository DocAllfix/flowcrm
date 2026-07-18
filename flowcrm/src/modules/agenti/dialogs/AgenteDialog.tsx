/**
 * AgenteDialog — fascicolo agente (documento §1): dati fiscali,
 * inquadramento, zone, collegamento all'utente per il Portale Agente.
 */
import { useState, useEffect, type FormEvent } from 'react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/hooks/useAuth'
import { useUsers } from '@/lib/queries/users'
import { TIPOLOGIA_LABEL } from '@/modules/agenti/stati'
import {
  useCreateAgente, useUpdateAgente, type Agente, type AgenteTipologia,
} from '@/modules/agenti/queries/agenti'

interface Props {
  open: boolean
  onOpenChange: (o: boolean) => void
  agente?: Agente
}

const oNull = (s: string) => (s.trim() === '' ? null : s.trim())

export function AgenteDialog({ open, onOpenChange, agente }: Props) {
  const { isAdmin } = useAuth()
  const create = useCreateAgente()
  const update = useUpdateAgente()
  const { data: utenti = [] } = useUsers()
  const isEdit = !!agente
  const pending = create.isPending || update.isPending

  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [ragioneSociale, setRagioneSociale] = useState('')
  const [cf, setCf] = useState('')
  const [piva, setPiva] = useState('')
  const [enasarco, setEnasarco] = useState('')
  const [cciaa, setCciaa] = useState('')
  const [tipologia, setTipologia] = useState<AgenteTipologia>('plurimandatario')
  const [stato, setStato] = useState('attivo')
  const [dataInizio, setDataInizio] = useState('')
  const [area, setArea] = useState('')
  const [zone, setZone] = useState('')
  const [settori, setSettori] = useState('')
  const [email, setEmail] = useState('')
  const [telefono, setTelefono] = useState('')
  const [iban, setIban] = useState('')
  const [userId, setUserId] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    if (agente) {
      setNome(agente.nome); setCognome(agente.cognome ?? '')
      setRagioneSociale(agente.ragione_sociale ?? '')
      setCf(agente.codice_fiscale ?? ''); setPiva(agente.piva ?? '')
      setEnasarco(agente.enasarco ?? ''); setCciaa(agente.cciaa ?? '')
      setTipologia(agente.tipologia); setStato(agente.stato)
      setDataInizio(agente.data_inizio ?? '')
      setArea(agente.area_geografica ?? ''); setZone(agente.zone ?? '')
      setSettori(agente.settori ?? '')
      setEmail(agente.email ?? ''); setTelefono(agente.telefono ?? '')
      setIban(agente.iban ?? ''); setUserId(agente.user_id ?? '')
      setNote(agente.note ?? '')
    } else {
      setNome(''); setCognome(''); setRagioneSociale(''); setCf(''); setPiva('')
      setEnasarco(''); setCciaa(''); setTipologia('plurimandatario'); setStato('attivo')
      setDataInizio(''); setArea(''); setZone(''); setSettori('')
      setEmail(''); setTelefono(''); setIban(''); setUserId(''); setNote('')
    }
  }, [open, agente])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!nome.trim()) { toast.error('Il nome è obbligatorio'); return }
    const values = {
      nome: nome.trim(), cognome: oNull(cognome),
      ragione_sociale: oNull(ragioneSociale),
      codice_fiscale: oNull(cf), piva: oNull(piva),
      enasarco: oNull(enasarco), cciaa: oNull(cciaa),
      tipologia, stato: stato as 'attivo',
      data_inizio: oNull(dataInizio),
      area_geografica: oNull(area), zone: oNull(zone), settori: oNull(settori),
      email: oNull(email), telefono: oNull(telefono), iban: oNull(iban),
      user_id: oNull(userId),
      note: oNull(note),
    }
    try {
      if (agente) {
        await update.mutateAsync({ id: agente.id, values })
        toast.success('Agente aggiornato')
      } else {
        await create.mutateAsync(values)
        toast.success('Agente registrato')
      }
      onOpenChange(false)
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Errore durante il salvataggio')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Modifica ${agente?.codice ?? ''}` : 'Nuovo agente'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ag-nome">Nome *</Label>
              <Input id="ag-nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ag-cognome">Cognome</Label>
              <Input id="ag-cognome" value={cognome} onChange={(e) => setCognome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ag-rs">Ragione sociale</Label>
              <Input id="ag-rs" value={ragioneSociale} onChange={(e) => setRagioneSociale(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ag-cf">Codice fiscale</Label>
              <Input id="ag-cf" value={cf} onChange={(e) => setCf(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ag-piva">P.IVA</Label>
              <Input id="ag-piva" value={piva} onChange={(e) => setPiva(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ag-ena">ENASARCO</Label>
              <Input id="ag-ena" value={enasarco} onChange={(e) => setEnasarco(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ag-cciaa">CCIAA</Label>
              <Input id="ag-cciaa" value={cciaa} onChange={(e) => setCciaa(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Tipologia</Label>
              <Select value={tipologia} onValueChange={(v) => setTipologia(v as AgenteTipologia)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TIPOLOGIA_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Stato</Label>
              <Select value={stato} onValueChange={setStato}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="attivo">Attivo</SelectItem>
                  <SelectItem value="sospeso">Sospeso</SelectItem>
                  <SelectItem value="cessato">Cessato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ag-inizio">Inizio collaborazione</Label>
              <Input id="ag-inizio" type="date" value={dataInizio}
                onChange={(e) => setDataInizio(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ag-area">Area geografica</Label>
              <Input id="ag-area" value={area} onChange={(e) => setArea(e.target.value)}
                placeholder="Es. Nord-Ovest" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ag-zone">Zone assegnate</Label>
              <Input id="ag-zone" value={zone} onChange={(e) => setZone(e.target.value)}
                placeholder="Es. Torino, Cuneo" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ag-settori">Settori</Label>
              <Input id="ag-settori" value={settori} onChange={(e) => setSettori(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ag-email">Email</Label>
              <Input id="ag-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ag-tel">Telefono</Label>
              <Input id="ag-tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ag-iban">IBAN</Label>
              <Input id="ag-iban" value={iban} onChange={(e) => setIban(e.target.value)} />
            </div>
          </div>

          {isAdmin && (
            <div className="space-y-1.5">
              <Label>Portale agente — utente collegato</Label>
              <Select value={userId || 'nessuno'} onValueChange={(v) => setUserId(v === 'nessuno' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Nessun accesso" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="nessuno">— Nessun accesso —</SelectItem>
                  {utenti.filter((u) => u.attivo).map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.nome} {u.cognome ?? ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                L'utente collegato entra nel portale e vede SOLO i propri dati (clienti,
                visite, ordini, provvigioni, spese) — lo impone il database.
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="ag-note">Note</Label>
            <Textarea id="ag-note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Salvataggio…' : isEdit ? 'Salva' : 'Registra'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
