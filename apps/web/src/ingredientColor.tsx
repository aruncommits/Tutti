import type { ReactNode } from "react";
import { lookupIngredient, ALL_INGREDIENTS } from "@tutti/engine";

// Color-code ingredients by TYPE so a method/ingredient list is scannable. Classification reuses the
// engine's per-ingredient reference (aisle + diet flags), with name-based overrides for cases the
// aisle gets wrong (ghee/butter sit in the Dairy aisle but are fats; the Baking aisle mixes flours,
// sweeteners and leaveners). Palette tuned for the dark theme.

export type Kind = "fresh" | "spice" | "fat" | "dairy" | "protein" | "grain" | "legume" | "nut" | "sweet" | "other";

export const KIND_COLOR: Record<Kind, string> = {
  fresh: "#58a653", // green
  spice: "#e06a5a", // red
  fat: "#d2a232", // amber / dark-yellow (oils, ghee, water)
  dairy: "#5a93d8", // blue
  protein: "#cf5f86", // magenta
  grain: "#c39a5e", // wheat
  legume: "#9aa53f", // olive
  nut: "#a8754e", // brown
  sweet: "#a982d4", // purple
  other: "#9a9a9a", // gray
};

export const KIND_LABEL: Record<Kind, string> = {
  fresh: "Fresh", spice: "Spice", fat: "Oil / liquid", dairy: "Dairy", protein: "Protein",
  grain: "Grain", legume: "Legume", nut: "Nut / seed", sweet: "Sweet", other: "Other",
};

const FAT = /\b(oil|ghee|butter|vinegar|stock|broth|water|ice)\b/i;
const SWEET = /\b(sugar|jaggery|honey|syrup|molasses)\b/i;
const FLOUR = /\b(flour|atta|maida|besan|semolina|rava|sooji|poha|cornflour|cornstarch)\b/i;
const LEAVEN = /\b(baking soda|baking powder|bicarbonate|yeast|eno)\b/i;
const PROTEIN_FLAGS = new Set(["meat", "fish", "shellfish", "egg"]);

/** Classify an ingredient name into a color kind. */
export function ingredientKind(name: string): Kind {
  const n = name.toLowerCase();
  if (FAT.test(n)) return "fat"; // catches ghee/butter (Dairy aisle) + oils + water
  if (SWEET.test(n)) return "sweet";
  if (LEAVEN.test(n)) return "other";
  if (FLOUR.test(n)) return "grain";
  if (/\btofu\b/.test(n)) return "protein";

  const info = lookupIngredient(name);
  if (info) {
    if (info.flags.some((f) => PROTEIN_FLAGS.has(f))) return info.flags.includes("dairy") ? "dairy" : "protein";
    if (info.flags.includes("dairy")) return "dairy";
    switch (info.aisle) {
      case "Produce": return "fresh";
      case "Spices": return "spice";
      case "Grains & rice":
      case "Pasta & noodles":
      case "Bakery": return "grain";
      case "Lentils & beans": return "legume";
      case "Nuts & seeds": return "nut";
      case "Oils & vinegars": return "fat";
      case "Meat & seafood": return "protein";
      case "Dairy": return "dairy";
    }
  }
  // Name-based fallback for items the reference misses (spelling variants like "chilli", compounds).
  if (/\b(powder|masala)\b/.test(n)) return "spice";
  if (/sauce|paste|puree|ketchup|chutney/.test(n)) return "other";
  if (/chil|tomato|onion|garlic|ginger|spinach|carrot|potato|\bpeas?\b|cabbage|cauliflower|cucumber|\bmint\b|cilantro|coriander|curry lea|lemon|lime|capsicum|bell pepper|brinjal|eggplant|mango|banana|\bherb/.test(n)) return "fresh";
  if (/paprika|cayenne|peppercorn|cumin|turmeric|cinnamon|clove|cardamom|fennel|fenugreek|mustard|bay lea|star anise|nutmeg|\bmace\b|asafoet|saffron|\bspice/.test(n)) return "spice";
  return "other";
}

export const kindColorOf = (name: string): string => KIND_COLOR[ingredientKind(name)];

// One regex over all known ingredient names (+ a few generic words), longest-first so multi-word
// names ("red chili powder") win over their parts ("chili"). Built once.
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const TERMS = [...Object.keys(ALL_INGREDIENTS), "oil", "spices"]
  .sort((a, b) => b.length - a.length)
  .map(escape);
// Allow a trailing plural ("onion"→"onions", "tomato"→"tomatoes") so step text matches singular keys.
const ING_RE = new RegExp(`\\b(${TERMS.join("|")})(?:es|s)?\\b`, "gi");

/** Render text with any known ingredient name wrapped in a kind-colored span. */
export function highlightIngredients(text: string): ReactNode {
  const out: ReactNode[] = [];
  let last = 0;
  let key = 0;
  ING_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ING_RE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const word = m[0];
    out.push(
      <span key={key++} className="ing-hl" style={{ color: kindColorOf(word) }}>{word}</span>,
    );
    last = m.index + word.length;
    if (ING_RE.lastIndex === m.index) ING_RE.lastIndex++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}
