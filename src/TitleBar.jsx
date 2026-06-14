import logoSrc from './assets/logo.png';
import { RiSubtractLine, RiCheckboxBlankLine, RiCloseLine } from 'react-icons/ri';

export function TitleBar() {
  const api = window.electronAPI;
  if (!api) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, height: 36,
      background: 'rgba(6,6,10,0.92)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid rgba(155,89,245,0.1)',
      display: 'flex', alignItems: 'center',
      WebkitAppRegion: 'drag',
      zIndex: 9999, userSelect: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 14, WebkitAppRegion: 'drag' }}>
        <img src={logoSrc} alt="Yami" style={{ width: 16, height: 16, borderRadius: 3, objectFit: 'contain' }} />
        <span style={{
          fontSize: 12, fontWeight: 800, letterSpacing: 3,
          fontFamily: 'var(--font-display)',
          background: 'linear-gradient(135deg, #9b59f5 0%, #c084fc 100%)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>YAMI</span>
      </div>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, paddingRight: 8, WebkitAppRegion: 'no-drag' }}>
        <WinBtn onClick={() => api.minimize()}><RiSubtractLine /></WinBtn>
        <WinBtn onClick={() => api.maximize()}><RiCheckboxBlankLine style={{ fontSize: 10 }} /></WinBtn>
        <WinBtn onClick={() => api.close()} danger><RiCloseLine /></WinBtn>
      </div>
    </div>
  );
}

function WinBtn({ onClick, children, danger }) {
  return (
    <button onClick={onClick}
      style={{
        width: 28, height: 24,
        background: 'rgba(155,89,245,0.04)',
        border: '1px solid rgba(155,89,245,0.08)',
        borderRadius: 6, color: 'rgba(255,255,255,0.4)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, transition: 'all .12s', WebkitAppRegion: 'no-drag',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger ? 'rgba(239,68,68,0.8)' : 'rgba(155,89,245,0.2)';
        e.currentTarget.style.color = '#fff';
        e.currentTarget.style.borderColor = danger ? 'rgba(239,68,68,0.5)' : 'rgba(155,89,245,0.4)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(155,89,245,0.04)';
        e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
        e.currentTarget.style.borderColor = 'rgba(155,89,245,0.08)';
      }}
    >{children}</button>
  );
}
