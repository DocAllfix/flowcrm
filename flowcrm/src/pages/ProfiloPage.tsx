import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/useAuth'
import { useUpdateProfile } from '@/lib/queries/users'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ProfiloPage() {
  const { userProfile } = useAuth()
  const updateProfile = useUpdateProfile()
  const [nome, setNome] = useState(userProfile?.nome ?? '')
  const [cognome, setCognome] = useState(userProfile?.cognome ?? '')

  if (!userProfile) return null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    try {
      await updateProfile.mutateAsync({ id: userProfile!.id, nome: nome.trim(), cognome: cognome.trim() || null })
      toast.success('Profilo aggiornato')
    } catch {
      toast.error('Errore durante il salvataggio')
    }
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
    </div>
  )
}
