import type { ReactNode } from "react";
import type { Screen } from "./state";

// App shell: a persistent sidebar on desktop, a bottom tab bar on phones, and a settings gear.
// One nav model drives both surfaces; the routed screen content is passed as children.

type IconName = "home" | "browse" | "plan" | "meals" | "kitchen" | "pace" | "settings";

function Icon({ name }: { name: IconName }) {
  const p: Record<IconName, ReactNode> = {
    home: <path d="M3 11.5 12 4l9 7.5M5.5 10v10h13V10" />,
    browse: <><circle cx="11" cy="11" r="6.5" /><path d="m21 21-4.5-4.5" /></>,
    plan: <><path d="M8 4h8a1 1 0 0 1 1 1v15l-5-2.5L7 20V5a1 1 0 0 1 1-1Z" /><path d="M9.5 9h5M9.5 12.5h5" /></>,
    meals: <path d="M6 3h12a1 1 0 0 1 1 1v16l-7-4-7 4V4a1 1 0 0 1 1-1Z" />,
    kitchen: <><path d="M5 8h14M5 8a2 2 0 1 1 4 0M15 8a2 2 0 1 1 4 0M6 8v11a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V8" /></>,
    pace: <path d="M4 14l4-5 3 3 4-6 5 8" />,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M12 3v2.5M12 18.5V21M21 12h-2.5M5.5 12H3M18 6l-1.8 1.8M7.8 16.2 6 18M18 18l-1.8-1.8M7.8 7.8 6 6" /></>,
  };
  return (
    <svg className="nav-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {p[name]}
    </svg>
  );
}

type NavItem = { key: IconName; label: string; screen: Screen };

// Primary destinations. `bottom` marks the 5 shown in the mobile tab bar.
const NAV: NavItem[] = [
  { key: "home", label: "Home", screen: "home" },
  { key: "browse", label: "Browse", screen: "browse" },
  { key: "plan", label: "Plan", screen: "pick" },
  { key: "meals", label: "Meals", screen: "meals" },
  { key: "kitchen", label: "Kitchen", screen: "kitchen" },
  { key: "pace", label: "Pace", screen: "stats" },
];
const BOTTOM: IconName[] = ["home", "browse", "plan", "meals", "kitchen"];

// Which nav section a given screen belongs to (flow screens fold into their section).
function sectionOf(screen: Screen): IconName {
  switch (screen) {
    case "browse": case "recipe": case "addRecipe": return "browse";
    case "pick": case "serveTime": case "preview": case "ready": case "cook": case "shopping": return "plan";
    case "meals": return "meals";
    case "kitchen": return "kitchen";
    case "stats": return "pace";
    case "settings": return "settings";
    default: return "home";
  }
}

export function Shell({
  screen,
  onNavigate,
  children,
}: {
  screen: Screen;
  onNavigate: (s: Screen) => void;
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
        {children}
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="bottom-nav" aria-label="Primary">
        {BOTTOM.map((key) => navBtn(NAV.find((n) => n.key === key)!, "tab"))}
      </nav>
    </div>
  );
}
