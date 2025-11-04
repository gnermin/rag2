from pathlib import Path
from typing import Optional, Dict, Any, List, Iterable
import re
import pandas as pd
from app.agents.base import BaseAgent
from app.agents.types import ProcessingContext

class TableSearchAgent(BaseAgent):
    """
    Pretraga/filtriranje nad CSV/XLSX:
      - equals / contains / numeric filteri po kolonama
      - full-text kroz sve string kolone (case-insensitive)
    Rezultat:
      context.metadata['matches_preview'] (list[dict])
      context.metadata['matches_count']   (int)
      context.metadata['matches_csv_path'] (ako save_matches_csv=True)
    """

    def __init__(self,
                 csv_path_key: str = "sql_csv_path",
                 limit: int = 50,
                 fulltext: Optional[str] = None,
                 contains: Optional[Dict[str, Iterable[str]]] = None,
                 equals: Optional[Dict[str, Any]] = None,
                 numeric: Optional[Dict[str, tuple]] = None,
                 save_matches_csv: bool = True,
                 out_dir_key: str = "SQL_EXPORT_DIR",
                 case_insensitive: bool = True,
                 normalize_spaces: bool = True):
        super().__init__("TableSearchAgent")
        self.csv_path_key = csv_path_key
        self.limit = limit
        self.fulltext = fulltext
        self.contains = contains or {}
        self.equals = equals or {}
        self.numeric = numeric or {}
        self.save_matches_csv = save_matches_csv
        self.out_dir_key = out_dir_key
        self.case_insensitive = case_insensitive
        self.normalize_spaces = normalize_spaces

    async def process(self, context: ProcessingContext) -> ProcessingContext:
        p = context.metadata.get(self.csv_path_key) or context.file_path
        if not p:
            raise ValueError("TableSearchAgent: CSV/XLSX path missing.")
        path = Path(p)
        if not path.exists():
            raise FileNotFoundError(f"Not found: {path}")

        if path.suffix.lower()==".csv":
            df = pd.read_csv(path, dtype=str)
        else:
            df = pd.read_excel(path, dtype=str)

        df.columns = [str(c).strip() for c in df.columns]
        df = df.replace({pd.NA: "", None: ""})

        if self.normalize_spaces:
            df = df.applymap(lambda x: re.sub(r"\s+", " ", x.strip()) if isinstance(x,str) else x)

        df_str = df.applymap(lambda x: x.lower() if isinstance(x,str) else x) if self.case_insensitive else df
        ft_query = (self.fulltext or "").lower() if self.case_insensitive else (self.fulltext or "")
        contains = {k: [str(v).lower() for v in vs] for k,vs in (self.contains or {}).items()} if self.case_insensitive else (self.contains or {})
        equals = {k: str(v).lower() for k,v in (self.equals or {}).items()} if self.case_insensitive else (self.equals or {})

        mask = pd.Series([True]*len(df_str))
        for col,val in equals.items():
            if col in df_str.columns:
                mask &= (df_str[col] == val)
        for col,terms in contains.items():
            if col in df_str.columns and terms:
                s = df_str[col].fillna("")
                term_mask = False
                for t in terms:
                    term_mask = term_mask | s.str.contains(re.escape(t), na=False)
                mask &= term_mask
        for col,(op,thr) in (self.numeric or {}).items():
            if col in df.columns:
                s_num = pd.to_numeric(df[col], errors="coerce")
                t = float(thr)
                if op=="<=": mask &= (s_num <= t)
                elif op=="<": mask &= (s_num < t)
                elif op==">=": mask &= (s_num >= t)
                elif op==">": mask &= (s_num > t)
                elif op=="==": mask &= (s_num == t)
                elif op=="!=": mask &= (s_num != t)

        if ft_query:
            tokens = [t for t in re.split(r"\s+", ft_query) if t]
            joined = df_str.apply(lambda r: " ".join([str(v) for v in r.values if isinstance(v,str)]), axis=1)
            for tok in tokens:
                mask &= joined.str.contains(re.escape(tok), na=False)

        matches = df[mask].copy()
        preview = matches.head(self.limit).to_dict(orient="records")
        context.metadata["matches_preview"] = preview
        context.metadata["matches_count"] = int(len(matches))

        if self.save_matches_csv:
            out_dir = Path(context.metadata.get(self.out_dir_key) or "/app/uploads/sql_exports")
            out_dir.mkdir(parents=True, exist_ok=True)
            out_path = out_dir / "table_search_matches.csv"
            matches.to_csv(out_path, index=False)
            context.metadata["matches_csv_path"] = str(out_path)

        return context
