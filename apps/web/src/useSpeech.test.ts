import { renderHook, act } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { useSpeech } from "./useSpeech";

describe("useSpeech (Brief v5 item 2)", () => {
  it("reports unsupported under jsdom (no SpeechRecognition) and no-ops safely", () => {
    const { result } = renderHook(() => useSpeech());
    expect(result.current.supported).toBe(false);
    expect(result.current.listening).toBe(false);
    act(() => result.current.start());
    expect(result.current.listening).toBe(false); // start is a no-op when unsupported
    act(() => result.current.stop());
  });
});
