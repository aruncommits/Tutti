import { Suspense, lazy, useEffect, useRef, useState } from "react";
import { applyEvent, compile, formatClock, parseClock, paceCategoryOf, scaleRecipe, thaliV1, updatePace, type MasterExecutionPlan, type PaceModel, type RecipeGraph } from "@tutti/engine";
import { usePersistentState, type Screen } from "./state";
import { CookScreen } from "./CookScreen"; // eager — the critical cook path must be instant
import { PickScreen, ServeTimeScreen } from "./PlanFlow"; // eager — central planning flow
import { DEFAULT_KITCHEN, toKitchenProfile, type KitchenUi } from "./kitchenModel";
import type { LearnEvent } from "./StatsScreen";
import { shouldLearn } from "./learn";
import { addSaved, addRecent, removeMeal, type SavedMeal } from "./meals";
import { formatPlan, shareOrCopy } from "./share";
import { recordCook, setRating, setNote, type NotesMap } from "./recipeNotes";
import { suggestMeal, type Suggestion } from "./suggest";

// Secondary screens are lazy-loaded so the initial/cook bundle stays lean (Brief v10).
// AddRecipe pulls @tutti/ingest, so splitting it keeps the parser out of the entry chunk.
const KitchenScreen = lazy(() => import("./KitchenScreen").then((m) => ({ default: m.KitchenScreen })));
const MealsScreen = lazy(() => import("./MealsScreen").then((m) => ({ default: m.MealsScreen })));
const RecipeDetailScreen = lazy(() => import("./RecipeDetailScreen").then((m) => ({ default: m.RecipeDetailScreen })));
const MiseScreen = lazy(() => import("./MiseScreen").then((m) => ({ default: m.MiseScreen })));
const OnboardingScreen = lazy(() => import("./OnboardingScreen").then((m) => ({ default: m.OnboardingScreen })));
const PreviewScreen = lazy(() => import("./PreviewScreen").then((m) => ({ default: m.PreviewScreen })));
const AddRecipe = lazy(() => import("./AddRecipe").then((m) => ({ default: m.AddRecipe })));
const ShoppingScreen = lazy(() => import("./ShoppingScreen").then((m) => ({ default: m.ShoppingScreen })));
const StatsScreen = lazy(() => import("./StatsScreen").then((m) => ({ default: m.StatsScreen })));
const BrowseScreen = lazy(() => import("./BrowseScreen").then((m) => ({ default: m.BrowseScreen })));

const Loading = () => <div className="idle" role="status">Loading…</div>;

const ALL_DISHES = thaliV1.recipes.map((r) => r.recipeId);

const SCREEN_NAMES: Record<Screen, string> = {
  onboarding: "Welcome", kitchen: "Your kitchen", home: "Home", addRecipe: "Add a dish",
  browse: "Browse recipes", recipe: "Recipe", shopping: "Shopping list", stats: "Your pace", meals: "Your meals", pick: "Pick dishes",
  serveTime: "Serve time", preview: "Plan preview", ready: "Get ready", cook: "Cook mode", done: "Done",
};

