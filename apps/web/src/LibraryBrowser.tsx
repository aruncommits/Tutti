import { useCallback, useEffect, useRef, useState } from "react";
import type { ComplexityTier } from "@tutti/engine";
import { colorFor } from "./dishColors";
import { library as defaultLibrary, type CategoryCount, type LibraryProvider, type SearchResult } from "./library";
import type { DishSummary } from "@tutti/engine";

// Browse-at-scale surface (Phase D): category-first, server-backed, paginated. Lists DISHES (one card
// per dish, collapsing tier variants). V2: tier selection is inline on each card (showTierInline prop).

const PAGE_SIZE = 12;
const TIER_LABEL: Record<ComplexityTier, string> = { simple: "Simple", moderate: "Standard", complex: "Elaborate" };

// V2 dish card with inline tier selector (used in Browse tab).
// Legacy expand/collapse is kept for the home picker (showTierInline=false).
function DishCard({
  d,
  isSelected,
  expanded,
  setExpanded,
  onAddRecipe,
  onDetails,
  showTierInline,
}: {
  d: DishSummary;
  isSelected: boolean;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  onAddRecipe: (recipeId: string, dishName?: string) => void;
  onDetails?: (recipeId: string) => void;
  showTierInline: boolean;
}) {
  const defaultTier = d.tiers.find((t) => t.recipeId === d.defaultRecipeId) ?? d.tiers[0];
  const [selectedTier, setSelectedTier] = useState<ComplexityTier>(defaultTier?.tier ?? "moderate");
  const chosenTier = d.tiers.find((t) => t.tier === selectedTier) ?? defaultTier;
  const open = expanded === d.dishId;

  if (showTierInline && d.tiers.length > 0) {
    return (
      <div className="browse-card">
        <div className="browse-card-swatch" style={{ background: colorFor(d.defaultRecipeId) }} />
        <div className="browse-card-body">
          <span className="browse-card-name">{d.name}</span>
          {chosenTier?.totalMins ? <span className="dur">~{chosenTier.totalMins} min</span> : null}
          {d.tiers.length > 1 && (
            <div className="tier-toggle" role="group" aria-label={`Version of ${d.name}`}>
              {d.tiers.map((t) => (
                <button
                  key={t.recipeId}
                  className={`tier-btn${t.tier === selectedTier ? " on" : ""}`}
                  aria-pressed={t.tier === selectedTier}
                  onClick={() => setSelectedTier(t.tier)}
                >
                  {TIER_LABEL[t.tier]}
                </button>
              ))}
            </div>
          )}
          <div className="browse-card-actions">
            <button
              className={`btn browse-add-btn${isSelected ? " ghost" : ""}`}
              onClick={() => onAddRecipe(chosenTier?.recipeId ?? d.defaultRecipeId, d.name)}
              aria-label={`${isSelected ? "Added" : "Add"} ${d.name} to tonight's plan`}
            >
              {isSelected ? "✓ Added" : "+ Add to tonight's plan"}
            </button>
            {onDetails && (
              <button className="browse-info" aria-label={`View ${d.name}`} onClick={() => onDetails(d.defaultRecipeId)}>
                ⓘ
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Legacy compact row (used in home picker)
  const addOrExpand = () => {
    if (d.tiers.length <= 1) onAddRecipe(d.defaultRecipeId, d.name);
    else setExpanded(open ? null : d.dishId);
  };
  return (
    <div className="browse-line">
      <button
        className={`pick-row browse-row${isSelected ? " on" : ""}`}
        aria-expanded={d.tiers.length > 1 ? open : undefined}
        aria-label={`${isSelected ? "Added" : "Add"} ${d.name}${d.tiers.length > 1 ? `, ${d.tiers.length} versions` : ""}`}
        onClick={addOrExpand}
      >
        <span className="pick-main" style={{ pointerEvents: "none" }}>
          <span className="swatch" style={{ background: colorFor(d.defaultRecipeId) }} />
          <span className="node-title">{d.name}</span>
          {d.tiers.length > 1 ? <span className="ways">{d.tiers.length} ways</span> : null}
          {defaultTier?.kcal ? <span className="kcal-chip">{defaultTier.kcal} kcal</span> : null}
          {defaultTier?.totalMins ? <span className="dur">{defaultTier.totalMins}m</span> : null}
          <span className="browse-add">{isSelected ? "✓ Added" : d.tiers.length > 1 ? "Choose ▾" : "+ Add"}</span>
        </span>
      </button>
      {onDetails && (
        <button className="browse-info" aria-label={`View ${d.name}`} onClick={() => onDetails(d.defaultRecipeId)}>ⓘ</button>
      )}
      {open && d.tiers.length > 1 && (
        <div className="tier-pick" role="group" aria-label={`Choose a version of ${d.name}`}>
          {d.tiers.map((t) => (
            <button key={t.recipeId} className="chip-toggle" onClick={() => onAddRecipe(t.recipeId, d.name)}>
              {TIER_LABEL[t.tier]} · {t.totalMins}m
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function LibraryBrowser({
  provider = defaultLibrary,
  selectedDishIds = [],
  diets = [],
  maxMins,
  onAddRecipe,
  onDetails,
  showTierInline = false,
}: {
  provider?: LibraryProvider;
  selectedDishIds?: string[]; // dishIds already in the plan (any tier)
  diets?: string[];
  maxMins?: number;
  onAddRecipe: (recipeId: string, dishName?: string) => void;
  onDetails?: (recipeId: string) => void;
  showTierInline?: boolean; // V2 Browse: show tier selector inside card, not expand/collapse
}) {
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const reqRef = useRef(0);

  useEffect(() => {
    provider.getCategories().then(setCategories).catch(() => setCategories([]));
  }, [provider]);

  const runSearch = useCallback(
    async (page: number, append: boolean) => {
      const id = ++reqRef.current;
      setLoading(true);
      setError(false);
      try {
        const r = await provider.searchDishes({
          q: query.trim() || undefined,
          category: activeCategory ?? undefined,
          diets: diets.length ? diets : undefined,
          maxMins,
          page,
          pageSize: PAGE_SIZE,
        });
        if (id !== reqRef.current) return; // a newer search superseded this one
        setResult((prev) => (append && prev ? { ...r, dishes: [...prev.dishes, ...r.dishes] } : r));
      } catch {
        if (id === reqRef.current) setError(true);
      } finally {
        if (id === reqRef.current) setLoading(false);
      }
    },
    [provider, query, activeCategory, diets, maxMins],
  );

  // Debounced reset-to-page-1 whenever the query / category / filters change.
  useEffect(() => {
    const t = setTimeout(() => void runSearch(1, false), 180);
    return () => clearTimeout(t);
  }, [runSearch]);

  const selected = new Set(selectedDishIds);
  const dishes = result?.dishes ?? [];
  const hasMore = result ? result.page * result.pageSize < result.total : false;

  return (
    <div className="picker">
      <input
        className="url-input browse-search"
        type="search"
        value={query}
        placeholder="Search recipes by name…"
        aria-label="Search recipes"
        onChange={(e) => setQuery(e.target.value)}
      />

      <div className="browse-filters" role="group" aria-label="Categories">
        <button className={`chip-toggle${activeCategory === null ? " on" : ""}`} aria-pressed={activeCategory === null} onClick={() => setActiveCategory(null)}>
          All
        </button>
        {categories.map((c) => (
          <button
            key={c.category}
            className={`chip-toggle${activeCategory === c.category ? " on" : ""}`}
            aria-pressed={activeCategory === c.category}
            onClick={() => setActiveCategory(c.category)}
          >
            {c.category} <span className="count">{c.count}</span>
          </button>
        ))}
      </div>

      {error ? (
        <div className="idle">Couldn't load recipes. Check your connection and try again.</div>
      ) : dishes.length === 0 && !loading ? (
        <div className="idle">No dishes match — loosen a filter, or paste / ask AI for a new one.</div>
      ) : (
        <>
          <div className="card-grid">
            {dishes.map((d) => (
              <DishCard
                key={d.dishId}
                d={d}
                isSelected={selected.has(d.dishId)}
                expanded={expanded}
                setExpanded={setExpanded}
                onAddRecipe={onAddRecipe}
                onDetails={onDetails}
                showTierInline={showTierInline}
              />
            ))}
          </div>

          {loading && <div className="idle" role="status">Loading…</div>}
          {hasMore && !loading && (
            <button className="link" onClick={() => void runSearch((result?.page ?? 1) + 1, true)}>
              Show more ({dishes.length} of {result?.total})
            </button>
          )}
        </>
      )}
    </div>
  );
}
