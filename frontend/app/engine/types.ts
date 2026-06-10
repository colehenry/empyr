export type GameMode = "identify" | "guess_year";
export type GameTier = "explorer" | "historian";
export type IdentifyDirection = "find-on-map" | "name-the-territory";
export type IdentifyInput = "choice" | "bank" | "type";
export type GamePhase = "playing" | "complete";

export type EngineConfig = {
  mode: GameMode;
  direction: IdentifyDirection;
  input: IdentifyInput;
  blankMap: boolean;
  roundCount: number;
};

export type MatchKind = "exact" | "core" | "fuzzy" | "click" | "year" | null;

export type RoundResult = {
  target: string;
  answer: string;
  correct: boolean;
  matchKind: MatchKind;
  elapsedMs: number;
  points: number;
};

export type EngineRound = {
  target: string;
  choices: string[] | null;
  startedAtMs: number | null;
};

export type EngineState = {
  config: EngineConfig;
  tier: GameTier;
  boardId: string;
  seed: string;
  validFrom: number;
  validTo: number;
  rounds: EngineRound[];
  currentRound: number;
  results: RoundResult[];
  phase: GamePhase;
  totalPoints: number;
};

export type EngineAnswer =
  | { kind: "name"; value: string }
  | { kind: "click"; lngLat: [number, number] }
  | { kind: "year"; value: number };

export type EngineBoard = {
  board_id: string;
  valid_from: number;
  valid_to: number;
  territories: Array<{ canonical_name: string; in_play: boolean }>;
};

export type HitFeature = {
  geometry: unknown;
  properties: { canonical_name: string; in_play: boolean };
};
