/**
 * AllegatiSection — riquadro allegati per una qualsiasi entità (organizzazione,
 * deal, commessa…). Drag&drop upload + lista con download (URL firmato) e
 * cancellazione. Riusabile nelle schede 360° passando entita/entitaId.
 */
import { toast } from 'sonner'
import { Download, Trash2, FileText, Paperclip } from 'lucide-react'
import { FileUpload } from '@/components/allegati/FileUpload'
import { EmptyState } from '@/components/ui/empty-state'
import {
  useAllegati, useUploadAllegati, useDeleteAllegato, getSignedUrl,
  type Allegato,
} from '@/lib/queries/allegati'
import { useAuth } from '@/hooks/useAuth'

interface Props {
  entita: string
  entitaId: string
}

function formatBytes(b: number | null): string {
  if (!b) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(0)} KB`
  return `${(b / 1024 / 1024).toFixed(1)} MB`
}

export function AllegatiSection({ entita, entitaId }: Props) {
  const { userProfile, isAdmin } = useAuth()
  const { data: allegati = [], isLoading } = useAllegati(entita, entitaId)
  const upload = useUploadAllegati(entita, entitaId)
  const del = useDeleteAllegato(entita, entitaId)

  async function handleFiles(files: File[]) {
    try {
      await upload.mutateAsync(files)
      toast.success(files.length === 1 ? 'File caricato' : `${files.length} file caricati`)
    } catch (e) {
      toast.error('Caricamento non riuscito', { description: (e as Error).message })
    }
  }

  async function handleDownload(a: Allegato) {
    try {
      const url = await getSignedUrl(a.storage_path)
      window.open(url, '_blank', 'noopener')
    } catch {
      toast.error('Impossibile generare il link di download')
    }
  }

  async function handleDelete(a: Allegato) {
    try {
      await del.mutateAsync(a)
      toast.success('Allegato eliminato')
    } catch {
      toast.error('Eliminazione non riuscita')
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">Allegati</h3>
        {allegati.length > 0 && (
          <span className="text-xs text-muted-foreground">({allegati.length})</span>
        )}
      </div>

      <FileUpload onFilesSelected={handleFiles} disabled={upload.isPending} />

      <div className="p-2">
        {isLoading && (
          <p className="px-3 py-4 text-center text-sm text-muted-foreground">Caricamento…</p>
        )}
        {!isLoading && allegati.length === 0 && (
          <EmptyState
            icon={FileText}
            title="Nessun allegato"
            description="Trascina un file qui sopra per iniziare."
          />
        )}
        {allegati.map((a) => {
          const puoCancellare = isAdmin || a.caricato_da === userProfile?.id
          return (
            <div
              key={a.id}
              className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-muted/40"
            >
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{a.nome_originale}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(a.dimensione_bytes)}</p>
              </div>
              <button
                onClick={() => handleDownload(a)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                aria-label="Scarica"
              >
                <Download className="h-4 w-4" />
              </button>
              {puoCancellare && (
                <button
                  onClick={() => handleDelete(a)}
                  disabled={del.isPending}
                  className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label="Elimina"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
