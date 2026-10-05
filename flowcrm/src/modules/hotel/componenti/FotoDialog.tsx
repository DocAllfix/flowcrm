/**
 * Foto e documenti di una riga (guasto, oggetto smarrito, camera) in una
 * finestra: l'archivio è quello condiviso degli allegati.
 */
import { useState, type ReactNode } from 'react'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AllegatiSection } from '@/components/allegati/AllegatiSection'

export function FotoDialog({ entita, entitaId, titolo, categorie = ['foto', 'documento'], children }: {
  entita: string; entitaId: string; titolo: string; categorie?: string[]
  /** Campi in più sopra le foto (es. la restituzione di un oggetto). */
  children?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)} aria-label={`Foto e dettagli: ${titolo}`}><Camera className="h-3.5 w-3.5" /></Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{titolo}</DialogTitle>
            <DialogDescription>Foto e documenti restano nell'archivio della struttura.</DialogDescription>
          </DialogHeader>
          {children}
          {open && <AllegatiSection entita={entita} entitaId={entitaId} categorie={categorie} />}
        </DialogContent>
      </Dialog>
    </>
  )
}
