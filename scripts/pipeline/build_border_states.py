#!/usr/bin/env python3.11
import argparse
import gzip
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.pipeline.config import CLIOPATRIA_ATTRIBUTION, EUROPE_MED, ROOT

DEFAULT_YEARS = [1500]
SOURCE_CANDIDATES = [
    ROOT / "data" / "raw" / "cliopatria.geojson",
    ROOT / "cliopatria.geojson",
]
SPIKE_SIMPLIFIED = ROOT / "cliopatria_1500_simplified_10pct.geojson"
SPIKE_CLIPPED = ROOT / "cliopatria_1500_clipped.geojson"
OUT_DIR = ROOT / "data" / "processed" / "border-states"
META_DIR = ROOT / "data" / "processed" / "metadata"


def main() -> int:
    parser = argparse.ArgumentParser(description="Build Empyr border-state artifacts from Cliopatria.")
    parser.add_argument("--years", nargs="+", type=int, default=DEFAULT_YEARS)
    parser.add_argument("--mapshaper", default=str(ROOT / "node_modules" / ".bin" / "mapshaper"))
    args = parser.parse_args()

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    META_DIR.mkdir(parents=True, exist_ok=True)

    raw_source = next((path for path in SOURCE_CANDIDATES if path.exists()), None)
    border_states = []
    findings = []

    for year in args.years:
        if raw_source is not None:
            source = build_from_raw(raw_source, year, Path(args.mapshaper))
        elif year == 1500 and SPIKE_CLIPPED.exists():
            source = SPIKE_CLIPPED
            findings.append(
                "Used locked Step 0 clipped Cliopatria 1500 artifact at full display detail because full cliopatria.geojson is not present."
            )
        elif year == 1500 and SPIKE_SIMPLIFIED.exists():
            source = SPIKE_SIMPLIFIED
            findings.append(
                "Used locked Step 0 simplified Cliopatria 1500 artifact because neither full cliopatria.geojson nor clipped artifact is present."
            )
        else:
            raise SystemExit(
                f"STOP / ASK: cannot build year {year}; provide data/raw/cliopatria.geojson or a locked spike artifact."
            )
        border_states.append(emit_border_state(source, year))

    catalog = {
        "generated_by": "scripts/pipeline/build_border_states.py",
        "source_licenses": [
            {
                "name": "Cliopatria",
                "license": "CC BY 4.0",
                "repo": "https://github.com/Seshat-Global-History-Databank/cliopatria",
                "doi": "10.5281/zenodo.14714684",
                "attribution": CLIOPATRIA_ATTRIBUTION,
            },
            {
                "name": "Natural Earth",
                "license": "Public domain",
                "url": "https://www.naturalearthdata.com/",
                "attribution": "No attribution required.",
            },
        ],
        "findings": findings,
        "border_states": border_states,
    }
    (META_DIR / "border_states.json").write_text(json.dumps(catalog, indent=2) + "\n")

    findings_path = META_DIR / "findings.md"
    source_note = (
        "- Full `data/raw/cliopatria.geojson` source was used for generated years.\n"
        if raw_source is not None
        else "- STOP / ASK: full `cliopatria.geojson` source is not present; generated from locked spike artifacts only.\n"
    )
    handbuild_note = (
        f"- Generated {len(border_states)} border-states: "
        f"{', '.join(str(item['valid_from']) for item in border_states)}.\n"
    )
    if len(border_states) < 3:
        handbuild_note += (
            "- STOP / ASK: 1.A.5 calls for 3-5 hand-built border-states; provide full source or additional "
            "owner-approved spike outputs to emit more states.\n"
        )
    findings_path.write_text(
        "# Data Foundation Findings\n\n"
        f"{source_note}"
        f"{handbuild_note}"
        "- Missing Step 0 carry-forward artifact for later 1.D work: `public/styles/*.json` modern/atlas "
        "light/dark style files are not present in this workspace; local placeholder styles are used for the prototype.\n"
        "- aourednik/historical-basemaps was not used.\n"
        f"- Cliopatria attribution used: {CLIOPATRIA_ATTRIBUTION}\n"
        "- Natural Earth 50m land is used as a non-playable base geography layer: public domain; no attribution required.\n"
        "- Ireland is visible as base land, but no separate Irish polity rows were found in the generated Cliopatria years.\n"
    )

    print(f"Built {len(border_states)} border-state artifact(s).")
    return 0


