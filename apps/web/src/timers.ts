// Named, parallel cook timers (Brief v44). Stored by absolute end-time so they keep counting across
// a reload/resume and fire at the right moment. Pure & immutable; the caller supplies now/ids.

export interface Timer {
  id: string;
  label: string;
  /** epoch ms when it finishes. */
  endsAt: number;
  /** original length in seconds (for display + extend). */
  totalSec: number;
}

export function createTimer(label: string, minutes: number, now: number, id: string): Timer {
  const totalSec = Math.max(1, Math.round(minutes * 60));
  return { id, label: label.trim() || `${minutes} min`, endsAt: now + totalSec * 1000, totalSec };
}

/** Whole seconds left, floored at 0. */
export function remainingSec(t: Timer, now: number): number {
  return Math.max(0, Math.round((t.endsAt - now) / 1000));
}

export function isRinging(t: Timer, now: number): boolean {
  return remainingSec(t, now) === 0;
}

export function addTimer(list: Timer[], t: Timer): Timer[] {
  return [...list, t];
}

export function removeTimer(list: Timer[], id: string): Timer[] {
  return list.filter((t) => t.id !== id);
}

/** Add seconds to a timer's end-time (e.g. +1 min when it's about to overcook). */
export function extendTimer(list: Timer[], id: string, addSec: number, now: number): Timer[] {
  return list.map((t) => {
    if (t.id !== id) return t;
    const base = Math.max(t.endsAt, now); // extend from now if already finished
    return { ...t, endsAt: base + addSec * 1000, totalSec: t.totalSec + addSec };
  });
}

/** Sort soonest-first for display. */
export function sortTimers(list: Timer[]): Timer[] {
  return [...list].sort((a, b) => a.endsAt - b.endsAt);
}
