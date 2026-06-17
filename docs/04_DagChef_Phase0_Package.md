# DagChef — Phase 0 Package

**Document 4 of 9** · The premise-validation experiment + the first golden fixture
*Implements Doc 3 §2 (Phase 0) · uses the schema from Doc 2 §2*
*Status: Draft v1 · Owner: Arun*

---

## 0. Why this document exists

This is the cheapest, highest-leverage thing in the entire project. Before writing a line of production code, we prove the single assumption everything rests on:

> **A computed, interleaved schedule meaningfully beats linear cooking — in wall-clock time and in felt chaos.**

We do it with a hand-authored DAG and a stopwatch. The DAG below also becomes the **first golden test fixture** for the engine (Doc 2 §9), so this work is never thrown away.

---

## 1. The meal: a 3-dish South Indian thali

Chosen because it matches the source examples and is rich in **passive windows** (simmering, boiling, resting) — exactly where interleaving pays off.

| Dish | Why it's here |
|---|---|
| **Steamed Rice** | Long passive cook (boil/steam) → a big free window for the hands |
| **Vatha Kuzhambu** (tamarind gravy) | Long simmer + meaningful prep + stove contention |
| **Beans Poriyal** (stir-fry) | Almost all active work → ideal to hide inside the others' passive windows |

Kitchen assumed for the fixture: **1 cook, 2 burners, 1 pressure cooker, 1 cutting board.**

---

## 2. The golden fixture (hand-authored DAG)

This is real, valid data conforming to Doc 2 §2.1. Save it as `fixtures/thali_v1.json`. It is intentionally hand-built (no LLM) so it is ground truth.

