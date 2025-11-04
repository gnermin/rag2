import uuid
from typing import List
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from app.agents.base import BaseAgent
from app.agents.types import ProcessingContext
from app.core.config import settings


def _to_uuid(val) -> uuid.UUID:
    try:
        return uuid.UUID(str(val)) if val else uuid.uuid4()
    except Exception:
        return uuid.uuid4()


class PgVectorIngestAgent(BaseAgent):
    """
    Upis chunkova + embeddinga u Postgres/pgvector.
    ENV / settings:
      TARGET_PG_URL (ili EXTERNAL_DB_URL)
      DOCUMENT_CHUNKS_TABLE (default: document_chunks)
      CHUNK_EMBEDDINGS_TABLE (default: chunk_embeddings)
      SQL_INGEST_BATCH_SIZE (default: 500)
    Očekuje:
      context.chunks: List[str]
      context.metadata['embeddings']: List[List[float]] (1536D)
      context.metadata['doc_id'] (opcionalno)
    """

    def __init__(self,
                 target_pg_url: str | None = None,
                 document_chunks_table: str | None = None,
                 chunk_embeddings_table: str | None = None,
                 batch_size: int | None = None):
        super().__init__("PgVectorIngestAgent")
        self.target_pg_url = target_pg_url or getattr(settings, "TARGET_PG_URL", None) or getattr(settings, "EXTERNAL_DB_URL", None)
        if not self.target_pg_url:
            raise ValueError("PgVectorIngestAgent: TARGET_PG_URL/EXTERNAL_DB_URL nije podešen.")
        self.document_chunks_table = document_chunks_table or getattr(settings, "DOCUMENT_CHUNKS_TABLE", "document_chunks")
        self.chunk_embeddings_table = chunk_embeddings_table or getattr(settings, "CHUNK_EMBEDDINGS_TABLE", "chunk_embeddings")
        self.batch_size = batch_size or getattr(settings, "SQL_INGEST_BATCH_SIZE", 500)

    async def process(self, context: ProcessingContext) -> ProcessingContext:
        chunks: List[str] = context.chunks or []
        vectors: List[List[float]] = context.metadata.get("embeddings") or []

        if not chunks:
            raise ValueError("PgVectorIngestAgent: context.chunks je prazan.")
        if not vectors:
            raise ValueError("PgVectorIngestAgent: nema embeddings u context.metadata['embeddings'].")
        if len(vectors) != len(chunks):
            raise ValueError(f"PgVectorIngestAgent: length mismatch vectors({len(vectors)}) vs chunks({len(chunks)})")

        engine = create_engine(self.target_pg_url)
        doc_id = _to_uuid(context.metadata.get("doc_id"))

        insert_chunk_sql = text(f"""
            INSERT INTO {self.document_chunks_table} (id, doc_id, content)
            VALUES (:id, :doc_id, :content)
            ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content;
        """)

        insert_vec_sql = text(f"""
            INSERT INTO {self.chunk_embeddings_table} (chunk_id, embedding)
            VALUES (:chunk_id, :embedding)
            ON CONFLICT (chunk_id) DO UPDATE SET embedding = EXCLUDED.embedding;
        """)

        total = 0
        try:
            with engine.begin() as conn:
                start = 0
                while start < len(chunks):
                    end = min(start + self.batch_size, len(chunks))
                    slice_chunks = chunks[start:end]
                    slice_vecs = vectors[start:end]

                    chunk_rows, chunk_ids = [], []
                    for ch in slice_chunks:
                        cid = uuid.uuid4()
                        chunk_ids.append(cid)
                        chunk_rows.append({"id": str(cid), "doc_id": str(doc_id), "content": ch})
                    conn.execute(insert_chunk_sql, chunk_rows)

                    vec_rows = [{"chunk_id": str(cid), "embedding": vec} for cid, vec in zip(chunk_ids, slice_vecs)]
                    conn.execute(insert_vec_sql, vec_rows)

                    total += (end - start)
                    start = end
        except SQLAlchemyError as e:
            raise Exception(f"PgVectorIngestAgent: DB error: {e}") from e

        context.metadata["sql_mode"] = "upsert_postgres"
        context.metadata["sql_upsert_count"] = total
        context.metadata["doc_id"] = str(doc_id)
        return context
