"use client";

import "maplibre-gl/dist/maplibre-gl.css";

import { useEffect, useMemo, useState } from "react";
import Map, { Layer, Source } from "react-map-gl/maplibre";
import { ungzip } from "pako";
import type { BaseGeoJson, BoardMetadata, BorderStateGeoJson, Skin, ThemeMode } from "./types";
import { layerPaint, styleUrl } from "./mapStyles";

const DEFAULT_BOARD_ID = "europe-med-1500";
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

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

  const paint = useMemo(() => layerPaint(skin, theme), [skin, theme]);
  const selectedTerritory = useMemo(
    () => board?.territories.find((territory) => territory.canonical_name === selectedName) ?? null,
    [board, selectedName]
  );

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

  return (
    <main className={`app-shell ${theme} ${skin}`}>
      <header className="topbar">
        <div>
          <h1>Empyr</h1>
          <p>{board ? `${board.region}, ${board.valid_from}` : "Loading board"}</p>
        </div>
        <div className="status-strip">
          <span className={`status-dot ${apiState}`} />
          <span>{apiState === "live" ? "FastAPI live" : apiState === "static" ? "Static fallback" : "Checking API"}</span>
        </div>
      </header>

      <section className="map-stage">
        <aside className="control-rail" aria-label="Map styling controls">
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

          <div className="stat-block">
            <span>Territories</span>
            <strong>{board?.territories.length ?? 0}</strong>
          </div>
          <div className="stat-block">
            <span>Playable</span>
            <strong>{board?.territories.filter((territory) => territory.in_play).length ?? 0}</strong>
          </div>
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
                    "fill-color": [
                      "case",
                      ["==", ["get", "canonical_name"], selectedName ?? ""],
                      paint.selectedFill,
                      ["boolean", ["get", "in_play"], false],
                      paint.inPlayFill,
                      paint.outPlayFill
                    ],
                    "fill-opacity": ["case", ["boolean", ["get", "in_play"], false], 0.72, 0.44]
                  }}
                />
                <Layer
                  id="territories-border"
                  type="line"
                  paint={{
                    "line-color": paint.border,
                    "line-width": ["case", ["boolean", ["get", "in_play"], false], 0.8, 0.15],
                    "line-opacity": ["case", ["boolean", ["get", "in_play"], false], 0.82, 0.25]
                  }}
                />
              </Source>
            </Map>
          ) : (
            <div className="loading-panel">Preparing 1500 border-state</div>
          )}
        </div>

        <aside className="detail-panel" aria-label="Board details">
          <h2>{selectedTerritory?.canonical_name ?? "Europe + Mediterranean"}</h2>
          <dl>
            <div>
              <dt>Board</dt>
              <dd>{board?.board_id ?? "Loading"}</dd>
            </div>
            <div>
              <dt>Span</dt>
              <dd>{board ? `${board.valid_from} to ${board.valid_to}` : "Loading"}</dd>
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
