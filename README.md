# PopBike — 2014 / now

A contemporary reconstruction of **PopBike**, Qijing Zhang's 2014 data-visualization thesis project about the relationship between people, shared bikes, urban infrastructure, landmarks, and income in New York City.

The original project used Citi Bike data, Google Maps, D3.js, and several live data sources. This edition preserves the original research questions and archived 2014 data while replacing discontinued services with a self-contained, static web experience.

## Explore the project

The site has three connected views:

1. **People and Bikes** — a layered map of 2014 Citi Bike stations, ZIP-area income, landmarks, and high-use routes.
2. **Citi Bike Trips** — a time slider that reveals departures, arrivals, and active trips throughout 1 August 2014.
3. **Bicycle Wheel** — an interactive network of the twenty busiest stations and their strongest exchanges.

## Run locally

This is a static site. From this folder, run:

```bash
python3 -m http.server 4173
```

Then open [http://localhost:4173](http://localhost:4173).

## Publish with GitHub Pages

1. Upload the contents of this folder to a public GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Choose **Deploy from a branch**, then select `main` and `/(root)`.
4. Save. GitHub will publish the project at `https://USERNAME.github.io/REPOSITORY/`.

## Data and interpretation

- `data/trips.csv` contains the archived Citi Bike trips for 1 August 2014.
- `data/bikestation.csv` contains 2014 station locations and dock capacities.
- `data/incomecsv.json` contains the archived ZIP-level income values used by the original project.
- `data/nyc-zctas.geojson` contains NYC ZIP Code Tabulation Area boundaries, used to fill each income area once. ZCTAs are the Census statistical approximation of ZIP Code areas.
- `data/estimated-bike-routes.geojson` contains bicycle-network route estimates for the strongest observed origin–destination pairs. Citi Bike's trip history provides start and end stations, not recorded GPS tracks; these paths should therefore be read as plausible network routes, not exact journeys.

The project uses [NYC Open Data ZIP Code Tabulation Areas](https://data.cityofnewyork.us/d/35j5-n34v), [OpenStreetMap](https://www.openstreetmap.org/) map data, and local Wikimedia Commons landmark thumbnails. Each landmark preview links back to its source page.

## Credits

Original concept, data research, and visualization: **Qijing Zhang, 2014**  
Reconstruction: **PopBike — 2014 / now**

