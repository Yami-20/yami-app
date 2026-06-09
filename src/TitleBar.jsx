import { RiSubtractLine, RiCheckboxBlankLine, RiCloseLine } from 'react-icons/ri';

export function TitleBar() {
  const api = window.electronAPI;
  if (!api) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: 36,
      background: 'rgba(8,8,16,0.6)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      alignItems: 'center',
      WebkitAppRegion: 'drag',
      zIndex: 9999,
      userSelect: 'none',
    }}>
      {/* Logo + name */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        paddingLeft: 14, WebkitAppRegion: 'drag',
      }}>
        <img
          src="/favicon.ico"
          alt="Yami"
          style={{ width: 16, height: 16, borderRadius: 3, objectFit: 'contain' }}
        />
        <span style={{
          fontSize: 12, fontWeight: 700, letterSpacing: 2,
          fontFamily: 'var(--font-display)',
          background: 'linear-gradient(135deg, #a78bfa, #f472b6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          YAMI
        </span>
      </div>

      {/* Window controls */}
      <div style={{
        marginLeft: 'auto',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        paddingRight: 8,
        WebkitAppRegion: 'no-drag',
      }}>
        <WinBtn onClick={() => api.minimize()} label="minimize">
          <RiSubtractLine />
        </WinBtn>
        <WinBtn onClick={() => api.maximize()} label="maximize">
          <RiCheckboxBlankLine style={{ fontSize: 10 }} />
        </WinBtn>
        <WinBtn onClick={() => api.close()} label="close" danger>
          <RiCloseLine />
        </WinBtn>
      </div>
    </div>
  );
}

function WinBtn({ onClick, children, danger }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: 28, height: 24,
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 6,
        color: 'rgba(255,255,255,0.45)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13,
        transition: 'all .15s',
        WebkitAppRegion: 'no-drag',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = danger
          ? 'rgba(239,68,68,0.85)'
          : 'rgba(167,139,250,0.2)';
        e.currentTarget.style.color = '#fff';
        e.currentTarget.style.borderColor = danger
          ? 'rgba(239,68,68,0.5)'
          : 'rgba(167,139,250,0.3)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
        e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
      }}
    >
      {children}
    </button>
  );
}
