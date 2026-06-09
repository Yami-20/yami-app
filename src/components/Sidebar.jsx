import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import {
  RiHomeLine, RiSearchLine, RiPlayListLine, RiHeartFill,
  RiHistoryLine, RiSettings3Line, RiMusic2Line,
  RiSpotifyFill, RiRadioLine, RiBarChartLine, RiFileTextLine,
  RiEdit2Line, RiCheckLine, RiUser3Line,
} from 'react-icons/ri';
import { useYami }  from '../context/YamiContext';
import { useUser, getInitials } from '../context/UserContext';

function Avatar({ profile, size = 32 }) {
  if (profile.avatarUrl) {
    return <img src={profile.avatarUrl} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  }
  const initials = profile.displayName ? getInitials(profile.displayName) : null;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>
      {initials || <RiUser3Line style={{ fontSize: size * 0.5 }} />}
    </div>
  );
}

export { Avatar };

export default function Sidebar() {
  const { currentTrack, queue, liked, radioMode, toggleRadio } = useYami();
  const { profile, updateProfile } = useUser();
  const [editing, setEditing] = useState(false);
  const [input,   setInput]   = useState('');

  const startEdit = () => { setInput(profile.displayName); setEditing(true); };
  const saveEdit  = () => {
    const trimmed = input.trim();
    if (trimmed) updateProfile({ displayName: trimmed, username: trimmed.toLowerCase().replace(/\s+/g, '_') });
    setEditing(false);
  };

  return (
    <aside className="yami-sidebar">
      <div className="yami-logo">
        <h1>ya<span>mi</span></h1>
      </div>

      <nav className="sb-section">
        <NavLink to="/" end className={({ isActive }) => `yami-nav-link${isActive ? ' active' : ''}`}>
          <RiHomeLine /> Browse
        </NavLink>
        <NavLink to="/search" className={({ isActive }) => `yami-nav-link${isActive ? ' active' : ''}`}>
          <RiSearchLine /> Search
        </NavLink>
        <NavLink to="/lyrics" className={({ isActive }) => `yami-nav-link${isActive ? ' active' : ''}`}>
          <RiFileTextLine /> Lyrics
        </NavLink>
        <NavLink to="/stats" className={({ isActive }) => `yami-nav-link${isActive ? ' active' : ''}`}>
          <RiBarChartLine /> Stats
        </NavLink>
      </nav>

      <nav className="sb-section">
        <p className="sb-label">Library</p>
        <NavLink to="/library" className={({ isActive }) => `yami-nav-link${isActive ? ' active' : ''}`}>
          <RiPlayListLine /> Queue
          {queue.length > 0 && <span className="sb-badge">{queue.length}</span>}
        </NavLink>
        <NavLink to="/liked" className={({ isActive }) => `yami-nav-link${isActive ? ' active' : ''}`}>
          <RiHeartFill style={{ color: 'var(--accent-2)' }} /> Liked Songs
          {liked.length > 0 && <span className="sb-badge">{liked.length}</span>}
        </NavLink>
        <NavLink to="/history" className={({ isActive }) => `yami-nav-link${isActive ? ' active' : ''}`}>
          <RiHistoryLine /> Recently Played
        </NavLink>
      </nav>

      <nav className="sb-section">
        <p className="sb-label">Connect</p>
        <NavLink to="/spotify" className={({ isActive }) => `yami-nav-link${isActive ? ' active' : ''}`}>
          <RiSpotifyFill style={{ color: '#1db954' }} /> Import
        </NavLink>
        <button
          className={`yami-nav-link sidebar-chip ${radioMode ? 'active radio-active' : ''}`}
          onClick={toggleRadio}
          title="Auto-queue similar songs when queue ends"
        >
          <RiRadioLine /> Radio
          {radioMode && <span className="sb-badge sb-badge-pulse">ON</span>}
        </button>
      </nav>

      <div className="sb-user">
        {currentTrack && (
          <div className="sidebar-nowplaying">
            <p className="sidebar-kicker">Now playing</p>
            <strong>{currentTrack.trackName}</strong>
            <span>{currentTrack.artistName}</span>
          </div>
        )}
        <div className="sb-user-row">
          <Avatar profile={profile} size={28} />
          {editing ? (
            <div className="sb-username-edit">
              <input
                autoFocus
                className="sb-username-input"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
                maxLength={30}
                placeholder="Your name"
              />
              <button className="sb-username-save" onClick={saveEdit}><RiCheckLine /></button>
            </div>
          ) : (
            <>
              <span className="sb-username">{profile.displayName || 'Listener'}</span>
              <button className="sb-edit-btn" onClick={startEdit} title="Edit name"><RiEdit2Line /></button>
            </>
          )}
          <NavLink to="/settings" className="sb-settings-btn" title="Settings"><RiSettings3Line /></NavLink>
        </div>
      </div>
    </aside>
  );
}
