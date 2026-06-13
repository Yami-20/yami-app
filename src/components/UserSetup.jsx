import { useState } from 'react';
import logoSrc from '../assets/logo.png';
import { RiCheckLine, RiUser3Line } from 'react-icons/ri';
import { useUser, getInitials } from '../context/UserContext';

export default function UserSetup() {
  const { completeSetup } = useUser();
  const [name, setName]   = useState('');
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);

  const handleSubmit = () => {
    if (!name.trim()) { setError('Please enter your name'); return; }
    completeSetup(name.trim());
  };

  return (
    <div className="yami-setup-bg" style={{
      position: 'fixed', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999,
    }}>
      {/* Card */}
      <div style={{
        background: 'rgba(24,24,31,0.92)',
        backdropFilter: 'blur(40px) saturate(160%)',
        WebkitBackdropFilter: 'blur(40px) saturate(160%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: '44px 48px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 0,
        maxWidth: 400, width: '90%',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 32 }}>
          <img src={logoSrc} alt="Yami" style={{ width: 32, height: 32, borderRadius: 8 }} />
          <span style={{
            fontSize: 18, fontWeight: 800, letterSpacing: 4,
            background: 'linear-gradient(135deg, #00c9a7 0%, #0099ff 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>YAMI</span>
        </div>

        {/* Avatar preview */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: name.trim()
            ? 'linear-gradient(135deg, #00c9a7, #0099ff)'
            : 'rgba(255,255,255,0.06)',
          border: '2px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: name.trim() ? 28 : 24, fontWeight: 700, color: '#fff',
          marginBottom: 24,
          transition: 'background 300ms ease',
          boxShadow: name.trim() ? '0 0 0 6px rgba(255,87,51,0.12)' : 'none',
        }}>
          {name.trim() ? getInitials(name) : <RiUser3Line style={{ opacity: 0.4 }} />}
        </div>

        {/* Text */}
        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: '#fff' }}>
          Welcome to Yami
        </h2>
        <p style={{ margin: '0 0 28px', fontSize: 14, color: 'rgba(255,255,255,0.45)', textAlign: 'center' }}>
          What should we call you?
        </p>

        {/* Input */}
        <input
          autoFocus
          style={{
            width: '100%', boxSizing: 'border-box',
            background: focused ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
            border: focused
              ? '1px solid rgba(255,87,51,0.5)'
              : error
                ? '1px solid rgba(248,113,113,0.5)'
                : '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
            color: '#fff',
            fontSize: 16, fontWeight: 500,
            padding: '14px 18px',
            outline: 'none',
            fontFamily: 'var(--font-body)',
            textAlign: 'center',
            transition: 'border-color 150ms ease, background 150ms ease',
            boxShadow: focused ? '0 0 0 3px rgba(255,87,51,0.08)' : 'none',
            marginBottom: error ? 8 : 20,
          }}
          placeholder="Your name"
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          maxLength={30}
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
              ? 'linear-gradient(135deg, #00c9a7, #0099ff)'
              : 'rgba(255,255,255,0.06)',
            border: name.trim() ? 'none' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            color: name.trim() ? '#000' : 'rgba(255,255,255,0.3)',
            fontSize: 15, fontWeight: 600,
            cursor: name.trim() ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'var(--font-body)',
            transition: 'all 150ms ease',
            boxShadow: name.trim() ? '0 4px 20px rgba(0,201,167,0.3)' : 'none',
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
