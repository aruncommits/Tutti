# Research Brief v4 — Multi-Dish Polish, Scaling, Shopping List & Allergens

*Status: active · Doc 3 Phase 3 (multi-dish) finish + Doc 6 Extended Domain · authored by the loop after Phase 3*

## Rationale — why this, now

Tutti can now ingest arbitrary recipes (paste / URL / AI) and the engine already merges and
interleaves N dishes (Phase 1 proved it; the Add-dish flow feeds `compile()` directly). What's
thin is the **multi-dish experience and the household realities around it**: when two dishes are
active at once the cook must instantly know *which pot*; a recipe written for 4 needs to scale to
2 or 8 without ruining the seasoning; a multi-dish meal needs **one shopping list**, not three; and
anyone cooking for guests needs to know **what's in it** (allergens). These are Doc 6's "Extended
Domain Model" made real, and they're what turns Tutti from a clever scheduler into something a
real household uses for a special occasion (the user's stated use case: "sometimes more than 5
dishes, special occasions").

### Research findings folded in (web pass, June 2026)

- **Scaling is mostly linear, but seasoning/leavening are not.** Factor = target ÷ original
  servings; multiply each amount. But salt, spice, and acid should scale to ~**75%** of linear (taste
  and adjust), and leavening (baking powder/soda ~80–90%, yeast ~75%) is non-linear chemistry.
  **Flag** these ingredients rather than silently mis-scaling. Offer quick factors (½, 1.5×, 2×, 3×).
- **14 major allergens (EU 1169/2011)** are the standard vocabulary: gluten-containing cereals,
  crustaceans, eggs, fish, peanuts, soybeans, milk, nuts (tree), celery, mustard, sesame, sulphites,
  lupin, molluscs. Mark **present** (red) vs **may-contain** (amber); use clear labels/icons. Let the
  user set "avoid" allergens and warn at dish-pick time (Doc 7 §5 already anticipates this).
- **Shopping list = consolidate by ingredient across dishes**, summing compatible units and listing
  which dishes need each — exactly what the prototype's "Combined" ingredients tab did.

**Boundary reminder:** all of this is deterministic data work (P1) — scaling is arithmetic,
allergen tags are recipe metadata, the shopping list is aggregation. No LLM on the cooking path.

## Definition of done (phase metric)

A cook can: (a) scale any dish's servings and see amounts adjust with non-linear ingredients
flagged; (b) see a consolidated shopping list across all chosen dishes; (c) set allergens to avoid
and get warned when a chosen dish contains one; (d) in Cook Mode, instantly tell which dish a task
belongs to when several are active. Verified in-browser.

## Items — small, ordered, independently testable (keep the gate green; GATE_EXIT=0 before commit)

1. **Engine: servings scaling (`scaleRecipe`).** In `@tutti/engine`, `scaleRecipe(graph, factor)`:
   multiply each ingredient `amount` by `factor`; for a known **non-linear category** (salt, spice,
   acid, leavening, yeast — keyword-matched) apply the conservative multiplier (~0.75–0.9) and set a
   `scaleNote`. Durations of *cook* steps may grow slightly with volume — keep simple (leave est,
   note it). Pure + unit-tested (linear ingredient doubles; salt scales <2× at 2×). Add `RecipeGraph.servings`
   as the base.
2. **UI: servings stepper on the dish (Pick or a dish detail).** A per-dish servings control that
   re-scales via `scaleRecipe` before `compile()`; show flagged ingredients with a "season to taste"
   hint. Persist chosen servings per dish.
3. **Engine/util: consolidated shopping list (`buildShoppingList`).** Aggregate ingredients across
   the selected recipes by normalized name + unit, summing amounts and recording which dishes need
   each (reuse the prototype's quantity parse + synonym-lite normalization). Pure + tested.
4. **UI: Shopping list screen.** A screen (reachable from Pick/Home) rendering `buildShoppingList`
   with check-off (persisted), "Separate vs Combined" toggle like the prototype, and dish color dots.
5. **Domain: allergen tags + avoid-list.** Add optional `allergens?: string[]` to `RecipeGraph`
   (from the 14 vocabulary); a deterministic `detectAllergens(graph)` heuristic from ingredient names
   as a fallback for ingested recipes (keyword → allergen, marked "may contain"). A persisted user
   "avoid" set; warn inline in Pick/Preview when a selected dish hits one (red present / amber maybe).
6. **Cook Mode multi-dish polish (Doc 7 §8.1).** When the NOW zone holds tasks from **different
   dishes at once**, make the dish identity unmistakable: the existing color dot + dish name, plus a
   subtle left color-border on each NOW card; ensure NEXT/DONE also carry the dot. Verify with a
   2+ concurrent-active scenario.
7. **Tests + a11y.** Engine tests for scaling + shopping aggregation; a web test that the shopping
   list renders and an allergen warning shows for an avoided allergen; keep the a11y gate green.

## Enforce-what-you-build (gate additions)
- engine: `scaleRecipe` preserves validity (`validate` still ok) and never scales a non-linear
  ingredient fully linearly; `buildShoppingList` totals are conserved.
- web: shopping-list + allergen-warning assertions added to the component tests.

## When substantially done
Run the Phase-4 web-research pass (Web Speech reliability in noisy kitchens, wake-word UX, adaptive
pace/EMA personalization UX) then **author `docs/Research-Brief-v5-handsfree-voice.md`** inline
(Doc 3 Phase 4 / Doc 2 §7): voice control (done/next/status), spoken confirmation, on-screen
fallback, and surfacing the already-built pace model in the UI. Lead with rationale. The loop never ends.

## Sources (research pass)
- https://cooklang.org/blog/26-how-to-scale-recipes-without-mistakes/
- https://www.getmeez.com/blog/recipe-scaling-conversions-101
- https://pmc.ncbi.nlm.nih.gov/articles/PMC8891920/
- https://www.mdpi.com/2076-3417/12/5/2590
- https://blog.foodsconnected.com/the-best-food-allergy-apps-and-how-they-work
