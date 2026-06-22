# 00 — Master V2 Brief

## Overview

Tutti is an offline-first progressive web app that solves a specific, hard problem: coordinating multiple dishes so they all finish at the same time. The user picks recipes, sets a serve time, and the engine computes a parallel execution plan — a Gantt-style schedule that tells you exactly when to start each task across all dishes. The React 18 + Vite + TypeScript PWA is structured as a monorepo (@tutti/engine, @tutti/web). The engine runs entirely in the browser with zero network dependency; the server exists only to serve the recipe catalog (Supabase-backed read API) and to proxy AI calls for menu import. V2 does not change what Tutti does — it changes how quickly and confidently a new user reaches the moment where the app is visibly useful.

---

## Current State

### Codebase snapshot (June 2026)

- **Monorepo:** `packages/engine/` (core computation), `packages/web/` (React PWA)
- **Engine:** `compile(recipes, kitchen, serveTime) → MasterExecutionPlan` with `schedule[]` and `projectedServeTime`
- **Screen state machine:** `packages/web/src/state.ts` (Screen union type), `packages/web/src/validators.ts` (SCREENS set), `packages/web/src/App.tsx` (branch rendering)
- **Screens (18 total):** onboarding · kitchen · home · calendar · addRecipe · studio · browse · recipe · editRecipe · menuImport · shopping · pantry · stats · meals · settings · preview · ready · cook
- **Navigation:** 5 bottom tabs — Home, Browse, Studio, Calendar, Settings
- **Personal library:** `localStorage` key `tutti.candidates` (unverified drafts) + IndexedDB `recipeStore` (verified recipes)
- **Server catalog:** 600 recipes (200 dishes × 3 tiers: simple/moderate/complex). Browser calls `/api/library/*`; no direct browser→Supabase connection
- **Onboarding:** 3 slides explaining features abstractly; CTA "Get started"
- **Kitchen setup:** required during onboarding; no skip path
- **Back navigation:** `prevScreen` tracking added to `App.tsx` — fixed for recipe screen
- **Cook screen:** NOW/NEXT/PASSIVE panels, multi-timers, read-aloud TTS, screen-wake lock
- **Preview screen:** Gantt timeline + step reorder via ↑/↓ buttons ("Your order" section)
- **Browse screen:** server catalog with category chips, search, preview modal (not full-screen)
- **Studio screen:** personal recipes, menu import, collections, new recipe
- **Home screen:** dish picker, serve-time selector, Build Plan → Preview → Cook
- **Menu import (Phase 1 shipped):** text menu → `parseMenu()` → match library → AI-generate misses → save to personal library
- **Ingredient color coding:** `ingredientColor.tsx`, `kindColorOf(name)` → hex, `KIND_LABEL` legend
- **Theme:** `data-theme` attribute on `<html>` ("light"/"dark"), set by `App.tsx` `useEffect` + no-flash inline script in `index.html`
- **Test suite:** 505 tests green (engine 150, ingest 41+4, web 296, curation 14)
- **Shipped phases:** Cook-mode depth (P1), weekly meal-planning calendar (P2), grocery-by-aisle + pantry (P3), nutrition + dietary filters + collections (P4), library expansion to 600 recipes + `isPlan` validator (P5)

---

## Problem

### Why V2 is needed

The engine is sound. The problem is that a new user cannot feel it working within a reasonable time window. Specific friction points, in order of severity:

1. **No path from "I want to cook dinner" to "I am cooking"** — The home screen requires the user to understand dishes, tiers, and serve time before anything useful happens. There is no sample plan, no shortcut, no obvious first action for a new user.

2. **Onboarding explains, does not demonstrate** — Three slides describe features in abstract terms. No user sees the cook screen — the product's core value — before they are asked to set up their kitchen.

3. **Kitchen setup is a gate, not a guide** — Kitchen setup is mandatory during onboarding. A user who just wants to try the app is blocked by a configuration step they do not yet understand the purpose of.

