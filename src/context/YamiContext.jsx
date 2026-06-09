import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { itunesSearch } from '../api/itunes';
import { getSimilarTracks, getSimilarByGenre } from '../api/lastfm';

const YamiContext = createContext();

export function YamiProvider({ children }) {
  const [currentTrack, setCurrentTrack]   = useState(null);
  const [isPlaying, setIsPlaying]         = useState(false);
  const [queue, setQueue]                 = useState([]);
  const [volume, setVolume]               = useState(0.8);
  const [muted, setMuted]                 = useState(false);
  const [progress, setProgress]           = useState(0);
  const [duration, setDuration]           = useState(0);
  const [shuffle, setShuffle]             = useState(false);
  const [repeat, setRepeat]               = useState('off');
  const [liked, setLiked]                 = useState([]);
  const [history, setHistory]             = useState([]);
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false);
  const [toast, setToast]                 = useState(null);
  const [radioMode, setRadioMode]         = useState(false);
  const [suggestions, setSuggestions]     = useState([]);
  const audioRef = useRef(null);
  // Always-fresh refs so navigation callbacks never close over stale state
  const queueRef        = useRef([]);
  const currentTrackRef = useRef(null);
  const suggestionsRef  = useRef([]);
  const historyRef      = useRef([]);

  useEffect(() => { queueRef.current        = queue;        }, [queue]);
  useEffect(() => { currentTrackRef.current = currentTrack; }, [currentTrack]);
  useEffect(() => { suggestionsRef.current  = suggestions;  }, [suggestions]);
  useEffect(() => { historyRef.current      = history;      }, [history]);

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type, id: Date.now() });
    setTimeout(() => setToast(null), 2400);
  }, []);

  // Fetch similar songs for radio/suggestions
  const fetchSuggestions = useCallback(async (track) => {
    if (!track) return;
    try {
      const artist = track.artistName || '';
      const name   = track.trackName  || '';
      const genre  = track.primaryGenreName || '';
      const album  = track.collectionName || '';

      // Hit Last.fm for genuinely similar tracks based on real listening data
      const similar = await getSimilarTracks(artist, name, 30);

      let itunesTracks = [];

      if (similar.length >= 5) {
        // Search top Last.fm matches on iTunes in parallel batches
        const top = similar.slice(0, 20);
        for (let i = 0; i < top.length; i += 5) {
          const batch = top.slice(i, i + 5);
          const results = await Promise.all(
            batch.map(s => itunesSearch({ term: s.query, limit: 1 }).catch(() => []))
          );
          itunesTracks = itunesTracks.concat(results.flat());
        }
      } else {
        // Fallback: Last.fm genre top tracks
        const genreTracks = await getSimilarByGenre(genre, 20);
        const results = await Promise.all(
          genreTracks.slice(0, 15).map(s => itunesSearch({ term: s.query, limit: 1 }).catch(() => []))
        );
        itunesTracks = results.flat();
      }

      // Map back Last.fm match scores to iTunes results for smarter ordering
      const scoreMap = {};
      similar.forEach(s => { scoreMap[s.query.toLowerCase()] = s.match; });

      const filtered = itunesTracks
        .filter(t => t && t.trackId !== track.trackId)
        .filter(t => t.artistName !== artist)
        .filter(t => t.collectionName !== album)
        .filter((t, i, arr) => arr.findIndex(x => x.trackId === t.trackId) === i)
        .sort((a, b) => {
          const ka = `${a.artistName} ${a.trackName}`.toLowerCase();
          const kb = `${b.artistName} ${b.trackName}`.toLowerCase();
          return (scoreMap[kb] || 0) - (scoreMap[ka] || 0);
        });

      setSuggestions(filtered.length >= 3 ? filtered : itunesTracks.slice(0, 20));
    } catch { setSuggestions([]); }
  }, []);

  // Internal: play a track without modifying the queue (used by next/prev navigation)
  // Uses ref so it never closes over stale currentTrack
  const _playTrackNoQueue = useCallback((track) => {
    if (currentTrackRef.current?.trackId === track.trackId) {
      setIsPlaying(p => !p);
      return;
    }
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
    setHistory(h => [track, ...h.filter(t => t.trackId !== track.trackId)].slice(0, 50));
    fetchSuggestions(track);
  }, [fetchSuggestions]);

  // Public: play a track and add it to queue if not already present
  const playTrack = useCallback((track) => {
    if (currentTrackRef.current?.trackId === track.trackId) {
      setIsPlaying(p => !p);
      return;
    }
    const current = currentTrackRef.current;
    setCurrentTrack(track);
    setIsPlaying(true);
    setProgress(0);
    setHistory(h => [track, ...h.filter(t => t.trackId !== track.trackId)].slice(0, 50));
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

  const playNext = useCallback(() => {
    const q       = queueRef.current;
    const current = currentTrackRef.current;
    const suggs   = suggestionsRef.current;
    const hist    = historyRef.current;

    if (repeat === 'one') {
      if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play().catch(() => {}); }
      return;
    }
    if (shuffle) {
      const candidates = q.filter(t => t.trackId !== current?.trackId);
      if (candidates.length) { _playTrackNoQueue(candidates[Math.floor(Math.random() * candidates.length)]); return; }
    }
    const idx  = q.findIndex(t => t.trackId === current?.trackId);
    const next = idx >= 0 ? (q[idx + 1] || (repeat === 'all' ? q[0] : null)) : null;
    if (next) { _playTrackNoQueue(next); return; }

    // Auto-queue best suggestion (radio mode or end of queue)
    if (suggs.length) {
      const recentArtists = new Set(hist.slice(0, 5).map(t => t.artistName));
      const fresh = suggs.filter(t => !recentArtists.has(t.artistName));
      const pool  = fresh.length ? fresh : suggs;
      const pick  = pool[0];
      setQueue(q => [...q, pick]);
      _playTrackNoQueue(pick);
      return;
    }
    setIsPlaying(false);
  }, [shuffle, repeat, _playTrackNoQueue]);

  const playPrev = useCallback(() => {
    const q       = queueRef.current;
    const current = currentTrackRef.current;
    if (progress > 3) { if (audioRef.current) { audioRef.current.currentTime = 0; setProgress(0); } return; }
    const idx  = q.findIndex(t => t.trackId === current?.trackId);
    const prev = idx > 0 ? q[idx - 1] : null;
    if (prev) _playTrackNoQueue(prev);
  }, [progress, _playTrackNoQueue]);

  const addToQueue = useCallback((track) => {
    setQueue(q => q.find(t => t.trackId === track.trackId) ? q : [...q, track]);
    showToast(`Added "${track.trackName}" to queue`);
  }, [showToast]);

  const addManyToQueue = useCallback((tracks) => {
    setQueue(q => {
      const existing = new Set(q.map(t => t.trackId));
      const newTracks = tracks.filter(t => !existing.has(t.trackId));
      return [...q, ...newTracks];
    });
    showToast(`Added ${tracks.length} songs to queue`);
  }, [showToast]);

  const removeFromQueue = useCallback((trackId) => {
    setQueue(q => q.filter(t => t.trackId !== trackId));
  }, []);

  const toggleLike = useCallback((track) => {
    setLiked(l => {
      const has = l.find(t => t.trackId === track.trackId);
      showToast(has ? 'Removed from Liked Songs' : 'Added to Liked Songs', has ? 'remove' : 'add');
      return has ? l.filter(t => t.trackId !== track.trackId) : [track, ...l];
    });
  }, [showToast]);

  const isLiked = useCallback((trackId) => liked.some(t => t.trackId === trackId), [liked]);

  const cycleRepeat = useCallback(() => {
    setRepeat(r => r === 'off' ? 'all' : r === 'all' ? 'one' : 'off');
  }, []);

  const toggleRadio = useCallback(() => {
    setRadioMode(r => {
      showToast(!r ? 'Radio mode on — auto-queuing similar songs' : 'Radio mode off', 'info');
      return !r;
    });
  }, [showToast]);

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    return `${Math.floor(secs / 60)}:${String(Math.floor(secs % 60)).padStart(2, '0')}`;
  };

  useEffect(() => {
    try {
      const l = localStorage.getItem('yami_liked');
      const h = localStorage.getItem('yami_history');
      if (l) setLiked(JSON.parse(l));
      if (h) setHistory(JSON.parse(h));
    } catch {}
  }, []);

  useEffect(() => { try { localStorage.setItem('yami_liked', JSON.stringify(liked)); } catch {} }, [liked]);
  useEffect(() => { try { localStorage.setItem('yami_history', JSON.stringify(history)); } catch {} }, [history]);

  return (
    <YamiContext.Provider value={{
      currentTrack, isPlaying, queue, volume, muted, progress, duration,
      shuffle, repeat, liked, history, nowPlayingOpen, toast,
      radioMode, suggestions,
      audioRef, playTrack, togglePlay, playNext, playPrev,
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
