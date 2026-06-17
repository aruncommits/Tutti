import { useState } from "react";

// First-run onboarding (Doc 7 §2): three value cards selling the core idea, then into setup.
// No account needed to cook (local-first, P4). Shown once via the tutti.onboarded flag.

const CARDS = [
  { hand: "every dish hot, together", title: "Cook a whole meal like a pro kitchen", body: "Tutti times every dish so they're all ready at the same moment." },
  { hand: "we hide the chopping in the simmering", title: "Never juggle three pots again", body: "We schedule the active work of one dish into the quiet windows of another." },
  { hand: "tell us once, then just cook", title: "Your kitchen, your pace", body: "Set your burners and pans once. Tutti plans around what you actually have." },
];

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const last = i === CARDS.length - 1;
  const card = CARDS[i]!;
  return (
    <section className="zone onboarding" aria-label="Welcome to Tutti">
      <div className="ob-card">
        <div className="ob-hand">{card.hand}</div>
        <h2 className="ob-title">{card.title}</h2>
        <p className="ob-body">{card.body}</p>
      </div>
      <div className="ob-dots" aria-hidden="true">
        {CARDS.map((_, k) => <span key={k} className={k === i ? "on" : ""} />)}
      </div>
      <div className="ob-actions">
        <button className="link" onClick={onDone}>Skip</button>
        <button className="btn" onClick={() => (last ? onDone() : setI(i + 1))}>
          {last ? "Set up my kitchen" : "Next"}
        </button>
      </div>
    </section>
  );
}
