import { expandBlend, isBlend } from "@tutti/engine";

// Shared view-model for the "make at home" breakdown of a spice blend, used by every ingredient
// surface (recipe detail, cook, mise, shopping) so they render it identically.

export interface BlendConstituent { name: string; amount?: number; unit?: string }
export interface BlendInfo { yields: string; method: string; constituents: BlendConstituent[] }

export function blendView(name: string): BlendInfo | null {
  const b = expandBlend(name);
  return b ? { yields: b.yields, method: b.method, constituents: b.constituents } : null;
}

export { isBlend };