4. **5 tabs, unclear ownership** — Calendar lives next to Settings but has nothing to do with Settings. Browse and Studio are visually identical in the tab bar, with no label that tells a new user which one they want. The mental model of "where do I go to do X" is not established by the tab structure.

5. **Back navigation was broken** — The recipe detail screen did not return to the screen that opened it (Browse vs. Studio vs. search result). This is now fixed via `prevScreen` tracking in `App.tsx`, but the broader principle — every screen transition must have a logical return destination — is not consistently enforced across all flows.

6. **The circle does not close** — Several flows have no explicit end state. After saving a recipe from menu import, where do you go? After finishing cook mode, what happens? After editing a recipe, what do you return to? These missing final steps create dead-ends that break user confidence.

---

## V2 Design Principles

These five principles govern every V2 decision. Any proposed change that violates one of these must be explicitly justified.

**1. Time to value < 2 minutes for a new user.**
From cold app open to seeing a live cook timeline must take under two minutes. This sets constraints on onboarding length, kitchen setup friction, and the number of steps between Home and Cook.

**2. Every screen has one clear primary action.**
Each screen renders one visually dominant CTA. Secondary actions exist but do not compete. If a screen cannot be described as "the screen where you do X," its scope is wrong.

**3. The circle closes — every flow has an explicit end and returns somewhere logical.**
No screen is a dead-end. Every flow terminates at a screen that makes sense as the next starting point. Cook mode ends at a summary. Menu import ends at Studio with the new recipes highlighted. Recipe edit ends at the recipe detail.

**4. Offline first — no feature degrades without network except AI.**
The engine, personal library, pantry, shopping list, calendar, and cook mode all work with zero network. Browse degrades gracefully (shows cached results). Only AI-powered menu import requires connectivity, and it says so clearly.

**5. Cook mode is the product. Everything else serves getting to cook.**
Browse exists to find recipes to cook. Studio exists to manage recipes you will cook. The Me tab exists to review what you cooked and prepare for what you will cook next. Every design decision is evaluated against whether it shortens or lengthens the path to an active cook session.

---

## V2 Navigation: 4-Tab Structure

The 5-tab structure (Home · Browse · Studio · Calendar · Settings) is replaced with 4 tabs. The consolidation is not cosmetic — it reflects the actual job each area does.

### Tab 1 — Cook (icon: flame or chef's hat)
**Contains:** Home planner · Preview (Gantt + reorder) · Cook mode (NOW/NEXT/PASSIVE)
**Job:** The primary loop. Pick dishes → set serve time → build plan → cook.
**Why unified:** Home, Preview, and Cook are sequential states of the same session. Splitting them across navigation breaks the sense of a continuous flow. The Cook tab is always the active tab during a live session.
**Entry point:** Home planner (dish picker + serve time). If a session is in progress, Cook tab opens directly to the active step (Preview or Cook).

### Tab 2 — Browse (icon: compass or grid)
**Contains:** Server catalog · category chips · search · recipe preview modal · "Add to plan" button on each recipe
**Job:** Discover new recipes from the 600-recipe catalog and add them to the current plan.
**Why separate from Studio:** The catalog is read-only and server-backed. Studio is personal and local. These are different trust domains and different user intentions.

### Tab 3 — Studio (icon: pencil or folder)
**Contains:** Personal recipe list · menu import · collections · new recipe / edit recipe flows
**Job:** Manage your personal recipe library — create, import, organize, and edit.
**Why separate from Browse:** Studio items are user-owned and editable. Browse items are catalog entries. Conflating them confuses ownership.

### Tab 4 — Me (icon: person)
**Contains:** Calendar (meal history + upcoming plans) · Meals history · Settings · Pantry · Shopping list
**Job:** Everything about the user's context and history that is not an active cook session.
**Why consolidated:** Calendar, Meals, Pantry, and Settings are all low-frequency, context-setting screens. A dedicated tab per low-frequency screen wastes tab bar real estate. Under "Me," the entry point is a dashboard-style menu, not a single screen.

---

## Phased Build Plan

Each phase is independently shippable and leaves the app in a better state than it found it.

