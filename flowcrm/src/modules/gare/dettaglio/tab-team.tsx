import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { useGaraTeam, useCreaFiglioGara, useEliminaFiglioGara, type Gara } from '@/modules/gare/queries/gare'
import { useState, type FormEvent } from 'react'
import { useUsers } from '@/lib/queries/users'
import { card, RUOLI_TEAM } from '@/modules/gare/dettaglio/comuni'

export // ── Team ─────────────────────────────────────────────────────────
function TabTeam({ gara }: { gara: Gara }) {
  const { data: team = [] } = useGaraTeam(gara.id)
  const { data: utenti = [] } = useUsers()
  const crea = useCreaFiglioGara()
  const elimina = useEliminaFiglioGara()
  const [userId, setUserId] = useState('')
  const [ruolo, setRuolo] = useState(RUOLI_TEAM[0])

  const disponibili = utenti.filter((u) => u.attivo && !team.some((m) => m.user_id === u.id))

  async function handleAggiungi(e: FormEvent) {
    e.preventDefault()
    if (!userId) { toast.error('Scegli un membro del team'); return }
    try {
      await crea.mutateAsync({
        garaId: gara.id, tabella: 'gare_team', values: { user_id: userId, ruolo },
      })
      setUserId('')
    } catch (err) { toast.error((err as Error).message) }
  }

  return (
    <div className="space-y-4">
      <div className={card}>
        <h3 className="mb-3 text-sm font-semibold text-foreground">Team di gara</h3>
        {team.length === 0 && (
          <p className="py-2 text-sm text-muted-foreground">Assegna le responsabilità: le attività si collegano dalla tab Attività.</p>
        )}
        {team.map((m) => (
          <div key={m.id} className="flex items-center gap-3 border-b border-border py-2 text-sm last:border-0">
            <Avatar className="size-8"><AvatarFallback className="text-xs">{(m.utente?.nome[0] ?? '?')}{(m.utente?.cognome?.[0] ?? '')}</AvatarFallback></Avatar>
            <span className="flex-1 font-medium text-foreground">
              {m.utente ? `${m.utente.nome} ${m.utente.cognome ?? ''}` : '—'}
            </span>
            <Badge tone="neutral">{m.ruolo}</Badge>
            <button
              onClick={() => elimina.mutate({ garaId: gara.id, tabella: 'gare_team', id: m.id })}
              className="rounded-md p-1 text-muted-foreground hover:text-destructive" aria-label="Rimuovi">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        <form onSubmit={handleAggiungi} className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-48 flex-1 space-y-1">
            <Label>Utente</Label>
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger><SelectValue placeholder="Seleziona…" /></SelectTrigger>
              <SelectContent>
                {disponibili.map((u) => (
                  <SelectItem key={u.id} value={u.id}>{u.nome} {u.cognome ?? ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-56 space-y-1">
            <Label>Ruolo</Label>
            <Select value={ruolo} onValueChange={setRuolo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RUOLI_TEAM.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={crea.isPending}><Plus className="h-4 w-4" /> Aggiungi</Button>
        </form>
      </div>
    </div>
  )
}
