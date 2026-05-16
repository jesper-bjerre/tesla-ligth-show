# AGENTS.md

## Repository expectations

- Use TypeScript in the web app and Python 3.11+ in the API/worker.
- Keep the architecture split into:
  - apps/web
  - services/api
  - packages/shared
- Never hardcode Tesla channel order from memory or blogs. Derive and document channel mappings from Tesla's official light-show project assets and validator.
- Prefer deterministic pipelines over "magic AI" behavior.
- Default export audio format must be WAV unless the user explicitly chooses MP3.
- Internal canonical audio master must always be normalized to 44.1 kHz before analysis/export.
- Phase 1 is lights-only. Do not implement closures unless explicitly enabled behind a feature flag.
- All preview playback must be driven by the same canonical timeline data that is used to generate the FSEQ.
- The ZIP export structure must be:
  - README.md
  - LightShow/<basename>.fseq
  - LightShow/<basename>.wav or .mp3
- The FSEQ basename and the audio basename must match exactly.
- Add tests for upload, timeline generation, FSEQ generation, ZIP export and preview synchronization.
- Add Playwright E2E tests for local WAV upload and ZIP download.
- If YouTube import is implemented, gate it behind ENABLE_YOUTUBE_IMPORT and require an explicit user rights confirmation checkbox.
- Never describe YouTube import as using the official YouTube API for audio extraction.
- Run all of the following before considering the task done:
  - pnpm lint
  - pnpm typecheck
  - pnpm test
  - pnpm test:e2e
- Document all non-obvious implementation decisions in docs/architecture.md.