### Phase 1 — Navigation shell + back-context
**Scope:** Restructure bottom tabs from 5 to 4. Wire Cook/Browse/Studio/Me. Audit every screen transition and ensure `prevScreen` is set correctly. Implement a `useBackNav(destination)` hook used by every screen that has a back button.
**Deliverable:** App navigates correctly. No dead-end screens. Back always returns to the right place.
**Docs:** 01 (navigation), 02 (back-context hook)

### Phase 2 — Onboarding redesign + kitchen skip
**Scope:** Replace abstract 3-slide onboarding with a show-don't-tell flow. Slide 3 shows the cook screen with a real (hardcoded) example plan running. CTA = "Start cooking." Kitchen setup gets a "Skip for now" button. Home screen shows a nudge ("Add your kitchen equipment for better time estimates") when kitchen is unconfigured.
**Deliverable:** New user reaches Home in under 30 seconds. Kitchen config is optional.
**Docs:** 03 (onboarding), 04 (kitchen setup + skip), 05 (Home nudge)

### Phase 3 — Home CTA elevation
**Scope:** Home screen redesign. The primary action — picking dishes and setting serve time — must be immediately obvious. Simplify the dish picker UI. Make "Build Plan" the only visually dominant button. Remove clutter from the first-render state.
**Deliverable:** A new user with no prior context can build and start a plan within 90 seconds of reaching Home.
**Docs:** 06 (Home screen), 07 (dish picker component), 08 (serve time selector)

### Phase 4 — Browse card + add-to-plan button
**Scope:** Every recipe card in Browse shows an "Add to plan" button. Tapping it adds the recipe to the current Home plan and flashes a confirmation. If no plan exists, it starts one. Category chip filtering and search results both support add-to-plan inline.
**Deliverable:** Browse becomes a genuine feeder for Cook, not just a catalog viewer.
**Docs:** 09 (Browse screen), 10 (recipe card component), 11 (add-to-plan interaction)

### Phase 5 — Cook tab unified flow
**Scope:** Home → Preview → Cook are now sub-states of the Cook tab. Tab does not change during the flow. The Preview Gantt and the Cook NOW/NEXT/PASSIVE view share a session context object. Cook completion shows a summary screen (time taken, dishes cooked, option to save to Meals history) then returns to Home.
**Deliverable:** The core loop is a single continuous experience with no tab switches.
**Docs:** 12 (Cook tab shell), 13 (session context), 14 (Preview screen), 15 (Cook screen), 16 (Cook completion)

### Phase 6 — Me tab consolidation
**Scope:** Merge Calendar, Meals, Settings, Pantry, and Shopping into the Me tab. Me entry is a simple dashboard with named sections. Settings moves to a sub-page. Pantry and Shopping move to sub-pages accessible from Me. Calendar shows a monthly grid with cook sessions marked.
**Deliverable:** 5-tab nav fully replaced. All orphaned screens have a clear home.
**Docs:** 17 (Me tab shell), 18 (calendar sub-page), 19 (meals history), 20 (settings sub-page), 21 (pantry sub-page), 22 (shopping sub-page)

---

## Security Constraints

These are non-negotiable and must be enforced in every screen that touches external data.

- **Supabase credentials never reach the browser.** All catalog reads go through `/api/library/*` server routes. No `SUPABASE_URL` or `SUPABASE_ANON_KEY` in any client bundle.
- **AI keys are server-side only.** Menu import AI calls go through `/api/ai/*`. The browser sends text; the server calls the AI provider and returns structured results.
- **Browser calls `/api/*` only.** No direct third-party API calls from client code.
- **Personal data stays local.** `localStorage` (candidates) and IndexedDB (recipeStore) are never synced to any server in V2. Cloud sync is a post-V2 gate.
- **No auth in V2.** The Me tab is a local-only profile. No login, no account creation, no server-side user data.

---

## Document Index

Every document follows this mandatory format: Overview · Current State · Problem · V2 Design · Spec · Data & Dependencies.

