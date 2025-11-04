# Multi-RAG - Multi-Agent Retrieval-Augmented Generation System

**Author**: Nermin Goran – AI/IoT Systems Architect  
**Version**: 1.0.0  
**Last Updated**: October 25, 2025

## Recent Changes

### October 27, 2025 - DAG Mini-Agent Ingest Architecture 🚀
**Refaktorisan document ingest pipeline u DAG (Directed Acyclic Graph) arhitekturu:**
- **7 specijalizovanih mini-agenata** sa dependency resolution i parallel execution
- **ExtractAgent**: PDF/DOCX/OCR/CSV/Excel ekstrakcija teksta, blokova i tabela
- **StructureAgent**: LLM segmentacija + heuristički fallback, pametni chunking sa sentence boundaries
- **MetaAgent**: LLM NER + regex patterns (datumi, email, telefoni, JMBG, šifre, iznosi)
- **TableAgent**: CSV/JSON export, opciona LLM enhancement header-a i tipova kolona
- **DedupAgent**: MinHash/LSH deduplikacija chunk-ova (similarity threshold 0.85)
- **PolicyAgent**: PII maskiranje (email, telefoni, JMBG, kartice, IBAN) sa Luhn validacijom
- **IndexAgent**: Batch embeddings, skip duplicates, database ANALYZE hint
- **Fallback mode**: Svi agenti rade bez LLM-a putem heuristika
- **Inkrementalni logging**: Svaki agent piše logove sa timestampovima u ingest_jobs.logs
- **Performance**: DAG omogućava paralelizaciju nezavisnih agenata (Extract + Table može paralelno)

### October 25, 2025 - Multi-Agent RAG Query Pipeline
**Implementiran napredni LLM multi-agentni sistem za chat/query funkcionalnost:**
- 5 novih agenata: PlannerAgent, RewriterAgent, GenerationAgent, JudgeAgent, SummarizerAgent
- RRF (Reciprocal Rank Fusion) hibridna pretraga kombinuje vector i text search rezultate
- Chat endpoint sada vraća `verdict` dict sa ok/needs_more/notes od Judge agenta
- Optional summary field za sažete odgovore
- Backward compatible API responses (postojeći klijenti nastavljaju da rade)
- Embeddings fallback za development bez OpenAI API ključa
- Novi ENV parametri: CHAT_MODEL, AGENT_REWRITES, JUDGE_STRICTNESS
- Kompletna dokumentacija u backend/.env.example

## Overview

Multi-RAG is a comprehensive Retrieval-Augmented Generation (RAG) system featuring a multi-agent document processing pipeline, SQL data ingestion, and intelligent chat with citations. The system processes various document types (PDF, DOCX, Excel, CSV, images) through specialized AI agents and enables natural language queries over the indexed content.

## Architecture

### Backend (FastAPI + Python 3.11)
- **Core Modules**: Configuration, database management, JWT authentication
- **Database**: PostgreSQL with pgvector extension for vector embeddings
- **Multi-Agent Pipeline**: Modular agents for document processing
- **Services**: Pipeline orchestration, hybrid search (BM25 + vector), RAG chat

### Frontend (React + TypeScript + Vite + Tailwind CSS)
- **Pages**: Home, Documents, Chat, Settings
- **Components**: FileDropzone, AgentTrace, ChatWindow
- **Layout**: AppLayout with navigation and responsive design

## Features

### 1. Document Processing Pipeline - DAG Mini-Agent Architecture
**Napredni DAG (Directed Acyclic Graph) sistem sa 7 specijalizovanih mini-agenata:**

**Execution Flow** (sa dependency order-om):
```
ExtractAgent (PDF/DOCX/OCR/CSV/Excel → tekst + blokovi + tabele)
    ↓
StructureAgent (LLM/heuristika → segmenti + pametni chunks)
    ↓
MetaAgent (LLM/regex → tip dokumenta + NER + entiteti)
    ↓  
TableAgent (heuristika/LLM → CSV/JSON export + enhanced headers)
    ↓
DedupAgent (MinHash/LSH → deduplikacija chunk-ova)
    ↓
PolicyAgent (regex + Luhn → PII maskiranje)
    ↓
IndexAgent (batch embeddings → database upis + ANALYZE)
```

