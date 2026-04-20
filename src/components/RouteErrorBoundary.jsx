import React from 'react';

/**
 * Route-level error boundary. When a child component throws during render,
 * this displays the error on screen instead of a silent white page so we
 * can diagnose production-only rendering issues.
 */
export default class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[RouteErrorBoundary]', error, info);
    this.setState({ info });
  }

  render() {
    if (!this.state.error) return this.props.children;
    const { error, info } = this.state;
    return (
      <div style={{ minHeight: '100vh', padding: '40px 24px', background: '#FEF7F7', fontFamily: 'monospace', color: '#6B1E1E' }}>
        <div style={{ maxWidth: 820, margin: '0 auto' }}>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: '#C65454', margin: 0 }}>Something broke while rendering this page.</h2>
          <p style={{ fontSize: 13, color: '#6B1E1E', marginTop: 8, lineHeight: 1.5 }}>
            This is a client-side crash — the full error is logged to your browser console. Copy the text below to share it.
          </p>
          <pre style={{ marginTop: 18, padding: '14px 16px', background: '#fff', border: '1px solid #F3D5D5', borderRadius: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12 }}>
            {String(error?.stack || error?.message || error)}
          </pre>
          {info?.componentStack && (
            <pre style={{ marginTop: 12, padding: '14px 16px', background: '#fff', border: '1px solid #F3D5D5', borderRadius: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 11, color: '#8B3A3A' }}>
              {info.componentStack}
            </pre>
          )}
          <button
            onClick={() => { window.location.href = '/chat'; }}
            style={{ marginTop: 18, padding: '8px 18px', borderRadius: 8, border: 'none', background: '#C65454', color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
          >
            Back to chat
          </button>
        </div>
      </div>
    );
  }
}