def build_from_raw(raw_source: Path, year: int, mapshaper: Path) -> Path:
    if not mapshaper.exists():
        raise SystemExit(f"STOP / ASK: mapshaper CLI not found at {mapshaper}")
    with tempfile.TemporaryDirectory() as tmp:
        tmpdir = Path(tmp)
        year_filtered = tmpdir / f"cliopatria_{year}.geojson"
        clipped = tmpdir / f"cliopatria_{year}_clipped.geojson"
        display = tmpdir / f"cliopatria_{year}_display.geojson"

        with raw_source.open() as handle:
            data = json.load(handle)
        features = [
            feature
            for feature in data.get("features", [])
            if feature.get("properties", {}).get("FromYear", year) <= year
            and feature.get("properties", {}).get("ToYear", year) >= year
        ]
        year_filtered.write_text(json.dumps({"type": "FeatureCollection", "features": features}))

        west, south, east, north = EUROPE_MED.bbox
        run_mapshaper(
            [
                str(mapshaper),
                str(year_filtered),
                "-clip",
                f"bbox={west},{south},{east},{north}",
                "-o",
                str(clipped),
            ]
        )
        target = OUT_DIR / f"_intermediate_{year}_display.geojson"
        shutil.copyfile(clipped, display)
        shutil.copyfile(display, target)
        return target


def run_mapshaper(command: list[str]) -> None:
    completed = subprocess.run(command, check=False, capture_output=True, text=True)
    if completed.returncode != 0:
        sys.stderr.write(completed.stderr)
        raise SystemExit(f"STOP / ASK: mapshaper failed running: {' '.join(command)}")


def emit_border_state(source: Path, year: int) -> dict:
    with source.open() as handle:
        data = json.load(handle)

    names = []
    output_features = []
    for feature in data.get("features", []):
        props = feature.get("properties", {})
        canonical_name = props.get("Name")
        if not canonical_name:
            raise SystemExit(f"STOP / ASK: feature without Cliopatria Name in {source}")
        territory_type = props.get("Type")
        in_play = territory_type == "POLITY"
        output_features.append(
            {
                "type": "Feature",
                "geometry": feature.get("geometry"),
                "properties": {
                    "canonical_name": canonical_name,
                    "wikidata_qid": props.get("Wikidata") or None,
                    "type": territory_type,
                    "in_play": in_play,
                    "source_name": canonical_name,
                    "from_year": props.get("FromYear"),
                    "to_year": props.get("ToYear"),
                },
            }
        )
        names.append(canonical_name)

    if len(names) != len(set(names)):
        duplicates = sorted({name for name in names if names.count(name) > 1})
        raise SystemExit(f"STOP / ASK: duplicate Cliopatria Name values in board: {duplicates}")

    board_id = f"{EUROPE_MED.slug}-{year}"
    geojson_name = f"{board_id}.geojson.gz"
    artifact = {
        "type": "FeatureCollection",
        "features": output_features,
        "metadata": {
            "board_id": board_id,
            "region": EUROPE_MED.name,
            "valid_from": year,
            "valid_to": year,
            "confidence": "source-derived; editorial review pending",
            "change_note": "Editorial change note pending owner review.",
            "attribution": CLIOPATRIA_ATTRIBUTION,
        },
    }
    with gzip.open(OUT_DIR / geojson_name, "wt", encoding="utf-8") as handle:
        json.dump(artifact, handle, separators=(",", ":"))

    simplification = "display detail from clipped source; no simplify and no -clean"
    if "simplified_10pct" in source.name:
        simplification = "10% visvalingam keep-shapes; no -clean before simplify"

    return {
        "board_id": board_id,
        "region": EUROPE_MED.name,
        "valid_from": year,
        "valid_to": year,
        "confidence": "source-derived; editorial review pending",
        "change_note": "Editorial change note pending owner review.",
        "geojson_url": f"/data/border-states/{geojson_name}",
        "attribution": CLIOPATRIA_ATTRIBUTION,
        "source": {
            "name": "Cliopatria",
            "license": "CC BY 4.0",
            "doi": "10.5281/zenodo.14714684",
            "artifact": str(source.relative_to(ROOT)),
            "simplification": simplification,
        },
        "territories": [
            {
                "canonical_name": feature["properties"]["canonical_name"],
                "wikidata_qid": feature["properties"]["wikidata_qid"],
                "type": feature["properties"]["type"],
                "in_play": feature["properties"]["in_play"],
            }
            for feature in output_features
        ],
    }


if __name__ == "__main__":
    raise SystemExit(main())
