"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { answerRound, createGame, currentRound, startRound } from "../engine/engine";
import type {
  EngineAnswer,
  EngineBoard,
  EngineConfig,
  EngineRound,
  EngineState,
  HitFeature,
  RoundResult
} from "../engine/types";

const FEEDBACK_MS = 1400;

export type GameUi = {
  game: EngineState | null;
  round: EngineRound | null;
  lastResult: RoundResult | null;
  showingFeedback: boolean;
  start: (board: EngineBoard, config: EngineConfig, seed: string) => void;
  submitName: (value: string) => void;
  submitClick: (lngLat: [number, number], features: readonly HitFeature[]) => void;
  submitYear: (value: number) => void;
  quit: () => void;
};

export function useGame(): GameUi {
  const [game, setGame] = useState<EngineState | null>(null);
  const [lastResult, setLastResult] = useState<RoundResult | null>(null);
  const [showingFeedback, setShowingFeedback] = useState(false);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const feedbackActive = useRef(false);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) {
        clearTimeout(feedbackTimer.current);
      }
    };
  }, []);

  const start = useCallback((board: EngineBoard, config: EngineConfig, seed: string) => {
    if (feedbackTimer.current) {
      clearTimeout(feedbackTimer.current);
    }
    setLastResult(null);
    setShowingFeedback(false);
    feedbackActive.current = false;
    setGame(createGame(board, config, seed, Date.now()));
  }, []);

  const submit = useCallback(
    (answer: EngineAnswer, features: readonly HitFeature[] = []) => {
      setGame((state) => {
        if (!state || state.phase !== "playing" || feedbackActive.current) {
          return state;
        }
        const outcome = answerRound(state, answer, Date.now(), features);
        setLastResult(outcome.result);
        setShowingFeedback(true);
        feedbackActive.current = true;
        if (feedbackTimer.current) {
          clearTimeout(feedbackTimer.current);
        }
        feedbackTimer.current = setTimeout(() => {
          feedbackActive.current = false;
          setShowingFeedback(false);
          setGame((current) => (current ? startRound(current, Date.now()) : current));
        }, FEEDBACK_MS);
        return outcome.state;
      });
    },
    []
  );

  const submitName = useCallback((value: string) => submit({ kind: "name", value }), [submit]);
  const submitYear = useCallback((value: number) => submit({ kind: "year", value }), [submit]);
  const submitClick = useCallback(
    (lngLat: [number, number], features: readonly HitFeature[]) =>
      submit({ kind: "click", lngLat }, features),
    [submit]
  );

  const quit = useCallback(() => {
    if (feedbackTimer.current) {
      clearTimeout(feedbackTimer.current);
    }
    setGame(null);
    setLastResult(null);
    setShowingFeedback(false);
    feedbackActive.current = false;
  }, []);

  return {
    game,
    round: game ? currentRound(game) : null,
    lastResult,
    showingFeedback,
    start,
    submitName,
    submitClick,
    submitYear,
    quit
  };
}
