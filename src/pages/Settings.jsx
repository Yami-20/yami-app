import { RiSettings3Line, RiVolumeUpFill, RiInformationLine, RiKeyboardLine } from 'react-icons/ri';
import { useYami } from '../context/YamiContext';

const VERSION = require('../../package.json').version;

export default function Settings() {
  const { volume, setVolume } = useYami();

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
