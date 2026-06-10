import { describe, expect, it } from "vitest";
import { geometryArea, hitTest, pointInGeometry } from "../hitTest";
import type { HitFeature } from "../types";

function square(cx: number, cy: number, half: number): number[][] {
  return [
    [cx - half, cy - half],
    [cx + half, cy - half],
    [cx + half, cy + half],
    [cx - half, cy + half],
    [cx - half, cy - half]
  ];
}

function feature(name: string, inPlay: boolean, geometry: unknown): HitFeature {
  return { geometry, properties: { canonical_name: name, in_play: inPlay } };
}

describe("pointInGeometry", () => {
  it("detects points inside a polygon", () => {
    const polygon = { type: "Polygon", coordinates: [square(0, 0, 10)] };
    expect(pointInGeometry([0, 0], polygon)).toBe(true);
    expect(pointInGeometry([11, 0], polygon)).toBe(false);
  });

  it("excludes points inside holes", () => {
    const polygon = { type: "Polygon", coordinates: [square(0, 0, 10), square(0, 0, 2)] };
    expect(pointInGeometry([0, 0], polygon)).toBe(false);
    expect(pointInGeometry([5, 5], polygon)).toBe(true);
  });

  it("handles multipolygons", () => {
    const multi = {
      type: "MultiPolygon",
      coordinates: [[square(0, 0, 1)], [square(20, 20, 1)]]
    };
    expect(pointInGeometry([20, 20], multi)).toBe(true);
    expect(pointInGeometry([10, 10], multi)).toBe(false);
  });

  it("rejects non-polygon geometry", () => {
    expect(pointInGeometry([0, 0], { type: "Point", coordinates: [0, 0] })).toBe(false);
    expect(pointInGeometry([0, 0], null)).toBe(false);
  });
});

describe("geometryArea", () => {
  it("ranks polygons by size", () => {
    const small = { type: "Polygon", coordinates: [square(0, 0, 1)] };
    const large = { type: "Polygon", coordinates: [square(0, 0, 10)] };
    expect(geometryArea(small)).toBeLessThan(geometryArea(large));
  });
});

describe("hitTest", () => {
  const empire = feature("Holy Roman Empire", true, {
    type: "Polygon",
    coordinates: [square(0, 0, 10)]
  });
  const duchy = feature("Duchy of Bavaria", true, {
    type: "Polygon",
    coordinates: [square(2, 2, 1)]
  });
  const relation = feature("(Personal union)", false, {
    type: "Polygon",
    coordinates: [square(-5, -5, 4)]
  });

  it("resolves overlapping territories to the smallest one", () => {
    expect(hitTest([2, 2], [empire, duchy])?.properties.canonical_name).toBe("Duchy of Bavaria");
  });

  it("falls back to the larger territory outside the overlap", () => {
    expect(hitTest([-8, 8], [empire, duchy])?.properties.canonical_name).toBe("Holy Roman Empire");
  });

  it("prefers in-play territories over out-of-play ones", () => {
    expect(hitTest([-5, -5], [empire, relation])?.properties.canonical_name).toBe("Holy Roman Empire");
  });

  it("returns out-of-play territory when nothing in-play contains the point", () => {
    const lonely = feature("(Personal union)", false, {
      type: "Polygon",
      coordinates: [square(50, 50, 1)]
    });
    expect(hitTest([50, 50], [empire, lonely])?.properties.canonical_name).toBe("(Personal union)");
  });

  it("returns null on open water", () => {
    expect(hitTest([100, 100], [empire, duchy])).toBeNull();
  });
});
