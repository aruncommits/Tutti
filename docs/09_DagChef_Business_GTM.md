# DagChef — Business & Go-to-Market

**Document 9 of 9** · Who it's for, how it makes money, and how it competes
*Strategic layer over the product of Docs 1–8*
*Status: Draft v1 · Owner: Arun*

> Market figures and competitor prices are current as of June 2026 (sources at end) and move often — re-verify before any board/investor use.

---

## 0. The strategic question

The original concept (Doc 1 §7) flagged the key tension: **B2C food apps are a commoditized graveyard, but the engine only gets good through B2C usage data.** This document resolves the sequencing and the model.

**Recommendation in one line:** launch a **focused B2C app as the proof + data flywheel**, architected from day one to become a **licensable B2B engine** — which is where the durable money is.

---

## 1. The competitive landscape

DagChef is not competing on "having recipes." Everyone has recipes. It competes on **execution intelligence** — and on that axis the field is mostly empty.

| Product | What it is | Price (US, Jun 2026) | What it does NOT do |
|---|---|---|---|
| **NYT Cooking** | Edited recipe library + basic "cook mode" | ~$4.99/mo or ~$39.99/yr | No multi-dish scheduling; linear steps |
| **Paprika** | Recipe manager / organizer | ~one-time $4.99 mobile / ~$29.99 desktop | No execution engine; storage, not timing |
| **Samsung Food** (ex-Whisk) | Recipe aggregator + meal plan + smart-appliance hooks | Free tier + premium | Aggregation, not parallel execution scheduling |
| **Mealime / Plan to Eat** | Meal planning + shopping lists | Freemium / low monthly | Planning, not in-the-moment orchestration |
| Generic recipe blogs/apps | Linear text | Free / ad-supported | Everything DagChef exists to fix |

**The gap:** every incumbent digitizes the *cookbook*. None of them schedules the *kitchen*. DagChef's multi-dish, resource-aware, interleaving engine is a genuinely different category — "Waze for cooking a meal," not "another recipe box." That whitespace is the opportunity *and* the risk (categories must be taught).

---

## 2. Target user (be narrow to win)

Not "everyone who cooks." The beachhead:

**Primary — "The ambitious home cook with limited time."** Cooks multi-dish meals (cultural/family meals, dinner parties, weekend batch cooks), feels the juggling pain acutely, and is willing to pay to feel competent and unhurried. The South Indian thali vertical (Doc 8) maps to a real, underserved, enthusiast audience that cooks complex multi-dish meals routinely.

**Secondary — confident-but-overwhelmed beginners** who can follow steps but melt down coordinating three pots. The guided-not-gated mode (Doc 1 §7.2) serves them.

**Explicitly NOT for v1:** the "what's for dinner, something in 10 minutes" single-pan crowd — there's no scheduling value in one dish, and that market is saturated.

---

## 3. The wedge: one cuisine, done excellently

Launch deep in **vegetarian South Indian** rather than shallow-everywhere. Why:
- Matches the engine's strength (lots of passive simmer/steam windows to interleave).
- A passionate, multi-dish-cooking community (thali/sambhar/poriyal meals are inherently 3–5 dishes).
- Lower food-safety liability (Doc 6 §5) — no raw-meat sequencing at launch.
- Coherent library is cheap to seed and easy to make dense enough that any two dishes combine well (Doc 8 §3).
Win one cuisine's enthusiasts, earn proof + data + word-of-mouth, then expand cuisine by cuisine.

---

## 4. Business model

### 4.1 Phase A — B2C (proof + flywheel)
- **Freemium:** free to cook a single recipe and a small library; **subscription** unlocks multi-dish scheduling (the differentiator), the full library, voice, adaptive pacing.
- **Price anchor:** incumbents sit at ~$5/mo or ~$40/yr (NYT Cooking). DagChef can price **at or modestly above** that *because it does something they don't* — but the category is price-sensitive, so value must be obvious in the first session (the "91 → 45 min" moment, Doc 7 §5).
- **The real product of Phase A is data, not revenue:** real durations, which parses fail, how cooks actually move — feeding the adaptive model (Doc 2 §7) and proving the engine works at scale.

### 4.2 Phase B — B2B engine licensing (the durable business)
License the proven engine + annotated-DAG capability as an API/SDK. The original concept's targets hold up:
- **Meal-kit providers (HelloFresh/Blue Apron):** the strongest wedge — they own *both* the recipe and the exact ingredients, so DAGs can be pre-compiled and verified per box. Scan the box → dynamic multi-dish walk-through instead of a paper card.
- **Smart-kitchen hardware (Samsung/LG displays):** execution layer for fridge/range screens.
- **Recipe publishers (NYT Cooking, supermarket apps):** power their "cook mode."

