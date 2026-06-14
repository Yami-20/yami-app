import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { itunesSearch } from '../api/itunes';
import {
  getSimilarTracks, getSimilarArtistsTracks,
  getSimilarByGenre, getTrackTags, getTagTopTracks,
} from '../api/lastfm';

const YamiContext = createContext();

// ─── iTunes resolution ────────────────────────────────────────────────────────
async function resolveToItunes(entry) {
  try {
    const results = await itunesSearch({ term: entry.query, limit: 8 });
    if (!results.length) return null;
    const targetName   = entry.name.toLowerCase().trim();
    const targetArtist = entry.artist.toLowerCase().trim();
    const BAD = /\b(live|karaoke|tribute|cover|instrumental|remix|version|remaster)\b/i;
    const scored = results.map(r => {
      const rName = r.trackName.toLowerCase().trim();
      const rArtist = r.artistName.toLowerCase().trim();
      let score = 0;
      if (rName === targetName)             score += 40;
      else if (rName.includes(targetName))  score += 20;
      else if (targetName.includes(rName))  score += 15;
      if (rArtist === targetArtist)         score += 30;
      else if (rArtist.includes(targetArtist)) score += 15;
      else if (targetArtist.includes(rArtist)) score += 10;
      if (BAD.test(r.trackName)) score -= 20;
      if (!r.previewUrl)         score -= 5;
      return { track: r, score };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].score > 0 ? scored[0].track : null;
  } catch { return null; }
}

// ─── Suggestion pool builder ──────────────────────────────────────────────────
async function buildSuggestionPool(track, seenArtists = new Set()) {
  const artist = track.artistName || '';
  const name   = track.trackName  || '';
  const genre  = track.primaryGenreName || '';
  const [similar, artistPool, genrePool, tags] = await Promise.all([
    getSimilarTracks(artist, name, 50),
    getSimilarArtistsTracks(artist, 6),
    getSimilarByGenre(genre, 20),
    getTrackTags(artist, name),
  ]);
  const tagPools = tags.length
    ? await Promise.all(tags.slice(0, 2).map(tag => getTagTopTracks(tag, 15).catch(() => [])))
    : [];
  const tagTracks = tagPools.flat().map(t => ({ ...t, match: t.match * 0.9 }));
  const scoreMap = new Map();
  [...similar, ...artistPool, ...genrePool, ...tagTracks].forEach(entry => {
    if (!entry.artist || !entry.name) return;
    const key = `${entry.artist.toLowerCase()}|||${entry.name.toLowerCase()}`;
    if (!scoreMap.has(key) || scoreMap.get(key).match < entry.match)
      scoreMap.set(key, entry);
  });
  const candidates = [...scoreMap.values()]
    .filter(e => e.artist.toLowerCase() !== artist.toLowerCase())
    .sort((a, b) => {
      const aFresh = !seenArtists.has(a.artist.toLowerCase()) ? 1 : 0;
      const bFresh = !seenArtists.has(b.artist.toLowerCase()) ? 1 : 0;
      if (aFresh !== bFresh) return bFresh - aFresh;
      return b.match - a.match;
    })
    .slice(0, 80);
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
  return resolved.sort((a, b) => b.match - a.match).map(({ track: t }) => t);
}

// ─── Interleave by artist ─────────────────────────────────────────────────────
function interleave(pool) {
  const result = [];
  const buckets = new Map();
  pool.forEach(t => {
    const a = t.artistName.toLowerCase();
    if (!buckets.has(a)) buckets.set(a, []);
    buckets.get(a).push(t);
  });
  const bArr = [...buckets.values()];
  let i = 0;
  while (result.length < pool.length) {
    const b = bArr[i % bArr.length];
    if (b?.length) result.push(b.shift());
    i++;
    if (bArr.every(b => !b.length)) break;
  }
  return result;
}

// ─── Context ──────────────────────────────────────────────────────────────────
export function YamiProvider({ children }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [currentTrack,     setCurrentTrack]     = useState(null);
  const [isPlaying,        setIsPlaying]        = useState(false);
  const [queue,            setQueueState]       = useState([]);
  const [volume,           setVolume]           = useState(() => { try { const v = localStorage.getItem('yami_volume'); return v ? parseFloat(v) : 0.8; } catch { return 0.8; } });
  const [muted,            setMuted]            = useState(() => { try { return localStorage.getItem('yami_muted') === 'true'; } catch { return false; } });
  const [progress,         setProgress]         = useState(0);
  const [duration,         setDuration]         = useState(0);
  const [shuffle,          setShuffle]          = useState(false);
  const [repeat,           setRepeat]           = useState('off');
  const [liked,            setLiked]            = useState([]);
  const [history,          setHistory]          = useState([]);
  const [nowPlayingOpen,   setNowPlayingOpen]   = useState(false);
  const [toast,            setToast]            = useState(null);
  const [radioMode,        setRadioMode]        = useState(false);
  const [suggestions,      setSuggestions]      = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const audioRef = useRef(null);

  // ── SYNCHRONOUS REFS — always current, never stale ────────────────────────
  // These are updated immediately (not via useEffect) so callbacks always
  // read the true current value even if called before React re-renders.
  const queueRef       = useRef([]);
  const currentRef     = useRef(null);
  const suggestionsRef = useRef([]);
  const historyRef     = useRef([]);
  const progressRef    = useRef(0);
  const shuffleRef     = useRef(false);
  const repeatRef      = useRef('off');

  // Helpers to set state AND ref in one call
  const setQueue = useCallback((updater) => {
    setQueueState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      queueRef.current = next;
      return next;
    });
  }, []);


  const setShuffleSync = useCallback((val) => {
    const next = typeof val === 'function' ? val(shuffleRef.current) : val;
    shuffleRef.current = next;
    setShuffle(next);
  }, []);

  const setProgressSync = useCallback((val) => {
    progressRef.current = val;
    setProgress(val);
  }, []);

  // ── Session tracking ──────────────────────────────────────────────────────
  const playedIds     = useRef(new Set());
  const fetchingRef   = useRef(false);
  const fetchAbortRef = useRef(null);

  // ── Suggestions ───────────────────────────────────────────────────────────
  const fetchSuggestions = useCallback(async (track) => {
    if (!track) return;
    setSuggestionsLoading(true);
    if (fetchAbortRef.current) fetchAbortRef.current.abort = true;
    const token = { abort: false };
    fetchAbortRef.current = token;
    fetchingRef.current = true;
    try {
      const hist = historyRef.current;
      const seenArtists = new Set(hist.slice(0, 15).map(t => t.artistName.toLowerCase()));
      const pool = await buildSuggestionPool(track, seenArtists);
      if (token.abort) return;
      const recentIds = new Set(hist.slice(0, 12).map(t => t.trackId));
      const fresh = pool.filter(t => !playedIds.current.has(t.trackId) && !recentIds.has(t.trackId));
      const final = interleave(fresh);
      const next = final.length >= 5 ? final : pool;
      suggestionsRef.current = next;
      setSuggestions(next);
    } catch {
      // Keep existing suggestions on error so skipping still works
      if (suggestionsRef.current.length === 0) setSuggestions([]);
    } finally {
      fetchingRef.current = false;
      setSuggestionsLoading(false);
    }
  }, []);

  // ── Pick next suggestion ──────────────────────────────────────────────────
  const pickNextSuggestion = useCallback(() => {
    const suggs = suggestionsRef.current;
    const hist  = historyRef.current;
    if (!suggs.length) return null;
    const recentIds     = new Set(hist.slice(0, 12).map(t => t.trackId));
    const recentArtists = new Set(hist.slice(0, 6).map(t => t.artistName));
    // Priority cascade — freshest first
    const pick =
      suggs.find(t => !playedIds.current.has(t.trackId) && !recentIds.has(t.trackId) && !recentArtists.has(t.artistName)) ||
      suggs.find(t => !playedIds.current.has(t.trackId) && !recentIds.has(t.trackId)) ||
      suggs.find(t => !playedIds.current.has(t.trackId)) ||
      // Pool exhausted: reset played tracking and pick from different artist
      (() => { playedIds.current = new Set(hist.slice(0, 5).map(t => t.trackId)); return null; })() ||
      suggs.find(t => !recentIds.has(t.trackId) && !recentArtists.has(t.artistName)) ||
      suggs.find(t => !recentIds.has(t.trackId)) ||
      suggs[Math.floor(Math.random() * suggs.length)]; // random fallback, not index 0
    return pick || null;
  }, []);

  // ── Core play action (no queue mutation) ──────────────────────────────────
  const _play = useCallback((track) => {
    if (!track) return;
    // Same track — toggle
    if (currentRef.current?.trackId === track.trackId) {
      setIsPlaying(p => !p);
      return;
    }
    playedIds.current.add(track.trackId);
    currentRef.current = track;          // sync ref immediately
    setCurrentTrack(track);
    setIsPlaying(true);
    progressRef.current = 0;
    setProgress(0);
    setHistory(h => {
      const next = [track, ...h.filter(t => t.trackId !== track.trackId)].slice(0, 100);
      historyRef.current = next;
      return next;
    });
    fetchSuggestions(track);
  }, [fetchSuggestions]);

  // ── Public playTrack (adds to queue) ─────────────────────────────────────
  const playTrack = useCallback((track) => {
    if (!track) return;
    if (currentRef.current?.trackId === track.trackId) {
      setIsPlaying(p => !p);
      return;
    }
    const current = currentRef.current;
    _play(track);
    setQueue(q => {
      if (q.find(t => t.trackId === track.trackId)) return q;
      const idx = q.findIndex(t => t.trackId === current?.trackId);
      return idx === -1 ? [...q, track] : [...q.slice(0, idx + 1), track, ...q.slice(idx + 1)];
    });
  }, [_play, setQueue]);

  const togglePlay = useCallback(() => {
    if (currentRef.current) setIsPlaying(p => !p);
  }, []);

  // ── skipNext ──────────────────────────────────────────────────────────────
  const skipNext = useCallback(() => {
    const current = currentRef.current;
    if (!current) return;

    const q = queueRef.current;

    // Shuffle mode
    if (shuffleRef.current) {
      const others = q.filter(t => t.trackId !== current.trackId);
      if (others.length) { _play(others[Math.floor(Math.random() * others.length)]); return; }
    }

    // Next in explicit queue
    const idx  = q.findIndex(t => t.trackId === current.trackId);
    const next = idx >= 0 ? q[idx + 1] : null;
    if (next) { _play(next); return; }

    // Repeat all
    if (repeatRef.current === 'all' && q.length) { _play(q[0]); return; }

    // Pick from suggestion pool
    const pick = pickNextSuggestion();
    if (pick) {
      _play(pick);
      // Refill suggestions seeded from the track we just LEFT (current),
      // not from pick — gives richer related suggestions
      const remaining = suggestionsRef.current.filter(t => !playedIds.current.has(t.trackId));
      if (remaining.length < 10 && !fetchingRef.current) {
        fetchSuggestions(current); // seed from current, not pick
      }
      return;
    }

    // No suggestions yet — if fetching, wait and retry
    if (fetchingRef.current) {
      const startTime = Date.now();
      const poll = () => {
        if (!fetchingRef.current) {
          const retryPick = pickNextSuggestion();
          if (retryPick) { _play(retryPick); return; }
        }
        if (Date.now() - startTime < 8000) setTimeout(poll, 500);
        else setIsPlaying(false);
      };
      setTimeout(poll, 500);
      return;
    }

    // Nothing available — trigger fresh fetch from current track and wait
    if (!fetchingRef.current) {
      fetchSuggestions(current);
      const startTime = Date.now();
      const poll = () => {
        if (!fetchingRef.current) {
          const retryPick = pickNextSuggestion();
          if (retryPick) { _play(retryPick); return; }
        }
        if (Date.now() - startTime < 10000) setTimeout(poll, 500);
        else setIsPlaying(false);
      };
      setTimeout(poll, 500);
    }
  }, [_play, pickNextSuggestion, fetchSuggestions]);

  // ── playNext (auto-advance, called by audio onEnded) ─────────────────────
  const playNext = useCallback(() => {
    const current = currentRef.current;
    if (!current) return;

    // Repeat one
    if (repeatRef.current === 'one') {
      if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); }
      return;
    }

    const q = queueRef.current;
    if (shuffleRef.current) {
      const others = q.filter(t => t.trackId !== current.trackId);
      if (others.length) { _play(others[Math.floor(Math.random() * others.length)]); return; }
    }

    const idx  = q.findIndex(t => t.trackId === current.trackId);
    const next = idx >= 0 ? q[idx + 1] : null;
    if (next) { _play(next); return; }
    if (repeatRef.current === 'all' && q.length) { _play(q[0]); return; }

    const pick = pickNextSuggestion();
    if (pick) {
      setQueue(prev => [...prev, pick]);
      _play(pick);
      const remaining = suggestionsRef.current.filter(t => !playedIds.current.has(t.trackId));
      if (remaining.length < 8 && !fetchingRef.current) fetchSuggestions(pick);
      return;
    }
    if (fetchingRef.current) {
      setTimeout(() => {
        const retryPick = pickNextSuggestion();
        if (retryPick) { setQueue(prev => [...prev, retryPick]); _play(retryPick); }
      }, 2000);
      return;
    }
    setIsPlaying(false);
  }, [_play, pickNextSuggestion, fetchSuggestions, setQueue]);

  // ── playPrev ──────────────────────────────────────────────────────────────
  const playPrev = useCallback(() => {
    const current = currentRef.current;
    if (!current) return;

    // If more than 3s in — restart current track
    if (progressRef.current > 3) {
      if (audioRef.current) { audioRef.current.currentTime = 0; }
      progressRef.current = 0;
      setProgress(0);
      return;
    }

    const q   = queueRef.current;
    const idx = q.findIndex(t => t.trackId === current.trackId);
    const prev = idx > 0 ? q[idx - 1] : null;
    if (prev) { _play(prev); return; }

    // No prev in queue — restart
    if (audioRef.current) { audioRef.current.currentTime = 0; }
    progressRef.current = 0;
    setProgress(0);
  }, [_play]);

  // ── Queue management ──────────────────────────────────────────────────────
  const addToQueue = useCallback((track) => {
    setQueue(q => q.find(t => t.trackId === track.trackId) ? q : [...q, track]);
    showToast(`Added "${track.trackName}" to queue`);
  }, [setQueue]); // eslint-disable-line react-hooks/exhaustive-deps

  const addManyToQueue = useCallback((tracks) => {
    setQueue(q => {
      const existing = new Set(q.map(t => t.trackId));
      return [...q, ...tracks.filter(t => !existing.has(t.trackId))];
    });
    showToast(`Added ${tracks.length} songs to queue`);
  }, [setQueue]); // eslint-disable-line react-hooks/exhaustive-deps

  const removeFromQueue = useCallback((trackId) => {
    setQueue(q => q.filter(t => t.trackId !== trackId));
  }, [setQueue]);

  // ── Likes ─────────────────────────────────────────────────────────────────
  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), 2400);
  }, []);

  const toggleLike = useCallback((track) => {
    setLiked(l => {
      const has = l.find(t => t.trackId === track.trackId);
      showToast(has ? 'Removed from Liked Songs' : 'Added to Liked Songs', has ? 'remove' : 'add');
      return has ? l.filter(t => t.trackId !== track.trackId) : [track, ...l];
    });
  }, [showToast]);

  const isLiked = useCallback((trackId) => liked.some(t => t.trackId === trackId), [liked]);

  // ── Misc ──────────────────────────────────────────────────────────────────
  const cycleRepeat = useCallback(() => {
    setRepeat(r => {
      const next = r === 'off' ? 'all' : r === 'all' ? 'one' : 'off';
      repeatRef.current = next;
      return next;
    });
  }, []);

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
      if (h) {
        const parsed = JSON.parse(h);
        setHistory(parsed);
        historyRef.current = parsed;
        parsed.slice(0, 30).forEach(t => playedIds.current.add(t.trackId));
      }
    } catch {}
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { try { localStorage.setItem('yami_liked',   JSON.stringify(liked));   } catch {} }, [liked]);
  useEffect(() => { try { localStorage.setItem('yami_history', JSON.stringify(history)); } catch {} }, [history]);
  useEffect(() => { try { localStorage.setItem('yami_volume',  String(volume));           } catch {} }, [volume]);
  useEffect(() => { try { localStorage.setItem('yami_muted',   String(muted));            } catch {} }, [muted]);

  return (
    <YamiContext.Provider value={{
      currentTrack, isPlaying, queue, volume, muted, progress, duration,
      shuffle, repeat, liked, history, nowPlayingOpen, toast,
      radioMode, suggestions, suggestionsLoading,
      audioRef,
      playTrack, togglePlay, playNext, skipNext, playPrev,
      addToQueue, addManyToQueue, removeFromQueue, setQueue,
      toggleLike, isLiked,
      setShuffle: setShuffleSync,
      cycleRepeat, setVolume, setMuted,
      setProgress: setProgressSync, setDuration,
      setNowPlayingOpen, formatTime, showToast,
      toggleRadio, fetchSuggestions,
    }}>
      {children}
    </YamiContext.Provider>
  );
}

export const useYami = () => useContext(YamiContext);
