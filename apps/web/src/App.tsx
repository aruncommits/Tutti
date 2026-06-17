import { applyEvent, compile, formatClock, parseClock, thaliV1, type MasterExecutionPlan } from "@tutti/engine";
import { usePersistentState, type Screen } from "./state";
import { CookScreen } from "./CookScreen";
import { KitchenScreen, DEFAULT_KITCHEN, toKitchenProfile, type KitchenUi } from "./KitchenScreen";
import { OnboardingScreen } from "./OnboardingScreen";
import { PickScreen, ServeTimeScreen } from "./PlanFlow";
import { PreviewScreen } from "./PreviewScreen";

const ALL_DISHES = thaliV1.recipes.map((r) => r.recipeId);

export function App() {
  const [screen, setScreen] = usePersistentState<Screen>("tutti.screen", "home");
  const [onboarded, setOnboarded] = usePersistentState<boolean>("tutti.onboarded", false);
  const [kitchen, setKitchen] = usePersistentState<KitchenUi>("tutti.kitchen", DEFAULT_KITCHEN);
  const [dishes, setDishes] = usePersistentState<string[]>("tutti.dishes", ALL_DISHES);
  const [target, setTarget] = usePersistentState<string>("tutti.target", thaliV1.targetServeTime);
  const [plan, setPlan] = usePersistentState<MasterExecutionPlan>(
    "tutti.plan",
    compile(thaliV1.recipes, thaliV1.kitchenProfile, thaliV1.targetServeTime),
  );

  // live preview for the pick/serve-time screens (pure, cheap to recompute)
  const selectedRecipes = thaliV1.recipes.filter((r) => dishes.includes(r.recipeId));
  const previewPlan = selectedRecipes.length
    ? compile(selectedRecipes, toKitchenProfile(kitchen), target)
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

  const complete = (id: string) => setPlan((prev) => applyEvent(prev, { type: "complete", nodeId: id, at: "" }));
  const undo = (id: string) => setPlan((prev) => applyEvent(prev, { type: "undo", nodeId: id, at: "" }));
  const toggleDish = (id: string) =>
    setDishes((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const buildPlan = () => {
    setPlan(previewPlan ?? compile(thaliV1.recipes, toKitchenProfile(kitchen), target));
    setScreen("preview");
  };
  const startCooking = () => {
    setPlan(previewPlan ?? compile(thaliV1.recipes, toKitchenProfile(kitchen), target));
    setScreen("cook");
  };
  const reset = () => {
    setPlan(previewPlan ?? compile(thaliV1.recipes, toKitchenProfile(kitchen), target));
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
        <CookScreen plan={plan} onComplete={complete} onUndo={undo} onReset={reset} />
      ) : screen === "kitchen" ? (
        <KitchenScreen kitchen={kitchen} onChange={setKitchen} onDone={() => setScreen("home")} />
      ) : screen === "pick" ? (
        <PickScreen
          recipes={thaliV1.recipes}
          selected={dishes}
          onToggle={toggleDish}
          soloMins={soloMins}
          interleavedMins={makespan}
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
        <Home onStart={startCooking} onPick={() => setScreen("pick")} onKitchen={() => setScreen("kitchen")} />
      ) : (
        <Stub screen={screen} onBack={() => setScreen("home")} onCook={startCooking} />
      )}

      <footer className="scaffold-note">
        Phase 2 · single-recipe flow taking shape (screens being built brief by brief).
      </footer>
    </div>
  );
}

function Home({ onStart, onPick, onKitchen }: { onStart: () => void; onPick: () => void; onKitchen: () => void }) {
  return (
    <section className="zone" aria-label="Home">
      <p className="value">A South Indian thali — three dishes, all hot together in about 45 minutes.</p>
      <button className="btn big-btn" onClick={onStart}>Start cooking</button>
      <div className="home-links">
        <button className="link" onClick={onPick}>Pick dishes</button>
        <button className="link" onClick={onKitchen}>Your kitchen</button>
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
