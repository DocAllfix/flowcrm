import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useUpdateProfile } from '@/lib/queries/users'
import { supabase } from '@/lib/supabase'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ProfiloPage() {
  const { userProfile } = useAuth()
  const updateProfile = useUpdateProfile()
  const [nome, setNome] = useState(userProfile?.nome ?? '')
  const [cognome, setCognome] = useState(userProfile?.cognome ?? '')
  const [pwd, setPwd] = useState('')
  const [pwd2, setPwd2] = useState('')
  const [savingPwd, setSavingPwd] = useState(false)

  if (!userProfile) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await updateProfile.mutateAsync({ id: userProfile!.id, nome: nome.trim(), cognome: cognome.trim() || null })
      toast.success('Profilo aggiornato')
    } catch (err) {
      toast.error((err as Error)?.message ?? 'Errore durante il salvataggio')
    }
  }

  async function handlePassword(e: FormEvent) {
    e.preventDefault()
    if (pwd.length < 8) { toast.error('La password deve avere almeno 8 caratteri'); return }
    if (pwd !== pwd2) { toast.error('Le due password non coincidono'); return }
    setSavingPwd(true)
    const { error } = await supabase.auth.updateUser({ password: pwd })
    setSavingPwd(false)
    if (error) { toast.error(error.message); return }
    setPwd(''); setPwd2('')
    toast.success('Password aggiornata')
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Il mio profilo" description="Gestisci i tuoi dati personali." />
      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <div className="space-y-1.5">
          <Label htmlFor="nome">Nome</Label>
          <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cognome">Cognome</Label>
          <Input id="cognome" value={cognome} onChange={(e) => setCognome(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Ruolo</Label>
          <p className="text-sm text-muted-foreground capitalize">{userProfile.ruolo}</p>
        </div>
        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? 'Salvataggio…' : 'Salva modifiche'}
        </Button>
      </form>

      <form
        onSubmit={handlePassword}
        className="mt-6 space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm"
      >
        <div>
          <h2 className="text-lg font-semibold text-foreground">Sicurezza</h2>
          <p className="text-sm text-muted-foreground">Cambia la password del tuo account.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pwd">Nuova password</Label>
          <Input id="pwd" type="password" autoComplete="new-password" value={pwd}
            onChange={(e) => setPwd(e.target.value)} placeholder="Almeno 8 caratteri" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pwd2">Conferma password</Label>
          <Input id="pwd2" type="password" autoComplete="new-password" value={pwd2}
            onChange={(e) => setPwd2(e.target.value)} />
        </div>
        <Button type="submit" variant="outline" disabled={savingPwd || !pwd || !pwd2}>
          {savingPwd ? 'Aggiornamento…' : 'Aggiorna password'}
        </Button>
      </form>
    </div>
  )
}
