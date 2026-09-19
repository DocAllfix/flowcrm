/**
 * Query layer allegati: metadati in tabella `allegati`, file nel bucket
 * Storage privato `allegati`. Il path è {userId}/{entita}/{entita_id}/{uuid}-{nome}
 * (la prima cartella = userId per la policy Storage di upload).
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, type Tables } from '@/lib/supabase'
import { sanitizeText } from '@/lib/validation'

export type Allegato = Tables<'allegati'>

const BUCKET = 'allegati'

export const allegatiKeys = {
  perEntita: (entita: string, entitaId: string) => ['allegati', entita, entitaId] as const,
}

/** Nome file "sicuro" per lo storage: niente path traversal né caratteri strani. */
function safeName(name: string): string {
  return name.replace(/[^\w.\-]+/g, '_').slice(0, 120)
}

/**
 * MIME type per estensione, allineato all'allowlist del bucket
 * (migrazione 20260918000003_storage_mime_allowlist.sql).
 *
 * Serve perché alcuni browser consegnano `File.type` vuoto: senza un
 * contentType esplicito l'upload parte come application/octet-stream, che
 * l'allowlist del bucket rifiuta. L'estensione è già stata validata da
 * FileUpload.validateFile prima di arrivare qui.
 */
const MIME_PER_ESTENSIONE: Record<string, string> = {
  pdf:  'application/pdf',
  doc:  'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls:  'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt:  'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  jpg:  'image/jpeg',
  jpeg: 'image/jpeg',
  png:  'image/png',
  webp: 'image/webp',
  zip:  'application/zip',
  txt:  'text/plain',
}

function mimeDiFile(file: File): string | undefined {
  if (file.type) return file.type
  const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
  return MIME_PER_ESTENSIONE[ext]
}

export function useAllegati(entita: string, entitaId: string) {
  return useQuery({
    queryKey: allegatiKeys.perEntita(entita, entitaId),
    queryFn: async (): Promise<Allegato[]> => {
      const { data, error } = await supabase
        .from('allegati')
        .select('*')
        .eq('entita', entita)
        .eq('entita_id', entitaId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function useUploadAllegati(entita: string, entitaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: File[] | { files: File[]; categoria?: string; sottocategoria?: string }) => {
      const files = Array.isArray(input) ? input : input.files
      const categoria = Array.isArray(input) ? null : (input.categoria ?? null)
      const sottocategoria = Array.isArray(input) ? null : (input.sottocategoria ?? null)
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth.user?.id
      if (!userId) throw new Error('Utente non autenticato')

      for (const file of files) {
        const path = `${userId}/${entita}/${entitaId}/${crypto.randomUUID()}-${safeName(file.name)}`
        const mime = mimeDiFile(file)
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: mime })
        if (upErr) throw upErr

        const { error: metaErr } = await supabase.from('allegati').insert({
          entita,
          entita_id: entitaId,
          nome_file: safeName(file.name),
          nome_originale: sanitizeText(file.name),
          storage_path: path,
          mime_type: mime ?? null,
          dimensione_bytes: file.size,
          caricato_da: userId,
          categoria,
          sottocategoria,
        })
        if (metaErr) {
          // rollback del file orfano se il metadato fallisce
          await supabase.storage.from(BUCKET).remove([path])
          throw metaErr
        }
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: allegatiKeys.perEntita(entita, entitaId) }),
  })
}

/** URL firmato temporaneo per scaricare un file dal bucket privato. */
export async function getSignedUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60)
  if (error) throw error
  return data.signedUrl
}

export function useDeleteAllegato(entita: string, entitaId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (allegato: Allegato) => {
      // Prima il file, poi il metadato (se il file non c'è più, procedi comunque).
      await supabase.storage.from(BUCKET).remove([allegato.storage_path])
      const { error } = await supabase.from('allegati').delete().eq('id', allegato.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: allegatiKeys.perEntita(entita, entitaId) }),
  })
}
