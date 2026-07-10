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
    mutationFn: async (files: File[]) => {
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth.user?.id
      if (!userId) throw new Error('Utente non autenticato')

      for (const file of files) {
        const path = `${userId}/${entita}/${entitaId}/${crypto.randomUUID()}-${safeName(file.name)}`
        const { error: upErr } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { contentType: file.type || undefined })
        if (upErr) throw upErr

        const { error: metaErr } = await supabase.from('allegati').insert({
          entita,
          entita_id: entitaId,
          nome_file: safeName(file.name),
          nome_originale: sanitizeText(file.name),
          storage_path: path,
          mime_type: file.type || null,
          dimensione_bytes: file.size,
          caricato_da: userId,
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
