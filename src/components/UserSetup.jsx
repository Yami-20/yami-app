import { useState, useEffect, useRef } from 'react';
import logoSrc from '../assets/logo.png';
import { RiCheckLine, RiUser3Line } from 'react-icons/ri';
import { useUser, getInitials } from '../context/UserContext';

export default function UserSetup() {
  const { completeSetup } = useUser();
  const [name, setName]     = useState('');
  const [error, setError]   = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  // Manually focus the input after mount — autoFocus unreliable in Electron
  // and after in-app resets (window hash still at #/settings, etc.)
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 80);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = () => {
    if (!name.trim()) {
      setError('Please enter your name');
      inputRef.current?.focus();
      return;
    }
    completeSetup(name.trim());
  };

  return (
    <div
      className="yami-setup-bg"
      style={{
        position: 'fixed', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div style={{
        background: 'rgba(8,8,8,0.95)',
        backdropFilter: 'blur(40px) saturate(160%)',
        WebkitBackdropFilter: 'blur(40px) saturate(160%)',
        border: '1px solid rgba(155,89,245,0.18)',
        borderRadius: 20,
        padding: '44px 48px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        maxWidth: 400, width: '90%',
        boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(155,89,245,0.08)',
      }}>

        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <img src={logoSrc} alt="Yami" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <span style={{
            fontSize: 18, fontWeight: 800, letterSpacing: 4,
            background: 'linear-gradient(135deg, #9b59f5 0%, #c084fc 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>YAMI</span>
        </div>

        {/* Avatar preview */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: name.trim()
            ? 'linear-gradient(135deg, #9b59f5, #c084fc)'
            : 'rgba(155,89,245,0.08)',
          border: '2px solid rgba(155,89,245,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: name.trim() ? 28 : 24, fontWeight: 700, color: '#fff',
          marginBottom: 24,
          transition: 'all 300ms ease',
          boxShadow: name.trim() ? '0 0 0 6px rgba(155,89,245,0.12)' : 'none',
        }}>
          {name.trim() ? getInitials(name) : <RiUser3Line style={{ opacity: 0.35, color: '#9b59f5' }} />}
        </div>

        {/* Heading */}
        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: '#f0f0ff' }}>
          Welcome to Yami
        </h2>
        <p style={{ margin: '0 0 28px', fontSize: 14, color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          What should we call you?
        </p>

        {/* Input — use ref, not autoFocus */}
        <input
          ref={inputRef}
          type="text"
          style={{
            width: '100%', boxSizing: 'border-box',
            background: focused ? 'rgba(155,89,245,0.07)' : 'rgba(155,89,245,0.04)',
            border: error
              ? '1px solid rgba(248,113,113,0.5)'
              : focused
                ? '1px solid rgba(155,89,245,0.5)'
                : '1px solid rgba(155,89,245,0.15)',
            borderRadius: 12,
            color: '#f0f0ff',
            fontSize: 16, fontWeight: 500,
            padding: '14px 18px',
            outline: 'none',
            fontFamily: 'var(--font-body)',
            textAlign: 'center',
            transition: 'all 150ms ease',
            boxShadow: focused ? '0 0 0 3px rgba(155,89,245,0.1)' : 'none',
            marginBottom: error ? 8 : 20,
            userSelect: 'text',
            WebkitUserSelect: 'text',
            pointerEvents: 'all',
          }}
          placeholder="Your name"
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
          maxLength={30}
          autoComplete="off"
          spellCheck={false}
        />

        {error && (
          <p style={{ color: '#f87171', fontSize: 12, margin: '0 0 16px', textAlign: 'center' }}>
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          style={{
            width: '100%', padding: '14px',
            background: name.trim()
              ? 'linear-gradient(135deg, #9b59f5, #c084fc)'
              : 'rgba(155,89,245,0.06)',
            border: name.trim() ? 'none' : '1px solid rgba(155,89,245,0.15)',
            borderRadius: 12,
            color: name.trim() ? '#fff' : 'rgba(255,255,255,0.3)',
            fontSize: 15, fontWeight: 600,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'var(--font-body)',
            transition: 'all 150ms ease',
            boxShadow: name.trim() ? '0 4px 20px rgba(155,89,245,0.4)' : 'none',
          }}
        >
          <RiCheckLine /> Get Started
        </button>

        <p style={{ marginTop: 20, fontSize: 12, color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
          Your data stays on your device
        </p>
      </div>
    </div>
  );
}
