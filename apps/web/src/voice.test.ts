import { describe, it, expect } from "vitest";
import { parseVoiceCommand } from "./voice";

const t = (s: string) => parseVoiceCommand(s).type;

describe("parseVoiceCommand (Brief v5 item 1, Doc 7 §11.1)", () => {
  it("maps advance words to complete", () => {
    expect(t("done")).toBe("complete");
    expect(t("next")).toBe("complete");
    expect(t("finished")).toBe("complete");
    expect(t("ok that's it")).toBe("complete");
    expect(t("DONE!")).toBe("complete");
  });

  it("maps status questions", () => {
    expect(t("what's next")).toBe("status");
    expect(t("what now")).toBe("status");
    expect(t("next up?")).toBe("status");
  });

  it("does not confuse 'what's next' with complete", () => {
    expect(t("what's next")).not.toBe("complete");
  });

  it("maps timing questions", () => {
    expect(t("how long")).toBe("howLong");
    expect(t("how much time")).toBe("howLong");
    expect(t("how much longer on the rice")).toBe("howLong");
  });

  it("maps repeat and pause", () => {
    expect(t("say that again")).toBe("repeat");
    expect(t("repeat")).toBe("repeat");
    expect(t("hold on")).toBe("pause");
    expect(t("pause")).toBe("pause");
  });

  it("returns unknown for unrecognized or empty input", () => {
    expect(t("")).toBe("unknown");
    expect(t("add more salt please")).toBe("unknown");
    expect(t("tell me a joke")).toBe("unknown");
  });

  it("parses a set-timer command with minutes (digits or words)", () => {
    expect(parseVoiceCommand("set a 12 minute timer")).toEqual({ type: "setTimer", minutes: 12 });
    expect(parseVoiceCommand("start a timer for 5 minutes")).toEqual({ type: "setTimer", minutes: 5 });
    expect(parseVoiceCommand("set a timer for ten minutes")).toEqual({ type: "setTimer", minutes: 10 });
    expect(t("set a timer")).toBe("unknown"); // no duration → not actionable
  });

  it("maps read-step", () => {
    expect(t("read the step")).toBe("readStep");
    expect(t("read it")).toBe("readStep");
  });
});
