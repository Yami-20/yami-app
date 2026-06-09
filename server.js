const express = require('express');
const cors    = require('cors');
const { exec } = require('child_process');
const https   = require('https');

const YTDLP = process.env.YTDLP_PATH || 'yt-dlp';

const app = express();
app.use(cors());
app.use(express.json());

// ── Helpers ───────────────────────────────────────────────────────────────────
function httpsGet(url, headers = {}) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Yami/0.4.0)', ...headers } }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return httpsGet(res.headers.location, headers).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    }).on('error', reject);
  });
}

// ── iTunes proxy ──────────────────────────────────────────────────────────────
app.get('/itunes/search', (req, res) => {
  const params = new URLSearchParams(req.query).toString();
  httpsGet(`https://itunes.apple.com/search?${params}`)
    .then(({ body }) => { try { res.json(JSON.parse(body)); } catch { res.status(500).json({ error: 'Parse error' }); } })
    .catch(err => res.status(500).json({ error: err.message }));
});

// ── yt-dlp stream ─────────────────────────────────────────────────────────────
app.get('/stream', (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'No query' });
  const cmd = `"${YTDLP}" "ytsearch1:${q}" --get-url -f bestaudio --no-playlist`;
  exec(cmd, (err, stdout) => {
    if (err) return res.status(500).json({ error: 'Failed to get stream' });
    res.json({ url: stdout.trim().split('\n')[0] });
  });
});

// ── Spotify playlist scrape (no auth) ─────────────────────────────────────────
// Uses Spotify's public open.spotify.com page + embedded JSON
app.get('/spotify/scrape', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'No URL' });

  // Extract playlist ID
  const match = url.match(/playlist\/([a-zA-Z0-9]+)/);
  if (!match) return res.status(400).json({ error: 'Invalid Spotify playlist URL' });
  const playlistId = match[1];

  try {
    // Fetch the embed page which has track data in JSON
    const embedUrl = `https://open.spotify.com/embed/playlist/${playlistId}`;
    const { body } = await httpsGet(embedUrl);

    // Extract the JSON state from the page
    const stateMatch = body.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/);
    if (!stateMatch) return res.status(500).json({ error: 'Could not parse playlist data' });

    const state = JSON.parse(stateMatch[1]);
    const tracks = state?.props?.pageProps?.state?.data?.entity?.trackList || [];

    if (!tracks.length) return res.status(404).json({ error: 'No tracks found or playlist is private' });

    const result = tracks.map(t => ({
      name: t.title,
      artist: t.subtitle,
      query: `${t.title} ${t.subtitle}`,
    }));

    res.json({ tracks: result, total: result.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Spotify token proxy (exchanges sp_dc cookie for web player token) ────────
app.post('/spotify/token', async (req, res) => {
  const { sp_dc } = req.body;
  if (!sp_dc) return res.status(400).json({ error: 'sp_dc cookie required' });
  try {
    const { status, body } = await httpsGet(
      'https://open.spotify.com/get_access_token?reason=transport&productType=web_player',
      {
        'Cookie': `sp_dc=${sp_dc}`,
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://open.spotify.com/',
        'Origin': 'https://open.spotify.com',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-origin',
        'spotify-app-version': '1.2.46.25.g7f189073',
        'app-platform': 'WebPlayer',
      }
    );
    if (status !== 200) return res.status(status).json({ error: `Spotify rejected the cookie (${status})` });
    const data = JSON.parse(body);
    if (data.isAnonymous) return res.status(403).json({ error: 'Cookie is invalid or expired — please log in again' });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log('Yami backend running on port 3001'));
