# Data Foundation

Step 1.A source decisions are locked:

- Historical polity boundaries: Cliopatria, CC BY 4.0.
- Modern coverage/base geography: Natural Earth, public domain.
- Rejected source: aourednik/historical-basemaps, due to GPL-3.0 data-license uncertainty.

Cliopatria attribution to carry with every generated border-state:

> Cliopatria historical polity boundary data by the Seshat Global History Databank, licensed under CC BY 4.0, https://github.com/Seshat-Global-History-Databank/cliopatria. Cite Zenodo DOI: 10.5281/zenodo.14714684.

Pipeline changes are appended to that attribution. Current generated display artifacts note: clipped to Europe + Mediterranean and normalized feature properties for Empyr. The local 1500 display artifact is intentionally not simplified, because the 10% spike simplification made borders visibly too angular for the frontend map.

Natural Earth 50m land is used as a public-domain base geography layer under historical polity polygons. It is not playable game data and does not add historical entities.

## Border-State Model

Each border-state has:

- `board_id`
- `region`
- `valid_from`
- `valid_to`
- `confidence`
- `change_note`
- gzipped GeoJSON artifact URL
- source attribution and license metadata
- per-territory `canonical_name`, optional `wikidata_qid`, `type`, and `in_play`

Cliopatria `Name` is the identity key. `Wikidata` is enrichment only and must not be used as a join/dedupe key. Playable territories are `Type == "POLITY"`; `RELATION` features stay in artifacts but are not playable.

## Current Workspace Finding

This workspace now contains the full official Cliopatria GeoJSON under `data/raw/cliopatria.geojson`. The current prototype emits six display-detail Europe + Mediterranean border-states: 1000, 1200, 1400, 1500, 1700, and 1800. These are generated to validate year switching and map rendering; they still need editorial review before they become game boards.

Ireland is visible via the Natural Earth land base layer, but Cliopatria has no separate Irish polity rows in the generated years. The frontend must not treat the Natural Earth landmass as playable territory.
