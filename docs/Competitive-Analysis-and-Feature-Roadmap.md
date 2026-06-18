# Competitive Analysis & Feature Enhancement Roadmap

> Market scan of cooking / recipe / meal-planning apps (researched June 2026), an honest read of
> where **Tutti** stands, and a prioritized roadmap of features to enhance the app in future.
>
> Tutti's thesis — *"every dish, in concert: tell me what to do right now so N dishes all finish
> hot at one serve time"* — is genuinely unserved by the market. This document is about (a)
> protecting and deepening that moat, and (b) closing the commodity gaps a comparison-shopper would
> notice immediately, **without betraying the offline-first, privacy-first, on-device stance.**

---

## 1. Where Tutti stands today

**Already shipped** (see Research-Briefs v1–v35):

- Deterministic multi-dish scheduling engine — recipes → task DAGs, interleave active work into
  passive windows, anchor backward from a serve time, **hands-as-a-resource** multi-cook scheduling,
  live rescheduling when you fall behind.
- On-device **pace learning** (per-category EMA, opt-in, privacy-preserving).
- Recipe import: paste, URL, JSON-LD (schema.org). *"Ask AI" parsing is stubbed — needs a server.*
- Three-tier Cook Mode (active / queue / archive), voice control, notifications, adjustable timers.
- Shopping list with consolidation + pantry **staples**, serving scaling, units toggle.
- Saved / recent meals, ratings, notes, photos, substitution hints, allergen detection.
- Offline-first **PWA**, self-hosted fonts, full export/reset, accessibility pass.

**Tutti's verified competitive position:** *no consumer product on the market does automatic
multi-dish synchronized timing.* The closest tools (below) all require manual cook-time entry and
none model the cook's hands. This is the moat — everything in the roadmap should either deepen it or
remove a reason for a user to choose a competitor instead.

---

## 2. Competitive landscape

### 2a. Recipe managers & meal planners

| App | Platforms | Pricing | Standout feature |
|---|---|---|---|
| **Paprika 3** | iOS/Android/Mac/Win | One-time (~$5–30/platform) | Best web clipper; aisle-sorted list; strong offline |
| **AnyList** | iOS/Android/web/Watch | Free + ~$10–15/yr | Household sharing; multi-store lists; grocery delivery |
| **Plan to Eat** | web/iOS/Android | ~$49/yr | Drag-and-drop **meal calendar**; nutrition |
| **Mealime** | iOS/Android | Free + ~$50/yr | Auto weekly plan optimized for **ingredient reuse / waste** |
| **Samsung Food** (ex-Whisk) | iOS/Android/web | Free + ~$60/yr | **Vision AI** ingredient scan; AI plans; large community |
| **Crouton** | Apple-only | Free + ~$25 lifetime | Polished cook mode; **OCR** scan; Bluetooth scales/probes |
| **Mela** | Apple-only | ~$7 one-time | **RSS recipe feeds**; multi-recipe cook view; Live Activities |
| **Saffron** | iOS/Android/Mac/web | Free + ~$30/yr | Genuinely cross-platform; strong **migration** from Paprika |
| **Pestle** | Apple + Chrome | Free + ~$25/yr | **Social-video import** via on-device Apple Intelligence; SharePlay |
| **Umami / ReciMe** | iOS/Android/web | ~$30–60/yr | Social-video + OCR import; clean planners |
| **Cooklist** | iOS/Android/web | Free + ~$6/mo | **Loyalty-card → auto-pantry** + expiration + "cook what you have" |

**Table stakes across the category:** URL import, auto shopping list (aisle-sorted), serving scaling,
**a meal-plan calendar**, cross-device sync, cook mode, ratings/notes/photos, household sharing.

**Current differentiators:** social-video import (the hottest battleground), OCR/photo import,
grocery-delivery checkout, nutrition/macros, loyalty-card pantry, community/discovery, hardware
integration, one-time/lifetime pricing.

