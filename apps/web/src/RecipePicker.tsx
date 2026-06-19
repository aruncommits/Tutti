import { useMemo, useState } from "react";
import { dishIdOf, groupVariants, type RecipeGraph } from "@tutti/engine";
import {
  toLibraryEntries,
  filterLibrary,
  sortLibrary,
  groupByCuisine,
  pickHistory,
  type LibraryEntry,
  type SortKey,
} from "./libraryView";
import { colorFor } from "./dishColors";
import { Stars } from "./Stars";
import type { NotesMap } from "./recipeNotes";

// Shared recipe-discovery surface: search, recents/frequent/your-recipes (expandable), and
// cuisine → dish accordions. Each dish shows ONE card (its verified default variant); picking a
// simpler/complex tier happens later on the plan row. Used inline on the Plan builder and Browse.

const PEEK = 4; // recipes shown in a section before "Show all"

interface RowCtx {
  notes: NotesMap;
  photos: Record<string, string>;
  selectedDishes: Set<string>;          // dishIds already in the plan (any tier)
  variantCount: (dishId: string) => number;
  onPick: (r: RecipeGraph) => void;
  onDetails?: (r: RecipeGraph) => void;
}

function Row({ e, ctx }: { e: LibraryEntry; ctx: RowCtx }) {
  const note = ctx.notes[e.recipe.recipeId];
  const dish = dishIdOf(e.recipe);
  const selected = ctx.selectedDishes.has(dish);
  const ways = ctx.variantCount(dish);
  return (
    <div className="browse-line">
      <button className={`pick-row browse-row${selected ? " on" : ""}`} onClick={() => ctx.onPick(e.recipe)} aria-label={`${selected ? "Added" : "Add"} ${e.recipe.name}`}>
        <span className="pick-main" style={{ pointerEvents: "none" }}>
          {ctx.photos[e.recipe.recipeId]
            ? <img className="dish-thumb" src={ctx.photos[e.recipe.recipeId]} alt="" />
            : <span className="swatch" style={{ background: colorFor(e.recipe.recipeId) }} />}
          <span className="node-title">{e.recipe.name}</span>
          {ways > 1 ? <span className="ways">{ways} ways</span> : null}
          {e.diets.includes("vegan") ? <span className="diet-badge sm">vegan</span> : e.diets.includes("vegetarian") ? <span className="diet-badge sm">veg</span> : null}
          {note?.rating ? <Stars value={note.rating} /> : null}
          {note && note.cookCount > 0 ? <span className="cooked-n">cooked {note.cookCount}×</span> : null}
          {e.kcal > 0 ? <span className="kcal-chip">{e.kcal} kcal</span> : null}
          <span className="dur">{e.totalMins}m</span>
          <span className="browse-add">{selected ? "✓ Added" : "+ Add"}</span>
        </span>
      </button>
      {ctx.onDetails && (
        <button className="browse-info" aria-label={`View ${e.recipe.name}`} onClick={() => ctx.onDetails!(e.recipe)}>ⓘ</button>
      )}
    </div>
  );
}

function Grid({ entries, ctx }: { entries: LibraryEntry[]; ctx: RowCtx }) {
  return (
    <div className="card-grid">
      {entries.map((e) => <Row key={e.recipe.recipeId} e={e} ctx={ctx} />)}
    </div>
  );
}

function Section({ title, entries, ctx }: { title: string; entries: LibraryEntry[]; ctx: RowCtx }) {
  const [open, setOpen] = useState(false);
  if (entries.length === 0) return null;
  const shown = open ? entries : entries.slice(0, PEEK);
  return (
    <div className="pick-sec">
      <h3 className="meal-sec">{title}<span className="count">{entries.length}</span></h3>
      <Grid entries={shown} ctx={ctx} />
      {entries.length > PEEK && (
        <button className="link" onClick={() => setOpen((o) => !o)}>{open ? "Show less" : `Show all ${entries.length}`}</button>
      )}
    </div>
  );
}