export function App() {
  const [screen, setScreen] = usePersistentState<Screen>("tutti.screen", "home");
  const [onboarded, setOnboarded] = usePersistentState<boolean>("tutti.onboarded", false);
  const [kitchen, setKitchen] = usePersistentState<KitchenUi>("tutti.kitchen", DEFAULT_KITCHEN);
  const [dishes, setDishes] = usePersistentState<string[]>("tutti.dishes", ALL_DISHES);
  const [target, setTarget] = usePersistentState<string>("tutti.target", thaliV1.targetServeTime);
  const [pro, setPro] = usePersistentState<boolean>("tutti.pro", false);
  const [candidates, setCandidates] = usePersistentState<RecipeGraph[]>("tutti.candidates", []);
  const [avoid, setAvoid] = usePersistentState<string[]>("tutti.avoid", []);
  const [servingsFactor, setServingsFactor] = usePersistentState<Record<string, number>>("tutti.servingsFactor", {});
  // Adaptive pace model (Doc 2 §7): per-category multipliers learned from the user's own cooks.
  // Fed into compile() so elastic estimates adjust. Populated by telemetry in the learning loop
  // (Brief v6) — kept honest here: empty until real data exists, so it's identity by default.
  const [pace, setPace] = usePersistentState<PaceModel>("tutti.pace", {});
  const [learnPace, setLearnPace] = usePersistentState<boolean>("tutti.learnPace", true);
  const [events, setEvents] = usePersistentState<LearnEvent[]>("tutti.events", []);
  const [meals, setMeals] = usePersistentState<SavedMeal[]>("tutti.meals", []);
  const [notes, setNotes] = usePersistentState<NotesMap>("tutti.recipeNotes", {});
  const [detailRecipe, setDetailRecipe] = useState<RecipeGraph | null>(null);
  const paceAdjusted = Object.entries(pace).filter(([, m]) => Math.abs(m - 1) > 0.05);
  const focusAtRef = useRef<number | null>(null); // wall-clock boundary for honest actual-duration capture
  const allRecipes = [...thaliV1.recipes, ...candidates];
  const toggleAvoid = (a: string) => setAvoid((p) => (p.includes(a) ? p.filter((x) => x !== a) : [...p, a]));
  const factorOf = (id: string) => servingsFactor[id] ?? 1;
  const setFactor = (id: string, f: number) => setServingsFactor((p) => ({ ...p, [id]: f }));
  const scaled = (r: RecipeGraph) => (factorOf(r.recipeId) === 1 ? r : scaleRecipe(r, factorOf(r.recipeId)));
  const [plan, setPlan] = usePersistentState<MasterExecutionPlan>(
    "tutti.plan",
    compile(thaliV1.recipes, thaliV1.kitchenProfile, thaliV1.targetServeTime, pace),
  );

  // live preview for the pick/serve-time screens (pure, cheap to recompute)
  const selectedRecipes = allRecipes.filter((r) => dishes.includes(r.recipeId)).map(scaled);
  const previewPlan = selectedRecipes.length
    ? compile(selectedRecipes, toKitchenProfile(kitchen), target, pace)
    : null;
  const soloMins = selectedRecipes.reduce((a, r) => a + r.nodes.reduce((s, n) => s + n.duration.estMins, 0), 0);
  const makespan = previewPlan ? parseClock(previewPlan.projectedServeTime) - parseClock(previewPlan.startTime) : 0;
  // How much the extra hands save vs cooking solo (same target serve time => shorter hands-on span).
  const soloPlan = kitchen.cooks > 1 && selectedRecipes.length
    ? compile(selectedRecipes, toKitchenProfile({ ...kitchen, cooks: 1 }), target, pace)
    : null;
  const soonerMins = soloPlan
    ? Math.max(0, (parseClock(soloPlan.projectedServeTime) - parseClock(soloPlan.startTime)) - makespan)
    : null;
  const setCooks = (n: number) => setKitchen((k) => ({ ...k, cooks: Math.max(1, Math.min(4, n)) }));
  const nowMins = (() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  })();
  const startMins = parseClock(target) - makespan;
  const feasible = startMins >= nowMins;
  const earliestServe = formatClock(nowMins + makespan);

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
  const addCandidate = (g: RecipeGraph) => {
    setCandidates((prev) => [...prev.filter((c) => c.recipeId !== g.recipeId), g]);
    setDishes((prev) => (prev.includes(g.recipeId) ? prev : [...prev, g.recipeId]));
    setScreen("pick");
  };
  const buildPlan = () => {
    setPlan(previewPlan ?? compile(thaliV1.recipes, toKitchenProfile(kitchen), target, pace));
    setScreen("preview");
  };
  const startCooking = () => {
    setPlan(previewPlan ?? compile(thaliV1.recipes, toKitchenProfile(kitchen), target, pace));
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
    setPlan(previewPlan ?? compile(thaliV1.recipes, toKitchenProfile(kitchen), target, pace));
    setScreen("home");
  };
  // Save the current plan as a named meal (Brief v12).
  const saveMeal = () => {
    const meal: SavedMeal = { id: `m${Date.now()}`, name: `Meal of ${new Date().toLocaleDateString()}`, dishIds: dishes, servings: servingsFactor, target, savedAt: Date.now(), kind: "saved" };
    setMeals((m) => addSaved(m, meal));
  };
  // Restore a saved/recent meal: load its dishes, servings, serve time, then drop into Pick to tweak.
  const restoreMeal = (meal: SavedMeal) => {
    const known = new Set(allRecipes.map((r) => r.recipeId));
    setDishes(meal.dishIds.filter((id) => known.has(id)));
    setServingsFactor(meal.servings);
    setTarget(meal.target);
    setScreen("pick");
  };
  // "What should I cook tonight?" (Brief v18) — rank the user's own meals, or a starter for new users.
  const suggestion: Suggestion =
    suggestMeal(meals, notes, { nowMs: Date.now() }) ?? {
      meal: { id: "starter", name: "South Indian thali", dishIds: ALL_DISHES, servings: {}, target, savedAt: 0, kind: "saved" },
      reason: "A great first meal to try",
    };

  // Screen-change a11y (Doc 7 §12): move focus to the new screen and announce it (SPA route fix).
  const [announce, setAnnounce] = useState("");
  const focusRef = useRef<HTMLElement>(null);
  const firstMount = useRef(true);
  useEffect(() => {
    if (firstMount.current) { firstMount.current = false; return; }
    setAnnounce(`${SCREEN_NAMES[screen]} screen`);
    focusRef.current?.focus();
  }, [screen]);

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
    <div className="wrap">
      <a className="skip-link" href="#screen-main" onClick={(e) => { e.preventDefault(); focusRef.current?.focus(); }}>
        Skip to content
      </a>
      <header>
        <button className="logo" onClick={() => setScreen("home")} aria-label="Home">
          <div className="mark">T</div>
          <div className="brand">Tutti<small>the whole meal, ready at once</small></div>
        </button>
      </header>

      <div role="status" aria-live="polite" className="sr-only">{announce}</div>
      <main id="screen-main" ref={focusRef} tabIndex={-1} className="screen-focus">
      <Suspense fallback={<Loading />}>

      {screen === "cook" ? (
        <CookScreen
          plan={plan}
          pro={pro}
          onComplete={complete}
          onUndo={undo}
          onReset={reset}
          notes={notes}
          dishesForReview={[...new Set(plan.nodes.map((n) => n.recipeId))]}
          onRate={(id, n) => setNotes((m) => setRating(m, id, n))}
          onNote={(id, s) => setNotes((m) => setNote(m, id, s))}
        />
      ) : screen === "kitchen" ? (
        <KitchenScreen kitchen={kitchen} onChange={setKitchen} avoid={avoid} onToggleAvoid={toggleAvoid} onDone={() => setScreen("home")} />
      ) : screen === "addRecipe" ? (
        <AddRecipe onAdd={addCandidate} onBack={() => setScreen("home")} />
      ) : screen === "browse" ? (
        <BrowseScreen
          avoid={avoid}
          notes={notes}
          onPick={addCandidate}
          onDetails={(r) => { setDetailRecipe(r); setScreen("recipe"); }}
          onBack={() => setScreen("home")}
        />
      ) : screen === "recipe" && detailRecipe ? (
        <RecipeDetailScreen
          recipe={detailRecipe}
          note={notes[detailRecipe.recipeId]}
          onAdd={() => addCandidate(detailRecipe)}
          onBack={() => setScreen("browse")}
        />
      ) : screen === "shopping" ? (
        <ShoppingScreen recipes={selectedRecipes.length ? selectedRecipes : allRecipes} onBack={() => setScreen("pick")} />
      ) : screen === "meals" ? (
        <MealsScreen
          meals={meals}
          recipes={allRecipes}
          onRestore={restoreMeal}
          onRemove={(id) => setMeals((m) => removeMeal(m, id))}
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
      ) : screen === "pick" ? (
        <PickScreen
          recipes={allRecipes}
          selected={dishes}
          onToggle={toggleDish}
          soloMins={soloMins}
          interleavedMins={makespan}
          onAdd={() => setScreen("addRecipe")}
          onShopping={() => setScreen("shopping")}
          avoid={avoid}
          factorOf={factorOf}
          onSetFactor={setFactor}
          onNext={() => setScreen("serveTime")}
        />
      ) : screen === "serveTime" ? (
        <ServeTimeScreen
          target={target}
          onChange={setTarget}
          startTime={previewPlan?.startTime ?? target}
          feasible={feasible}
          earliestServe={earliestServe}
          onBuild={buildPlan}
          cooks={kitchen.cooks}
          onCooks={setCooks}
          soonerMins={soonerMins}
        />
      ) : screen === "preview" ? (
        <PreviewScreen
          plan={plan}
          onStart={() => setScreen("ready")}
          onEdit={() => setScreen("pick")}
          onSave={saveMeal}
          onShare={() => { void shareOrCopy("Tutti plan", formatPlan(plan, selectedRecipes.map((r) => r.name))); }}
        />
      ) : screen === "ready" ? (
        <MiseScreen
          recipes={selectedRecipes.length ? selectedRecipes : thaliV1.recipes}
          kitchen={kitchen}
          onStart={startCooking}
          onBack={() => setScreen("preview")}
        />
      ) : screen === "home" ? (
        <Home
          onStart={startCooking}
          onPick={() => setScreen("pick")}
          onKitchen={() => setScreen("kitchen")}
          pro={pro}
          onTogglePro={() => setPro(!pro)}
          onStats={() => setScreen("stats")}
          onBrowse={() => setScreen("browse")}
          onMeals={() => setScreen("meals")}
          suggestion={suggestion}
          onCookSuggested={() => restoreMeal(suggestion.meal)}
          paceNote={
            paceAdjusted.length
              ? "Calibrated to your pace: " +
                paceAdjusted.map(([c, m]) => `${c} ${m > 1 ? "+" : ""}${Math.round((m - 1) * 100)}%`).join(", ")
              : null
          }
        />
      ) : (
        <Stub screen={screen} onBack={() => setScreen("home")} onCook={startCooking} />
      )}
      </Suspense>
      </main>

      <footer className="scaffold-note">
        Tutti — the whole meal, ready at once. Cooks fully offline; nothing leaves your device.
      </footer>
    </div>
  );
}