**Category weaknesses (opportunities):** plan→list reconciliation is broken almost everywhere
(Paprika doesn't auto-add; Mealime/ReciMe *reset* the list when the plan changes); pantries rarely
reconcile against actual recipe needs.

### 2b. Cooking guidance, step-by-step & multi-dish timing (the key category)

- **Step-by-step cook mode is commoditized** — screen-awake (Wake Lock API), large text, multiple
  named timers, hands-free voice are now table stakes across SideChef, Kitchen Stories, Tasty,
  Crouton, Pestle, Mela, Apple News+ Food, and the OS itself (iOS Clock stacks 4 Live-Activity timer
  pills; Android 16 Live Updates).
- **Cross-dish "everything ready at once" is essentially unserved.** It is solved three weak ways:
  1. **Static editorial timelines** (ATK / Food Network / NYT Thanksgiving articles) — no computation.
  2. **Single-anchor calculators** (turkey back-timers) — one dish only.
  3. **A handful of niche schedulers** — *Time To Plate* (models **appliance lanes**, flags conflicts
     in plain English — the most sophisticated, but **manual cook-time entry, no hands modeling, no
     live re-solve**), *SimpleTime*, *COOK:CLOCK*. None parse recipes; none model the cook.
- **SideChef** markets "Multi-Recipe Cooking Guidance" but it appears only in vendor copy — unverified
  in any store listing or review; likely aspirational.
- **Incumbents are retreating from guided cooking:** Google deprecated Assistant step-by-step
  recipes; the ChefSteps/Joule app sunsets March 2026; Anova shrank dramatically; Tasty's owner
  disclosed "substantial doubt." The multi-dish lane is being *vacated*, not contested.
- **Academic signal:** the Oct-2025 *ParaCook* benchmark shows even frontier LLMs (GPT-5) reach only
  ~65% of optimal on parallel cooking (humans ~100%). **A deterministic CP/critical-path engine is
  still the gold standard** — a direct point in favor of Tutti's approach over the "ask ChatGPT"
  workflow people improvise today.

### 2c. AI assistants & emerging trends (2024–2026)

| Trend | Leaders | Maturity |
|---|---|---|
| AI recipe **generation** ("invent a recipe") | DishGen, Samsung Food, ChatGPT | Mature, cloud LLM |
| **"What can I make"** ingredient matching | SuperCook (deterministic!), Plant Jammer | Mature, beloved |
| Pantry inventory + **expiry / waste** | Cooklist, NoWaste, KitchenPal | Real; friction = data entry |
| **Vision** (ingredient ID, photo→nutrition, fridge cams) | Samsung Food (40k ingredients), Dexcom, Suggestic | The defining 2025 advance |
| **Shoppable** recipes / delivery | Instacart Connect, Walmart+SideChef, Alexa+Amazon Fresh | Mature; primary monetization |
| Nutrition / macros / dietary filters | FatSecret, Suggestic, Flavorish | Mature baseline |
| Connected appliances | Anova 2.0 (camera AI), Instant Pot, Thermomix | Real but hardware-gated |
| Social / creator ingestion | Samsung Food, TikTok/IG creators | Biggest growth, backend-heavy |
| Hands-free **voice + accessibility** | Voicipe, Alexa, Google | Mature; broadening demographically |
| On-device **personalization / taste profile** | TasteOS, Gastrograph, Cravify | Emerging; *doable on-device* |

**Macro signal:** "on-device AI as core product strategy" is the 2026 wave (WebLLM, llama.cpp, MLC,
WebGPU). **No major cooking app has yet shipped on-device LLM cooking** — open whitespace that
*validates* Tutti's bet and lets privacy be the differentiator rather than the limitation.

---

## 3. Gap analysis — what competitors have that Tutti lacks

Ordered by how exposed the gap is (how quickly a comparison-shopper would notice). Tutti's engine is
unmatched, so these are the "basics + modern expectations" where it can fall behind.

| Gap | Who has it | Notes | Priority |
|---|---|---|---|
| **Meal-plan calendar** (weekly, drag-and-drop) | Nearly everyone | The single most common feature Tutti lacks. Tutti has saved/recent meals but no week view. | **High** |
| **Social-video import** (TikTok/IG/YouTube) + AI parse | Pestle, ReciMe, Samsung Food | Fastest-growing capture vector; Tutti is paste/URL/JSON-LD only. | **High** |
| **Photo / OCR import** (cookbooks, handwritten, screenshots) | Crouton, Mela, ReciMe | No OCR path today. | **High** |
| **"What can I make" pantry matching** | SuperCook, Cooklist, Mealime | *Deterministic, on-device feasible* — flagship-worthy. | **High** |
| **Rich in-step / detected timers** in cook mode | Crouton, Pestle, Mela | Especially expected of a *timing* app. Synergistic with the engine. | **Medium** |
| **Nutrition / macros** | Plan to Eat, Mealime, ReciMe | Health users filter/log; Tutti has none. | **Medium** |
| **Expiry / waste tracking** on pantry | Cooklist, NoWaste | Extends existing pantry; all local. | **Medium** |
| **Grocery delivery / checkout** | AnyList, Mealime, Samsung Food, Cooklist | Closes plan→cart loop; monetization. Requires online opt-in. | **Medium** |
| **Voice / hands-free depth** | Crouton, Pestle, Alexa | Tutti *has* voice — deepen step-nav + safety prompts. | **Medium** |
| **Apple Watch / wearable companion** | AnyList, Crouton, Pestle | Glanceable "start X now" — ideal for a timing app; needs native. | **Low–Med** |
| **Recipe discovery / community / feeds** | Samsung Food, Mela (RSS) | Aids retention; backend-heavy. | **Low** |
| **Hardware integration** (scales, temp probes, ovens) | Crouton, Samsung Food | Niche; a temp-probe tie-in complements "finish on time." | **Low** |
| **Dietary tagging & filtering** (keto/GF/vegan) | Plan to Eat, Mealime | Standard organization; small gap if absent. | **Low** |

---

## 4. Recommended roadmap

Each item notes **why**, **on-device feasibility**, and **moat fit** (does it deepen the scheduling
differentiator, or just reach parity?). Privacy rule of thumb: anything in Tiers 1–2 is fully
on-device; online capabilities are isolated, opt-in "extras" in Tier 4.

### Tier 1 — Deepen the moat (highest leverage, fully on-device)

1. **Rich in-cook timers tied to the schedule.** Surface each passive window as a first-class,
   nameable timer; show the *nearest* expiry prominently; let a timer's overrun feed live
   rescheduling. This is the cook-mode parity competitors have **and** an amplifier of Tutti's
   timing story. *Moat fit: high.*
2. **Oven / stovetop lanes as resources** (extend hands-as-a-resource). Model oven racks and burners
   as constrained lanes; warn in plain English ("two dishes need the oven at 6:40 — stagger?"). Only
   *Time To Plate* does appliance lanes, and without recipe parsing — Tutti would do both. *Moat fit:
   very high.*
3. **"Hold window" modeling** (à la Joule "Ready When You Are"). Let dishes declare a safe
   hold/rest tolerance so the engine can absorb slippage and stagger finishes intentionally instead
   of forcing a single instant. *Moat fit: high.*
4. **Collaborative multi-cook hand-off.** Turn the existing multi-cook schedule into assigned,
   per-person task lanes on separate devices (or a shared screen) — Pestle has SharePlay *screen
   sharing*; nobody has *task allocation*. *Moat fit: very high, strategic.*

### Tier 2 — Close commodity gaps without leaving the stance (on-device)

5. **Pantry-driven "What can I make."** Deterministic match of the pantry against the local recipe
   library (SuperCook-style, no LLM). Highest-value commodity feature; builds directly on existing
   pantry + allergen data. *Should be the flagship next non-engine feature.*
6. **Expiry + "use soon" waste reduction.** Add expiry dates to pantry items, local PWA
   notifications, and a "use soon" boost in matching. All local.
7. **Meal-plan calendar (week view).** A drag-and-drop week that schedules *meals* (each a Tutti
   serve-time plan) across days and rolls up one shopping list. Close the most-noticed table-stakes
   gap — and reconcile plan→list correctly (the thing the category does *badly*: never silently reset
   the list when the plan changes).
8. **On-device taste/preference profile.** Extend the pace-learning pattern to a private preference
   model (cuisines, rated ingredients, avoided items) that ranks suggestions. Mirrors TasteOS, stays
   private.
9. **Photo / OCR recipe import.** On-device OCR (e.g., browser `Shape Detection` / Tesseract WASM)
   to digitize cookbook pages and handwritten cards — no server.
10. **Deeper voice / accessibility.** Hands-free step navigation, "what's next / how long," and
    safety prompts ("stir now"). Pure Web Speech API; an accessibility win and natural in the kitchen.

### Tier 3 — Platform reach

11. **Native shell (Capacitor is already configured).** Unlock **iOS Live Activities / Dynamic
    Island** and **Android Live Updates** to put the next action + nearest timer on the lock screen,
    plus an **Apple Watch** "start X now" haptic nudge — disproportionately valuable for a timing app
    the user isn't staring at. Keep the PWA as the offline core.
12. **Barcode pantry entry + bundled offline food dataset** (e.g., an Open Food Facts subset shipped
    locally) to kill the data-entry friction that makes pantry features fail elsewhere — without
    cloud lookups.

### Tier 4 — Explicit, opt-in "online extras" (deliberate tradeoff; never in the offline core)

13. **"Ask AI" recipe parsing — resolve via on-device WebLLM/WASM** (the trend-aligned, privacy-
    preserving answer to today's stub). A cloud endpoint would betray the stance; an optional,
    user-consented, quantized on-device model turns the current weakness into an on-brand
    differentiator. A server endpoint remains a fallback for low-end devices, clearly labeled online.
14. **Shoppable / grocery delivery** (Instacart Connect, Walmart) — converts plan→cart and is the
    category's main monetization path, but needs per-user network calls + location. Offer as a
    clearly-separated online feature.
15. **Social-video import** (TikTok/IG/YouTube). The hottest acquisition vector, but inherently
    network + parsing. Provide as import-only online extra; do the parse on-device where possible.

### Deliberately *not* recommended (conflict with the stance, low fit)

- Loyalty-card auto-pantry (Cooklist) — fundamentally cloud + retailer accounts.
- Cloud photo→nutrition macro logging — accurate versions are cloud vision; on-device is low accuracy.
- A full social network / community feed — least compatible with no-backend; at most import-only.

---

## 5. Strategic summary

- **The wedge is the engine.** No competitor solves multi-dish synchronized timing; incumbents are
  *retreating* from guided cooking; and even frontier LLMs can't schedule parallel cooking reliably.
  Lead with the deterministic *"everything at 7:00"* promise and treat cook-mode niceties as parity
  to add, not as the pitch.
- **Deepen before you widen.** Tier 1 (appliance lanes, hold windows, schedule-tied timers,
  collaborative multi-cook) makes the moat wider and is unavailable anywhere else.
- **Then neutralize the obvious gaps** — meal calendar, "what can I make," OCR import, nutrition —
  all achievable on-device, so privacy stays a feature, not a constraint.
- **Quarantine the online features.** Grocery delivery, social-video import, and cloud AI are real
  user draws but must live behind an explicit opt-in boundary so the offline-first promise
  ("cooks fully offline; nothing leaves your device") stays literally true.
- **The 2026 on-device-AI wave is moving toward Tutti, not away from it.** Resolving "Ask AI" with an
  on-device model is the single highest-upside way to convert the current stubbed weakness into a
  differentiated, on-brand strength.

---

## 6. Sources

Competitor app store / vendor pages and independent reviews for Paprika, AnyList, Plan to Eat,
Mealime, Samsung Food, Crouton, Mela, Saffron, Pestle, Umami, ReciMe, Cooklist, SideChef, Kitchen
Stories, Tasty, NYT Cooking, Bon Appétit, ChefSteps/Joule, Anova, Time To Plate, SimpleTime; Instacart
Connect & retailer-API docs; Samsung Food Vision AI, DishGen, SuperCook, NoWaste, KitchenPal,
Voicipe, TasteOS; Anova Precision Oven 2.0; the Oct-2025 *ParaCook* parallel-cooking benchmark
(arXiv); and on-device-AI / WebLLM 2026 surveys. Researched June 2026; verify pricing and feature
specifics before acting, as the category moves quickly.
