import type { HitFeature } from "./types";

type Ring = Array<[number, number]>;
type PolygonCoords = Ring[];
type Point = [number, number];

function pointInRing(point: Point, ring: Ring): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const crosses = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (crosses) {
      inside = !inside;
    }
  }
  return inside;
}

function pointInPolygon(point: Point, polygon: PolygonCoords): boolean {
  if (polygon.length === 0 || !pointInRing(point, polygon[0])) {
    return false;
  }
  for (let i = 1; i < polygon.length; i += 1) {
    if (pointInRing(point, polygon[i])) {
      return false;
    }
  }
  return true;
}

function ringArea(ring: Ring): number {
  let area = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    area += (ring[j][0] + ring[i][0]) * (ring[j][1] - ring[i][1]);
  }
  return Math.abs(area / 2);
}

type Geometry =
  | { type: "Polygon"; coordinates: PolygonCoords }
  | { type: "MultiPolygon"; coordinates: PolygonCoords[] }
  | { type: string; coordinates?: unknown };

export function pointInGeometry(point: Point, geometry: unknown): boolean {
  const geo = geometry as Geometry;
  if (!geo || typeof geo !== "object") {
    return false;
  }
  if (geo.type === "Polygon") {
    return pointInPolygon(point, geo.coordinates as PolygonCoords);
  }
  if (geo.type === "MultiPolygon") {
    return (geo.coordinates as PolygonCoords[]).some((polygon) => pointInPolygon(point, polygon));
  }
  return false;
}

export function geometryArea(geometry: unknown): number {
  const geo = geometry as Geometry;
  if (!geo || typeof geo !== "object") {
    return 0;
  }
  if (geo.type === "Polygon") {
    const polygon = geo.coordinates as PolygonCoords;
    return polygon.length ? ringArea(polygon[0]) : 0;
  }
  if (geo.type === "MultiPolygon") {
    return (geo.coordinates as PolygonCoords[]).reduce(
      (total, polygon) => total + (polygon.length ? ringArea(polygon[0]) : 0),
      0
    );
  }
  return 0;
}

/**
 * Cliopatria polities can overlap (e.g. the Holy Roman Empire over its member
 * states), so a click resolves to the smallest containing territory; in-play
 * territories win over out-of-play ones.
 */
export function hitTest(point: Point, features: readonly HitFeature[]): HitFeature | null {
  const containing = features.filter((feature) => pointInGeometry(point, feature.geometry));
  if (containing.length === 0) {
    return null;
  }
  const pool = containing.some((feature) => feature.properties.in_play)
    ? containing.filter((feature) => feature.properties.in_play)
    : containing;
  return pool.reduce((smallest, feature) =>
    geometryArea(feature.geometry) < geometryArea(smallest.geometry) ? feature : smallest
  );
}
