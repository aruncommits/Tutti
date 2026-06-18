# Tutti

**Cook a whole multi-dish meal like a pro kitchen — every dish hot, on the table, at the same moment.**

Tutti models cooking as a **Directed Acyclic Graph** of tasks scheduled against finite resources
(burners, pans, oven — and the cook's own **hands**). Because hands are a resource, **cross-dish
interleaving** (hiding the chopping inside the simmering) falls out automatically — the thing other
apps can't do. It is a **deterministic engine**; an LLM is used only offline, at the edges, to parse
recipe text into a graph a human verifies before anyone cooks from it. **No LLM ever sits on the
cooking path.**

You add dishes (paste a recipe, fetch a URL, or parse with AI), set a serve time, and Tutti compiles
one parallel plan that hits it — then runs a live three-tier **Cook Mode** (NOW / NEXT / DONE) that
promotes the next step the instant you tap a task done. Add a second cook and it re-schedules in
parallel and shows how much sooner you'll eat.

The full spec lives in [`docs/`](docs/) (the spec internally calls the product "DagChef").

## Architecture

Three layers with one hard rule — **no LLM ever sits on the cooking path** (it's offline, at the edge):

```
 Ingest (offline)            Engine (pure)                Experience (React)
 paste · URL · AI      →     compile · schedule     →     responsive Cook Mode
 → validate() → data         · reschedule · pace          renders ViewState
 ★ LLM only here ★           ★ no LLM, instant, local ★   ★ pure render ★
```

### Monorepo layout (npm workspaces)

| Package | What it is |
|---|---|
| `packages/engine` | Pure, dependency-free scheduling engine (Doc 2): `compile` / `deriveViewState` / `applyEvent` / `reschedule` + `validate` (Kahn's cycle check). RCPSP greedy list-scheduler with hands-as-a-resource; six invariants property-tested. **The asset.** |
| `packages/ingest` | Offline recipe ingestion: paste / JSON-LD / URL / AI → validated `RecipeGraph` (Doc 5). The Anthropic SDK is isolated behind `@tutti/ingest/ai` and never bundled into the browser. |
| `apps/web` | Responsive React + Vite PWA Cook Mode (Doc 7): planning flow, recipe library, on-device learning, offline service worker. Mobile-first, fluid to desktop. Capacitor-ready for native later. |
| `docs/` | the product spec + every `Research-Brief-vN` that drove a build phase. |

The engine is framework-free and pure, so the same scheduling core can back a future native client.

## Getting started

```bash
npm install          # install all workspaces
npm run dev          # Vite dev server → http://localhost:5180
npm run build        # production build of apps/web (emits the PWA service worker + manifest)
```

The web app runs on a **dedicated port 5180 with strictPort** so a collision fails loudly instead of
silently serving another app. Optional: copy `.env.example` and add `ANTHROPIC_API_KEY` to enable the
live AI recipe parser — it is **not** required; paste/URL parsing and the entire cooking path work
without any key.

## The gate

Every change is held to one green gate before it lands:

```bash
npm run gate
```

which runs, in order:

| step | guards |
|---|---|
| `typecheck` | TypeScript across all workspaces |
| `test` | engine units + **six scheduling invariants** (fast-check) + ingest contracts + web component & end-to-end journey tests |
| `build` | the web app builds |
| `pwa-check` | the build emits a manifest + service worker that precache the shell **and fonts** (offline-ready) |
| `perf-check` | the bundle is code-split and the entry chunk stays under budget |
| `smoke` | the running app returns 200 and serves "Tutti" |

## Testing

Tests use **Vitest**, **fast-check** (property tests for the engine's invariants), and
**@testing-library/react** (component + journey tests, jsdom). Run all with `npm run test`; run a
single web test from its workspace (the jsdom env lives there):

```bash
cd apps/web && npx vitest run src/<file>.test.tsx
```

## Highlights

Offline-installable PWA · multi-dish hands-aware interleaving · "cooking with help" (multi-cook)
re-scheduling · recipe ingestion (paste / URL / AI) · seeded recipe library with search + filters ·
on-device pace learning · ratings, notes, photos & saved meals · "what should I cook tonight?"
suggestion · mise-en-place checklist · pantry staples · metric units · print · share · Lighthouse
accessibility 100.

## Principles

- **Engine is pure and framework-free** — no clock, no LLM, no I/O; deterministic and property-tested.
- **No LLM on the cooking path** (Doc 1 P2) — parsing is offline at the edge; the runtime is instant.
- **Local-first** — your meals, ratings, notes, photos, and pace stay in your browser; nothing is
  uploaded. Export or wipe it anytime from Settings.
- **Honest** — it never fakes a serve time it can't meet, and degrades gracefully (corrupt data
  self-heals; a screen error falls back instead of white-screening).

## How this is built

Development runs as an **unattended, self-pacing loop** (see
[`docs/Unattended-Development-Cycle.md`](docs/Unattended-Development-Cycle.md)): it builds Tutti
phase-by-phase from the roadmap, and after each phase researches and enhances before continuing.
Plans live in `docs/Research-Brief-v*.md`; loop state in `.loop-state.json`.
