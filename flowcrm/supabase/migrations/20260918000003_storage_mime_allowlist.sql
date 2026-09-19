-- ═══════════════════════════════════════════════════════════════════
-- SICUREZZA — Allowlist dei MIME type sul bucket `allegati`.
--
-- Difetto corretto: il bucket nasceva con `allowed_mime_types = NULL`
-- ("tutti i mime type; la validazione fine è applicativa"). La validazione
-- però vive solo in src/components/allegati/FileUpload.tsx, cioè nel
-- browser: un utente autenticato che chiama
--   supabase.storage.from('allegati').upload(...)
-- dalla console salta del tutto il controllo e può depositare qualunque
-- cosa nella propria cartella — HTML o SVG con script inclusi.
--
-- L'elenco qui sotto ricalca ESATTAMENTE ALLOWED_MIME_TYPES del client.
-- Restano fuori di proposito image/svg+xml e text/html: sono i due
-- formati che eseguono script quando aperti in una scheda del browser.
--
-- Dipendenza: src/lib/queries/allegati.ts deve inviare sempre un
-- contentType esplicito. Un upload senza header finisce a
-- application/octet-stream, che qui NON è ammesso e verrebbe rifiutato.
-- ═══════════════════════════════════════════════════════════════════

UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain'
]
WHERE id = 'allegati';
