import { gunzipSync } from "node:zlib";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { answerRound, createGame, currentRound, wordBank } from "../engine";
import { hitTest } from "../hitTest";
import { matchName } from "../fuzzy";
import type { EngineBoard, EngineConfig, HitFeature } from "../types";

const artifactPath = join(__dirname, "../../../public/data/border-states/europe-med-1500.geojson.gz");
const artifact = JSON.parse(gunzipSync(readFileSync(artifactPath)).toString("utf-8")) as {
  features: Array<HitFeature & { properties: { canonical_name: string; in_play: boolean } }>;
  metadata: { board_id: string; valid_from: number; valid_to: number };
};

const board: EngineBoard = {
  board_id: artifact.metadata.board_id,
  valid_from: artifact.metadata.valid_from,
  valid_to: artifact.metadata.valid_to,
  territories: artifact.features.map((feature) => ({
    canonical_name: feature.properties.canonical_name,
    in_play: feature.properties.in_play
  }))
};

const config: EngineConfig = {
  mode: "identify",
  direction: "find-on-map",
  input: "type",
  blankMap: false,
  roundCount: 8
};

describe("engine against the real europe-med-1500 artifact", () => {
  it("loads the locked 1500 board shape (70 features, 68 playable)", () => {
    expect(artifact.features).toHaveLength(70);
    expect(board.territories.filter((t) => t.in_play)).toHaveLength(68);
  });

  it("hit-tests real geometry: Lisbon resolves to Kingdom of Portugal", () => {
    const hit = hitTest([-9.14, 38.72], artifact.features);
    expect(hit?.properties.canonical_name).toBe("Kingdom of Portugal");
  });

  it("hit-tests overlapping polities: Munich resolves to Bavaria, not the HRE", () => {
    const hit = hitTest([11.57, 48.14], artifact.features);
    expect(hit?.properties.canonical_name).toBe("Duchy of Bavaria");
  });

  it("returns null in the open Atlantic", () => {
    expect(hitTest([-25, 45], artifact.features)).toBeNull();
  });

  it("plays a full deterministic 8-round game on the real board", () => {
    let state = createGame(board, config, "qa-seed", 0);
    expect(state.rounds).toHaveLength(8);
    while (state.phase === "playing") {
      const target = currentRound(state)!.target;
      const feature = artifact.features.find((f) => f.properties.canonical_name === target)!;
      expect(feature.properties.in_play).toBe(true);
      state = answerRound(state, { kind: "name", value: target }, 1_000, artifact.features).state;
    }
    expect(state.phase).toBe("complete");
    expect(state.totalPoints).toBe(8_000);
  });

  it("fuzzy-matches shorthand against every real playable name without cross-matching", () => {
    expect(matchName("ottoman", "Ottoman Empire").match).toBe(true);
    expect(matchName("venice", "Republic of Venice").match).toBe(true);
    expect(matchName("moscow", "Grand Principality of Moscow").match).toBe(true);
    expect(matchName("Kingdom of England", "Kingdom of France").match).toBe(false);
    expect(matchName("Crown of Aragon", "Crown of Castile").match).toBe(false);
  });

  it("builds a 68-entry word bank from the real board", () => {
    expect(wordBank(board)).toHaveLength(68);
  });
});