**Ključne karakteristike:**
- **Paralelizacija**: DAG omogućava parallel execution nezavisnih agenata
- **LLM Fallback**: Svi agenti rade i bez OpenAI API ključa (heuristički mode)
- **PII Sigurnost**: Automatsko maskiranje email-ova, telefona, JMBG, kartice, IBAN
- **Deduplication**: MinHash/LSH pronalazi near-duplicate chunks (85% similarity)
- **Smart Chunking**: Sentence-aware boundaries, overlap za kontekst
- **Inkrementalni Logovi**: Svaki agent piše status u ingest_jobs.logs sa timestamps

### 2. SQL Data Ingestion (SQLIngestAgent)
Connect to external databases and ingest data:
- Supports SELECT queries only (security-first design)
- Converts SQL result rows into searchable chunks
- Embeds and indexes data alongside documents
- Environment variables: `EXTERNAL_DB_URL`, `SQL_INGEST_QUERY`, `SQL_INGEST_BATCH_SIZE`

### 3. Multi-Agent RAG Chat & Hybrid Search

**Multi-Agent Query Pipeline** (NEW):
- **PlannerAgent**: Strategija pretrage i rewrites konfiguracija
- **RewriterAgent**: Parafrazira upit u k varijanti za federated search
- **Hybrid Search + RRF**: Reciprocal Rank Fusion kombinuje vector + text rezultate
- **GenerationAgent**: Generiše odgovor na osnovu retrieved chunks-a
- **JudgeAgent**: Evaluira kvalitet odgovora, opciono iterira za dodatni kontekst
- **SummarizerAgent**: Kreira sažetak odgovora (opciono)

**Query Flow**: Planner → Rewriter → Multi-Query Search → RRF Merge → Generation → Judge → (Optional) Summarizer

**Hybrid Search**: 
- Kombinuje BM25 full-text i pgvector cosine similarity
- RRF (Reciprocal Rank Fusion) rangira i spaja rezultate
- Podržava query rewrites za poboljšanu recall

**RAG Chat**: 
- GPT-4o-mini generiše odgovore sa citatima
- Verdict dict pokazuje ok/needs_more/notes iz Judge-a
- Citations uključuju chunk_id, document_id, filename, content, score, metadata

### 4. Modern Frontend
- Drag-and-drop document upload with real-time processing status
- Agent execution visualization with logs and metadata
- Chat interface with citation display
- SQL ingestion configuration panel

## Database Schema

```sql
users (id, email, password_hash, created_at)
documents (id, filename, status, file_path, file_size, mime_type, metadata, created_at, created_by)
document_chunks (id, document_id, chunk_index, content, metadata, embedding vector(1536))
document_relations (id, document_id, source_ref, target_ref, relation_type, score, metadata)
external_sources (id, name, connection_string, query, created_at, created_by)
ingest_jobs (id, document_id, status, logs, error, started_at, completed_at)
```

**Indexes**:
- IVFFlat index on embedding vectors for fast similarity search
- GIN index on content for full-text search
- Standard B-tree indexes on foreign keys and status fields

## API Endpoints

### Authentication
- `POST /auth/signup` - Create new user account
- `POST /auth/login` - Login and get JWT token

### Documents
- `POST /documents/upload` - Upload and process document
- `GET /documents` - List all user documents
- `GET /documents/{id}` - Get document details with agent logs

### Chat & Search
- `POST /chat` - Multi-agent RAG chat sa verdict i citations (backward compatible)
  - Response: `{answer, citations[], query, verdict{ok, needs_more, notes}, summary?}`
- `POST /search` - Hybrid search over all indexed content

### SQL Ingestion
- `POST /ingest/sql` - Ingest data from external database

### Health
- `GET /health` - System health check
- `GET /` - API information

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://...

# Authentication
SESSION_SECRET=your-secret-key

# OpenAI
OPENAI_API_KEY=sk-...
CHAT_MODEL=gpt-4o-mini
EMBEDDINGS_MODEL=text-embedding-3-small

# RAG Configuration (NEW)
RAG_TOP_K=5
AGENT_REWRITES=2
JUDGE_STRICTNESS=medium

# Embeddings Configuration
EMBEDDINGS_PROVIDER=openai
EMBEDDINGS_DIM=1536

# Pipeline Settings
OCR_ENABLED=true
PIPELINE_MODE=full

