# Research Brief v23 — Resilient Persistence (never crash on bad data)

*Status: active · continuous-enhancement · reliability / Doc 1 P4 (app is never the blocker) · authored by the loop*

## Rationale — why this, now

Tutti persists a lot to `localStorage` — screen, dishes, meals, notes, pace, pantry, settings — and
it has shipped 22 briefs of evolving shapes. The Settings work just surfaced the risk concretely: a
single legacy/partial value (a saved meal missing `dishIds`) crashed a whole screen. `usePersistentState`
already guards against *unparseable* JSON (falls back to the default), but not against **structurally
valid yet wrong-shaped** data — an array where an object is expected, a meal missing a field, a
`screen` value that no longer exists. As real users carry data across versions, that's a latent
white-screen waiting to happen, and it violates the core promise that the tool is never what blocks
the cook (Doc 1 P4). Hardening the persistence layer with **validated, self-healing reads** is honest
reliability work that protects every feature at once.

### Research findings folded in (web pass, June 2026)

- **Centralize storage access in one wrapper** (Tutti already has `usePersistentState`) and give it
  **consistent error handling + safe defaults** — don't scatter raw `localStorage` calls.
- **Validate on read; fall back to the default when the shape is wrong** — outdated/corrupt data
  should degrade to defaults, never crash. A per-key validator predicate is the lightweight form of
  schema migration.
- Storage can also fail outright (full/denied) — reads and writes must be wrapped so the app shows/uses
  a default rather than throwing (the hook already try/catches; keep it).

## Definition of done

`usePersistentState` accepts an optional validator; a parsed value that fails it is discarded for the
default (no crash). The critical persisted keys (dishes, candidates, meals, notes, pace, pantry,
events, servingsFactor, screen) carry lightweight validators so malformed/legacy data self-heals.
Injecting garbage into any of those keys still loads the app cleanly. Pure validators are unit-tested;
gate green.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Validator hook (web).** Extend `usePersistentState<T>(key, initial, validate?: (v: unknown) => v is T
   | boolean)`: in the lazy initializer, after `JSON.parse`, if `validate` is provided and returns
   false, return `initial` (and optionally clear/overwrite the bad key). Keep it backward compatible
   (validate optional). Unit-test the hook indirectly via a tiny pure helper `readPersisted(raw,
   initial, validate)` extracted from it (so it's testable without React): bad JSON → default; valid
   JSON failing validate → default; passing → parsed.
2. **Lightweight validators (web).** `apps/web/src/validators.ts`: pure guards — `isStringArray`,
   `isPlainObject`, `isMealArray` (array whose items have `id`+`dishIds: string[]`), `isScreen`
   (one of the known Screen values), `isClock` (HH:MM:SS-ish). Unit-test each (accept good, reject
   wrong-shaped/legacy).
3. **Apply to App's persisted state.** Pass the matching validator to each critical
   `usePersistentState` call (dishes/candidates→arrays, meals→isMealArray, notes/pace/servingsFactor→
   isPlainObject, pantry→isStringArray, screen→isScreen, target→isClock). Don't over-validate (engine
   types stay the source of truth); just prevent crashes.
4. **Honest self-heal.** When a value is rejected, the user silently gets the sane default for that
   slice (their other data is untouched, since each key is independent). No error theater.
5. **Tests.** validators + `readPersisted` unit tests; an App-level test that seeding a malformed
   `tutti.meals` (e.g. `[{"id":"x"}]`) and a bogus `tutti.screen` still renders the app (no throw),
   falling back to Home + an empty meals list.

## Enforce-what-you-build
- `readPersisted` + validators are pure and unit-tested (the crash class is covered).
- an App render test proves malformed persisted data no longer breaks the app.

## When substantially done
Run a web-research pass on the next gap (substitutions, photos, units toggle, onboarding, or another
competitor feature) and **author `docs/Research-Brief-v24-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://github.com/CatChen/versioned-storage
- https://www.uxpin.com/studio/blog/how-to-use-react-for-state-persistence/
- https://www.meticulous.ai/blog/localstorage-complete-guide
