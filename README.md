# US Regional Beef Price Monitor

Small Node.js web app that tracks average retail ground beef prices by U.S. region (Northeast, Midwest, South, West) using the U.S. Bureau of Labor Statistics public API.

## Features
- Pulls live data from BLS on startup.
- Refreshes server-side data every 10 minutes.
- Shows latest available monthly value per region.

## Run
```bash
npm install
npm start
```

Open `http://localhost:3000`.

## API
`GET /api/prices` returns the current cached data snapshot and refresh metadata.
