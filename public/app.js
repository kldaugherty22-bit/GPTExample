const rowsEl = document.getElementById('priceRows');
const metaEl = document.getElementById('meta');

const SERIES = {
  Northeast: 'APU0100703112',
  Midwest: 'APU0200703112',
  South: 'APU0300703112',
  West: 'APU0400703112'
};

const BLS_ENDPOINT = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';
const REFRESH_MS = 10 * 60 * 1000;

function fmtMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
}

function getLatestMonthly(series) {
  return series.data.find((entry) => entry.period && entry.period.startsWith('M'));
}

function renderRows(regions) {
  rowsEl.innerHTML = '';

  for (const region of regions) {
    const tr = document.createElement('tr');

    if (region.unavailable) {
      tr.innerHTML = `
        <td>${region.region}</td>
        <td>—</td>
        <td>—</td>
        <td class="status-bad">${region.reason}</td>
      `;
    } else {
      tr.innerHTML = `
        <td>${region.region}</td>
        <td>${fmtMoney(region.value)} / lb</td>
        <td>${region.period}</td>
        <td class="status-ok">Live</td>
      `;
    }

    rowsEl.appendChild(tr);
  }
}

async function fetchRegionalBeefPrices() {
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
    throw new Error(`BLS request failed: ${response.status}`);
  }

  const payload = await response.json();

  if (payload.status !== 'REQUEST_SUCCEEDED') {
    throw new Error(`BLS response status: ${payload.status}`);
  }

  const bySeriesId = new Map(payload.Results.series.map((series) => [series.seriesID, series]));

  return Object.entries(SERIES).map(([regionName, seriesId]) => {
    const series = bySeriesId.get(seriesId);
    if (!series) {
      return { region: regionName, unavailable: true, reason: 'No series returned by source' };
    }

    const latest = getLatestMonthly(series);
    if (!latest) {
      return { region: regionName, unavailable: true, reason: 'No monthly observation found' };
    }

    return {
      region: regionName,
      value: Number.parseFloat(latest.value),
      period: `${latest.periodName} ${latest.year}`
    };
  });
}

async function refresh() {
  metaEl.textContent = 'Refreshing live BLS data...';

  try {
    const regions = await fetchRegionalBeefPrices();
    renderRows(regions);
    metaEl.textContent = `Source: U.S. Bureau of Labor Statistics (BLS). Last fetch: ${new Date().toLocaleString()}. Auto-refresh every 10 minutes.`;
  } catch (error) {
    renderRows(Object.keys(SERIES).map((region) => ({
      region,
      unavailable: true,
      reason: 'Live source unavailable'
    })));
    metaEl.textContent = `Unable to fetch live data directly from BLS: ${error.message}. This browser app retries every 10 minutes.`;
  }
}

refresh();
setInterval(refresh, REFRESH_MS);
