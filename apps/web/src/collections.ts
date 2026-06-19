// User recipe collections / cookbooks (Brief v47). Pure, immutable helpers over a list of named
// groups of recipeIds. Local-only, like everything else.

export interface Collection {
  id: string;
  name: string;
  recipeIds: string[];
}

export function addCollection(list: Collection[], name: string, id: string): Collection[] {
  const n = name.trim();
  if (!n) return list;
  return [...list, { id, name: n, recipeIds: [] }];
}

export function renameCollection(list: Collection[], id: string, name: string): Collection[] {
  const n = name.trim();
  return n ? list.map((c) => (c.id === id ? { ...c, name: n } : c)) : list;
}

export function removeCollection(list: Collection[], id: string): Collection[] {
  return list.filter((c) => c.id !== id);
}

/** Add or remove a recipe from a collection (toggle). */
export function toggleInCollection(list: Collection[], id: string, recipeId: string): Collection[] {
  return list.map((c) => {
    if (c.id !== id) return c;
    const has = c.recipeIds.includes(recipeId);
    return { ...c, recipeIds: has ? c.recipeIds.filter((r) => r !== recipeId) : [...c.recipeIds, recipeId] };
  });
}

/** The collections a recipe belongs to. */
export function collectionsOf(list: Collection[], recipeId: string): Collection[] {
  return list.filter((c) => c.recipeIds.includes(recipeId));
}

export function isValidCollections(v: unknown): v is Collection[] {
  return Array.isArray(v) && v.every((c) => c && typeof c === "object" && typeof (c as Collection).id === "string" && Array.isArray((c as Collection).recipeIds));
}
