import { RiCloseLine, RiHeartFill, RiHeartLine, RiAddLine, RiMusicLine } from 'react-icons/ri';
import { useYami } from '../context/YamiContext';

export default function NowPlayingPanel() {
  const {
    currentTrack, progress, duration, queue,
    nowPlayingOpen, setNowPlayingOpen,
    toggleLike, isLiked, addToQueue, playTrack, formatTime,
    setProgress, audioRef,
  } = useYami();

  const liked = currentTrack ? isLiked(currentTrack.trackId) : false;
  if (!nowPlayingOpen) return null;

  const art = currentTrack?.artworkUrl100
    || currentTrack?.artworkUrl60?.replace('60x60bb', '600x600bb')
    || currentTrack?.artworkUrl60?.replace('60x60', '300x300');

  const handleSeek = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * duration;
    if (audioRef?.current) audioRef.current.currentTime = t;
    setProgress(t);
  };

  const upNext = queue.filter(t => t.trackId !== currentTrack?.trackId).slice(0, 8);
  const pct = duration ? (progress / duration) * 100 : 0;

  return (
    <>
      {/* Backdrop */}
      <div onClick={() => setNowPlayingOpen(false)}
        style={{ position: 'fixed', inset: 0, zIndex: 99, background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(2px)' }} />

      {/* Panel */}
      <div className="now-playing-panel open">
        <div className="np-header">
          <h3>NOW PLAYING</h3>
          <button className="np-close-btn" onClick={() => setNowPlayingOpen(false)}><RiCloseLine /></button>
        </div>

        {/* Art */}
        <div className="np-art-section">
          {art
            ? <img src={art} alt={currentTrack?.trackName} className="np-art" style={{ width: '100%', borderRadius: 12, display: 'block', boxShadow: '0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(155,89,245,0.1)' }} />
            : <div className="np-art-ph"><RiMusicLine /></div>}
        </div>

        {/* Track info */}
        <div className="np-meta">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div className="np-track">{currentTrack?.trackName ?? 'Nothing playing'}</div>
              <div className="np-artist">{currentTrack?.artistName ?? '—'}</div>
            </div>
            {currentTrack && (
              <button
                onClick={() => toggleLike(currentTrack)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                  color: liked ? 'var(--accent)' : 'var(--text-muted)',
                  fontSize: 20, flexShrink: 0, transition: 'all .15s ease',
                  transform: liked ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                {liked ? <RiHeartFill /> : <RiHeartLine />}
              </button>
            )}
          </div>

          {/* Mini progress bar */}
          <div style={{ marginTop: 14 }}>
            <div
              onClick={handleSeek}
              style={{
                height: 3, borderRadius: 3, background: 'rgba(255,255,255,0.07)',
                cursor: 'pointer', position: 'relative', marginBottom: 6,
              }}
            >
              <div style={{
                height: '100%', borderRadius: 3, width: `${pct}%`,
                background: 'linear-gradient(90deg, #9b59f5, #c084fc)',
                transition: 'width .1s linear',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{formatTime(progress)}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        {/* Add to queue button */}
        {currentTrack && (
          <div style={{ padding: '0 24px 12px' }}>
            <button
              onClick={() => addToQueue(currentTrack)}
              style={{
                width: '100%', padding: '9px 16px',
                background: 'rgba(155,89,245,0.08)',
                border: '1px solid rgba(155,89,245,0.18)',
                borderRadius: 10, color: 'var(--text-secondary)',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                fontFamily: 'var(--font-body)', transition: 'all .15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(155,89,245,0.14)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(155,89,245,0.08)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              <RiAddLine /> Add to Queue
            </button>
          </div>
        )}

        {/* Up next */}
        {upNext.length > 0 && (
          <div className="np-content">
            <div className="np-queue-label">Up Next</div>
            {upNext.map((t) => (
              <div key={t.trackId} className="np-queue-item" onClick={() => { playTrack(t); }}>
                {t.artworkUrl60
                  ? <img src={t.artworkUrl60} alt={t.trackName} className="np-queue-art" />
                  : <div className="np-queue-art-ph"><RiMusicLine /></div>}
                <div className="np-queue-info">
                  <div className="np-queue-track">{t.trackName}</div>
                  <div className="np-queue-artist">{t.artistName}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
