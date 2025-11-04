-- ===========================================
-- PostgreSQL OPTIMIZACIJA ZA MULTIRAG SISTEM
-- ===========================================
-- Namjena: Optimizacija ingest i retrieval faze (pgvector + FTS hybrid)
-- Napomena: Skripta je idempotentna i ne mijenja postojeće podatke.
-- ===========================================


-- =========================
-- 1. EKSTENZIJE
-- =========================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;


-- =========================
-- 2. FTS KONFIGURACIJA 'bos' (unaccent + simple)
-- =========================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_ts_config WHERE cfgname = 'bos') THEN
    CREATE TEXT SEARCH CONFIGURATION bos (COPY = simple);
    ALTER TEXT SEARCH CONFIGURATION bos
      ALTER MAPPING FOR word WITH unaccent, simple;
  END IF;
END $$;


-- =========================
-- 3. INDEKSI ZA PERFORMANSE
-- =========================

-- 3.1 Vektorski indeks (HNSW) za cosine distancu
CREATE INDEX IF NOT EXISTS document_chunks_embedding_hnsw
  ON public.document_chunks USING hnsw (embedding vector_cosine_ops);

-- 3.2 FTS indeks na bos konfiguraciji
-- VAŽNO: Ne koristiti unaccent() u izrazu indeksa (nije IMMUTABLE).
CREATE INDEX IF NOT EXISTS idx_chunks_fts_bos
  ON public.document_chunks USING gin (to_tsvector('bos', content));

-- 3.3 TRGM indeks za ILIKE/fuzzy pretragu
CREATE INDEX IF NOT EXISTS idx_chunks_content_trgm_like
  ON public.document_chunks USING gin (content gin_trgm_ops);

-- 3.4 Kompozitni indeks za česta čitanja po dokumentu i poretku
CREATE INDEX IF NOT EXISTS idx_chunks_docid_idx
  ON public.document_chunks (document_id, chunk_index);


-- =========================
-- 4. AUTOVACUUM / ANALYZE TUNING (stabilnije performanse)
-- =========================
ALTER TABLE public.document_chunks SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02,
  toast.autovacuum_vacuum_scale_factor = 0.05,
  toast.autovacuum_analyze_scale_factor = 0.02
);

ALTER TABLE public.documents SET (
  autovacuum_vacuum_scale_factor = 0.10,
  autovacuum_analyze_scale_factor = 0.05
);

ALTER TABLE public.ingest_jobs SET (
  autovacuum_vacuum_scale_factor = 0.05,
  autovacuum_analyze_scale_factor = 0.02
);

-- Osvježi statistiku odmah (ne obavezno, ali preporučeno)
ANALYZE public.document_chunks;
ANALYZE public.documents;
ANALYZE public.ingest_jobs;


-- =========================
-- 5. FUNKCIJA: HYBRID RETRIEVAL + NORMALIZACIJA + RRF
--    Radi i bez qemb (tada koristi samo FTS).
-- =========================
CREATE OR REPLACE FUNCTION public.rag_hybrid_rrf(
  qtext  text,
  qemb   vector(1536),   -- može biti NULL
  top_k  int DEFAULT 5,
  rrf_k  int DEFAULT 60
)
RETURNS TABLE(
  id uuid,
  document_id uuid,
  chunk_index int,
  preview text,
  score double precision,
  source text
)
LANGUAGE sql
STABLE
AS $$
WITH
-- VEKTORSKI kandidati (preskače se ako je qemb NULL)
vec AS (
  SELECT id, content, (embedding <=> qemb) AS dist
  FROM public.document_chunks
  WHERE qemb IS NOT NULL AND embedding IS NOT NULL
  ORDER BY embedding <=> qemb
  LIMIT GREATEST(top_k*4, 20)
),
vec_n AS (
  SELECT id, content,
         1.0 - (dist - MIN(dist) OVER ())
             / NULLIF(MAX(dist) OVER () - MIN(dist) OVER (), 0) AS vscore
  FROM vec
),
-- FTS kandidati (uvijek)
fts AS (
  SELECT id, content,
         ts_rank_cd(to_tsvector('bos', content),
                    websearch_to_tsquery('bos', qtext)) AS fr
  FROM public.document_chunks
  WHERE to_tsvector('bos', content) @@ websearch_to_tsquery('bos', qtext)
  ORDER BY fr DESC
  LIMIT GREATEST(top_k*4, 20)
),
fts_n AS (
  SELECT id, content,
         (fr - MIN(fr) OVER ())
         / NULLIF(MAX(fr) OVER () - MIN(fr) OVER (), 0) AS fscore
  FROM fts
),
ranks AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY vscore DESC) AS rnk
  FROM vec_n
  UNION ALL
  SELECT id, ROW_NUMBER() OVER (ORDER BY fscore DESC) AS rnk
  FROM fts_n
),
rrf AS (
  SELECT id, SUM(1.0 / (rnk + rrf_k)) AS rrf_score
  FROM ranks
  GROUP BY id
)
SELECT c.id, c.document_id, c.chunk_index,
       LEFT(c.content, 240) AS preview,
       r.rrf_score AS score,
       'hybrid-rrf'::text AS source
FROM rrf r
JOIN public.document_chunks c ON c.id = r.id
ORDER BY r.rrf_score DESC
LIMIT top_k;
$$;


-- =========================
-- 6. TESTNI POZIVI (opciono)
-- =========================
-- Bez embeddinga upita (radi FTS dio):
-- SELECT * FROM public.rag_hybrid_rrf('analiza ponuda', NULL, 5, 60);

-- Sa embeddingom upita (backend treba poslati stvarni vektor 1536D):
-- SELECT * FROM public.rag_hybrid_rrf('analiza ponuda', '[0.12, -0.45, ...]::vector(1536)', 5, 60);


-- =========================
-- 7. DODATNE PREPORUKE (komentarisano)
-- =========================
-- SET ivfflat.probes = 10;           -- veći recall za IVFFLAT, ako se koristi
-- EXPLAIN (ANALYZE, BUFFERS) ...     -- mjeri planove i keš
-- CREATE INDEX ... CONCURRENTLY ...  -- koristi u produkciji ako želiš online build (izvan transakcije)


-- =========================
-- 8. ROLLBACK OPCIJA (uklanjanje funkcije)
-- =========================
-- DROP FUNCTION IF EXISTS public.rag_hybrid_rrf(text, vector, int, int);


-- =========================
-- KRAJ
-- =========================
