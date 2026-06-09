// ─── Spotify sp_dc Cookie Auth ────────────────────────────────────────────────
// Opens an embedded Electron browser window for login.
// Electron extracts the sp_dc cookie automatically after login.
// Token is exchanged via the Express backend to avoid CORS.
// No OAuth app needed. No Premium required.

const BACKEND = 'http://localhost:3001';

// ── Login: exchange sp_dc for a web player access token ──────────────────────
export async function loginWithSpDc(spDc) {
  const res = await fetch(`${BACKEND}/spotify/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sp_dc: spDc }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to connect — please try logging in again');
  }
  const data = await res.json();
  if (data.isAnonymous) throw new Error('Login failed — cookie was invalid or expired');

  localStorage.setItem('sp_dc', spDc);
  localStorage.setItem('sp_token', JSON.stringify({
    access_token: data.accessToken,
    exp:          data.accessTokenExpirationTimestampMs,
  }));
  return data.accessToken;
}

// ── Token helpers ─────────────────────────────────────────────────────────────
export function getToken() {
  try {
    const tok = JSON.parse(localStorage.getItem('sp_token'));
    if (!tok || Date.now() > tok.exp - 60_000) { localStorage.removeItem('sp_token'); return null; }
    return tok.access_token;
  } catch { return null; }
}

async function refreshToken() {
  const spDc = localStorage.getItem('sp_dc');
  if (!spDc) throw new Error('Session expired — please log in again');
  return loginWithSpDc(spDc);
}

export function spotifyLogout() {
  localStorage.removeItem('sp_token');
  localStorage.removeItem('sp_dc');
}

export function isLoggedIn() { return !!getToken(); }

// ── API ───────────────────────────────────────────────────────────────────────
async function spFetch(path, params = {}) {
  let token = getToken();
  if (!token) token = await refreshToken();
  const url = new URL(`https://api.spotify.com/v1${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) { spotifyLogout(); throw new Error('Session expired — please log in again'); }
  if (!res.ok) throw new Error(`Spotify API error ${res.status}`);
  return res.json();
}

async function spFetchAll(path, params = {}) {
  let items = [], url = path, p = { ...params, limit: 50, offset: 0 };
  while (url) {
    if (!getToken()) await refreshToken();
    const data = await spFetch(url, p);
    items = items.concat(data.items ?? []);
    if (data.next) { const n = new URL(data.next); url = n.pathname.replace('/v1',''); p = Object.fromEntries(n.searchParams); }
    else url = null;
  }
  return items;
}

export const getMe             = ()    => spFetch('/me');
export const getPlaylists      = async () => (await spFetchAll('/me/playlists')).filter(Boolean);
export const getLikedSongs     = async () => (await spFetchAll('/me/tracks')).filter(Boolean).map(i => i.track).filter(Boolean);
export const getPlaylistTracks = async (id) => (await spFetchAll(`/playlists/${id}/tracks`)).filter(Boolean).map(i => i.track).filter(Boolean);
export const trackToQuery      = (t)   => `${t.artists?.[0]?.name ?? ''} ${t.name}`.trim();
