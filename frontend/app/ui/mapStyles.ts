import type { Skin, ThemeMode } from "./types";

// Universal game-state overlay: deliberately outside the thematic palettes so
// correct/incorrect/highlight read instantly on every skin and theme.
export const STATE_OVERLAY = {
  correct: "#21c063",
  incorrect: "#e23d3d",
  highlight: "#f0a92e"
};

type LayerPaint = {
  landFill: string;
  landBorder: string;
  inPlayFill: string;
  outPlayFill: string;
  border: string;
  selectedFill: string;
};

export function styleUrl(skin: Skin, theme: ThemeMode) {
  return `/styles/${skin}-${theme}.json`;
}

export function layerPaint(skin: Skin, theme: ThemeMode): LayerPaint {
  if (skin === "atlas" && theme === "light") {
    return {
      landFill: "#c7b990",
      landBorder: "#6f5a34",
      inPlayFill: "#b9905f",
      outPlayFill: "#5d4034",
      border: "#4a351f",
      selectedFill: "#2f9d64"
    };
  }
  if (skin === "atlas" && theme === "dark") {
    return {
      landFill: "#373729",
      landBorder: "#7d714e",
      inPlayFill: "#a68352",
      outPlayFill: "#251813",
      border: "#d2bd91",
      selectedFill: "#34b46c"
    };
  }
  if (skin === "modern" && theme === "dark") {
    return {
      landFill: "#1a2427",
      landBorder: "#384c51",
      inPlayFill: "#547c90",
      outPlayFill: "#292020",
      border: "#b7c7cc",
      selectedFill: "#27c777"
    };
  }
  return {
    landFill: "#d5dfdc",
    landBorder: "#b4c2bd",
    inPlayFill: "#88aeb0",
    outPlayFill: "#6b4a49",
    border: "#24444a",
    selectedFill: "#1f9d63"
  };
}
