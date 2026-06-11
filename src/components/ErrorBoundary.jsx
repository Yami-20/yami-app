import { Component } from 'react';
import { RiAlertLine, RiRefreshLine } from 'react-icons/ri';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    console.error('[Yami] Uncaught error:', error, info);
  }
  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', gap: 16,
        background: 'var(--bg-primary)', color: 'var(--text-primary)',
        fontFamily: 'var(--font-body)',
      }}>
        <RiAlertLine style={{ fontSize: 48, color: 'var(--accent-primary)', opacity: 0.8 }} />
        <h2 style={{ fontSize: 20, fontWeight: 500, margin: 0 }}>Something went wrong</h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, maxWidth: 360, textAlign: 'center' }}>
          {this.state.error?.message || 'An unexpected error occurred'}
        </p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 8, padding: '10px 22px', borderRadius: 10, cursor: 'pointer',
            background: 'var(--accent-primary)', color: '#fff', border: 'none',
            fontSize: 14, fontFamily: 'var(--font-body)', fontWeight: 500,
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
          <RiRefreshLine /> Reload Yami
        </button>
      </div>
    );
  }
}
