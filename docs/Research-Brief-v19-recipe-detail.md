# Research Brief v19 — Recipe Detail (read the recipe)

*Status: active · continuous-enhancement · Doc 7 (recipe reference) + competitor parity · authored by the loop*

## Rationale — why this, now

Tutti can browse, schedule, and cook a dish — but there's no way to just **read it**: see the full
ingredient list and the ordered steps before committing to a plan. Every recipe app has a recipe
detail page; it's the most basic "is this what I want to make, and do I have the stuff?" check. Tutti
jumps straight from a one-line Browse row into scheduling, which is great for *doing* but skips
*deciding*. A clean detail view — ingredients up top, scannable numbered steps with phase/time tags,
plus the rating/notes we now capture — fills the last obvious content gap and makes the seeded
library actually browsable as recipes, not just schedulable tokens. It's a pure render of the
`RecipeGraph` data we already have: no engine change, no LLM, no network.

### Research findings folded in (web pass, June 2026)

- **Ingredients near the steps, not a far-off column**; group/scan-friendly. Put the full list up
  top for the "do I have it?" check, then the steps.
- **Scannable, numbered steps with visual breaks** — long paragraphs hide key actions ("start
  rice"). Tutti's nodes are already atomic steps with a phase + duration + attention; render them as
  a numbered list with those tags (active vs hands-free).
- Treat the page as a **control center**: scan, act, glance — quick reference, not long-form reading.
  Surface the saved rating/note (Brief v17) here too.

## Definition of done

From Browse (and/or Pick), the user can open a recipe detail view showing: name, total time,
servings, allergens, any saved rating/cook-count/note, the full ingredient list, and the ordered
numbered steps (with phase + duration + active/hands-free). An "Add to meal" action from detail puts
it in the plan. Pure render; gate green (incl. perf/pwa/a11y); the lazy-loaded screen keeps the perf
budget.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Pure view helpers (web).** `apps/web/src/recipeView.ts`: `orderedSteps(recipe): TaskNode[]` —
   topologically ordered steps (reuse the engine's `topoSort` if exported, else a small local
   dependency sort), and `recipeIngredients(recipe): ShareItem[]` — the de-duplicated ingredient
   list for one recipe (reuse `buildShoppingList([recipe])` from the engine). `recipeTotalMins(recipe)`.
   Unit-test ordering respects dependencies and ingredients aggregate.
2. **RecipeDetail screen (web).** Add `"recipe"` to the Screen union; `RecipeDetailScreen` (props:
   recipe, note?, onAdd, onBack): header (name · total time · serves · allergen badges · ★rating +
   "cooked N×" + note if present), an "Ingredients" section, then a numbered "Steps" list — each step
   shows its title, a phase chip, duration, and a "hands-free" tag for passive. "Add to meal" button.
   Lazy-load it (keep the budget).
3. **Open from Browse.** Give each Browse row a way to open detail (e.g. tap the name/an "ⓘ details"
   affordance) distinct from the "+ Add" action, so Add still works in one tap. App holds the
   selected `detailRecipe` and routes to "recipe"; "Add to meal" from detail calls the existing
   addCandidate.
4. **Honest + a11y.** Steps are an ordered list (`<ol>`); headings/landmarks correct; nothing
   fabricated (only render what's in the RecipeGraph). Reduced clutter; scannable.
5. **Tests.** recipeView unit tests (ordering + ingredient aggregation); a RecipeDetail render test
   (shows ingredients + numbered steps for a library recipe, "Add to meal" calls onAdd); a Browse
   test that the details affordance opens detail (or App-level route test).

## Enforce-what-you-build
- orderedSteps respects dependencies (a step never precedes one it depends on) — unit-tested.
- RecipeDetail renders the right number of steps + the ingredient list for a known fixture.

## When substantially done
Run a web-research pass on the next gap (photos, substitutions/"I don't have X", richer onboarding,
or another competitor feature) and **author `docs/Research-Brief-v20-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://blog.tubikstudio.com/case-study-recipes-app-ux-design/
- https://droolrecipes.com/recipe-ui/
- https://www.sidechef.com/business/recipe-platform/ux-best-practices-for-recipe-sites
