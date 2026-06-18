// Local timer notifications (Brief v15) — fire when a passive task is ready so the cook can walk
// away (Doc 7 §12). Native Notifications API only (no Push server, works offline via the PWA's SW).
// Fully feature-detected so the gate (jsdom, no Notification) never throws, and graceful when
// unsupported/denied — the on-screen "⏲ ready!" label is always the fallback.

export function notifySupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export async function requestNotifyPermission(): Promise<boolean> {
  if (!notifySupported()) return false;
  try {
    const p = await Notification.requestPermission();
    return p === "granted";
  } catch {
    return false;
  }
}

export function notifyReady(title: string, body?: string): void {
  if (!notifySupported() || Notification.permission !== "granted") return;
  try {
    const sw = navigator.serviceWorker?.ready;
    if (sw) {
      sw.then((reg) => reg.showNotification(title, { body, tag: title })).catch(() => {
        new Notification(title, { body });
      });
    } else {
      new Notification(title, { body });
    }
  } catch {
    /* notifications unavailable — the on-screen label already covers this */
  }
}
