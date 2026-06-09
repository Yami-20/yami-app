import { RiPlayListLine, RiDeleteBin6Line, RiMusicLine } from 'react-icons/ri';
import { useYami } from '../context/YamiContext';

export default function Library() {
  const { queue, removeFromQueue, playTrack, currentTrack } = useYami();
  return (
    <main className="yami-main">
      <div className="page-hero" style={{ background: 'linear-gradient(135deg,#047857,#1d4ed8)' }}>
        <div className="page-hero-icon"><RiPlayListLine /></div>
        <div className="page-hero-content">
          <p className="page-hero-kicker">Queue</p>
          <h1 className="page-hero-title">Up Next</h1>
          <p className="page-hero-sub">{queue.length} track{queue.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {queue.length === 0
        ? <div className="empty-state" style={{ marginTop: 24 }}>
            <RiPlayListLine />
            <p>Your queue is empty</p>
            <p style={{ marginTop: 6, fontSize: 12, color: 'var(--muted)' }}>Add songs from Search or Browse</p>
          </div>
        : <table className="track-table" style={{ marginTop: 20 }}>
            <thead className="track-table-head">
              <tr><th className="col-num">#</th><th>Title</th><th className="col-alb">Album</th><th className="col-dur" style={{textAlign:'right'}}>Duration</th><th className="col-act"/></tr>
            </thead>
            <tbody>
              {queue.map((track, i) => (
                <tr key={track.trackId} className={`track-row${currentTrack?.trackId === track.trackId ? ' playing' : ''}`}
                  onClick={() => playTrack(track)}>
                  <td className="col-num"><span className="row-num">{i + 1}</span></td>
                  <td>
                    <div className="track-cell-info">
                      {track.artworkUrl60 ? <img src={track.artworkUrl60} alt={track.trackName} className="track-thumb" /> : <div className="track-thumb-ph"><RiMusicLine /></div>}
                      <div style={{minWidth:0}}>
                        <div className="track-name">{track.trackName}</div>
                        <div className="track-artist">{track.artistName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="col-alb"><span className="track-album">{track.collectionName || '—'}</span></td>
                  <td className="track-dur">
                    {track.trackTimeMillis
                      ? `${Math.floor(track.trackTimeMillis/60000)}:${String(Math.floor((track.trackTimeMillis%60000)/1000)).padStart(2,'0')}`
                      : '—'}
                  </td>
                  <td className="col-act">
                    <div className="track-actions">
                      <button className="track-act-btn" onClick={e => { e.stopPropagation(); removeFromQueue(track.trackId); }} title="Remove">
                        <RiDeleteBin6Line />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>}
    </main>
  );
}
