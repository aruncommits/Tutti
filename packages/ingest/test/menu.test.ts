import { describe, it, expect } from "vitest";
import { parseMenu } from "../src/menu";

const MENU = `STARTERS
Paneer Tikka .......... 280
Chicken 65 - crispy fried chicken tossed with curry leaves ₹320
Veg Spring Rolls    180

MAINS
Hyderabadi Chicken Biryani ₹350
Dal Makhani — slow-cooked black lentils in butter and cream    260
Butter Naan 60/-

DESSERTS
Gulab Jamun (2 pcs) 120
`;

describe("parseMenu", () => {
  const dishes = parseMenu(MENU);

  it("extracts dish names and strips prices (but keeps numerals that are part of the name)", () => {
    expect(dishes).toContain("Paneer Tikka");
    expect(dishes).toContain("Hyderabadi Chicken Biryani");
    expect(dishes).toContain("Butter Naan");
    expect(dishes).toContain("Veg Spring Rolls"); // trailing 180 stripped
    expect(dishes).toContain("Chicken 65"); // 65 is part of the dish name — kept
    expect(dishes.every((d) => !/\b(280|350|180|260|120|320)\b/.test(d))).toBe(true); // prices gone
  });

  it("drops section headers", () => {
    for (const h of ["STARTERS", "MAINS", "DESSERTS"]) expect(dishes).not.toContain(h);
  });

  it("keeps the dish name and drops an inline description after a dash", () => {
    expect(dishes).toContain("Chicken 65");
    expect(dishes).toContain("Dal Makhani");
    expect(dishes.some((d) => /slow-cooked|crispy fried/.test(d))).toBe(false);
  });

  it("dedupes and ignores blank lines", () => {
    expect(parseMenu("Tea\ntea\n\n  \nTEA").length).toBe(1);
  });
});
