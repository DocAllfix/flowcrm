import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, BookUser, Search, Mail, Phone, Download, Upload } from 'lucide-react'
import { useContatti, useArchiveContatto, useDeleteContatto, type Contatto } from '@/lib/queries/contatti'
import { toCsv, scaricaCsv } from '@/lib/csv'
import { PageHeader } from '@/components/ui/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { RowActions } from '@/components/RowActions'
import { ContattoDialog } from '@/features/contatti/ContattoDialog'
import { BottoneScrittura } from '@/components/BottoneScrittura'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, CollegamentoRiga } from '@/components/ui/table'
import { Card } from '@/components/ui/card'
import { SkeletonTabella } from '@/components/ui/skeleton'

export function ContattiPage() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editContatto, setEditContatto] = useState<Contatto | null>(null)
  const archive = useArchiveContatto()
  const del = useDeleteContatto()
  const { data, isLoading } = useContatti()

  const filtered = (data ?? []).filter((c) => {
    if (!q) return true
    const t = `${c.nome} ${c.cognome ?? ''} ${c.email ?? ''}`.toLowerCase()
    return t.includes(q.toLowerCase())
  })

  return (
    <div>
      <PageHeader
        title="Contatti"
        description="Le persone con cui lavori, collegate alle loro organizzazioni."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => {
              const rows = (data ?? []).map((c) => [c.nome, c.cognome, c.email, c.telefono, c.ruolo_aziendale, c.organizzazione?.ragione_sociale])
              scaricaCsv('contatti', toCsv(['Nome', 'Cognome', 'Email', 'Telefono', 'Ruolo', 'Organizzazione'], rows))
            }}>
              <Download className="h-4 w-4" /> Esporta CSV
            </Button>
            <Button variant="outline" onClick={() => navigate('/importa?tipo=contatti')}>
              <Upload className="h-4 w-4" /> Importa CSV
            </Button>
            <BottoneScrittura onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" /> Nuovo
            </BottoneScrittura>
          </div>
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Cerca per nome o email…" value={q}
          onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      {isLoading ? (
        <SkeletonTabella colonne={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookUser}
          title="Nessun contatto"
          description="Aggiungi le persone di riferimento delle tue organizzazioni."
          action={<BottoneScrittura onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> Nuovo contatto</BottoneScrittura>}
        />
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Organizzazione</TableHead>
                <TableHead>Contatti</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead><span className="sr-only">Azioni</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((c) => (
                <TableRow key={c.id} onActivate={() => navigate(`/contatti/${c.id}`)}
                  >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8"><AvatarFallback className="text-xs">{(c.nome[0] ?? '')}{(c.cognome?.[0] ?? '')}</AvatarFallback></Avatar>
                      <CollegamentoRiga to={`/contatti/${c.id}`}>{c.nome} {c.cognome ?? ''}</CollegamentoRiga>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.organizzazione?.ragione_sociale ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                      {c.email && <span className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{c.email}</span>}
                      {c.telefono && <span className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{c.telefono}</span>}
                      {!c.email && !c.telefono && '—'}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.ruolo_aziendale ?? '—'}</TableCell>
                  <TableCell numerica>
                    <RowActions
                      nome={`${c.nome} ${c.cognome ?? ''}`.trim()}
                      onEdit={() => setEditContatto(c)}
                      onArchive={() => archive.mutate(c.id, {
                        onSuccess: () => toast.success('Contatto archiviato'),
                        onError: (e) => toast.error((e as Error)?.message ?? 'Errore'),
                      })}
                      onDelete={() => del.mutate(c.id, {
                        onSuccess: () => toast.success('Contatto eliminato'),
                        onError: (e) => toast.error((e as Error)?.message ?? 'Errore'),
                      })}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <ContattoDialog
        open={dialogOpen || !!editContatto}
        contatto={editContatto ?? undefined}
        onOpenChange={(o) => { if (!o) { setDialogOpen(false); setEditContatto(null) } }}
      />
    </div>
  )
}
