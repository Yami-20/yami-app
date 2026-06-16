import { useState, useCallback } from 'react';
import {
  RiSpotifyFill, RiYoutubeFill, RiMusicLine,
  RiDownloadLine, RiCheckLine, RiLinkM,
} from 'react-icons/ri';
import { itunesSearch } from '../api/itunes';
import { useYami }      from '../context/YamiContext';

// ── Platform detection ────────────────────────────────────────────────────────
function detectPlatform(url) {
  if (url.includes('spotify.com'))      return 'spotify';
  if (url.includes('music.youtube.com') || url.includes('youtube.com/playlist')) return 'youtube';
  if (url.includes('music.apple.com'))  return 'apple';
  return null;
}

// ── Extract playlist ID ───────────────────────────────────────────────────────
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

// ── Fetch track names from each platform ─────────────────────────────────────
async function fetchSpotifyTracks(playlistId) {
  // Use Spotify's open/anonymous endpoint — no auth needed for public playlists
  const res = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50&fields=items(track(name,artists))`,
    { headers: { Authorization: `Bearer ${await getAnonSpotifyToken()}` } }
  );
  if (!res.ok) throw new Error('Could not fetch Spotify playlist. Make sure it is public.');
  const data = await res.json();
  return (data.items || [])
    .map(i => i.track)
    .filter(Boolean)
    .map(t => `${t.artists?.[0]?.name || ''} ${t.name}`.trim());
}

async function getAnonSpotifyToken() {
  const res = await fetch('https://open.spotify.com/get_access_token?reason=transport&productType=web_player', {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  const data = await res.json();
  if (!data.accessToken) throw new Error('Could not get Spotify token');
  return data.accessToken;
}

async function fetchYouTubeTracks(playlistId) {
  // Scrape YouTube Music playlist page for track titles
  const res = await fetch(`https://www.youtube.com/playlist?list=${playlistId}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });
  const html = await res.text();
  const matches = [...html.matchAll(/"title":{"runs":\[{"text":"([^"]+)"/g)];
  const titles  = matches.map(m => m[1]).filter(t => t && t !== 'YouTube Music');
  if (!titles.length) throw new Error('Could not read YouTube playlist. Make sure it is public.');
  return [...new Set(titles)].slice(0, 100);
}

async function fetchAppleTracks(playlistId) {
  const res = await fetch(
    `https://amp-api.music.apple.com/v1/catalog/us/playlists/${playlistId}/tracks?limit=100`,
    { headers: { Origin: 'https://music.apple.com' } }
  );
  if (!res.ok) throw new Error('Could not fetch Apple Music playlist. Make sure it is public.');
  const data = await res.json();
  return (data.data || []).map(t => `${t.attributes?.artistName || ''} ${t.attributes?.name || ''}`.trim());
}

const PLATFORM_META = {
  spotify: { label: 'Spotify',       icon: <RiSpotifyFill />,  color: '#1db954', example: 'https://open.spotify.com/playlist/...' },
  youtube: { label: 'YouTube Music', icon: <RiYoutubeFill />,  color: '#ff0000', example: 'https://music.youtube.com/playlist?list=...' },
  apple:   { label: 'Apple Music',   icon: <RiMusicLine />,    color: '#fc3c44', example: 'https://music.apple.com/playlist/...' },
};

export default function ImportPage() {
  const { addManyToQueue, showToast } = useYami();
  const [url,       setUrl]       = useState('');
  const [platform,  setPlatform]  = useState(null);
  const [status,    setStatus]    = useState('idle'); // idle | fetching | importing | done | error
  const [progress,  setProgress]  = useState({ done: 0, total: 0 });
  const [error,     setError]     = useState('');

  const handleUrlChange = (e) => {
    const v = e.target.value;
    setUrl(v);
    setPlatform(detectPlatform(v));
    setStatus('idle');
    setError('');
  };

  const handleImport = useCallback(async () => {
    setError(''); setStatus('fetching');
    try {
      let trackQueries = [];

      if (platform === 'spotify') {
        const id = extractSpotifyId(url);
        if (!id) throw new Error('Invalid Spotify playlist URL');
        trackQueries = await fetchSpotifyTracks(id);
      } else if (platform === 'youtube') {
        const id = extractYouTubeId(url);
        if (!id) throw new Error('Invalid YouTube playlist URL');
        trackQueries = await fetchYouTubeTracks(id);
      } else if (platform === 'apple') {
        const id = extractAppleId(url);
        if (!id) throw new Error('Invalid Apple Music playlist URL');
        trackQueries = await fetchAppleTracks(id);
      } else {
        throw new Error('Unsupported platform. Paste a Spotify, YouTube Music, or Apple Music playlist URL.');
      }

      if (!trackQueries.length) throw new Error('No tracks found in this playlist.');

      setStatus('importing');
      setProgress({ done: 0, total: trackQueries.length });
      const yamiTracks = [];

      for (let i = 0; i < trackQueries.length; i++) {
        try {
          const results = await itunesSearch({ term: trackQueries[i], limit: 1 });
          if (results[0]) yamiTracks.push(results[0]);
        } catch {}
        setProgress({ done: i + 1, total: trackQueries.length });
      }

      addManyToQueue(yamiTracks);
      setStatus('done');
      showToast(`Added ${yamiTracks.length} songs to queue`, 'add');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }, [url, platform, addManyToQueue, showToast]);

  const meta = platform ? PLATFORM_META[platform] : null;

  return (
    <main className="yami-main spotify-page">
      <div className="import-page">
        <h2 className="import-title">Import Playlist</h2>
        <p className="import-sub">Paste a public playlist link from any streaming platform — Yami will match the songs and add them to your queue.</p>

        {/* Platform badges */}
        <div className="import-badges">
          {Object.entries(PLATFORM_META).map(([key, m]) => (
            <div key={key} className={`import-badge ${platform === key ? 'active' : ''}`} style={{ '--badge-color': m.color }}>
              {m.icon} {m.label}
            </div>
          ))}
        </div>

        {/* URL input */}
        <div className="import-input-wrap">
          <RiLinkM className="import-link-icon" />
          <input
            className="import-url-input"
            placeholder="Paste playlist URL here…"
            value={url}
            onChange={handleUrlChange}
          />
        </div>

        {meta && (
          <p className="import-detected">
            <span style={{ color: meta.color }}>{meta.icon}</span>
            {' '}{meta.label} playlist detected
          </p>
        )}

        {error && <p className="import-error">{error}</p>}

        {/* Progress */}
        {status === 'importing' && (
          <div className="import-progress">
            <div className="import-progress-bar" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            <span>{progress.done} / {progress.total} matched</span>
          </div>
        )}

        <button
          className="import-submit-btn"
          onClick={handleImport}
          disabled={!platform || status === 'fetching' || status === 'importing'}
        >
          {status === 'fetching'  ? <><div className="sp-spinner" /> Fetching playlist…</> :
           status === 'importing' ? <><div className="sp-spinner" /> Matching {progress.done}/{progress.total}…</> :
           status === 'done'      ? <><RiCheckLine /> Done — {progress.total} songs added!</> :
           <><RiDownloadLine /> Import Playlist</>}
        </button>

        {status === 'done' && (
          <button className="sp-text-btn" onClick={() => { setUrl(''); setPlatform(null); setStatus('idle'); }}>
            Import another playlist
          </button>
        )}

        <div className="import-howto">
          <p><strong>How to get a playlist URL:</strong></p>
          <p>🎵 <strong>Spotify</strong> — Right-click playlist → Share → Copy link (must be public)</p>
          <p>▶️ <strong>YouTube Music</strong> — Open playlist → copy URL from address bar</p>
          <p>🍎 <strong>Apple Music</strong> — Click ··· on playlist → Share → Copy Link</p>
        </div>
      </div>
    </main>
  );
}
