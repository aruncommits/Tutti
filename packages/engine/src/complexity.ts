// Derive how involved a recipe is to cook — a pure score over the existing graph, no schema field
// needed. Complexity is Tutti's coordination lever: it predicts the hands-on load and juggling a
// dish adds to a meal, which is what makes a multi-dish plan feasible (or not) for the cook.

import type { ComplexityTier, RecipeGraph, TaskNode } from "./types";
import { criticalPathMethod } from "./schedule";

export interface Complexity {
  tier: ComplexityTier;
  score: number;
  /** the inputs, exposed for tests / UI explanations. */
  activeMins: number;
  nodeCount: number;
  makespanMins: number;
}

const isActive = (n: TaskNode) => n.attention === "active";
const sumMins = (nodes: TaskNode[]) => nodes.reduce((s, n) => s + n.duration.estMins, 0);

// Thresholds calibrated against the golden 15 (see complexity.test.ts): hands-on minutes dominate
// the cost (you can only do one active task at a time), node count adds juggling load, and a high
// passive/active ratio *lowers* perceived complexity because hands are free while it cooks.
const SIMPLE_MAX = 15;
const MODERATE_MAX = 40;

/** Pure complexity score + tier for a single recipe. */
export function complexityOf(recipe: RecipeGraph): Complexity {
  const nodes = recipe.nodes;
  const activeMins = sumMins(nodes.filter(isActive));
  const passiveMins = sumMins(nodes.filter((n) => !isActive(n)));
  const nodeCount = nodes.length;
  const makespanMins = criticalPathMethod(nodes).makespanMins;
  const passiveActiveRatio = passiveMins / Math.max(activeMins, 1);

  const score = 0.5 * activeMins + 3 * nodeCount - 4 * Math.min(passiveActiveRatio, 3);
  const tier: ComplexityTier = score < SIMPLE_MAX ? "simple" : score < MODERATE_MAX ? "moderate" : "complex";
  return { tier, score: Math.round(score * 10) / 10, activeMins, nodeCount, makespanMins };
}
