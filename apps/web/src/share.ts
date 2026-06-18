import { formatClock, parseClock, type MasterExecutionPlan } from "@tutti/engine";

// Share / export (Brief v16) — get the shopping list and plan out of the app via the native share
// sheet, with a clipboard fallback. Pure formatters + a feature-detected shareOrCopy. No deps.

const hhmm = (clock: string) => formatClock(parseClock(clock)).slice(0, 5);

export interface ShareItem {
  name: string;
  amount?: number;
  unit?: string;
  toTaste?: boolean;
}

export function formatShoppingList(items: ShareItem[]): string {
  const lines = items.map((i) => {
    const qty = i.toTaste || i.amount === undefined ? "to taste" : `${i.amount}${i.unit ? ` ${i.unit}` : ""}`;
    return `• ${qty} ${i.name}`.replace(/\s+/g, " ").trim();
  });
  return ["Tutti — shopping list", ...lines].join("\n");
}

export function formatPlan(plan: MasterExecutionPlan, dishNames: string[]): string {
  return `Tutti plan — serving at ${hhmm(plan.projectedServeTime)}, start ${hhmm(plan.startTime)}: ${dishNames.join(", ")}`;
}

export type ShareResult = "shared" | "copied" | "failed";

/** Native share where available (a user cancel counts as success), else clipboard, else fail. */
export async function shareOrCopy(title: string, text: string): Promise<ShareResult> {
  const nav = typeof navigator !== "undefined" ? navigator : undefined;
  if (nav && typeof nav.share === "function") {
    try {
      await nav.share({ title, text });
      return "shared";
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return "shared"; // user dismissed — fine
      // otherwise fall through to clipboard
    }
  }
  if (nav?.clipboard && typeof nav.clipboard.writeText === "function") {
    try {
      await nav.clipboard.writeText(text);
      return "copied";
    } catch {
      /* clipboard blocked */
    }
  }
  return "failed";
}
