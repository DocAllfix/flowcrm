/**
 * Campi ricorrenti dei dialoghi dell'agenzia: il cliente (già in anagrafica
 * o nuovo, che nasce nel CRM al salvataggio), l'immobile, l'agente.
 */
import { supabase } from '@/lib/supabase'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CercaContatto, type ContattoScelto } from '@/components/condivisi/CercaContatto'
import { useAgenti, useImmobiliBrevi, etichettaImmobile } from '@/modules/immobiliare/queries'

export interface Cliente { testo: string; id: string | null; telefono: string; email: string }
export const clienteVuoto: Cliente = { testo: '', id: null, telefono: '', email: '' }

/** Il contatto del cliente: quello scelto, o uno nuovo nel CRM con nome, telefono ed email. */
export async function assicuraContatto(c: Cliente): Promise<string> {
  if (c.id) return c.id
  const nome = c.testo.trim()
  if (!nome) throw new Error('Scrivi il nome del cliente')
  const { data: auth } = await supabase.auth.getUser()
  const [primo, ...resto] = nome.split(/\s+/)
  const { data, error } = await supabase.from('contatti')
    .insert({ nome: primo, cognome: resto.join(' ') || null, telefono: c.telefono.trim() || null, email: c.email.trim() || null, created_by: auth.user!.id })
    .select('id').single()
  if (error) throw error
  return data.id
}

export function CampoCliente({ id, etichetta = 'Cliente', valore, onChange, recapiti = true }: {
  id: string; etichetta?: string; valore: Cliente; onChange: (c: Cliente) => void; recapiti?: boolean
}) {
  return (
    <>
      <div className="col-span-6 space-y-1.5"><Label htmlFor={id}>{etichetta} *</Label>
        <CercaContatto id={id} valore={valore.testo} contattoId={valore.id} segnaposto="Nome o telefono: se non c'è, nasce nel CRM"
          onTesto={(t) => onChange({ ...valore, testo: t, id: null })}
          onScegli={(k: ContattoScelto) => onChange({ testo: `${k.nome} ${k.cognome ?? ''}`.trim(), id: k.id, telefono: k.telefono ?? '', email: k.email ?? '' })} /></div>
      {recapiti && !valore.id && (
        <>
          <div className="col-span-3 space-y-1.5"><Label htmlFor={`${id}-tel`}>Telefono</Label><Input id={`${id}-tel`} type="tel" value={valore.telefono} onChange={(e) => onChange({ ...valore, telefono: e.target.value })} /></div>
          <div className="col-span-3 space-y-1.5"><Label htmlFor={`${id}-mail`}>Email</Label><Input id={`${id}-mail`} type="email" value={valore.email} onChange={(e) => onChange({ ...valore, email: e.target.value })} /></div>
        </>
      )}
    </>
  )
}

export function CampoImmobile({ id, valore, onChange, stati, etichetta = 'Immobile', nessuno, classe = 'col-span-6' }: {
  id: string; valore: string; onChange: (v: string) => void; stati?: readonly string[]; etichetta?: string; nessuno?: string; classe?: string
}) {
  const immobili = useImmobiliBrevi(stati ? { stato: stati } : undefined)
  return (
    <div className={`${classe} space-y-1.5`}><Label htmlFor={id}>{etichetta}</Label>
      <Select value={valore} onValueChange={onChange}><SelectTrigger id={id}><SelectValue placeholder={immobili.length ? 'Scegli l\'immobile' : 'Nessun immobile adatto'} /></SelectTrigger>
        <SelectContent>{nessuno && <SelectItem value="nessuno">{nessuno}</SelectItem>}{immobili.map((i) => <SelectItem key={i.id} value={i.id}>{etichettaImmobile(i)}</SelectItem>)}</SelectContent></Select></div>
  )
}

export function CampoAgente({ id, valore, onChange, classe = 'col-span-3' }: { id: string; valore: string; onChange: (v: string) => void; classe?: string }) {
  const { agenti } = useAgenti()
  return (
    <div className={`${classe} space-y-1.5`}><Label htmlFor={id}>Agente</Label>
      <Select value={valore} onValueChange={onChange}><SelectTrigger id={id}><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="nessuno">Non assegnato</SelectItem>{agenti.map((a) => <SelectItem key={a.agente_id!} value={a.agente_id!}>{a.nome}</SelectItem>)}</SelectContent></Select></div>
  )
}
