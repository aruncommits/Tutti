import { HANDS, capacityOf, type RecipeGraph } from "@tutti/engine";
import { toKitchenProfile, type KitchenUi } from "./kitchenModel";

// Mise en place (Brief v20) — derive what to gather before cooking: the equipment the meal needs
// (union of node resources, minus hands) and, honestly, any tool the kitchen profile lacks.

const EQUIP_LABEL: Record<string, string> = {
  burner: "Stove burner",
  pan: "Pan",
  pressure_cooker: "Pressure cooker",
  cutting_board: "Cutting board",
  oven: "Oven",
  microwave: "Microwave",
  blender: "Blender/mixie",
};

export function labelFor(cat: string): string {
  return EQUIP_LABEL[cat] ?? cat;
}

/** Unique equipment categories the meal needs (hands excluded), sorted for stable display. */
export function requiredEquipment(recipes: RecipeGraph[]): string[] {
  const set = new Set<string>();
  for (const r of recipes) for (const n of r.nodes) for (const res of n.resources) {
    if (res.category !== HANDS) set.add(res.category);
  }
  return [...set].sort();
}

/** Required equipment the kitchen profile has zero capacity for — an honest "you might lack this". */
export function missingEquipment(recipes: RecipeGraph[], kitchen: KitchenUi): string[] {
  const profile = toKitchenProfile(kitchen);
  return requiredEquipment(recipes).filter((cat) => capacityOf(profile, cat) === 0);
}
