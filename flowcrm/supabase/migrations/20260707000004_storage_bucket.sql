-- ═══════════════════════════════════════════════════════════════════
-- F1.4 — Bucket Storage per allegati (privato) + policy
-- Pattern CertDesk: bucket privato, accesso via signed URL dal client.
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'allegati',
  'allegati',
  false,
  52428800, -- 50 MiB
  NULL      -- tutti i mime type; la validazione fine è applicativa
)
ON CONFLICT (id) DO NOTHING;

-- Lettura: tutti gli autenticati (le restrizioni per-entità seguiranno
-- le entità amministrative nelle fasi dedicate).
CREATE POLICY "allegati_storage_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'allegati');

-- Upload: solo nella propria cartella {auth.uid()}/...
CREATE POLICY "allegati_storage_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'allegati'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete: i propri file, o admin.
CREATE POLICY "allegati_storage_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'allegati'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR get_user_role() = 'admin'
    )
  );
