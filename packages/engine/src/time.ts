// Clock <-> minutes helpers. The engine schedules in integer minutes-from-t0; clock strings
// (HH:MM:SS) are only for anchoring to a wall-clock serve time and for display.

const DAY = 24 * 60;

/** "19:30" or "19:30:00" -> minutes since midnight. */
export function parseClock(clock: string): number {
  const parts = clock.split(":").map((p) => Number(p));
  const [h, m, s] = [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
  if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s)) {
    throw new Error(`parseClock: invalid clock "${clock}"`);
  }
  return h * 60 + m + Math.round(s / 60);
}

/** minutes (may be negative or > a day) -> "HH:MM:SS", wrapping within a 24h clock. */
export function formatClock(minutes: number): string {
  const total = ((Math.round(minutes) % DAY) + DAY) % DAY;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}
