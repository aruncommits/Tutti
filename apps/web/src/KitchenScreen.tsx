import { ALLERGENS } from "@tutti/engine";
import type { KitchenUi } from "./kitchenModel";

// Kitchen Profile screen (Doc 7 §3). The model (KitchenUi/DEFAULT_KITCHEN/toKitchenProfile) lives
// in kitchenModel.ts so App can use it eagerly while this component is lazy-loaded (Brief v10).

function Stepper({ label, value, min, onChange }: { label: string; value: number; min: number; onChange: (v: number) => void }) {
  return (
    <div className="kp-row">
      <span className="kp-label">{label}</span>
      <div className="kp-stepper">
        <button aria-label={`Decrease ${label}`} onClick={() => onChange(Math.max(min, value - 1))}>−</button>
        <span className="kp-val" aria-label={`${label} count`}>{value}</span>
        <button aria-label={`Increase ${label}`} onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  );
}

function Toggle({ label, on, onToggle }: { label: string; on: boolean; onToggle: () => void }) {
  return (
    <div className="kp-row">
      <span className="kp-label">{label}</span>
      <button className={`kp-toggle${on ? " on" : ""}`} role="switch" aria-checked={on} aria-label={`${label}, ${on ? "On" : "Off"}`} onClick={onToggle}>
        {on ? "On" : "Off"}
      </button>
    </div>
  );
}

export function KitchenScreen({
  kitchen,
  onChange,
  avoid,
  onToggleAvoid,
  onDone,
}: {
  kitchen: KitchenUi;
  onChange: (k: KitchenUi) => void;
  avoid: string[];
  onToggleAvoid: (allergen: string) => void;
  onDone: () => void;
}) {
  const set = <K extends keyof KitchenUi>(key: K, value: KitchenUi[K]) => onChange({ ...kitchen, [key]: value });
  return (
    <section className="zone" aria-label="Your kitchen">
      <h2 className="zone-h"><span>Your kitchen</span></h2>
      <div className="kp">
        <Stepper label="Cooks (hands)" value={kitchen.cooks} min={1} onChange={(v) => set("cooks", v)} />
        <Stepper label="Burners" value={kitchen.burners} min={1} onChange={(v) => set("burners", v)} />
        <Stepper label="Cutting boards" value={kitchen.cuttingBoards} min={1} onChange={(v) => set("cuttingBoards", v)} />
        <Stepper label="Pans" value={kitchen.pans} min={1} onChange={(v) => set("pans", v)} />
        <Toggle label="Oven" on={kitchen.oven} onToggle={() => set("oven", !kitchen.oven)} />
        <Toggle label="Pressure cooker" on={kitchen.pressureCooker} onToggle={() => set("pressureCooker", !kitchen.pressureCooker)} />
        <Toggle label="Microwave" on={kitchen.microwave} onToggle={() => set("microwave", !kitchen.microwave)} />
        <Toggle label="Blender" on={kitchen.blender} onToggle={() => set("blender", !kitchen.blender)} />
        <div className="kp-row">
          <span className="kp-label">Counter space</span>
          <div className="kp-seg">
            {(["small", "medium", "large"] as const).map((c) => (
              <button key={c} className={kitchen.counter === c ? "on" : ""} aria-pressed={kitchen.counter === c} onClick={() => set("counter", c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      <h2 className="zone-h" style={{ marginTop: 18 }}><span>Allergens to avoid</span></h2>
      <p className="hint">We'll warn you when a chosen dish may contain one of these.</p>
      <div className="allergen-chips">
        {ALLERGENS.map((a) => (
          <button key={a} className={`chip-toggle${avoid.includes(a) ? " on" : ""}`} role="switch" aria-checked={avoid.includes(a)} aria-label={`avoid ${a}`} onClick={() => onToggleAvoid(a)}>
            {a}
          </button>
        ))}
      </div>

      <button className="btn big-btn" onClick={onDone}>Save kitchen</button>
    </section>
  );
}
