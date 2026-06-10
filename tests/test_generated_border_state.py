import gzip
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def test_generated_border_state_has_empyr_properties():
    artifact = ROOT / "data" / "processed" / "border-states" / "europe-med-1500.geojson.gz"
    with gzip.open(artifact, "rt", encoding="utf-8") as handle:
        data = json.load(handle)

    assert data["type"] == "FeatureCollection"
    assert data["metadata"]["board_id"] == "europe-med-1500"
    assert len(data["features"]) == 70
    first_props = data["features"][0]["properties"]
    assert "canonical_name" in first_props
    assert "wikidata_qid" in first_props
    assert "in_play" in first_props