B2B is higher-margin, stickier, and defensible (the engine + corpus, Doc 8 §5). B2C de-risks the B2B sale by proving the engine in the wild first.

### 4.3 Why this sequencing (resolving the Doc 1 tension)
You cannot credibly license an *unproven* engine, and you cannot improve the engine without usage. So B2C-first is not a contradiction of the B2B thesis — it is the **necessary input** to it. B2C is the R&D lab and the demo; B2B is the payoff.

---

## 5. Success metrics

### 5.1 Phase 0 / product-truth metric (Doc 4)
- Interleaved cook saves **≥15%** wall-clock vs linear, with lower chaos. *Gate for everything.*

### 5.2 B2C product metrics
| Metric | Why it's the right one |
|---|---|
| **Multi-dish cook completion rate** | The core value event — did they finish a real meal on the plan? |
| **Time-saved per session (measured)** | Quantifies the promise; the headline marketing number |
| **Serve-time hit rate** | Did the meal land at the promised time? (Trust, Doc 1 P7) |
| **Repeat cooks / week** | Retention — does it become a habit? |
| **Free→paid conversion at the multi-dish wall** | Validates willingness to pay for the differentiator |
| **Parse-review minutes per recipe** | Content unit cost (links to Doc 5 §6, Doc 8 §4) |

### 5.3 Vanity metrics to ignore
Downloads, library size, time-in-app (longer is *worse* in a cooking app). We optimize for meals successfully cooked, not engagement.

---

## 6. Indicative cost & team (to reach a proven MVP)

Rough, for planning — not a budget.

| Function | Why needed | When |
|---|---|---|
| 1 product/eng generalist (engine) | Build the pure engine (Doc 2) | Phase 1+ |
| 1 mobile eng (RN) | Cook Mode UI (Doc 7) | Phase 2+ |
| Content lead (PT) + freelance recipe developers | Seed the owned library (Doc 8) | From Phase 1, parallel |
| LLM/pipeline (can be the eng generalist) | Parsing pipeline (Doc 5) | Track C |
| Design (contract) | Cook Mode prototype + usability | Phase 2 |
| IP attorney (contract) | Authoring contracts, paste feature (Doc 8) | Before launch |
| Food-safety reviewer (contract) | Sign-off gate | Before higher-risk recipes |

**Phase 0 costs essentially nothing** — one person, one kitchen, a stopwatch, a weekend (Doc 4). Spend real money only after the premise is validated.

---

## 7. Key risks (business-level) & mitigations

| Risk | Mitigation |
|---|---|
| Category education is hard ("what is this?") | Lead every surface with the visceral "91→45 min, all hot together" demo (Doc 7 §5) |
| Price sensitivity in food apps | Free single-recipe tier; paywall the unique multi-dish value, not basic use |
| Incumbents (Samsung Food, NYT) copy the feature | Speed + the annotated-DAG corpus + engine IP (Doc 8 §5); partner before they build |
| B2C churn (genre norm) | Optimize for *meals cooked* habit, not engagement; expand cuisines to deepen value |
| Thin library at launch = no value | Owned-content seeding from day one (Doc 8 §3) |
| Engine works in theory, not in real kitchens | Phase 0 + real-device voice testing (Doc 7 §13) before scaling |

---

## 8. The narrative (for pitches / partners)
"Recipe apps digitized the cookbook. Nobody scheduled the kitchen. DagChef is the execution engine that turns any set of recipes into one parallel plan — every dish hot, at the same minute, with the chopping hidden inside the simmering. We're proving it with home cooks, then licensing the engine to the meal-kit and smart-kitchen players who have the recipes but not the brain."

---

## 9. Decisions still owed (for Arun)
1. **Commit to the B2C-first-as-flywheel sequencing?** (This doc recommends yes.)
2. **Confirm the launch vertical** (recommend vegetarian South Indian).
3. **Freemium boundary** — is multi-dish the paywall? (Recommended.)
4. **Funding path** — bootstrap through Phase 0–2, or raise on the validated premise + engine IP?
5. **First B2B partner target** to design the SDK around (recommend meal-kit).

---

## Sources
- [NYT Cooking subscription cost breakdown 2025](https://eathealthy365.com/new-york-times-cooking-price-a-full-2025-breakdown/)
- [NYT Cooking — App Store listing](https://apps.apple.com/MX/app/id911422904)
- [Paprika Recipe Manager pricing (deal listings)](https://slickdeals.net/f/17915628-paprika-recipe-manager-3-app-ios-android-2-99-or-windows-mac-14-99)
- [12 Best Recipe Apps in 2026 — comparison](https://www.recipeone.app/blog/best-recipe-manager-apps)

*End of Document 9 — and of the DagChef document set.*
