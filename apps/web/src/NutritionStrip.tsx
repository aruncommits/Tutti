import type { NutritionEstimate } from "@tutti/engine";

// Compact per-serving nutrition readout. Reused on the recipe detail, the meal builder, and the
// week calendar. Shows an "estimated" hint when derived from ingredients rather than authored.

export function NutritionStrip({ nutrition, label = "Per serving" }: { nutrition: NutritionEstimate; label?: string }) {
  const n = nutrition;
  return (
    <div className="nutri-strip" aria-label={`${label}: ${n.kcal} calories, ${n.protein} grams protein, ${n.carbs} grams carbs, ${n.fat} grams fat`}>
      <span className="nutri-label">{label}</span>
      <span className="nutri-kcal">{n.kcal} kcal</span>
      <span className="nutri-macro"><b>{n.protein}g</b> protein</span>
      <span className="nutri-macro"><b>{n.carbs}g</b> carbs</span>
      <span className="nutri-macro"><b>{n.fat}g</b> fat</span>
      {n.estimated && <span className="nutri-est" title="Estimated from ingredients — not lab-measured">≈ est.</span>}
    </div>
  );
}
