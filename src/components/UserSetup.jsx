import { useState } from 'react';
import { RiCheckLine, RiUser3Line } from 'react-icons/ri';
import { useUser, getInitials } from '../context/UserContext';

export default function UserSetup() {
  const { completeSetup } = useUser();
  const [name, setName]   = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!name.trim()) { setError('Please enter your name'); return; }
    completeSetup(name.trim());
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--bg)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999, flexDirection: 'column', gap: 0,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(24px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20, padding: '40px 48px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: 20, maxWidth: 400, width: '90%',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <img src="/logo.png" alt="Yami" style={{ width: 56, height: 56, borderRadius: 14 }} />
          <span style={{
            fontSize: 22, fontWeight: 800, letterSpacing: 3,
            background: 'var(--accent-grad)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>YAMI</span>
        </div>

        {/* Avatar preview */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, fontWeight: 700, color: '#fff',
        }}>
          {name.trim() ? getInitials(name) : <RiUser3Line />}
        </div>

        <div style={{ textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 18 }}>Welcome to Yami</h2>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--muted-light)' }}>
            What should we call you?
          </p>
        </div>

        <input
          autoFocus
          style={{
            width: '100%', boxSizing: 'border-box',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(167,139,250,0.3)',
            borderRadius: 10, color: 'var(--text)',
            fontSize: 15, padding: '12px 16px',
            outline: 'none', fontFamily: 'var(--font-body)',
            textAlign: 'center',
          }}
          placeholder="Your name"
          value={name}
          onChange={e => { setName(e.target.value); setError(''); }}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          maxLength={30}
        />

        {error && <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>{error}</p>}

        <button
          onClick={handleSubmit}
          style={{
            width: '100%', padding: '12px',
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            border: 'none', borderRadius: 10, color: '#fff',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <RiCheckLine /> Get Started
        </button>
      </div>
    </div>
  );
}
