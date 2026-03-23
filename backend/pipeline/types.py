from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, TypeAlias

SafetyTier: TypeAlias = Literal["curated", "guarded"]


@dataclass(frozen=True)
class ScoredChunk:
    chunk_id: str
    text: str
    source: str
    section: str = ""
    score: float = 0.0
    dense_score: float = 0.0
    sparse_score: float = 0.0
    safety_tier: SafetyTier = "guarded"
