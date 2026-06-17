# DagChef — UX Design & Wireframes

**Document 7 of 9** · The experience layer made concrete
*Renders the engine ViewState of Doc 2 §2.5 · realizes the UX strategy of Doc 1 §6–§8*
*Status: Draft v1 · Owner: Arun*

---

## 0. Principle: the screen answers one question

At every moment the cooking UI answers exactly: **"what do I do right now?"** Everything else is secondary and collapsed. The wireframes below are lo-fi on purpose — they fix flow and hierarchy, not final visual design.

Core UX rules carried from Doc 1:
- **Progressive disclosure** — Active expanded, Queue collapsed, Archive struck (P6).
- **No scrolling to cook** — the current task is always in view without scrolling.
- **Guided, not gated** — nudge, don't wall (P5).
- **Hands-free cooking** — voice-first; tapping only expected during prep (Doc 1 §8).
- **The clock is honest** — projected serve time always visible, never silently broken (P7).

---

## 1. The full flow

```
 Onboarding → Kitchen Profile → [Home] → Pick Dishes → Set Serve Time
     → Plan Preview (compile) → COOK MODE (3-tier) → Done/Plated
                                     │
                    voice · recalculation · overrun alerts
```

---

## 2. Onboarding (first run only)

Three swipeable cards selling the core idea, then straight into setup. No account required to cook (Doc 1 P4 — local first).

```
┌─────────────────────────────┐
│            DagChef          │
│                             │
│   Cook a whole meal like    │
│   a pro kitchen — every     │
│   dish hot, at the same     │
│   time.                     │
│                             │
│   ● ○ ○                     │
│        [  Next  ]           │
└─────────────────────────────┘
```
Card 2: "We schedule the chopping into the simmering, so you're never juggling." Card 3: "Tell us your kitchen once. Then just cook." → `Set up my kitchen`.

---

## 3. Kitchen Profile setup (one-time, editable)

Drives the resource allocator (Doc 2 §2.3). Level 0 coarse counts — fast taps, no typing.

```
┌─────────────────────────────┐
│  Your Kitchen        [Save] │
│─────────────────────────────│
│  Cooks (hands)      [- 1 +] │
│  Burners            [- 2 +] │
│  Oven               [○ off] │
│  Pressure cooker    [● on ] │
│  Microwave          [● on ] │
│  Blender            [● on ] │
│  Cutting boards     [- 1 +] │
│                             │
│  Counter space  ◉ small     │
│                 ○ medium    │
│                 ○ large     │
└─────────────────────────────┘
```
Editable anytime from Home. Defaults are sensible (1 cook, 2 burners) so a user can skip and cook immediately.

---

## 4. Home

```
┌─────────────────────────────┐
│  DagChef            ⚙ 🍳    │
│─────────────────────────────│
│  ▶ Continue cooking         │  ← only if a session is live
│    "Thali" · 22 min left    │
│─────────────────────────────│
│  Plan a meal                │
│  [ + Pick dishes ]          │
│─────────────────────────────│
│  Browse library             │
│  🔍 [ search recipes      ] │
│  South Indian · Veg · …     │
└─────────────────────────────┘
```

---

## 5. Pick dishes (multi-select)

The selection that feeds `compile()`. Shows passive-window hints so users intuitively build interleavable meals.

```
┌─────────────────────────────┐
│  Pick your dishes      (3)  │
│─────────────────────────────│
│ ☑ Steamed Rice        28m   │
│ ☑ Vatha Kuzhambu      39m   │
│ ☑ Beans Poriyal       24m   │
│ ☐ Coconut Chutney     10m   │
│─────────────────────────────│
│  Cooking all 3 separately:  │
│            ~91 min          │
│  With DagChef:  ~45 min ⚡   │  ← live estimate as they select
│                             │
│        [ Plan this meal ]   │
└─────────────────────────────┘
```
The live "91 → 45" delta is the product's value proposition shown *before* they commit. Allergen conflicts (Doc 6 §4) surface here as an inline warning.

---

## 6. Set serve time

Feeds reverse target-time scheduling (Doc 2 §4.5).

```
┌─────────────────────────────┐
│  When do you want to eat?   │
│                             │
│        ┌───────────┐        │
│        │   7:30 PM │        │
│        └───────────┘        │
│   ○ As soon as possible     │
│                             │
│   To serve at 7:30, you'll  │
│   start at  6:45 PM.        │
│                             │
│        [ Build my plan ]    │
└─────────────────────────────┘
```
If the target is infeasible (not enough time), this screen says so honestly: "This meal needs 45 min — earliest you can serve is 7:05 PM" (P7).

---

## 7. Plan preview (the compiled schedule)

A confidence-builder shown once before cooking. Visualizes interleaving so the user trusts the plan.

```
┌─────────────────────────────┐
│  Your plan · serve 7:30     │
│─────────────────────────────│
│  Start 6:45                 │
│  ▓▓ Rice  ░░░░░░░░ (cooks)  │
│   ▓ Chop beans              │  ← shown nested in rice's
│      ▓ Slit brinjals        │     passive window
│         ░░ Kuzhambu simmer  │
│          ▓ Beans            │
│  ─────────────────── 7:30 ──│
│  All dishes ready together  │
│                             │
│  [ Start cooking ]  [ Edit ]│
└─────────────────────────────┘
```
"Edit" returns to dish/serve-time. "Start cooking" enters Cook Mode and starts the clock.

