# Research Brief v12 — Saved Meals & Recent History

*Status: active · continuous-enhancement · competitor parity (Doc 9) + Doc 7 flow · authored by the loop*

## Rationale — why this, now

People cook the *same meals* repeatedly — a weeknight thali, a Sunday spread. Today Tutti makes you
re-pick every dish from scratch each time, even though it already knows the dishes, scaling, and
serve time you used. Every serious meal-planning app (Paprika, Samsung Food, Ollie, Plan to Eat)
lets you **save a meal/plan and reapply it**, and surfaces **recently cooked** meals for one-tap
reuse. This is the highest-value *functional* gap left after the engine, library, offline, a11y, and
performance work — it turns Tutti from a one-shot planner into something you return to. It's fully
local (no LLM, no network — fits the boundary) and reuses everything already built: a saved meal is
just a set of dish ids + servings + target fed back into `compile()`.

### Research findings folded in (web pass, June 2026)

- **"Favorites" is the expected term** for saved items; keep it plain. Support **save current meal**
  (name it) and **recently cooked** (auto-recorded) — both let the user **reapply** a meal in one
  tap.
- **Reapply = restore state**, not a new concept: set `dishes` (+ servings + target) from the saved
  meal and drop the user into Pick/Preview so they can tweak before cooking.
- Keep it local-first (like the pace/events data, Doc 10 §8): everything in `localStorage`, with a
  delete/remove affordance. No accounts.

## Definition of done

The user can save the current meal with a name, see saved meals + recently-cooked on Home (or a
"Your meals" view), and tap one to restore its dishes/servings/serve-time and cook it again;
finishing a cook auto-adds it to recent; all local, removable; gate green (incl. perf/pwa).

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Model + pure helpers (web).** `apps/web/src/meals.ts`: `interface SavedMeal { id: string; name: string;
   dishIds: string[]; servings: Record<string,number>; target: string; savedAt: number; kind: "saved" | "recent" }`.
   Pure helpers: `addSaved(list, meal)` (dedupe by id, cap), `addRecent(list, meal)` (prepend, dedupe
   by same dishIds-set, cap ~10), `removeMeal(list, id)`. Unit-test dedupe/cap/order. No id
   generation in the pure layer beyond a passed-in id/timestamp (keep deterministic + testable —
   App supplies Date.now()/a derived id).
2. **Persist + wire save (App).** `usePersistentState<SavedMeal[]>("tutti.meals", [])`. A "Save this
   meal" action on the Pick or Preview screen captures current `dishes` + `servingsFactor` + `target`
   into a SavedMeal (kind "saved"); name via a small inline prompt/default ("Meal of <date>" — but
   date via Date.now in App, not engine).
3. **Auto-record recent on finishing.** When a cook completes (the finale / reset from the done
   state), append a `kind:"recent"` SavedMeal of what was just cooked (guard against empties/dupes).
4. **"Your meals" UI.** A screen (and/or Home section) listing saved + recent with dish-color dots
   and dish count; tap → restore `dishes`/`servingsFactor`/`target` and route to Pick (so they can
   adjust) ; each row has a remove (×). Reachable from Home ("Your meals"). Empty state when none.
5. **Tests + verify.** meals.ts unit tests (addRecent dedupe by dish-set, cap, removeMeal); a web
   test that the meals screen renders saved entries and tapping restores selection; in-browser verify
   save → appears → reapply lands in Pick with the right dishes.

## Enforce-what-you-build
- meals.ts dedupe/cap/order covered by unit tests.
- a web test that restoring a saved meal sets the dish selection.

## When substantially done
Run a web-research pass on the next gap (e.g. richer Kitchen Profile / equipment-aware scheduling,
nutrition or cost rollups, or a deeper competitor feature) and **author `docs/Research-Brief-v13-*.md`**
inline. The loop never ends.

## Sources (research pass)
- https://blog.eatthismuch.com/best-meal-planning-apps/
- https://ollie.ai/2025/10/21/best-meal-planning-apps-in-2025/
- https://play.google.com/store/apps/details?id=com.foodient.whisk
