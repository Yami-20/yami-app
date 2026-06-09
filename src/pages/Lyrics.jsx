import { useState, useEffect, useRef } from 'react';
import { RiMusicLine, RiTimeLine } from 'react-icons/ri';
import { useYami } from '../context/YamiContext';

async function fetchLyrics(artist, track) {
  const res = await fetch(
    `https://lrclib.net/api/search?artist_name=${encodeURIComponent(artist)}&track_name=${encodeURIComponent(track)}`
  );
  if (!res.ok) throw new Error('Not found');
  const data = await res.json();
  if (!data.length) throw new Error('No lyrics found');
  return { synced: data[0].syncedLyrics || null, plain: data[0].plainLyrics || null };
}

function parseLRC(lrc) {
  if (!lrc) return [];
  return lrc.split('\n').map(line => {
    const m = line.match(/\[(\d+):(\d+\.\d+)\](.*)/);
    if (!m) return null;
    return { time: parseInt(m[1]) * 60 + parseFloat(m[2]), text: m[3].trim() };
  }).filter(Boolean);
}

export default function LyricsPage() {
  const { currentTrack, progress } = useYami();
  const [mode,    setMode]    = useState('synced');
  const [lyrics,  setLyrics]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [active,  setActive]  = useState(0);
  const activeRef = useRef(null);
  const trackIdRef = useRef(null);

  useEffect(() => {
    if (!currentTrack) return;
    if (currentTrack.trackId === trackIdRef.current) return;
    trackIdRef.current = currentTrack.trackId;
    setLoading(true); setError(''); setLyrics(null); setActive(0);
    fetchLyrics(currentTrack.artistName, currentTrack.trackName)
      .then(setLyrics).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [currentTrack]);

  const parsed = mode === 'synced' ? parseLRC(lyrics?.synced) : [];

  useEffect(() => {
    if (!parsed.length) return;
    let idx = 0;
    for (let i = 0; i < parsed.length; i++) { if (parsed[i].time <= progress) idx = i; }
    setActive(idx);
  }, [progress, parsed.length]);

  useEffect(() => {
    if (activeRef.current) activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [active]);

  if (!currentTrack) return (
    <main className="yami-main lyrics-page">
      <div className="lyrics-empty"><RiMusicLine /><p>Play a song to see lyrics</p></div>
    </main>
  );

  return (
    <main className="yami-main lyrics-page">
      <div className="lyrics-header">
        <div className="lyrics-track-info">
          {currentTrack.artworkUrl60 && <img src={currentTrack.artworkUrl60} alt="" className="lyrics-art" />}
          <div>
            <strong>{currentTrack.trackName}</strong>
            <span>{currentTrack.artistName}</span>
          </div>
        </div>
        <div className="lyrics-mode-toggle">
          <button className={mode === 'synced' ? 'active' : ''} onClick={() => setMode('synced')}>
            <RiTimeLine /> Synced
          </button>
          <button className={mode === 'plain' ? 'active' : ''} onClick={() => setMode('plain')}>
            Plain
          </button>
        </div>
      </div>

      <div className="lyrics-body">
        {loading && <div className="lyrics-loading"><div className="sp-spinner-lg" /> Loading lyrics…</div>}
        {error   && <div className="lyrics-error">No lyrics found for this song</div>}

        {!loading && !error && mode === 'synced' && lyrics?.synced && (
          <div className="lyrics-lines">
            {parsed.map((line, i) => (
              <p key={i} ref={i === active ? activeRef : null}
                className={`lyrics-line ${i === active ? 'active' : ''} ${i < active ? 'past' : ''}`}>
                {line.text || '·'}
              </p>
            ))}
          </div>
        )}

        {!loading && !error && mode === 'plain' && lyrics?.plain && (
          <div className="lyrics-plain">
            {lyrics.plain.split('\n').map((line, i) => (
              <p key={i} className="lyrics-plain-line">{line || <br />}</p>
            ))}
          </div>
        )}

        {!loading && !error && mode === 'synced' && !lyrics?.synced && lyrics?.plain && (
          <div className="lyrics-plain">
            <p className="lyrics-note">Synced lyrics not available — showing plain text</p>
            {lyrics.plain.split('\n').map((line, i) => (
              <p key={i} className="lyrics-plain-line">{line || <br />}</p>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