# SQL Ingestion (Optional)
EXTERNAL_DB_URL=postgresql://...
SQL_INGEST_QUERY=SELECT * FROM table LIMIT 100
SQL_INGEST_BATCH_SIZE=500

# Upload Settings
UPLOAD_MAX_SIZE=52428800
UPLOAD_DIR=uploads
```

## Development Workflow

### Running the Application

1. **Backend**: Starts automatically via workflow
   ```bash
   cd backend && uvicorn app.main:app --host 0.0.0.0 --port 5000 --reload
   ```

2. **Frontend** (when ready):
   ```bash
   cd frontend && npm run dev
   ```

### Testing Document Upload

1. Navigate to `/documents`
2. Upload a PDF, DOCX, Excel, CSV, or image file
3. Watch the agent pipeline execute in real-time
4. View processing logs and metadata

### Testing RAG Chat

1. Upload at least one document
2. Navigate to `/chat`
3. Ask questions about your documents
4. View answers with source citations

### Testing SQL Ingestion

1. Navigate to `/settings`
2. Enter source name and SQL SELECT query
3. Optionally provide connection string (or use env variable)
4. Click "Ingest Data" to process and index

## Project Structure

```
multi-rag/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/ (config, db, security)
│   │   ├── models/ (SQLAlchemy models)
│   │   ├── schemas/ (Pydantic schemas)
│   │   ├── api/ (FastAPI routes)
│   │   ├── services/ (rag_pipeline, search, llm_client, prompting, pipeline)
│   │   └── agents/
│   │       ├── ingest/ (DAG mini-agents: extract, structure, meta, table, dedup, policy, index)
│   │       │   ├── __init__.py
│   │       │   ├── types.py (IngestContext, TextBlock, DocumentSegment, etc.)
│   │       │   ├── base.py (IngestAgent base class)
│   │       │   ├── dag.py (IngestDAG orchestrator)
│   │       │   ├── extract.py (ExtractAgent)
│   │       │   ├── structure.py (StructureAgent)
│   │       │   ├── meta.py (MetaAgent)
│   │       │   ├── table.py (TableAgent)
│   │       │   ├── dedup.py (DedupAgent - MinHash/LSH)
│   │       │   ├── policy.py (PolicyAgent - PII masking)
│   │       │   └── index.py (IndexAgent)
│   │       └── (planner, rewriter, generation, judge, summarizer)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── pages/ (Home, Documents, Chat, Settings)
│   │   ├── components/ (FileDropzone, AgentTrace, ChatWindow)
│   │   ├── ui/ (AppLayout)
│   │   └── lib/ (api, utils)
│   ├── index.html
│   └── package.json
├── db/
│   └── init/ (SQL initialization scripts)
├── .env.example
└── replit.md (this file)
```

## Security Features

- JWT-based authentication with bcrypt password hashing
- SQL injection prevention (only SELECT queries allowed)
- CORS configuration for cross-origin requests
- Secure secret management via environment variables
- File upload size limits (50MB max)

## Performance Optimizations

- PostgreSQL connection pooling
- IVFFlat vector index for fast similarity search
- Chunking strategy optimized for retrieval (1000 chars, 200 overlap)
- Async processing pipeline
- Efficient batch SQL ingestion (configurable batch size)

## Future Enhancements

- Redis queue for asynchronous job processing
- Advanced agents: TableAgent (Camelot), PIIComplianceAgent, RelationAgent
- FigureClassifierAgent and CaptionAgent for image analysis
- Row-Level Security (RLS) policies per user
- Batch processing for multiple documents
- Real-time progress updates via WebSocket

## Troubleshooting

### Backend won't start
- Check DATABASE_URL is set correctly
- Verify OpenAI API key is configured
- Ensure all dependencies are installed: `cd backend && pip install -r requirements.txt`

### Document upload fails
- Check file size is under 50MB
- Verify file format is supported (PDF, DOCX, XLSX, CSV, JPG, PNG)
- Check backend logs for specific agent errors

### Chat returns no results
- Ensure documents have been successfully processed (status: ready)
- Verify OpenAI API key is valid
- Check that embeddings were generated (check agent logs)

### SQL ingestion fails
- Verify EXTERNAL_DB_URL is correct
- Ensure query is a SELECT statement only
- Check database connection permissions

## License

ISC

## Credits

Built with FastAPI, React, PostgreSQL, pgvector, OpenAI, and Tailwind CSS.
