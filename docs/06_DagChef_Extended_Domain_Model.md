# DagChef — Extended Domain Model

**Document 6 of 9** · The real-kitchen concerns the core schema didn't cover
*Extends Doc 2 §2 · stays deterministic per Doc 1 P1*
*Status: Draft v1 · Owner: Arun*

---

## 0. Why this document exists

Docs 1–3 specified a clean scheduling engine. Real cooking has messier truths the core model ignored: people cook for different numbers of guests, ingredients repeat across dishes, heat has levels, people substitute, and — most importantly — **some sequencing mistakes make people sick.** This document layers those in **without** breaking the deterministic-first rule. Every addition here is data + arithmetic + rules. None of it adds an LLM call at runtime.

The five additions:
1. Serving-size scaling (§1)
2. Cross-dish ingredient consolidation / shopping list (§2)
3. Heat & temperature model (§3)
4. Substitutions & dietary/allergen flags (§4)
5. Food-safety rules (§5) — the one with liability weight

---

## 1. Serving-size scaling

A recipe authored for 4 should cook for 2 or 8 without re-authoring.

### 1.1 Schema additions
```jsonc
// RecipeGraph
"baseServings": 4,

// each ingredient
{ "name":"green beans", "amount":250, "unit":"g", "scaling":"linear" }
   // scaling: "linear" (most things) | "fixed" (e.g. "1 bay leaf", salt-to-taste)
   //          | "sublinear" (water/oil/spices that don't scale 1:1)
```

### 1.2 Scaling logic (deterministic)
```
scaleRecipe(recipe, targetServings):
  factor = targetServings / recipe.baseServings
  for each ingredient:
     if scaling=="linear":     amount *= factor
     if scaling=="fixed":      amount unchanged
     if scaling=="sublinear":  amount *= factor^0.8     // empirical curve
  adjust elastic durations mildly (more to chop) — NOT fixed-physics ones
     (a simmer is still a simmer; chopping 2× beans takes ~1.7× longer)
```

### 1.3 What we deliberately do NOT do
We don't pretend scaling is perfect — doubling a cake is not a solved problem. Scaling is offered with a **"scaled from a recipe for 4"** note, and the human reviewer can mark a recipe **`scalable:false`** when the chemistry won't tolerate it (baking, emulsions). Honesty over false precision (Doc 1 P7).

---

## 2. Cross-dish ingredient consolidation & shopping list

When three dishes each need shallots, the user wants **one shopping line and one prep node**, not three.

### 2.1 Shopping list (pre-cook, deterministic aggregation)
```
buildShoppingList(selectedRecipes, servings):
  scale every recipe to its servings
  group ingredients by canonical name + unit (normalize "scallion"→"green onion")
  sum linear amounts; list fixed ones once
  → grouped list by aisle/category for the store
```
Canonical-name normalization uses a **static synonym table** (curated, not LLM) — "coriander/cilantro," "brinjal/eggplant/aubergine." This table is content, maintained alongside the library.

### 2.2 Shared prep consolidation (during cooking — the subtle one)
If Dish A needs 5 chopped shallots and Dish B needs 5, the ideal is **one "chop 10 shallots" node** feeding both. This is an optimization with a catch: merging prep creates a shared dependency that can *reduce* scheduling flexibility (now both dishes wait on the one big chop).

**Decision:** v1 offers consolidation as an explicit **"combine prep"** toggle, defaulting **off** for the scheduler (keep dishes independent for max parallelism) but **on** for the shopping list and an optional "prep-ahead" checklist. We don't auto-merge prep nodes into the DAG in v1 — it complicates the merge and the time saving is small. Flagged as a post-MVP optimization.

---

## 3. Heat & temperature model

Durations alone under-describe cooking. We add heat as lightweight, structured data — still no runtime intelligence needed.

### 3.1 Schema additions (on cook-phase nodes)
```jsonc
"heat": {
  "level": "medium",          // "low"|"medium"|"medium-high"|"high"  (stovetop)
  "targetTempC": null,         // for oven/precise: e.g. 180
  "cue": "until skins blister" // the human sensory cue, shown verbatim
}
```

### 3.2 How it's used
- **Displayed**, not computed — the cook sees "medium-high, until skins blister." Sensory cues beat timers for doneness; we surface both.
- **Oven contention:** a `targetTempC` lets the resource allocator detect when two dishes need *different oven temperatures simultaneously* — a real conflict the burner-count model would miss. The allocator treats an oven at temp X as unavailable to a dish needing temp Y until it's free/reset.
- Still deterministic: heat is metadata + a richer resource-conflict rule, not AI.

---

## 4. Substitutions & dietary/allergen flags

