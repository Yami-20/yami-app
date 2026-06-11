import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { itunesSearch } from '../api/itunes';
import {
  getSimilarTracks, getSimilarArtistsTracks,
  getSimilarByGenre, getTrackTags, getTagTopTracks,
} from '../api/lastfm';

const YamiContext = createContext();

// ─── iTunes resolution ────────────────────────────────────────────────────────
// Resolves a Last.fm entry to an iTunes track, scoring by title+artist match quality.
async function resolveToItunes(entry) {
  try {
    const results = await itunesSearch({ term: entry.query, limit: 8 });
    if (!results.length) return null;

    const targetName   = entry.name.toLowerCase().trim();
    const targetArtist = entry.artist.toLowerCase().trim();

    // Score each result — prefer exact title + artist match, penalize live/karaoke/cover
    const BAD_KEYWORDS = /\b(live|karaoke|tribute|cover|instrumental|remix|version|remaster)\b/i;

    const scored = results.map(r => {
      const rName   = r.trackName.toLowerCase().trim();
      const rArtist = r.artistName.toLowerCase().trim();
      let score = 0;

      // Title match
      if (rName === targetName)                          score += 40;
      else if (rName.includes(targetName))               score += 20;
      else if (targetName.includes(rName))               score += 15;

      // Artist match
      if (rArtist === targetArtist)                      score += 30;
      else if (rArtist.includes(targetArtist))           score += 15;
      else if (targetArtist.includes(rArtist))           score += 10;

      // Penalize bad results
      if (BAD_KEYWORDS.test(r.trackName))                score -= 20;
      if (!r.previewUrl)                                 score -= 5;

      return { track: r, score };
    });

    scored.sort((a, b) => b.score - a.score);
    // Only return if we have at least a weak match
    return scored[0].score > 0 ? scored[0].track : null;
  } catch { return null; }
}

// ─── Suggestion pool builder ─────────────────────────────────────────────────
// Builds a diverse, scored pool from multiple Last.fm signals.
// seenArtists: Set of artist names to deprioritize (not exclude)
async function buildSuggestionPool(track, seenArtists = new Set()) {
  const artist = track.artistName || '';
  const name   = track.trackName  || '';
  const genre  = track.primaryGenreName || '';

  // Fire all sources in parallel, including track tags for richer seeding
  const [similar, artistPool, genrePool, tags] = await Promise.all([
    getSimilarTracks(artist, name, 50),
    getSimilarArtistsTracks(artist, 6),
    getSimilarByGenre(genre, 20),
    getTrackTags(artist, name),
  ]);

  // Fetch tag-based tracks for up to 2 mood/genre tags in parallel
  const tagPools = tags.length
    ? await Promise.all(tags.slice(0, 2).map(tag => getTagTopTracks(tag, 15).catch(() => [])))
    : [];
  const tagTracks = tagPools.flat().map(t => ({ ...t, match: t.match * 0.9 }));

  // Merge all sources, dedupe by "artist|||name" key, keep highest score
  const scoreMap = new Map();
  [...similar, ...artistPool, ...genrePool, ...tagTracks].forEach(entry => {
    if (!entry.artist || !entry.name) return;
    const key = `${entry.artist.toLowerCase()}|||${entry.name.toLowerCase()}`;
    if (!scoreMap.has(key) || scoreMap.get(key).match < entry.match) {
      scoreMap.set(key, entry);
    }
  });

  // Sort: prefer entries from artists not already heard recently
  const candidates = [...scoreMap.values()]
    .filter(e => e.artist.toLowerCase() !== artist.toLowerCase()) // exclude source artist exact match
    .sort((a, b) => {
      const aFresh = !seenArtists.has(a.artist.toLowerCase()) ? 1 : 0;
      const bFresh = !seenArtists.has(b.artist.toLowerCase()) ? 1 : 0;
      if (aFresh !== bFresh) return bFresh - aFresh;
      return b.match - a.match;
    })
    .slice(0, 80);

  // Resolve to iTunes in parallel batches of 10, stop when 35 good results found
  const resolved = [];
  const seen = new Set([track.trackId]);

  for (let i = 0; i < candidates.length; i += 10) {
    const batch = candidates.slice(i, i + 10);
    const results = await Promise.all(batch.map(resolveToItunes));
    results.forEach((r, j) => {
      if (!r || seen.has(r.trackId)) return;
      seen.add(r.trackId);
      resolved.push({ track: r, match: batch[j].match });
    });
    if (resolved.length >= 35) break;
  }

  return resolved
    .sort((a, b) => b.match - a.match)
    .map(({ track: t }) => t);
}

