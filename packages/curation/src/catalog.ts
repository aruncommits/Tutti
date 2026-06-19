import type { CatalogEntry } from "./types";
import { BIRYANI } from "./catalogs/biryani";
import { INDIAN } from "./catalogs/indian";
import { ITALIAN } from "./catalogs/italian";
import { MEDITERRANEAN } from "./catalogs/mediterranean";
import { MEXICAN } from "./catalogs/mexican";

// Seed catalog — the curated list of dishes to generate (each becomes a dish with simple/moderate/
// complex variants). Organized per cuisine under ./catalogs/. "Biryani" is a CATEGORY holding many
// dishes; the long tail scales by growing these lists (AI-proposed → human-approved). Names only —
// the AI writes the actual recipes at generate time.

export const SEED_CATALOG: CatalogEntry[] = [
  ...BIRYANI,
  ...INDIAN,
  ...ITALIAN,
  ...MEDITERRANEAN,
  ...MEXICAN,
];
