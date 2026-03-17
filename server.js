const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;

const SERIES = {
  Northeast: 'APU0100703112',
  Midwest: 'APU0200703112',
  South: 'APU0300703112',
  West: 'APU0400703112'
};

const BLS_ENDPOINT = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';
const TEN_MINUTES = 10 * 60 * 1000;

let cache = {
  lastUpdatedAt: null,
  sourceStatus: 'Initializing',
  regions: []
};

function normalizeSeriesData(series) {
  const latest = series.data.find((entry) => entry.period && entry.period.startsWith('M'));
  if (!latest) return null;

  return {
    period: `${latest.periodName} ${latest.year}`,
    value: Number.parseFloat(latest.value),
    footnotes: latest.footnotes?.map((note) => note.text).filter(Boolean) ?? []
  };
}

async function pullLatestBeefPrices() {
  const now = new Date();
  const currentYear = String(now.getUTCFullYear());
  const previousYear = String(now.getUTCFullYear() - 1);

  const response = await fetch(BLS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      seriesid: Object.values(SERIES),
      startyear: previousYear,
      endyear: currentYear,
      annualaverage: false
    })
  });

  if (!response.ok) {
    throw new Error(`BLS request failed: ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (payload.status !== 'REQUEST_SUCCEEDED') {
    throw new Error(`BLS response status: ${payload.status}`);
  }

  const bySeriesId = new Map(payload.Results.series.map((series) => [series.seriesID, series]));
  const regions = Object.entries(SERIES).map(([regionName, seriesId]) => {
    const series = bySeriesId.get(seriesId);
    if (!series) return { region: regionName, seriesId, unavailable: true, reason: 'No series returned by source' };

    const normalized = normalizeSeriesData(series);
    if (!normalized) return { region: regionName, seriesId, unavailable: true, reason: 'No monthly observation found' };

    return {
      region: regionName,
      seriesId,
      unit: 'USD per lb',
      value: normalized.value,
      period: normalized.period,
      notes: normalized.footnotes
    };
  });

  return {
    source: 'U.S. Bureau of Labor Statistics Public API',
    fetchedAt: now.toISOString(),
    regions
  };
}

async function refreshCache() {
  try {
    const latest = await pullLatestBeefPrices();
    cache = {
      lastUpdatedAt: latest.fetchedAt,
      sourceStatus: 'Live',
      source: latest.source,
      regions: latest.regions
    };
    console.log(`[refresh] success at ${latest.fetchedAt}`);
  } catch (error) {
    cache = { ...cache, sourceStatus: `Error: ${error.message}` };
    console.error('[refresh] failed', error.message);
  }
}

function contentTypeFor(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8';
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8';
  if (filePath.endsWith('.js')) return 'application/javascript; charset=utf-8';
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8';
  return 'text/plain; charset=utf-8';
}

function serveStatic(req, res) {
  const reqPath = req.url === '/' ? '/index.html' : req.url;
  const safePath = path.normalize(reqPath).replace(/^\.\.(\/|\\|$)/, '');
  const filePath = path.join(__dirname, 'public', safePath);

  if (!filePath.startsWith(path.join(__dirname, 'public'))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    res.writeHead(200, { 'Content-Type': contentTypeFor(filePath) });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  if (req.url === '/api/prices') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ updatedEveryMinutes: 10, ...cache }));
    return;
  }

  if (req.method === 'GET') {
    serveStatic(req, res);
    return;
  }

  res.writeHead(405);
  res.end('Method Not Allowed');
});

refreshCache();
setInterval(refreshCache, TEN_MINUTES);

server.listen(port, () => {
  console.log(`Beef monitor running at http://localhost:${port}`);
});
