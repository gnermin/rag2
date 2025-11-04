from typing import Optional, Dict, Any
from pathlib import Path
import pandas as pd
import numpy as np
from app.agents.base import BaseAgent
from app.agents.types import ProcessingContext

class TableAggregateAgent(BaseAgent):
    """
    Agregacije nad CSV/XLSX:
      op: 'count'|'sum'|'avg'|'min'|'max'
      column: ciljna kolona (nije potrebna za 'count' bez groupby)
      filter: npr {"distance_km": ("<=", 50)}, {"city":("==","Sarajevo")}
      groupby: kolona za grupisanje
      csv_path_key: default koristi context.metadata['matches_csv_path'] ako postoji (poslije pretrage),
                    inače context.metadata['sql_csv_path'] ili context.file_path
    """

    def __init__(self,
                 op: str,
                 column: Optional[str] = None,
                 filter: Optional[Dict[str, Any]] = None,
                 groupby: Optional[str] = None,
                 csv_path_key_order: tuple = ("matches_csv_path","sql_csv_path")):
        super().__init__("TableAggregateAgent")
        self.op = op.lower().strip()
        self.column = column
        self.filter = filter or {}
        self.groupby = groupby
        self.csv_path_key_order = csv_path_key_order
        assert self.op in {"count","sum","avg","min","max"}, "Nepodržana operacija."

    async def process(self, context: ProcessingContext) -> ProcessingContext:
        p = None
        for k in self.csv_path_key_order:
            p = context.metadata.get(k)
            if p: break
        if not p:
            p = context.file_path
        if not p:
            raise ValueError("TableAggregateAgent: nema CSV/XLSX putanje u contextu.")

        path = Path(p)
        if not path.exists():
            raise FileNotFoundError(f"Ne postoji fajl: {path}")

        if path.suffix.lower()==".csv":
            df = pd.read_csv(path)
        else:
            df = pd.read_excel(path)
        df.columns = [str(c).strip() for c in df.columns]

        # filteri
        for col,(op,val) in (self.filter or {}).items():
            if col not in df.columns: continue
            s = df[col]
            s_num = pd.to_numeric(s, errors="coerce")
            if op == "==": df = df[s == val]
            elif op == "!=": df = df[s != val]
            elif op == "<=": df = df[s_num <= float(val)]
            elif op == "<":  df = df[s_num <  float(val)]
            elif op == ">=": df = df[s_num >= float(val)]
            elif op == ">":  df = df[s_num >  float(val)]

        result = None
        if self.groupby:
            if self.groupby not in df.columns:
                result = []
            else:
                if self.op=="count":
                    agg = df.groupby(self.groupby, dropna=False).size().reset_index(name="count")
                else:
                    if not self.column or self.column not in df.columns:
                        result = []
                    else:
                        s = pd.to_numeric(df[self.column], errors="coerce")
                        df2 = df.copy(); df2[self.column]=s
                        if self.op=="sum": agg = df2.groupby(self.groupby, dropna=False)[self.column].sum().reset_index(name="sum")
                        elif self.op=="avg": agg = df2.groupby(self.groupby, dropna=False)[self.column].mean().reset_index(name="avg")
                        elif self.op=="min": agg = df2.groupby(self.groupby, dropna=False)[self.column].min().reset_index(name="min")
                        elif self.op=="max": agg = df2.groupby(self.groupby, dropna=False)[self.column].max().reset_index(name="max")
                result = agg.to_dict(orient="records") if result is None else result
        else:
            if self.op=="count":
                result = {"count": int(len(df))}
            else:
                if not self.column or self.column not in df.columns:
                    result = {}
                else:
                    s = pd.to_numeric(df[self.column], errors="coerce")
                    if self.op=="sum": result = {"sum": float(np.nansum(s))}
                    elif self.op=="avg": result = {"avg": float(np.nanmean(s))}
                    elif self.op=="min": result = {"min": float(np.nanmin(s))}
                    elif self.op=="max": result = {"max": float(np.nanmax(s))}
        context.metadata["aggregate"] = result
        context.metadata.setdefault("aggregate_source", str(path))
        return context
