export type Skin = "modern" | "atlas";
export type ThemeMode = "light" | "dark";

export type BoardTerritory = {
  canonical_name: string;
  wikidata_qid: string | null;
  type: string;
  in_play: boolean;
};

export type BoardMetadata = {
  board_id: string;
  region: string;
  valid_from: number;
  valid_to: number;
  confidence: string;
  change_note: string;
  geojson_url: string;
  attribution: string;
  source: {
    name: string;
    license: string;
    doi: string;
    artifact: string;
    simplification: string;
  };
  territories: BoardTerritory[];
};

export type TerritoryProperties = {
  canonical_name: string;
  wikidata_qid: string | null;
  type: string;
  in_play: boolean;
  source_name: string;
  from_year: number | null;
  to_year: number | null;
};

export type GeoJsonFeature = {
  type: "Feature";
  geometry: unknown;
  properties: TerritoryProperties;
};

export type BorderStateGeoJson = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
  metadata: Record<string, unknown>;
};

export type BaseGeoJson = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: unknown;
    properties: Record<string, unknown>;
  }>;
};
