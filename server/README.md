# `server/` — Node.js Backend (INACTIVE in current build)

**Status: NOT CALLED BY THE ACTIVE DESKTOP GUI.**

This Node.js + Express service exists in the repository but is **not wired to the active `src/gui` (egui) application**. The desktop GUI is fully self-contained: it uses its own embedded SQLite database, talks directly to Ollama, and does all scanning/dedup via Rust crates (`shared-scanner`, `native/file_deduplicator`).

## Why it's here

This service is the **optional web-mode backend** for a future web frontend (Vue/Tauri or similar). The Vue frontend that would call it is currently archived in `archive/vue-frontend/`. If/when a web UI is brought back, this service would be the backend it talks to.

## See also

- `docs/FEATURE_EVALUATION.md` — the row-by-row audit that classified this service as INACTIVE.
- `docs/ISSUES.md` — historical issue tracker; relevant issues: 004, 005, 006, 013, 016, 026, 029.

## Known broken imports (non-runnable as-is)

The following files `require` modules that **do not exist** in this repository. They will crash on load. Do not start this service until these are resolved (either fix the import, write the missing module, or delete the file).

- `server/EnhancedStreamingService.js` → `require('./OpenSourceAIManager')` — module missing.
- `server/SmartAnalysisService.js` → `require('../src/integration/smart-orchestrator.cjs')` — path missing.

## Mock / placeholder endpoints

The following endpoints return hardcoded or `Math.random()` data. They are listed in `docs/ISSUES.md` Issue 029 and should not be treated as real.

- `GET /api/analytics/trends`
- `GET /api/analytics/performance`
- `GET /api/analytics/predict`

## Status of individual files

| File | Status | Notes |
|------|--------|-------|
| `server-improved.js` | Inactive | 702 LOC; would be the entry point of a future web mode. |
| `analytics.js` | Inactive / broken | Mock data. |
| `EnhancedStreamingService.js` | Inactive / broken | Missing dependency. |
| `SmartAnalysisService.js` | Inactive / broken | Missing dependency. |
| `SelfLearningMLService.js` | Inactive | "Simplified mode" — no real ML. |
| `speculative-decoder.js` | Inactive | Requires large+small model pairing; oversized for the project's GPU target. |
| `worker-pool.js` / `worker.js` | Inactive | Thread pool; Rust handles parallelism via `rayon`/`shared-scanner`. |
| `scan-cache.js`, `scan-filter.js`, `scan-profiles.js` | Inactive | Equivalent logic in Rust. |
| `file-preview.js` | Inactive | Only relevant for a web frontend. |
| `KnowledgeDatabase.js` | Inactive | 9-line re-export. |
| `config/`, `controllers/`, `db/`, `learning/`, `middleware/`, `modules/`, `python-ai-service/`, `routes/`, `services/`, `utils/` | Inactive | Supporting subtree. |

## Do not start this server unless you are actively developing a web frontend.

The desktop app does not need it and will not benefit from it being up.
