// ── Last.fm Similar Tracks API ───────────────────────────────────────────────
const LASTFM_KEY = '32c027004f3e8e7177a32b04baf9b1f2';

export async function getSimilarTracks(artist, track, limit = 30) {
  try {
    const url = new URL('https://ws.audioscrobbler.com/2.0/');
    url.searchParams.set('method',     'track.getSimilar');
    url.searchParams.set('artist',     artist);
    url.searchParams.set('track',      track);
    url.searchParams.set('api_key',    LASTFM_KEY);
    url.searchParams.set('format',     'json');
    url.searchParams.set('limit',      limit);
    url.searchParams.set('autocorrect','1');

    const res  = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error(data.message);

    return (data.similartracks?.track || []).map(t => ({
      query:  `${t.artist?.name || ''} ${t.name}`.trim(),
      artist: t.artist?.name || '',
      name:   t.name || '',
      match:  parseFloat(t.match || 0),
    }));
  } catch { return []; }
}

export async function getSimilarByGenre(genre, limit = 20) {
  try {
    const url = new URL('https://ws.audioscrobbler.com/2.0/');
    url.searchParams.set('method',  'tag.getTopTracks');
    url.searchParams.set('tag',     genre.toLowerCase());
    url.searchParams.set('api_key', LASTFM_KEY);
    url.searchParams.set('format',  'json');
    url.searchParams.set('limit',   limit);

    const res  = await fetch(url);
    const data = await res.json();
    return (data.tracks?.track || []).map(t => ({
      query:  `${t.artist?.name || ''} ${t.name}`.trim(),
      artist: t.artist?.name || '',
      name:   t.name || '',
      match:  0.5,
    }));
  } catch { return []; }
}
