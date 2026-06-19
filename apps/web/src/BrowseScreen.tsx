import { goldenLibrary, type RecipeGraph } from "@tutti/engine";
import { RecipePicker } from "./RecipePicker";
import type { NotesMap } from "./recipeNotes";

// Full-screen browse: the same shared RecipePicker the Plan builder uses inline, so discovery
// (search + recents/frequent + cuisine → dish) stays identical in both places (Brief v41).

export function BrowseScreen({
  avoid,
  diets = [],
  library = goldenLibrary,
  candidates = [],
  notes = {},
  photos = {},
  selectedIds = [],
  onPick,
  onDetails,
  onBack,
}: {
  avoid: string[];
  diets?: string[];
  library?: RecipeGraph[];
  candidates?: RecipeGraph[];
  notes?: NotesMap;
  photos?: Record<string, string>;
  selectedIds?: string[];
  onPick: (r: RecipeGraph) => void;
  onDetails?: (r: RecipeGraph) => void;
  onBack: () => void;
}) {
  return (
    <section className="zone" aria-label="Browse recipes">
      <h2 className="zone-h"><span>Browse recipes</span></h2>

      <RecipePicker
        library={library}
        candidates={candidates}
        notes={notes}
        photos={photos}
        avoid={avoid}
        diets={diets}
        selectedIds={selectedIds}
        onPick={onPick}
        onDetails={onDetails}
      />

      <div className="home-links"><button className="link" onClick={onBack}>Back</button></div>
    </section>
  );
}
