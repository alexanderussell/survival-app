from __future__ import annotations

from fastapi import APIRouter, Depends

from backend.dependencies import get_llm_manager, get_vectorstore
from backend.llm.manager import LLMManager
from backend.rag.vectorstore import VectorStore

router = APIRouter()


@router.get("/api/health")
async def health(
    llm: LLMManager = Depends(get_llm_manager),
    vectorstore: VectorStore = Depends(get_vectorstore),
):
    """Health endpoint — always returns 200 if server is running."""
    # Estimate model size for capability detection
    model_size_gb = None
    if llm.is_loaded and llm.model_name:
        try:
            from backend.config import settings
            model_path = settings.models_dir / llm.model_name
            if model_path.exists():
                model_size_gb = round(model_path.stat().st_size / (1024**3), 1)
        except Exception:
            pass

    return {
        "status": "ok",
        "model_loaded": llm.is_loaded,
        "model_name": llm.model_name,
        "model_size_gb": model_size_gb,
        "indexed_chunks": vectorstore.count_chunks(),
    }
