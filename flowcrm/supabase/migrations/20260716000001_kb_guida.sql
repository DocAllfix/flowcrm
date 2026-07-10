-- ═══════════════════════════════════════════════════════════════════
-- F12a-bis — Base di conoscenza per il RAG "come si fa X".
-- Manuale FlowCRM in chunk con embedding pgvector (1536-dim,
-- text-embedding-3-small). Il copilot cerca qui via il tool cerca_guida.
-- ═══════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE kb_guida (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titolo     TEXT NOT NULL,
  contenuto  TEXT NOT NULL,
  embedding  vector(1536),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indice per ricerca cosine (HNSW)
CREATE INDEX idx_kb_guida_embedding ON kb_guida
  USING hnsw (embedding vector_cosine_ops);

-- Manuale: leggibile da tutti gli autenticati (non è sensibile).
ALTER TABLE kb_guida ENABLE ROW LEVEL SECURITY;
CREATE POLICY "kb_guida_select" ON kb_guida FOR SELECT TO authenticated USING (true);

-- Match per similarità cosine. SECURITY INVOKER: rispetta la RLS (che qui
-- consente a tutti la lettura del manuale).
CREATE OR REPLACE FUNCTION match_kb_guida(
  query_embedding vector(1536),
  match_count INT DEFAULT 4,
  soglia FLOAT DEFAULT 0.3
)
RETURNS TABLE (titolo TEXT, contenuto TEXT, similarita FLOAT)
AS $$
  SELECT k.titolo, k.contenuto,
         1 - (k.embedding <=> query_embedding) AS similarita
  FROM kb_guida k
  WHERE k.embedding IS NOT NULL
    AND 1 - (k.embedding <=> query_embedding) > soglia
  ORDER BY k.embedding <=> query_embedding
  LIMIT match_count;
$$ LANGUAGE sql STABLE SECURITY INVOKER;

REVOKE ALL ON FUNCTION match_kb_guida(vector, INT, FLOAT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION match_kb_guida(vector, INT, FLOAT) TO authenticated;