// ─── Context ─────────────────────────────────────────────────────────────────
export function YamiProvider({ children }) {
  const [currentTrack,   setCurrentTrack]   = useState(null);
  const [isPlaying,      setIsPlaying]      = useState(false);
  const [queue,          setQueue]          = useState([]);
  const [volume, setVolume] = useState(() => { try { const v = localStorage.getItem('yami_volume'); return v ? parseFloat(v) : 0.8; } catch { return 0.8; } });
  const [muted, setMuted] = useState(() => { try { return localStorage.getItem('yami_muted') === 'true'; } catch { return false; } });
  const [progress,       setProgress]       = useState(0);
  const [duration,       setDuration]       = useState(0);
  const [shuffle,        setShuffle]        = useState(false);
  const [repeat,         setRepeat]         = useState('off');
  const [liked,          setLiked]          = useState([]);
  const [history,        setHistory]        = useState([]);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [toast,          setToast]          = useState(null);
  const [radioMode,      setRadioMode]      = useState(false);
  const [suggestions,    setSuggestions]    = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const audioRef = useRef(null);

  // Always-fresh refs — callbacks never close over stale state
  const queueRef        = useRef([]);
  const currentTrackRef = useRef(null);
  const suggestionsRef  = useRef([]);
  const historyRef      = useRef([]);
  const likedRef        = useRef([]);

  // Session-wide played set — never replay a song heard this session
  const playedIds = useRef(new Set());
  // Background fetch in-flight flag — avoid duplicate concurrent fetches
  const fetchingRef = useRef(false);
  // Abort controller for in-flight suggestion fetch
  const fetchAbortRef = useRef(null);

  useEffect(() => { queueRef.current        = queue;       }, [queue]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { suggestionsRef.current  = suggestions;  }, [suggestions]);
  useEffect(() => { historyRef.current      = history;      }, [history]);
  useEffect(() => { likedRef.current        = liked;        }, [liked]);

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), 2400);
  }, []);

  // ── Fetch suggestions ─────────────────────────────────────────────────────
  // Cancels any in-flight fetch, builds a new pool biased away from recent artists.
  const fetchSuggestions = useCallback(async (track) => {
    setSuggestionsLoading(true);
    if (!track) return;
    if (fetchAbortRef.current) fetchAbortRef.current.abort = true;
    const token = { abort: false };
    fetchAbortRef.current = token;
    fetchingRef.current = true;

    try {
      const hist = historyRef.current;
      // Build "seen artists" from history (last 15 played) to diversify suggestions
      const seenArtists = new Set(
        hist.slice(0, 15).map(t => t.artistName.toLowerCase())
      );

      const pool = await buildSuggestionPool(track, seenArtists);
      if (token.abort) return;

      // Filter out anything already played this session or in recent history
      const recentIds = new Set(hist.slice(0, 12).map(t => t.trackId));
      const fresh = pool.filter(t =>
        !playedIds.current.has(t.trackId) && !recentIds.has(t.trackId)
      );

      // Interleave: alternate fresh-artist and any-artist picks for variety
      const finalPool = interleave(fresh, hist);
      setSuggestions(finalPool.length >= 5 ? finalPool : pool);
    } catch {
      setSuggestions([]);
    } finally {
      fetchingRef.current = false;
    }
  }, []);

  // Interleave suggestions so same artist doesn't cluster together
  function interleave(pool) {
    const result = [];
    const artistBuckets = new Map();
    pool.forEach(t => {
      const a = t.artistName.toLowerCase();
      if (!artistBuckets.has(a)) artistBuckets.set(a, []);
      artistBuckets.get(a).push(t);
    });
    const buckets = [...artistBuckets.values()];
    let i = 0;
    while (result.length < pool.length) {
      const b = buckets[i % buckets.length];
      if (b && b.length) result.push(b.shift());
      i++;
      if (buckets.every(b => !b.length)) break;
    }
    return result;
  }

  // ── Pick next suggestion smartly ─────────────────────────────────────────
  const pickNextSuggestion = useCallback(() => {
    const suggs = suggestionsRef.current;
    const hist  = historyRef.current;
    if (!suggs.length) return null;

    const recentIds     = new Set(hist.slice(0, 12).map(t => t.trackId));
    const recentArtists = new Set(hist.slice(0, 6).map(t => t.artistName));

    // Priority 1: unplayed + not recent artist + not in recent history
    let pick = suggs.find(t =>
      !playedIds.current.has(t.trackId) &&
      !recentIds.has(t.trackId) &&
      !recentArtists.has(t.artistName)
    );
    // Priority 2: unplayed + not in recent history
    if (!pick) pick = suggs.find(t =>
      !playedIds.current.has(t.trackId) && !recentIds.has(t.trackId)
    );
    // Priority 3: anything unplayed
    if (!pick) pick = suggs.find(t => !playedIds.current.has(t.trackId));

    // Pool exhausted — clear played set and start fresh
    if (!pick) {
      playedIds.current.clear();
      pick = suggs.find(t => !recentIds.has(t.trackId) && !recentArtists.has(t.artistName))
          || suggs[0];
    }

    return pick || null;
  }, []);

  // ── Internal: play track (no queue mutation) ──────────────────────────────
  const _playTrackNoQueue = useCallback((track) => {
    if (currentTrackRef.current?.trackId === track.trackId) {
      setIsPlaying(p => !p);
      return;
    }
    playedIds.current.add(track.trackId);
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
    setHistory(h => [track, ...h.filter(t => t.trackId !== track.trackId)].slice(0, 100));
    fetchSuggestions(track);
  }, [fetchSuggestions]);

  // ── Public: play track (adds to queue) ───────────────────────────────────
  const playTrack = useCallback((track) => {
    if (currentTrackRef.current?.trackId === track.trackId) {
      setIsPlaying(p => !p);
      return;
    }
    const current = currentTrackRef.current;
    playedIds.current.add(track.trackId);
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

    // Try the explicit queue first
    const idx  = q.findIndex(t => t.trackId === current?.trackId);
    const next = idx >= 0 ? (q[idx + 1] || (repeat === 'all' ? q[0] : null)) : null;
    if (next) { _playTrackNoQueue(next); return; }

    // Pick from smart suggestion pool
    const pick = pickNextSuggestion();
    if (pick) {
      if (!manual) setQueue(q => [...q, pick]); // auto-advance: show in queue
      _playTrackNoQueue(pick);

      // Background-refill suggestions when pool gets thin
      const remaining = suggestionsRef.current.filter(t => !playedIds.current.has(t.trackId));
      if (remaining.length < 8 && !fetchingRef.current) {
        fetchSuggestions(pick);
      }
      return;
    }

    setIsPlaying(false);
  }, [shuffle, repeat, _playTrackNoQueue, pickNextSuggestion, fetchSuggestions]);

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
  const cycleRepeat = useCallback(() =>
    setRepeat(r => r === 'off' ? 'all' : r === 'all' ? 'one' : 'off'), []);

  const toggleRadio = useCallback(() => {
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
  useEffect(() => { try { localStorage.setItem('yami_volume', String(volume)); } catch {} }, [volume]);
  useEffect(() => { try { localStorage.setItem('yami_muted',  String(muted));  } catch {} }, [muted]);

  // ── Seed played set from history on load so we don't replay old songs ──────
  useEffect(() => {
    if (history.length > 0) {
      history.slice(0, 30).forEach(t => playedIds.current.add(t.trackId));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <YamiContext.Provider value={{
      currentTrack, isPlaying, queue, volume, muted, progress, duration,
      shuffle, repeat, liked, history, nowPlayingOpen, toast,
      radioMode, suggestions, suggestionsLoading,
      audioRef, playTrack, togglePlay, playNext, skipNext, playPrev,
      addToQueue, addManyToQueue, removeFromQueue, setQueue, toggleLike, isLiked,
      setShuffle, cycleRepeat, setVolume, setMuted,
      setProgress, setDuration, setNowPlayingOpen, formatTime, showToast,
      toggleRadio, fetchSuggestions,
    }}>
      {children}
    </YamiContext.Provider>
  );
}

export const useYami = () => useContext(YamiContext);

