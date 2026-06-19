import { Suspense, lazy, useEffect, useMemo, useRef, useState } from "react";
import { applyEvent, compile, dishIdOf, formatClock, parseClock, paceCategoryOf, scaleRecipe, thaliV1, goldenLibrary, tierOf, updatePace, variantsForDish, type ComplexityTier, type MasterExecutionPlan, type PaceModel, type RecipeGraph } from "@tutti/engine";
import { usePersistentState, type Screen } from "./state";
import { Shell } from "./Shell";
import { ErrorBoundary } from "./ErrorBoundary";
import { CookScreen } from "./CookScreen"; // eager — the critical cook path must be instant
import { DEFAULT_KITCHEN, toKitchenProfile, type KitchenUi } from "./kitchenModel";
import type { LearnEvent } from "./StatsScreen";
import { shouldLearn } from "./learn";
import { addRecent, removeMeal, upsertSaved, type SavedMeal } from "./meals";
import { formatPlan, shareOrCopy } from "./share";
import { recordCook, setRating, setNote, type NotesMap } from "./recipeNotes";
import { toggleStaple, migratePantry, addPantryItem, removePantryItem, type Pantry, type PantryItem } from "./pantry";
import { exportData, resetData } from "./appData";
import { isStringArray, isPlainObject, isMealArray, isScreen, isClock, isPlan } from "./validators";
import { factorForPeople } from "./servings";
import { useInstallPrompt } from "./useInstallPrompt";
import { addPhoto, resizeToThumb, type Photos } from "./photos";
import { mealFit } from "./mealFit";
import { assignMeal, clearSlot, mealsInDays, toISO, type Calendar, type PlannedMeal } from "./calendar";
import { addCollection, removeCollection, toggleInCollection, isValidCollections, type Collection } from "./collections";
import { recipeStore, library } from "./library";

// Secondary screens are lazy-loaded so the initial/cook bundle stays lean (Brief v10).
// AddRecipe pulls @tutti/ingest, so splitting it keeps the parser out of the entry chunk.
const Builder = lazy(() => import("./Builder").then((m) => ({ default: m.Builder })));
const KitchenScreen = lazy(() => import("./KitchenScreen").then((m) => ({ default: m.KitchenScreen })));
const MealsScreen = lazy(() => import("./MealsScreen").then((m) => ({ default: m.MealsScreen })));
const RecipeDetailScreen = lazy(() => import("./RecipeDetailScreen").then((m) => ({ default: m.RecipeDetailScreen })));
const MiseScreen = lazy(() => import("./MiseScreen").then((m) => ({ default: m.MiseScreen })));
const SettingsScreen = lazy(() => import("./SettingsScreen").then((m) => ({ default: m.SettingsScreen })));
const OnboardingScreen = lazy(() => import("./OnboardingScreen").then((m) => ({ default: m.OnboardingScreen })));
const PreviewScreen = lazy(() => import("./PreviewScreen").then((m) => ({ default: m.PreviewScreen })));
const AddRecipe = lazy(() => import("./AddRecipe").then((m) => ({ default: m.AddRecipe })));
const ShoppingScreen = lazy(() => import("./ShoppingScreen").then((m) => ({ default: m.ShoppingScreen })));
const StatsScreen = lazy(() => import("./StatsScreen").then((m) => ({ default: m.StatsScreen })));
const BrowseScreen = lazy(() => import("./BrowseScreen").then((m) => ({ default: m.BrowseScreen })));
const StudioScreen = lazy(() => import("./StudioScreen").then((m) => ({ default: m.StudioScreen })));
const CalendarScreen = lazy(() => import("./CalendarScreen").then((m) => ({ default: m.CalendarScreen })));
const PantryScreen = lazy(() => import("./PantryScreen").then((m) => ({ default: m.PantryScreen })));

const Loading = () => <div className="idle" role="status">Loading…</div>;

