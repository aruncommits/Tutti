import { LibraryBrowser } from "./LibraryBrowser";
import type { LibraryProvider } from "./library";

// Full-screen "browse at scale" (Phase D): category-first, server-backed, paginated discovery over
// the whole catalog. (The Plan builder keeps the lighter inline RecipePicker for quick adds.)

export function BrowseScreen({
  provider,
  diets = [],
  selectedDishIds = [],
  onAddRecipe,
  onDetails,
  onBack,
}: {
  provider?: LibraryProvider;
  diets?: string[];
  selectedDishIds?: string[];
  onAddRecipe: (recipeId: string) => void;
  onDetails?: (recipeId: string) => void;
  onBack: () => void;
}) {
  return (
    <section className="zone" aria-label="Browse recipes">
      <h2 className="zone-h"><span>Browse recipes</span></h2>

      <LibraryBrowser
        provider={provider}
        diets={diets}
        selectedDishIds={selectedDishIds}
        onAddRecipe={onAddRecipe}
        onDetails={onDetails}
      />

      <div className="home-links"><button className="link" onClick={onBack}>Back</button></div>
    </section>
  );
}
