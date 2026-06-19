// Map an ingredient to a grocery-store aisle, and provide a canonical shopping order so a list can
// be grouped the way you actually walk a store. Pure & offline.

import { lookupIngredient } from "./ingredients";

/** Canonical aisle order (roughly perimeter-first, then center aisles). */
export const AISLES = [
  "Produce",
  "Meat & seafood",
  "Dairy",
  "Refrigerated",
  "Bakery",
  "Grains & rice",
  "Pasta & noodles",
  "Lentils & beans",
  "Canned goods",
  "Baking",
  "Spices",
  "Oils & vinegars",
  "Condiments",
  "Nuts & seeds",
  "Frozen",
  "Beverages",
  "Other",
] as const;
export type Aisle = (typeof AISLES)[number];

const ORDER = new Map(AISLES.map((a, i) => [a, i]));

/** The store aisle for an ingredient name (Other when unknown). */
export function aisleOf(name: string): Aisle {
  const a = lookupIngredient(name)?.aisle;
  return (a && (ORDER.has(a as Aisle) ? (a as Aisle) : "Other")) || "Other";
}

/** Sort key for an aisle (for grouping a shopping list in walk order). */
export function aisleOrder(aisle: string): number {
  return ORDER.get(aisle as Aisle) ?? ORDER.get("Other")!;
}
