import { useState } from 'react'
import { MoreHorizontal, Pencil, Archive, Trash2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Props {
  /** Apre il dialog di modifica. */
  onEdit?: () => void
  /** Archivia (soft-delete): disponibile a tutto il team. */
  onArchive?: () => void
  /** Elimina definitivamente: solo admin. */
  onDelete?: () => void
  /** Nome dell'elemento, mostrato nella conferma di eliminazione. */
  nome?: string
}

/**
 * Menu azioni per riga/scheda: Modifica · Archivia · Elimina (solo admin, con
 * conferma). Uniforma il comportamento su tutte le liste dell'app.
 */
export function RowActions({ onEdit, onArchive, onDelete, nome }: Props) {
  const { isAdmin } = useAuth()
  const [confirmOpen, setConfirmOpen] = useState(false)

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          onClick={(e) => e.stopPropagation()}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Azioni"
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          {onEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="h-4 w-4" /> Modifica
            </DropdownMenuItem>
          )}
          {onArchive && (
            <DropdownMenuItem onClick={onArchive}>
              <Archive className="h-4 w-4" /> Archivia
            </DropdownMenuItem>
          )}
          {onDelete && isAdmin && (
            <DropdownMenuItem
              onClick={() => setConfirmOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Elimina
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare {nome ?? 'questo elemento'}?</AlertDialogTitle>
            <AlertDialogDescription>
              L'operazione è definitiva e non può essere annullata. In alternativa puoi archiviare.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmOpen(false); onDelete?.() }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
