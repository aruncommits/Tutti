import { describe, it, expect } from "vitest";
import { goldenLibrary } from "@tutti/engine";
import { requiredEquipment, missingEquipment, labelFor } from "./mise";
import { DEFAULT_KITCHEN } from "./kitchenModel";

const chutney = goldenLibrary.find((r) => r.recipeId === "rec_chutney")!; // uses a blender
const meal = [chutney];

describe("mise (Brief v20 item 1)", () => {
  it("lists required equipment, excluding hands, de-duplicated and sorted", () => {
    const eq = requiredEquipment(meal);
    expect(eq).not.toContain("hands");
    expect(eq).toContain("blender");
    expect(new Set(eq).size).toBe(eq.length); // de-duped
    expect([...eq]).toEqual([...eq].sort()); // stable order
  });

  it("labels categories for display", () => {
    expect(labelFor("blender")).toMatch(/blender/i);
    expect(labelFor("pressure_cooker")).toBe("Pressure cooker");
    expect(labelFor("unknown_thing")).toBe("unknown_thing");
  });

  it("flags equipment the kitchen lacks, and is empty when all present", () => {
    expect(missingEquipment(meal, DEFAULT_KITCHEN)).toEqual([]); // default has a blender
    const noBlender = { ...DEFAULT_KITCHEN, blender: false };
    expect(missingEquipment(meal, noBlender)).toContain("blender");
  });
});
