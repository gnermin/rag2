from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.db import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.document import Document
from app.models.external_source import ExternalSource, IngestJob
from app.schemas.ingest import SQLIngestRequest, SQLIngestResponse
from app.agents.sql_ingest import PgVectorIngestAgent as SQLIngestAgent
from app.agents.chunking import ChunkingAgent
from app.agents.embedding import EmbeddingAgent
from app.agents.indexing import IndexingAgent
from app.agents.types import ProcessingContext

router = APIRouter(prefix="/ingest", tags=["ingestion"])


@router.post("/sql", response_model=SQLIngestResponse)
async def ingest_from_sql(
    request: SQLIngestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    source = ExternalSource(
        name=request.source_name,
        connection_string=request.connection_string,
        query=request.query,
        created_by=current_user.id
    )
    db.add(source)
    db.commit()
    
    document = Document(
        filename=f"SQL:{request.source_name}",
        status="pending",
        created_by=current_user.id,
        doc_metadata={"source_type": "sql", "source_id": str(source.id)}
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    
    job = IngestJob(
        document_id=document.id,
        status="processing"
    )
    db.add(job)
    db.commit()
    
    try:
        context = ProcessingContext(
            document_id=str(document.id),
            file_path="",
            filename=f"SQL:{request.source_name}"
        )
        
        sql_agent = SQLIngestAgent(
            connection_string=request.connection_string,
            query=request.query
        )
        context = await sql_agent.execute(context)
        
        chunking_agent = ChunkingAgent()
        context = await chunking_agent.execute(context)
        
        embedding_agent = EmbeddingAgent()
        context = await embedding_agent.execute(context)
        
        indexing_agent = IndexingAgent(db)
        context = await indexing_agent.execute(context)
        
        document.status = "ready"
        if not document.doc_metadata:
            document.doc_metadata = {}
        document.doc_metadata.update({
            "chunks": len(context.chunks),
            "rows_fetched": context.metadata.get("sql_rows_fetched", 0),
            "indexed_chunks": context.metadata.get('indexed_chunks', 0)
        })
        
        job.status = "completed"
        job.logs = [result.to_dict() for result in context.agent_results]
        job.completed_at = db.execute(text("SELECT NOW()")).scalar()
        
        db.commit()
        db.refresh(document)
        db.refresh(job)
        
        return SQLIngestResponse(
            document_id=document.id,
            job_id=job.id,
            status="completed",
            message=f"Successfully ingested {context.metadata.get('sql_rows_fetched', 0)} rows"
        )
        
    except Exception as e:
        document.status = "error"
        job.status = "failed"
        job.error = str(e)
        db.commit()
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SQL ingestion failed: {str(e)}"
        )
