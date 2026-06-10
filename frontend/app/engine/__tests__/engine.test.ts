import { describe, expect, it } from "vitest";
import { answerRound, createGame, currentRound, deriveTier, startRound, wordBank } from "../engine";
import { ROUND_BASE_POINTS } from "../scoring";
import type { EngineBoard, EngineConfig, HitFeature } from "../types";

const board: EngineBoard = {
  board_id: "europe-med-1500",
  valid_from: 1500,
  valid_to: 1500,
  territories: [
    { canonical_name: "Kingdom of France", in_play: true },
    { canonical_name: "Kingdom of England", in_play: true },
    { canonical_name: "Ottoman Empire", in_play: true },
    { canonical_name: "Republic of Venice", in_play: true },
    { canonical_name: "Kingdom of Portugal", in_play: true },
    { canonical_name: "(Personal union)", in_play: false }
  ]
};

const identifyConfig: EngineConfig = {
  mode: "identify",
  direction: "name-the-territory",
  input: "type",
  blankMap: false,
  roundCount: 3
};

function square(cx: number, cy: number, half: number): number[][] {
  return [
    [cx - half, cy - half],
    [cx + half, cy - half],
    [cx + half, cy + half],
    [cx - half, cy + half],
    [cx - half, cy - half]
  ];
}

describe("createGame", () => {
  it("samples in-play targets only, without repeats", () => {
    const state = createGame(board, { ...identifyConfig, roundCount: 5 }, "seed-1", 0);
    const targets = state.rounds.map((round) => round.target);
    expect(new Set(targets).size).toBe(5);
    expect(targets).not.toContain("(Personal union)");
  });

  it("is deterministic for the same seed and differs across seeds", () => {
    const a = createGame(board, identifyConfig, "daily-2026-06-09", 0);
    const b = createGame(board, identifyConfig, "daily-2026-06-09", 50_000);
    const c = createGame(board, identifyConfig, "daily-2026-06-10", 0);
    expect(a.rounds.map((r) => r.target)).toEqual(b.rounds.map((r) => r.target));
    expect(
      a.rounds.map((r) => r.target).join("|") === c.rounds.map((r) => r.target).join("|")
    ).toBe(false);
  });

  it("clamps round count to the in-play pool", () => {
    const state = createGame(board, { ...identifyConfig, roundCount: 50 }, "seed", 0);
    expect(state.rounds).toHaveLength(5);
  });

  it("builds four multiple-choice options containing the target", () => {
    const state = createGame(board, { ...identifyConfig, input: "choice" }, "seed", 0);
    for (const round of state.rounds) {
      expect(round.choices).toHaveLength(4);
      expect(round.choices).toContain(round.target);
      expect(new Set(round.choices).size).toBe(4);
    }
  });

  it("creates a single round for guess the year", () => {
    const state = createGame(board, { ...identifyConfig, mode: "guess_year" }, "seed", 0);
    expect(state.rounds).toHaveLength(1);
  });
});

