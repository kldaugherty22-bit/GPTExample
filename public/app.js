const rowsEl = document.getElementById('priceRows');
const metaEl = document.getElementById('meta');

function fmtMoney(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
}

function render(data) {
  const updatedTime = data.lastUpdatedAt ? new Date(data.lastUpdatedAt).toLocaleString() : 'N/A';
  metaEl.textContent = `Source status: ${data.sourceStatus}. Last fetch: ${updatedTime}. Auto-refresh every ${data.updatedEveryMinutes} minutes.`;

  rowsEl.innerHTML = '';

  for (const region of data.regions) {
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

async function load() {
  try {
    const response = await fetch('/api/prices');
    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const payload = await response.json();
    render(payload);
  } catch (error) {
    metaEl.textContent = `Failed to load prices: ${error.message}`;
  }
}

load();
setInterval(load, 60 * 1000);
