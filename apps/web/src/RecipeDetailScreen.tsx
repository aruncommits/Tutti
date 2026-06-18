import { allergensOf, type RecipeGraph } from "@tutti/engine";
import { orderedSteps, recipeIngredients, recipeTotalMins } from "./recipeView";
import { Stars } from "./Stars";
import { colorFor } from "./dishColors";
import type { RecipeNote } from "./recipeNotes";

// Recipe detail / read view (Brief v19) — a control center, not a blog post: ingredients up top,
// scannable numbered steps with phase + time + hands-free tags. Pure render of the RecipeGraph.

const amt = (i: { amount?: number; unit?: string; toTaste?: boolean }) =>
  i.amount !== undefined ? `${i.amount}${i.unit ? ` ${i.unit}` : ""}` : "to taste";

export function RecipeDetailScreen({
  recipe,
  note,
  onAdd,
  onBack,
}: {
  recipe: RecipeGraph;
  note?: RecipeNote;
  onAdd: () => void;
  onBack: () => void;
}) {
  const allergens = allergensOf(recipe);
  const steps = orderedSteps(recipe);
  const ingredients = recipeIngredients(recipe);

  return (
    <section className="zone" aria-label="Recipe">
      <h2 className="zone-h">
        <span className="swatch" style={{ background: colorFor(recipe.recipeId) }} />
        <span>{recipe.name}</span>
      </h2>

      <p className="value recipe-meta">
        {recipeTotalMins(recipe)} min · serves {recipe.servings}
        {allergens.map((a) => <span key={a} className="badge-allergen" title="contains"> {a}</span>)}
        {!recipe.verified && <span className="badge-unverified"> unverified</span>}
      </p>

      {note && (note.rating || note.note || note.cookCount > 0) && (
        <p className="value">
          {note.rating ? <Stars value={note.rating} /> : null}
          {note.cookCount > 0 ? <span className="cooked-n">cooked {note.cookCount}×</span> : null}
          {note.note ? <span className="recipe-note-text"> — “{note.note}”</span> : null}
        </p>
      )}

      <h3 className="meal-sec">Ingredients</h3>
      <div className="ing-sec">
        {ingredients.map((i) => (
          <div className="ing-row" key={`${i.name}|${i.unit ?? ""}`}>
            <span className="nm">{i.name}</span>
            <span className="amt">{amt(i)}</span>
          </div>
        ))}
      </div>

      <h3 className="meal-sec">Steps</h3>
      <ol className="recipe-steps">
        {steps.map((n) => (
          <li className="recipe-step" key={n.nodeId}>
            <span className="recipe-step-title">{n.title}</span>
            <span className="recipe-step-meta">
              <span className="phase">{n.phase}</span>
              <span className="dur">~{n.duration.estMins} min</span>
              {n.attention === "passive" && <span className="hands-free">hands-free</span>}
            </span>
          </li>
        ))}
      </ol>

      <button className="btn big-btn" onClick={onAdd}>+ Add to meal</button>
      <div className="home-links"><button className="link" onClick={onBack}>Back</button></div>
    </section>
  );
}
