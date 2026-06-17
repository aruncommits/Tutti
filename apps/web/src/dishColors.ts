// One source of dish color + short name across all screens (Doc 7 §8.1 — multi-dish identity).
// Golden thali dishes get fixed colors; ingested candidates get a stable hashed palette color.

const BASE: Record<string, string> = {
  rec_rice: "#5aa6ff",
  rec_kuzhambu: "#ff8a5b",
  rec_poriyal: "#86cf4d",
};
const NAMES: Record<string, string> = {
  rec_rice: "Rice",
  rec_kuzhambu: "Kuzhambu",
  rec_poriyal: "Poriyal",
};
const PALETTE = ["#c98bdb", "#4dd0c0", "#e6c34d", "#7b9cff", "#ef6b8c", "#9ccc65"];

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
