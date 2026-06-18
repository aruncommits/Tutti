# Research Brief v15 — Passive-Timer Alerts (don't burn the rice)

*Status: active · continuous-enhancement · Doc 7 §12 (cook isn't chained to the screen) + Doc 1 P4 · authored by the loop*

## Rationale — why this, now

Tutti's whole model is built on **passive tasks** — the simmer, the rice in the cooker, the bake —
that free the cook's hands so other dishes can interleave. The cook *should* walk away during those
windows; that's the point. But today, when a started passive timer finishes, the only signal is a
"⏲ ready!" label on a screen the cook isn't looking at. That's the one moment Tutti can save a
burnt dish, and it's silent. A **local notification when a passive timer hits zero** ("Rice is
ready") closes the loop — it lets the cook genuinely leave the kitchen, which is exactly the freedom
the engine promises (Doc 7 §12: the cook isn't chained to the screen). Tutti is already an installed
PWA with a service worker, so this needs no backend — just the Notifications API, opt-in, with the
existing on-screen label as the always-present fallback.

### Research findings folded in (web pass, June 2026)

- **Local notifications need no Push server.** The Push API (FCM/APNS) is for *server-sent* content;
  a timer that fires client-side just uses the **Notifications API** (`new Notification(...)` or
  `registration.showNotification(...)`). No backend, works offline.
- **Permission must be requested after a user gesture** (and on iOS only post-interaction). So
  request it the first time the cook taps **"Start — it cooks itself"** on a passive task — a
  natural, intentful moment — not on load.
- Be sparing and relevant (notification fatigue is real): only fire for *this cook's* started
  passive timers, one per task, with the dish/task name. Never block cooking on it.

## Definition of done

When a started passive timer reaches zero and the cook has granted permission, a local notification
("<task> is ready") fires — even if the tab is backgrounded; permission is requested on the first
"Start — it cooks itself" tap; everything degrades gracefully (unsupported/denied → the existing
"⏲ ready!" label remains, unchanged); gate green (incl. perf/pwa/a11y), no new deps.

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **`notify.ts` helper (web, pure-ish, feature-detected).** `notifySupported()` (`"Notification" in
   window`), `requestNotifyPermission(): Promise<boolean>` (no-op→false when unsupported; calls
   `Notification.requestPermission()` once; safe under jsdom/SSR), and `notifyReady(title, body?)`
   that shows a notification only when `Notification.permission === "granted"` (try/catch; prefer the
   SW registration's `showNotification` when available, else `new Notification`). All guarded so the
   gate (no Notification in jsdom) never throws.
2. **Request on intent (CookScreen).** When the cook taps "Start — it cooks itself" on a passive
   task, call `requestNotifyPermission()` (fire-and-forget) — the gesture that means "I'm about to
   walk away."
3. **Fire on completion (CookScreen).** In the per-second countdown effect, when a task's remaining
   crosses to 0, call `notifyReady(`${dishName} — ${task} is ready`)` exactly once for that task
   (guard against re-firing each tick). The on-screen "⏲ ready!" label stays as the fallback.
4. **Graceful + honest.** No nagging: only started passive tasks notify; denied/unsupported changes
   nothing. Optionally a tiny one-line hint ("we'll ping you when it's ready") when permission is
   granted — keep minimal.
5. **Tests.** `notify.test.ts`: under jsdom (no `Notification`), `notifySupported()` is false and
   `requestNotifyPermission()`/`notifyReady()` are safe no-ops (don't throw). With a mocked
   `window.Notification` (granted), `notifyReady` constructs one. Keep the cook gate green.

## Enforce-what-you-build
- notify.ts is fully feature-detected: unsupported/denied paths are no-ops (unit-tested), so the
  gate never needs a Notification implementation.
- the on-screen "ready" label remains the fallback (don't remove it).

## When substantially done
Run a web-research pass on the next gap (share/export a plan or shopping list, nutrition/cost, or
another competitor feature) and **author `docs/Research-Brief-v16-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://whatpwacando.today/notifications/
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Tutorials/js13kGames/Re-engageable_Notifications_Push
- https://medium.com/@trek007/build-a-kitchen-timer-pwa-learning-progressive-web-apps-through-a-practical-project-8d5b198d6f68
