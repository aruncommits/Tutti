import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { compile, thaliV1 } from "@tutti/engine";
import { CookScreen } from "./CookScreen";

// Minimal SpeechRecognition stub so useSpeech reports supported=true under jsdom.
class StubSR {
  lang = "";
  continuous = false;
  interimResults = false;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: unknown) => void) | null = null;
  onend: (() => void) | null = null;
  start() {}
  stop() {}
}

afterEach(() => {
  delete (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition;
});

const plan = () => compile(thaliV1.recipes, thaliV1.kitchenProfile, thaliV1.targetServeTime);

describe("CookScreen voice (Brief v5 item 5)", () => {
  it("shows a mic control when speech is supported, and the on-screen Done remains (fallback)", () => {
    (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition = StubSR;
    render(<CookScreen plan={plan()} pro onComplete={vi.fn()} onUndo={vi.fn()} onReset={vi.fn()} />);

    expect(screen.getByRole("button", { name: /voice control/i })).toBeInTheDocument();
    // fallback invariant: tapping is always possible
    expect(screen.getAllByRole("button", { name: /done/i }).length).toBeGreaterThan(0);
  });

  it("hides the mic when speech is unsupported (no SpeechRecognition)", () => {
    render(<CookScreen plan={plan()} pro onComplete={vi.fn()} onUndo={vi.fn()} onReset={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /voice control/i })).toBeNull();
    expect(screen.getAllByRole("button", { name: /done/i }).length).toBeGreaterThan(0);
  });
});
