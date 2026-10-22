import { describe, expect, it } from "vitest";
import { createBirth } from "../server/src/simulation/birth.js";
import { gameConfigSchema } from "@life-duel/shared";
import { TEST_CONFIG } from "./helpers.js";

describe("registro de nacimiento", () => {
  it("conserva padres y economía al reproducir una semilla", () => {
    const config = { ...TEST_CONFIG, fixedYear: 2026 };
    const birth = createBirth("birth-certificate", config);
    expect(birth).toEqual(createBirth("birth-certificate", config));
    expect(birth.era).toBe("present");
    expect(birth.details?.mother.name).toBeTruthy();
    expect(birth.details?.father.name).toBeTruthy();
    expect(birth.details?.annualHouseholdIncome).toBeGreaterThan(0);
  });
  it("acepta el sorteo por población y la velocidad 12×", () => {
    const config = gameConfigSchema.parse({ ...TEST_CONFIG, countryMode: "population", fixedCountry: undefined, speed: 12 });
    const birth = createBirth("population-certificate", config);
    expect(birth.countryCode).toHaveLength(3);
    expect(birth).toEqual(createBirth("population-certificate", config));
    expect(config.speed).toBe(12);
  });
  it("genera hogares coherentes y probabilidades válidas", () => {
    for (let i = 0; i < 100; i++) {
      const birth = createBirth(`family-${i}`, TEST_CONFIG);
      const d = birth.details!;
      expect(d.siblings.length + 3).toBe(birth.family.householdSize);
      expect(d.month).toBeGreaterThanOrEqual(1);
      expect(d.month).toBeLessThanOrEqual(12);
      expect(d.birthShare).toBeGreaterThan(0);
      expect(d.birthShare).toBeLessThan(1);
      for (const sibling of d.siblings) expect(d.mother.age - sibling.age).toBeGreaterThanOrEqual(17);
      if (d.rural) expect(birth.family.story).toContain("zona rural");
    }
  });
});
