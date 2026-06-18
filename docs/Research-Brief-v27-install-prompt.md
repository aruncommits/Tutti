# Research Brief v27 — Install Tutti (Add to Home Screen)

*Status: active · continuous-enhancement · completes the offline-first PWA story (Brief v7) · authored by the loop*

## Rationale — why this, now

Tutti has been an installable, offline-first PWA since Brief v7 — but it never *invites* the user to
install it. That matters: an **installed** PWA is the one that actually delivers the kitchen promise —
full-screen, on the home screen, reliably offline, no browser chrome, wake-lock honored. Browsers
fire a `beforeinstallprompt` event when the app is installable, and best practice is to **capture it
and offer your own clear "Install" button** at a moment of engagement rather than leaving the user to
discover a buried browser menu. A subtle "Install Tutti" affordance on Home (shown only when the
browser says it's installable, hidden once installed) converts the latent PWA capability into real
home-screen usage — the natural capstone to the offline work. Pure client, feature-detected, no deps.

### Research findings folded in (web pass, June 2026)

- **Capture `beforeinstallprompt`**: `preventDefault()` and stash the event; show a custom install
  button only while it's available; on click call `prompt()`. Hide on `appinstalled`.
- **Show it contextually + respectfully** — at a point of engagement (Home), only to users who can
  install, dismissible; don't nag. iOS Safari has no event (manual Share→Add to Home Screen), so the
  button simply won't appear there — that's acceptable; don't fake it.
- It's an enhancement, never a blocker: everything works uninstalled.

## Definition of done

When the browser reports Tutti is installable, Home shows a subtle "Install Tutti" button that opens
the native install prompt; it disappears once installed (or dismissed); where the event isn't
supported (jsdom, iOS) nothing shows and nothing breaks; the hook is feature-detected + tested;
gate green (incl. pwa-check/perf).

## Items — small, ordered, independently testable (GATE_EXIT=0 before each commit)

1. **`useInstallPrompt` hook (web).** `apps/web/src/useInstallPrompt.ts`: on mount, add a
   `beforeinstallprompt` listener that `preventDefault()`s and stores the event in state; add an
   `appinstalled` listener that clears it. Return `{ canInstall: boolean, promptInstall: () => Promise<void> }`
   where `promptInstall` calls `evt.prompt()` then clears (so the button hides). SSR/jsdom-safe
   (`typeof window` guard; no event → `canInstall` false; `promptInstall` is a no-op). Keep a minimal
   local type for the event (`prompt()` + `userChoice`).
2. **"Install Tutti" on Home (web).** In App's Home, when `canInstall`, render a subtle button
   ("📲 Install Tutti") in the home-links/footer area that calls `promptInstall`. Hidden otherwise.
   Pass `canInstall`/`onInstall` from App (which uses the hook).
3. **Honest + non-blocking.** Only render when installable; once installed/dismissed it's gone; never
   intercept or block any flow. No copy claiming it's required.
4. **(Optional) a tiny "works offline" reassurance** next to the button — keep minimal/skip if it
   adds noise.
5. **Tests.** `useInstallPrompt.test`: under jsdom `canInstall` is false and `promptInstall` doesn't
   throw; dispatching a fake `beforeinstallprompt` event (with a `preventDefault` + `prompt` stub)
   flips `canInstall` true and `promptInstall()` calls the stub's `prompt`. (Use renderHook.)

## Enforce-what-you-build
- the hook is feature-detected: no event ⇒ `canInstall` false, `promptInstall` safe no-op (tested).
- a simulated `beforeinstallprompt` flips `canInstall` and wiring calls `prompt()` (tested).

## When substantially done
Run a web-research pass on the next gap (photos, units toggle, onboarding, or another competitor
feature) and **author `docs/Research-Brief-v28-*.md`** inline. The loop never ends.

## Sources (research pass)
- https://web.dev/articles/customize-install
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- https://love2dev.com/blog/beforeinstallprompt/
