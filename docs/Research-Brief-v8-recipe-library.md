# Research Brief v8 — Seeded Recipe Library + Search/Filter

*Status: active · continuous-enhancement · realizes Doc 3 Track C3 + Doc 8/9 (owned library) + Doc 7 §4 · authored by the loop*

## Rationale — why this, now

Tutti can ingest *any* recipe (paste/URL/AI) and cook arbitrary multi-dish meals — but out of the
box it ships only the **three thali recipes** as built-ins. Every competitor (Mealime, Paprika,
Time To Plate, NYT Cooking) opens to a **browsable, searchable library**; without one, a new user
has nothing to cook until they paste something. Doc 3's Track C3 and Doc 8/9 call for **seeding one
coherent cuisine vertical** (vegetarian South Indian) so the app is valuable at first launch and
multi-dish is compelling immediately. This brief builds that: a small **Golden Library** of
hand-authored, verified `RecipeGraph`s plus a **Browse/Search screen with stackable filters** — the
single biggest product-value gap now that the engine, ingestion, and offline shell are all done.

This stays inside the boundary: library content is **frozen, verified data** (Doc 1 §4), no LLM; the
browse/filter logic is pure. It also feeds the existing flow — picked library recipes go straight
into `compile()` like any dish.

### Research findings folded in (web pass, June 2026)

- **Filters must be visible, stackable, and mobile-first.** The #1 complaint is *can't combine
  filters*; support cuisine + max-time + dietary/allergen + (optional) difficulty **together**.
  ≥40px targets, spaced to avoid mis-taps, **show active filters** on the results, and let search go
  by **name and ingredient**.
- **Personalization hook:** the user's existing **allergen avoid-set** (Brief v4) should filter the
  library automatically (hide/flag dishes that hit an avoided allergen) — reuse `allergensOf`.

## Definition of done

A "Browse" / library screen lists ~8–10 seeded verified veg South Indian dishes; the user can search
by name/ingredient and stack filters (max time, veg-only is default, "hide my allergens"); tapping a
dish adds it to the meal (Pick) and it cooks via the existing pipeline. All data is frozen + verified;
pure browse logic, tested; gate green and offline (library is bundled).

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Seed the Golden Library (engine data).** Hand-author ~6–8 additional verified veg South Indian
   `RecipeGraph`s as fixtures (e.g. Coconut Chutney, Tomato Rasam, Sambar, Curd Rice, Lemon Rice,
   Beetroot Poriyal, Medu Vada-free simple Upma) in the existing TaskNode schema (valid: acyclic,
   resources, active/passive, durations, ingredients). Add `packages/engine/fixtures/library.json`
   + a typed loader `goldenLibrary: RecipeGraph[]` exported from the engine; **validate every entry
   in a test** (reuse `validate()` — each must be ok, verified:true).
2. **Library metadata + browse helpers (pure).** A `LibraryEntry` view-model = recipe + derived
   `{ totalMins, allergens, veg }` (veg = no meat/fish/egg/crustacean/mollusc keywords) and a pure
   `filterLibrary(entries, { query, maxMins, avoidAllergens, vegOnly })` returning matches (search
   name + ingredient names; stackable). Unit-test the filter (stacking, ingredient search, allergen
   exclusion).
3. **Browse screen (web).** Add "browse" to the Screen union; a `BrowseScreen` (search box +
   filter chips: max-time presets, veg-only default on, "hide my allergens" using the avoid-set) over
   `goldenLibrary`; each row shows name, total time, veg/allergen badges; tap → add to candidates/
   dishes and route to Pick. ≥40px targets, show active filters. Reachable from Home ("Browse
   recipes") and the existing library search hint in Home (Doc 7 §4).
4. **Wire into the meal.** Selecting a library dish adds it to the picked set (it's already a valid
   RecipeGraph → `compile()`), so library + pasted + thali all coexist in Pick/shopping/cook.
5. **Tests + a11y.** filterLibrary unit tests; a web test that BrowseScreen renders seeded dishes and
   that a search term narrows them; library-validity test from item 1. Keep the a11y gate green.

## Enforce-what-you-build
- every library entry passes engine `validate()` (a permanent gate test).
- filterLibrary stacking + ingredient-search covered by unit tests.

## When substantially done
Run a web-research pass on the next gap (Lighthouse perf budget, deeper keyboard/SR a11y, or motion
polish for Queue→NOW promotion) and **author `docs/Research-Brief-v9-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://www.eatfresh.tech/blog/10-ux-best-practices-for-meal-prep-app-filters/
- https://www.sidechef.com/business/recipe-platform/ux-best-practices-for-recipe-sites
- https://blog.tubikstudio.com/case-study-recipes-app-ux-design/
