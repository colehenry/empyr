# Data Foundation Findings

- Full `data/raw/cliopatria.geojson` source was used for generated years.
- Generated 6 border-states: 1000, 1200, 1400, 1500, 1700, 1800.
- Missing Step 0 carry-forward artifact for later 1.D work: `public/styles/*.json` modern/atlas light/dark style files are not present in this workspace; local placeholder styles are used for the prototype.
- aourednik/historical-basemaps was not used.
- Cliopatria attribution used: Cliopatria historical polity boundary data by the Seshat Global History Databank, licensed under CC BY 4.0, https://github.com/Seshat-Global-History-Databank/cliopatria. Cite Zenodo DOI: 10.5281/zenodo.14714684. Changes made: clipped to Europe + Mediterranean, normalized feature properties for Empyr.
- Natural Earth 50m land is used as a non-playable base geography layer: public domain; no attribution required.
- Ireland is visible as base land, but no separate Irish polity rows were found in the generated Cliopatria years.
