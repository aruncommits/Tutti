import type { RecipeGraph } from "@tutti/engine";
import type { SavedMeal } from "./meals";
import { colorFor, dishName } from "./dishColors";

// Your meals (Brief v12 item 4): saved + recently-cooked meals for one-tap re-cooking. Local only.

export function MealsScreen({
  meals,
  recipes,
  onRestore,
  onRemove,
  onSettings,
  onCalendar,
}: {
  meals: SavedMeal[];
  recipes: RecipeGraph[];
  onRestore: (m: SavedMeal) => void;
  onRemove: (id: string) => void;
  onSettings?: () => void;
  onCalendar?: () => void;
}) {
  const saved = meals.filter((m) => m.kind === "saved");
  const recent = meals.filter((m) => m.kind === "recent");
  const nameOf = (id: string) => recipes.find((r) => r.recipeId === id)?.name ?? dishName(id);

  const Row = ({ m }: { m: SavedMeal }) => (
    <div className="meal-row">
      <button className="meal-main" onClick={() => onRestore(m)} aria-label={`Cook ${m.name} again`}>
        <span className="meal-dots">
          {m.dishIds.map((id) => <span key={id} className="swatch" style={{ background: colorFor(id) }} />)}
        </span>
        <span className="meal-text">
          <span className="node-title">{m.name}</span>
          <span className="dur">{m.dishIds.map(nameOf).join(" · ") || "no dishes"}</span>
        </span>
      </button>
      <button className="meal-x" onClick={() => onRemove(m.id)} aria-label={`Remove ${m.name}`}>×</button>
    </div>
  );

  return (
    <section className="zone" aria-label="Your meals">
      <h2 className="zone-h"><span>Your meals</span></h2>

      {meals.length === 0 ? (
        <div className="idle">No saved meals yet — build a plan and tap “Save this meal,” or finish a cook and it'll show up here.</div>
      ) : (
        <>
          {saved.length > 0 && (
            <>
              <h3 className="meal-sec">Saved</h3>
              {saved.map((m) => <Row key={m.id} m={m} />)}
            </>
          )}
          {recent.length > 0 && (
            <>
              <h3 className="meal-sec">Recently cooked</h3>
              {recent.map((m) => <Row key={m.id} m={m} />)}
            </>
          )}
        </>
      )}

      <div className="home-links">
        {onCalendar && <button className="link" onClick={onCalendar}>📅 Calendar</button>}
        {onSettings && <button className="link" onClick={onSettings}>⚙ Settings</button>}
      </div>
    </section>
  );
}
