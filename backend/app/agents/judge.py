from typing import Any, Dict
import json
from app.services.llm_client import llm_complete


def _safe_json(s: str):
    """Parse JSON sa fallback-om."""
    try:
        return json.loads(s)
    except Exception:
        return {"ok": True, "needs_more": False, "notes": "fallback"}


class JudgeAgent:
    """
    Evaluira kvalitet generisanog odgovora i odlučuje da li su potrebni dodatni izvori.
    """
    name = "judge"
    
    def run(self, ctx: Dict[str, Any]) -> Dict[str, Any]:
        """
        Procjenjuje da li odgovor pravilno koristi kontekst bez halucinacija.
        
        Args:
            ctx: Kontekst sa 'answer' i 'retrieval' dict-om
        
        Returns:
            Ažurirani kontekst sa 'verdict' dict-om: {ok, needs_more, notes}
        """
        answer = ctx.get("answer", "")
        chunks = ctx.get("retrieval", {}).get("hits", [])
        cite_texts = "\n".join((c.get("content", "") or "")[:400] for c in chunks[:3])
        
        prompt = (
            "Kao kritičar na bosanskom jeziku, procijeni da li odgovor dosljedno koristi kontekst i ne halucinira. "
            "Vrati strogo JSON: {\"ok\": bool, \"needs_more\": bool, \"notes\": \"...\"}.\n\n"
            f"ODGOVOR:\n{answer}\n\nKONTEKST (skraćeno):\n{cite_texts}"
        )
        
        raw = llm_complete(prompt, n=1)[0]
        ctx["verdict"] = _safe_json(raw or "")
        return ctx
