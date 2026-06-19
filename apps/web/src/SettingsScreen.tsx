import { useState } from "react";

// Settings & Your Data (Brief v22) — one place for preferences plus honest, exercisable control
// over the local data (export / reset). Local-first: nothing here talks to a network.

export function SettingsScreen({
  pro,
  onTogglePro,
  learnPace,
  onToggleLearn,
  metric,
  onToggleMetric,
  canInstall = false,
  onInstall,
  onKitchen,
  onPantry,
  onPace,
  onExport,
  onReset,
  onBack,
}: {
  pro: boolean;
  onTogglePro: () => void;
  learnPace: boolean;
  onToggleLearn: () => void;
  metric: boolean;
  onToggleMetric: () => void;
  canInstall?: boolean;
  onInstall?: () => void;
  onKitchen?: () => void;
  onPantry?: () => void;
  onPace?: () => void;
  onExport: () => void;
  onReset: () => void;
  onBack: () => void;
}) {
  const [armReset, setArmReset] = useState(false);

  const Toggle = ({ on, onToggle, label, desc }: { on: boolean; onToggle: () => void; label: string; desc: string }) => (
    <div className="kp-row">
      <span className="kp-label">{label}<small className="kp-desc">{desc}</small></span>
      <button className={`kp-toggle${on ? " on" : ""}`} role="switch" aria-checked={on} aria-label={`${label}, ${on ? "On" : "Off"}`} onClick={onToggle}>
        {on ? "On" : "Off"}
      </button>
    </div>
  );

  return (
    <section className="zone" aria-label="Settings">
      <h2 className="zone-h"><span>Settings</span></h2>

      <h3 className="meal-sec">Setup</h3>
      {onKitchen && (
        <button className="kp-row settings-link" onClick={onKitchen}>
          <span className="kp-label">Your kitchen<small className="kp-desc">Cooks, burners, ovens & allergens to avoid</small></span>
          <span className="settings-chevron" aria-hidden="true">›</span>
        </button>
      )}
      {onPantry && (
        <button className="kp-row settings-link" onClick={onPantry}>
          <span className="kp-label">Your pantry<small className="kp-desc">What you keep on hand — hidden from shopping, expiry alerts</small></span>
          <span className="settings-chevron" aria-hidden="true">›</span>
        </button>
      )}
      {onPace && (
        <button className="kp-row settings-link" onClick={onPace}>
          <span className="kp-label">Your pace<small className="kp-desc">See what Tutti has learned about your timings</small></span>
          <span className="settings-chevron" aria-hidden="true">›</span>
        </button>
      )}

      <h3 className="meal-sec">Preferences</h3>
      <Toggle on={pro} onToggle={onTogglePro} label="Pro mode" desc="Let prep and cook interleave without nudges" />
      <Toggle on={learnPace} onToggle={onToggleLearn} label="Learn my pace" desc="Tune timings to how you actually cook" />
      <Toggle on={metric} onToggle={onToggleMetric} label="Metric units" desc="Show amounts in millilitres" />

      <h3 className="meal-sec">Appearance</h3>
      <p className="hint">Tutti follows your device's light or dark setting automatically.</p>

      {canInstall && onInstall && (
        <>
          <h3 className="meal-sec">App</h3>
          <button className="btn ghost" onClick={onInstall}>Install Tutti on this device</button>
        </>
      )}

      <h3 className="meal-sec">Your data</h3>
      <p className="hint">Everything stays on this device. Nothing is uploaded.</p>
      <button className="btn ghost" onClick={onExport}>Export my data</button>

      {!armReset ? (
        <button className="btn ghost danger" style={{ marginTop: 10 }} onClick={() => setArmReset(true)}>Reset everything…</button>
      ) : (
        <>
          <button className="btn danger" style={{ marginTop: 10 }} onClick={onReset}>Tap again to erase everything</button>
          <p className="hint">This erases all your saved meals, ratings, pace and settings. Can't be undone.</p>
        </>
      )}

      <div className="home-links"><button className="link" onClick={onBack}>Back</button></div>
    </section>
  );
}
