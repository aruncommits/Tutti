// Hands-as-resource + resource capacity (Doc 2 §4.2). The single most important idea in the
// engine: the cook's hands are a resource like a burner. Once `active` tasks consume a hands
// unit and `passive` tasks don't, cross-dish interleaving becomes an automatic consequence of
// resource-constrained scheduling — no bespoke interleaving logic anywhere.

import type { KitchenProfile, ResourcePool, ResourceRequirement, TaskNode } from "./types";

export const HANDS = "hands";

/** Returns a kitchen with a synthetic `hands` pool whose count = cooks (Doc 2 §4.2). */
export function normalizeKitchen(kitchen: KitchenProfile): KitchenProfile {
  const withoutHands = kitchen.resources.filter((r) => r.category !== HANDS);
  const handsPool: ResourcePool = { category: HANDS, count: Math.max(1, kitchen.cooks) };
  return { ...kitchen, resources: [...withoutHands, handsPool] };
}

/**
 * A node's full resource requirements: its declared resources plus a hands unit when the node
 * is `active`. Passive nodes (simmer/bake/rest) hold equipment but free the hands.
 */
export function nodeRequirements(node: TaskNode): ResourceRequirement[] {
  const base = node.resources.filter((r) => r.category !== HANDS);
  if (node.attention === "active") return [...base, { category: HANDS, count: 1 }];
  return base;
}

/** Total available units of a category at Level 0 (count) or via typed instances (Level 2). */
export function capacityOf(kitchen: KitchenProfile, category: string): number {
  let total = 0;
  for (const pool of kitchen.resources) {
    if (pool.category !== category) continue;
    if (typeof pool.count === "number") total += pool.count;
    else if (pool.instances) total += pool.instances.length;
  }
  return total;
}
