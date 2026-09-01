import { describe, expect, it } from "vitest";
import {
  compareCompanyUsersBySearch,
  computeCompanyUserSearchScore,
} from "./company-search";

describe("company directory ranking", () => {
  it("prefers an exact name over partial matches", () => {
    const exact = computeCompanyUserSearchScore("Nina Lee", "nina@example.com", "Nina Lee");
    const partial = computeCompanyUserSearchScore("Nina Leung", "nleung@example.com", "Nina Lee");

    expect(exact).toBeGreaterThan(partial);
  });

  it("ranks prefix matches before broad email matches", () => {
    const users = [
      { displayName: "Alexandra Wong", mail: "awong@example.com" },
      { displayName: "Nattapol Saeng", mail: "alex@example.com" },
    ];

    expect(users.sort((a, b) => compareCompanyUsersBySearch(a, b, "alex"))[0].displayName)
      .toBe("Alexandra Wong");
  });
});
