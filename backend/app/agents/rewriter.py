from typing import Any, Dict, List
from app.services.llm_client import llm_complete


class RewriterAgent:
    """
    Parafrazira korisnikov upit u više varijanti za poboljšanje pretrage.
    """
    name = "rewriter"
    
    def run(self, ctx: Dict[str, Any]) -> Dict[str, Any]:
        """
        Generiše k varijanti originalnog upita za federated search.
        
        Args:
            ctx: Kontekst sa 'query' i 'plan' dict-om
        
        Returns:
            Ažurirani kontekst sa 'rewrites' listom
        """
        k = int(ctx.get("plan", {}).get("rewrites", 0))
        if k <= 0:
            ctx["rewrites"] = []
            return ctx
        
        prompt = (
            f"Parafraziraj upit u {k} varijanti koje mogu poboljšati vektorsku pretragu. "
            "Sačuvaj semantiku. Vrati svaku varijantu u novom redu bez dodatnog teksta.\n\n"
            f"Upit: {ctx['query']}"
        )
        
        outs = llm_complete(prompt, n=1)
        lines = (outs[0] or "").splitlines()
        rewrites = [ln.strip(" -•\t") for ln in lines if ln.strip()]
        ctx["rewrites"] = rewrites[:k]
        return ctx