### Navigation & Shell
| # | Title | Description |
|---|-------|-------------|
| 00 | Master V2 Brief | This document. Entry point for any AI working on V2. |
| 01 | Navigation Shell | 4-tab bottom bar: component, active-tab state, tab definitions, icon specs |
| 02 | Back-Context Hook | `useBackNav` hook — `prevScreen` tracking, back button wiring across all screens |

### Onboarding & First-Run
| # | Title | Description |
|---|-------|-------------|
| 03 | Onboarding Redesign | 3-slide show-don't-tell flow; slide 3 = live cook demo; CTA = "Start cooking" |
| 04 | Kitchen Setup | Equipment picker; "Skip for now" button; what skipping means for the engine |
| 05 | Home Nudge (Kitchen Missing) | Inline banner on Home when kitchen is unconfigured; dismiss + configure paths |

### Cook Tab (Core Loop)
| # | Title | Description |
|---|-------|-------------|
| 06 | Home Screen | Dish picker + serve time + Build Plan; first-render empty state; session resume |
| 07 | Dish Picker Component | Multi-select recipe cards, tier badges, search/filter inside picker |
| 08 | Serve Time Selector | Time-of-day picker; "ASAP" mode; how serve time feeds `compile()` |
| 09 | Build Plan Action | Validation before compile; loading state; error handling; transition to Preview |
| 10 | Preview Screen | Gantt timeline; step reorder (↑/↓); "Start cooking" CTA; back to Home |
| 11 | Gantt Component | Rendering `MasterExecutionPlan.schedule[]`; color coding by dish; time axis |
| 12 | Cook Tab Shell | Sub-state machine: planner → preview → cooking → complete; session context object |
| 13 | Session Context | Shape of active session; persistence across tab switches; resume on reload |
| 14 | Cook Screen | NOW/NEXT/PASSIVE panels; timer components; read-aloud; wake lock; step advance |
| 15 | Timer Component | Per-step countdown; pause/resume; audio alert; visual state (idle/running/done) |
| 16 | Cook Completion | Summary (elapsed time, dishes, steps); save to Meals history; return to Home |

### Browse Tab
| # | Title | Description |
|---|-------|-------------|
| 17 | Browse Screen | Catalog grid; category chips; search bar; scroll state preservation |
| 18 | Recipe Card Component | Tile layout; tier badge; dietary icons; "Add to plan" button; tap → preview modal |
| 19 | Recipe Preview Modal | Quick-view overlay: photo, summary, ingredients, tier, nutrition; "Add to plan" |
| 20 | Add-to-Plan Interaction | Toast confirmation; plan creation if none exists; count badge on Cook tab |
| 21 | Category Chips | Chip list from catalog metadata; active filter state; chip + search combined |
| 22 | Search (Browse) | Debounced query → `/api/library/search`; empty state; no-results state |

### Studio Tab
| # | Title | Description |
|---|-------|-------------|
| 23 | Studio Screen | Entry dashboard: My Recipes · Collections · Import Menu · New Recipe |
| 24 | My Recipes List | Personal library from IndexedDB; sort/filter; edit/delete; empty state |
| 25 | Recipe Detail Screen | Full recipe view (ingredients, graph steps, nutrition); back to caller screen |
| 26 | New Recipe Flow | Form-based recipe creation → RecipeGraph; save to IndexedDB |
| 27 | Edit Recipe Flow | Load from IndexedDB → form → save; optimistic update; back to recipe detail |
| 28 | Collections | Named groups of personal recipes; create/rename/delete collection; add recipe to collection |
| 29 | Menu Import — Phase 1 | Text paste → `parseMenu()` → match + AI-generate → save; completion → Studio |
| 30 | Menu Import — Phase 2 | OCR image input (camera/upload) → same pipeline as Phase 1 |
| 31 | Menu Import — Phase 3 | OAuth restaurant partner feed → auto-import on schedule |

