#!/usr/bin/env python3.11
import argparse
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.pipeline.config import NATURAL_EARTH_ATTRIBUTION, ROOT

RAW_DIR = ROOT / "data" / "raw" / "natural-earth"
OUT_DIR = ROOT / "data" / "processed" / "base"
DEFAULT_SOURCE = RAW_DIR / "ne_50m_land.zip"
DEFAULT_OUTPUT = OUT_DIR / "ne_50m_land_europe_med.geojson"


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Empyr base geography layers.")
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--mapshaper", default=str(ROOT / "node_modules" / ".bin" / "mapshaper"))
    args = parser.parse_args()

    if not args.source.exists():
        raise SystemExit(
            f"STOP / ASK: Natural Earth source missing at {args.source}. "
            "Download https://naturalearth.s3.amazonaws.com/50m_physical/ne_50m_land.zip first."
        )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    for stale in args.output.parent.glob(f"{args.output.stem}*.geojson"):
        stale.unlink()

    command = [
        args.mapshaper,
        str(args.source),
        "-clip",
        "bbox=-13,29,46,61",
        "-filter-fields",
        "",
        "-each",
        f"source_attribution='{NATURAL_EARTH_ATTRIBUTION}'",
        "-o",
        "format=geojson",
        str(args.output),
    ]
    completed = subprocess.run(command, check=False, capture_output=True, text=True)
    if completed.returncode != 0:
        sys.stderr.write(completed.stderr)
        raise SystemExit(f"STOP / ASK: mapshaper failed running: {' '.join(command)}")

    if not args.output.exists():
        candidates = sorted(args.output.parent.glob(f"{args.output.stem}*.geojson"))
        feature_collections = []
        for candidate in candidates:
            data = json.loads(candidate.read_text())
            if data.get("type") == "FeatureCollection" and data.get("features"):
                feature_collections.append(candidate)
        if len(feature_collections) != 1:
            raise SystemExit(f"STOP / ASK: expected one non-empty Natural Earth output, found {feature_collections}")
        feature_collections[0].replace(args.output)

    for stale in args.output.parent.glob(f"{args.output.stem}*.geojson"):
        if stale != args.output:
            stale.unlink()

    print(f"Built {args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
