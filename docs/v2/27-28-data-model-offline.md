# 27 — Data Model

## Overview

Tutti persists data across five storage layers: in-memory engine types (pure TypeScript, no I/O), localStorage for fast-access mutable state, IndexedDB for structured personal recipe storage, a Supabase-backed server catalog accessed only through the app's own API routes, and the Vite PWA cache for offline resilience. Understanding the full shape of each structure — and which layer owns it — is prerequisite to any V2 feature work that touches persistence, sync, or offline behavior.

## Current State

Core types live in `packages/engine/src/types.ts`. Web-layer types (KitchenUi, SavedMeal, Collection, PantryItem, CalendarStore) are scattered across feature files under `packages/web/src/`. localStorage keys are informal strings (`tutti.candidates`, `tutti.kitchen`, etc.) with no central registry. IndexedDB is managed by a thin wrapper (`packages/web/src/db.ts` or similar). The Supabase schema is accessed only server-side via `/api/library/*` Next.js/Vite routes — no direct browser → Supabase calls exist.

## Problem

- No single source-of-truth document for all persistent shapes, making it easy to drift the localStorage schema without noticing.
- RecipeGraph and DishSummary are subtly different (DishSummary is a projection for browse/search, RecipeGraph is the full cook-time structure) but the distinction is not written down anywhere.
- IndexedDB and localStorage hold the same personal recipes in two places; it is undocumented which is canonical when they disagree.
- Calendar, SavedMeal, Pantry, and Collections types are defined locally in their feature files with no shared schema doc, leading to inconsistency across screens.

## V2 Design

V2 formalises all persistent types in a single canonical location (`packages/engine/src/types.ts` for engine types; `packages/web/src/schema.ts` for web-layer types). A central localStorage key registry (`STORAGE_KEYS` const) prevents typo-driven key drift. IndexedDB is declared the canonical personal recipe store; localStorage `tutti.candidates` becomes a write-through cache for fast startup reads, not the source of truth.

## Spec

### Engine Layer (packages/engine/src/types.ts)

**RecipeGraph**
```
recipeId:  string          // UUID, stable across edits
name:      string
servings:  number
verified:  boolean         // passes isPlan() validator gate
course:    'starter' | 'main' | 'side' | 'dessert' | 'drink' | null
nodes:     RecipeNode[]
edges:     RecipeEdge[]
```

**RecipeNode**
```
nodeId:      string        // UUID, unique within graph
recipeId:    string        // parent recipe (denormalised for engine lookup)
title:       string        // short step label ("Chop onions")
instruction: string        // full prose shown in Cook screen
phase:       'prep' | 'active' | 'passive'
attention:   'active' | 'passive'
duration:    { estMins: number }
```
- `phase` drives Gantt row colour.
- `attention` drives NOW/NEXT/PASSIVE panel assignment in the Cook screen.
- `passive` nodes (e.g. "Simmer for 20 min") require no chef presence; the engine schedules them to overlap with active work on other dishes.

**RecipeEdge**
```
from: string   // nodeId
to:   string   // nodeId — "to" cannot start until "from" completes
```
Edges form a DAG. The engine's `compile()` performs a topological sort per recipe before merging into the master timeline.

**MasterExecutionPlan**
```
startTime:          number                    // Unix ms
projectedServeTime: number                    // Unix ms
nodes:              RecipeNode[]              // flat union of all recipe nodes in cook order
schedule:           Record<nodeId, {
                      plannedStart: number,   // Unix ms offset from startTime
                      plannedEnd:   number
                    }>
```
Produced by `compile(recipes: RecipeGraph[], kitchen: KitchenUi, serveTime: number): MasterExecutionPlan`. Entirely pure — no I/O, no side effects. The Preview screen renders the schedule as a Gantt; the Cook screen drives a live clock against it.

### Web Layer (packages/web/src/schema.ts)

