import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { itunesSearch } from '../api/itunes';
import { getSimilarTracks, getSimilarArtistsTracks, getSimilarByGenre } from '../api/lastfm';

const YamiContext = createContext();

// ─── Suggestion engine ────────────────────────────────────────────────────────
// Resolves a Last.fm track entry to an iTunes track object.
// Uses "Artist Song" search, picks the best match by title similarity.
async function resolveToItunes(entry) {
  try {
    const results = await itunesSearch({ term: entry.query, limit: 5 });
    if (!results.length) return null;
    // Prefer exact artist+title match, fall back to first result
    const nameLower = entry.name.toLowerCase();
    const exact = results.find(r =>
      r.trackName.toLowerCase().includes(nameLower) ||
      nameLower.includes(r.trackName.toLowerCase())
    );
    return exact || results[0];
  } catch { return null; }
}

// Build a scored, deduplicated suggestion pool from multiple Last.fm sources.
// Returns iTunes track objects sorted by relevance.
async function buildSuggestionPool(track) {
  const artist = track.artistName || '';
  const name   = track.trackName  || '';
  const genre  = track.primaryGenreName || '';

  // Fire all three sources in parallel
  const [similar, artistPool, genrePool] = await Promise.all([
    getSimilarTracks(artist, name, 50),
    getSimilarArtistsTracks(artist, 5),
    getSimilarByGenre(genre, 20),
  ]);

  // Merge and deduplicate by "artist - name" key, keeping highest score
  const scoreMap = new Map();
  [...similar, ...artistPool, ...genrePool].forEach(entry => {
    const key = `${entry.artist.toLowerCase()}|||${entry.name.toLowerCase()}`;
    if (!scoreMap.has(key) || scoreMap.get(key).match < entry.match) {
      scoreMap.set(key, entry);
    }
  });

  // Sort by score descending, take top 60 candidates
  const candidates = [...scoreMap.values()]
    .sort((a, b) => b.match - a.match)
    .slice(0, 60);

  // Resolve to iTunes in parallel batches of 8
  const resolved = [];
  for (let i = 0; i < candidates.length; i += 8) {
    const batch = candidates.slice(i, i + 8);
    const results = await Promise.all(batch.map(resolveToItunes));
    results.forEach((r, j) => {
      if (r) resolved.push({ track: r, match: batch[j].match });
    });
    // Stop early if we already have 25+ good results
    if (resolved.length >= 25) break;
  }

  // Final filter: remove the source track, dupes, and same album
  const seen = new Set();
  return resolved
    .filter(({ track: t }) => {
      if (t.trackId === track.trackId) return false;
      if (seen.has(t.trackId)) return false;
      seen.add(t.trackId);
      return true;
    })
    .sort((a, b) => b.match - a.match)
    .map(({ track: t }) => t);
}

