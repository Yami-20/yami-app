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

  const handleNpSeek = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = ((e.clientX - rect.left) / rect.width) * duration;
    if (audioRef?.current) audioRef.current.currentTime = t;
    setProgress(t);
  };

  // Exclude currently playing track from "Up next"
  const upNext = queue.filter(t => t.trackId !== currentTrack?.trackId).slice(0, 6);

  return (
    <div className="np-overlay" onClick={() => setNowPlayingOpen(false)}>
      <div className="np-panel" onClick={e => e.stopPropagation()}>
        <button className="np-close" onClick={() => setNowPlayingOpen(false)}><RiCloseLine /></button>

        <div className="np-art-wrap">
          {art
            ? <img src={art} alt={currentTrack?.trackName} className="np-art" />
            : <div className="np-art-ph"><RiMusicLine /></div>}
        </div>

        <div className="np-info">
          <div className="np-track">{currentTrack?.trackName ?? 'Nothing playing'}</div>
          <div className="np-artist">{currentTrack?.artistName ?? '—'}</div>
          <div className="np-album">{currentTrack?.collectionName ?? ''}</div>
        </div>

        <div className="np-actions">
          {currentTrack && (
            <button className={`np-like-btn${liked ? ' liked' : ''}`} onClick={() => toggleLike(currentTrack)}>
              {liked ? <RiHeartFill /> : <RiHeartLine />}
            </button>
          )}
          {currentTrack && (
            <button className="np-add-btn" onClick={() => addToQueue(currentTrack)}>
              <RiAddLine /> Add to Queue
            </button>
          )}
        </div>

        <div className="np-progress-display">
          <div className="np-bar-bg" onClick={handleNpSeek}>
            <div className="np-bar-fill" style={{ width: duration ? `${(progress/duration)*100}%` : '0%' }} />
          </div>
          <div className="np-times">
            <span>{formatTime(progress)}</span><span>{formatTime(duration)}</span>
          </div>
        </div>

        {upNext.length > 0 && (
          <div className="np-queue">
            <p className="np-queue-label">Up next</p>
            {upNext.map((t, i) => (
              <div key={t.trackId} className="np-queue-item" onClick={() => playTrack(t)}>
                <span className="np-q-num">{i + 1}</span>
                {t.artworkUrl60
                  ? <img src={t.artworkUrl60} alt={t.trackName} className="np-q-thumb" />
                  : <div className="np-q-thumb" style={{background:'var(--card)',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center'}}><RiMusicLine style={{color:'var(--muted)',fontSize:14}}/></div>}
                <div className="np-q-info">
                  <div className="np-q-name">{t.trackName}</div>
                  <div className="np-q-artist">{t.artistName}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
