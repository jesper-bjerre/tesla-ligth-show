# Architecture

## Overview

This monorepo builds a Tesla Custom Light Show generator as a production-style web application.

```
tesla-light-show/
├── apps/
│   └── web/                  Next.js App Router frontend
├── packages/
│   └── shared/               Canonical TypeScript types (ShowTimeline, etc.)
├── services/
│   └── api/                  Python FastAPI backend + audio worker
├── LightShow/                Example .fseq files (existing demo shows)
├── docker-compose.yml        Local dev environment
├── pnpm-workspace.yaml       pnpm monorepo config
└── AGENTS.md                 Agent/Codex instructions
```

---

## Frontend (`apps/web`)

**Stack:** Next.js 16 App Router · TypeScript · Tailwind CSS v4 · React Three Fiber · Three.js · wavesurfer.js

### Key components

| Component | Role |
|---|---|
| `LightShowStudio` | Root orchestrator — manages job state, polling, exports |
| `AudioUploader` | Drag-and-drop + file picker; validates extension and size client-side |
| `ModelSelector` | Selects Tesla model preset for preview |
| `StyleSelector` | Selects visual style (clean / energetic / cinematic / cybertruck) |
| `PreviewCanvas` | React Three Fiber 3D preview; channel values mapped to light anchor positions |
| `WaveformTimeline` | wavesurfer.js waveform + play/pause; clock source for preview sync |
| `ExportPanel` | Selects WAV/MP3, triggers ZIP download |
| `JobProgressBar` | Polling status indicator |

### Audio sync strategy

The `WaveformTimeline` uses `wavesurfer.js` which internally uses the Web Audio API `AudioContext`. The preview clock must read `currentTime` from this context. In the current MVP, the `currentFrameRef` in `PreviewCanvas` is advanced in `useFrame` — it will be wired to the WaveSurfer `currentTime` in milestone 2.

---

## Backend (`services/api`)

**Stack:** Python 3.11 · FastAPI · librosa · FFmpeg (subprocess) · pydantic v2

### Pipeline

```
Upload (MP3/WAV)
  → audio_normalizer.py   FFmpeg → stereo 44.1 kHz WAV master
  → timeline_generator.py librosa beat/onset/band-energy → ShowTimeline
  → job_store.py          in-memory job state (replace with Redis/DB for production)

GET /api/jobs/:id/export
  → fseq_writer.py        ShowTimeline → Tesla V2 Uncompressed FSEQ binary
  → zip_exporter.py       FSEQ + master.wav + README.md → ZIP
```

### FSEQ format derivation

The FSEQ writer implements Tesla's V2 Uncompressed format based on:
- Tesla's official validator (`validator.py` in tesla/light-show repo)
- Tesla's xLights project assets

Header fields validated:
- Magic: `PSEQ`
- Major version: 2
- Compression type: 0 (uncompressed)
- Step time: 20 ms (≥ 15 ms per Tesla requirement)
- Channel count: exactly 48 or 200

### Channel mapping

Phase 1 uses 48 channels (cross-vehicle safe subset). Channel layout is documented in `timeline_generator.py`. Full 200-channel mapping must be derived from Tesla's official xLights project — see `AGENTS.md`.

### YouTube import

Gated behind `ENABLE_YOUTUBE_IMPORT=true` env var. Requires user rights confirmation. Not yet fully implemented (returns 501).

---

## Shared types (`packages/shared`)

Single source of truth TypeScript types shared between the frontend and (optionally) the API via generated schemas.

Key type: `ShowTimeline` — used identically for browser preview rendering and FSEQ export generation.

---

## ZIP export structure

Exact required structure per Tesla documentation:

```
README.md
LightShow/<basename>.fseq
LightShow/<basename>.wav   (or .mp3 if user chose MP3)
```

The basename of the FSEQ and audio file **must match exactly**.

---

## Testing strategy

| Layer | Tool | What is tested |
|---|---|---|
| FSEQ writer | pytest | Header magic, version, compression, step time, channel count, frame count, body bytes |
| ZIP exporter | pytest + mock | Exact zip structure, basename match, README content |
| API endpoints | pytest + httpx | Upload, YouTube gate, job not found |
| Frontend unit | vitest | (to be added) |
| E2E | Playwright | WAV upload → preview loads → ZIP download |
| Tesla compat | `validator.py` | Run against generated `.fseq` in CI smoke test |

---

## Local development

### Prerequisites

- Node.js 20+
- pnpm 9+
- Python 3.11+
- FFmpeg on PATH

### Start

```bash
# Install JS deps
pnpm install

# Start frontend (http://localhost:3000)
pnpm dev

# Start backend (http://localhost:8000)
cd services/api
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload

# Run backend tests
pytest
```

### Docker Compose

```bash
docker compose up
```

---

## Decisions log

| Decision | Rationale |
|---|---|
| WAV default export | Tesla recommends WAV at 44.1 kHz for correct sync |
| 20 ms frame interval | Tesla's own xLights project recommendation |
| 48 channels (phase 1) | Cross-vehicle safe; avoids model-specific edge cases |
| Lights-only phase 1 | Closures have actuation limits and thermal constraints |
| librosa for audio analysis | First-class beat tracking and onset detection; Python-native |
| FFmpeg for normalization | Industry standard; handles all audio input formats |
| In-memory job store | Simple for MVP; replace with Redis/DB before production |