### 4.1 Allergen & diet tags (on ingredients, curated)
```jsonc
{ "name":"urad dal", "amount":1, "unit":"tsp",
  "allergens":[], "dietary":["vegan","gluten-free"] }
{ "name":"ghee", "amount":1, "unit":"tbsp",
  "allergens":["dairy"], "dietary":["vegetarian"] }
```
Drives: a recipe-level allergen summary, filtering the library ("show gluten-free"), and a **warning if a user's saved allergen profile conflicts** with a selected dish. Tags are curated content (reviewer-verified), never inferred live.

### 4.2 Substitutions (static, curated table)
```jsonc
"substitutions": {
  "ghee": [{ "with":"coconut oil", "ratio":1.0, "note":"for vegan", "affectsFlavor":true }]
}
```
A curated substitution table offers swaps with ratios. The engine applies the ratio deterministically and **flags flavor impact**. We do *not* let an LLM invent substitutions at runtime — wrong swaps ruin food and can be unsafe (allergen cross-contamination). Curated only.

---

## 5. Food-safety rules (the one that carries liability)

This is the most important addition and the strongest argument for the human-verified library model. Bad sequencing here isn't a cold dish — it's food poisoning.

### 5.1 Safety as deterministic, hard rules (never advisory, never LLM)
A small **rules engine** runs at compile time over the merged plan:

```
SAFETY RULES (examples — codified, versioned, reviewed by a domain expert):
  R1  Raw-protein prep nodes must complete and the board/knife be marked
      "needs wash" before any ready-to-eat prep uses the same board.
      (cross-contamination)
  R2  Cooked-protein nodes must reach a doneness cue/temp before "serve".
      Never schedule "serve chicken" without its cook node satisfied.
  R3  Reheat/hold passive nodes have a max safe hold window; if the plan
      parks cooked food in the danger zone (~4–60°C) too long, FLAG it.
  R4  Cross-contamination resource lock: a cutting_board used for raw meat
      cannot be allocated to a veg-prep node until a "wash board" node runs.
```

### 5.2 How it integrates
- Safety rules are **constraints on the scheduler**, like resources — they can *force* ordering (wash before reuse) and *insert* nodes (a "wash board" node).
- Violations the engine can't resolve are surfaced as **blocking warnings** at compile, and flagged for the human reviewer at authoring time.
- The cutting_board-as-resource model (Doc 2) already gives us the hook: raw-meat use "dirties" the instance; a wash node "cleans" it. Safety reuses existing machinery.

### 5.3 Scope honesty
v1's library will lean **vegetarian South Indian** (Doc 8), which sidesteps most raw-protein risk — a deliberate, lower-liability starting vertical. Full meat/poultry/seafood safety rules are a gated prerequisite before those recipes enter the library. We will also carry a plain disclaimer: DagChef sequences trusted recipes; it is not a food-safety authority, and cooks must use judgment on doneness.

---

## 6. Updated TaskNode (consolidated)

Bringing §1–§5 together, the enriched node (additions marked):

```jsonc
{
  "nodeId":"kz_5", "recipeId":"rec_kuzhambu", "title":"Add tamarind & simmer",
  "instruction":"...", "phase":"cook", "attention":"passive",
  "duration":{"estMins":15,"minMins":12,"maxMins":20,"elastic":false},
  "ingredients":[
    { "name":"tamarind pulp","amount":1.5,"unit":"cup","scaling":"linear",
      "allergens":[],"dietary":["vegan"] }            // ← §1, §4
  ],
  "resources":[{"category":"burner","count":1,"heldFor":"duration"}],
  "heat":{ "level":"low","targetTempC":null,"cue":"until oil separates" }, // ← §3
  "safety":{ "rules":[] },                                                 // ← §5
  "dependencies":["kz_1","kz_4"], "status":"locked"
}
```

Every field added in this document is **data the human reviewer verifies and the deterministic engine consumes.** Nothing here moves an LLM onto the cooking path. The core stays pure (Doc 1 P1).

---

## 7. Build sequencing for these additions

| Addition | When (vs Doc 3 phases) | Why then |
|---|---|---|
| Heat display (`heat.cue`, `level`) | Phase 2 (single-recipe UI) | Cheap, improves every screen immediately |
| Allergen/dietary tags + filter | Phase 2–3 | Needs library content to be useful |
| Serving scaling | Phase 3 | Multi-dish makes it valuable |
| Shopping list | Phase 3 | Needs multi-recipe selection |
| Food-safety rules engine | **Before any meat recipe enters library** | Liability gate; veg vertical defers it |
| Oven-temp contention | Phase 3 (resource allocator) | Part of multi-dish resource solving |
| Substitutions | Post-MVP | Curated table takes time; not core |
| Prep consolidation in DAG | Post-MVP | Complicates merge; small payoff |

---

*End of Document 6. Next: Document 7 — UX Design & Wireframes.*
