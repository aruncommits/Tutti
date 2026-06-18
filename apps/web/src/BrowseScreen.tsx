import { useState } from "react";
import { goldenLibrary, type RecipeGraph } from "@tutti/engine";
import { toLibraryEntries, filterLibrary, sortLibrary, cuisinesOf, type SortKey } from "./libraryView";
import { colorFor } from "./dishColors";
import { Stars } from "./Stars";
import type { NotesMap } from "./recipeNotes";

// Browse the seeded Golden Library (Doc 7 §4; Brief v8 items 3-4). Search by name/ingredient with
// stackable filters (max time, veg-only, hide-my-allergens). Tapping a dish adds it to the meal.

const ENTRIES = toLibraryEntries(goldenLibrary);
const CUISINES = cuisinesOf(ENTRIES);

export function BrowseScreen({
  avoid,
  notes = {},
  photos = {},
  onPick,
  onDetails,
  onBack,
}: {
  avoid: string[];
  notes?: NotesMap;
  photos?: Record<string, string>;
  onPick: (r: RecipeGraph) => void;
  onDetails?: (r: RecipeGraph) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const [maxMins, setMaxMins] = useState<number | null>(null);
  const [vegOnly, setVegOnly] = useState(true);
  const [hideAllergens, setHideAllergens] = useState(true);
  const [cuisine, setCuisine] = useState<string | null>(null);
  const [sort, setSort] = useState<SortKey>("default");

  const filtered = sortLibrary(
    filterLibrary(ENTRIES, {
      query,
      maxMins: maxMins ?? undefined,
      vegOnly,
      cuisine: cuisine ?? undefined,
      avoidAllergens: hideAllergens ? avoid : [],
    }),
    sort,
    notes,
  );

  return (
    <section className="zone" aria-label="Browse recipes">
      <h2 className="zone-h"><span>Browse recipes</span><span className="count">{filtered.length}</span></h2>

      <input
        className="url-input browse-search"
        type="search"
        value={query}
        placeholder="Search by name or ingredient…"
        aria-label="Search recipes"
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="browse-filters">
        {([["All", null], ["≤20 min", 20], ["≤40 min", 40]] as const).map(([label, m]) => (
          <button key={label} className={`chip-toggle${maxMins === m ? " on" : ""}`} aria-pressed={maxMins === m} onClick={() => setMaxMins(m)}>{label}</button>
        ))}
        <button className={`chip-toggle${vegOnly ? " on" : ""}`} role="switch" aria-checked={vegOnly} onClick={() => setVegOnly(!vegOnly)}>veg only</button>
        {avoid.length > 0 && (
          <button className={`chip-toggle${hideAllergens ? " on" : ""}`} role="switch" aria-checked={hideAllergens} onClick={() => setHideAllergens(!hideAllergens)}>hide my allergens</button>
        )}
      </div>

      {CUISINES.length > 1 && (
        <div className="browse-filters" role="group" aria-label="Cuisine">
          <span className="kp-label" style={{ alignSelf: "center" }}>Cuisine</span>
          <button className={`chip-toggle${cuisine === null ? " on" : ""}`} aria-pressed={cuisine === null} onClick={() => setCuisine(null)}>All</button>
          {CUISINES.map((c) => (
            <button key={c} className={`chip-toggle${cuisine === c ? " on" : ""}`} aria-pressed={cuisine === c} onClick={() => setCuisine(c)}>{c}</button>
          ))}
        </div>
      )}

      <div className="browse-filters" role="group" aria-label="Sort">
        <span className="kp-label" style={{ alignSelf: "center" }}>Sort</span>
        {([["Default", "default"], ["Quickest", "quickest"], ["Top rated", "rated"], ["Most cooked", "cooked"]] as [string, SortKey][]).map(([label, key]) => (
          <button key={key} className={`chip-toggle${sort === key ? " on" : ""}`} aria-pressed={sort === key} onClick={() => setSort(key)}>{label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="idle">No recipes match — loosen a filter.</div>
      ) : (
        <div className="card-grid">
        {filtered.map((e) => {
          const note = notes[e.recipe.recipeId];
          return (
          <div key={e.recipe.recipeId} className="browse-line">
            <button className="pick-row browse-row" onClick={() => onPick(e.recipe)} aria-label={`Add ${e.recipe.name}`}>
              <span className="pick-main" style={{ pointerEvents: "none" }}>
                {photos[e.recipe.recipeId]
                  ? <img className="dish-thumb" src={photos[e.recipe.recipeId]} alt="" />
                  : <span className="swatch" style={{ background: colorFor(e.recipe.recipeId) }} />}
                <span className="node-title">{e.recipe.name}</span>
                {note?.rating ? <Stars value={note.rating} /> : null}
                {note && note.cookCount > 0 ? <span className="cooked-n">cooked {note.cookCount}×</span> : null}
                {e.allergens.map((a) => <span key={a} className="badge-allergen" title="contains">{a}</span>)}
                <span className="dur">{e.totalMins}m</span>
                <span className="browse-add">+ Add</span>
              </span>
            </button>
            {onDetails && (
              <button className="browse-info" aria-label={`View ${e.recipe.name}`} onClick={() => onDetails(e.recipe)}>ⓘ</button>
            )}
          </div>
          );
        })}
        </div>
      )}

      <div className="home-links"><button className="link" onClick={onBack}>Back</button></div>
    </section>
  );
}
