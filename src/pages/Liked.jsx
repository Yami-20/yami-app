import { RiHeartFill, RiPlayFill, RiShuffleLine } from 'react-icons/ri';
import { useYami } from '../context/YamiContext';
import SongCard from '../components/SongCard';

export default function Liked() {
  const { liked, playTrack, addManyToQueue, setShuffle, showToast } = useYami();

  const playAll = () => {
    if (!liked.length) return;
    setShuffle(false);
    addManyToQueue(liked);
    playTrack(liked[0]);
    showToast(`Playing ${liked.length} liked songs`, 'add');
  };

  const shuffleAll = () => {
    if (!liked.length) return;
    setShuffle(true);
    const shuffled = [...liked].sort(() => Math.random() - 0.5);
    addManyToQueue(shuffled);
    playTrack(shuffled[0]);
    showToast('Shuffling liked songs', 'add');
  };

  return (
    <main className="yami-main">
      <div className="page-hero" style={{ background: 'linear-gradient(135deg,#be185d,#6d28d9)' }}>
        <div className="page-hero-icon"><RiHeartFill /></div>
        <div className="page-hero-content">
          <p className="page-hero-kicker">Playlist</p>
          <h1 className="page-hero-title">Liked Songs</h1>
          <p className="page-hero-sub">{liked.length} song{liked.length !== 1 ? 's' : ''}</p>
          {liked.length > 0 && (
            <div className="page-hero-actions">
              <button className="hero-play-btn" onClick={playAll}>
                <RiPlayFill /> Play All
              </button>
              <button className="hero-shuffle-btn" onClick={shuffleAll}>
                <RiShuffleLine /> Shuffle
              </button>
            </div>
          )}
        </div>
      </div>

      {liked.length === 0
        ? <div className="empty-state" style={{ marginTop: 24 }}>
            <RiHeartFill />
            <p>No liked songs yet</p>
            <p style={{ fontSize: 12, marginTop: 6, color: 'var(--text-muted)' }}>Hit the heart on any track</p>
          </div>
        : <table className="track-table" style={{ marginTop: 20 }}>
            <thead className="track-table-head">
              <tr><th className="col-num">#</th><th>Title</th><th className="col-alb">Album</th><th className="col-dur" style={{textAlign:'right'}}>Duration</th><th className="col-act"/></tr>
            </thead>
            <tbody>{liked.map((t, i) => <SongCard key={t.trackId} track={t} index={i} />)}</tbody>
          </table>}
    </main>
  );
}
