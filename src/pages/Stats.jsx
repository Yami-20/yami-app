import { useMemo } from 'react';
import { RiTimeLine, RiMusicLine, RiUserLine, RiAlbumLine } from 'react-icons/ri';
import { useYami } from '../context/YamiContext';
import { useUser } from '../context/UserContext';
import { Avatar } from '../components/Sidebar';

export default function StatsPage() {
  const { history, liked, queue } = useYami();
  const { profile } = useUser();

  const stats = useMemo(() => {
    const totalMs  = history.reduce((s, t) => s + (t.trackTimeMillis || 210000), 0);
    const minutes  = Math.round(totalMs / 60000);
    const artists  = new Set(history.map(t => t.artistName)).size;
    const albums   = new Set(history.map(t => t.collectionName)).size;

    const trackCount = {};
    history.forEach(t => { trackCount[t.trackId] = (trackCount[t.trackId] || 0) + 1; });
    const topTracks = Object.entries(trackCount)
      .sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([id, count]) => ({ ...history.find(t => String(t.trackId) === id), count }))
      .filter(Boolean);

    const artistCount = {};
    history.forEach(t => { artistCount[t.artistName] = (artistCount[t.artistName] || 0) + 1; });
    const topArtists = Object.entries(artistCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return { minutes, songs: history.length, artists, albums, topTracks, topArtists };
  }, [history]);

  return (
    <main className="yami-main">
      {/* User header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28 }}>
        <Avatar profile={profile} size={48} />
        <div>
          <h2 className="yami-section-title" style={{ margin: 0 }}>
            {profile.displayName ? `${profile.displayName}'s Stats` : 'Your Stats'}
          </h2>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--muted-light)' }}>
            Listening history &amp; top tracks
          </p>
        </div>
      </div>

      {history.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <RiMusicLine style={{ fontSize: 40, marginBottom: 12 }} />
          <p>Play some songs to see your stats</p>
        </div>
      ) : (
        <>
          <div className="stats-cards">
            <StatCard icon={<RiTimeLine />}   value={stats.minutes} label="minutes listened" color="#a78bfa" />
            <StatCard icon={<RiMusicLine />}  value={stats.songs}   label="songs streamed"   color="#f472b6" />
            <StatCard icon={<RiUserLine />}   value={stats.artists} label="artists reached"  color="#34d399" />
            <StatCard icon={<RiAlbumLine />}  value={stats.albums}  label="albums explored"  color="#fbbf24" />
          </div>

          <div className="stats-cols">
            <div className="stats-section">
              <h3 className="stats-heading">Top Tracks</h3>
              {stats.topTracks.map((t, i) => (
                <div key={t.trackId} className="stats-row">
                  <span className="stats-rank">{i + 1}</span>
                  {t.artworkUrl60 && <img src={t.artworkUrl60} alt="" className="stats-art" />}
                  <div className="stats-info">
                    <strong>{t.trackName}</strong>
                    <span>{t.artistName}</span>
                  </div>
                  <span className="stats-count">{t.count} plays</span>
                </div>
              ))}
            </div>
            <div className="stats-section">
              <h3 className="stats-heading">Top Artists</h3>
              {stats.topArtists.map(([artist, count], i) => (
                <div key={artist} className="stats-row">
                  <span className="stats-rank">{i + 1}</span>
                  <div className="stats-avatar"><RiUserLine /></div>
                  <div className="stats-info"><strong>{artist}</strong></div>
                  <span className="stats-count">{count} plays</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}

function StatCard({ icon, value, label, color }) {
  return (
    <div className="stat-card" style={{ '--card-color': color }}>
      <div className="stat-card-icon">{icon}</div>
      <div className="stat-card-value">{value}</div>
      <div className="stat-card-label">{label}</div>
    </div>
  );
}
