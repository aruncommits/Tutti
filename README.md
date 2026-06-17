# Tutti

Cook a whole multi-dish meal like a pro kitchen — every dish hot, at the same time.

Tutti models cooking as a **Directed Acyclic Graph** of tasks scheduled against finite
resources (burners, pots, oven — and the cook's own **hands**). Because hands are a resource,
**cross-dish interleaving** (hiding the chopping inside the simmering) falls out automatically.
It is a **deterministic engine**; an LLM is used only offline, at the edges, to parse recipe
text into a graph that a human verifies before anyone cooks from it. **No LLM ever sits on the
cooking path.**

The full spec lives in [`docs/`](docs/) (the spec internally calls the product "DagChef").

## Monorepo layout (npm workspaces)

| Package | What it is |
|---|---|
| `packages/engine` | Pure, dependency-free scheduling engine (Doc 2). The asset. |
| `packages/ingest` | Offline recipe ingestion: paste / find online / AI → validated graph (Doc 5). |
| `apps/web` | Responsive React + Vite Cook Mode (Doc 7). Capacitor-ready for native later. |

## Commands

```bash
npm install          # install all workspaces
npm run typecheck    # tsc --noEmit across workspaces
npm test             # engine + ingest unit/property tests
npm run dev          # Vite dev server on http://localhost:5180
npm run build        # production build of apps/web
npm run smoke        # HTTP smoke (server must be up): confirms Tutti is served
npm run gate         # typecheck + test + build + smoke (the loop's green gate)
```

The web app runs on a **dedicated port 5180 with strictPort** so a collision fails loudly
instead of silently serving another app.

## How this is built

Development runs as an **unattended, self-pacing loop** (see
[`docs/Unattended-Development-Cycle.md`](docs/Unattended-Development-Cycle.md)): it builds Tutti
phase-by-phase from the roadmap, and after each phase researches and enhances before continuing.
Plans live in `docs/Research-Brief-v*.md`; loop state in `.loop-state.json`.
