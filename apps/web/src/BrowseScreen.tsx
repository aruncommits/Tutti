import { useState } from "react";
import { goldenLibrary, type RecipeGraph } from "@tutti/engine";
import { toLibraryEntries, filterLibrary } from "./libraryView";
import { colorFor } from "./dishColors";

// Browse the seeded Golden Library (Doc 7 §4; Brief v8 items 3-4). Search by name/ingredient with
// stackable filters (max time, veg-only, hide-my-allergens). Tapping a dish adds it to the meal.

const ENTRIES = toLibraryEntries(goldenLibrary);

export function BrowseScreen({
  avoid,
  onPick,
  onBack,
}: {
  avoid: string[];
  onPick: (r: RecipeGraph) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const [maxMins, setMaxMins] = useState<number | null>(null);
  const [vegOnly, setVegOnly] = useState(true);
  const [hideAllergens, setHideAllergens] = useState(true);

  const filtered = filterLibrary(ENTRIES, {
    query,
    maxMins: maxMins ?? undefined,
    vegOnly,
    avoidAllergens: hideAllergens ? avoid : [],
  });

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

      {filtered.length === 0 ? (
        <div className="idle">No recipes match — loosen a filter.</div>
      ) : (
        filtered.map((e) => (
          <button key={e.recipe.recipeId} className="pick-row browse-row" onClick={() => onPick(e.recipe)} aria-label={`Add ${e.recipe.name}`}>
            <span className="pick-main" style={{ pointerEvents: "none" }}>
              <span className="swatch" style={{ background: colorFor(e.recipe.recipeId) }} />
              <span className="node-title">{e.recipe.name}</span>
              {e.allergens.map((a) => <span key={a} className="badge-allergen" title="contains">{a}</span>)}
              <span className="dur">{e.totalMins}m</span>
              <span className="browse-add">+ Add</span>
            </span>
          </button>
        ))
      )}

      <div className="home-links"><button className="link" onClick={onBack}>Back</button></div>
    </section>
  );
}
