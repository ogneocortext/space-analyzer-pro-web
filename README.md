# Space Analyzer Pro — Web Implementation (Archived)

> **Status:** Archived / Read-only backup. The active development is the **Rust desktop app** at [space-analyzer-pro](https://github.com/ogneocortext/space-analyzer-pro).

This repository is a snapshot of the **Vue 3 + Vite frontend** and **Node.js / FastAPI backend** implementation of Space Analyzer Pro, captured before the project's transition to a native Rust desktop application.

## Purpose

Preserved as a historical reference and backup of the web-based architecture. Not actively maintained, deployed, or recommended for new development.

## Repository Structure

```
.
├── server/             # Node.js / Express backend (file scanning API, ML proxies)
├── ai-service/         # Python / FastAPI ML service (Ollama client, categorizer)
├── styles/             # CSS stylesheets (Tailwind build outputs)
├── public/             # Static assets
├── tests/              # Playwright E2E + Vitest unit tests
├── scripts/            # Build, lint, and test scripts
├── .github/            # CI workflows (Playwright tests)
├── vite.config.ts      # Vite build config
├── playwright.config.ts
├── tailwind.config.js
└── package.json (missing — see Note)
```

## What Was Here

- **Frontend**: Vue 3 + Vite SPA with Tailwind CSS
- **Backend**: Node.js Express server streaming large scan results
- **AI Service**: Python FastAPI service wrapping Ollama (chat, embeddings, ML categorization)
- **Testing**: Playwright E2E suite + Vitest unit tests

## Active Development

The **Rust desktop application** is the production implementation:

- [ogneocortext/space-analyzer-pro](https://github.com/ogneocortext/space-analyzer-pro)
- Native Windows GUI (egui/eframe)
- Embedded SQLite, no external services
- Optional local Ollama integration (in-process, not HTTP)
- GPU-accelerated file hashing and scanning

## Why the Web App Was Archived

1. **Performance**: Web frontend cannot match native I/O for full-disk scans
2. **Distribution**: Native binary removes browser sandbox limitations
3. **Dependencies**: Web stack required running a Node server + Python service + Ollama
4. **Security**: Server-side file access was a major attack surface

## License

Same as the main project. See commit history in the parent repo for the original license terms.

---

**Note:** This snapshot is for archival reference. The `package.json` and lockfile from the web era are preserved in the parent repo's commit history (pre-`beae2c5`).
