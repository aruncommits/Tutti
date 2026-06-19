import { tierOf, type ComplexityTier, type RecipeGraph } from "@tutti/engine";
import { colorFor } from "./dishColors";
import { recipeTotalMins } from "./recipeView";

// Recipe Studio — the one home for authoring (Brief v42). "+ New" reaches the paste/URL/AI flow;
// "My recipes" manages the recipes you've added or made (open / duplicate / delete). The Phase-2
// customize editor and Phase-3 merge land here too. The meal *planner* stays on Home.

const TIER_LABEL: Record<ComplexityTier, string> = { simple: "Simple", moderate: "Standard", complex: "Elaborate" };

export function StudioScreen({
  candidates,
  photos = {},
  onNew,
  onOpen,
  onDuplicate,
  onRemove,
}: {
  candidates: RecipeGraph[];
  photos?: Record<string, string>;
  onNew: () => void;
  onOpen: (r: RecipeGraph) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const mine = [...candidates].reverse(); // newest first

  return (
    <section className="zone" aria-label="Recipe Studio">
      <h2 className="zone-h"><span>Recipe Studio</span>{mine.length > 0 && <span className="count">{mine.length}</span>}</h2>

      <div className="add-row">
        <button className="add-action" onClick={onNew}><span className="add-ico" aria-hidden="true">✨</span>New recipe — paste, a link, or ask AI</button>
      </div>

      <h3 className="meal-sec">My recipes</h3>
      {mine.length === 0 ? (
        <div className="idle"><b>No recipes yet.</b> Tap <i>New recipe</i> to paste one, pull it from a link, or have AI write it — it'll live here to reuse, tweak, and add to any meal.</div>
      ) : (
        <div className="card-grid">
          {mine.map((r) => (
            <div key={r.recipeId} className="browse-line studio-line">
              <button className="pick-row browse-row" onClick={() => onOpen(r)} aria-label={`Open ${r.name}`}>
                <span className="pick-main" style={{ pointerEvents: "none" }}>
                  {photos[r.recipeId]
                    ? <img className="dish-thumb" src={photos[r.recipeId]} alt="" />
                    : <span className="swatch" style={{ background: colorFor(r.recipeId) }} />}
                  <span className="node-title">{r.name}</span>
                  {r.variantLabel ? <span className="tier-badge">{r.variantLabel}</span> : <span className="tier-badge">{TIER_LABEL[tierOf(r)]}</span>}
                  {!r.verified && <span className="badge-unverified">unverified</span>}
                  <span className="dur">{recipeTotalMins(r)}m</span>
                </span>
              </button>
              <button className="browse-info" aria-label={`Duplicate ${r.name}`} title="Duplicate" onClick={() => onDuplicate(r.recipeId)}>⧉</button>
              <button className="browse-info" aria-label={`Delete ${r.name}`} title="Delete" onClick={() => onRemove(r.recipeId)}>🗑</button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
