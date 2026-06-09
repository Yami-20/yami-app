import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RiPlayFill, RiPauseFill, RiSkipForwardFill, RiSkipBackFill,
  RiVolumeUpFill, RiVolumeMuteFill, RiMusicLine,
  RiShuffleLine, RiRepeat2Line, RiRepeatOneLine,
  RiHeartLine, RiHeartFill, RiPlayListAddLine, RiArrowUpSLine,
  RiRadioLine,
} from 'react-icons/ri';
import { useYami } from '../context/YamiContext';

const BACKEND = 'http://localhost:3001';

async function fetchStreamUrl(trackName, artistName, signal) {
  const q = `${trackName} ${artistName}`;
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
    shuffle, repeat, togglePlay, playNext, playPrev,
    setVolume, setMuted, setProgress, setDuration,
    setShuffle, cycleRepeat, toggleLike, isLiked,
    setNowPlayingOpen, formatTime, audioRef, radioMode, toggleRadio,
    suggestions, queue,
  } = useYami();

  const ref              = audioRef;
  const [streamUrl, setStreamUrl] = useState(null);
  const [loading, setLoading]     = useState(false);
  const prefetchCache    = useRef({});   // trackId -> url
  const prefetchDone     = useRef({});   // trackId -> bool (already prefetched)
  const abortRef         = useRef(null); // abort controller for current fetch
  const liked = currentTrack ? isLiked(currentTrack.trackId) : false;

  // ── Keyboard shortcuts ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.code === 'Space')                    { e.preventDefault(); togglePlay(); }
      if (e.code === 'ArrowRight' && e.altKey)   { e.preventDefault(); playNext(); }
      if (e.code === 'ArrowLeft'  && e.altKey)   { e.preventDefault(); playPrev(); }
      if (e.code === 'KeyM')                     { setMuted(m => !m); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay, playNext, playPrev, setMuted]);

  // ── Fetch stream URL for current track ──────────────────────────────────
  useEffect(() => {
    if (!currentTrack) return;

    // Stop old track immediately — don't wait for new URL
    if (ref.current) { ref.current.pause(); ref.current.src = ''; }
    setStreamUrl(null);

    // Use prefetch cache → instant playback
    const cached = prefetchCache.current[currentTrack.trackId];
    if (cached) { setStreamUrl(cached); setLoading(false); return; }

    // Abort any in-flight fetch BEFORE starting the new one
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);

    fetchStreamUrl(currentTrack.trackName, currentTrack.artistName, controller.signal)
      .then(url => {
        prefetchCache.current[currentTrack.trackId] = url;
        setStreamUrl(url); setLoading(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        // Fallback to iTunes preview
        setStreamUrl(currentTrack.previewUrl || null);
        setLoading(false);
      });

    return () => controller.abort();
  }, [currentTrack?.trackId]);

  // ── Prefetch next tracks immediately on track change (covers manual skips) ──
  useEffect(() => {
    if (!currentTrack) return;
    // Prefetch the next 2 tracks in queue right away
    const idx = queue.findIndex(t => t.trackId === currentTrack.trackId);
    const candidates = [];
    if (idx >= 0 && queue[idx + 1]) candidates.push(queue[idx + 1]);
    if (idx >= 0 && queue[idx + 2]) candidates.push(queue[idx + 2]);
    // Also prefetch top suggestion if queue is running low
    if (candidates.length === 0 && suggestions[0]) candidates.push(suggestions[0]);
    if (candidates.length === 1 && suggestions[0] && suggestions[0].trackId !== candidates[0]?.trackId)
      candidates.push(suggestions[0]);

    candidates.forEach(target => {
      if (!target || prefetchDone.current[target.trackId]) return;
      prefetchDone.current[target.trackId] = true;
      fetchStreamUrl(target.trackName, target.artistName, new AbortController().signal)
        .then(url => { prefetchCache.current[target.trackId] = url; })
        .catch(() => {});
    });
<<<<<<< HEAD
  }, [currentTrack]); // runs every time the track changes
=======
  }, [currentTrack?.trackId]); // runs every time the track changes
>>>>>>> e4c632a (fix: stop suggestion cycling, reduce skip delay, fix titlebar icon)

  // ── Prefetch next track again when 30s remain (safety net for auto-advance) ─
  useEffect(() => {
    if (!currentTrack || !duration || duration < 15) return;
    const timeLeft = duration - progress;
    if (timeLeft > 32 || timeLeft < 3) return;

    // Determine next track
    const idx    = queue.findIndex(t => t.trackId === currentTrack.trackId);
    const next   = idx >= 0 ? queue[idx + 1] : null;
    const target = next || suggestions[0];
    if (!target) return;
    if (prefetchDone.current[target.trackId]) return;
    prefetchDone.current[target.trackId] = true;

    fetchStreamUrl(target.trackName, target.artistName, new AbortController().signal)
      .then(url => { prefetchCache.current[target.trackId] = url; })
      .catch(() => {});
  }, [Math.floor(progress)]); // only re-run once per second max

  // ── Apply stream URL to audio element ───────────────────────────────────
  useEffect(() => {
    if (!ref.current || !streamUrl) return;
    ref.current.src = streamUrl;
    ref.current.volume = muted ? 0 : volume;
    if (isPlaying) ref.current.play().catch(() => {});
  }, [streamUrl]);

  useEffect(() => {
    if (!ref.current) return;
    if (isPlaying) ref.current.play().catch(() => {});
    else ref.current.pause();
  }, [isPlaying]);

  useEffect(() => {
    if (ref.current) ref.current.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const pct = duration ? (progress / duration) * 100 : 0;

  const handleSeek = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * duration;
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

      {/* LEFT */}
      <div className="player-track-info">
        {currentTrack?.artworkUrl60
          ? <img src={currentTrack.artworkUrl60} alt="art" className="player-art"
              onClick={() => setNowPlayingOpen(o => !o)} style={{ cursor: 'pointer' }} />
          : <div className="player-art-placeholder"><RiMusicLine /></div>}
        <div className="player-meta">
          <div className="player-track-name">
            {loading ? 'Streaming…' : (currentTrack?.trackName ?? 'Nothing playing')}
          </div>
          <div className="player-artist">{currentTrack?.artistName ?? '—'}</div>
        </div>
        {currentTrack && (
          <button className={`player-like-btn${liked ? ' liked' : ''}`}
            onClick={() => toggleLike(currentTrack)} title="Like">
            {liked ? <RiHeartFill /> : <RiHeartLine />}
          </button>
        )}
      </div>

      {/* CENTER */}
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
            {isPlaying ? <RiPauseFill /> : <RiPlayFill />}
          </button>
          <button className="player-btn transport" onClick={playNext} title="Next (Alt+→)">
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
