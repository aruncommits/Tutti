# Research Brief v17 — Recipe Notes, Ratings & Cook Count

*Status: active · continuous-enhancement · competitor parity (Doc 9, recipe-keeper feature set) · authored by the loop*

## Rationale — why this, now

Cooking is iterative: "more tamarind next time," "kids loved it," "20 min was too long." Every
serious recipe-keeper (Paprika, CookBook, AnyList) lets you attach a **rating + a personal note** and
tracks **how often / when you last cooked** something — that's how a recipe collection becomes
*yours*. Tutti already remembers meals (v12) and even learns your pace (v6), but it throws away the
single most useful human signal: what you thought of a dish and what you'd change. Capturing a quick
rating + note at the natural moment ("Dinner is served") and surfacing it when you next browse turns
Tutti into a cookbook that improves with you. It's local-first (no accounts), bounded, and reuses the
finish-of-cook hook already added for recents.

### Research findings folded in (web pass, June 2026)

- The **Notes section is where personalization lives** — substitutions, spice tweaks, family
  feedback, "remember next time." Keep it a free-text note plus a simple **star rating**.
- Modern keepers track **"Last Cooked" + "Cook Count"** (auto-incremented when you cook it) — a
  lightweight history that helps surface favorites. We already record a "recent" on finish; extend
  that to bump per-recipe counts.
- Task-based UX: capture at the right moment (the finale), keep it one-tap-skippable, and show the
  rating/notes where the user decides what to cook (Browse/Pick).

## Definition of done

After a cook, the user can rate each just-cooked dish (1–5) and add a note in one place; per-recipe
rating, note, cook-count and last-cooked persist locally; Browse shows the rating + "cooked N×" so
favorites surface; everything is skippable and removable; gate green (incl. perf/pwa/a11y).

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Model + pure helpers (web).** `apps/web/src/recipeNotes.ts`: `interface RecipeNote { rating?: number;
   note?: string; cookCount: number; lastCookedAt?: number }`; `type NotesMap = Record<string, RecipeNote>`.
   Pure immutable helpers: `setRating(map, id, rating)`, `setNote(map, id, note)`, `recordCook(map, id, at)`
   (increments cookCount, sets lastCookedAt), `clearNote(map, id)`. Unit-test increments/sets/clears.
2. **Persist + record on finish (App).** `usePersistentState<NotesMap>("tutti.recipeNotes", {})`; in the
   cook-finish hook (where recents are recorded), `recordCook` each cooked dishId (timestamp via Date.now).
3. **Capture at the finale (Cook Mode).** On the "Dinner is served" finale, list the dishes just
   cooked with a 1–5 star control + an optional note field per dish, wired to setRating/setNote.
   One-tap skippable (the "Cook it again" button stays). Pass notes + setters into CookScreen.
4. **Surface in Browse.** In `BrowseScreen` rows (and/or Pick), show the saved rating (★ count) and
   "cooked N×" when present, reading from the notes map (pass it in). Subtle; absent when no data.
5. **Tests.** recipeNotes unit tests (recordCook increments + stamps; setRating/setNote/clear); a web
   test that the finale renders a star control and clicking a star calls setRating; a Browse test that
   a rated recipe shows its stars. Keep the cook gate green.

## Enforce-what-you-build
- recipeNotes helpers are pure + unit-tested (cookCount math, immutability).
- a web test that rating at the finale persists/propagates (setter called) and Browse renders it.

## When substantially done
Run a web-research pass on the next gap (nutrition/cost estimation, richer equipment modelling,
photos, or another competitor feature) and **author `docs/Research-Brief-v18-*.md`** inline. The loop
never ends.

## Sources (research pass)
- https://blog.tubikstudio.com/case-study-recipes-app-ux-design/
- https://www.sidechef.com/business/recipe-platform/ux-best-practices-for-recipe-sites
- https://apps.apple.com/us/app/cookbook-the-recipe-manager/id1073341917
