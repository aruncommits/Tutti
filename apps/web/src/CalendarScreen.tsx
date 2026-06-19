import { useState } from "react";
import type { SavedMeal } from "./meals";
import {
  SLOTS,
  weekDaysISO,
  addDaysISO,
  weekStartISO,
  weekdayLabel,
  dayNumber,
  dayCount,
  plannedFromSaved,
  type Calendar,
  type Slot,
  type PlannedMeal,
} from "./calendar";

// Weekly meal-planning calendar (Brief v45). Plan saved meals onto days/slots; cook a day's plan
// (loads it into the coordinated builder); the week's meals feed one shopping list.

const SLOT_LABEL: Record<Slot, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };

export function CalendarScreen({
  calendar,
  meals,
  today,
  onAssign,
  onClear,
  onCook,
  onShopWeek,
}: {
  calendar: Calendar;
  meals: SavedMeal[];
  today: string;
  onAssign: (dateISO: string, slot: Slot, meal: PlannedMeal) => void;
  onClear: (dateISO: string, slot: Slot) => void;
  onCook: (meal: PlannedMeal) => void;
  onShopWeek: (days: string[]) => void;
}) {
  const [anchor, setAnchor] = useState(today);
  const [assigning, setAssigning] = useState<{ dateISO: string; slot: Slot } | null>(null);
  const days = weekDaysISO(anchor);
  const saved = meals.filter((m) => m.kind === "saved" || m.kind === "recent");

  const pick = (dateISO: string, slot: Slot, meal: SavedMeal) => {
    onAssign(dateISO, slot, plannedFromSaved(meal, `p${dateISO}_${slot}_${meal.id}`));
    setAssigning(null);
  };

  return (
    <section className="zone" aria-label="Meal calendar">
      <h2 className="zone-h"><span>Meal calendar</span></h2>

      <div className="cal-weeknav">
        <button className="link" aria-label="Previous week" onClick={() => setAnchor((a) => addDaysISO(weekStartISO(a), -7))}>‹ Prev</button>
        <span className="cal-weeklabel">{dayNumber(days[0]!)} – {dayNumber(days[6]!)}</span>
        <button className="link" aria-label="Next week" onClick={() => setAnchor((a) => addDaysISO(weekStartISO(a), 7))}>Next ›</button>
      </div>

      <div className="cal-grid">
        {days.map((iso) => (
          <div className={`cal-day${iso === today ? " is-today" : ""}`} key={iso}>
            <div className="cal-dayhead">
              <span className="cal-dow">{weekdayLabel(iso)}</span>
              <span className="cal-date">{dayNumber(iso)}</span>
              {dayCount(calendar, iso) > 0 && <button className="link cal-shopday" onClick={() => onShopWeek([iso])} aria-label={`Shopping list for ${weekdayLabel(iso)}`}>🛒</button>}
            </div>

            {SLOTS.map((slot) => {
              const meal = calendar[iso]?.[slot];
              if (!meal) return null;
              return (
                <div className="cal-meal" key={slot}>
                  <span className="cal-slot">{SLOT_LABEL[slot]}</span>
                  <button className="cal-mealname" onClick={() => onCook(meal)} aria-label={`Cook ${meal.name}`}>{meal.name}{meal.leftoverOf ? " ♻" : ""}</button>
                  <button className="row-x" aria-label={`Remove ${meal.name} from ${weekdayLabel(iso)} ${slot}`} onClick={() => onClear(iso, slot)}>×</button>
                </div>
              );
            })}

            <button className="cal-add" onClick={() => setAssigning({ dateISO: iso, slot: "dinner" })} aria-label={`Add a meal to ${weekdayLabel(iso)}`}>+ Add meal</button>
          </div>
        ))}
      </div>

      {assigning && (
        <div className="cal-assign" role="group" aria-label="Assign a meal">
          <div className="cal-assign-head">
            <b>Add to {weekdayLabel(assigning.dateISO)}</b>
            <button className="row-x" aria-label="Cancel" onClick={() => setAssigning(null)}>×</button>
          </div>
          <div className="browse-filters">
            {SLOTS.map((s) => (
              <button key={s} className={`chip-toggle${assigning.slot === s ? " on" : ""}`} aria-pressed={assigning.slot === s} onClick={() => setAssigning((a) => a && { ...a, slot: s })}>{SLOT_LABEL[s]}</button>
            ))}
          </div>
          {saved.length === 0 ? (
            <div className="idle">No saved meals yet — build & save a meal first, then plan it here.</div>
          ) : (
            <div className="card-grid">
              {saved.map((m) => (
                <button key={m.id} className="pick-row browse-row" onClick={() => pick(assigning.dateISO, assigning.slot, m)} aria-label={`Plan ${m.name}`}>
                  <span className="pick-main" style={{ pointerEvents: "none" }}>
                    <span className="node-title">{m.name}</span>
                    <span className="dur">{m.dishIds.length} dishes</span>
                    <span className="browse-add">+ Plan</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <button className="btn big-btn" onClick={() => onShopWeek(days)} aria-label="Shopping list for the whole week">🛒 Shop this week</button>
    </section>
  );
}
