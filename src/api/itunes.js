// All iTunes calls go through our Express backend on port 3001.
// This works in both CRA dev mode AND Electron (no CRA proxy needed).
const BASE = 'http://localhost:3001/itunes/search';

async function fetchWithRetry(url, retries = 3, delay = 600) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

export async function itunesSearch(params) {
  const qs = new URLSearchParams({ entity: 'song', ...params }).toString();
  const data = await fetchWithRetry(`${BASE}?${qs}`);
  return (data.results || []).filter(t => t.previewUrl);
}
