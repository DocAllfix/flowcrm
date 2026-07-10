import { toast } from 'sonner'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useUsers, useSetUserRole, useSetUserAttivo } from '@/lib/queries/users'
import type { UserRole } from '@/types/app.types'
import { PageHeader } from '@/components/ui/page-header'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'

const RUOLI: UserRole[] = ['admin', 'manager', 'operatore']

export function UtentiPage() {
  const { isAdmin, userProfile } = useAuth()
  const { data: users, isLoading } = useUsers()
  const setRole = useSetUserRole()
  const setAttivo = useSetUserAttivo()

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
        La creazione di nuovi utenti avverrà tramite invito (Edge Function dedicata, fase successiva).
        Non puoi modificare il tuo stesso ruolo o stato.
      </p>
    </div>
  )
}
