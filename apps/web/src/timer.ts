// Adjustable cook timers (Brief v24) — pure helper to add/extend time on a started passive
// countdown. Immutable; floors at 0; seeds from 0 when the task hasn't been ticking.

export function extendRemaining(
  remaining: Record<string, number>,
  id: string,
  addSec: number,
): Record<string, number> {
  return { ...remaining, [id]: Math.max(0, (remaining[id] ?? 0) + addSec) };
}
