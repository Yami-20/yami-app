// Injected into the React app to add a custom frameless title bar
// Import this in src/App.jsx: import '../electron/titlebar.js' (only when window.electronAPI exists)

export function TitleBar() {
  const api = window.electronAPI;
  if (!api) return null; // Not in Electron

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0,
      height: 32,
      background: 'rgba(6,6,14,0.95)',
      borderBottom: '1px solid rgba(255,255,255,0.04)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-end',
      WebkitAppRegion: 'drag',
      zIndex: 9999,
      paddingRight: 8,
      gap: 4,
    }}>
      <button onClick={() => api.minimize()} style={btnStyle('#888')}>—</button>
      <button onClick={() => api.maximize()} style={btnStyle('#888')}>⬜</button>
      <button onClick={() => api.close()}    style={btnStyle('#f44')}>✕</button>
    </div>
  );
}

const btnStyle = (hoverColor) => ({
  WebkitAppRegion: 'no-drag',
  background: 'none',
  border: 'none',
  color: 'var(--muted)',
  cursor: 'pointer',
  width: 28,
  height: 24,
  borderRadius: 5,
  fontSize: 11,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background .12s, color .12s',
  fontFamily: 'inherit',
});
