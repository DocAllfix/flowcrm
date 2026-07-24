import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { Navigate } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useUsers, useSetUserRole, useSetUserAttivo, useCreateUser } from '@/lib/queries/users'
import type { UserRole } from '@/types/app.types'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { BottoneScrittura } from '@/components/BottoneScrittura'

const RUOLI: UserRole[] = ['admin', 'manager', 'operatore']

export function UtentiPage() {
  const { isAdmin, userProfile } = useAuth()
  const { data: users, isLoading } = useUsers()
  const setRole = useSetUserRole()
  const setAttivo = useSetUserAttivo()
  const [nuovoOpen, setNuovoOpen] = useState(false)

  // Doppia barriera: la UI nasconde, la RLS nega comunque lato DB.
  if (!isAdmin) return <Navigate to="/" replace />

  async function changeRole(id: string, ruolo: UserRole) {
    try {
      await setRole.mutateAsync({ id, ruolo })
      toast.success('Ruolo aggiornato')
    } catch {
      toast.error('Impossibile aggiornare il ruolo')
    }
  }

  async function toggleAttivo(id: string, attivo: boolean) {
    try {
      await setAttivo.mutateAsync({ id, attivo })
      toast.success(attivo ? 'Account attivato' : 'Account disattivato')
    } catch {
      toast.error('Operazione non riuscita')
    }
  }

  return (
    <div>
      <PageHeader
        title="Gestione utenti"
        description="Ruoli e stato degli account del team."
        actions={
          <BottoneScrittura onClick={() => setNuovoOpen(true)}>
            <Plus className="h-4 w-4" /> Nuovo utente
          </BottoneScrittura>
        }
      />

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nome</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ruolo</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attivo</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Caricamento…</td></tr>
            )}
            {users?.map((u) => {
              const isSelf = u.id === userProfile?.id
              return (
                <tr key={u.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{u.nome} {u.cognome ?? ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      value={u.ruolo}
                      onValueChange={(v) => changeRole(u.id, v as UserRole)}
                      disabled={isSelf}
                    >
                      <SelectTrigger className="w-40 capitalize"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RUOLI.map((r) => (
                          <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={u.attivo}
                      onCheckedChange={(v) => toggleAttivo(u.id, v)}
                      disabled={isSelf}
                      aria-label="Attivo"
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Non puoi modificare il tuo stesso ruolo o stato.
      </p>

      <NuovoUtenteDialog open={nuovoOpen} onOpenChange={setNuovoOpen} />
    </div>
  )
}

function NuovoUtenteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const create = useCreateUser()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [cognome, setCognome] = useState('')
  const [ruolo, setRuolo] = useState<UserRole>('operatore')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await create.mutateAsync({ email, password, nome, cognome, ruolo })
      toast.success('Utente creato')
      onOpenChange(false)
      setEmail(''); setPassword(''); setNome(''); setCognome(''); setRuolo('operatore')
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Impossibile creare l\'utente')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Nuovo utente</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="u-nome">Nome *</Label>
              <Input id="u-nome" value={nome} onChange={(e) => setNome(e.target.value)} required autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="u-cognome">Cognome</Label>
              <Input id="u-cognome" value={cognome} onChange={(e) => setCognome(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-email">Email *</Label>
            <Input id="u-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="u-pwd">Password provvisoria *</Label>
            <Input id="u-pwd" type="text" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder="Almeno 8 caratteri" required />
          </div>
          <div className="space-y-1.5">
            <Label>Ruolo</Label>
            <Select value={ruolo} onValueChange={(v) => setRuolo(v as UserRole)}>
              <SelectTrigger className="capitalize"><SelectValue /></SelectTrigger>
              <SelectContent>
                {RUOLI.map((r) => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Annulla</Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Creazione…' : 'Crea utente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
