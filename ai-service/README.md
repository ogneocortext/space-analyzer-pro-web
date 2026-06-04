# `ai-service/` — Python AI Service (INACTIVE in current build)

**Status: NOT CALLED BY THE ACTIVE DESKTOP GUI.**

This Python + FastAPI service exists in the repository but is **not wired to the active `src/gui` (egui) application**. The desktop GUI is fully self-contained: it has its own Ollama client at `src/ollama/` and its own offline heuristics at `src/offline_ai.rs`. The active GUI never makes an HTTP call to this service.

## Why it's here

This service is the **optional web-mode AI backend** for a future web frontend (Vue/Tauri or similar). The Vue frontend that would call it is currently archived in `archive/vue-frontend/`. If/when a web UI is brought back, this service would provide ML categorization, predictions, and Ollama proxy endpoints.

## See also

- `docs/FEATURE_EVALUATION.md` — the row-by-row audit that classified this service as INACTIVE.

## Status of individual files

| File | Status | Notes |
|------|--------|-------|
| `main.py` (top-level) | Deprecated wrapper | Prints a deprecation banner and redirects to `python -m app.main`. Kept for backward compatibility. |
| `app/main.py` | Inactive | "Unified v3.0.0" FastAPI service with 5 routers (auth, categorizer, health, ollama, predictions). |
| `app/routers/{auth,categorizer,health,ollama,predictions}.py` | Inactive | Endpoint handlers for the unified service. |
| `app/services/{ml_predictions,ml_service,ollama_service}.py` | Inactive | ML and Ollama service logic — Rust reimplements in `src/ollama/`. |
| `ml_categorizer/src/{api,categorizer,trainer}.py` | Inactive | scikit-learn based ML categorizer. Rust `offline_ai.rs` does extension-based categorization, which is the right level for this use case. |
| `ollama_client.py` | Inactive | Rust has its own Ollama client in `src/ollama/`. |
| `models/` | Inactive | Empty / gitignored. Once you commit to Rust-side heuristics + Ollama, no model artifacts are needed here. |
| `scripts/`, `automated_feedback_loop.py`, `test_api.py` | Inactive | Test infrastructure for the service. |

## Do not start this service unless you are actively developing a web frontend.

The desktop app does not need it. The Rust `src/ollama/` + `src/offline_ai.rs` cover the same ground for the active GUI.
