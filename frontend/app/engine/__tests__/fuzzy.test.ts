import { describe, expect, it } from "vitest";
import { coreName, levenshtein, matchName, normalizeName, similarity } from "../fuzzy";

describe("normalizeName", () => {
  it("lowercases, strips punctuation and diacritics", () => {
    expect(normalizeName("(Habsburg Monarchy)")).toBe("habsburg monarchy");
    expect(normalizeName("Comtat Venaissin")).toBe("comtat venaissin");
    expect(normalizeName("Aq Qoyunlu  ")).toBe("aq qoyunlu");
    expect(normalizeName("Köln")).toBe("koln");
  });
});

describe("coreName", () => {
  it("strips leading descriptors", () => {
    expect(coreName("Kingdom of France")).toBe("france");
    expect(coreName("Grand Principality of Moscow")).toBe("moscow");
    expect(coreName("Republic of Venice")).toBe("venice");
  });

  it("strips trailing descriptors", () => {
    expect(coreName("Ottoman Empire")).toBe("ottoman");
    expect(coreName("Crimean Khanate")).toBe("crimean");
    expect(coreName("Hafsid Dynasty")).toBe("hafsid");
  });

  it("keeps names without descriptors intact", () => {
    expect(coreName("Ryazan")).toBe("ryazan");
  });
});

describe("levenshtein / similarity", () => {
  it("computes edit distance", () => {
    expect(levenshtein("france", "france")).toBe(0);
    expect(levenshtein("france", "frence")).toBe(1);
    expect(levenshtein("", "abc")).toBe(3);
  });

  it("computes normalized similarity", () => {
    expect(similarity("france", "france")).toBe(1);
    expect(similarity("france", "frence")).toBeCloseTo(5 / 6);
  });
});

describe("matchName", () => {
  it("accepts exact canonical names", () => {
    expect(matchName("Kingdom of France", "Kingdom of France")).toEqual({ match: true, kind: "exact" });
  });

  it("accepts case and punctuation variants", () => {
    expect(matchName("kingdom of france", "Kingdom of France").match).toBe(true);
    expect(matchName("habsburg monarchy", "(Habsburg Monarchy)").match).toBe(true);
  });

  it("accepts core-name shorthand", () => {
    expect(matchName("france", "Kingdom of France")).toEqual({ match: true, kind: "core" });
    expect(matchName("venice", "Republic of Venice").match).toBe(true);
    expect(matchName("ottoman", "Ottoman Empire").match).toBe(true);
  });

  it("forgives small typos", () => {
    expect(matchName("Kingdom of Frence", "Kingdom of France").match).toBe(true);
    expect(matchName("portugall", "Kingdom of Portugal").match).toBe(true);
  });

  it("rejects different territories", () => {
    expect(matchName("Kingdom of England", "Kingdom of France").match).toBe(false);
    expect(matchName("guria", "Kingdom of Georgia").match).toBe(false);
    expect(matchName("", "Kingdom of France").match).toBe(false);
  });
});
