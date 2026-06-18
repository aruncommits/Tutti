# Research Brief v29 — Metric Units Toggle

*Status: active · continuous-enhancement · competitor parity (recipe converters) · authored by the loop*

## Rationale — why this, now

Tutti's amounts are in US-style volume units (cups, tbsp, tsp). Much of the world cooks in
millilitres/grams, and "switch to metric" is a table-stakes feature of every recipe converter. A
single **Metric units** toggle that converts the *displayed* amounts (cup → 240 ml, tbsp → 15 ml,
tsp → 5 ml) wherever ingredients are shown — shopping list, recipe detail, mise — makes Tutti usable
for metric cooks without touching the underlying recipe data. It's a pure display-layer conversion
(the engine and stored recipes are unchanged), bounded, and honest if we **stick to volume→volume**
(no density-based cup→grams guessing, which varies by ingredient).

### Research findings folded in (web pass, June 2026)

- Converters offer an instant **metric/imperial toggle** that recomputes displayed amounts; common
  conversions are cup↔ml, tbsp↔ml, tsp↔ml, oz↔g, °F↔°C.
- Cup→**grams** needs per-ingredient density — error-prone; reputable tools that avoid a density DB
  do **volume→volume** (cup→ml). Keep Tutti honest: convert volumes to ml only; leave count units
  (whole, clove, sprig, pinch) and already-metric values as-is. Round to friendly numbers.

## Definition of done

A "Metric units" toggle in Settings (persisted) makes ingredient amounts display in ml where a US
volume unit is used (cup/tbsp/tsp → ml, rounded sensibly), across the shopping list, recipe detail,
and mise; count/unknown units are unchanged; the underlying data and engine are untouched; pure
converter unit-tested; gate green.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Pure converter (web).** `apps/web/src/units.ts`: `convertAmount(amount: number | undefined, unit:
   string | undefined, metric: boolean): { amount?: number; unit?: string }` — when `metric` and the
   unit is a known US volume (`cup/cups`→×240, `tbsp/tablespoon`→×15, `tsp/teaspoon`→×5, `oz`→×28 g),
   return `{ amount: roundNice(amount*factor), unit: "ml" | "g" }`; otherwise return the input
   unchanged. `roundNice` (e.g. nearest 5 for ml ≥ 20, else nearest 1). `displayAmount(amount, unit,
   toTaste, metric)` convenience → string. Unit-test: cup→ml, tbsp→ml, tsp→ml, metric off = identity,
   count units (whole/clove) unchanged, rounding.
2. **Setting + persistence.** `usePersistentState<boolean>("tutti.metric", false)` in App; a "Metric
   units" toggle in SettingsScreen (desc "Show amounts in millilitres") wired to it; pass `metric`
   down to the screens that show amounts.
3. **Apply at display.** Replace the inline amount formatting in ShoppingScreen, RecipeDetailScreen,
   and MiseScreen with `displayAmount(..., metric)`. Don't touch engine/recipe data; this is render-only.
4. **Honest.** Volume→ml only; count units untouched; no fabricated gram densities. The toggle label
   says "millilitres", not "grams".
5. **Tests.** units.ts unit tests; a RecipeDetail (or Shopping) test that with `metric` a cup-based
   ingredient shows "ml" and without it shows the original unit.

## Enforce-what-you-build
- `convertAmount` pure + unit-tested (known volumes convert; counts/unknown pass through; off = identity).
- a screen test that the metric flag changes a cup amount to ml and leaves counts alone.

## When substantially done
Run a web-research pass on the next gap (photos, onboarding, temperature/°C, or another competitor
feature) and **author `docs/Research-Brief-v30-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://recipecard.io/recipe-unit-converter/
- https://convertrecipe.com/
- https://apps.apple.com/us/app/useful-units-recipe-converter/id1501689634
