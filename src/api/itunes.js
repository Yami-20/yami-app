const BASE = 'http://localhost:3001/itunes/search';

// In-memory dedup cache: key → Promise (prevents parallel duplicate requests)
const inFlight = new Map();
const resultCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

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
  const qs  = new URLSearchParams({ media: 'music', ...params }).toString();
  const url = `${BASE}?${qs}`;

  // Return cached result if fresh
  const cached = resultCache.get(qs);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  // Deduplicate in-flight requests
  if (inFlight.has(qs)) return inFlight.get(qs);

  const promise = fetchWithRetry(url).then(data => {
    inFlight.delete(qs);
    const entity = params.entity || 'song';
    let results;
    if (entity === 'song') {
      results = (data.results || []).filter(t => t.wrapperType === 'track' && t.kind === 'song');
    } else if (entity === 'musicArtist') {
      results = (data.results || []).filter(t => t.wrapperType === 'artist');
    } else if (entity === 'album') {
      results = (data.results || []).filter(t => t.wrapperType === 'collection');
    } else {
      results = data.results || [];
    }
    resultCache.set(qs, { data: results, ts: Date.now() });
    if (resultCache.size > 300) resultCache.delete(resultCache.keys().next().value);
    return results;
  }).catch(err => { inFlight.delete(qs); throw err; });

  inFlight.set(qs, promise);
  return promise;
}
