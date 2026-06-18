import type { KitchenProfile } from "@tutti/engine";

// Kitchen Profile model (Doc 7 §3) — split out from KitchenScreen so App can use it eagerly while
// the KitchenScreen component is lazy-loaded (Brief v10 code-splitting).

export interface KitchenUi {
  cooks: number;
  burners: number;
  cuttingBoards: number;
  pans: number;
  oven: boolean;
  pressureCooker: boolean;
  microwave: boolean;
  blender: boolean;
  counter: "small" | "medium" | "large";
}

export const DEFAULT_KITCHEN: KitchenUi = {
  cooks: 1,
  burners: 2,
  cuttingBoards: 1,
  pans: 2,
  oven: false,
  pressureCooker: true,
  microwave: true,
  blender: true,
  counter: "small",
};

/** Map the UI model to the engine's KitchenProfile (Doc 2 §2.3, Level 0). */
export function toKitchenProfile(k: KitchenUi): KitchenProfile {
  const resources = [
    { category: "burner", count: k.burners },
    { category: "cutting_board", count: k.cuttingBoards },
    { category: "pan", count: k.pans, capabilities: ["small", "large"] },
  ];
  if (k.oven) resources.push({ category: "oven", count: 1, capabilities: [] });
  if (k.pressureCooker) resources.push({ category: "pressure_cooker", count: 1, capabilities: [] });
  if (k.microwave) resources.push({ category: "microwave", count: 1, capabilities: [] });
  if (k.blender) resources.push({ category: "blender", count: 1, capabilities: [] });
  return { cooks: k.cooks, resources };
}
