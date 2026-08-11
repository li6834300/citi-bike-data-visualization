# Citi Bike Data Visualization

An interactive, self-contained data-visualization essay about the relationship between people, shared bikes, urban infrastructure, landmarks, and income in New York City — built on the archived Citi Bike trip record for **1 August 2014** (32,655 rides, 331 stations).

**Live site:** https://lizhien.me/citi-bike-data-visualization/

The project grew out of *PopBike*, Qijing Zhang's 2014 data-visualization thesis. The original used Google Maps, Panoramio, and several live feeds that have since been discontinued; this edition preserves the original research questions and archived data while running entirely as a static site with no API keys.

## The four views

1. **Citi Bike Nebula** — the city as a night sky. Each station is a star; size is dock capacity, glow is arrivals and departures in a 15-minute window. Play the timeline to watch the network breathe through the day.
2. **People and Bikes** — a layered Leaflet map. Toggle ZIP-area income, station capacity, high-use corridors, and landmarks to see the network shift from infrastructure to activity.
3. **Citi Bike Trips** — a time slider over the archived day. Green marks departures, coral marks arrivals, yellow marks rides in progress.
4. **Bicycle Wheel** — the twenty most connected stations and their strongest exchanges. Select a station to isolate its links.

## Stack

Plain HTML, CSS, and JavaScript — no build step, no framework, no API keys.

- [D3 v7](https://d3js.org/) for the nebula, trip strip, and station network
- [Leaflet 1.9](https://leafletjs.com/) with [OpenStreetMap](https://www.openstreetmap.org/) tiles for the layered map
- All data loaded from `data/` at runtime

## Run locally

The page fetches its data over HTTP, so it needs a web server — opening `index.html` from the filesystem will not work.

```bash
python3 -m http.server 4173
```

Then open <http://localhost:4173>.

## Deployment

Published with GitHub Pages from the `main` branch, `/(root)`. Any push to `main` republishes the site.

## Data and interpretation

- `data/trips.csv` — archived Citi Bike trips for 1 August 2014
- `data/bikestation.csv` — 2014 station locations and dock capacities
- `data/incomecsv.json` — archived ZIP-level median household income
- `data/nyc-zctas.geojson` — NYC ZIP Code Tabulation Area boundaries, used to fill each income area once. ZCTAs are the Census statistical approximation of ZIP Code areas.
- `data/estimated-bike-routes.geojson` — bicycle-network route estimates for the strongest observed origin–destination pairs

Two caveats worth carrying into any reading of these views. Citi Bike's trip history records start and end stations, not GPS tracks, so the corridors in view 02 are plausible network routes rather than journeys anyone actually rode. And ZIP-level income describes an *area*, not a rider — the map can show that use clusters in certain neighbourhoods, but it cannot attribute an income or an intention to any individual trip.

Sources: [NYC Open Data ZIP Code Tabulation Areas](https://data.cityofnewyork.us/d/35j5-n34v), [OpenStreetMap](https://www.openstreetmap.org/), and local Wikimedia Commons landmark thumbnails (each preview links back to its source page).

## Credits

Original concept, data research, and visualization: **Qijing Zhang, 2014**.
