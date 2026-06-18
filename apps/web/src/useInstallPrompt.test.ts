import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { useInstallPrompt } from "./useInstallPrompt";

describe("useInstallPrompt (Brief v27 item 1)", () => {
  it("reports not-installable and no-ops with no event (jsdom/iOS)", async () => {
    const { result } = renderHook(() => useInstallPrompt());
    expect(result.current.canInstall).toBe(false);
    await act(async () => { await result.current.promptInstall(); }); // must not throw
    expect(result.current.canInstall).toBe(false);
  });

  it("becomes installable on beforeinstallprompt, then hides after prompting", async () => {
    const { result } = renderHook(() => useInstallPrompt());

    const prompt = vi.fn().mockResolvedValue(undefined);
    const e = new Event("beforeinstallprompt") as Event & { prompt?: unknown };
    e.prompt = prompt;
    act(() => { window.dispatchEvent(e); });
    expect(result.current.canInstall).toBe(true);

    await act(async () => { await result.current.promptInstall(); });
    expect(prompt).toHaveBeenCalledTimes(1);
    expect(result.current.canInstall).toBe(false); // consumed -> button hides
  });

  it("clears installability on appinstalled", () => {
    const { result } = renderHook(() => useInstallPrompt());
    const e = new Event("beforeinstallprompt") as Event & { prompt?: unknown };
    e.prompt = vi.fn();
    act(() => { window.dispatchEvent(e); });
    expect(result.current.canInstall).toBe(true);
    act(() => { window.dispatchEvent(new Event("appinstalled")); });
    expect(result.current.canInstall).toBe(false);
  });
});
