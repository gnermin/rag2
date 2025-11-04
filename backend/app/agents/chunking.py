from typing import List
from app.agents.base import BaseAgent
from app.agents.types import ProcessingContext

class ChunkingAgent(BaseAgent):
    def __init__(self, chunk_size: int = 1400, chunk_overlap: int = 160, include_tables: bool = True, include_images: bool = True):
        super().__init__("ChunkingAgent")
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.include_tables = include_tables
        self.include_images = include_images
    
    async def process(self, context: ProcessingContext) -> ProcessingContext:
        # 1) Chunk main text (markdown or plain)
        chunks: List[str] = []
        text = (context.text_content or "").strip()
        if text:
            chunks.extend(self._split_text_recursive(text, self.chunk_size, self.chunk_overlap))
        
        # 2) Add table chunks as atomic units (summary + preview)
        if self.include_tables and getattr(context, 'tables', None):
            for t in context.tables:
                summary = self._summarize_table(t)
                if summary.strip():
                    chunks.append(summary)
        
        # 3) Add image placeholders (can be replaced later with captions/OCR)
        if self.include_images and getattr(context, 'images', None):
            for i, img in enumerate(context.images):
                path = img.get('path') or img.get('asset_path') or 'image'
                chunks.append(f"[IMAGE] {path}")
        
        # Save + meta
        context.chunks = chunks
        context.metadata['chunk_count'] = len(chunks)
        context.metadata['chunk_size'] = self.chunk_size
        context.metadata['chunk_overlap'] = self.chunk_overlap
        context.metadata['chunk_tables'] = int(bool(getattr(context, 'tables', None)))
        context.metadata['chunk_images'] = int(bool(getattr(context, 'images', None)))
        return context
    
    # -------- helpers --------
    def _split_text_recursive(self, text: str, max_len: int, overlap: int) -> List[str]:
        # simple paragraph-aware splitter with overlap fallback
        parts: List[str] = []
        paragraphs = [p for p in text.split('\n\n') if p.strip()]
        buffer = ""
        
        def flush(buf: str):
            if buf.strip():
                for ch in self._window_chunks(buf, max_len, overlap):
                    parts.append(ch)
        
        for p in paragraphs:
            if len(buffer) + len(p) + 2 <= max_len:
                buffer = buffer + ("\n\n" if buffer else "") + p
            else:
                flush(buffer)
                buffer = p
        flush(buffer)
        return parts
    
    def _window_chunks(self, text: str, max_len: int, overlap: int) -> List[str]:
        out = []
        i = 0
        n = len(text)
        if n <= max_len:
            return [text.strip()]
        while i < n:
            end = min(i + max_len, n)
            chunk = text[i:end]
            if chunk.strip():
                out.append(chunk.strip())
            if end >= n:
                break
            i = end - overlap if end - overlap > i else end
        return out
    
    def _summarize_table(self, tmeta: dict) -> str:
        rows = tmeta.get('rows')
        cols = tmeta.get('cols')
        page = tmeta.get('page')
        csv_path = tmeta.get('csv_path')
        preview = (tmeta.get('preview') or '')[:1200]
        header = f"[TABLE rows={rows} cols={cols} page={page} path={csv_path}]"
        return f"{header}\n{preview}"