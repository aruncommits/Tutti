import { useEffect, useState } from "react";

// Keep the screen awake while cooking. The Screen Wake Lock API releases the lock whenever the page
// is hidden (tab switch, screen dim), so a one-shot request silently dies — we MUST re-acquire on
// every `visibilitychange`/`focus`. Degrades to a no-op (active:false) where unsupported.

interface WakeLockSentinelLike { released: boolean; release: () => Promise<void> }
interface WakeLockNavigator { wakeLock?: { request: (t: "screen") => Promise<WakeLockSentinelLike> } }

export function useWakeLock(enabled: boolean): { active: boolean; supported: boolean } {
  const supported = typeof navigator !== "undefined" && "wakeLock" in navigator;
  const [active, setActive] = useState(false);

  useEffect(() => {
    if (!enabled || !supported) { setActive(false); return; }
    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        sentinel = await (navigator as unknown as WakeLockNavigator).wakeLock!.request("screen");
        if (cancelled) { void sentinel.release(); sentinel = null; return; }
        setActive(true);
        sentinel.release = sentinel.release; // keep ref
      } catch {
        setActive(false); // denied / unsupported / low battery
      }
    };

    // Re-acquire when the page becomes visible again (the lock is auto-released when hidden).
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquire();
      else setActive(false);
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
      try { void sentinel?.release(); } catch { /* ignore */ }
      setActive(false);
    };
  }, [enabled, supported]);

  return { active, supported };
}