**DishSummary** — lightweight browse/search projection returned by `/api/library/search` and `/api/library/category/:id`
```
recipeId:   string
name:       string
category:   string          // e.g. "Indian", "Italian"
cuisine:    string
diets:      string[]        // e.g. ["vegan", "gluten-free"]
estMins:    number          // sum of all node durations
tier:       'simple' | 'moderate' | 'complex'
popularity: number          // server-side rank score; not present on personal recipes
```
DishSummary is never fed directly to `compile()`. Browse → Recipe → Home flow resolves the full RecipeGraph before planning.

**KitchenUi**
```
hobs:       number          // 0–6
oven:       boolean
equipment:  string[]        // e.g. ["wok", "blender", "instant-pot"]
allergens:  string[]        // e.g. ["nuts", "dairy"]
skipped?:   boolean         // true when user tapped "Skip for now" on onboarding
```
Storage key: `tutti.kitchen`. Read at app start; passed to every `compile()` call. When `skipped === true`, Home screen shows a soft nudge ("Tell us about your kitchen for a better plan").

**CalendarStore**
```
Record<isoDate, string[][][]>

// isoDate: "2026-06-19"
// outer array: meals in that day (breakfast, lunch, dinner, or ad-hoc)
// inner array: list of recipeIds in that meal
```
Storage key: `tutti.calendar`. Calendar screen writes to this; Home screen reads the day's planned meals as initial dish suggestions.

**SavedMeal**
```
id:        string           // UUID
recipeIds: string[]
cookedAt:  number           // Unix ms
ratings:   Record<recipeId, 1|2|3|4|5>
notes?:    Record<recipeId, string>
```
Storage key: `tutti.meals` (array of SavedMeal). Written by Cook screen on completion. Read by Meals history (Me tab) and the stats engine.

**PantryItem**
```
id:          string
name:        string
quantity:    number
unit:        string
addedAt:     number         // Unix ms
expiresAt?:  number         // Unix ms; drives expiry nudge
```
Storage key: `tutti.pantry` (array of PantryItem). Full field spec in doc 21.

**Collection**
```
id:       string
name:     string
recipeIds: string[]
```
Storage key: `tutti.collections` (array of Collection). Managed in Studio screen; displayed as filter chips on Browse.

### Personal Library — Dual-Layer Storage

| Layer | Key / Store | Role |
|---|---|---|
| localStorage | `tutti.candidates` | Fast read on cold start (sync) |
| IndexedDB | db `tutti`, store `recipes` | Canonical store; survives localStorage clear |

On write (save / edit / delete): write IndexedDB first, then update localStorage cache. On cold start: read localStorage for immediate render; reconcile with IndexedDB in a `useEffect` after mount. If localStorage is missing but IndexedDB has records, repopulate localStorage from IndexedDB silently. No merge logic is needed — IndexedDB is authoritative.

### Server Library — Supabase Schema (server-side only)

Table `recipes` columns relevant to the API surface:
```
recipe_id   uuid PK
name        text
category    text
cuisine     text
diets       text[]
est_mins    integer
tier        text CHECK (tier IN ('simple','moderate','complex'))
popularity  numeric
graph       jsonb    -- serialised RecipeGraph
verified    boolean
```
The browser never reads this table directly. `/api/library/*` routes query it, strip the `graph` column from list responses (returning DishSummary), and return the full graph only on `/api/library/recipe/:id`.

### localStorage Key Registry (STORAGE_KEYS constant)

```typescript
export const STORAGE_KEYS = {
  kitchen:     'tutti.kitchen',
  candidates:  'tutti.candidates',
  calendar:    'tutti.calendar',
  meals:       'tutti.meals',
  pantry:      'tutti.pantry',
  collections: 'tutti.collections',
  theme:       'tutti.theme',
  onboarded:   'tutti.onboarded',
} as const;
```

## Data & Dependencies

- `compile()` depends on RecipeGraph + KitchenUi. Neither changes during a cook session.
- Preview screen reads MasterExecutionPlan (in-memory, not persisted).
- Cook screen reads MasterExecutionPlan + writes SavedMeal on completion.
- Studio screen reads/writes personal library (both layers).
- Browse screen reads DishSummary[] from API; resolves RecipeGraph on demand.
- Calendar screen reads/writes CalendarStore.
- Me tab reads SavedMeal[], CalendarStore, KitchenUi (settings sub-screen).
- Pantry screen reads/writes PantryItem[].
- Shopping list (doc 20) derives its list from RecipeGraph.nodes ingredient data against PantryItem[].

