# Research Brief v26 — "Cooking for how many?" (meal-level scaling)

*Status: active · continuous-enhancement · serves the user's stated occasion/crowd scenario · authored by the loop*

## Rationale — why this, now

The user's core scenario is cooking for occasions — "sometimes more than 5 dishes," sometimes for a
crowd. Tutti already scales *per dish* (1×/2×/3×, Brief v4), but setting each dish individually to
feed eight people is tedious and error-prone. Every recipe tool offers a single **serving-size
adjuster** — "cooking for N?" — that scales the whole thing at once. Adding one meal-level "how many
people?" control that drives every selected dish's factor turns a multi-tap chore into one number,
directly serving the special-occasion use case the product was scoped around. It reuses the existing
`scaleRecipe` + per-dish `servingsFactor`, so it's pure plumbing on top of work already done.

### Research findings folded in (web pass, June 2026)

- The standard is **portion-based scaling**: factor = desired servings ÷ original servings, with a
  simple +/- adjuster (e.g. 4 → 8). Keep Tutti's to whole-number factors so it stays consistent with
  the existing 1×/2×/3× per-dish chips and the engine's integer-friendly scaling.
- A meal-level control should **set, not replace** per-dish control: the headcount sets every dish's
  factor; the per-dish chips remain for fine-tuning one dish (e.g. extra rice).

## Definition of done

On the Pick screen, a "Cooking for N?" stepper sets every selected dish's servings factor to feed ~N
people (factor = round(N ÷ the dish's base servings), clamped sane); the per-dish chips reflect and
can still override it; the existing interleaved-time/preview recompute as usual; pure scaling helper
unit-tested; gate green.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Pure helper (web).** `apps/web/src/servings.ts`: `factorForPeople(baseServings: number, people:
   number): number` = `Math.max(1, Math.min(6, Math.round(people / Math.max(1, baseServings))))`.
   `peopleFromFactor(baseServings, factor)` = `baseServings * factor` (for display). Unit-test:
   base 4 → people 8 ⇒ 2; people 4 ⇒ 1; people 12 ⇒ 3; clamps to [1,6]; people<base ⇒ 1.
2. **Meal-level stepper (Pick).** On `PickScreen`, a "Cooking for [N] people?" −/＋ stepper (default
   derived from current — e.g. the max base servings among selected, or 4). On change, App sets
   `servingsFactor[id] = factorForPeople(recipe.servings, N)` for every selected dish. Show the
   resulting per-dish serves count (already shown by the per-dish row). Keep ≥40px targets + aria.
3. **Compose with per-dish chips.** The headcount sets all factors; tapping a per-dish 1×/2×/3× chip
   still overrides that one dish. No conflict — both write `servingsFactor`.
4. **Honest.** Don't claim exact portions; "Cooking for ~N" framing. Clamp to a sane range; never 0.
5. **Tests.** servings.ts unit tests; a PickScreen test that bumping "Cooking for" to 8 sets the
   selected dishes' factors (or calls the handler with the expected factor). Keep gate green.

## Enforce-what-you-build
- `factorForPeople` is pure + unit-tested (rounding, clamping, people<base).
- a Pick test that the meal-level stepper drives the per-dish factor.

## When substantially done
Run a web-research pass on the next gap (photos, units toggle, onboarding, or another competitor
feature) and **author `docs/Research-Brief-v27-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://recipecard.io/recipe-converter/
- https://samsungfood.com/recipe-converter/
- https://www.escoffier.edu/blog/recipes/cooking-for-a-crowd-techniques-for-scaling-recipes/
