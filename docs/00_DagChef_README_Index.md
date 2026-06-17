# DagChef — Document Set Index

**The complete buildable specification.** Nine documents, one consistent model.
*Status: Draft v1 · Owner: Arun · Last updated: June 2026*

---

## The one idea that governs everything

> **DagChef is a deterministic scheduling engine that uses an LLM only at the edges.**
> The app is the intelligence. The LLM is a one-time, offline translator that turns recipe text into a graph, which a human verifies before anyone ever cooks from it. No LLM call ever sits on the cooking path.

Cooking is modeled as a **Directed Acyclic Graph** scheduled against finite resources — including the cook's own hands. Once hands are a resource, **cross-dish interleaving** (hiding the chopping inside the simmering) falls out automatically. That is the product.

---

## Read in this order

| # | Document | What it answers | For whom |
|---|---|---|---|
| 00 | **README / Index** (this file) | How the set fits together | Everyone |
| 01 | **Master Design** | What DagChef is, the principles, the architecture, the LLM boundary | Everyone — start here |
| 02 | **Engine Blueprint** | The algorithms inside the brain (schema, scheduling, recalculation, invariants) | Engineers |
| 03 | **Build Roadmap** | What to build, in what order, with go/no-go gates | Eng + founder |
| 04 | **Phase 0 Package** | The no-code experiment that validates the premise + first golden fixture | Founder — **do this first** |
| 05 | **LLM Parsing Spec** | The one place the LLM runs: prompt, output contract, review tool, accuracy test | Eng + content |
| 06 | **Extended Domain Model** | Scaling, shopping list, heat, allergens, food safety | Eng + content |
| 07 | **UX Design & Wireframes** | Every screen, the cook view, voice interaction | Design + eng |
| 08 | **Content & Licensing** | Where recipes legally come from; building the library | Founder + content + legal |
| 09 | **Business & GTM** | Who it's for, pricing, competition, B2C→B2B sequencing | Founder + investors |

---

## The whole thing in one diagram

```
 ┌── OFFLINE CONTENT PIPELINE (Docs 5, 8) ──────────────────────────┐
 │  recipe text ─▶ LLM parse ─▶ validate ─▶ human review ─▶ GOLDEN  │
 │                 (Doc 5)      (Doc 2 §3)   (Doc 5 §5)     LIBRARY  │
 │                                                          (frozen) │
 └─────────────────────────────────────────────────────────┬────────┘
                                                            │ data only
 ┌── RUNTIME: PURE DETERMINISTIC ENGINE (Doc 2) ────────────▼────────┐
 │  pick dishes + serve time + kitchen  ─▶  compile · schedule ·     │
 │                                          resource-solve ·         │
 │  ★ no LLM · offline · instant ★          recalculate             │
 └─────────────────────────────────────────────────────────┬────────┘
                                                            │ ViewState
 ┌── EXPERIENCE LAYER (Doc 7) ──────────────────────────────▼────────┐
 │  3-tier cook view (NOW / NEXT / DONE) · voice · honest serve clock │
 └───────────────────────────────────────────────────────────────────┘

 Validated first by a stopwatch (Doc 4). Sold per Doc 9. Owned per Doc 8.
```

---

## Design principles (the gate on every decision)

From Doc 1 §2 — every feature is checked against these:

1. **Deterministic-first** — if it can be computed, it is, not delegated to an LLM.
2. **LLM at the edge, never in the loop** — parse offline, verify, freeze.
3. **Fail safe** — the stove is on; uncertainty defaults to the safe instruction.
4. **Never blocked by the tool** — local, instant, offline.
5. **Guide, don't gate** — help beginners without handcuffing experts.
6. **Show only what's needed now** — progressive disclosure.
7. **Earn trust with the clock** — serve-time promises are sacred.

---

## Consistency check (done)

Verified consistent across all nine documents:
- **Data model** — TaskNode / RecipeGraph / KitchenProfile / MasterExecutionPlan / ViewState identical in Docs 2, 4, 6.
- **LLM boundary** — "parse offline + human-verified library, never at runtime" holds in Docs 1, 5, 8.
- **The six engine invariants** — referenced consistently in Docs 2, 3.
- **Equipment model** — layered (coarse→typed) introduced in Doc 2, used at Level 0 in Docs 4, 7, deepened in Doc 6.
- **Guided-not-gated & gesture-cut** — consistent in Docs 1, 7.
- **Launch vertical** — vegetarian South Indian, consistent in Docs 4, 6, 8, 9.
- **B2C-flywheel → B2B-engine** sequencing — consistent in Docs 1, 9.

---

## The critical path to a real product

```
 1. Doc 4 — cook the thali twice with a stopwatch        ← validates EVERYTHING, ~$0
 2. Doc 2/3 Phase 1 — build the pure engine + tests
 3. Doc 7 Phase 2 — single-recipe cook view
 4. Doc 2/3 Phase 3 — multi-dish compiler (the moat)
 5. Doc 5/8 (parallel) — seed the owned library
 6. Doc 7 Phase 4 — voice + adaptive pacing
 7. Doc 9 — B2C launch → prove engine → B2B licensing
```

**If you do one thing next: Document 4, the stopwatch test.** It either validates the entire premise or saves you from building on a false one — for the cost of one dinner.

---

## Open decisions still owed (consolidated)
- Launch vertical confirmation (recommended: veg South Indian).
- Server-side vs fully on-device runtime for v1.
- Freemium paywall boundary (recommended: multi-dish scheduling).
- B2C-first-as-flywheel sequencing (recommended: yes).
- First B2B partner to design the SDK around (recommended: meal-kit).
- Funding path: bootstrap through Phase 0–2 vs raise on validated premise.

---

*Nine documents. One engine. One dinner away from knowing if it's real.*
