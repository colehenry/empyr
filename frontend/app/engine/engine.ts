import { matchName } from "./fuzzy";
import { hitTest } from "./hitTest";
import { identifyPoints, yearPoints } from "./scoring";
import { sampleWithoutReplacement, seededRng, shuffle } from "./rng";
import type {
  EngineAnswer,
  EngineBoard,
  EngineConfig,
  EngineRound,
  EngineState,
  GameTier,
  HitFeature,
  MatchKind,
  RoundResult
} from "./types";

export const DEFAULT_ROUND_COUNT = 8;
export const CHOICE_COUNT = 4;

export function deriveTier(config: EngineConfig): GameTier {
  if (!config.blankMap) {
    return "explorer";
  }
  if (config.mode === "guess_year") {
    return "historian";
  }
  return config.direction === "find-on-map" || config.input === "type" ? "historian" : "explorer";
}

export function playableNames(board: EngineBoard): string[] {
  return board.territories
    .filter((territory) => territory.in_play)
    .map((territory) => territory.canonical_name);
}

export function wordBank(board: EngineBoard): string[] {
  return [...playableNames(board)].sort((a, b) => a.localeCompare(b));
}

export function createGame(board: EngineBoard, config: EngineConfig, seed: string, nowMs: number): EngineState {
  const rng = seededRng(`${seed}:${board.board_id}:${config.mode}`);
  let rounds: EngineRound[];

  if (config.mode === "guess_year") {
    rounds = [{ target: board.board_id, choices: null, startedAtMs: nowMs }];
  } else {
    const pool = playableNames(board);
    if (pool.length === 0) {
      throw new Error(`Board ${board.board_id} has no in-play territories`);
    }
    const roundCount = Math.min(Math.max(config.roundCount, 1), pool.length);
    const targets = sampleWithoutReplacement(pool, roundCount, rng);
    rounds = targets.map((target, index) => ({
      target,
      choices:
        config.direction === "name-the-territory" && config.input === "choice"
          ? buildChoices(target, pool, rng)
          : null,
      startedAtMs: index === 0 ? nowMs : null
    }));
  }

  return {
    config,
    tier: deriveTier(config),
    boardId: board.board_id,
    seed,
    validFrom: board.valid_from,
    validTo: board.valid_to,
    rounds,
    currentRound: 0,
    results: [],
    phase: "playing",
    totalPoints: 0
  };
}

function buildChoices(target: string, pool: string[], rng: () => number): string[] {
  const distractors = sampleWithoutReplacement(
    pool.filter((name) => name !== target),
    CHOICE_COUNT - 1,
    rng
  );
  return shuffle([target, ...distractors], rng);
}

export function startRound(state: EngineState, nowMs: number): EngineState {
  if (state.phase !== "playing") {
    return state;
  }
  const round = state.rounds[state.currentRound];
  if (round.startedAtMs !== null) {
    return state;
  }
  const rounds = state.rounds.map((item, index) =>
    index === state.currentRound ? { ...item, startedAtMs: nowMs } : item
  );
  return { ...state, rounds };
}

export function currentRound(state: EngineState): EngineRound | null {
  return state.phase === "playing" ? state.rounds[state.currentRound] : null;
}

export function answerRound(
  state: EngineState,
  answer: EngineAnswer,
  nowMs: number,
  features: readonly HitFeature[] = []
): { state: EngineState; result: RoundResult } {
  if (state.phase !== "playing") {
    throw new Error("Game is not in progress");
  }
  const round = state.rounds[state.currentRound];
  const elapsedMs = Math.max(0, nowMs - (round.startedAtMs ?? nowMs));

  let result: RoundResult;
  if (state.config.mode === "guess_year") {
    if (answer.kind !== "year") {
      throw new Error("Guess the Year expects a year answer");
    }
    const points = yearPoints(answer.value, state.validFrom, state.validTo, elapsedMs);
    result = {
      target: `${state.validFrom}-${state.validTo}`,
      answer: String(answer.value),
      correct: answer.value >= state.validFrom && answer.value <= state.validTo,
      matchKind: "year",
      elapsedMs,
      points
    };
  } else if (answer.kind === "click") {
    const hit = hitTest(answer.lngLat, features);
    const guessed = hit?.properties.canonical_name ?? "";
    const correct = guessed === round.target;
    result = {
      target: round.target,
      answer: guessed,
      correct,
      matchKind: "click",
      elapsedMs,
      points: identifyPoints(correct, elapsedMs)
    };
  } else if (answer.kind === "name") {
    const typed = state.config.input === "type";
    const { match, kind } = typed
      ? matchName(answer.value, round.target)
      : exactSelection(answer.value, round.target);
    result = {
      target: round.target,
      answer: answer.value,
      correct: match,
      matchKind: kind,
      elapsedMs,
      points: identifyPoints(match, elapsedMs)
    };
  } else {
    throw new Error("Identify mode expects a click or name answer");
  }

  const results = [...state.results, result];
  const isLastRound = state.currentRound === state.rounds.length - 1;
  const nextState: EngineState = {
    ...state,
    results,
    totalPoints: state.totalPoints + result.points,
    currentRound: isLastRound ? state.currentRound : state.currentRound + 1,
    phase: isLastRound ? "complete" : "playing"
  };
  return { state: nextState, result };
}

function exactSelection(value: string, target: string): { match: boolean; kind: MatchKind } {
  const match = value === target;
  return { match, kind: match ? "exact" : null };
}
