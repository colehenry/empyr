"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useMemo, useState } from "react";
import Map, { Layer, Source } from "react-map-gl/maplibre";
import { ungzip } from "pako";
import { DEFAULT_ROUND_COUNT } from "../engine/engine";
import type { EngineConfig, IdentifyDirection, IdentifyInput } from "../engine/types";
import type { BaseGeoJson, BoardMetadata, BorderStateGeoJson, Skin, ThemeMode } from "./types";
import { STATE_OVERLAY, layerPaint, styleUrl } from "./mapStyles";
import { useGame } from "./useGame";
import GamePanel from "./GamePanel";

const DEFAULT_BOARD_ID = "europe-med-1500";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type ModeChoice = "explore" | "identify" | "guess_year";

export default function EmpyrMap() {
  const [skin, setSkin] = useState<Skin>("modern");
  const [theme, setTheme] = useState<ThemeMode>("light");
  const [catalog, setCatalog] = useState<BoardMetadata[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState(DEFAULT_BOARD_ID);
  const [board, setBoard] = useState<BoardMetadata | null>(null);
  const [geojson, setGeojson] = useState<BorderStateGeoJson | null>(null);
  const [baseGeojson, setBaseGeojson] = useState<BaseGeoJson | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [apiState, setApiState] = useState<"checking" | "live" | "static">("checking");
  const [loadError, setLoadError] = useState<string | null>(null);

  const [modeChoice, setModeChoice] = useState<ModeChoice>("explore");
  const [direction, setDirection] = useState<IdentifyDirection>("find-on-map");
  const [input, setInput] = useState<IdentifyInput>("bank");
  const [blankMap, setBlankMap] = useState(false);
  const [pendingConfig, setPendingConfig] = useState<EngineConfig | null>(null);

  const { game, round, lastResult, showingFeedback, start, submitName, submitClick, submitYear, quit } =
    useGame();

  const paint = useMemo(() => layerPaint(skin, theme), [skin, theme]);
  const selectedTerritory = useMemo(
    () => board?.territories.find((territory) => territory.canonical_name === selectedName) ?? null,
    [board, selectedName]
  );

  const gameActive = game !== null;
  const hideYear = (pendingConfig ?? game?.config)?.mode === "guess_year" && (pendingConfig !== null || game?.phase === "playing");
  const suppressOutOfPlay = gameActive && game.config.blankMap;

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      try {
        const boards = await fetchBoardCatalog();
        if (!cancelled) {
          setCatalog(boards);
          if (!boards.some((item) => item.board_id === selectedBoardId) && boards[0]) {
            setSelectedBoardId(boards[0].board_id);
          }
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Unable to load board catalog");
        }
      }
    }

    loadCatalog();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadBoard() {
      try {
        setLoadError(null);
        const metadata = await fetchBoardMetadata(selectedBoardId);
        if (cancelled) {
          return;
        }
        setBoard(metadata);
        setSelectedName(null);
        const artifact = await fetchBorderState(metadata.geojson_url);
        const baseLayer = await fetchBaseLayer();
        if (cancelled) {
          return;
        }
        setGeojson(artifact);
        setBaseGeojson(baseLayer);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Unable to load board data");
        }
      }
    }

    loadBoard();
    return () => {
      cancelled = true;
    };
  }, [selectedBoardId]);

  useEffect(() => {
    if (pendingConfig && board && geojson && board.board_id === selectedBoardId) {
      start(board, pendingConfig, `free-${Date.now()}`);
      setPendingConfig(null);
    }
  }, [pendingConfig, board, geojson, selectedBoardId, start]);

  function handleStart() {
    if (!board || !geojson) {
      return;
    }
    const config: EngineConfig = {
      mode: modeChoice === "guess_year" ? "guess_year" : "identify",
      direction,
      input,
      blankMap,
      roundCount: DEFAULT_ROUND_COUNT
    };
    setSelectedName(null);
    if (config.mode === "guess_year") {
      const candidates = catalog.filter((item) => item.board_id !== selectedBoardId);
      const pick = candidates.length
        ? candidates[Math.floor(Math.random() * candidates.length)]
        : board;
      setPendingConfig(config);
      if (pick.board_id !== selectedBoardId) {
        setSelectedBoardId(pick.board_id);
      }
    } else {
      start(board, config, `free-${Date.now()}`);
    }
  }

  function handleQuit() {
    setPendingConfig(null);
    quit();
  }

  const fillColor = useMemo(() => {
    const cases: unknown[] = ["case"];
    if (gameActive && showingFeedback && lastResult && game.config.mode === "identify") {
      cases.push(["==", ["get", "canonical_name"], lastResult.target], STATE_OVERLAY.correct);
      if (!lastResult.correct && lastResult.answer) {
        cases.push(["==", ["get", "canonical_name"], lastResult.answer], STATE_OVERLAY.incorrect);
      }
    } else if (
      gameActive &&
      round &&
      game.config.mode === "identify" &&
      game.config.direction === "name-the-territory"
    ) {
      cases.push(["==", ["get", "canonical_name"], round.target], STATE_OVERLAY.highlight);
    }
    if (!gameActive) {
      cases.push(["==", ["get", "canonical_name"], selectedName ?? ""], paint.selectedFill);
    }
    cases.push(["boolean", ["get", "in_play"], false], paint.inPlayFill, paint.outPlayFill);
    return cases;
  }, [gameActive, game, round, showingFeedback, lastResult, selectedName, paint]);

  const fillOpacity = useMemo(() => {
    const cases: unknown[] = ["case"];
    if (gameActive && showingFeedback && lastResult && game.config.mode === "identify") {
      cases.push(["==", ["get", "canonical_name"], lastResult.target], 0.88);
      if (!lastResult.correct && lastResult.answer) {
        cases.push(["==", ["get", "canonical_name"], lastResult.answer], 0.88);
      }
    } else if (
      gameActive &&
      round &&
      game.config.mode === "identify" &&
      game.config.direction === "name-the-territory"
    ) {
      cases.push(["==", ["get", "canonical_name"], round.target], 0.88);
    }
    cases.push(
      ["boolean", ["get", "in_play"], false],
      0.72,
      suppressOutOfPlay ? 0 : 0.44
    );
    return cases;
  }, [gameActive, game, round, showingFeedback, lastResult, suppressOutOfPlay]);

  return (
    <main className={`app-shell ${theme} ${skin}`}>
      <header className="topbar">
        <div>
          <h1>Empyr</h1>
          <p>
            {board
              ? hideYear
                ? `${board.region}, ????`
                : `${board.region}, ${board.valid_from}`
              : "Loading board"}
          </p>
        </div>
        <div className="status-strip">
          <span className={`status-dot ${apiState}`} />
          <span>{apiState === "live" ? "FastAPI live" : apiState === "static" ? "Static fallback" : "Checking API"}</span>
        </div>
      </header>

      <section className="map-stage">
        <aside className="control-rail" aria-label="Map and game controls">
          <ControlGroup label="Skin">
            <SegmentedButton active={skin === "modern"} onClick={() => setSkin("modern")}>
              Modern
            </SegmentedButton>
            <SegmentedButton active={skin === "atlas"} onClick={() => setSkin("atlas")}>
              Atlas
            </SegmentedButton>
          </ControlGroup>

          <ControlGroup label="Theme">
            <SegmentedButton active={theme === "light"} onClick={() => setTheme("light")}>
              Light
            </SegmentedButton>
            <SegmentedButton active={theme === "dark"} onClick={() => setTheme("dark")}>
              Dark
            </SegmentedButton>
          </ControlGroup>

          {!gameActive && pendingConfig === null ? (
            <>
              <label className="select-control">
                <span>Year</span>
                <select value={selectedBoardId} onChange={(event) => setSelectedBoardId(event.target.value)}>
                  {catalog.map((item) => (
                    <option key={item.board_id} value={item.board_id}>
                      {item.valid_from}
                    </option>
                  ))}
                </select>
              </label>

              <label className="select-control">
                <span>Mode</span>
                <select value={modeChoice} onChange={(event) => setModeChoice(event.target.value as ModeChoice)}>
                  <option value="explore">Explore</option>
                  <option value="identify">Identify</option>
                  <option value="guess_year">Guess the Year</option>
                </select>
              </label>

              {modeChoice === "identify" ? (
                <>
                  <label className="select-control">
                    <span>Direction</span>
                    <select
                      value={direction}
                      onChange={(event) => setDirection(event.target.value as IdentifyDirection)}
                    >
                      <option value="find-on-map">Name → find on map</option>
                      <option value="name-the-territory">Map → name it</option>
                    </select>
                  </label>
                  {direction === "name-the-territory" ? (
                    <label className="select-control">
                      <span>Input</span>
                      <select value={input} onChange={(event) => setInput(event.target.value as IdentifyInput)}>
                        <option value="choice">Multiple choice</option>
                        <option value="bank">Word bank</option>
                        <option value="type">Type (fuzzy)</option>
                      </select>
                    </label>
                  ) : null}
                  <ControlGroup label="Blank map">
                    <SegmentedButton active={!blankMap} onClick={() => setBlankMap(false)}>
                      Off
                    </SegmentedButton>
                    <SegmentedButton active={blankMap} onClick={() => setBlankMap(true)}>
                      On
                    </SegmentedButton>
                  </ControlGroup>
                </>
              ) : null}

              {modeChoice !== "explore" ? (
                <button type="button" className="start-button" disabled={!geojson} onClick={handleStart}>
                  Start game
                </button>
              ) : (
                <>
                  <div className="stat-block">
                    <span>Territories</span>
                    <strong>{board?.territories.length ?? 0}</strong>
                  </div>
                  <div className="stat-block">
                    <span>Playable</span>
                    <strong>{board?.territories.filter((territory) => territory.in_play).length ?? 0}</strong>
                  </div>
                </>
              )}
            </>
          ) : null}
        </aside>

        <div className="map-canvas">
          {loadError ? <div className="error-panel">{loadError}</div> : null}
          {geojson ? (
            <Map
              initialViewState={{ longitude: 16, latitude: 43, zoom: 3.05 }}
              mapStyle={styleUrl(skin, theme)}
              attributionControl={false}
              interactiveLayerIds={["territories-fill"]}
              onClick={(event) => {
                if (gameActive) {
                  if (
                    game.phase === "playing" &&
                    game.config.mode === "identify" &&
                    game.config.direction === "find-on-map" &&
                    !showingFeedback
                  ) {
                    submitClick([event.lngLat.lng, event.lngLat.lat], geojson.features);
                  }
                  return;
                }
                const feature = event.features?.[0];
                const name = feature?.properties?.canonical_name;
                if (typeof name === "string") {
                  setSelectedName(name);
                }
              }}
              style={{ width: "100%", height: "100%" }}
              dragRotate={false}
              pitchWithRotate={false}
            >
              {baseGeojson ? (
                <Source id="base-land" type="geojson" data={baseGeojson}>
                  <Layer
                    id="base-land-fill"
                    type="fill"
                    paint={{
                      "fill-color": paint.landFill,
                      "fill-opacity": theme === "dark" ? 0.82 : 0.9
                    }}
                  />
                  <Layer
                    id="base-land-border"
                    type="line"
                    paint={{
                      "line-color": paint.landBorder,
                      "line-width": 0.45,
                      "line-opacity": theme === "dark" ? 0.55 : 0.7
                    }}
                  />
                </Source>
              ) : null}
              <Source id="territories" type="geojson" data={geojson}>
                <Layer
                  id="territories-fill"
                  type="fill"
                  paint={{
                    "fill-color": fillColor as never,
                    "fill-opacity": fillOpacity as never
                  }}
                />
                <Layer
                  id="territories-border"
                  type="line"
                  paint={{
                    "line-color": paint.border,
                    "line-width": ["case", ["boolean", ["get", "in_play"], false], 0.8, suppressOutOfPlay ? 0 : 0.15],
                    "line-opacity": ["case", ["boolean", ["get", "in_play"], false], 0.82, suppressOutOfPlay ? 0 : 0.25]
                  }}
                />
              </Source>
            </Map>
          ) : (
            <div className="loading-panel">Preparing border-state</div>
          )}
        </div>

        {gameActive && board ? (
          <GamePanel
            game={game}
            round={round}
            board={board}
            lastResult={lastResult}
            showingFeedback={showingFeedback}
            onSubmitName={submitName}
            onSubmitYear={submitYear}
            onQuit={handleQuit}
          />
        ) : (
          <aside className="detail-panel" aria-label="Board details">
            <h2>{selectedTerritory?.canonical_name ?? "Europe + Mediterranean"}</h2>
            <dl>
              <div>
                <dt>Board</dt>
                <dd>{hideYear ? "Hidden" : board?.board_id ?? "Loading"}</dd>
              </div>
              <div>
                <dt>Span</dt>
                <dd>{board && !hideYear ? `${board.valid_from} to ${board.valid_to}` : hideYear ? "Hidden" : "Loading"}</dd>
              </div>
              <div>
                <dt>Type</dt>
                <dd>{selectedTerritory?.type ?? "Border-state"}</dd>
              </div>
              <div>
                <dt>Wikidata</dt>
                <dd>{selectedTerritory?.wikidata_qid ?? "None selected"}</dd>
              </div>
            </dl>
            <p className="note">{board?.change_note ?? "Editorial change note pending owner review."}</p>
            <p className="source">{board?.attribution ?? "Loading source attribution."}</p>
          </aside>
        )}
      </section>
    </main>
  );

  async function fetchBoardMetadata(boardId: string): Promise<BoardMetadata> {
    try {
      const response = await fetch(`${API_URL}/boards/${boardId}`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`API responded ${response.status}`);
      }
      setApiState("live");
      return (await response.json()) as BoardMetadata;
    } catch {
      const response = await fetch("/data/metadata/border_states.json", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Static board metadata is unavailable");
      }
      const catalog = (await response.json()) as { border_states: BoardMetadata[] };
      const staticBoard = catalog.border_states.find((item) => item.board_id === boardId);
      if (!staticBoard) {
        throw new Error(`${boardId} metadata is missing`);
      }
      setApiState("static");
      return staticBoard;
    }
  }
}

async function fetchBoardCatalog(): Promise<BoardMetadata[]> {
  const response = await fetch("/data/metadata/border_states.json", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Static board catalog is unavailable");
  }
  const catalog = (await response.json()) as { border_states: BoardMetadata[] };
  return catalog.border_states.toSorted((a, b) => a.valid_from - b.valid_from);
}

async function fetchBaseLayer(): Promise<BaseGeoJson> {
  const response = await fetch("/data/base/ne_50m_land_europe_med.geojson", { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Natural Earth base layer is unavailable");
  }
  return (await response.json()) as BaseGeoJson;
}

async function fetchBorderState(geojsonUrl: string): Promise<BorderStateGeoJson> {
  const response = await fetch(geojsonUrl, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Border-state GeoJSON is unavailable");
  }
  const compressed = new Uint8Array(await response.arrayBuffer());
  const text = ungzip(compressed, { to: "string" });
  return JSON.parse(text) as BorderStateGeoJson;
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="control-group">
      <span>{label}</span>
      <div className="segmented">{children}</div>
    </div>
  );
}

function SegmentedButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button className={active ? "active" : ""} type="button" onClick={onClick}>
      {children}
    </button>
  );
}
