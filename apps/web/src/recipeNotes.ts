// Recipe notes, ratings & cook-count (Brief v17). Pure, immutable, deterministic — App supplies
// timestamps. Persisted locally (tutti.recipeNotes); turns Tutti's library into your own cookbook.

export interface RecipeNote {
  rating?: number; // 1..5
  note?: string;
  cookCount: number;
  lastCookedAt?: number;
}

export type NotesMap = Record<string, RecipeNote>;

const cur = (m: NotesMap, id: string): RecipeNote => m[id] ?? { cookCount: 0 };

/** Drop an entry that carries no information (keeps the map tidy). */
function prune(m: NotesMap, id: string, entry: RecipeNote): NotesMap {
  const empty = entry.rating === undefined && entry.note === undefined && entry.cookCount === 0 && entry.lastCookedAt === undefined;
  if (empty) {
    const next = { ...m };
    delete next[id];
    return next;
  }
  return { ...m, [id]: entry };
}

export function setRating(m: NotesMap, id: string, rating: number | undefined): NotesMap {
  const r = rating && rating > 0 ? Math.max(1, Math.min(5, Math.round(rating))) : undefined;
  return prune(m, id, { ...cur(m, id), rating: r });
}

export function setNote(m: NotesMap, id: string, note: string): NotesMap {
  const trimmed = note.trim();
  return prune(m, id, { ...cur(m, id), note: trimmed ? trimmed : undefined });
}

export function recordCook(m: NotesMap, id: string, at: number): NotesMap {
  const e = cur(m, id);
  return { ...m, [id]: { ...e, cookCount: e.cookCount + 1, lastCookedAt: at } };
}

/** Clear the human edits (rating + note) but keep the cook history. */
export function clearNote(m: NotesMap, id: string): NotesMap {
  const e = cur(m, id);
  return prune(m, id, { ...e, rating: undefined, note: undefined });
}
