const express  = require('express');
const cors     = require('cors');
const { spawn } = require('child_process');
const https    = require('https');
const { version } = require('./package.json');

const YTDLP = process.env.YTDLP_PATH || 'yt-dlp';
const UA    = `Mozilla/5.0 (compatible; Yami/${version})`;

const app = express();
app.use(cors());
app.use(express.json());

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

// ── Spotify playlist scrape ────────────────────────────────────────────────────
app.get('/spotify/scrape', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'No URL' });
  const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
  if (!match) return res.status(400).json({ error: 'Invalid Spotify playlist URL' });
  const playlistId = match[1];
  try {
    const { body } = await httpsGet(`https://open.spotify.com/embed/playlist/${playlistId}`);
    const stateMatch = body.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!stateMatch) return res.status(500).json({ error: 'Could not parse playlist data' });
    const state  = JSON.parse(stateMatch[1]);
    const tracks = state?.props?.pageProps?.state?.data?.entity?.trackList || [];
    if (!tracks.length) return res.status(404).json({ error: 'No tracks found or playlist is private' });
    res.json({
      tracks: tracks.map(t => ({ name: t.title, artist: t.subtitle, query: `${t.title} ${t.subtitle}` })),
      total: tracks.length,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Spotify token (sp_dc cookie) ──────────────────────────────────────────────
app.get('/spotify/token', async (req, res) => {
  const { sp_dc } = req.query;
  if (!sp_dc) return res.status(400).json({ error: 'sp_dc cookie required' });
  try {
    const { status, body } = await httpsGet(
      'https://open.spotify.com/get_access_token?reason=transport&productType=web_player',
      { Cookie: `sp_dc=${sp_dc}` }
    );
    if (status !== 200) return res.status(status).json({ error: `Spotify rejected the cookie (${status})` });
    const data = JSON.parse(body);
    if (data.isAnonymous) return res.status(403).json({ error: 'Cookie is invalid or expired — please log in again' });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '127.0.0.1', () => console.log(`Yami backend v${version} on :${PORT}`));
