# Research Brief v36 — Project README

*Status: active · continuous-enhancement / documentation · authored by the loop*

## Rationale — why this, now

After 35 briefs Tutti is a substantial monorepo — a pure scheduling engine, an ingestion layer, and a
feature-rich offline PWA — but it has **no top-level README**. Anyone opening the repo (the owner
months from now, a future contributor, or just to remember how to run it) has to reverse-engineer the
structure from `package.json` and the `docs/` briefs. At feature-saturation for the seeded scope, the
highest-value polish is a clear, accurate README that explains **what Tutti is, how it's built, how to
run and test it, and the principles that hold** (engine purity, no-LLM-on-the-cooking-path, offline,
the green gate). It's the front door the project never had.

### Research findings folded in (web pass, June 2026)

- A good README runs **overview → architecture/structure → getting started → testing → tech/principles**,
  in plain language, kept accurate. Show the folder layout; give exact run/test commands.

## Definition of done

A root `README.md` exists that accurately describes Tutti: one-line pitch + overview, the monorepo
layout, getting-started (install/dev/gate), the testing/gate story, the tech stack, and the core
principles — all matching the real scripts and structure; the gate stays green (docs don't affect it).

## Items — small, ordered (GATE_EXIT=0 before commit)

1. **Write `README.md`** at the repo root: title + one-liner; **Overview** (a deterministic
   cooking-scheduling engine that models a meal as a DAG scheduled against finite resources incl. the
   cook's hands → every dish hot at once); **Architecture** (the three layers: ingest → pure engine →
   React UI, with the "no LLM on the cooking path" rule) + the folder tree (`packages/engine`,
   `packages/ingest`, `apps/web`, `docs/`); **Getting started** (`npm install`, `npm run dev`
   → http://localhost:5180, build); **The gate** (`npm run gate` = typecheck + tests +
   build + pwa-check + perf-check + smoke; what each guards); **Testing** (vitest + fast-check six
   invariants + Testing Library; ~276 tests; how to run a single web test via the workspace);
   **Highlights/feature set** (offline-installable PWA, multi-dish interleaving, recipe ingestion,
   on-device pace learning, a11y 100, etc.); **Principles** (engine pure & framework-free; local-first,
   nothing leaves the device; honest about infeasible plans). Keep it accurate to the current scripts.
2. **Verify accuracy.** Cross-check the documented scripts/paths against `package.json` and the tree;
   fix any drift. Don't document features that don't exist; don't claim a dark theme unless present.
3. **Gate.** Run `npm run gate` to confirm nothing broke (a README is inert); commit.

## Enforce-what-you-build
- README commands/paths match the real `package.json` scripts and workspace layout (manually verified).
- gate stays green.

## When substantially done
Run a web-research pass on the next gap (onboarding polish, keyboard shortcuts, or another competitor
feature) and **author `docs/Research-Brief-v37-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://www.freecodecamp.org/news/how-to-structure-your-readme-file/
- https://dev.to/merlos/how-to-write-a-good-readme-bog