---

# 28 — Offline Behavior

## Overview

Tutti's core cook-time experience — the thing that matters most when a user is standing at the stove — must work without any network connection. The engine is pure JS with no external calls; personal recipes live on-device; the Cook screen has no server dependencies. Offline support is therefore not a stretch goal but a correctness requirement. This document specifies what works offline, what does not, how the cache is structured, and how the UI communicates network state to the user.

## Current State

Vite PWA (`vite-plugin-pwa`) is configured and precaches the app shell and static assets. The service worker is registered in `packages/web/src/main.tsx` (or `vite.config.ts`). Runtime caching for `/api/library/*` exists in the Workbox config with a stale-while-revalidate strategy. An offline banner may exist but its implementation and trigger condition are not consistently applied across all screens.

## Problem

- No screen-by-screen declaration of offline capability, so developers don't know which features to protect and which to degrade gracefully.
- The Browse screen can fail silently when offline — it renders empty rather than explaining why.
- AI-dependent flows (Ask AI, Generate miss, menu import AI step) do not surface a clear "requires network" message; they fail with a generic error.
- The relationship between IndexedDB canonical store and localStorage cache is undocumented, so a cleared localStorage can appear to delete all personal recipes.
- There is no explicit reconciliation pass at startup to catch the localStorage-cleared / IndexedDB-intact case.

## V2 Design

V2 draws a hard line between offline-capable and network-required features, and surfaces that line clearly in the UI. The offline banner becomes a first-class component rendered above all screens (not per-screen). Network-required actions get a disabled state with a tooltip when offline, not a silent failure. IndexedDB is confirmed as the canonical personal recipe store; localStorage is explicitly a cache. The service worker runtime cache for `/api/library/*` is expanded to include category metadata so Browse can show cached results even if stale.

## Spec

### Offline-Capable Features (no network required)

| Feature | Data source | Notes |
|---|---|---|
| Browse personal library | IndexedDB / localStorage | Full RecipeDetail, edit, delete |
| View saved recipe detail | IndexedDB / localStorage | Read-only if RecipeGraph cached |
| Cook a saved meal | MasterExecutionPlan (in-memory from RecipeGraph) | All timers, read-aloud, screen-wake |
| Kitchen setup | localStorage `tutti.kitchen` | Full read/write |
| Calendar view | localStorage `tutti.calendar` | Full read/write |
| Meals history | localStorage `tutti.meals` | Full read/write |
| Pantry | localStorage `tutti.pantry` | Full read/write |
| Collections | localStorage `tutti.collections` | Full read/write |
| Settings / theme | localStorage `tutti.theme` | Full read/write |
| Stats / Me tab | Derived from SavedMeal[] | Pure computation |
| Previously cached server recipes | Workbox runtime cache | Stale reads OK; no new search |

### Network-Required Features (gracefully degraded when offline)

| Feature | Reason | V2 offline behavior |
|---|---|---|
| Server catalog Browse | `/api/library/*` API | Show cached results if available; show "Browsing saved recipes — connect for full catalog" banner in Browse header |
| Category/search Browse | Same API | Search box disabled with tooltip "Search requires a connection" |
| AI recipe generation (Generate miss) | External AI call | Button disabled + tooltip "Requires internet" |
| Ask AI (cook assist) | External AI call | Input disabled + tooltip |
| Menu import — AI generation step | External AI call | Step 3 blocked; user can still save matched recipes |
| URL recipe import | Fetch + parse external URL | Disabled with tooltip |
| Popularity ranking refresh | Supabase query | Use cached ranking; no stale indicator needed |

### Service Worker & Cache Strategy

**Precache (build time, via Workbox `generateSW` or `injectManifest`):**
- App shell: `index.html`, `manifest.webmanifest`
- All JS/CSS chunks from Vite build (content-hashed, so no stale risk)
- Static assets: icons, fonts, ingredient color data

