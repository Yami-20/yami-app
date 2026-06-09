const LASTFM_KEY = '32c027004f3e8e7177a32b04baf9b1f2';

async function lfm(params) {
  const url = new URL('https://ws.audioscrobbler.com/2.0/');
  Object.entries({ api_key: LASTFM_KEY, format: 'json', autocorrect: '1', ...params })
    .forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.message);
  return data;
}

// Similar tracks to a given song
export async function getSimilarTracks(artist, track, limit = 50) {
  try {
    const data = await lfm({ method: 'track.getSimilar', artist, track, limit });
    return (data.similartracks?.track || []).map(t => ({
      query:  `${t.artist?.name || ''} ${t.name}`.trim(),
      artist: t.artist?.name || '',
      name:   t.name || '',
      match:  parseFloat(t.match || 0),
    }));
  } catch { return []; }
}

// Top tracks for an artist (used to widen pool when similar tracks are thin)
export async function getArtistTopTracks(artist, limit = 10) {
  try {
    const data = await lfm({ method: 'artist.getTopTracks', artist, limit });
    return (data.toptracks?.track || []).map(t => ({
      query:  `${artist} ${t.name}`.trim(),
      artist,
      name:   t.name || '',
      match:  0.6,
    }));
  } catch { return []; }
}

// Similar artists → their top tracks (great for widening the pool)
export async function getSimilarArtistsTracks(artist, limit = 5) {
  try {
    const data = await lfm({ method: 'artist.getSimilar', artist, limit });
    const similarArtists = (data.similarartists?.artist || []).slice(0, limit);
    const trackLists = await Promise.all(
      similarArtists.map(a => getArtistTopTracks(a.name, 5).catch(() => []))
    );
    return trackLists.flat().map(t => ({ ...t, match: t.match * 0.8 }));
  } catch { return []; }
}

// Genre top tracks fallback
export async function getSimilarByGenre(genre, limit = 20) {
  try {
    const data = await lfm({ method: 'tag.getTopTracks', tag: genre.toLowerCase(), limit });
    return (data.tracks?.track || []).map(t => ({
      query:  `${t.artist?.name || ''} ${t.name}`.trim(),
      artist: t.artist?.name || '',
      name:   t.name || '',
      match:  0.4,
    }));
  } catch { return []; }
}