```jsonc
{
  "sessionFixture": "thali_v1",
  "targetServeTime": "19:30:00",
  "kitchenProfile": {
    "cooks": 1,
    "resources": [
      { "category": "burner", "count": 2 },
      { "category": "pressure_cooker", "count": 1 },
      { "category": "cutting_board", "count": 1 },
      { "category": "pan", "count": 2, "capabilities": ["small","large"] }
    ]
  },
  "recipes": [

    { "recipeId": "rec_rice", "name": "Steamed Rice", "version": 1, "servings": 4, "verified": true,
      "nodes": [
        { "nodeId":"ri_1","recipeId":"rec_rice","title":"Rinse rice","phase":"prep","attention":"active",
          "duration":{"estMins":3,"minMins":2,"maxMins":4,"elastic":true},
          "ingredients":[{"name":"raw rice","amount":1.5,"unit":"cup"}],
          "resources":[],"dependencies":[],"status":"locked" },
        { "nodeId":"ri_2","recipeId":"rec_rice","title":"Cook rice in pressure cooker","phase":"cook","attention":"passive",
          "duration":{"estMins":20,"minMins":18,"maxMins":24,"elastic":false},
          "ingredients":[{"name":"rinsed rice","amount":1.5,"unit":"cup"},{"name":"water","amount":3,"unit":"cup"}],
          "resources":[{"category":"pressure_cooker","count":1,"capabilities":[],"heldFor":"duration"},
                       {"category":"burner","count":1,"capabilities":[],"heldFor":"duration"}],
          "dependencies":["ri_1"],"status":"locked" },
        { "nodeId":"ri_3","recipeId":"rec_rice","title":"Rest & fluff rice","phase":"serve","attention":"passive",
          "duration":{"estMins":5,"minMins":5,"maxMins":8,"elastic":false},
          "ingredients":[],"resources":[],"dependencies":["ri_2"],"status":"locked" }
      ]
    },

    { "recipeId": "rec_kuzhambu", "name": "Vatha Kuzhambu", "version": 1, "servings": 4, "verified": true,
      "nodes": [
        { "nodeId":"kz_1","recipeId":"rec_kuzhambu","title":"Soak tamarind & extract pulp","phase":"prep","attention":"active",
          "duration":{"estMins":6,"minMins":5,"maxMins":10,"elastic":false},
          "ingredients":[{"name":"tamarind","amount":1,"unit":"lime-size"},{"name":"warm water","amount":1.5,"unit":"cup"}],
          "resources":[],"dependencies":[],"status":"locked" },
        { "nodeId":"kz_2","recipeId":"rec_kuzhambu","title":"Slit baby brinjals & shallots","phase":"prep","attention":"active",
          "duration":{"estMins":7,"minMins":5,"maxMins":11,"elastic":true},
          "ingredients":[{"name":"baby brinjals","amount":8,"unit":"whole","preparedState":"slit"},
                         {"name":"shallots","amount":10,"unit":"whole","preparedState":"peeled"}],
          "resources":[{"category":"cutting_board","count":1,"capabilities":[],"heldFor":"duration"}],
          "dependencies":[],"status":"locked" },
        { "nodeId":"kz_3","recipeId":"rec_kuzhambu","title":"Temper mustard, fenugreek & curry leaves","phase":"cook","attention":"active",
          "duration":{"estMins":3,"minMins":2,"maxMins":4,"elastic":false},
          "ingredients":[{"name":"sesame oil","amount":2,"unit":"tbsp"},{"name":"mustard seeds","amount":1,"unit":"tsp"},
                         {"name":"fenugreek seeds","amount":0.5,"unit":"tsp"},{"name":"curry leaves","amount":1,"unit":"sprig"}],
          "resources":[{"category":"burner","count":1,"capabilities":[],"heldFor":"duration"},
                       {"category":"pan","count":1,"capabilities":["large"],"heldFor":"duration"}],
          "dependencies":[],"status":"locked" },
        { "nodeId":"kz_4","recipeId":"rec_kuzhambu","title":"Fry brinjals & shallots","phase":"cook","attention":"active",
          "duration":{"estMins":8,"minMins":6,"maxMins":12,"elastic":false},
          "ingredients":[{"name":"slit brinjals","amount":8,"unit":"whole"},{"name":"peeled shallots","amount":10,"unit":"whole"}],
          "resources":[{"category":"burner","count":1,"capabilities":[],"heldFor":"duration"},
                       {"category":"pan","count":1,"capabilities":["large"],"heldFor":"duration"}],
          "dependencies":["kz_2","kz_3"],"status":"locked" },
        { "nodeId":"kz_5","recipeId":"rec_kuzhambu","title":"Add tamarind, sambar powder & simmer","phase":"cook","attention":"passive",
          "duration":{"estMins":15,"minMins":12,"maxMins":20,"elastic":false},
          "ingredients":[{"name":"tamarind pulp","amount":1.5,"unit":"cup"},{"name":"sambar powder","amount":2,"unit":"tbsp"},
                         {"name":"jaggery","amount":1,"unit":"tsp"},{"name":"salt","amount":1,"unit":"tsp"}],
          "resources":[{"category":"burner","count":1,"capabilities":[],"heldFor":"duration"},
                       {"category":"pan","count":1,"capabilities":["large"],"heldFor":"duration"}],
          "dependencies":["kz_1","kz_4"],"status":"locked" }
      ]
    },

    { "recipeId": "rec_poriyal", "name": "Beans Poriyal", "version": 1, "servings": 4, "verified": true,
      "nodes": [
        { "nodeId":"po_1","recipeId":"rec_poriyal","title":"Chop green beans","phase":"prep","attention":"active",
          "duration":{"estMins":9,"minMins":7,"maxMins":14,"elastic":true},
          "ingredients":[{"name":"green beans","amount":250,"unit":"g","preparedState":"finely chopped"}],
          "resources":[{"category":"cutting_board","count":1,"capabilities":[],"heldFor":"duration"}],
          "dependencies":[],"status":"locked" },
        { "nodeId":"po_2","recipeId":"rec_poriyal","title":"Temper mustard & urad dal","phase":"cook","attention":"active",
          "duration":{"estMins":3,"minMins":2,"maxMins":4,"elastic":false},
          "ingredients":[{"name":"coconut oil","amount":1,"unit":"tbsp"},{"name":"mustard seeds","amount":1,"unit":"tsp"},
                         {"name":"urad dal","amount":1,"unit":"tsp"},{"name":"dried red chili","amount":2,"unit":"whole"}],
          "resources":[{"category":"burner","count":1,"capabilities":[],"heldFor":"duration"},
                       {"category":"pan","count":1,"capabilities":["small"],"heldFor":"duration"}],
          "dependencies":[],"status":"locked" },
        { "nodeId":"po_3","recipeId":"rec_poriyal","title":"Sauté beans till tender","phase":"cook","attention":"active",
          "duration":{"estMins":10,"minMins":8,"maxMins":14,"elastic":false},
          "ingredients":[{"name":"chopped beans","amount":250,"unit":"g"},{"name":"salt","amount":0.5,"unit":"tsp"},
                         {"name":"turmeric","amount":0.25,"unit":"tsp"}],
          "resources":[{"category":"burner","count":1,"capabilities":[],"heldFor":"duration"},
                       {"category":"pan","count":1,"capabilities":["small"],"heldFor":"duration"}],
          "dependencies":["po_1","po_2"],"status":"locked" },
        { "nodeId":"po_4","recipeId":"rec_poriyal","title":"Add grated coconut & toss","phase":"cook","attention":"active",
          "duration":{"estMins":2,"minMins":1,"maxMins":3,"elastic":false},
          "ingredients":[{"name":"grated coconut","amount":3,"unit":"tbsp"}],
          "resources":[{"category":"burner","count":1,"capabilities":[],"heldFor":"duration"},
                       {"category":"pan","count":1,"capabilities":["small"],"heldFor":"duration"}],
          "dependencies":["po_3"],"status":"locked" }
      ]
    }
  ]
}
```

