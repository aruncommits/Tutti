# Research Brief v21 — Pantry Staples (only buy what you need)

*Status: active · continuous-enhancement · improves Doc 6 shopping (v4/v16) · authored by the loop*

## Rationale — why this, now

Tutti's consolidated shopping list is great, but it lists *everything* the meal needs — including the
salt, oil, mustard seeds, and turmeric every cook already has in the cupboard. Scanning past staples
to find the two things you actually need to buy is exactly the friction the shopping list was meant
to remove. Every serious grocery app solves this with a **staples list**: items you always have are
kept out of "to buy." Tutti already normalizes ingredient names (for consolidation), so it can let
the user mark an item "I always have this" once and thereafter split the list into **To buy** vs
**In your pantry** — turning a 20-line list into the 3 lines that matter. Pure, local, and a direct
upgrade to the share/shop flow.

### Research findings folded in (web pass, June 2026)

- The canonical pattern is a **Staples List**: "frequently purchased items that will not show up in
  your shopping list." Let the user move an item to staples in one tap, and out again.
- Apps let you **cross off / hide things you already have on hand** ("that big bottle of olive oil").
  Keep it reversible and visible — show a small "In your pantry (N)" group rather than silently
  dropping items (trust).
- Match by **normalized name** (Tutti already has `normalizeIngredientName`) so "2 tsp salt" and
  "salt to taste" both count as the same staple.

## Definition of done

In the shopping list, the user can mark any item as a pantry staple ("always have"); staples are
separated into an "In your pantry" group (not mixed into "To buy") and persist across meals, matched
by normalized name; the share/export reflects only the to-buy items; reversible; gate green.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Pure helpers (web).** `apps/web/src/pantry.ts`: `type Pantry = string[]` (normalized staple
   names). `isStaple(name, pantry)` (compare via `normalizeIngredientName`), `toggleStaple(pantry,
   name)` (add/remove normalized), `partitionByPantry(items, pantry)` → `{ toBuy, staples }`. Pure +
   unit-tested (normalized match: "Salt" vs "salt to taste"; toggle add/remove; partition splits).
2. **Persist + wire into Shopping (web).** `usePersistentState<Pantry>("tutti.pantry", [])`. In
   `ShoppingScreen` (combined view), split `buildShoppingList` via `partitionByPantry`: render a
   "To buy" group and a collapsed/secondary "In your pantry (N)" group; each row gets a small
   "always have" toggle (☑ pantry) that calls `toggleStaple`. Pass pantry + setter from App.
3. **Share reflects to-buy only.** The "Share list" text (Brief v16) should list only the **toBuy**
   items (so you don't text someone your whole pantry). Keep the formatter pure; pass the filtered
   items.
4. **Honest + reversible.** Never hide silently — the pantry group stays visible with a count, and
   un-marking returns an item to "To buy". A starter pantry is empty (no assumptions about what the
   user stocks).
5. **Tests.** pantry unit tests (normalized match, toggle, partition); a ShoppingScreen test that
   marking an item moves it to the pantry group and it leaves "To buy".

## Enforce-what-you-build
- pantry helpers pure + unit-tested (normalized matching is the subtle part).
- a Shopping test that a marked staple leaves the to-buy list (and the count updates).

## When substantially done
Run a web-research pass on the next gap (substitutions, photos, onboarding, units/metric toggle, or
another competitor feature) and **author `docs/Research-Brief-v22-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://learn.plantoeat.com/doc/use-the-staples-list-for-frequently-purchased-items
- https://apps.apple.com/us/app/anylist-grocery-shopping-list/id522167641
- https://www.meetpenny.com/grocery-list-and-pantry-management-apps/
