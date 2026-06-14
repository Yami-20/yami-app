import { RiHistoryLine } from 'react-icons/ri';
import { useYami } from '../context/YamiContext';
import SongCard from '../components/SongCard';

export default function History() {
  const { history } = useYami();
  return (
    <main className="yami-main">
      <div className="page-hero" style={{ background: 'linear-gradient(135deg,#6d28d9,#9b59f5)' }}>
        <div className="page-hero-icon"><RiHistoryLine /></div>
        <div className="page-hero-content">
          <p className="page-hero-kicker">History</p>
          <h1 className="page-hero-title">Recently Played</h1>
          <p className="page-hero-sub">{history.length} track{history.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {history.length === 0
        ? <div className="empty-state" style={{ marginTop: 24 }}>
            <RiHistoryLine />
            <p>Nothing played yet</p>
          </div>
        : <table className="track-table" style={{ marginTop: 20 }}>
            <thead className="track-table-head">
              <tr><th className="col-num">#</th><th>Title</th><th className="col-alb">Album</th><th className="col-dur" style={{textAlign:'right'}}>Duration</th><th className="col-act"/></tr>
            </thead>
            <tbody>{history.map((t, i) => <SongCard key={`${t.trackId}-${i}`} track={t} index={i} />)}</tbody>
          </table>}
    </main>
  );
}
