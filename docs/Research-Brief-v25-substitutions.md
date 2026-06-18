# Research Brief v25 — Ingredient Substitutions ("out of X?")

*Status: active · continuous-enhancement · Doc 7 recipe reference + competitor parity · authored by the loop*

## Rationale — why this, now

The most common mid-prep snag is "I'm out of X." Tutti shows the full ingredient list (Brief v19) and
even lets you mark pantry staples (v21), but it can't yet answer "what do I use instead?" A small,
**curated, honest substitution reference** for the seeded South Indian vertical — tamarind → lemon +
a pinch of sugar; ghee → neutral oil; curry leaves → just omit — turns a dead-end into a save, right
where the user is reading the recipe. It fits Tutti's owned-library model (Doc 1 §4): the swaps are
**frozen, human-curated data**, not an LLM guess on the cooking path, so they're trustworthy and
offline. Bounded, pure, and a natural companion to the recipe detail + pantry work.

### Research findings folded in (web pass, June 2026)

- Surface substitutions as an **expandable section / inline tip** near the ingredients — not a
  separate tool to go hunting for. Map **missing item → alternative + a short note on how it affects
  the result** ("a little more sour, less fruity").
- Prioritize **common pantry alternatives** and be honest that a swap changes the dish; for some
  ingredients the right answer is "just leave it out." Only show swaps we've actually curated.

## Definition of done

In the recipe detail view, ingredients that have a known substitute show an "out of X?" hint with one
or two curated alternatives + an effect note; the data is a frozen, pure map keyed by normalized
ingredient name; nothing is fabricated (ingredients without a curated swap show nothing); gate green.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Curated data + pure lookup (web).** `apps/web/src/substitutions.ts`: `interface Substitute {
   swap: string; note?: string }`; a frozen `SUBSTITUTIONS: Record<string, Substitute[]>` keyed by
   `normalizeIngredientName(...)` covering ~12–15 common South Indian items (tamarind, ghee, curry
   leaves, grated coconut, mustard seeds, urad dal, chana dal, green chili, jaggery, asafoetida,
   rava, yogurt/curd, coconut oil, sesame oil). `substitutesFor(name): Substitute[]` (normalizes the
   query, returns [] when none). Pure. Unit-test: known item returns swaps; unknown returns []; the
   lookup is normalized (case/wording).
2. **Surface in RecipeDetail (web).** In the Ingredients section, for any ingredient with
   `substitutesFor(name).length`, render a small expandable/inline hint ("Out of {name}? Try {swap}"
   + note). Keep it subtle (a `details`/summary or a muted line under the row); don't clutter rows
   that have no swap. Reuse the existing detail layout.
3. **Honest + offline.** Frozen data only; no LLM, no network; ingredients without curated swaps show
   nothing. Notes state the tradeoff plainly.
4. **(Optional) Surface in mise.** If cheap, the "Get ready" screen could show the same hint for a
   missing staple — but keep the primary surface the recipe detail to stay bounded.
5. **Tests.** substitutions unit tests (known/unknown/normalized lookup); a RecipeDetail test that an
   ingredient with a known swap renders the "out of … try …" hint, and one without does not.

## Enforce-what-you-build
- `substitutesFor` is pure + unit-tested (normalized match; empty for unknown).
- a RecipeDetail test that the swap hint appears only for ingredients with curated data.

## When substantially done
Run a web-research pass on the next gap (photos, units toggle, onboarding, or another competitor
feature) and **author `docs/Research-Brief-v26-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://www.sidechef.com/business/recipe-platform/ux-best-practices-for-recipe-sites
- https://www.almanac.com/content/common-ingredient-substitutions
- https://home.organizeat.com/blog/ingredient-substitution-finder-for-any-recipe/
