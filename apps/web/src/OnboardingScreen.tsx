import { useState } from "react";

// V2 onboarding: show HOW not WHY. Three slides focused on the actual product experience.
// Slide 3 offers two CTAs: "Start cooking" (skip kitchen) and "Set up kitchen" (old path).

interface Slide {
  visual: string;           // large emoji or ASCII art representing the screen
  headline: string;
  body: string;
  cta: string;
}

const SLIDES: Slide[] = [
  {
    visual: "🍳",
    headline: "Everything done at the same time.",
    body: "Pick your dishes and set a serve time. Tutti works out who does what and when — so every dish finishes together.",
    cta: "See how it works →",
  },
  {
    visual: "⏱️",
    headline: "Follow along, hands-free.",
    body: "Step-by-step instructions that know what's on your stove right now. No more juggling three pots and a timer.",
    cta: "One more thing →",
  },
  {
    visual: "🚀",
    headline: "No setup needed.",
    body: "Start cooking tonight. You can tell Tutti about your kitchen whenever you're ready — it just gets smarter over time.",
    cta: "",
  },
];

export function OnboardingScreen({
  onDone,
}: {
  onDone: (skipKitchen: boolean) => void;
}) {
  const [i, setI] = useState(0);
  const slide = SLIDES[i]!;
  const isLast = i === SLIDES.length - 1;

  function advance() {
    if (!isLast) setI(i + 1);
  }

  return (
    <section className="zone onboarding" aria-label="Welcome to Tutti">
      <button className="link ob-skip" onClick={() => onDone(true)}>
        Skip
      </button>

      <div className="ob-card">
        <div className="ob-visual" aria-hidden="true">{slide.visual}</div>
        <h2 className="ob-title">{slide.headline}</h2>
        <p className="ob-body">{slide.body}</p>
      </div>

      <div className="ob-dots" aria-label={`Slide ${i + 1} of ${SLIDES.length}`}>
        {SLIDES.map((_, k) => (
          <button
            key={k}
            className={`ob-dot${k === i ? " on" : ""}`}
            aria-label={`Go to slide ${k + 1}`}
            onClick={() => setI(k)}
          />
        ))}
      </div>

      {isLast ? (
        <div className="ob-actions ob-actions--last">
          <button className="btn big-btn" onClick={() => onDone(true)}>
            Start cooking
          </button>
          <button className="link" onClick={() => onDone(false)}>
            Set up my kitchen first
          </button>
        </div>
      ) : (
        <div className="ob-actions">
          <button className="btn" onClick={advance}>
            {slide.cta}
          </button>
        </div>
      )}
    </section>
  );
}
