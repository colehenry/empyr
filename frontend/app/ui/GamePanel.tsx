"use client";

import { useState } from "react";
import { wordBank } from "../engine/engine";
import type { EngineBoard, EngineRound, EngineState, RoundResult } from "../engine/types";

const YEAR_MIN = 700;
const YEAR_MAX = 2000;

type GamePanelProps = {
  game: EngineState;
  round: EngineRound | null;
  board: EngineBoard;
  lastResult: RoundResult | null;
  showingFeedback: boolean;
  onSubmitName: (value: string) => void;
  onSubmitYear: (value: number) => void;
  onQuit: () => void;
};

export default function GamePanel({
  game,
  round,
  board,
  lastResult,
  showingFeedback,
  onSubmitName,
  onSubmitYear,
  onQuit
}: GamePanelProps) {
  if (game.phase === "complete" && !showingFeedback) {
    return <GameSummary game={game} onQuit={onQuit} />;
  }

  return (
    <aside className="detail-panel game-panel" aria-label="Game">
      <div className="game-header">
        <h2>{game.config.mode === "guess_year" ? "Guess the Year" : "Identify"}</h2>
        <span className="game-meta">
          {game.config.mode === "guess_year"
            ? game.tier
            : `Round ${Math.min(game.currentRound + 1, game.rounds.length)} / ${game.rounds.length} · ${game.tier}`}
        </span>
      </div>

      <div className="stat-block">
        <span>Score</span>
        <strong>{game.totalPoints}</strong>
      </div>

      {showingFeedback && lastResult ? (
        <Feedback game={game} result={lastResult} />
      ) : round ? (
        <RoundPrompt game={game} round={round} board={board} onSubmitName={onSubmitName} onSubmitYear={onSubmitYear} />
      ) : null}

      <button type="button" className="quit-button" onClick={onQuit}>
        Quit game
      </button>
    </aside>
  );
}

function RoundPrompt({
  game,
  round,
  board,
  onSubmitName,
  onSubmitYear
}: {
  game: EngineState;
  round: EngineRound;
  board: EngineBoard;
  onSubmitName: (value: string) => void;
  onSubmitYear: (value: number) => void;
}) {
  if (game.config.mode === "guess_year") {
    return <YearSlider onSubmit={onSubmitYear} />;
  }
  if (game.config.direction === "find-on-map") {
    return (
      <div className="game-prompt">
        <span>Find on the map</span>
        <strong>{round.target}</strong>
        <p className="note">Click the territory on the map.</p>
      </div>
    );
  }
  return (
    <div className="game-prompt">
      <span>Name the highlighted territory</span>
      {game.config.input === "choice" && round.choices ? (
        <div className="answer-list">
          {round.choices.map((choice) => (
            <button key={choice} type="button" onClick={() => onSubmitName(choice)}>
              {choice}
            </button>
          ))}
        </div>
      ) : game.config.input === "bank" ? (
        <div className="answer-list word-bank">
          {wordBank(board).map((name) => (
            <button key={name} type="button" onClick={() => onSubmitName(name)}>
              {name}
            </button>
          ))}
        </div>
      ) : (
        <TypeAnswer onSubmit={onSubmitName} />
      )}
    </div>
  );
}

function TypeAnswer({ onSubmit }: { onSubmit: (value: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="type-answer"
      onSubmit={(event) => {
        event.preventDefault();
        if (value.trim()) {
          onSubmit(value);
          setValue("");
        }
      }}
    >
      <input
        type="text"
        value={value}
        placeholder="Type the territory name"
        autoFocus
        onChange={(event) => setValue(event.target.value)}
      />
      <button type="submit" disabled={!value.trim()}>
        Submit
      </button>
    </form>
  );
}

function YearSlider({ onSubmit }: { onSubmit: (value: number) => void }) {
  const [year, setYear] = useState(Math.round((YEAR_MIN + YEAR_MAX) / 2));
  return (
    <div className="game-prompt">
      <span>When was this map?</span>
      <strong>{year}</strong>
      <input
        type="range"
        min={YEAR_MIN}
        max={YEAR_MAX}
        step={1}
        value={year}
        onChange={(event) => setYear(Number(event.target.value))}
      />
      <button type="button" className="submit-year" onClick={() => onSubmit(year)}>
        Lock in {year}
      </button>
    </div>
  );
}

function Feedback({ game, result }: { game: EngineState; result: RoundResult }) {
  const isYear = game.config.mode === "guess_year";
  return (
    <div className={`game-feedback ${result.correct ? "correct" : "incorrect"}`}>
      <strong>{result.correct ? "Correct" : isYear ? `It was ${result.target}` : "Not quite"}</strong>
      {!result.correct && !isYear ? <p>It was {result.target}.</p> : null}
      {!result.correct && !isYear && result.answer ? <p className="note">You picked {result.answer}.</p> : null}
      <p className="points">+{result.points} pts</p>
    </div>
  );
}

function GameSummary({ game, onQuit }: { game: EngineState; onQuit: () => void }) {
  return (
    <aside className="detail-panel game-panel" aria-label="Game results">
      <div className="game-header">
        <h2>Results</h2>
        <span className="game-meta">
          {game.config.mode === "guess_year" ? "Guess the Year" : "Identify"} · {game.tier}
        </span>
      </div>
      <div className="stat-block">
        <span>Total score</span>
        <strong>{game.totalPoints}</strong>
      </div>
      <ol className="result-list">
        {game.results.map((result, index) => (
          <li key={`${result.target}-${index}`} className={result.correct ? "correct" : "incorrect"}>
            <span className="result-target">{result.target}</span>
            <span className="result-points">{result.points}</span>
          </li>
        ))}
      </ol>
      <button type="button" className="quit-button" onClick={onQuit}>
        Back to the map
      </button>
    </aside>
  );
}
