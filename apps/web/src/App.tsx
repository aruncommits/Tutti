import { useRef } from "react";
import { applyEvent, compile, formatClock, parseClock, paceCategoryOf, scaleRecipe, thaliV1, updatePace, type MasterExecutionPlan, type PaceModel, type RecipeGraph } from "@tutti/engine";
import { usePersistentState, type Screen } from "./state";
import { CookScreen } from "./CookScreen";
import { KitchenScreen, DEFAULT_KITCHEN, toKitchenProfile, type KitchenUi } from "./KitchenScreen";
import { OnboardingScreen } from "./OnboardingScreen";
import { PickScreen, ServeTimeScreen } from "./PlanFlow";
import { PreviewScreen } from "./PreviewScreen";
import { AddRecipe } from "./AddRecipe";
import { ShoppingScreen } from "./ShoppingScreen";

const ALL_DISHES = thaliV1.recipes.map((r) => r.recipeId);

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
  const [learnPace] = usePersistentState<boolean>("tutti.learnPace", true);
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
    if (learnPace && node && node.attention === "active" && node.duration.elastic && focusAtRef.current != null) {
      const actualMins = (now - focusAtRef.current) / 60000;
      if (actualMins >= 0.3 * node.duration.minMins && actualMins <= 3 * node.duration.maxMins) {
        setPace((p) => updatePace(p, { category: paceCategoryOf(node), actualMins, estMins: node.duration.estMins }));
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
    setPlan(previewPlan ?? compile(thaliV1.recipes, toKitchenProfile(kitchen), target, pace));
    setScreen("home");
  };

  if (!onboarded) {
    return (
      <div className="wrap">
        <OnboardingScreen onDone={() => { setOnboarded(true); setScreen("kitchen"); }} />
      </div>
    );
  }

  return (
    <div className="wrap">
      <header>
        <button className="logo" onClick={() => setScreen("home")} aria-label="Home">
          <div className="mark">T</div>
          <div className="brand">Tutti<small>cook the whole meal, together</small></div>
        </button>
      </header>

      {screen === "cook" ? (
        <CookScreen plan={plan} pro={pro} onComplete={complete} onUndo={undo} onReset={reset} />
      ) : screen === "kitchen" ? (
        <KitchenScreen kitchen={kitchen} onChange={setKitchen} avoid={avoid} onToggleAvoid={toggleAvoid} onDone={() => setScreen("home")} />
      ) : screen === "addRecipe" ? (
        <AddRecipe onAdd={addCandidate} onBack={() => setScreen("home")} />
      ) : screen === "shopping" ? (
        <ShoppingScreen recipes={selectedRecipes.length ? selectedRecipes : allRecipes} onBack={() => setScreen("pick")} />
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
        />
      ) : screen === "preview" ? (
        <PreviewScreen plan={plan} onStart={() => setScreen("cook")} onEdit={() => setScreen("pick")} />
      ) : screen === "home" ? (
        <Home
          onStart={startCooking}
          onPick={() => setScreen("pick")}
          onKitchen={() => setScreen("kitchen")}
          pro={pro}
          onTogglePro={() => setPro(!pro)}
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

      <footer className="scaffold-note">
        Phase 2 · single-recipe flow taking shape (screens being built brief by brief).
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
  paceNote,
}: {
  onStart: () => void;
  onPick: () => void;
  onKitchen: () => void;
  pro: boolean;
  onTogglePro: () => void;
  paceNote: string | null;
}) {
  return (
    <section className="zone" aria-label="Home">
      <p className="value">A South Indian thali — three dishes, all hot together in about 45 minutes.</p>
      {paceNote && <p className="hint">{paceNote}</p>}
      <button className="btn big-btn" onClick={onStart}>Start cooking</button>
      <div className="home-links">
        <button className="link" onClick={onPick}>Pick dishes</button>
        <button className="link" onClick={onKitchen}>Your kitchen</button>
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
