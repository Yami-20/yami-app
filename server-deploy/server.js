const express  = require('express');
const cors     = require('cors');
const { spawn } = require('child_process');
const https    = require('https');

const version = process.env.YAMI_BACKEND_VERSION || require('./package.json').version || '1.0.0';

const YTDLP = process.env.YTDLP_PATH || 'yt-dlp';
const UA    = `Mozilla/5.0 (compatible; Yami/${version})`;

const app = express();
app.use(cors());
app.use(express.json({ limit: '100kb' }));

// ── Basic abuse guard — public-facing server now, not localhost-only ─────────
const hitCounts = new Map(); // ip → { count, resetAt }
const RATE_LIMIT = 120;      // requests per window
const RATE_WINDOW = 60_000;  // 1 minute

app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let entry = hitCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW };
    hitCounts.set(ip, entry);
  }
  entry.count++;
  if (entry.count > RATE_LIMIT) return res.status(429).json({ error: 'Too many requests, slow down' });
  if (hitCounts.size > 5000) hitCounts.delete(hitCounts.keys().next().value); // memory guard
  next();
});

// ── Helpers ───────────────────────────────────────────────────────────────────
function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': UA, ...headers } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location, headers).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_, res) => res.json({ ok: true, version }));

// ── iTunes proxy ──────────────────────────────────────────────────────────────
const itunesCache = new Map(); // url → { data, ts }
const CACHE_TTL   = 5 * 60 * 1000; // 5 min

app.get('/itunes/search', async (req, res) => {
  const params = new URLSearchParams(req.query).toString();
  const cacheKey = params;
  const cached   = itunesCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return res.json(cached.data);

  try {
    const { body } = await httpsGet(`https://itunes.apple.com/search?${params}`);
    const data = JSON.parse(body);
    itunesCache.set(cacheKey, { data, ts: Date.now() });
    // Trim cache to 200 entries
    if (itunesCache.size > 200) itunesCache.delete(itunesCache.keys().next().value);
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── yt-dlp stream (spawn — no shell injection) ────────────────────────────────
const streamCache = new Map(); // query → { url, ts }
const STREAM_TTL  = 4 * 60 * 60 * 1000; // 4h — URLs expire ~6h

app.get('/stream', (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'No query' });

  const cached = streamCache.get(q);
  if (cached && Date.now() - cached.ts < STREAM_TTL) return res.json({ url: cached.url });

  const proc = spawn(YTDLP, [
    `ytsearch1:${q}`, '--get-url', '-f', 'bestaudio', '--no-playlist',
  ]);
  let out = '';
  let err = '';
  proc.stdout.on('data', d => { out += d.toString(); });
  proc.stderr.on('data', d => { err += d.toString(); });
  proc.on('close', code => {
    if (code !== 0 || !out.trim()) {
      return res.status(500).json({ error: 'yt-dlp failed', detail: err.slice(0, 200) });
    }
    const url = out.trim().split('\n')[0];
    streamCache.set(q, { url, ts: Date.now() });
    // Trim stream cache to 100 entries
    if (streamCache.size > 100) streamCache.delete(streamCache.keys().next().value);
    res.json({ url });
  });
  proc.on('error', e => res.status(500).json({ error: e.message }));
});

// ── Stream cache freshness check (client calls this before playing) ───────────
app.get('/stream/check', (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ fresh: false });
  const cached = streamCache.get(q);
  const fresh  = cached && (Date.now() - cached.ts < STREAM_TTL);
  res.json({ fresh: !!fresh });
});

// ── Playlist import — Spotify / YouTube Music / Apple Music ───────────────────
// Runs server-side so the client never hits cross-origin restrictions
// (this matters especially on Android/Capacitor, where CORS is enforced).

function extractSpotifyId(url) {
  const m = url.match(/playlist\/([a-zA-Z0-9]+)/);
  return m ? m[1] : null;
}
function extractYouTubeId(url) {
  const m = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}
function extractAppleId(url) {
  const m = url.match(/playlist\/[^/]+\/([a-zA-Z0-9.-]+)/);
  return m ? m[1] : null;
}

async function scrapeSpotify(playlistId) {
  const { body, status } = await httpsGet(`https://open.spotify.com/embed/playlist/${playlistId}`);
  if (status !== 200) throw new Error(`Spotify returned ${status}`);
  const stateMatch = body.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
  if (!stateMatch) throw new Error('Could not parse Spotify playlist data');
  const state  = JSON.parse(stateMatch[1]);
  const tracks = state?.props?.pageProps?.state?.data?.entity?.trackList || [];
  if (!tracks.length) throw new Error('No tracks found — playlist may be private');
  return tracks.map(t => ({ name: t.title, artist: t.subtitle }));
}

async function scrapeYouTube(playlistId) {
  const { body } = await httpsGet(`https://www.youtube.com/playlist?list=${playlistId}`);
  const matches = [...body.matchAll(/"title":\{"runs":\[\{"text":"([^"]+)"/g)];
  const titles  = [...new Set(matches.map(m => m[1]).filter(t => t && t !== 'YouTube Music'))].slice(0, 100);
  if (!titles.length) throw new Error('No tracks found — playlist may be private');
  return titles.map(t => ({ name: t, artist: '' }));
}

async function scrapeApple(playlistId) {
  const { body, status } = await httpsGet(
    `https://amp-api.music.apple.com/v1/catalog/us/playlists/${playlistId}/tracks?limit=100`,
    { Origin: 'https://music.apple.com' }
  );
  if (status !== 200) throw new Error(`Apple Music returned ${status}`);
  const data = JSON.parse(body);
  const tracks = data.data || [];
  if (!tracks.length) throw new Error('No tracks found — playlist may be private');
  return tracks.map(t => ({ name: t.attributes?.name || '', artist: t.attributes?.artistName || '' }));
}

app.get('/playlist/import', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'No URL provided' });

  try {
    let tracks;
    if (url.includes('spotify.com')) {
      const id = extractSpotifyId(url);
      if (!id) return res.status(400).json({ error: 'Invalid Spotify playlist URL' });
      tracks = await scrapeSpotify(id);
    } else if (url.includes('music.youtube.com') || url.includes('youtube.com/playlist')) {
      const id = extractYouTubeId(url);
      if (!id) return res.status(400).json({ error: 'Invalid YouTube playlist URL' });
      tracks = await scrapeYouTube(id);
    } else if (url.includes('music.apple.com')) {
      const id = extractAppleId(url);
      if (!id) return res.status(400).json({ error: 'Invalid Apple Music playlist URL' });
      tracks = await scrapeApple(id);
    } else {
      return res.status(400).json({ error: 'Unrecognized playlist URL — paste a Spotify, YouTube Music, or Apple Music link' });
    }
    res.json({
      tracks: tracks.map(t => ({ ...t, query: `${t.artist} ${t.name}`.trim() })),
      total: tracks.length,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // 0.0.0.0 required for Render/cloud hosting
app.listen(PORT, HOST, () => console.log(`Yami backend v${version} on ${HOST}:${PORT}`));
