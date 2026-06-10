from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

CLIOPATRIA_ATTRIBUTION = (
    "Cliopatria historical polity boundary data by the Seshat Global History Databank, "
    "licensed under CC BY 4.0, https://github.com/Seshat-Global-History-Databank/cliopatria. "
    "Cite Zenodo DOI: 10.5281/zenodo.14714684. Changes made: clipped to Europe + Mediterranean, "
    "normalized feature properties for Empyr."
)

NATURAL_EARTH_ATTRIBUTION = (
    "Natural Earth public domain land data, https://www.naturalearthdata.com/. "
    "Changes made: clipped to Europe + Mediterranean display bounds and converted to GeoJSON."
)


@dataclass(frozen=True)
class RegionConfig:
    slug: str
    name: str
    bbox: tuple[float, float, float, float]


EUROPE_MED = RegionConfig(
    slug="europe-med",
    name="Europe + Mediterranean",
    bbox=(-12, 30, 45, 60),
)
