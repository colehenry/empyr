import { describe, expect, it } from "vitest";
import {
  FULL_SPEED_MS,
  MIN_TIME_WEIGHT,
  ROUND_BASE_POINTS,
  SLOWEST_WEIGHTED_MS,
  identifyPoints,
  timeWeight,
  yearDistance,
  yearPoints
} from "../scoring";

describe("timeWeight", () => {
  it("gives full weight inside the grace window", () => {
    expect(timeWeight(0)).toBe(1);
    expect(timeWeight(FULL_SPEED_MS)).toBe(1);
  });

  it("decays linearly to the floor", () => {
    const midpoint = (FULL_SPEED_MS + SLOWEST_WEIGHTED_MS) / 2;
    expect(timeWeight(midpoint)).toBeCloseTo((1 + MIN_TIME_WEIGHT) / 2);
    expect(timeWeight(SLOWEST_WEIGHTED_MS)).toBe(MIN_TIME_WEIGHT);
    expect(timeWeight(SLOWEST_WEIGHTED_MS * 10)).toBe(MIN_TIME_WEIGHT);
  });
});

describe("identifyPoints", () => {
  it("scores fast correct answers at full base", () => {
    expect(identifyPoints(true, 1_000)).toBe(ROUND_BASE_POINTS);
  });

  it("weights slow correct answers down", () => {
    expect(identifyPoints(true, SLOWEST_WEIGHTED_MS)).toBe(ROUND_BASE_POINTS * MIN_TIME_WEIGHT);
  });

  it("scores incorrect answers zero regardless of speed", () => {
    expect(identifyPoints(false, 1_000)).toBe(0);
  });
});

describe("yearDistance", () => {
  it("is zero anywhere inside the span", () => {
    expect(yearDistance(1450, 1400, 1500)).toBe(0);
    expect(yearDistance(1400, 1400, 1500)).toBe(0);
    expect(yearDistance(1500, 1400, 1500)).toBe(0);
  });

  it("measures distance from the nearest span edge", () => {
    expect(yearDistance(1350, 1400, 1500)).toBe(50);
    expect(yearDistance(1600, 1400, 1500)).toBe(100);
  });
});

describe("yearPoints", () => {
  it("gives full marks inside the span", () => {
    expect(yearPoints(1500, 1500, 1500, 1_000)).toBe(ROUND_BASE_POINTS);
  });

  it("decays with distance outside the span", () => {
    expect(yearPoints(1550, 1500, 1500, 1_000)).toBe(ROUND_BASE_POINTS * 0.75);
    expect(yearPoints(1400, 1500, 1500, 1_000)).toBe(ROUND_BASE_POINTS * 0.5);
  });

  it("bottoms out at zero beyond the decay window", () => {
    expect(yearPoints(1000, 1500, 1500, 1_000)).toBe(0);
  });

  it("applies time weighting on top of distance decay", () => {
    expect(yearPoints(1500, 1500, 1500, SLOWEST_WEIGHTED_MS)).toBe(ROUND_BASE_POINTS * MIN_TIME_WEIGHT);
  });
});
