import { useState } from "react";
import { PasteParser } from "@tutti/ingest";
import { dishIdOf, tierOf, type RecipeGraph } from "@tutti/engine";
import { editableIngredientLines, editableStepLines, assembleRecipeText } from "./recipeView";

// Customize editor (Brief "Phase-2"): edit a recipe's name, servings, ingredient lines and steps,
// then save a personal copy to My Recipes. On save we re-assemble canonical recipe text and run it
// through the same PasteParser the rest of the app uses, so the result is a normal validated graph
// (ingredient parsing, step timing/phase inference, and the serving compiler all reused). Identity
// (recipeId / dishId / category / cuisine / tier) is carried over from the recipe being edited.

// NOTE: kept at module scope (not nested in RecipeEditor) so it stays the same component type across
// renders — otherwise React remounts every input on each keystroke, losing focus and edits.
function LineList({
  list, kind, onEdit, onRemove, onAdd, onMove,
}: {
  list: string[];
  kind: "ing" | "step";
  onEdit: (i: number, v: string) => void;
  onRemove: (i: number) => void;
  onAdd: () => void;
  onMove?: (i: number, dir: -1 | 1) => void;
}) {
  return (
    <div className="editor-list">
      {list.map((line, i) => (
        <div className="editor-row" key={i}>
          {kind === "step" && <span className="editor-num">{i + 1}.</span>}
          <input
            className="editor-input"
            value={line}
            placeholder={kind === "ing" ? "e.g. 500 g chicken" : "e.g. Sauté onions until golden (8 min)"}
            aria-label={`${kind === "ing" ? "Ingredient" : "Step"} ${i + 1}`}
            onChange={(e) => onEdit(i, e.target.value)}
          />
          {kind === "step" && onMove && (
            <span className="editor-move">
              <button className="mini-btn" aria-label="Move up" disabled={i === 0} onClick={() => onMove(i, -1)}>↑</button>
              <button className="mini-btn" aria-label="Move down" disabled={i === list.length - 1} onClick={() => onMove(i, 1)}>↓</button>
            </span>
          )}
          <button className="mini-btn row-x" aria-label="Remove" onClick={() => onRemove(i)}>×</button>
        </div>
      ))}
      <button className="link" onClick={onAdd}>+ Add {kind === "ing" ? "ingredient" : "step"}</button>
    </div>
  );
}

export function RecipeEditor({
  recipe,
  onSave,
  onCancel,
}: {
  recipe: RecipeGraph;
  onSave: (g: RecipeGraph) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(recipe.name);
  const [servings, setServings] = useState(recipe.servings || 4);
  const [ings, setIngs] = useState<string[]>(() => editableIngredientLines(recipe));
  const [steps, setSteps] = useState<string[]>(() => editableStepLines(recipe));
  const [error, setError] = useState<string | null>(null);

  const editIng = (i: number, v: string) => setIngs((a) => a.map((x, k) => (k === i ? v : x)));
  const editStep = (i: number, v: string) => setSteps((a) => a.map((x, k) => (k === i ? v : x)));
  const moveStep = (i: number, dir: -1 | 1) =>
    setSteps((a) => {
      const j = i + dir;
      if (j < 0 || j >= a.length) return a;
      const next = [...a];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });

  const save = async () => {
    const ingLines = ings.map((l) => l.trim()).filter(Boolean);
    const stepLines = steps.map((l) => l.trim()).filter(Boolean);
    if (!name.trim()) return setError("Give the recipe a name.");
    if (ingLines.length === 0) return setError("Add at least one ingredient.");
    if (stepLines.length === 0) return setError("Add at least one step.");
    const { graph } = await new PasteParser().parse({ source: "paste", text: assembleRecipeText(name, servings, ingLines, stepLines) });
    if (!graph) return setError("Couldn't parse the recipe — check the lines and try again.");
    onSave({
      ...graph,
      recipeId: recipe.recipeId,
      dishId: recipe.dishId ?? dishIdOf(recipe),
      name: name.trim(),
      category: recipe.category,
      cuisine: recipe.cuisine,
      tier: recipe.tier ?? tierOf(recipe),
      verified: false,
    });
  };

  return (
    <section className="zone" aria-label="Customize recipe">
      <h2 className="zone-h"><span>Customize recipe</span></h2>
      <p className="value">Make it yours — edit the ingredients and steps, then save it to your recipes. Your copy stays on this device; the library recipe is untouched.</p>

      <label className="editor-field">
        <span className="editor-label">Name</span>
        <input className="editor-input" value={name} onChange={(e) => setName(e.target.value)} aria-label="Recipe name" />
      </label>
      <label className="editor-field">
        <span className="editor-label">Serves</span>
        <input className="editor-input small" type="number" min={1} max={40} value={servings} onChange={(e) => setServings(Number(e.target.value))} aria-label="Servings" />
      </label>

      <h3 className="meal-sec">Ingredients</h3>
      <LineList list={ings} kind="ing" onEdit={editIng} onRemove={(i) => setIngs((a) => a.filter((_, k) => k !== i))} onAdd={() => setIngs((a) => [...a, ""])} />

      <h3 className="meal-sec">Steps</h3>
      <LineList list={steps} kind="step" onEdit={editStep} onRemove={(i) => setSteps((a) => a.filter((_, k) => k !== i))} onAdd={() => setSteps((a) => [...a, ""])} onMove={moveStep} />

      {error && <p className="alert" role="alert">{error}</p>}

      <div className="editor-actions">
        <button className="btn" onClick={() => void save()}>Save to my recipes</button>
        <button className="link" onClick={onCancel}>Cancel</button>
      </div>
    </section>
  );
}
