import { useState, useRef, type ReactNode } from "react";
import type { Screen } from "./state";

// App shell: 4-tab bottom nav on mobile, sidebar on desktop, resume-cook bar.
// Single source of truth: TAB_CONFIG drives both surfaces and all active-state logic.

type TabId = "cook" | "browse" | "studio" | "me";

interface TabDef {
  id: TabId;
  label: string;
  primaryScreen: Screen;
  screens: Screen[];
}

const TABS: TabDef[] = [
  {
    id: "cook",
    label: "Cook",
    primaryScreen: "home",
    screens: ["home", "preview", "ready", "cook", "shopping"],
  },
  {
    id: "browse",
    label: "Browse",
    primaryScreen: "browse",
    screens: ["browse", "recipe"],
  },
  {
    id: "studio",
    label: "Studio",
    primaryScreen: "studio",
    screens: ["studio", "addRecipe", "editRecipe", "menuImport"],
  },
  {
    id: "me",
    label: "Me",
    primaryScreen: "meals",
    screens: ["meals", "calendar", "pantry", "stats", "settings", "kitchen"],
  },
];

// Screens where the tab bar is completely hidden (full-screen flows + detail views)
const SUPPRESSED: ReadonlySet<Screen> = new Set([
  "onboarding", "kitchen", "recipe", "editRecipe", "addRecipe", "menuImport", "preview", "ready", "cook",
]);

function tabForScreen(screen: Screen): TabDef | undefined {
  return TABS.find((t) => t.screens.includes(screen));
}

// SVG icons — outlined style, 24×24 viewBox
function Icon({ name }: { name: TabId | "settings" | "logo" }) {
  const p: Record<TabId | "settings" | "logo", ReactNode> = {
    cook: (
      <path d="M12 3c-.5 3-4 5.5-4 9a4 4 0 0 0 8 0c0-2-1-3.5-1.5-5-.2 1.8-1 2.8-1.8 2.8-.8 0-1.5-1-1.5-3 0-1.5.3-2.8-.2-3.8Z" />
    ),
    browse: (
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m21 21-4.5-4.5" />
      </>
    ),
    studio: (
      <>
        <path d="M12 3l1.9 4.6L18.5 9l-3.6 3.1.9 4.9L12 14.8 8.2 17l.9-4.9L5.5 9l4.6-1.4Z" />
        <path d="M18.5 16.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7Z" />
      </>
    ),
    me: (
      <>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3.2" />
        <path d="M19.4 13a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
      </>
    ),
    logo: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
      </>
    ),
  };
  return (
    <svg
      className="nav-ico"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {p[name]}
    </svg>
  );
}

export interface CookBar {
  done: number;
  total: number;
  onResume: () => void;
  onEnd: () => void;
}

function CookBarView({ bar }: { bar: CookBar }) {
  const [armed, setArmed] = useState(false);
  return (
    <div className="cook-bar">
      <button
        className="cook-bar-resume"
        onClick={bar.onResume}
        aria-label={`Resume cooking, ${bar.done} of ${bar.total} steps done`}
      >
        <span className="cook-bar-ico" aria-hidden="true">🍳</span>
        <span className="cook-bar-text">Cooking · {bar.done}/{bar.total} steps</span>
        <span className="cook-bar-cta">Resume →</span>
      </button>
      {armed ? (
        <button className="cook-bar-end armed" aria-label="Tap again to end this cook" onClick={bar.onEnd}>
          End?
        </button>
      ) : (
        <button className="cook-bar-end" aria-label="End this cook" onClick={() => setArmed(true)}>
          ×
        </button>
      )}
    </div>
  );
}

export function Shell({
  screen,
  onNavigate,
  cookBar = null,
  pantryExpiryBadge = false,
  children,
}: {
  screen: Screen;
  onNavigate: (s: Screen) => void;
  cookBar?: CookBar | null;
  pantryExpiryBadge?: boolean;
  children: ReactNode;
}) {
  // Track the last non-suppressed tab so the active highlight is stable during cook/preview/etc.
  const lastActiveTabRef = useRef<TabId>("cook");
  const resolved = tabForScreen(screen);
  if (resolved) lastActiveTabRef.current = resolved.id;
  const activeTabId = lastActiveTabRef.current;

  const suppressed = SUPPRESSED.has(screen);

  function onTabPress(tab: TabDef) {
    const alreadyActive = tab.id === activeTabId;
    const onPrimary = screen === tab.primaryScreen;
    if (alreadyActive && onPrimary) return;
    onNavigate(tab.primaryScreen);
  }

  function TabBtn({ tab }: { tab: TabDef }) {
    const isActive = tab.id === activeTabId;
    const badged = tab.id === "me" && pantryExpiryBadge;
    return (
      <button
        className={`tab${isActive ? " on" : ""}`}
        aria-current={isActive ? "page" : undefined}
        onClick={() => onTabPress(tab)}
        aria-label={tab.label}
      >
        <span className="tab-ico-wrap">
          <Icon name={tab.id} />
          {badged && <span className="tab-badge" aria-label="Pantry items expiring soon" />}
        </span>
        <span className="tab-label">{tab.label}</span>
      </button>
    );
  }

  const Logo = (
    <button className="logo" onClick={() => onNavigate("home")} aria-label="Tutti — home">
      <span className="mark">T</span>
      <span className="brand">
        Tutti<small>the whole meal, ready at once</small>
      </span>
    </button>
  );

  return (
    <div className={`shell${suppressed ? " shell--nav-hidden" : ""}`}>
      <a className="skip-link" href="#screen-main">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sidebar" aria-label="Main navigation">
        <div className="sidebar-top">{Logo}</div>
        <nav className="side-nav" aria-label="Primary">
          {TABS.map((tab) => {
            const isActive = tab.id === activeTabId;
            const badged = tab.id === "me" && pantryExpiryBadge;
            return (
              <button
                key={tab.id}
                className={`side-link${isActive ? " on" : ""}`}
                aria-current={isActive ? "page" : undefined}
                onClick={() => onTabPress(tab)}
              >
                <span className="tab-ico-wrap">
                  <Icon name={tab.id} />
                  {badged && <span className="tab-badge" />}
                </span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="sidebar-foot">
          <button
            className={`side-link${screen === "settings" ? " on" : ""}`}
            aria-current={screen === "settings" ? "page" : undefined}
            onClick={() => onNavigate("settings")}
          >
            <Icon name="settings" />
            <span>Settings</span>
          </button>
        </div>
      </aside>

      {/* Content column */}
      <div className="content-col">
        <header className="topbar">
          {Logo}
          <button
            className={`gear-btn${screen === "settings" ? " on" : ""}`}
            aria-label="Settings"
            aria-current={screen === "settings" ? "page" : undefined}
            onClick={() => onNavigate("settings")}
          >
            <Icon name="settings" />
          </button>
        </header>
        {cookBar && <CookBarView bar={cookBar} />}
        {children}
      </div>

      {/* Mobile bottom tab bar — hidden on suppressed screens via .shell--nav-hidden */}
      <nav className="bottom-nav" aria-label="Primary navigation" role="tablist">
        {TABS.map((tab) => (
          <TabBtn key={tab.id} tab={tab} />
        ))}
      </nav>
    </div>
  );
}
