import { useState, useEffect, useRef, useCallback } from 'react';
import logoSrc from '../assets/logo.png';
import { RiCheckLine, RiUser3Line } from 'react-icons/ri';
import { useUser, getInitials } from '../context/UserContext';

export default function UserSetup() {
  const { completeSetup } = useUser();
  const [name, setName]       = useState('');
  const [error, setError]     = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  // Single clean focus — no retries, no document listeners, no onBlur refocus.
  // Just try once at 50ms and once at 300ms (covers slow Electron window activation).
  useEffect(() => {
    const t1 = setTimeout(() => inputRef.current?.focus(), 50);
    const t2 = setTimeout(() => {
      if (document.activeElement !== inputRef.current) {
        inputRef.current?.focus();
      }
    }, 300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  const handleSubmit = useCallback(() => {
    if (!name.trim()) {
      setError('Please enter your name');
      inputRef.current?.focus();
      return;
    }
    completeSetup(name.trim());
  }, [name, completeSetup]);

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
        WebkitAppRegion: 'no-drag',
        background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(155,89,245,0.12) 0%, transparent 65%), #080808',
      }}
      // Clicking anywhere on background re-focuses input
      onMouseDown={() => setTimeout(() => inputRef.current?.focus(), 10)}
    >
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          background: 'rgba(10,10,14,0.97)',
          backdropFilter: 'blur(40px) saturate(160%)',
          WebkitBackdropFilter: 'blur(40px) saturate(160%)',
          border: '1px solid rgba(155,89,245,0.2)',
          borderRadius: 20,
          padding: '44px 48px',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          maxWidth: 400, width: '90%',
          boxShadow: '0 0 0 1px rgba(155,89,245,0.08), 0 32px 80px rgba(0,0,0,0.8), 0 0 60px rgba(155,89,245,0.06)',
          WebkitAppRegion: 'no-drag',
          position: 'relative',
        }}
      >
        {/* Purple top glow line */}
        <div style={{
          position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(155,89,245,0.6), transparent)',
        }} />

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <img src={logoSrc} alt="Yami" style={{ width: 30, height: 30, borderRadius: 8 }} />
          <span style={{
            fontSize: 17, fontWeight: 800, letterSpacing: 4,
            background: 'linear-gradient(135deg, #9b59f5 0%, #c084fc 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>YAMI</span>
        </div>

        {/* Avatar preview */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: name.trim() ? 'linear-gradient(135deg, #9b59f5, #c084fc)' : 'rgba(155,89,245,0.08)',
          border: `2px solid ${name.trim() ? 'rgba(155,89,245,0.5)' : 'rgba(155,89,245,0.2)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: name.trim() ? 28 : 22, fontWeight: 700, color: '#fff',
          marginBottom: 24,
          transition: 'all 300ms ease',
          boxShadow: name.trim() ? '0 0 0 6px rgba(155,89,245,0.12), 0 0 20px rgba(155,89,245,0.3)' : 'none',
          pointerEvents: 'none', // avatar never steals clicks/focus
        }}>
          {name.trim() ? getInitials(name) : <RiUser3Line style={{ opacity: 0.4, color: '#9b59f5' }} />}
        </div>

        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: '#f0f0ff', pointerEvents: 'none' }}>
          Welcome to Yami
        </h2>
        <p style={{ margin: '0 0 28px', fontSize: 14, color: 'rgba(255,255,255,0.38)', textAlign: 'center', lineHeight: 1.5, pointerEvents: 'none' }}>
          What should we call you?
        </p>

        {/* Input — explicit pointer-events and user-select */}
        <input
          ref={inputRef}
          type="text"
          style={{
            width: '100%',
            boxSizing: 'border-box',
            background: focused ? 'rgba(155,89,245,0.09)' : 'rgba(155,89,245,0.04)',
            border: error
              ? '1px solid rgba(248,113,113,0.6)'
              : focused
                ? '1px solid rgba(155,89,245,0.55)'
                : '1px solid rgba(155,89,245,0.18)',
            borderRadius: 12,
            color: '#f0f0ff',
            fontSize: 16, fontWeight: 500,
            padding: '14px 18px',
            outline: 'none',
            fontFamily: 'var(--font-body)',
            textAlign: 'center',
            transition: 'border-color 150ms ease, background 150ms ease, box-shadow 150ms ease',
            boxShadow: focused ? '0 0 0 3px rgba(155,89,245,0.12)' : 'none',
            marginBottom: error ? 8 : 20,
            userSelect: 'text',
            WebkitUserSelect: 'text',
            pointerEvents: 'all',
            cursor: 'text',
            WebkitAppRegion: 'no-drag',
          }}
          placeholder="Your name"
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)} // NO refocus here — it creates loops
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
          onMouseDown={e => e.stopPropagation()} // prevent card onMouseDown stealing
          maxLength={30}
          autoComplete="off"
          spellCheck={false}
        />

        {error && (
          <p style={{ color: '#f87171', fontSize: 12, margin: '0 0 16px', textAlign: 'center', pointerEvents: 'none' }}>
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          style={{
            width: '100%', padding: '14px',
            background: name.trim() ? 'linear-gradient(135deg, #9b59f5, #c084fc)' : 'rgba(155,89,245,0.07)',
            border: name.trim() ? 'none' : '1px solid rgba(155,89,245,0.18)',
            borderRadius: 12,
            color: name.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
            fontSize: 15, fontWeight: 600,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'var(--font-body)',
            transition: 'all 150ms ease',
            boxShadow: name.trim() ? '0 4px 24px rgba(155,89,245,0.45)' : 'none',
            WebkitAppRegion: 'no-drag',
            pointerEvents: 'all',
          }}
          onMouseEnter={e => { if (name.trim()) e.currentTarget.style.transform = 'scale(1.02)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
        >
          <RiCheckLine /> Get Started
        </button>

        <p style={{ marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.18)', textAlign: 'center', pointerEvents: 'none' }}>
          Your data stays on your device
        </p>
      </div>
    </div>
  );
}
