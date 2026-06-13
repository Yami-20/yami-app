import { RiVolumeUpFill, RiInformationLine, RiKeyboardLine, RiUser3Line, RiDeleteBinLine } from 'react-icons/ri';
import { useYami } from '../context/YamiContext';
import { useUser } from '../context/UserContext';

const VERSION = require('../../package.json').version;

export default function Settings() {
  const { volume, setVolume } = useYami();
  const { profile, resetProfile } = useUser();

  const handleResetProfile = () => {
    if (window.confirm('Reset your profile? You\'ll be asked to enter your name again.')) {
      resetProfile(); // clears state + storage atomically — no reload needed
    }
  };

  const handleClearData = () => {
    if (window.confirm('Clear all liked songs and history? This cannot be undone.')) {
      localStorage.removeItem('yami_liked');
      localStorage.removeItem('yami_history');
      window.location.reload();
    }
  };

  return (
    <main className="yami-main">
      <h2 className="yami-section-title" style={{ marginBottom: 28 }}>Settings</h2>

      <div className="settings-group">
        <h3 className="settings-group-title"><RiVolumeUpFill /> Playback</h3>
        <div className="settings-row">
          <div>
            <p className="settings-label">Default Volume</p>
            <p className="settings-desc">Set the starting volume level</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="settings-val">{Math.round(volume * 100)}%</span>
            <input type="range" min="0" max="1" step="0.01" value={volume}
              style={{ '--track-fill': `${volume * 100}%`, width: 120 }}
              onChange={e => setVolume(parseFloat(e.target.value))} />
          </div>
        </div>
      </div>

      <div className="settings-group">
        <h3 className="settings-group-title"><RiKeyboardLine /> Keyboard Shortcuts</h3>
        {[
          ['Space',   'Play / Pause'],
          ['Alt + →', 'Next track'],
          ['Alt + ←', 'Previous track'],
          ['M',       'Toggle mute'],
        ].map(([key, desc]) => (
          <div className="settings-row" key={key}>
            <p className="settings-label">{desc}</p>
            <span className="kbd-hint">{key}</span>
          </div>
        ))}
      </div>

      <div className="settings-group">
        <h3 className="settings-group-title"><RiUser3Line /> Profile</h3>
        <div className="settings-row">
          <div>
            <p className="settings-label">Display Name</p>
            <p className="settings-desc">Currently: <strong>{profile.displayName || 'Not set'}</strong></p>
          </div>
          <button
            onClick={handleResetProfile}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8, color: 'var(--text-secondary)',
              fontSize: 13, padding: '8px 14px', cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.target.style.background = 'rgba(255,255,255,0.08)'; e.target.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.color = 'var(--text-secondary)'; }}
          >
            Reset Profile
          </button>
        </div>
        <div className="settings-row">
          <div>
            <p className="settings-label">Clear Library Data</p>
            <p className="settings-desc">Remove all liked songs and play history</p>
          </div>
          <button
            onClick={handleClearData}
            style={{
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: 8, color: '#f87171',
              fontSize: 13, padding: '8px 14px', cursor: 'pointer',
              fontFamily: 'var(--font-body)',
              display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}
          >
            <RiDeleteBinLine /> Clear Data
          </button>
        </div>
      </div>

      <div className="settings-group">
        <h3 className="settings-group-title"><RiInformationLine /> About</h3>
        <div className="settings-row">
          <div>
            <p className="settings-label">Yami</p>
            <p className="settings-desc">Version {VERSION} — music in the dark</p>
          </div>
        </div>
      </div>
    </main>
  );
}