**Validation checks this fixture is built to pass** (Doc 2 §3): no cycles, every dependency resolves, every ingredient maps to a node, no orphan nodes, active nodes hold hands / passive nodes don't.

---

## 3. The two schedules, computed by hand

### 3.1 Linear baseline (how a normal cook does it: one dish fully, then the next)
Sum of every node done serially:
- Rice: 3 + 20 + 5 = 28
- Kuzhambu: 6 + 7 + 3 + 8 + 15 = 39
- Poriyal: 9 + 3 + 10 + 2 = 24

**Linear total ≈ 91 minutes**, and the cook is overwhelmed switching between three mental lists, with dishes finishing at wildly different times (rice cold by the time kuzhambu is done).

### 3.2 DagChef interleaved (hands-as-resource, 2 burners)
The engine hides active work inside passive windows. One feasible plan:

```
 t=0   ─ Rinse rice (ri_1, active 3)         ┐ prep burst
 t=3   ─ Start rice cooker (ri_2, PASSIVE 20)│ → frees hands for 20 min
 t=3   ─ Chop beans (po_1, active 9)         │ hidden inside rice cook
 t=12  ─ Slit brinjals & shallots (kz_2, 7)  │ hidden inside rice cook
 t=19  ─ Soak tamarind (kz_1, 6, passive-ish)┘
 t=19  ─ Temper kuzhambu (kz_3, active 3, burner B)
 t=22  ─ Fry brinjals (kz_4, active 8, burner B)
 t=23  ─ rice done (ri_2 ends), resting (ri_3 passive 5)
 t=30  ─ Kuzhambu simmer (kz_5, PASSIVE 15, burner B) ┐ frees hands again
 t=30  ─ Temper poriyal (po_2, active 3, burner A)    │ hidden in simmer
 t=33  ─ Sauté beans (po_3, active 10, burner A)      │ hidden in simmer
 t=43  ─ Coconut toss (po_4, active 2, burner A)      ┘
 t=45  ─ Kuzhambu simmer ends; everything plated hot together
```

**DagChef total ≈ 45 minutes** — and crucially **all three dishes finish hot at the same moment.**

### 3.3 The headline numbers (to be confirmed by the real cook)
| | Linear | DagChef | Saving |
|---|---|---|---|
| Wall-clock | ~91 min | ~45 min | **~50%** |
| Dishes hot together | No | Yes | — |
| Active "juggling" load | High | Low | — |

The ~50% is the optimistic hand-computed figure. The experiment's job is to find the *real* number with a real cook and a real kitchen.

---

## 4. The experiment protocol

### 4.1 Hypothesis
The interleaved plan reduces total cooking time by **≥15%** versus linear cooking of the same meal **and** the cook self-reports lower stress/chaos.

(15% is the go/no-go floor from Doc 3 §2. Hand-math suggests far more, which gives comfortable margin.)

### 4.2 Setup
- Same cook, same kitchen, same recipes, same servings, same equipment.
- Two sessions on different days (avoid learning/fatigue carryover); counterbalance order if you can recruit a second cook (one does linear-first, the other DagChef-first).
- Ingredients fully shopped and on the counter for both runs (we're testing scheduling, not shopping).

### 4.3 Run A — Linear control
Cook the three dishes the normal way: finish one, start the next, following the original linear recipe text. Stopwatch from first action to all-plated.

### 4.4 Run B — DagChef plan
Cook by following the interleaved schedule in §3.2 printed on paper (no app needed — we're testing the *plan*, not the software). Stopwatch the same way.

### 4.5 What to measure
| Metric | How |
|---|---|
| Total wall-clock | Stopwatch, first action → all plated |
| Serve-temperature spread | Temp of each dish at plating (were they all hot?) |
| Idle vs active time | Tally minutes hands were free vs busy |
| Errors / near-misses | Count burns, missed steps, "oh no" moments |
| Subjective chaos | Cook rates stress 1–10 after each run |
| Plan deviations | Note every time the cook couldn't follow the plan (reveals bad nodes) |

### 4.6 Decision rule
- **≥15% time saving AND lower chaos rating → GO.** Proceed to Phase 1; this fixture becomes the engine's golden test.
- **<15% or higher chaos → STOP and diagnose.** Either the model is wrong, the durations are off, or the meal lacks enough passive windows. Fix the premise before building.

### 4.7 Bonus output regardless of result
Every place the cook *couldn't* follow the plan is gold — it exposes a missing dependency, a wrong duration, or a resource the model ignored. Feed these corrections straight back into `thali_v1.json` so the fixture gets more honest.

---

## 5. What this unlocks
- A **validated premise** (or an early, cheap kill).
- The **first golden fixture** for engine testing (Doc 2 §9).
- **Calibrated durations** from real cooking, improving every future estimate.
- A concrete **demo artifact** for any future investor/partner conversation.

---

*End of Document 4. The fixture JSON above is ready to drop into `fixtures/thali_v1.json`.*
