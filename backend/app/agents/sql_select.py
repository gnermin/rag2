import re
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.exc import SQLAlchemyError

from app.agents.base import BaseAgent
from app.agents.types import ProcessingContext, DocumentType
from app.core.config import settings


class SQLSelectToCSVAgent(BaseAgent):
    """
    Siguran SELECT nad SOURCE_DB_URL (npr. Db2), rezultat u CSV.
    Postavlja:
      - context.file_path, context.filename
      - context.document_type = DocumentType.CSV
      - context.metadata['sql_csv_path'], ['sql_row_count'], ['sql_rows' (preview)]
    """

    def __init__(self,
                 source_url: Optional[str] = None,
                 query: Optional[str] = None,
                 out_dir: Optional[str] = None,
                 out_name: Optional[str] = None,
                 max_rows: int = 50000):
        super().__init__("SQLSelectToCSVAgent")
        self.source_url = source_url or getattr(settings, "SOURCE_DB_URL", None) or getattr(settings, "EXTERNAL_DB_URL", None)
        if not self.source_url:
            raise ValueError("SQLSelectToCSVAgent: SOURCE_DB_URL/EXTERNAL_DB_URL nije podešen.")
        self.query = query or getattr(settings, "SQL_INGEST_QUERY", None)
        if not self.query:
            raise ValueError("SQLSelectToCSVAgent: SQL_INGEST_QUERY nije podešen.")
        self.max_rows = max_rows
        self.out_dir = Path(out_dir or getattr(settings, "SQL_EXPORT_DIR", "/app/uploads/sql_exports")).resolve()
        self.out_dir.mkdir(parents=True, exist_ok=True)
        if out_name:
            self.out_name = out_name if out_name.lower().endswith(".csv") else f"{out_name}.csv"
        else:
            self.out_name = "db_select_export.csv"

    async def process(self, context: ProcessingContext) -> ProcessingContext:
        if not self._is_safe_query(self.query):
            raise ValueError("SQLSelectToCSVAgent: dozvoljen je samo SELECT/CTE.")
        engine = create_engine(self.source_url)
        rows, columns = self._fetch_rows(engine, self.query, self.max_rows)
        csv_path = self._write_csv(rows, columns)
        context.file_path = str(csv_path)
        context.filename = csv_path.name
        context.document_type = DocumentType.CSV
        context.text_content = ""  # TextExtract će ga popuniti
        context.metadata["sql_rows"] = rows[:min(50, len(rows))]
        context.metadata["sql_row_count"] = len(rows)
        context.metadata["sql_source_url_dialect"] = create_engine(self.source_url).dialect.name
        context.metadata["sql_csv_path"] = str(csv_path)
        context.metadata["sql_select_safe"] = True
        return context

    def _fetch_rows(self, engine: Engine, query: str, max_rows: int) -> tuple[list[list[Any]], list[str]]:
        rows, columns = [], []
        try:
            with engine.connect() as conn:
                res = conn.execute(text(query))
                columns = list(res.keys())
                for i, r in enumerate(res):
                    if i >= max_rows: break
                    row = []
                    for v in r:
                        if hasattr(v, "isoformat"):
                            row.append(v.isoformat())
                        else:
                            row.append(v)
                    rows.append(row)
        except SQLAlchemyError as e:
            raise Exception(f"SQLSelectToCSVAgent: DB error: {e}") from e
        return rows, columns

    def _safe_csv_path(self) -> Path:
        from datetime import datetime
        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        base = self.out_name.replace(".csv", f"_{ts}.csv")
        return (self.out_dir / base).resolve()

    def _write_csv(self, rows: List[List[Any]], columns: List[str]) -> Path:
        df = pd.DataFrame(rows, columns=columns)
        df.columns = [str(c).strip() for c in df.columns]
        df = df.replace({pd.NA: "", None: ""})
        path = self._safe_csv_path()
        try:
            df.to_csv(path, index=False)
        except Exception:
            df.to_csv(path, index=False, encoding="utf-8", errors="ignore")
        return path

    def _is_safe_query(self, q: str) -> bool:
        U = q.strip().upper()
        bad = ['DROP','DELETE','UPDATE','INSERT','CREATE','ALTER','TRUNCATE','EXEC','EXECUTE','MERGE']
        if any(re.search(rf'\b{kw}\b', U) for kw in bad):
            return False
        return U.startswith("SELECT") or U.startswith("WITH")
