// One source of dish color + short name across all screens (Doc 7 §8.1 — multi-dish identity).
// Golden thali dishes get fixed colors; ingested candidates get a stable hashed palette color.

// Spice tones, deepened so dish bars/dots stay legible on the warm cream background.
const BASE: Record<string, string> = {
  rec_rice: "#2f6fb0",     // indigo
  rec_kuzhambu: "#cf7a23", // turmeric-amber
  rec_poriyal: "#4f9a3a",  // curry-leaf green
};
const NAMES: Record<string, string> = {
  rec_rice: "Rice",
  rec_kuzhambu: "Kuzhambu",
  rec_poriyal: "Poriyal",
};
const PALETTE = ["#9a55b8", "#1f9e8e", "#c89a2b", "#4d6fc0", "#cf5577", "#5a9a3a"];

export function colorFor(recipeId: string): string {
  if (BASE[recipeId]) return BASE[recipeId]!;
  let h = 0;
  for (let i = 0; i < recipeId.length; i++) h = (h * 31 + recipeId.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

/** Short dish label: known thali dishes get a tidy name; candidates fall back to their id tail. */
export function dishName(recipeId: string): string {
  return NAMES[recipeId] ?? recipeId.replace(/^rec_/, "").replace(/_/g, " ");
}