function Home({
  onStart,
  onPick,
  onKitchen,
  pro,
  onTogglePro,
  onStats,
  onBrowse,
  onMeals,
  suggestion,
  onCookSuggested,
  paceNote,
}: {
  onStart: () => void;
  onPick: () => void;
  onKitchen: () => void;
  pro: boolean;
  onTogglePro: () => void;
  onStats: () => void;
  onBrowse: () => void;
  onMeals: () => void;
  suggestion: Suggestion;
  onCookSuggested: () => void;
  paceNote: string | null;
}) {
  return (
    <section className="zone" aria-label="Home">
      <h2 className="zone-h"><span>Tonight</span></h2>

      <div className="suggest-card">
        <div className="suggest-h">Tonight?</div>
        <div className="suggest-name">{suggestion.meal.name}</div>
        <div className="hint">{suggestion.reason}</div>
        <button className="btn" onClick={onCookSuggested}>Cook this</button>
      </div>

      <p className="value">A South Indian thali — three dishes, all hot together in about 45 minutes.</p>
      {paceNote && <p className="hint">{paceNote}</p>}
      <button className="btn big-btn" onClick={onStart}>Start cooking</button>
      <div className="home-links">
        <button className="link" onClick={onBrowse}>Browse recipes</button>
        <button className="link" onClick={onMeals}>Your meals</button>
        <button className="link" onClick={onPick}>Pick dishes</button>
        <button className="link" onClick={onKitchen}>Your kitchen</button>
        <button className="link" onClick={onStats}>Your pace</button>
      </div>
      <div className="kp-row" style={{ marginTop: 16 }}>
        <span className="kp-label">Pro mode<br /><small style={{ color: "var(--faint)" }}>interleave prep &amp; cook freely; no nudges</small></span>
        <button className={`kp-toggle${pro ? " on" : ""}`} role="switch" aria-checked={pro} aria-label="Pro mode" onClick={onTogglePro}>
          {pro ? "On" : "Off"}
        </button>
      </div>
    </section>
  );
}

function Stub({ screen, onBack, onCook }: { screen: Screen; onBack: () => void; onCook: () => void }) {
  return (
    <section className="zone" aria-label={screen}>
      <h2 className="zone-h"><span>{screen}</span></h2>
      <div className="idle">This screen ("{screen}") is being built in an upcoming brief.</div>
      <div className="home-links">
        <button className="link" onClick={onCook}>Start cooking</button>
        <button className="link" onClick={onBack}>Back home</button>
      </div>
    </section>
  );
}
