import { RiAddLine, RiPlayFill, RiHeartFill, RiHeartLine } from 'react-icons/ri';
import { useYami } from '../context/YamiContext';

function PlayingBars({ paused }) {
  return (
    <div className={`playing-bars${paused ? ' paused' : ''}`}>
      <span /><span /><span />
    </div>
  );
}

export default function SongCard({ track, index, showAlbum = true }) {
  const { currentTrack, isPlaying, playTrack, addToQueue, toggleLike, isLiked } = useYami();
  const isActive = currentTrack?.trackId === track.trackId;
  const liked = isLiked(track.trackId);
  const duration = track.trackTimeMillis
    ? `${Math.floor(track.trackTimeMillis / 60000)}:${String(Math.floor((track.trackTimeMillis % 60000) / 1000)).padStart(2, '0')}`
    : '—';

  return (
    <tr className={`track-row${isActive ? ' playing' : ''}`} onClick={() => playTrack(track)}>
      <td className="col-num">
        {isActive
          ? <PlayingBars paused={!isPlaying} />
          : index != null
            ? <span className="row-num">{index + 1}</span>
            : <RiPlayFill style={{ fontSize: 12, display: 'block', marginLeft: 'auto' }} />}
      </td>
      <td>
        <div className="track-cell-info">
          {track.artworkUrl60
            ? <img src={track.artworkUrl60} alt={track.trackName} className="track-thumb" />
            : <div className="track-thumb-ph"><RiHeartLine /></div>}
          <div style={{ minWidth: 0 }}>
            <div className="track-name">{track.trackName}</div>
            <div className="track-artist">{track.artistName}</div>
          </div>
        </div>
      </td>
      {showAlbum && <td className="col-alb"><span className="track-album">{track.collectionName || '—'}</span></td>}
      <td className="track-dur">{duration}</td>
      <td className="col-act">
        <div className="track-actions">
          <button className={`track-act-btn like-btn${liked ? ' liked' : ''}`}
            onClick={e => { e.stopPropagation(); toggleLike(track); }} title="Like">
            {liked ? <RiHeartFill /> : <RiHeartLine />}
          </button>
          <button className="track-act-btn"
            onClick={e => { e.stopPropagation(); addToQueue(track); }} title="Add to queue">
            <RiAddLine />
          </button>
        </div>
      </td>
    </tr>
  );
}
