# Research Brief v39 — Beyond the Thali: a Second Cuisine + Cuisine Filter

*Status: active · continuous-enhancement · Doc 8/9 (broaden the library) + the user's "not just thali" intent · authored by the loop*

## Rationale — why this, now

The owner was explicit from day one: **"recipes are not just thali"** — people cook arbitrary dishes
on arbitrary nights. The library is now 11 verified South Indian recipes (great depth in one
vertical), and every recipe already carries a `cuisine` field — but it's unused, because there's only
one cuisine. Adding a handful of **universally-known quick weeknight dishes** in other cuisines
(Italian pasta, an East-Asian fried rice / stir-fry) does two things at once: it makes Tutti useful on
a "just pasta tonight" evening, and it activates a **cuisine filter** on Browse so the now-multi-
cuisine library stays navigable. The engine is cuisine-agnostic (a DAG of tasks against resources),
so these schedule and interleave exactly like the thali — and they're frozen, verified data (no LLM).

### Research findings folded in (web pass, June 2026)

- The canonical quick-veg weeknight set is **fast pasta (aglio e olio / tomato), veggie fried rice,
  and a soy-ginger stir-fry / noodles** — ready in ~20–30 min, pantry-friendly. These are the dishes
  people actually reach for outside a thali.
- Centre them on staples (pasta, rice, frozen/fresh veg) so the ingredient lists stay simple.

## Definition of done

The library gains ~4 verified non-South-Indian recipes (Italian + East-Asian), each a valid/verified
`RecipeGraph` that compiles; Browse has a **cuisine filter** (All + each cuisine present) that
composes with the existing filters and sort; the cuisine tags are correct; gate green.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Author the recipes (engine data).** Add to `packages/engine/fixtures/library.json`: **Aglio e
   Olio** (rec_aglio, cuisine "Italian": boil pasta [passive], gently sizzle garlic + chili in olive
   oil [active], toss with pasta + parsley [active/serve]), **Tomato-Basil Pasta** (rec_tompasta,
   "Italian": boil pasta [passive], simmer tomato-garlic sauce [passive], toss + basil [serve]),
   **Veg Fried Rice** (rec_friedrice, "East Asian": cook/cool rice [passive], chop veg [active], stir-
   fry veg [active], add rice + soy + toss [active/serve]), **Veg Stir-fry Noodles** (rec_noodles,
   "East Asian": boil noodles [passive], chop veg [active], stir-fry veg in soy-ginger [active], toss
   noodles [serve]). Valid: acyclic, deps resolve, passive boil/cook vs active sauté, sane durations,
   ingredients with units, `verified:true`, correct `cuisine`, unique recipeIds (prefix ag_/tp_/fr_/nd_).
   Keep them honestly vegetarian. Bump the library test count assertion (>= 11 → >= 15).
2. **Cuisine in the filter (web).** Extend `filterLibrary`'s opts with `cuisine?: string` (match
   `entry.recipe.cuisine`; undefined/"" = all). Unit-test it. Derive the distinct cuisines from the
   library for the UI.
3. **Cuisine chips on Browse.** A "Cuisine" chip row (`All` + each distinct `cuisine` in the library,
   sorted) using `chip-toggle` + `aria-pressed`; `useState<string | null>(null)`; pass `cuisine` into
   `filterLibrary`. Composes with search / time / veg / allergen filters and the sort.
4. **Honest + engine-clean.** New recipes are real, cookable, correctly tagged; the engine library
   test (validate + verified + unique + compiles) covers them; no LLM.
5. **Tests.** library test count bump (item 1) + the new recipes pass it; a `filterLibrary` cuisine
   unit test; a Browse test that selecting a cuisine narrows the list to that cuisine (and "All"
   restores it).

## Enforce-what-you-build
- every new recipe passes the engine library test (valid/verified/unique/compiles).
- `filterLibrary` cuisine filtering unit-tested; a Browse test that the cuisine chip narrows results.

## When substantially done
Run a web-research pass on the next gap (onboarding polish, more recipes, or another competitor
feature) and **author `docs/Research-Brief-v40-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://foodwithfeeling.com/30-minute-vegetarian-dinners-i-actually-make-on-busy-weeknights/
- https://www.loveandlemons.com/stir-fry-recipe/
- https://www.tasteofhome.com/collection/easy-30-minute-vegetarian-dinners/
