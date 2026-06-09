import { useEffect, useState } from 'react';
import { RiSearchLine } from 'react-icons/ri';
import SongCard from '../components/SongCard';
import { itunesSearch } from '../api/itunes';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (!term) { setResults([]); setSearched(false); return; }
    const timer = setTimeout(async () => {
      setLoading(true); setSearched(true);
      try {
        const results = await itunesSearch({ term, limit: 25 });
        setResults(results);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <main className="yami-main">
      <h2 className="yami-section-title">Search</h2>
      <div className="search-input-wrap">
        <RiSearchLine className="search-icon" />
        <input className="search-input" placeholder="Artists, songs, albums…"
          value={query} onChange={e => setQuery(e.target.value)} autoFocus />
      </div>
      {loading && <div className="yami-spinner"><div className="spinner"/></div>}
      {!loading && searched && results.length === 0 && (
        <div className="empty-state"><RiSearchLine /><p>No results for "{query}"</p></div>
      )}
      {!loading && results.length > 0 && (
        <table className="track-table">
          <thead className="track-table-head">
            <tr>
              <th className="col-num">#</th><th>Title</th>
              <th className="col-alb">Album</th>
              <th className="col-dur" style={{textAlign:'right'}}>Duration</th>
              <th className="col-act"/>
            </tr>
          </thead>
          <tbody>
            {results.map((t, i) => <SongCard key={t.trackId} track={t} index={i} />)}
          </tbody>
        </table>
      )}
    </main>
  );
}
