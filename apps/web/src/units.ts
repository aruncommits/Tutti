// Metric units (Brief v29) — a pure DISPLAY-layer conversion. Recipe data + the engine are never
// touched; we only re-render amounts. Honest: volume → ml only (no per-ingredient density guessing
// for cup → grams); count units (whole, clove, sprig…) and already-metric values pass through.

function roundNice(n: number): number {
  return n >= 20 ? Math.round(n / 5) * 5 : Math.round(n);
}

const VOL: Record<string, number> = {
  cup: 240, cups: 240,
  tbsp: 15, tablespoon: 15, tablespoons: 15,
  tsp: 5, teaspoon: 5, teaspoons: 5,
};

export function convertAmount(
  amount: number | undefined,
  unit: string | undefined,
  metric: boolean,
): { amount?: number; unit?: string } {
  if (!metric || amount === undefined || !unit) return { amount, unit };
  const u = unit.toLowerCase().trim();
  if (VOL[u] !== undefined) return { amount: roundNice(amount * VOL[u]!), unit: "ml" };
  if (u === "oz" || u === "ounce" || u === "ounces") return { amount: roundNice(amount * 28), unit: "g" };
  return { amount, unit };
}

export function displayAmount(
  amount: number | undefined,
  unit: string | undefined,
  toTaste: boolean | undefined,
  metric: boolean,
): string {
  const c = convertAmount(amount, unit, metric);
  return c.amount !== undefined ? `${c.amount}${c.unit ? ` ${c.unit}` : ""}` : toTaste ? "to taste" : "";
}