---

## 8. COOK MODE — the three-tier view (the heart)

A pure render of `deriveViewState()` (Doc 2 §5.2). This is single-dish and multi-dish alike — multi just means Active can hold tasks from different dishes (color-tagged).

```
┌─────────────────────────────┐
│  ⏱ 7:30 on track   🎙 ●     │  ← projected serve + voice indicator
│═════════════════════════════│
│  NOW                        │
│  ┌─────────────────────────┐│
│  │ 🟢 Chop green beans     ││  ← ACTIVE ZONE: expanded,
│  │ 250g, finely            ││     big text, contextual
│  │ ~9 min                  ││     measurements inline
│  │                         ││
│  │      [  ✓ Done  ]       ││
│  └─────────────────────────┘│
│  ┌─────────────────────────┐│
│  │ 🟡 Rice cooking… 14m ⏲ ││  ← passive, runs itself,
│  └─────────────────────────┘│     no action needed
│═════════════════════════════│
│  NEXT  (4)                  │  ← QUEUE: collapsed titles
│  • Slit brinjals            │
│  • Temper kuzhambu          │
│  • Fry brinjals             │
│  • Sauté beans              │
│─────────────────────────────│
│  ✓ Rinse rice   ✓ Start rice│  ← ARCHIVE: struck, bottom
└─────────────────────────────┘
```

Behavior:
- Tapping **Done** (or saying "done") → `applyEvent()` → the next unblocked task animates up into NOW and expands. Instant, local.
- **Passive tasks** show a live countdown but need no action; they sit in NOW as ambient status, not a to-do.
- **Color dots** tag which dish each task belongs to in multi-dish meals.
- The **header serve time** turns amber ("running late — now 7:36") if the user falls behind (Doc 2 §6), never hidden.

### 8.1 Dish labels in multi-dish
```
│  │ 🟢 Chop green beans  ●Poriyal ││
│  │ 🟢 Slit brinjals     ●Kuzhambu││  ← if two are active at once
```
Color + name so the cook always knows which pot.

---

## 9. Guided-not-gated phase transition (Doc 1 §7.2)

Not a wall. When prep is essentially done and the first cook step is ready:

```
┌─────────────────────────────┐
│  Prep's basically done 👍    │
│  Ready to start cooking?     │
│  (3 prep tasks left — you    │
│   can do them as you go)     │
│  [ Start cooking ] [ Keep   ]│
│                    [ prepping]│
└─────────────────────────────┘
```
Beginner mode shows this nudge; **Pro mode** skips it entirely and lets prep/cook interleave freely.

---

## 10. Error, overrun & recovery states

The kitchen is messy; these states matter as much as the happy path (Doc 1 P3).

**Passive overrun** (forgot the simmer):
```
│  ⚠ Kuzhambu's been simmering │
│    4 min over. Move on?      │
│    [ It's done ] [ +5 min ]  │
```

**Falling behind:**
```
│  ⏱ Now serving 7:38 (+8)     │
│    You're a bit behind — the │
│    plan adjusted. Keep going.│
```

**Undo a completion** (tapped Done too early): long-press an Archive item → "Undo" → it returns to NOW, dependents re-lock (Doc 2 §8).

**Out-of-order completion:** allowed with a soft note ("you haven't chopped the beans yet — sure?"), never hard-blocked (P5).

---

## 11. Voice interaction design (hands-free MVP — Doc 1 §8)

Voice is the primary cooking-phase input. Designed for a noisy, steamy room.

### 11.1 Command grammar (small, robust)
| Intent | Phrases | Action |
|---|---|---|
| Complete current | "done", "next", "finished" | mark active task done |
| Status | "what's next", "how long" | speak NOW task + serve time |
| Repeat | "again", "say that" | re-read current task |
| Timer | "how much time on the rice" | speak passive countdown |
| Pause | "hold on", "pause" | stop listening until tapped |

### 11.2 Interaction rules
- **Wake word** ("DagChef") OR a one-tap mic toggle, so steam/TV noise doesn't trigger false completions. Wake word default in cooking phase.
- **Spoken confirmation** for completion: "Done — next up, fry the brinjals, medium-high." The cook never has to look.
- **Ambiguity → ask, don't guess** ("Two things are active — beans or brinjals?"). Safety over speed.
- **Graceful fallback:** if recognition fails twice, a big on-screen Done button is always present; voice never becomes the only path.
- **No network dependency** where possible (on-device speech) so it works offline (P4).

### 11.3 Explicitly cut: camera gesture (Doc 1 §8)
Steam, angles, lighting make it unreliable. Revisit only if voice proves insufficient in real testing.

---

## 12. Accessibility & kitchen-readability

- **Large type, high contrast** by default — the phone is across the counter, hands wet.
- **Screen stays awake** in Cook Mode.
- **Big touch targets** (Done button spans the card).
- **VoiceOver/TalkBack** parity — the ViewState maps cleanly to a screen-reader list.
- **One-handed reachable** primary action.

---

## 13. What design needs next (beyond this doc)
- Hi-fi visual design / brand.
- Interactive prototype of Cook Mode for usability testing (the riskiest screen).
- Real-device voice testing in an actual kitchen (steam, sizzle, extractor fan).
- Motion design for the Queue→NOW promotion (it should feel instant and obvious).

---

*End of Document 7. Next: Document 8 — Recipe Content & Licensing Strategy.*
