// Adaptive pace model (Doc 2 §7) — arithmetic over the user's own history, never an LLM (P1).
// Learns a per-category speed multiplier and applies it ONLY to elastic tasks (chopping scales
// with the cook; a 15-min simmer is 15 min for everyone). Fully explainable, converges in a few
// sessions. Cold start = 1.0 with conservative rounding so the serve promise stays safe (P7).

import type { PaceModel } from "./compile";
import type { TaskNode } from "./types";

const KEYWORDS: Array<[string, string]> = [
  ["chop", "chop"], ["slit", "chop"], ["dice", "chop"], ["mince", "chop"], ["cut", "chop"],
  ["peel", "peel"], ["grate", "grate"], ["knead", "knead"], ["grind", "grind"], ["blend", "grind"],
  ["temper", "temper"], ["fry", "fry"], ["saut", "saute"], ["stir", "saute"], ["roast", "roast"],
  ["simmer", "simmer"], ["boil", "boil"], ["soak", "soak"], ["rinse", "rinse"], ["rest", "rest"],
];

/** The pace-learning category for a node: explicit field, else a title keyword, else its phase. */
export function paceCategoryOf(node: TaskNode): string {
  if (node.paceCategory) return node.paceCategory;
  const t = node.title.toLowerCase();
  for (const [kw, cat] of KEYWORDS) if (t.includes(kw)) return cat;
  return node.phase;
}

export interface PaceSample {
  category: string;
  actualMins: number;
  estMins: number;
}

/** EMA update of one category's multiplier (Doc 2 §7). alpha weights the newest observation. */
export function updatePace(model: PaceModel, sample: PaceSample, alpha = 0.3): PaceModel {
  if (sample.estMins <= 0) return model;
  const prev = model[sample.category] ?? 1.0;
  const ratio = sample.actualMins / sample.estMins;
  return { ...model, [sample.category]: alpha * ratio + (1 - alpha) * prev };
}

/** Scale an elastic node's estimate by the user's multiplier; fixed-physics nodes are untouched. */
export function applyPace(node: TaskNode, model: PaceModel): TaskNode {
  if (!node.duration.elastic) return node;
  const mult = model[paceCategoryOf(node)] ?? 1.0;
  if (mult === 1.0) return node;
  const estMins = Math.max(1, Math.round(node.duration.estMins * mult));
  return {
    ...node,
    duration: {
      ...node.duration,
      estMins,
      maxMins: Math.max(node.duration.maxMins, estMins),
      minMins: Math.min(node.duration.minMins, estMins),
    },
  };
}
