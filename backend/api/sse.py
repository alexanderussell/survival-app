from __future__ import annotations

import json


def sse_event(event: str, **kwargs) -> dict:
    """Build an SSE event dict for EventSourceResponse."""
    return {"event": event, "data": json.dumps({"event": event, **kwargs})}
