import { useState, useEffect } from 'react';
import { RiPlayFill, RiMusicFill } from 'react-icons/ri';
import SongCard from '../components/SongCard';
import { itunesSearch } from '../api/itunes';
import { useYami } from '../context/YamiContext';

const GENRES = [
  { name: 'Pop',       q: 'pop hits' },
  { name: 'Hip-Hop',   q: 'hip hop' },
  { name: 'R&B',       q: 'rnb soul' },
  { name: 'Rock',      q: 'rock' },
  { name: 'Jazz',      q: 'jazz' },
  { name: 'Dance',     q: 'dance electronic' },
  { name: 'Afrobeats', q: 'afrobeats' },
  { name: 'Reggae',    q: 'reggae' },
  { name: 'Classical', q: 'classical' },
  { name: 'Metal',     q: 'metal' },
  { name: 'Latin',     q: 'latin' },
  { name: 'Indie',     q: 'indie' },
];

const COLORS = [
  ['#be185d','#831843'], ['#6d28d9','#4c1d95'],
  ['#0e7490','#164e63'], ['#b45309','#78350f'],
  ['#047857','#064e3b'], ['#1d4ed8','#1e3a8a'],
  ['#c2410c','#7c2d12'], ['#166534','#14532d'],
  ['#7c3aed','#4c1d95'], ['#991b1b','#7f1d1d'],
  ['#b45309','#92400e'], ['#065f46','#064e3b'],
];

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

export default function Home() {
  const { addManyToQueue, showToast } = useYami();
  const [charts, setCharts]           = useState([]);
  const [genreTracks, setGenreTracks] = useState([]);
  const [activeGenre, setActiveGenre] = useState(null);
  const [loading, setLoading]         = useState(false);
  const [chartsLoading, setChartsLoading] = useState(true);

  useEffect(() => {
    itunesSearch({ term: `top hits ${new Date().getFullYear()}`, limit: 10 })
      .then(results => setCharts(results))
      .catch(() => setCharts([]))
      .finally(() => setChartsLoading(false));
  }, []);

  const loadGenre = async (genre) => {
    setActiveGenre(genre); setLoading(true);
    try {
      const results = await itunesSearch({ term: genre.q, limit: 15 });
      setGenreTracks(results);
    } catch { setGenreTracks([]); }
    setLoading(false);
  };

  const playCharts = () => {
    if (charts.length) {
      addManyToQueue(charts);
      showToast(`Added ${charts.length} chart songs to queue`, 'add');
    }
  };

  // Build artwork grid from charts for the hero card
  const heroArts = charts.slice(0, 4).map(t => t.artworkUrl60).filter(Boolean);

  return (
    <main className="yami-main">

      {/* ── Two-column Hero ───────────────────────────────── */}
      <div className="home-hero">
        <div className="home-hero-left">
          <p className="home-greeting">{greeting()}</p>
          <h2 className="home-title">Made for your <span>vibe</span></h2>
          <p className="home-sub">Fresh charts, genre deep-dives, and a cleaner player built for real music fans.</p>
        </div>

        <div className="home-hero-card">
          {heroArts.length >= 4 ? (
            <div className="hero-card-art-grid">
              {heroArts.map((src, i) => (
                <img key={i} src={src} alt="" />
              ))}
            </div>
          ) : (
            <div className="hero-card-art">
              <RiMusicFill style={{ color: 'rgba(199,112,240,0.7)' }} />
            </div>
          )}
          <div className="hero-card-info">
            <span className="hero-card-kicker">Featured</span>
            <div className="hero-card-title">Global Charts</div>
            <div className="hero-card-meta">{chartsLoading ? 'Loading…' : `${charts.length} top songs`}</div>
          </div>
          <button className="hero-card-play" onClick={playCharts} disabled={!charts.length}>
            <RiPlayFill /> Play All
          </button>
        </div>
      </div>

      {/* ── Global Charts ─────────────────────────────────── */}
      <h2 className="yami-section-title">🔥 Global Charts</h2>
      {chartsLoading
        ? <div className="yami-spinner"><div className="spinner"/></div>
        : charts.length === 0
          ? <p style={{color:'var(--text-muted)',fontSize:14}}>Could not load charts.</p>
          : <table className="track-table">
              <thead className="track-table-head">
                <tr>
                  <th className="col-num">#</th>
                  <th>Title</th>
                  <th className="col-alb">Album</th>
                  <th className="col-dur" style={{textAlign:'right'}}>Duration</th>
                  <th className="col-act"/>
                </tr>
              </thead>
              <tbody>
                {charts.map((t, i) => <SongCard key={t.trackId} track={t} index={i} />)}
              </tbody>
            </table>}

      {/* ── Genre Grid ────────────────────────────────────── */}
      <h2 className="yami-section-title" style={{marginTop:48}}>Browse by Genre</h2>
      <div className="genre-grid">
        {GENRES.map((g, i) => (
          <div key={g.name}
            className={`genre-card${activeGenre?.name === g.name ? ' active-genre' : ''}`}
            style={{background:`linear-gradient(145deg,${COLORS[i][0]},${COLORS[i][1]})`}}
            onClick={() => loadGenre(g)}>
            <span>{g.name}</span>
          </div>
        ))}
      </div>

      {activeGenre && <>
        <h2 className="yami-section-title">{activeGenre.name}</h2>
        {loading
          ? <div className="yami-spinner"><div className="spinner"/></div>
          : <table className="track-table">
              <thead className="track-table-head">
                <tr>
                  <th className="col-num">#</th><th>Title</th>
                  <th className="col-alb">Album</th>
                  <th className="col-dur" style={{textAlign:'right'}}>Duration</th>
                  <th className="col-act"/>
                </tr>
              </thead>
              <tbody>
                {genreTracks.map((t, i) => <SongCard key={t.trackId} track={t} index={i} />)}
              </tbody>
            </table>}
      </>}
    </main>
  );
}
