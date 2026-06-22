// Parse a pasted restaurant menu into candidate dish names. Menus list short dish titles, usually
// with prices, section headers, and descriptions we want to drop. Heuristic + best-effort — the user
// reviews the result before anything is added/generated.

const BULLET = /^\s*(?:\d+[.)]|[-*•·▪])\s+/;
// dotted/space leaders running to a price: "Paneer Tikka .......... 280"
const LEADERS = /[.·…\-–—\s]{2,}\s*[₹$€£]?\s*\d[\d,.]*\s*$/;
// a trailing price token: "₹280", "$12.99", "12.50", "280/-"
const PRICE = /\s*[₹$€£]?\s*\d[\d,.]*\s*(?:\/-|rs\.?|inr|usd|aed)?\s*$/i;
// section / category headers (not dishes)
const SECTION = /^(?:starters?|appetiz\w*|mains?|main courses?|entr[ée]es?|sides?|desserts?|beverages?|drinks?|breads?|soups?|salads?|specials?|today'?s specials?|menu|veg(?:etarian)?|non[-\s]?veg|à la carte)\b[:\s]*$/i;

function clean(line: string): string {
  let s = line.replace(BULLET, "").trim();
  s = s.replace(LEADERS, "").trim();
  s = s.replace(PRICE, "").trim();
  // "Dish Name – a short description" → keep the name (drop an inline description after a spaced dash)
  s = s.split(/\s[–—-]\s+/)[0]!.trim();
  s = s.replace(/[\-–—:.,\s]+$/, "").trim(); // leftover trailing punctuation
  return s;
}

/** Turn pasted menu text into a deduped list of candidate dish names. */
export function parseMenu(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || SECTION.test(line)) continue;
    const dish = clean(line);
    if (dish.length < 2) continue;
    if (!/[a-zA-Z]/.test(dish)) continue; // price/number-only line
    if (dish.split(/\s+/).length > 8) continue; // long line → a description, not a title
    const key = dish.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(dish);
  }
  return out;
}