// Sample recipes available to search/resolve (golden library + the thali demo). These seed the
// searchable pool only — NONE are pre-selected. Tutti is a general meal-plan builder, not a thali.
const SAMPLE_RECIPES: RecipeGraph[] = (() => {
  const map = new Map<string, RecipeGraph>();
  for (const r of [...goldenLibrary, ...thaliV1.recipes]) map.set(r.recipeId, r);
  return [...map.values()];
})();

const SCREEN_NAMES: Record<Screen, string> = {
  onboarding: "Welcome", kitchen: "Your kitchen", home: "Home", calendar: "Meal calendar", addRecipe: "Add a dish", studio: "Recipe Studio",
  browse: "Browse recipes", recipe: "Recipe", shopping: "Shopping list", pantry: "Pantry", stats: "Your pace", meals: "Your meals", settings: "Settings",
  preview: "Plan preview", ready: "Get ready", cook: "Cook mode",
};

export function App() {
  const [screen, setScreen] = usePersistentState<Screen>("tutti.screen", "home", isScreen);
  const [onboarded, setOnboarded] = usePersistentState<boolean>("tutti.onboarded", false);
  const [kitchen, setKitchen] = usePersistentState<KitchenUi>("tutti.kitchen", DEFAULT_KITCHEN, isPlainObject);
  const [dishes, setDishes] = usePersistentState<string[]>("tutti.dishes", [], isStringArray);
  // Optional serve time: null = cook ASAP (start now). Set only when the user opts into a time.
  const [serveAt, setServeAt] = usePersistentState<string | null>("tutti.serveAt", null, (v) => v === null || isClock(v));
  const [pro, setPro] = usePersistentState<boolean>("tutti.pro", false);
  // Marks a cook as in-progress so it's always resumable (set on start, cleared on finish/abandon).
  const [cookStartedAt, setCookStartedAt] = usePersistentState<number | null>("tutti.cookStartedAt", null, (v) => v === null || typeof v === "number");
  const [calendar, setCalendar] = usePersistentState<Calendar>("tutti.calendar", {}, isPlainObject);
  const [shopDays, setShopDays] = useState<string[] | null>(null);
  const [diet, setDiet] = usePersistentState<string[]>("tutti.diet", [], isStringArray);
  const [collections, setCollections] = usePersistentState<Collection[]>("tutti.collections", [], isValidCollections);
  const toggleDiet = (d: string) => setDiet((p) => (p.includes(d) ? p.filter((x) => x !== d) : [...p, d]));
  const [candidates, setCandidates] = usePersistentState<RecipeGraph[]>("tutti.candidates", [], Array.isArray);
  const [avoid, setAvoid] = usePersistentState<string[]>("tutti.avoid", [], isStringArray);
  const [servingsFactor, setServingsFactor] = usePersistentState<Record<string, number>>("tutti.servingsFactor", {}, isPlainObject);
  // Adaptive pace model (Doc 2 §7): per-category multipliers learned from the user's own cooks.
  // Fed into compile() so elastic estimates adjust. Populated by telemetry in the learning loop
  // (Brief v6) — kept honest here: empty until real data exists, so it's identity by default.
  const [pace, setPace] = usePersistentState<PaceModel>("tutti.pace", {}, isPlainObject);
  const [learnPace, setLearnPace] = usePersistentState<boolean>("tutti.learnPace", true);
  const [events, setEvents] = usePersistentState<LearnEvent[]>("tutti.events", [], Array.isArray);
  const [meals, setMeals] = usePersistentState<SavedMeal[]>("tutti.meals", [], isMealArray);
  const [notes, setNotes] = usePersistentState<NotesMap>("tutti.recipeNotes", {}, isPlainObject);
  const [detailRecipe, setDetailRecipe] = useState<RecipeGraph | null>(null);
  // Pantry: stored loosely (back-compat with the old string[] of staples) then migrated on read.
  const [pantryStored, setPantry] = usePersistentState<Pantry>("tutti.pantry", [], Array.isArray);
  const pantry = useMemo(() => migratePantry(pantryStored), [pantryStored]);
  const [people, setPeople] = usePersistentState<number>("tutti.people", 4, (v) => typeof v === "number");
  const [metric, setMetric] = usePersistentState<boolean>("tutti.metric", false, (v) => typeof v === "boolean");
  const [photos, setPhotos] = usePersistentState<Photos>("tutti.photos", {}, isPlainObject);
  const onPhoto = (id: string, file: File) => {
    resizeToThumb(file).then((u) => setPhotos((p) => addPhoto(p, id, u))).catch(() => { /* unsupported / too big */ });
  };
  const { canInstall, promptInstall } = useInstallPrompt();
  const focusAtRef = useRef<number | null>(null); // wall-clock boundary for honest actual-duration capture
  // Full graphs cached on-device (IndexedDB) — recipes pulled from the server library. Loaded once on
  // mount so a server-sourced dish in a saved meal still resolves (and cooks) offline.
  const [cachedRecipes, setCachedRecipes] = useState<RecipeGraph[]>([]);
  useEffect(() => { recipeStore.all().then(setCachedRecipes).catch(() => { /* no cache yet */ }); }, []);
  // Resolution pool: bundled starter ∪ on-device cache ∪ the user's own recipes (candidates win on id).
  const allRecipes = (() => {
    const map = new Map<string, RecipeGraph>();
    for (const r of [...SAMPLE_RECIPES, ...cachedRecipes, ...candidates]) map.set(r.recipeId, r);
    return [...map.values()];
  })();
  const toggleAvoid = (a: string) => setAvoid((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));
  const factorOf = (id: string) => servingsFactor[id] ?? 1;
  const setFactor = (id: string, f: number) => setServingsFactor((p) => ({ ...p, [id]: f }));
  // Meal-level "cooking for N people?" — scale every selected dish at once (Brief v26).
  const setPeopleScaled = (n: number) => {
    const c = Math.max(1, Math.min(40, n));
    setPeople(c);
    setServingsFactor((p) => {
      const next = { ...p };
      for (const r of allRecipes) if (dishes.includes(r.recipeId)) next[r.recipeId] = factorForPeople(r.servings, c);
      return next;
    });
  };
  const scaled = (r: RecipeGraph) => (factorOf(r.recipeId) === 1 ? r : scaleRecipe(r, factorOf(r.recipeId)));
  // Initial plan is EMPTY (no thali). The user builds their own; this is just a valid placeholder.
  const [plan, setPlan] = usePersistentState<MasterExecutionPlan>(
    "tutti.plan",
    compile([], toKitchenProfile(DEFAULT_KITCHEN), "19:00:00", pace),
    isPlan,
  );

  const nowMins = (() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  })();

  // Live preview (pure, cheap to recompute). Serve time is OPTIONAL: when the user hasn't set one
  // we cook ASAP — a probe compile measures the hands-on span, then we anchor the serve to now+span.
  const selectedRecipes = allRecipes.filter((r) => dishes.includes(r.recipeId)).map(scaled);
  const probe = selectedRecipes.length
    ? compile(selectedRecipes, toKitchenProfile(kitchen), serveAt ?? "20:00:00", pace)
    : null;
  const span = probe ? parseClock(probe.projectedServeTime) - parseClock(probe.startTime) : 0;
  const asapServe = formatClock(nowMins + span);
  const target = serveAt ?? asapServe; // effective serve time fed to compile
  const previewPlan = selectedRecipes.length
    ? compile(selectedRecipes, toKitchenProfile(kitchen), target, pace)
    : null;
  const soloMins = selectedRecipes.reduce((a, r) => a + r.nodes.reduce((s, n) => s + n.duration.estMins, 0), 0);
  const makespan = previewPlan ? parseClock(previewPlan.projectedServeTime) - parseClock(previewPlan.startTime) : 0;
  const startMins = parseClock(target) - makespan;
  const feasible = serveAt ? startMins >= nowMins : true; // cooking ASAP is always feasible
  const earliestServe = asapServe;
  // Whole-meal feasibility dial: tier choices change `makespan` upstream; this reads it back.
  const fit = mealFit(makespan, kitchen.cooks, serveAt, feasible);

  const complete = (id: string) => {
    // Honest pace learning (Doc 10 Loop A): measure real elapsed time between completions and feed
    // the EMA — only for elastic hands-on tasks, only in-band samples, only when opted in. Never
    // fabricate: a missing/out-of-band interval teaches nothing.
    const node = plan.nodes.find((n) => n.nodeId === id);
    const now = Date.now();
    if (node && focusAtRef.current != null) {
      const actualMins = (now - focusAtRef.current) / 60000;
      if (shouldLearn(node, actualMins, learnPace)) {
        const category = paceCategoryOf(node);
        setPace((p) => updatePace(p, { category, actualMins, estMins: node.duration.estMins }));
        const ev: LearnEvent = { type: "node_completed", recipeId: node.recipeId, nodeId: id, category, plannedMins: node.duration.estMins, actualMins: Math.round(actualMins * 10) / 10, at: now };
        setEvents((e) => [...e, ev].slice(-200));
      }
    }
    focusAtRef.current = now;
    setPlan((prev) => applyEvent(prev, { type: "complete", nodeId: id, at: "" }));
  };
  const undo = (id: string) => setPlan((prev) => applyEvent(prev, { type: "undo", nodeId: id, at: "" }));
  const toggleDish = (id: string) =>
    setDishes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  // Resolve any recipeId to its dish group (so a meal holds at most one variant per dish).
  const dishIdByRecipe = new Map(allRecipes.map((r) => [r.recipeId, dishIdOf(r)]));
  const dishOf = (id: string) => dishIdByRecipe.get(id) ?? id;
  const addCandidate = (g: RecipeGraph) => {
    setCandidates((prev) => [...prev.filter((c) => c.recipeId !== g.recipeId), g]);
    void recipeStore.put(g); // cache the full graph so this dish cooks offline even if it came from the server
    const gDish = dishIdOf(g);
    setDishes((prev) => {
      // Drop any other variant of the same dish, then add g (one variant per dish).
      const others = prev.filter((id) => (dishOf(id) !== gDish));
      return others.includes(g.recipeId) ? others : [...others, g.recipeId];
    });
    setScreen("home"); // adding a recipe returns to the builder
  };
  // Browse-at-scale (Phase D): the catalog hands back a recipeId — resolve+cache the full graph
  // (RemoteProvider stores it for offline cook), then select it / open its detail.
  const pickLibraryRecipe = (recipeId: string) => {
    void library.getRecipe(recipeId).then((g) => { if (g) addCandidate(g); });
  };
  const openLibraryRecipe = (recipeId: string) => {
    void library.getRecipe(recipeId).then((g) => { if (g) { setDetailRecipe(g); setScreen("recipe"); } });
  };
  // Studio: remove one of my recipes (and drop it from the plan if selected).
  const removeCandidate = (id: string) => {
    setCandidates((prev) => prev.filter((c) => c.recipeId !== id));
    setDishes((prev) => prev.filter((d) => d !== id));
  };
  // Studio: duplicate a recipe as a new editable copy (same dish, unverified, own id).
  const duplicateCandidate = (id: string) => {
    const src = allRecipes.find((r) => r.recipeId === id);
    if (!src) return;
    const copy: RecipeGraph = {
      ...src,
      recipeId: `${src.recipeId}_copy${Date.now().toString(36)}`,
      name: `${src.name} (copy)`,
      dishId: dishIdOf(src),
      verified: false,
    };
    setCandidates((prev) => [...prev, copy]);
  };
  // Switch a dish to a different complexity tier: swap its recipeId in the plan, carrying servings.
  const setTier = (dishId: string, tier: ComplexityTier) => {
    const variant = variantsForDish(allRecipes, dishId).find((r) => tierOf(r) === tier);
    if (!variant) return;
    setDishes((prev) => {
      const prior = prev.find((id) => dishOf(id) === dishId);
      if (prior === variant.recipeId) return prev;
      if (prior) setServingsFactor((p) => (p[prior] ? { ...p, [variant.recipeId]: p[prior]! } : p));
      return prev.map((id) => (dishOf(id) === dishId ? variant.recipeId : id));
    });
  };
  // A recognisable name from the dishes themselves, falling back to the date.
  const mealName = () => {
    const names = selectedRecipes.map((r) => r.name);
    if (names.length === 0) return `Meal of ${new Date().toLocaleDateString()}`;
    const head = names.slice(0, 3).join(", ");
    return names.length > 3 ? `${head} +${names.length - 3} more` : head;
  };
  const buildPlan = () => {
    if (!previewPlan) return; // need at least one recipe — no thali fallback
    setCookStartedAt(null); // building a new plan ends any prior in-progress cook (confirmed in the Builder)
    setPlan(previewPlan);
    // Auto-save the built meal (Brief v43) — no manual Save step; dedupe by dish-set so rebuilding
    // the same meal refreshes one entry instead of cluttering Meals.
    const meal: SavedMeal = { id: `m${Date.now()}`, name: mealName(), dishIds: dishes, servings: servingsFactor, target, savedAt: Date.now(), kind: "saved" };
    setMeals((m) => upsertSaved(m, meal));
    setScreen("preview");
  };
  const startCooking = () => {
    if (!previewPlan) return;
    setPlan(previewPlan);
    setCookStartedAt(Date.now()); // the cook is now live & resumable
    focusAtRef.current = Date.now(); // first completion measures from cook start
    setScreen("cook");
  };
  const reset = () => {
    // A finished cook becomes a "recently cooked" meal (Brief v12) and bumps each dish's cook
    // count for the notes/ratings cookbook (Brief v17).
    if (dishes.length) {
      const at = Date.now();
      const rec: SavedMeal = { id: `r${at}`, name: `Cooked ${new Date().toLocaleDateString()}`, dishIds: dishes, servings: servingsFactor, target, savedAt: at, kind: "recent" };
      setMeals((m) => addRecent(m, rec));
      setNotes((nm) => dishes.reduce((acc, id) => recordCook(acc, id, at), nm));
    }
    setCookStartedAt(null); // cook finished
    setPlan(previewPlan ?? plan);
    setScreen("home");
  };
  // Intentionally abandon an in-progress cook (from the resume bar) without finishing it.
  const endCook = () => { setCookStartedAt(null); setScreen("home"); };
  // Compile a plan straight from a saved/planned meal's snapshot (dishIds + servings + serve time),
  // without waiting for the dishes/servings state we just set to flush. Mirrors the live previewPlan
  // computation: ASAP (now + hands-on span) when no serve time was saved.
  const compileMealPlan = (dishIds: string[], servings: Record<string, number>, serveTime: string | null): MasterExecutionPlan | null => {
    const known = new Set(allRecipes.map((r) => r.recipeId));
    const recipes = dishIds
      .filter((id) => known.has(id))
      .map((id) => {
        const r = allRecipes.find((x) => x.recipeId === id)!;
        const f = servings[id] ?? 1;
        return f === 1 ? r : scaleRecipe(r, f);
      });
    if (!recipes.length) return null;
    const kp = toKitchenProfile(kitchen);
    const probe = compile(recipes, kp, serveTime ?? "20:00:00", pace);
    const span = parseClock(probe.projectedServeTime) - parseClock(probe.startTime);
    const tgt = serveTime ?? formatClock(nowMins + span);
    return compile(recipes, kp, tgt, pace);
  };
  // Restore a saved/recent meal. It was already built when saved, so skip the redundant Build step
  // and jump straight to its plan preview (where Start cooking / Edit live). A live cook is sacred:
  // we never overwrite its plan here — fall back to the Builder, whose two-tap confirm guards it.
  const restoreMeal = (meal: SavedMeal) => {
    const known = new Set(allRecipes.map((r) => r.recipeId));
    setDishes(meal.dishIds.filter((id) => known.has(id)));
    setServingsFactor(meal.servings);
    setServeAt(meal.target ?? null);
    const built = cookLive ? null : compileMealPlan(meal.dishIds, meal.servings, meal.target ?? null);
    if (built) { setCookStartedAt(null); setPlan(built); setScreen("preview"); }
    else { setScreen("home"); }
  };
  // Calendar (Brief v45): plan saved meals onto days; cooking a day jumps straight to its built plan.
  const todayISO = toISO(new Date());
  const cookPlanned = (pm: PlannedMeal) => {
    const known = new Set(allRecipes.map((r) => r.recipeId));
    setDishes(pm.dishIds.filter((id) => known.has(id)));
    setServingsFactor(pm.servings);
    setServeAt(pm.target ?? null);
    const built = cookLive ? null : compileMealPlan(pm.dishIds, pm.servings, pm.target ?? null);
    if (built) { setCookStartedAt(null); setPlan(built); setScreen("preview"); }
    else { setScreen("home"); }
  };
  const shopForDays = (days: string[]) => { setShopDays(days); setScreen("shopping"); };
  // Resolve the week's planned meals to (scaled) recipes so the shopping list sums across days.
  const weekShopRecipes = (() => {
    if (!shopDays) return null;
    const out: RecipeGraph[] = [];
    for (const pm of mealsInDays(calendar, shopDays)) {
      for (const id of pm.dishIds) {
        const r = allRecipes.find((x) => x.recipeId === id);
        if (r) { const f = pm.servings[id] ?? 1; out.push(f === 1 ? r : scaleRecipe(r, f)); }
      }
    }
    return out;
  })();
  // Screen-change a11y (Doc 7 §12): move focus to the new screen and announce it (SPA route fix).
  const [announce, setAnnounce] = useState("");
  const focusRef = useRef<HTMLElement>(null);
  const firstMount = useRef(true);
  useEffect(() => {
    if (firstMount.current) { firstMount.current = false; return; }
    setAnnounce(`${SCREEN_NAMES[screen]} screen`);
    focusRef.current?.focus();
  }, [screen]);

  // Auto-resume (Brief v43): if a cook was in progress when the app was last closed, drop straight
  // back into it on reopen — even if the user had wandered off to another tab first.
  const resumedRef = useRef(false);
  useEffect(() => {
    if (resumedRef.current) return;
    resumedRef.current = true;
    if (cookStartedAt != null && plan.nodes.length > 0 && screen !== "cook") setScreen("cook");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whole-app "Resume cooking" bar: shown on every screen except the cook screen while a cook is
  // still IN PROGRESS. A finished cook (every step done) has nothing left to resume, so the bar
  // clears even when the user leaves the "Dinner is served" finale via nav instead of tapping
  // "Cook it again". cookLive stays "a cook was started" (the finale keeps undo, which must remain
  // resumable); only the bar gates on remaining work.
  const cookDone = plan.nodes.filter((n) => n.status === "completed").length;
  const cookLive = cookStartedAt != null && plan.nodes.length > 0;
  const cookInProgress = cookLive && cookDone < plan.nodes.length;
  const cookBar = cookInProgress && screen !== "cook"
    ? { done: cookDone, total: plan.nodes.length, onResume: () => setScreen("cook"), onEnd: endCook }
    : null;

  if (!onboarded) {
    return (
      <div className="wrap">
        <main>
          <Suspense fallback={<Loading />}>
            <OnboardingScreen onDone={() => { setOnboarded(true); setScreen("kitchen"); }} />
          </Suspense>
        </main>
      </div>
    );
  }

  return (
    <Shell screen={screen} onNavigate={setScreen} cookBar={cookBar}>
      <div role="status" aria-live="polite" className="sr-only">{announce}</div>
      <main id="screen-main" ref={focusRef} tabIndex={-1} className="screen-focus">
      <ErrorBoundary key={screen} onHome={() => setScreen("home")}>
      <Suspense fallback={<Loading />}>

      {screen === "cook" ? (
        <CookScreen
          plan={plan}
          pro={pro}
          onComplete={complete}
          onUndo={undo}
          onReset={reset}
          onLeave={() => setScreen("home")}
          notes={notes}
          dishesForReview={[...new Set(plan.nodes.map((n) => n.recipeId))]}
          onRate={(id, n) => setNotes((m) => setRating(m, id, n))}
          onNote={(id, s) => setNotes((m) => setNote(m, id, s))}
          photos={photos}
          onPhoto={onPhoto}
        />
      ) : screen === "kitchen" ? (
        <KitchenScreen kitchen={kitchen} onChange={setKitchen} avoid={avoid} onToggleAvoid={toggleAvoid} onDone={() => setScreen("home")} />
      ) : screen === "addRecipe" ? (
        <AddRecipe onAdd={addCandidate} onBack={() => setScreen("home")} />
      ) : screen === "browse" ? (
        <BrowseScreen
          diets={diet}
          selectedDishIds={dishes.map(dishOf)}
          onAddRecipe={pickLibraryRecipe}
          onDetails={openLibraryRecipe}
          onBack={() => setScreen("home")}
        />
      ) : screen === "recipe" && detailRecipe ? (
        <RecipeDetailScreen
          recipe={detailRecipe}
          note={notes[detailRecipe.recipeId]}
          metric={metric}
          photo={photos[detailRecipe.recipeId]}
          siblings={variantsForDish(allRecipes, dishIdOf(detailRecipe))}
          onPickVariant={setDetailRecipe}
          collections={collections}
          onToggleCollection={(cid, rid) => setCollections((c) => toggleInCollection(c, cid, rid))}
          onAdd={() => addCandidate(detailRecipe)}
          onBack={() => setScreen("browse")}
        />
      ) : screen === "shopping" ? (
        <ShoppingScreen
          recipes={weekShopRecipes ?? (selectedRecipes.length ? selectedRecipes : allRecipes)}
          onBack={() => { if (shopDays) { setShopDays(null); setScreen("calendar"); } else setScreen("home"); }}
          onPantry={() => setScreen("pantry")}
          pantry={pantry}
          metric={metric}
          onToggleStaple={(name) => setPantry((p) => toggleStaple(migratePantry(p), name))}
        />
      ) : screen === "pantry" ? (
        <PantryScreen
          pantry={pantry}
          today={todayISO}
          onAdd={(item: PantryItem) => setPantry((p) => addPantryItem(migratePantry(p), item))}
          onRemove={(name) => setPantry((p) => removePantryItem(migratePantry(p), name))}
          onToggleStaple={(name) => setPantry((p) => toggleStaple(migratePantry(p), name))}
          onBack={() => setScreen("home")}
        />
      ) : screen === "calendar" ? (
        <CalendarScreen
          calendar={calendar}
          meals={meals}
          today={todayISO}
          onAssign={(d, s, m) => setCalendar((c) => assignMeal(c, d, s, m))}
          onClear={(d, s) => setCalendar((c) => clearSlot(c, d, s))}
          onCook={cookPlanned}
          onShopWeek={shopForDays}
        />
      ) : screen === "meals" ? (
        <MealsScreen
          meals={meals}
          recipes={allRecipes}
          onRestore={restoreMeal}
          onRemove={(id) => setMeals((m) => removeMeal(m, id))}
          onBack={() => setScreen("home")}
        />
      ) : screen === "settings" ? (
        <SettingsScreen
          pro={pro}
          onTogglePro={() => setPro(!pro)}
          learnPace={learnPace}
          onToggleLearn={() => setLearnPace(!learnPace)}
          metric={metric}
          onToggleMetric={() => setMetric(!metric)}
          canInstall={canInstall}
          onInstall={promptInstall}
          diet={diet}
          onToggleDiet={toggleDiet}
          onKitchen={() => setScreen("kitchen")}
          onPantry={() => setScreen("pantry")}
          onPace={() => setScreen("stats")}
          onExport={() => { void shareOrCopy("Tutti data", exportData(localStorage)); }}
          onReset={() => {
            resetData(localStorage);
            setPace({}); setEvents([]); setMeals([]); setNotes({}); setPantry([]);
            setDishes([]); setServeAt(null); setLearnPace(true); setPro(false);
            setDiet([]); setCollections([]); setCalendar({});
            setScreen("home");
          }}
          onBack={() => setScreen("home")}
        />
      ) : screen === "stats" ? (
        <StatsScreen
          pace={pace}
          events={events}
          learnPace={learnPace}
          onToggleLearn={() => setLearnPace(!learnPace)}
          onForget={() => { setPace({}); setEvents([]); }}
          onBack={() => setScreen("home")}
        />
      ) : screen === "studio" ? (
        <StudioScreen
          candidates={candidates}
          photos={photos}
          collections={collections}
          onNew={() => setScreen("addRecipe")}
          onOpen={(r) => { setDetailRecipe(r); setScreen("recipe"); }}
          onDuplicate={duplicateCandidate}
          onRemove={removeCandidate}
          onAddCollection={(name) => setCollections((c) => addCollection(c, name, `col${Date.now().toString(36)}`))}
          onRemoveCollection={(id) => setCollections((c) => removeCollection(c, id))}
        />
      ) : screen === "preview" ? (
        <PreviewScreen
          plan={plan}
          onStart={() => setScreen("ready")}
          onEdit={() => setScreen("home")}
          onShare={() => { void shareOrCopy("Tutti plan", formatPlan(plan, selectedRecipes.map((r) => r.name))); }}
        />
      ) : screen === "ready" ? (
        <MiseScreen
          recipes={selectedRecipes}
          kitchen={kitchen}
          metric={metric}
          notes={notes}
          photos={photos}
          onStart={startCooking}
          onBack={() => setScreen("preview")}
        />
      ) : screen === "home" ? (
        <Builder
          selected={selectedRecipes}
          factorOf={factorOf}
          onSetFactor={setFactor}
          onRemove={toggleDish}
          peopleTarget={people}
          onPeople={setPeopleScaled}
          serveAt={serveAt}
          onServeAt={setServeAt}
          soloMins={soloMins}
          interleavedMins={makespan}
          feasible={feasible}
          earliestServe={earliestServe}
          onBuild={buildPlan}
          onPaste={() => setScreen("addRecipe")}
          onAskAI={() => setScreen("addRecipe")}
          library={goldenLibrary}
          candidates={candidates}
          notes={notes}
          photos={photos}
          avoid={avoid}
          diets={diet}
          selectedIds={dishes}
          onPick={addCandidate}
          onDetails={(r) => { setDetailRecipe(r); setScreen("recipe"); }}
          onSetTier={setTier}
          onShopping={() => setScreen("shopping")}
          cookLive={cookLive}
          fit={fit}
        />
      ) : (
        // Any screen we can't render here (e.g. a stale persisted route, or "recipe" after a
        // reload dropped the in-memory detailRecipe) quietly bounces back to Home rather than
        // showing a dead-end placeholder.
        <Redirect onHome={() => setScreen("home")} />
      )}
      </Suspense>
      </ErrorBoundary>
      </main>

      <footer className="scaffold-note">
        Tutti — the whole meal, ready at once. Cooks fully offline; nothing leaves your device.
      </footer>
    </Shell>
  );
}

// Fallback for an unrenderable screen: send the user Home on mount instead of stranding them.
function Redirect({ onHome }: { onHome: () => void }) {
  useEffect(() => { onHome(); }, [onHome]);
  return <Loading />;
}
