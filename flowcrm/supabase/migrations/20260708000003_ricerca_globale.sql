-- ═══════════════════════════════════════════════════════════════════
-- F2.3 — Ricerca globale (cmd+K): organizzazioni + contatti in un colpo
-- SECURITY INVOKER: rispetta la RLS del chiamante.
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION ricerca_globale(q TEXT)
RETURNS TABLE (
  tipo         TEXT,
  id           UUID,
  titolo       TEXT,
  sottotitolo  TEXT
) AS $$
  SELECT 'organizzazione' AS tipo, o.id,
         o.ragione_sociale AS titolo,
         COALESCE(o.citta, o.settore, '') AS sottotitolo
  FROM organizzazioni o
  WHERE o.attivo AND o.ricerca @@ websearch_to_tsquery('simple', q)
  UNION ALL
  SELECT 'contatto' AS tipo, c.id,
         trim(c.nome || ' ' || COALESCE(c.cognome, '')) AS titolo,
         COALESCE(c.email, c.ruolo_aziendale, '') AS sottotitolo
  FROM contatti c
  WHERE c.attivo AND c.ricerca @@ websearch_to_tsquery('simple', q)
  LIMIT 20
$$ LANGUAGE sql STABLE SECURITY INVOKER;

REVOKE ALL ON FUNCTION ricerca_globale(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ricerca_globale(TEXT) TO authenticated;
