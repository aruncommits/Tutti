import { allergensOf, dietsOf, minServingsOf, nutritionOf, tierOf, type ComplexityTier, type RecipeGraph } from "@tutti/engine";
import { orderedSteps, recipeIngredients, recipeTotalMins } from "./recipeView";
import { Stars } from "./Stars";
import { colorFor } from "./dishColors";
import { substitutesFor } from "./substitutions";
import { blendView, isBlend } from "./blendView";
import { displayAmount } from "./units";
import { useState } from "react";
import { NutritionStrip } from "./NutritionStrip";
import type { RecipeNote } from "./recipeNotes";
import type { Collection } from "./collections";

// Recipe detail / read view (Brief v19) — a control center, not a blog post: ingredients up top,
// scannable numbered steps with phase + time + hands-free tags. Pure render of the RecipeGraph.

const TIER_LABEL: Record<ComplexityTier, string> = { simple: "Simple", moderate: "Standard", complex: "Elaborate" };

export function RecipeDetailScreen({
  recipe,
  note,
  metric = false,
  photo,
  siblings = [],
  onPickVariant,
  collections = [],
  onToggleCollection,
  onAdd,
  onEdit,
  onBack,
}: {
  recipe: RecipeGraph;
  note?: RecipeNote;
  metric?: boolean;
  photo?: string;
  siblings?: RecipeGraph[];
  onPickVariant?: (r: RecipeGraph) => void;
  collections?: Collection[];
  onToggleCollection?: (collectionId: string, recipeId: string) => void;
  onAdd: () => void;
  onEdit?: () => void;
  onBack: () => void;
}) {
  const allergens = allergensOf(recipe);
  const steps = orderedSteps(recipe);
  const ingredients = recipeIngredients(recipe);
  const [openBlends, setOpenBlends] = useState<Set<string>>(new Set());
  const toggleBlend = (n: string) => setOpenBlends((s) => { const x = new Set(s); x.has(n) ? x.delete(n) : x.add(n); return x; });
  const nutrition = nutritionOf(recipe);
  const diets = dietsOf(recipe);

  return (
    <section className="zone" aria-label="Recipe">
      <h2 className="zone-h">
        <span className="swatch" style={{ background: colorFor(recipe.recipeId) }} />
        <span>{recipe.name}</span>
      </h2>

      {photo && <img className="dish-thumb dish-thumb-lg" src={photo} alt={`Your ${recipe.name}`} />}

      <p className="value recipe-meta">
        {recipeTotalMins(recipe)} min · serves {recipe.servings}
        {minServingsOf(recipe) < recipe.servings && <span className="min-batch"> · best for {minServingsOf(recipe)}+</span>}
        <span className="tier-badge">{TIER_LABEL[tierOf(recipe)]}</span>
        {recipe.course && <span className="tier-badge">{recipe.course}</span>}
        {allergens.map((a) => <span key={a} className="badge-allergen" title="contains"> {a}</span>)}
        {!recipe.verified && <span className="badge-unverified"> unverified</span>}
      </p>

      {diets.length > 0 && (
        <p className="diet-badges" aria-label="Diets">
          {diets.map((d) => <span key={d} className="diet-badge">{d}</span>)}
        </p>
      )}

      <NutritionStrip nutrition={nutrition} />

      {collections.length > 0 && onToggleCollection && (
        <div className="browse-filters" role="group" aria-label="Add to a collection">
          <span className="kp-label" style={{ alignSelf: "center" }}>Collections</span>
          {collections.map((c) => {
            const inIt = c.recipeIds.includes(recipe.recipeId);
            return (
              <button key={c.id} className={`chip-toggle${inIt ? " on" : ""}`} aria-pressed={inIt} onClick={() => onToggleCollection(c.id, recipe.recipeId)}>
                {inIt ? "✓ " : "+ "}{c.name}
              </button>
            );
          })}
        </div>
      )}

      {siblings.length > 1 && onPickVariant && (
        <div className="tier-toggle detail-tiers" role="group" aria-label="Other versions of this dish">
          {siblings.map((v) => {
            const on = v.recipeId === recipe.recipeId;
            return (
              <button key={v.recipeId} className={`tier-btn${on ? " on" : ""}`} aria-pressed={on} onClick={() => onPickVariant(v)}>
                {TIER_LABEL[tierOf(v)]}{v.variantLabel ? ` · ${v.variantLabel}` : ""}
              </button>
            );
          })}
        </div>
      )}

      {note && (note.rating || note.note || note.cookCount > 0) && (
        <p className="value">
          {note.rating ? <Stars value={note.rating} /> : null}
          {note.cookCount > 0 ? <span className="cooked-n">cooked {note.cookCount}×</span> : null}
          {note.note ? <span className="recipe-note-text"> — “{note.note}”</span> : null}
        </p>
      )}

      <h3 className="meal-sec">Ingredients</h3>
      <div className="ing-sec">
        {ingredients.map((i) => {
          const subs = substitutesFor(i.name);
          return (
            <div key={`${i.name}|${i.unit ?? ""}`}>
              <div className="ing-row">
                <span className="nm">{i.name}</span>
                <span className="amt">{displayAmount(i.amount, i.unit, i.toTaste, metric)}</span>
              </div>
              {subs.length > 0 && (
                <p className="sub-hint">
                  Out of {i.name}? Try {subs.map((s) => s.swap + (s.note ? ` (${s.note})` : "")).join(" · or ")}
                </p>
              )}
              {isBlend(i.name) && (() => {
                const bv = blendView(i.name)!;
                const open = openBlends.has(i.name);
                return (
                  <div className="blend">
                    <button className="blend-toggle" aria-expanded={open} onClick={() => toggleBlend(i.name)}>
                      🧂 Make at home {open ? "▾" : "▸"}
                    </button>
                    {open && (
                      <div className="blend-body">
                        <p className="blend-meta">Makes {bv.yields}{i.amount !== undefined && !i.toTaste ? ` · this recipe uses ${displayAmount(i.amount, i.unit, false, metric)}` : ""}</p>
                        <ul className="blend-list">
                          {bv.constituents.map((c, k) => (
                            <li key={k}><span className="nm">{c.name}</span><span className="amt">{displayAmount(c.amount, c.unit, false, metric)}</span></li>
                          ))}
                        </ul>
                        <p className="blend-method">{bv.method}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          );
        })}
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
      <div className="home-links">
        {onEdit && <button className="link" onClick={onEdit}>✏️ Customize</button>}
        <button className="link" onClick={onBack}>Back</button>
        <button className="link no-print" onClick={() => { if (typeof window !== "undefined") window.print(); }}>🖨 Print</button>
      </div>
    </section>
  );
}