### Me Tab
| # | Title | Description |
|---|-------|-------------|
| 32 | Me Tab Shell | Dashboard layout: sections for Calendar, Meals, Pantry, Shopping, Settings |
| 33 | Calendar Sub-Page | Monthly grid; cook session markers; tap day → session detail |
| 34 | Meals History | Chronological list of completed cook sessions; dish list + elapsed time per session |
| 35 | Settings Sub-Page | Theme toggle; kitchen equipment; dietary preferences; app info |
| 36 | Pantry Sub-Page | Ingredient inventory; add/remove; expiry tracking; low-stock nudges |
| 37 | Shopping Sub-Page | Generated from plan; grouped by aisle; check-off items; clear completed |

### Engine & Data
| # | Title | Description |
|---|-------|-------------|
| 38 | Engine API | `compile()` signature; `MasterExecutionPlan` shape; `RecipeGraph` type; error codes |
| 39 | Recipe Data Model | `RecipeGraph` fields; `nodes[]`; `edges[]`; `verified` flag; `servings` scaling |
| 40 | Kitchen Model | Equipment list shape; how kitchen constraints affect `compile()` output |
| 41 | Personal Library | `localStorage` candidates schema; IndexedDB `recipeStore` schema; sync between them |
| 42 | Server Catalog API | `/api/library/*` endpoints; request/response shapes; caching strategy |
| 43 | Session Persistence | How active cook session survives tab switch, reload, and app backgrounding |
| 44 | Ingredient Color System | `kindColorOf(name)`; `KIND_LABEL` map; color legend component |
| 45 | Nutrition Data | Per-ingredient nutrition; per-recipe totals; dietary flag derivation |
| 46 | `isPlan` Validator | What it validates; error codes; when it runs; how it gates Build Plan |

### Patterns & Components
| # | Title | Description |
|---|-------|-------------|
| 47 | Screen Transition Pattern | How `screen` state changes; animation direction conventions; scroll reset |
| 48 | Empty State Pattern | Consistent empty-state component: icon + headline + CTA; used by all list screens |
| 49 | Toast / Confirmation Pattern | Transient feedback for add-to-plan, save, delete; duration; stacking rules |
| 50 | Loading State Pattern | Skeleton screens vs. spinners; when each is appropriate; timeout handling |
| 51 | Error State Pattern | Network error; engine error; validation error; consistent display + recovery CTA |
| 52 | Modal Pattern | Overlay anatomy; focus trap; close on backdrop; close on Escape; scroll lock |
| 53 | Dietary Badge Component | Icon set for dietary flags (vegan, gluten-free, etc.); badge placement rules |
| 54 | Tier Badge Component | Simple/Moderate/Complex badge; color tokens; size variants |
| 55 | Read-Aloud (TTS) Component | Web Speech API wrapper; utterance queue; pause/resume; voice selection |
| 56 | Wake Lock Component | Screen-wake API; fallback behavior when denied; indicator in Cook UI |

### Quality & Operations
| # | Title | Description |
|---|-------|-------------|
| 57 | Test Strategy | Unit (engine) · component (web) · integration (flows); naming conventions; 505-green baseline |
| 58 | Theme System | CSS custom properties; `data-theme` attribute; no-flash script; token naming |
| 59 | Accessibility Baseline | ARIA roles for cook screen; keyboard nav; focus management after screen transitions |
| 60 | Security Model | Supabase server-only constraint; AI key proxy; local-only personal data; no V2 auth |

---

## How to Use This Document

**If you are implementing a specific screen or component,** find its document number in the index above and read that document first. Then read document 38 (Engine API) and 47 (Screen Transition Pattern) as baseline context.

**If you are implementing a new phase,** read the phase description above, then read all documents in that phase's number range before writing any code.

**If you encounter a design decision not covered by a specific document,** apply the five V2 Design Principles in order. Principle 5 (Cook mode is the product) resolves most conflicts.

**If you are modifying navigation,** any change to the 4-tab structure requires revisiting documents 01, 02, 12, and 47. The tab structure is load-bearing — it defines the mental model of the entire app.

**Immutable constraints (never override without explicit user confirmation):**
- Supabase URL never in browser bundle
- AI keys server-side only
- Personal library never synced to server in V2
- Test suite must stay green (505 baseline); new features add tests
