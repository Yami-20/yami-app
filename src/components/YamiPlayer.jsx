import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RiPlayFill, RiPauseFill, RiSkipForwardFill, RiSkipBackFill,
  RiVolumeUpFill, RiVolumeMuteFill, RiMusicLine,
  RiShuffleLine, RiRepeat2Line, RiRepeatOneLine,
  RiHeartLine, RiHeartFill, RiPlayListAddLine, RiArrowUpSLine,
  RiRadioLine, RiWifiOffLine,
} from 'react-icons/ri';
import { useYami } from '../context/YamiContext';
import { BACKEND_URL } from '../config';

const BACKEND = BACKEND_URL;
const STREAM_TTL = 4 * 60 * 60 * 1000; // 4h — matches server

async function fetchStreamUrl(trackName, artistName, signal) {
  const q   = `${trackName} ${artistName}`;
  const res = await fetch(`${BACKEND}/stream?q=${encodeURIComponent(q)}`, { signal });
  if (!res.ok) throw new Error('Stream fetch failed');
  const data = await res.json();
  if (!data.url) throw new Error('No URL');
  return data.url;
}

export default function YamiPlayer() {
  const navigate = useNavigate();
  const {
    currentTrack, isPlaying, volume, muted, progress, duration,
    shuffle, repeat, togglePlay, playNext, skipNext, playPrev,
    setVolume, setMuted, setProgress, setDuration,
    setShuffle, cycleRepeat, toggleLike, isLiked,
    setNowPlayingOpen, formatTime, audioRef, radioMode, toggleRadio,
    suggestions, queue, suggestionsLoading, showToast,
  } = useYami();

  const ref    = audioRef;
  const [streamUrl, setStreamUrl]       = useState(null);
  const [loading, setLoading]           = useState(false);
  const [offline, setOffline]           = useState(false);
  const prefetchCache  = useRef({});  // trackId → { url, ts }
  const prefetchDone   = useRef({});  // trackId → bool
  const abortRef       = useRef(null);
  const isNewTrackLoad = useRef(false); // true when streamUrl just loaded for a new track
  const liked = currentTrack ? isLiked(currentTrack.trackId) : false;

  // ── Backend health monitor ────────────────────────────────────────────────
  useEffect(() => {
    let timer;
    async function check() {
      try {
        const res = await fetch(`${BACKEND}/health`, { signal: AbortSignal.timeout(3000) });
        setOffline(!res.ok);
      } catch { setOffline(true); }
      timer = setTimeout(check, 15000);
    }
    check();
    return () => clearTimeout(timer);
  }, []);

  // ── Network online/offline ────────────────────────────────────────────────
  useEffect(() => {
    const onOnline  = () => { setOffline(false); showToast('Back online', 'info'); };
    const onOffline = () => { setOffline(true);  showToast('You\'re offline', 'remove'); };
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, [showToast]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space')                  { e.preventDefault(); togglePlay(); }
      if (e.code === 'ArrowRight' && e.altKey) { e.preventDefault(); skipNext(); }
      if (e.code === 'ArrowLeft'  && e.altKey) { e.preventDefault(); playPrev(); }
      if (e.code === 'KeyM')                   { setMuted(m => !m); }
    };
    // Media keys via Electron IPC
    const cleanups = [];
    if (window.electronAPI) {
      cleanups.push(window.electronAPI.onMediaPlayPause(() => togglePlay()));
      cleanups.push(window.electronAPI.onMediaNext(() => skipNext()));
      cleanups.push(window.electronAPI.onMediaPrev(() => playPrev()));
      cleanups.push(window.electronAPI.onMediaStop(() => setMuted(true)));
    }
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); cleanups.forEach(fn => fn && fn()); };
  }, [togglePlay, skipNext, playPrev, setMuted]);

  // ── Check if cached URL is still fresh ────────────────────────────────────
  const isFresh = useCallback((trackId) => {
    const entry = prefetchCache.current[trackId];
    return entry && (Date.now() - entry.ts < STREAM_TTL);
  }, []);

  // ── Fetch stream URL for current track ────────────────────────────────────
  useEffect(() => {
    if (!currentTrack) return;
    if (ref.current) { ref.current.pause(); ref.current.src = ''; }
    setStreamUrl(null);

    // Use prefetch cache if fresh
    if (isFresh(currentTrack.trackId)) {
      isNewTrackLoad.current = true;
      setStreamUrl(prefetchCache.current[currentTrack.trackId].url);
      setLoading(false);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);

    fetchStreamUrl(currentTrack.trackName, currentTrack.artistName, controller.signal)
      .then(url => {
        prefetchCache.current[currentTrack.trackId] = { url, ts: Date.now() };
        isNewTrackLoad.current = true;
        setStreamUrl(url);
        setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        // Fallback to iTunes 30s preview
        if (currentTrack.previewUrl) {
          showToast('Using preview — full stream unavailable', 'info');
          setStreamUrl(currentTrack.previewUrl);
        } else {
          showToast('Could not load stream', 'remove');
        }
        setLoading(false);
      });

    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.trackId]);

  // ── Re-fetch if URL expired before playback resumes ───────────────────────
  useEffect(() => {
    if (!currentTrack || !isPlaying || loading) return;
    if (streamUrl && !isFresh(currentTrack.trackId)) {
      setLoading(true);
      fetchStreamUrl(currentTrack.trackName, currentTrack.artistName, new AbortController().signal)
        .then(url => {
          prefetchCache.current[currentTrack.trackId] = { url, ts: Date.now() };
          setStreamUrl(url);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // ── Prefetch next tracks on track change ──────────────────────────────────
  useEffect(() => {
    if (!currentTrack) return;
    const idx = queue.findIndex(t => t.trackId === currentTrack.trackId);
    const candidates = [];
    if (idx >= 0 && queue[idx + 1]) candidates.push(queue[idx + 1]);
    if (idx >= 0 && queue[idx + 2]) candidates.push(queue[idx + 2]);
    if (candidates.length === 0 && suggestions[0]) candidates.push(suggestions[0]);
    if (candidates.length === 1 && suggestions[0]?.trackId !== candidates[0]?.trackId)
      candidates.push(suggestions[0]);

    candidates.forEach(target => {
      if (!target || prefetchDone.current[target.trackId]) return;
      prefetchDone.current[target.trackId] = true;
      fetchStreamUrl(target.trackName, target.artistName, new AbortController().signal)
        .then(url => { prefetchCache.current[target.trackId] = { url, ts: Date.now() }; })
        .catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack?.trackId]);

  // ── Prefetch when 30s remain ──────────────────────────────────────────────
  useEffect(() => {
    if (!currentTrack || !duration || duration < 15) return;
    const timeLeft = duration - progress;
    if (timeLeft > 32 || timeLeft < 3) return;
    const idx    = queue.findIndex(t => t.trackId === currentTrack.trackId);
    const target = (idx >= 0 ? queue[idx + 1] : null) || suggestions[0];
    if (!target || prefetchDone.current[target.trackId]) return;
    prefetchDone.current[target.trackId] = true;
    fetchStreamUrl(target.trackName, target.artistName, new AbortController().signal)
      .then(url => { prefetchCache.current[target.trackId] = { url, ts: Date.now() }; })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Math.floor(progress)]);

  // ── Apply stream URL ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!ref.current || !streamUrl) return;
    ref.current.src = streamUrl;
    ref.current.volume = muted ? 0 : volume;
    // Only auto-play if this URL is for a new track (not a TTL re-fetch)
    if (isNewTrackLoad.current) {
      isNewTrackLoad.current = false;
      ref.current.play().catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamUrl]);

  // ── Toggle play / pause ───────────────────────────────────────────────────
  useEffect(() => {
    if (!ref.current) return;
    const src = ref.current.src;
    if (!src || src === window.location.href) return;
    if (isPlaying) ref.current.play().catch(() => {});
    else ref.current.pause();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  useEffect(() => {
    if (ref.current) ref.current.volume = muted ? 0 : volume;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volume, muted]);

  const pct = duration ? (progress / duration) * 100 : 0;

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t    = ((e.clientX - rect.left) / rect.width) * duration;
    if (ref.current) ref.current.currentTime = t;
    setProgress(t);
  };

  const RepeatIcon = repeat === 'one' ? RiRepeatOneLine : RiRepeat2Line;

  return (
    <footer className={`yami-player${isPlaying ? ' is-playing' : ''}`}>
      <audio ref={ref}
        onTimeUpdate={() => ref.current && setProgress(ref.current.currentTime)}
        onLoadedMetadata={() => ref.current && setDuration(ref.current.duration)}
        onEnded={playNext}
      />

      {offline && (
        <div className="offline-banner">
          <RiWifiOffLine /> Offline — playback unavailable
        </div>
      )}

      {/* LEFT */}
      <div className="player-track-info" onClick={() => setNowPlayingOpen(o => !o)}>
        {currentTrack?.artworkUrl60
          ? <img src={currentTrack.artworkUrl60} alt="art" className="player-art"
              style={{ cursor: 'pointer' }} />
          : <div className="player-art-placeholder"><RiMusicLine /></div>}
        <div className="player-meta">
          <div className="player-track-name">
            {loading ? 'Loading stream…' : (currentTrack?.trackName ?? 'Nothing playing')}
          </div>
          <div className="player-artist">{currentTrack?.artistName ?? '—'}</div>
        </div>
        {currentTrack && (
          <button className={`player-like-btn${liked ? ' liked' : ''}`}
            onClick={(e) => { e.stopPropagation(); toggleLike(currentTrack); }} title="Like">
            {liked ? <RiHeartFill /> : <RiHeartLine />}
          </button>
        )}
      </div>

      {/* MOBILE MINI CONTROLS — play/pause + next only, shown via CSS on narrow screens */}
      <div className="mobile-mini-controls">
        <button className="player-btn play" onClick={(e) => { e.stopPropagation(); togglePlay(); }}
          title={isPlaying ? 'Pause' : 'Play'}>
          {loading ? <span className="player-spin" /> : isPlaying ? <RiPauseFill /> : <RiPlayFill />}
        </button>
        <button className="player-btn transport" onClick={(e) => { e.stopPropagation(); skipNext(); }} title="Next">
          <RiSkipForwardFill />
        </button>
      </div>

      {/* CENTER — desktop only (hidden on mobile via CSS) */}
      <div className="player-controls">
        <div className="player-buttons">
          <button className={`player-btn shuffle${shuffle ? ' active-mode' : ''}`}
            onClick={() => setShuffle(s => !s)} title="Shuffle">
            <RiShuffleLine />
          </button>
          <button className="player-btn transport" onClick={playPrev} title="Previous (Alt+←)">
            <RiSkipBackFill />
          </button>
          <button className="player-btn play" onClick={togglePlay}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}>
            {loading
              ? <span className="player-spin" />
              : isPlaying ? <RiPauseFill /> : <RiPlayFill />}
          </button>
          <button className={`player-btn transport${suggestionsLoading ? ' loading-next' : ''}`}
            onClick={skipNext} title="Next (Alt+→)">
            <RiSkipForwardFill />
          </button>
          <button className={`player-btn repeat${repeat !== 'off' ? ' active-mode' : ''}`}
            onClick={cycleRepeat}
            title={repeat === 'off' ? 'Repeat off' : repeat === 'all' ? 'Repeat all' : 'Repeat one'}>
            <RepeatIcon />
          </button>
        </div>
        <div className="player-progress">
          <span className="progress-time">{formatTime(progress)}</span>
          <div className="progress-bar" onClick={handleSeek}>
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="progress-time">{formatTime(duration)}</span>
        </div>
      </div>

      {/* RIGHT */}
      <div className="player-right">
        <button className={`player-icon-btn${radioMode ? ' active-mode' : ''}`}
          onClick={toggleRadio} title="Radio mode">
          <RiRadioLine />
        </button>
        <button className="player-icon-btn" onClick={() => setNowPlayingOpen(o => !o)}
          title="Now Playing">
          <RiArrowUpSLine />
        </button>
        <button className="player-icon-btn" title="Queue" onClick={() => navigate('/library')}>
          <RiPlayListAddLine />
        </button>
        <div className="player-vol-row">
          <button className="player-icon-btn" onClick={() => setMuted(m => !m)} title="Mute (M)">
            {muted || volume === 0 ? <RiVolumeMuteFill /> : <RiVolumeUpFill />}
          </button>
          <input type="range" min="0" max="1" step="0.01" value={muted ? 0 : volume}
            style={{ '--track-fill': `${(muted ? 0 : volume) * 100}%`, width: 80 }}
            onChange={e => { setVolume(parseFloat(e.target.value)); setMuted(false); }} />
        </div>
      </div>
    </footer>
  );
}