describe("identify flow", () => {
  it("plays a full typed game and accumulates the score", () => {
    let state = createGame(board, identifyConfig, "seed", 0);
    let total = 0;
    while (state.phase === "playing") {
      const round = currentRound(state)!;
      state = startRound(state, 1_000);
      const outcome = answerRound(state, { kind: "name", value: round.target }, 2_000);
      state = outcome.state;
      expect(outcome.result.correct).toBe(true);
      total += outcome.result.points;
    }
    expect(state.phase).toBe("complete");
    expect(state.results).toHaveLength(3);
    expect(state.totalPoints).toBe(total);
    expect(state.totalPoints).toBe(3 * ROUND_BASE_POINTS);
  });

  it("accepts forgiving typed answers and rejects wrong ones", () => {
    let state = createGame(board, { ...identifyConfig, roundCount: 1 }, "seed", 0);
    const target = currentRound(state)!.target;
    const wrong = answerRound(state, { kind: "name", value: "completely wrong answer" }, 1_000);
    expect(wrong.result.correct).toBe(false);
    expect(wrong.result.points).toBe(0);

    state = createGame(board, { ...identifyConfig, roundCount: 1 }, "seed", 0);
    const shorthand = target.replace(/^(Kingdom|Republic) of /, "").replace(/ Empire$/, "");
    const right = answerRound(state, { kind: "name", value: shorthand }, 1_000);
    expect(right.result.correct).toBe(true);
  });

  it("requires exact selection for word-bank answers", () => {
    const state = createGame(board, { ...identifyConfig, input: "bank", roundCount: 1 }, "seed", 0);
    const target = currentRound(state)!.target;
    expect(answerRound(state, { kind: "name", value: target }, 1_000).result.correct).toBe(true);
    const fresh = createGame(board, { ...identifyConfig, input: "bank", roundCount: 1 }, "seed", 0);
    expect(
      answerRound(fresh, { kind: "name", value: target.toLowerCase() }, 1_000).result.correct
    ).toBe(false);
  });

  it("resolves find-on-map clicks through hit-testing", () => {
    const features: HitFeature[] = board.territories.map((territory, index) => ({
      geometry: { type: "Polygon", coordinates: [square(index * 10, 0, 4)] },
      properties: { canonical_name: territory.canonical_name, in_play: territory.in_play }
    }));
    const config: EngineConfig = { ...identifyConfig, direction: "find-on-map", roundCount: 2 };
    let state = createGame(board, config, "seed", 0);

    const target = currentRound(state)!.target;
    const targetIndex = board.territories.findIndex((t) => t.canonical_name === target);
    const hitOutcome = answerRound(state, { kind: "click", lngLat: [targetIndex * 10, 0] }, 1_000, features);
    expect(hitOutcome.result.correct).toBe(true);
    expect(hitOutcome.result.answer).toBe(target);

    const missOutcome = answerRound(hitOutcome.state, { kind: "click", lngLat: [500, 500] }, 2_000, features);
    expect(missOutcome.result.correct).toBe(false);
    expect(missOutcome.result.points).toBe(0);
    expect(missOutcome.state.phase).toBe("complete");
  });

  it("measures elapsed time from round start", () => {
    let state = createGame(board, { ...identifyConfig, roundCount: 2 }, "seed", 0);
    const first = answerRound(state, { kind: "name", value: currentRound(state)!.target }, 40_000);
    expect(first.result.elapsedMs).toBe(40_000);
    expect(first.result.points).toBe(ROUND_BASE_POINTS * 0.5);

    state = startRound(first.state, 60_000);
    const second = answerRound(state, { kind: "name", value: currentRound(state)!.target }, 61_000);
    expect(second.result.elapsedMs).toBe(1_000);
    expect(second.result.points).toBe(ROUND_BASE_POINTS);
  });
});

describe("guess the year flow", () => {
  it("scores an in-span guess at full marks", () => {
    const state = createGame(board, { ...identifyConfig, mode: "guess_year" }, "seed", 0);
    const outcome = answerRound(state, { kind: "year", value: 1500 }, 1_000);
    expect(outcome.result.correct).toBe(true);
    expect(outcome.result.points).toBe(ROUND_BASE_POINTS);
    expect(outcome.state.phase).toBe("complete");
  });

  it("decays an out-of-span guess by distance", () => {
    const state = createGame(board, { ...identifyConfig, mode: "guess_year" }, "seed", 0);
    const outcome = answerRound(state, { kind: "year", value: 1600 }, 1_000);
    expect(outcome.result.correct).toBe(false);
    expect(outcome.result.points).toBe(ROUND_BASE_POINTS * 0.5);
  });

  it("rejects non-year answers", () => {
    const state = createGame(board, { ...identifyConfig, mode: "guess_year" }, "seed", 0);
    expect(() => answerRound(state, { kind: "name", value: "1500" }, 1_000)).toThrow();
  });
});

describe("helpers", () => {
  it("derives tiers from config", () => {
    expect(deriveTier(identifyConfig)).toBe("explorer");
    expect(deriveTier({ ...identifyConfig, input: "bank", blankMap: true })).toBe("explorer");
    expect(deriveTier({ ...identifyConfig, input: "type", blankMap: true })).toBe("historian");
    expect(deriveTier({ ...identifyConfig, direction: "find-on-map", blankMap: true })).toBe("historian");
    expect(deriveTier({ ...identifyConfig, mode: "guess_year", blankMap: true })).toBe("historian");
  });

  it("builds an alphabetical in-play word bank", () => {
    const bank = wordBank(board);
    expect(bank).toHaveLength(5);
    expect(bank).toEqual([...bank].sort((a, b) => a.localeCompare(b)));
    expect(bank).not.toContain("(Personal union)");
  });
});
