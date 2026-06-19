import { useState, type ReactNode } from "react";
import type { Screen } from "./state";

// App shell: a persistent sidebar on desktop, a bottom tab bar on phones, and a settings gear.
// One nav model drives both surfaces; the routed screen content is passed as children.

type IconName = "home" | "browse" | "studio" | "meals" | "kitchen" | "pace" | "settings";

function Icon({ name }: { name: IconName }) {
  const p: Record<IconName, ReactNode> = {
    home: <path d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10" />,
    browse: <><circle cx="11" cy="11" r="6.5" /><path d="m21 21-4.5-4.5" /></>,
    studio: <><path d="M12 3l1.9 4.6L18.5 9l-3.6 3.1.9 4.9L12 14.8 8.2 17l.9-4.9L5.5 9l4.6-1.4Z" /><path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z" /></>,
    meals: <path d="M6 3h12a1 1 0 0 1 1 1v16l-7-4-7 4V4a1 1 0 0 1 1-1Z" />,
    kitchen: <><path d="M5 8h14M5 8a2 2 0 1 1 4 0M15 8a2 2 0 1 1 4 0M6 8v11a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8" /></>,
    pace: <path d="M4 14l4-5 3 3 4-6 5 8" />,
    settings: <><circle cx="12" cy="12" r="3.2" /><path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></>,
  };
  return (
    <svg className="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {p[name]}
    </svg>
  );
}

type NavItem = { key: IconName; label: string; screen: Screen };

// Primary destinations. `BOTTOM` marks the 4 shown in the mobile tab bar; Kitchen + Pace are
// sidebar/overflow-only. The meal planner is Home (the Builder); the old Plan(pick) flow is retired.
const NAV: NavItem[] = [
  { key: "home", label: "Home", screen: "home" },
  { key: "browse", label: "Browse", screen: "browse" },
  { key: "studio", label: "Studio", screen: "studio" },
  { key: "meals", label: "Meals", screen: "meals" },
  { key: "kitchen", label: "Kitchen", screen: "kitchen" },
  { key: "pace", label: "Pace", screen: "stats" },
];
const BOTTOM: IconName[] = ["home", "browse", "studio", "meals"];

// Which nav section a given screen belongs to (flow screens fold into their section).
function sectionOf(screen: Screen): IconName {
  switch (screen) {
    case "browse": case "recipe": return "browse";
    case "studio": case "addRecipe": return "studio";
    case "meals": return "meals";
    case "kitchen": return "kitchen";
    case "stats": return "pace";
    case "settings": return "settings";
    // The planner + its build flow (preview / ready / cook / shopping) live under Home.
    default: return "home";
  }
}

export interface CookBar {
  done: number;
  total: number;
  onResume: () => void;
  onEnd: () => void;
}

// Always-on "Resume cooking" bar. Ending a cook is a two-tap confirm so progress is never lost
// by an accidental tap (the whole point of this feature).
function CookBarView({ bar }: { bar: CookBar }) {
  const [armed, setArmed] = useState(false);
  return (
    <div className="cook-bar">
      <button className="cook-bar-resume" onClick={bar.onResume} aria-label={`Resume cooking, ${bar.done} of ${bar.total} steps done`}>
        <span className="cook-bar-ico" aria-hidden="true">🍳</span>
        <span className="cook-bar-text">Cooking · {bar.done}/{bar.total} steps</span>
        <span className="cook-bar-cta">Resume →</span>
      </button>
      {armed ? (
        <button className="cook-bar-end armed" aria-label="Tap again to end this cook" onClick={bar.onEnd}>End?</button>
      ) : (
        <button className="cook-bar-end" aria-label="End this cook" title="End this cook" onClick={() => setArmed(true)}>×</button>
      )}
    </div>
  );
}

export function Shell({
  screen,
  onNavigate,
  cookBar = null,
  children,
}: {
  screen: Screen;
  onNavigate: (s: Screen) => void;
  cookBar?: CookBar | null;
  children: ReactNode;
}) {
  const active = sectionOf(screen);
  const navBtn = (item: NavItem, cls: string) => (
    <button
      key={item.key}
      className={`${cls}${active === item.key ? " on" : ""}`}
      aria-current={active === item.key ? "page" : undefined}
      onClick={() => onNavigate(item.screen)}
    >
      <Icon name={item.key} />
      <span>{item.label}</span>
    </button>
  );

  const Logo = (
    <button className="logo" onClick={() => onNavigate("home")} aria-label="Tutti — home">
      <span className="mark">T</span>
      <span className="brand">Tutti<small>the whole meal, ready at once</small></span>
    </button>
  );
  const gear = (
    <button className={`gear-btn${active === "settings" ? " on" : ""}`} aria-label="Settings" aria-current={active === "settings" ? "page" : undefined} onClick={() => onNavigate("settings")}>
      <Icon name="settings" />
    </button>
  );

  return (
    <div className="shell">
      <a className="skip-link" href="#screen-main">Skip to content</a>

      {/* Desktop sidebar */}
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-top">{Logo}</div>
        <nav className="side-nav" aria-label="Primary">
          {NAV.map((item) => navBtn(item, "side-link"))}
        </nav>
        <div className="sidebar-foot">
          <button className={`side-link${active === "settings" ? " on" : ""}`} aria-current={active === "settings" ? "page" : undefined} onClick={() => onNavigate("settings")}>
            <Icon name="settings" /><span>Settings</span>
          </button>
        </div>
      </aside>

      {/* Content column (mobile header lives here so it scrolls with content) */}
      <div className="content-col">
        <header className="topbar">
          {Logo}
          {gear}
        </header>
        {cookBar && <CookBarView bar={cookBar} />}
        {children}
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="bottom-nav" aria-label="Primary">
        {BOTTOM.map((key) => navBtn(NAV.find((n) => n.key === key)!, "tab"))}
      </nav>
    </div>
  );
}