**Runtime cache entries:**

| Route pattern | Strategy | Max age | Max entries |
|---|---|---|---|
| `/api/library/category/*` | StaleWhileRevalidate | 7 days | 20 |
| `/api/library/recipe/:id` | StaleWhileRevalidate | 30 days | 300 |
| `/api/library/search?*` | NetworkFirst, fallback to cache | 1 hour | 50 |
| `/api/library/popular` | StaleWhileRevalidate | 24 hours | 1 |

StaleWhileRevalidate means the app renders cached data immediately and updates in the background — no loading spinner on repeat Browse visits. NetworkFirst for search means fresh results when online, cached results (last query for that exact string) when offline.

### Offline Banner Component

Component: `OfflineBanner` (`packages/web/src/components/OfflineBanner.tsx`)

```
trigger:  navigator.onLine === false
          OR 'offline' event on window
dismiss:  'online' event on window (auto-dismisses)
position: fixed top-0, full width, z-index above all screens
          slides down 40px; pushes content down via CSS var --offline-banner-height
text:     "You're offline — showing saved recipes only"
colour:   --color-warning-bg / --color-warning-text (theme-aware)
```

The banner must not block the Cook screen's NOW panel. The `--offline-banner-height` CSS variable is set to `40px` when the banner is visible and `0px` when not; all screen containers use `padding-top: var(--offline-banner-height)` so content shifts cleanly without layout recalculation.

Event listener registration lives in a `useOnlineStatus()` hook (`packages/web/src/hooks/useOnlineStatus.ts`) that returns `{ isOnline: boolean }`. This hook is called once in `App.tsx` and the result passed to `OfflineBanner` and to any component that needs to disable network-dependent actions.

### IndexedDB Startup Reconciliation

On app mount (`App.tsx` `useEffect`, runs after first render):

```
1. Read tutti.candidates from localStorage → fast initial render
2. Open IndexedDB tutti / store recipes
3. Load all records from IndexedDB
4. If IndexedDB.count > localStorage.count OR localStorage is empty:
     overwrite localStorage tutti.candidates with IndexedDB data
5. If IndexedDB is empty AND localStorage has records:
     write localStorage records into IndexedDB (migration / recovery path)
6. Emit 'personal-library-ready' custom event so Studio screen re-renders if mounted
```

This reconciliation is idempotent and silent — no loading state shown to the user. It completes within one render cycle on typical device storage.

### Cook Screen Offline Guarantee

The Cook screen depends only on:
- `MasterExecutionPlan` (in-memory, already compiled before entering cook)
- `RecipeGraph[]` (passed as props / context, already loaded)
- Web Speech API for read-aloud (available offline in all modern browsers)
- Screen Wake Lock API (device-level, no network)
- `Date.now()` for timer ticks

There are zero network calls inside the Cook screen. If the device goes offline mid-cook, nothing changes for the user.

### PWA Install Prompt

When the app is not installed as a PWA and the device goes offline, a persistent nudge appears below the offline banner:

```
"Install Tutti for full offline access" [Install] [Not now]
```

This uses the `beforeinstallprompt` event stored in a ref by `usePwaInstall()` hook. The nudge is suppressed after install or if the user taps "Not now" (stored in `tutti.pwaPromptDismissed` localStorage key).

## Data & Dependencies

- `useOnlineStatus()` hook consumed by: `App.tsx` (banner), `BrowseScreen`, `StudioScreen` (AI buttons), `MenuImportScreen`, `RecipeImportScreen`.
- Workbox config lives in `vite.config.ts` (or a sibling `workbox-config.js`); must be updated whenever a new `/api/*` route is added.
- IndexedDB reconciliation runs in `App.tsx` after mount; `StudioScreen` must listen for `'personal-library-ready'` or read from the hook/context that App populates after reconciliation.
- Offline banner's `--offline-banner-height` CSS variable must be applied at the `:root` level in `index.css` so all screens inherit it without prop threading.
- Cook screen has no dependency on this document's network logic; it is listed here only to confirm its independence.