export function RecipePicker({
  library,
  candidates = [],
  notes = {},
  photos = {},
  avoid = [],
  diets = [],
  selectedIds = [],
  onPick,
  onDetails,
}: {
  library: RecipeGraph[];
  candidates?: RecipeGraph[];
  notes?: NotesMap;
  photos?: Record<string, string>;
  avoid?: string[];
  diets?: string[];
  selectedIds?: string[];
  onPick: (r: RecipeGraph) => void;
  onDetails?: (r: RecipeGraph) => void;
}) {
  const [query, setQuery] = useState("");
  const [maxMins, setMaxMins] = useState<number | null>(null);
  const [vegOnly, setVegOnly] = useState(false);
  const [hideAllergens, setHideAllergens] = useState(avoid.length > 0);
  const [dietFilter, setDietFilter] = useState<string[]>(diets);
  const [sort, setSort] = useState<SortKey>("default");
  const toggleDiet = (d: string) => setDietFilter((f) => (f.includes(d) ? f.filter((x) => x !== d) : [...f, d]));

  // The pool the user can add from: library + their own recipes (deduped, candidates win), then
  // COLLAPSED to one card per dish (its verified default variant) — tiers are chosen on the plan row.
  const { pool, variantCount, dishOf } = useMemo(() => {
    const map = new Map<string, RecipeGraph>();
    for (const r of [...library, ...candidates]) map.set(r.recipeId, r);
    const all = [...map.values()];
    const groups = groupVariants(all);
    const counts = new Map(groups.map((g) => [g.dishId, g.variants.length]));
    const idToDish = new Map(all.map((r) => [r.recipeId, dishIdOf(r)]));
    return {
      pool: toLibraryEntries(groups.map((g) => g.defaultRecipe)),
      variantCount: (dishId: string) => counts.get(dishId) ?? 1,
      dishOf: (id: string) => idToDish.get(id) ?? id,
    };
  }, [library, candidates]);

  // Open the largest cuisine by default so dishes are visible at a glance (one tap to switch).
  const [openCuisine, setOpenCuisine] = useState<string | null>(() => groupByCuisine(pool)[0]?.cuisine ?? null);

  // A dish is "added" when any of its variants is in the plan (compare by dish, not exact recipe).
  const selectedDishes = useMemo(() => new Set(selectedIds.map(dishOf)), [selectedIds, dishOf]);
  const ctx: RowCtx = { notes, photos, selectedDishes, variantCount, onPick, onDetails };

  const filtered = useMemo(
    () => filterLibrary(pool, { query, maxMins: maxMins ?? undefined, vegOnly, avoidAllergens: hideAllergens ? avoid : [], diets: dietFilter }),
    [pool, query, maxMins, vegOnly, hideAllergens, avoid, dietFilter],
  );

  const candidateEntries = useMemo(() => toLibraryEntries(candidates).reverse(), [candidates]); // newest-first
  const { recents, frequent } = useMemo(() => pickHistory(filtered, notes), [filtered, notes]);
  const groups = useMemo(() => groupByCuisine(filtered), [filtered]);
  const searching = query.trim() !== "";

  return (
    <div className="picker">
      <input
        className="url-input browse-search"
        type="search"
        value={query}
        placeholder="Search recipes by name or ingredient…"
        aria-label="Search recipes"
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="browse-filters" role="group" aria-label="Filters">
        {([["Any time", null], ["≤20 min", 20], ["≤40 min", 40]] as const).map(([label, m]) => (
          <button key={label} className={`chip-toggle${maxMins === m ? " on" : ""}`} aria-pressed={maxMins === m} onClick={() => setMaxMins(m)}>{label}</button>
        ))}
        <button className={`chip-toggle${vegOnly ? " on" : ""}`} role="switch" aria-checked={vegOnly} onClick={() => setVegOnly((v) => !v)}>veg only</button>
        {avoid.length > 0 && (
          <button className={`chip-toggle${hideAllergens ? " on" : ""}`} role="switch" aria-checked={hideAllergens} onClick={() => setHideAllergens((h) => !h)}>hide my allergens</button>
        )}
      </div>

      <div className="browse-filters" role="group" aria-label="Diet">
        {["vegan", "vegetarian", "gluten-free", "dairy-free"].map((d) => (
          <button key={d} className={`chip-toggle${dietFilter.includes(d) ? " on" : ""}`} aria-pressed={dietFilter.includes(d)} onClick={() => toggleDiet(d)}>{d}</button>
        ))}
      </div>

      {searching ? (
        <>
          <div className="browse-filters" role="group" aria-label="Sort">
            <span className="kp-label" style={{ alignSelf: "center" }}>Sort</span>
            {([["Best", "default"], ["Quickest", "quickest"], ["Top rated", "rated"], ["Most cooked", "cooked"]] as [string, SortKey][]).map(([label, key]) => (
              <button key={key} className={`chip-toggle${sort === key ? " on" : ""}`} aria-pressed={sort === key} onClick={() => setSort(key)}>{label}</button>
            ))}
          </div>
          {filtered.length === 0
            ? <div className="idle">No recipes match — loosen a filter, or paste / ask AI for a new one.</div>
            : <Grid entries={sortLibrary(filtered, sort, notes)} ctx={ctx} />}
        </>
      ) : (
        <>
          <Section title="Recently cooked" entries={recents} ctx={ctx} />
          <Section title="You cook these often" entries={frequent} ctx={ctx} />
          {candidateEntries.length > 0 && <Section title="Your recipes" entries={candidateEntries} ctx={ctx} />}

          <h3 className="meal-sec">By cuisine</h3>
          {groups.map((g) => {
            const open = openCuisine === g.cuisine;
            return (
              <div key={g.cuisine} className={`cuisine-acc${open ? " open" : ""}`}>
                <button className="cuisine-head" aria-expanded={open} onClick={() => setOpenCuisine(open ? null : g.cuisine)}>
                  <span className="cuisine-name">{g.cuisine}</span>
                  <span className="count">{g.entries.length}</span>
                  <span className="chev" aria-hidden="true">{open ? "▾" : "▸"}</span>
                </button>
                {open && (
                  g.courses.length > 0
                    ? g.courses.map((c) => (
                        <div key={c.course} className="course-grp">
                          <h4 className="course-h">{c.course}</h4>
                          <Grid entries={c.entries} ctx={ctx} />
                        </div>
                      ))
                    : <Grid entries={g.entries} ctx={ctx} />
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
