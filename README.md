# US Regional Beef Price Monitor (Browser-Only)

This app is a pure HTML/CSS/JavaScript web app that runs directly in the browser and fetches live regional ground beef price data from the U.S. Bureau of Labor Statistics API.

## Run
No build step or backend required.

- Option 1: Open `public/index.html` directly in your browser.
- Option 2 (recommended): Serve the `public/` folder with any static server.

Example:
```bash
python3 -m http.server 8080 --directory public
```
Then open `http://localhost:8080`.

## Data & refresh
- Data source: BLS Public API (`https://api.bls.gov/publicAPI/v2/timeseries/data/`)
- Regions: Northeast, Midwest, South, West
- Automatic refresh: every 10 minutes in-browser

## Notes
If your network or browser blocks cross-origin requests to BLS, the page shows a clear unavailable state and keeps retrying every 10 minutes.