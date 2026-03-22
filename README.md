# Project Almanac

An open-source, self-hosted survival knowledge platform. Dockerized, offline-first, with RAG-grounded AI responses you can actually trust.

**The problem:** Existing offline survival AI apps use small models with zero safety guardrails — a model can confidently misidentify a deadly mushroom as edible. Project Almanac treats accuracy as a life-safety engineering problem.

## Quick Start

```bash
docker run -d \
  --name almanac \
  -p 8080:8080 \
  -v almanac-config:/app/config \
  -v almanac-models:/app/models \
  -v almanac-content:/app/content \
  ghcr.io/project-almanac/almanac:latest
```

Open `http://localhost:8080`. The setup page will guide you through downloading a model.

### Docker Compose

```yaml
services:
  almanac:
    image: ghcr.io/project-almanac/almanac:latest
    ports:
      - "8080:8080"
    volumes:
      - almanac-config:/app/config
      - almanac-models:/app/models
      - almanac-content:/app/content
    environment:
      - PUID=1000
      - PGID=1000
    restart: unless-stopped

volumes:
  almanac-config:
  almanac-models:
  almanac-content:
```

## Hardware Requirements

| Device | RAM | Recommended Model | Performance |
|--------|-----|-------------------|-------------|
| Raspberry Pi 5 | 8 GB | Phi-3 Mini 3.8B Q4 | ~5-10 tok/s |
| Synology NAS (J4125) | 8+ GB | Qwen2.5 3B Q4 | ~3-6 tok/s |
| UGREEN NAS (N-series) | 8-16 GB | Phi-3 Mini 3.8B Q4 | ~10-15 tok/s |
| Home server | 16+ GB | Mistral 7B Q4 | ~15-30 tok/s |

**Minimum: 8 GB RAM.** The system detects your hardware and recommends an appropriate model.

## Features

- **RAG-grounded responses** — every answer is backed by retrieved source material with citations
- **Confidence scoring** — visual indicator showing how well-grounded each response is
- **Safety floor** — when sources are insufficient, the system warns you rather than guessing
- **Offline-first** — works fully offline after initial setup (model + content loaded)
- **Self-hosted** — single Docker container, no cloud dependencies, no telemetry
- **Homesteading knowledge base** — food preservation, gardening, solar power, water systems, construction, animal husbandry
- **Extensible content packs** — add your own knowledge by placing JSONL files in the content volume

## Architecture

Single Docker container running:

- **FastAPI** backend with SSE streaming
- **React** frontend (Vite, TypeScript)
- **sqlite-vec** for vector search (KNN embeddings)
- **SQLite FTS5** for keyword search (BM25)
- **Hybrid retrieval** with Reciprocal Rank Fusion
- **llama-cpp-python** for local LLM inference
- **fastembed** for local embeddings (all-MiniLM-L6-v2)

## Content Packs

The system comes with a built-in homesteading content pack sourced from public domain materials (USDA, FEMA, Extension Service publications).

### Adding Content

Place JSONL files in the content volume:

```
/app/content/packs/my-pack/
    topic-one.jsonl
    topic-two.jsonl
```

Each JSONL line:
```json
{"chunk_id": "unique_id", "text": "Content text...", "source": "Source Name", "section": "Section Title"}
```

Content is automatically indexed on container restart.

### Pre-computed Embeddings

For faster indexing (especially on Raspberry Pi), include pre-computed embeddings:

```
/app/content/packs/my-pack/
    topic.jsonl
    embeddings/
        embeddings.npy    # numpy array, shape (n_chunks, 384)
```

## Configuration

All settings via environment variables with `ALMANAC_` prefix:

| Variable | Default | Description |
|----------|---------|-------------|
| `ALMANAC_PORT` | `8080` | Server port |
| `ALMANAC_CONFIG_DIR` | `/app/config` | Config/database directory |
| `ALMANAC_MODELS_DIR` | `/app/models` | GGUF model directory |
| `ALMANAC_CONTENT_DIR` | `/app/content` | User content packs directory |
| `ALMANAC_MIN_RETRIEVAL_SCORE` | `0.3` | Safety floor threshold |
| `PUID` | `1000` | User ID for file permissions |
| `PGID` | `1000` | Group ID for file permissions |

## Development

```bash
# Backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
ALMANAC_CONFIG_DIR=./data ALMANAC_MODELS_DIR=./models ALMANAC_CONTENT_DIR=./content ALMANAC_BUILTIN_DIR=./builtin \
  uvicorn backend.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

## Security

- Runs as non-root user in Docker
- Read-only root filesystem (production compose)
- All capabilities dropped
- Security headers (CSP, X-Frame-Options, X-Content-Type-Options)
- No telemetry, no phone-home, no external API calls
- Input validation (2048 char message limit)
- Concurrency control (single-request semaphore prevents OOM)

## Roadmap

- [x] Phase 1: Foundation + LLM inference
- [x] Phase 2: RAG pipeline + safety floor
- [x] Phase 3: Polish + ship
- [ ] Phase 4: Additional knowledge domains (wilderness survival, medical, disaster prep)
- [ ] Phase 5: Content pack marketplace
- [ ] Phase 6: Native mobile app (React Native)
- [ ] Phase 7: Hardware products

## License

AGPL-3.0 — see [LICENSE](LICENSE).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
