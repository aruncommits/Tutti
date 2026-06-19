import { useCallback, useEffect, useRef, useState } from "react";
import type { ComplexityTier } from "@tutti/engine";
import { colorFor } from "./dishColors";
import { library as defaultLibrary, type CategoryCount, type LibraryProvider, type SearchResult } from "./library";

// Browse-at-scale surface (Phase D): category-first, server-backed, paginated. Lists DISHES (one card
// per dish, collapsing tier variants — the "hundreds of biryanis" fix); a multi-tier dish expands to
// let you pick simple/standard/elaborate. Reads through a LibraryProvider so it works against the live
// API and falls back to the bundled offline starter automatically.

const PAGE_SIZE = 12;
const TIER_LABEL: Record<ComplexityTier, string> = { simple: "Simple", moderate: "Standard", complex: "Elaborate" };

export function LibraryBrowser({
  provider = defaultLibrary,
  selectedDishIds = [],
  diets = [],
  maxMins,
  onAddRecipe,
  onDetails,
}: {
  provider?: LibraryProvider;
  selectedDishIds?: string[]; // dishIds already in the plan (any tier)
  diets?: string[];
  maxMins?: number;
  onAddRecipe: (recipeId: string) => void;
  onDetails?: (recipeId: string) => void;
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
            {dishes.map((d) => {
              const isOn = selected.has(d.dishId);
              const open = expanded === d.dishId;
              const def = d.tiers.find((t) => t.recipeId === d.defaultRecipeId) ?? d.tiers[0];
              const addOrExpand = () => {
                if (d.tiers.length <= 1) onAddRecipe(d.defaultRecipeId);
                else setExpanded(open ? null : d.dishId);
              };
              return (
                <div className="browse-line" key={d.dishId}>
                  <button
                    className={`pick-row browse-row${isOn ? " on" : ""}`}
                    aria-expanded={d.tiers.length > 1 ? open : undefined}
                    aria-label={`${isOn ? "Added" : "Add"} ${d.name}${d.tiers.length > 1 ? `, ${d.tiers.length} versions` : ""}`}
                    onClick={addOrExpand}
                  >
                    <span className="pick-main" style={{ pointerEvents: "none" }}>
                      <span className="swatch" style={{ background: colorFor(d.defaultRecipeId) }} />
                      <span className="node-title">{d.name}</span>
                      {d.tiers.length > 1 ? <span className="ways">{d.tiers.length} ways</span> : null}
                      {def?.kcal ? <span className="kcal-chip">{def.kcal} kcal</span> : null}
                      {def?.totalMins ? <span className="dur">{def.totalMins}m</span> : null}
                      <span className="browse-add">{isOn ? "✓ Added" : d.tiers.length > 1 ? "Choose ▾" : "+ Add"}</span>
                    </span>
                  </button>
                  {onDetails && (
                    <button className="browse-info" aria-label={`View ${d.name}`} onClick={() => onDetails(d.defaultRecipeId)}>ⓘ</button>
                  )}
                  {open && d.tiers.length > 1 && (
                    <div className="tier-pick" role="group" aria-label={`Choose a version of ${d.name}`}>
                      {d.tiers.map((t) => (
                        <button key={t.recipeId} className="chip-toggle" onClick={() => onAddRecipe(t.recipeId)}>
                          {TIER_LABEL[t.tier]} · {t.totalMins}m
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
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
