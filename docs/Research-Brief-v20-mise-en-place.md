# Research Brief v20 — Mise en Place (get ready to cook)

*Status: active · continuous-enhancement · Doc 7 (pre-cook prep) + culinary best practice · authored by the loop*

## Rationale — why this, now

Tutti schedules the cook beautifully, but it drops you straight into the live timeline assuming
everything's already at hand. Real cooks — and every culinary fundamentals guide — start with **mise
en place**: gather and prep all ingredients *and* equipment before the first timer starts, so you're
not hunting for the blender while the tempering burns. Tutti uniquely knows both halves: the
consolidated **ingredient list** (already built for shopping) and, because it models equipment as
resources, exactly **which tools the meal needs** — and, from the kitchen profile, which ones you
*don't have*. A quick "Get ready" checklist between the plan and Cook Mode turns that latent
knowledge into the calm, mistake-proof start the whole scheduling model is meant to enable. Pure,
local, no LLM.

### Research findings folded in (web pass, June 2026)

- Mise en place = **gather ingredients, ready the equipment, prep/measure** before cooking; its
  whole point is to "reduce stress, avoid mistakes, and stay focused on cooking rather than
  multitasking." A pre-cook checklist is the canonical tool.
- **Equipment readiness is half of it** — "collect tools, make sure equipment is in good operating
  condition." Tutti can list the exact tools the meal needs (union of node resources) and **honestly
  flag any the kitchen profile says you lack** (it currently degrades silently when over capacity).
- Keep it skippable (experienced cooks blow past it) and glanceable; check items off.

## Definition of done

Before Cook Mode, the user can open a "Get ready" checklist showing the ingredients to gather and the
equipment the meal needs (with an honest heads-up for any equipment their kitchen profile is missing),
check items off, then start cooking. Pure derivation from the meal's recipes + kitchen; skippable;
gate green (incl. perf/pwa/a11y).

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Pure helpers (web).** `apps/web/src/mise.ts`: `requiredEquipment(recipes): string[]` — the unique
   resource categories used by any node across the meal, EXCLUDING `hands` (humanize for display via a
   small label map: burner→"Stove burner", pressure_cooker→"Pressure cooker", cutting_board→"Cutting
   board", pan→"Pan", oven→"Oven", microwave→"Microwave", blender→"Blender/mixie"). `missingEquipment(
   required, kitchen: KitchenUi): string[]` — required categories the kitchen doesn't have (map via
   toKitchenProfile + capacityOf from the engine if exported, else check the KitchenUi flags/counts).
   Reuse `buildShoppingList` for ingredients. Unit-test: required set excludes hands and de-dupes;
   missing detects a tool the kitchen lacks (e.g. no blender).
2. **"Get ready" screen (web).** Add `"ready"` to the Screen union; a `MiseScreen` (props: recipes,
   kitchen, onStart, onBack): a checkable Ingredients list (reuse the shopping check pattern / local
   state) and a checkable Equipment list; a gentle warning banner listing any `missingEquipment`
   ("Heads up — this meal uses a blender; your kitchen doesn't list one. You can still cook; Tutti
   will improvise the schedule."). A big "Start cooking" → onStart. Lazy-load (keep budget).
3. **Wire into the flow.** On PreviewScreen, change/augment so "Start cooking" routes to `"ready"`
   first (or add a "Get ready" button alongside "Start cooking" that goes to mise, keeping a direct
   start too). From mise, "Start cooking" calls the existing `startCooking`. Keep it skippable.
4. **Honest.** Only flag equipment genuinely absent from the profile; never block cooking (the engine
   already degrades gracefully); the message says so.
5. **Tests.** mise unit tests (requiredEquipment excludes hands + dedupes; missingEquipment flags a
   lacking tool, empty when all present). A MiseScreen render test (shows ingredients + equipment +
   a warning when a tool is missing; "Start cooking" calls onStart).

## Enforce-what-you-build
- requiredEquipment/missingEquipment are pure + unit-tested (hands excluded, missing detection).
- MiseScreen renders the equipment + the honest missing-tool warning; gate green.

## When substantially done
Run a web-research pass on the next gap (substitutions, photos, onboarding, or another competitor
feature) and **author `docs/Research-Brief-v21-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://fond.kitchen/blog/what-is-mise-en-place/
- https://www.webstaurantstore.com/blog/2886/what-is-mise-en-place.html
- https://pos.toasttab.com/blog/on-the-line/mise-en-place
