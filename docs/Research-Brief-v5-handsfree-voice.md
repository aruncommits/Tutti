# Research Brief v5 — Hands-Free Voice + Adaptive Pace (Phase 4)

*Status: active · Doc 3 Phase 4 · Doc 7 §11 (voice) · Doc 2 §7 + Doc 1 §6.4 (pace) · authored by the loop*

## Rationale — why this, now

Tutti is now a complete, deterministic, multi-dish cooking app: ingest any recipe, scale it, see a
shopping list and allergen warnings, and cook an interleaved plan with a polished three-tier view.
But the **"sticky hands" problem** (Doc 1 §8) is unsolved: mid-cook your hands are covered in food,
and tapping a screen fails. Doc 1 calls **voice the MVP bet** for the cooking phase, and Doc 3
Phase 4 pairs it with the **adaptive pace model** (already built in the engine, Doc 2 §7) that
makes the serve-time promise truer per user. This brief delivers both — the last roadmap phase —
turning Tutti from "usable at the counter" into "usable with your hands in the pan."

It also keeps the boundary intact: speech recognition is a **browser/device capability at the UI
edge**, not an LLM on the cooking path (Doc 1 P2). The engine stays pure; voice just emits the same
`applyEvent`/status calls a tap would.

### Research findings folded in (web pass, June 2026)

- **Web Speech `SpeechRecognition` is viable in Chromium but needs hardening.** Known footguns:
  Chrome **silently stops ~60 s** — wire an **auto-restart in `onend`**; a **`no-speech`** error
  fires after a pause — catch and restart; background noise/cross-talk hurts accuracy, so keep the
  **grammar tiny and distinctive** and confirm actions aloud.
- **Avoid false triggers** with a **tap-to-talk toggle** (default) or a wake word; never let voice
  be the only path — a big on-screen Done must always work (Doc 7 §11.2 graceful fallback).
- **Feature-detect and degrade**: Safari/Firefox support is partial; if `SpeechRecognition` is
  absent, hide voice and keep the app fully tap-driven (P4 — never blocked by the tool).
- **Pace personalization should be explainable** (Doc 2 §7): show *why* an estimate was padded
  ("you tend to take ~25% longer on prep"), never a black box.

## Definition of done (phase metric, Doc 3 §6)

In Cook Mode a user can advance the active task by **voice** ("done"/"next") and ask **status**
("what's next", "how long"), with spoken confirmation and a guaranteed on-screen fallback; and the
**adaptive pace model** visibly influences and explains future estimates. Verified in-browser
(recognition can be stubbed for the gate; the wiring + fallback are what's tested).

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **Voice command parser (pure, engine-side or web util).** `parseVoiceCommand(transcript)` →
   `{ type: "complete" | "next" | "status" | "howLong" | "repeat" | "pause" | "unknown" }` from a
   small phrase grammar (Doc 7 §11.1: done/next/finished → complete; what's next → status; how long
   → howLong; again/repeat → repeat; hold on/pause → pause). Pure + unit-tested. (Put in
   `@tutti/engine` or `apps/web/src/voice.ts` — keep it pure and testable either way.)
2. **`useSpeech` hook (web).** Wraps `webkitSpeechRecognition || SpeechRecognition`: feature-detect
   (`supported` flag), start/stop, **auto-restart in `onend`** while listening, swallow `no-speech`,
   surface the latest transcript. No-ops gracefully when unsupported. Guarded so SSR/jsdom is safe.
3. **Wire voice into Cook Mode.** A mic toggle (tap-to-talk default) in the Cook header; on a
   recognized `complete`/`next`, call the existing `onComplete` for the current NOW task; `status`/
   `howLong` speak the NOW task + projected serve time via `speechSynthesis`; **spoken confirmation**
   ("Done — next up, fry the brinjals"). The big Done button always remains (fallback). Show a live
   "listening / heard: …" indicator. Hide the mic entirely when unsupported.
3a. **Voice a11y + safety.** Ambiguity → ask, don't guess (if two tasks are active, prompt which);
    never advance on a low-confidence match; `aria-live` for the listening state.
4. **Surface the adaptive pace model.** Persist a per-user `PaceModel` (localStorage); on each
   completion record actual vs planned and `updatePace`; pass the model into `compile()` so elastic
   estimates adjust. Add a small, explainable line ("Padding prep ~20% — you run a little slow")
   somewhere unobtrusive (cook header or a settings line). Engine already supports this (Doc 2 §7);
   this is wiring + a tiny UI.
5. **Tests.** Unit-test `parseVoiceCommand` thoroughly (incl. "unknown"); a web test that the Cook
   header renders a mic control when speech is supported (mock `SpeechRecognition`) and that a
   parsed "done" calls onComplete; ensure the gate never requires real speech.

## Enforce-what-you-build (gate additions)
- `parseVoiceCommand` grammar covered by unit tests (every intent + a few negatives).
- a web test asserting the on-screen Done remains present even with voice enabled (fallback invariant).

## When substantially done
Phase 4 completes the original Doc 3 roadmap (Phases 0–4 + Track C). Run a web-research pass on the
**learning-loop / telemetry** theme (Doc 10: planned-vs-actual capture, curation signals) and
**author `docs/Research-Brief-v6-learning-loop.md`** inline — event capture + the per-user pace
convergence dashboard, then continuous enhancement cycles (competitor parity, polish, performance).
Lead with rationale. The loop never ends.

## Sources (research pass)
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API
- https://frontendmasters.com/courses/device-web-apis/speech-recognition-api/
- https://www.testmuai.com/learning-hub/speech-recognition-api-browser-support/
- https://www.dhiwise.com/post/web-speech-api-voice-driven-web-app-accessibility
