import { useEffect, useState } from 'react';
import { RiSearchLine, RiUserLine, RiAlbumLine, RiMusicLine } from 'react-icons/ri';
import SongCard from '../components/SongCard';
import { itunesSearch } from '../api/itunes';
import { useYami } from '../context/YamiContext';

const TABS = [
  { id: 'songs',   label: 'Songs',   icon: <RiMusicLine /> },
  { id: 'artists', label: 'Artists', icon: <RiUserLine /> },
  { id: 'albums',  label: 'Albums',  icon: <RiAlbumLine /> },
];

export default function Search() {
  const { playTrack, addManyToQueue, showToast } = useYami();
  const [query,   setQuery]   = useState('');
  const [tab,     setTab]     = useState('songs');
  const [results, setResults] = useState({ songs: [], artists: [], albums: [] });
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [artistTracks, setArtistTracks] = useState(null);
  const [loadingArtist, setLoadingArtist] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (!term) { setResults({ songs: [], artists: [], albums: [] }); setSearched(false); setArtistTracks(null); return; }
    const timer = setTimeout(async () => {
      setLoading(true); setSearched(true); setArtistTracks(null);
      try {
        const [songs, artists, albums] = await Promise.all([
          itunesSearch({ term, entity: 'song',        limit: 25 }),
          itunesSearch({ term, entity: 'musicArtist', limit: 10 }),
          itunesSearch({ term, entity: 'album',       limit: 10 }),
        ]);
        setResults({ songs, artists, albums });
      } catch { setResults({ songs: [], artists: [], albums: [] }); }
      setLoading(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [query]);

  const loadArtistTracks = async (artist) => {
    setLoadingArtist(true); setArtistTracks(null);
    try {
      const tracks = await itunesSearch({ term: artist.artistName, entity: 'song', limit: 20 });
      setArtistTracks({ artist, tracks });
    } catch { setArtistTracks(null); }
    setLoadingArtist(false);
  };

  const playAlbum = async (album) => {
    try {
      const tracks = await itunesSearch({
        term: `${album.collectionName} ${album.artistName}`, entity: 'song', limit: 20,
      });
      if (!tracks.length) return;
      addManyToQueue(tracks);
      playTrack(tracks[0]);
      showToast(`Playing ${album.collectionName}`, 'add');
    } catch {}
  };

  const active = results[tab] || [];

  return (
    <main className="yami-main">
      <h2 className="yami-section-title">Search</h2>

      <div className="search-input-wrap">
        <RiSearchLine className="search-icon" />
        <input className="search-input" placeholder="Artists, songs, albums…"
          value={query} onChange={e => { setQuery(e.target.value); setArtistTracks(null); }} autoFocus />
      </div>

      {searched && (
        <div className="search-tabs">
          {TABS.map(t => (
            <button key={t.id}
              className={`search-tab${tab === t.id ? ' active' : ''}`}
              onClick={() => { setTab(t.id); setArtistTracks(null); }}>
              {t.icon} {t.label}
              {results[t.id]?.length > 0 && <span className="search-tab-count">{results[t.id].length}</span>}
            </button>
          ))}
        </div>
      )}

      {loading && <div className="yami-spinner"><div className="spinner"/></div>}

      {!loading && searched && active.length === 0 && (
        <div className="empty-state"><RiSearchLine /><p>No {tab} found for "{query}"</p></div>
      )}

      {/* Songs tab */}
      {!loading && tab === 'songs' && active.length > 0 && (
        <table className="track-table">
          <thead className="track-table-head">
            <tr>
              <th className="col-num">#</th><th>Title</th>
              <th className="col-alb">Album</th>
              <th className="col-dur" style={{textAlign:'right'}}>Duration</th>
              <th className="col-act"/>
            </tr>
          </thead>
          <tbody>{active.map((t, i) => <SongCard key={t.trackId} track={t} index={i} />)}</tbody>
        </table>
      )}

      {/* Artists tab */}
      {!loading && tab === 'artists' && !artistTracks && active.length > 0 && (
        <div className="artist-grid">
          {active.map(a => (
            <div key={a.artistId} className="artist-card" onClick={() => loadArtistTracks(a)}>
              <div className="artist-card-avatar"><RiUserLine /></div>
              <div className="artist-card-name">{a.artistName}</div>
              <div className="artist-card-genre">{a.primaryGenreName || 'Artist'}</div>
            </div>
          ))}
        </div>
      )}

      {loadingArtist && <div className="yami-spinner"><div className="spinner"/></div>}

      {!loadingArtist && artistTracks && (
        <>
          <button className="search-back-btn" onClick={() => setArtistTracks(null)}>
            ← Back to artists
          </button>
          <h3 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 16px', color: 'var(--text-primary)' }}>
            {artistTracks.artist.artistName}
          </h3>
          <table className="track-table">
            <thead className="track-table-head">
              <tr><th className="col-num">#</th><th>Title</th><th className="col-alb">Album</th><th className="col-dur" style={{textAlign:'right'}}>Duration</th><th className="col-act"/></tr>
            </thead>
            <tbody>{artistTracks.tracks.map((t, i) => <SongCard key={t.trackId} track={t} index={i} />)}</tbody>
          </table>
        </>
      )}

      {/* Albums tab */}
      {!loading && tab === 'albums' && active.length > 0 && (
        <div className="album-grid">
          {active.map(a => (
            <div key={a.collectionId} className="album-card" onClick={() => playAlbum(a)}>
              {a.artworkUrl60
                ? <img src={a.artworkUrl60.replace('60x60', '160x160')} alt={a.collectionName} className="album-art" />
                : <div className="album-art-ph"><RiAlbumLine /></div>}
              <div className="album-info">
                <div className="album-name">{a.collectionName}</div>
                <div className="album-artist">{a.artistName}</div>
                <div className="album-year">{a.releaseDate ? new Date(a.releaseDate).getFullYear() : ''}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