// ─── Context ─────────────────────────────────────────────────────────────────
export function YamiProvider({ children }) {
  const [currentTrack,    setCurrentTrack]    = useState(null);
  const [isPlaying,       setIsPlaying]       = useState(false);
  const [queue,           setQueue]           = useState([]);
  const [volume,          setVolume]          = useState(0.8);
  const [muted,           setMuted]           = useState(false);
  const [progress,        setProgress]        = useState(0);
  const [duration,        setDuration]        = useState(0);
  const [shuffle,         setShuffle]         = useState(false);
  const [repeat,          setRepeat]          = useState('off');
  const [liked,           setLiked]           = useState([]);
  const [history,         setHistory]         = useState([]);
  const [nowPlayingOpen,  setNowPlayingOpen]  = useState(false);
  const [toast,           setToast]           = useState(null);
  const [radioMode,       setRadioMode]       = useState(false);
  const [suggestions,     setSuggestions]     = useState([]);

  const audioRef = useRef(null);

  // Always-fresh refs so callbacks never close over stale state
  const queueRef        = useRef([]);
  const currentTrackRef = useRef(null);
  const suggestionsRef  = useRef([]);
  const historyRef      = useRef([]);

  // Global "played" set — persists across tracks so we never repeat anything
  // already heard this session, regardless of which track triggered the suggestion
  const playedIdsRef    = useRef(new Set());
  // Tracks actively being suggested (index pointer into suggestions array)
  const suggPointerRef  = useRef(0);

  useEffect(() => { queueRef.current       = queue;       }, [queue]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { suggestionsRef.current  = suggestions;  }, [suggestions]);
  useEffect(() => { historyRef.current      = history;      }, [history]);

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), 2400);
  }, []);

  // ── Suggestion fetching ───────────────────────────────────────────────────
  const fetchSuggestions = useCallback(async (track) => {
    if (!track) return;
    try {
      const pool = await buildSuggestionPool(track);
      // Filter out anything already played this session
      const fresh = pool.filter(t => !playedIdsRef.current.has(t.trackId));
      setSuggestions(fresh.length >= 3 ? fresh : pool);
      suggPointerRef.current = 0;
    } catch { setSuggestions([]); }
  }, []);

  // ── Pick next suggestion intelligently ───────────────────────────────────
  // Avoids recent artists, recently played tracks, already-used suggestions.
  // Rotates through the full pool before any repeats.
  const pickNextSuggestion = useCallback(() => {
    const suggs = suggestionsRef.current;
    const hist  = historyRef.current;
    if (!suggs.length) return null;

    const recentIds     = new Set(hist.slice(0, 10).map(t => t.trackId));
    const recentArtists = new Set(hist.slice(0, 6).map(t => t.artistName));

    // Try to find: unplayed + not recent artist + not in recent history
    let pick = suggs.find(t =>
      !playedIdsRef.current.has(t.trackId) &&
      !recentIds.has(t.trackId) &&
      !recentArtists.has(t.artistName)
    );
    // Relax: unplayed + not in recent history (allow same artist)
    if (!pick) pick = suggs.find(t =>
      !playedIdsRef.current.has(t.trackId) && !recentIds.has(t.trackId)
    );
    // Relax more: anything unplayed
    if (!pick) pick = suggs.find(t => !playedIdsRef.current.has(t.trackId));
    // Pool exhausted — reset played set and try again from top
    if (!pick) {
      playedIdsRef.current.clear();
      pick = suggs.find(t => !recentIds.has(t.trackId) && !recentArtists.has(t.artistName))
          || suggs[0];
    }

    return pick || null;
  }, []);

  // ── Internal: play a track (no queue mutation) ────────────────────────────
  const _playTrackNoQueue = useCallback((track) => {
    if (currentTrackRef.current?.trackId === track.trackId) {
      setIsPlaying(p => !p);
      return;
    }
    playedIdsRef.current.add(track.trackId);
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
    setHistory(h => [track, ...h.filter(t => t.trackId !== track.trackId)].slice(0, 100));
    fetchSuggestions(track);
  }, [fetchSuggestions]);

  // ── Public: play a track (adds to queue) ─────────────────────────────────
  const playTrack = useCallback((track) => {
    if (currentTrackRef.current?.trackId === track.trackId) {
      setIsPlaying(p => !p);
      return;
    }
    const current = currentTrackRef.current;
    playedIdsRef.current.add(track.trackId);
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
    setHistory(h => [track, ...h.filter(t => t.trackId !== track.trackId)].slice(0, 100));
    setQueue(q => {
      if (q.find(t => t.trackId === track.trackId)) return q;
      const idx = q.findIndex(t => t.trackId === current?.trackId);
      if (idx === -1) return [...q, track];
      return [...q.slice(0, idx + 1), track, ...q.slice(idx + 1)];
    });
    fetchSuggestions(track);
  }, [fetchSuggestions]);

  const togglePlay = useCallback(() => {
    if (currentTrack) setIsPlaying(p => !p);
  }, [currentTrack]);

  // ── Next / Skip ───────────────────────────────────────────────────────────
  const playNext = useCallback((manual = false) => {
    const q       = queueRef.current;
    const current = currentTrackRef.current;

    if (repeat === 'one' && !manual) {
      if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); }
      return;
    }

    if (shuffle) {
      const candidates = q.filter(t => t.trackId !== current?.trackId);
      if (candidates.length) {
        _playTrackNoQueue(candidates[Math.floor(Math.random() * candidates.length)]);
        return;
      }
    }

    // Try queue first
    const idx  = q.findIndex(t => t.trackId === current?.trackId);
    const next = idx >= 0 ? (q[idx + 1] || (repeat === 'all' ? q[0] : null)) : null;
    if (next) { _playTrackNoQueue(next); return; }

    // Queue exhausted — pick from suggestion pool
    const pick = pickNextSuggestion();
    if (pick) {
      if (!manual) {
        // Auto-advance: add to queue so user can see what's playing
        setQueue(q => [...q, pick]);
      }
      _playTrackNoQueue(pick);
      return;
    }

    setIsPlaying(false);
  }, [shuffle, repeat, _playTrackNoQueue, pickNextSuggestion]);

  const skipNext = useCallback(() => playNext(true), [playNext]);

  const playPrev = useCallback(() => {
    const q       = queueRef.current;
    const current = currentTrackRef.current;
    if (progress > 3) {
      if (audioRef.current) { audioRef.current.currentTime = 0; setProgress(0); }
      return;
    }
    const idx  = q.findIndex(t => t.trackId === current?.trackId);
    const prev = idx > 0 ? q[idx - 1] : null;
    if (prev) _playTrackNoQueue(prev);
  }, [progress, _playTrackNoQueue]);

  // ── Queue management ──────────────────────────────────────────────────────
  const addToQueue = useCallback((track) => {
    setQueue(q => q.find(t => t.trackId === track.trackId) ? q : [...q, track]);
    showToast(`Added "${track.trackName}" to queue`);
  }, [showToast]);

  const addManyToQueue = useCallback((tracks) => {
    setQueue(q => {
      const existing = new Set(q.map(t => t.trackId));
      return [...q, ...tracks.filter(t => !existing.has(t.trackId))];
    });
    showToast(`Added ${tracks.length} songs to queue`);
  }, [showToast]);

  const removeFromQueue = useCallback((trackId) => {
    setQueue(q => q.filter(t => t.trackId !== trackId));
  }, []);

  // ── Likes ─────────────────────────────────────────────────────────────────
  const toggleLike = useCallback((track) => {
    setLiked(l => {
      const has = l.find(t => t.trackId === track.trackId);
      showToast(has ? 'Removed from Liked Songs' : 'Added to Liked Songs', has ? 'remove' : 'add');
      return has ? l.filter(t => t.trackId !== track.trackId) : [track, ...l];
    });
  }, [showToast]);

  const isLiked = useCallback((trackId) => liked.some(t => t.trackId === trackId), [liked]);

  // ── Misc ──────────────────────────────────────────────────────────────────
  const cycleRepeat   = useCallback(() => setRepeat(r => r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'), []);
  const toggleRadio   = useCallback(() => {
    setRadioMode(r => { showToast(!r ? 'Radio mode on' : 'Radio mode off', 'info'); return !r; });
  }, [showToast]);

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
  };

  // ── Persistence ───────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const l = localStorage.getItem('yami_liked');
      const h = localStorage.getItem('yami_history');
      if (l) setLiked(JSON.parse(l));
      if (h) setHistory(JSON.parse(h));
    } catch {}
  }, []);

  useEffect(() => { try { localStorage.setItem('yami_liked',   JSON.stringify(liked));   } catch {} }, [liked]);
  useEffect(() => { try { localStorage.setItem('yami_history', JSON.stringify(history)); } catch {} }, [history]);

  return (
    <YamiContext.Provider value={{
      currentTrack, isPlaying, queue, volume, muted, progress, duration,
      shuffle, repeat, liked, history, nowPlayingOpen, toast,
      radioMode, suggestions,
      audioRef, playTrack, togglePlay, playNext, skipNext, playPrev,
      addToQueue, addManyToQueue, removeFromQueue, toggleLike, isLiked,
      setShuffle, cycleRepeat, setVolume, setMuted,
      setProgress, setDuration, setNowPlayingOpen, formatTime, showToast,
      toggleRadio, fetchSuggestions,
    }}>
      {children}
    </YamiContext.Provider>
  );
}

export const useYami = () => useContext(YamiContext);
