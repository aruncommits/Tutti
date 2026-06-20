import { describe, it, expect } from "vitest";
import { validate } from "@tutti/engine";
import { splitTiers, parseBatch } from "../src/batchParse";

// A representative batched response (captured from the Claude CLI) — clean per-tier sections with a
// title, Serves, Best for, Ingredients, Method. Guards the split + strip + parse path.
const RAW = `=== TIER: simple ===
Chicken Shawarma
Serves: 4
Best for: 2
Ingredients:
700g boneless chicken thighs
2 tsp cumin
2 tbsp olive oil
4 flatbreads
Method:
1. Mix the spices with olive oil.
2. Coat the chicken and rest 15 minutes.
3. Sear 5-6 minutes per side until charred.

=== TIER: moderate ===
Chicken Shawarma
Serves: 4
Best for: 4
Ingredients:
800g chicken thighs
1 cup yogurt
2 tsp coriander
1 lemon
Method:
1. Marinate chicken in yogurt and spices 1 hour.
2. Grill until cooked through.
3. Slice and serve in flatbread.

=== TIER: complex ===
Chicken Shawarma
Serves: 6
Best for: 6
Ingredients:
1.2kg chicken thighs
2 cups yogurt
3 tbsp shawarma spice
Method:
1. Marinate overnight.
2. Stack and roast, then char.
3. Carve thin and serve with sauces.`;

describe("batched 3-tier parsing", () => {
  it("splits into three tier sections", () => {
    const s = splitTiers(RAW);
    expect(Object.keys(s).sort()).toEqual(["complex", "moderate", "simple"]);
  });

  it("parses each tier to a valid recipe with the correct title and serving size", async () => {
    const map = await parseBatch(RAW);
    expect([...map.keys()].sort()).toEqual(["complex", "moderate", "simple"]);

    const simple = map.get("simple")!;
    expect(simple.name).toBe("Chicken Shawarma"); // title kept (not "Imported recipe")
    expect(simple.servings).toBe(4); // base yield captured (not the default 2)
    expect(simple.minServings).toBe(2); // "Best for: 2"
    expect(validate(simple).ok).toBe(true);
    expect(simple.nodes.length).toBeGreaterThan(0);
    expect(simple.nodes[0]!.ingredients.some((i) => /serv|best for/i.test(i.name))).toBe(false);

    expect(map.get("complex")!.servings).toBe(6);
  });
});
