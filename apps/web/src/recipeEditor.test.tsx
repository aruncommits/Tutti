import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PasteParser } from "@tutti/ingest";
import type { RecipeGraph, TaskNode } from "@tutti/engine";
import { RecipeEditor } from "./RecipeEditor";
import { assembleRecipeText } from "./recipeView";

function sample(): RecipeGraph {
  const node = (id: number, instruction: string, ingredients: TaskNode["ingredients"]): TaskNode => ({
    nodeId: `amb_${id}`, recipeId: "dish_ambur_chicken_biryani_moderate", title: instruction, instruction,
    phase: "cook", attention: "active", duration: { estMins: 10, minMins: 7, maxMins: 15, elastic: false },
    ingredients, resources: [], dependencies: id === 1 ? [] : [`amb_${id - 1}`],
  });
  return {
    recipeId: "dish_ambur_chicken_biryani_moderate", name: "Ambur Chicken Biryani", version: 1, servings: 4,
    verified: true, category: "Biryani & Pulao", cuisine: "Indian", tier: "moderate",
    nodes: [
      node(1, "Marinate the chicken", [{ name: "chicken", amount: 500, unit: "g" }, { name: "chili powder", amount: 2, unit: "tsp" }]),
      node(2, "Cook on dum (20 min)", []),
    ],
  };
}

describe("recipe customize editor", () => {
  it("round-trips edited fields through the paste parser into a valid graph", async () => {
    const text = assembleRecipeText(
      "Ambur Chicken Biryani",
      6,
      ["10 dried red chilies, soaked and ground to a paste", "500 g chicken"],
      ["Marinate the chicken (30 min)", "Cook on dum (20 min)"],
    );
    const { graph } = await new PasteParser().parse({ source: "paste", text });
    expect(graph).not.toBeNull();
    expect(graph!.name).toBe("Ambur Chicken Biryani");
    expect(graph!.servings).toBe(6); // stated Serves trusted
    const ingNames = graph!.nodes.flatMap((n) => n.ingredients).map((i) => i.name);
    expect(ingNames.some((n) => /red chilies.*paste/.test(n))).toBe(true); // the signature edit survived
    expect(graph!.nodes.length).toBe(2);
  });

  it("prefills from the recipe and saves a personal copy (verified=false, identity kept)", async () => {
    const onSave = vi.fn();
    render(<RecipeEditor recipe={sample()} onSave={onSave} onCancel={() => {}} />);

    // prefilled with the original ingredient line
    expect(screen.getByDisplayValue(/chili powder/i)).toBeTruthy();

    // rename and save
    fireEvent.change(screen.getByLabelText("Recipe name"), { target: { value: "Ambur Chicken Biryani (my version)" } });
    fireEvent.click(screen.getByRole("button", { name: /save to my recipes/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const saved = onSave.mock.calls[0]![0] as RecipeGraph;
    expect(saved.name).toBe("Ambur Chicken Biryani (my version)");
    expect(saved.recipeId).toBe("dish_ambur_chicken_biryani_moderate"); // identity preserved
    expect(saved.dishId).toBe("dish_ambur_chicken_biryani_moderate");
    expect(saved.tier).toBe("moderate");
    expect(saved.verified).toBe(false); // a personal, unverified copy
    expect(saved.nodes.flatMap((n) => n.ingredients).length).toBeGreaterThan(0);
  });
});
