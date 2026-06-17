import { applyEvent, compile, thaliV1, type MasterExecutionPlan } from "@tutti/engine";
import { usePersistentState, type Screen } from "./state";
import { CookScreen } from "./CookScreen";
import { KitchenScreen, DEFAULT_KITCHEN, toKitchenProfile, type KitchenUi } from "./KitchenScreen";

// App shell + screen state machine (Brief v2 item 1). Screen + plan persist to localStorage so an
// in-progress cook survives reload (Doc 1 P4). Most screens are stubs filled by items 2-9; the
// cook screen is already the real engine render.

export function App() {
  const [screen, setScreen] = usePersistentState<Screen>("tutti.screen", "home");
  const [kitchen, setKitchen] = usePersistentState<KitchenUi>("tutti.kitchen", DEFAULT_KITCHEN);
  const [plan, setPlan] = usePersistentState<MasterExecutionPlan>(
    "tutti.plan",
    compile(thaliV1.recipes, thaliV1.kitchenProfile, thaliV1.targetServeTime),
  );

  const complete = (id: string) => setPlan((prev) => applyEvent(prev, { type: "complete", nodeId: id, at: "" }));
  const startCooking = () => {
    // compile with the user's current kitchen so changes (e.g. burner count) take effect.
    setPlan(compile(thaliV1.recipes, toKitchenProfile(kitchen), thaliV1.targetServeTime));
    setScreen("cook");
  };
  const reset = () => {
    setPlan(compile(thaliV1.recipes, toKitchenProfile(kitchen), thaliV1.targetServeTime));
    setScreen("home");
  };

  return (
    <div className="wrap">
      <header>
        <button className="logo" onClick={() => setScreen("home")} aria-label="Home">
          <div className="mark">T</div>
          <div className="brand">
            Tutti
            <small>cook the whole meal, together</small>
          </div>
        </button>
      </header>

      {screen === "cook" ? (
        <CookScreen plan={plan} onComplete={complete} onReset={reset} />
      ) : screen === "kitchen" ? (
        <KitchenScreen kitchen={kitchen} onChange={setKitchen} onDone={() => setScreen("home")} />
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
      <button className="btn big-btn" onClick={onStart}>Start cooking the thali</button>
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
      <div className="idle">
        This screen ("{screen}") is being built in an upcoming brief. For now you can jump straight in.
      </div>
      <div className="home-links">
        <button className="link" onClick={onCook}>Start cooking</button>
        <button className="link" onClick={onBack}>Back home</button>
      </div>
    </section>
  );
}
