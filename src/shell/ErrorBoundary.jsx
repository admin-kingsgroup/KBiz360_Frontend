import React from 'react';

/**
 * Catches render-time errors in a page so one broken screen never white-screens
 * (or "loading-screens") the whole app — the top bar / nav stay usable and the
 * user sees what went wrong with a recover button.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
  }

  componentDidUpdate(prev) {
    // Reset when the route changes so navigating away clears the error.
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 32, maxWidth: 640, margin: '40px auto', textAlign: 'center', color: '#5a6691' }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>⚠️</div>
          <h2 style={{ margin: 0, fontSize: 18, color: '#0d1326' }}>This screen hit an error</h2>
          <p style={{ fontSize: 12.5, marginTop: 8 }}>The rest of the app still works — pick another item from the menu, or reload.</p>
          <pre style={{ textAlign: 'left', background: '#fff', border: '1px solid #e1e3ec', borderRadius: 8, padding: 12, fontSize: 11, color: '#A32D2D', overflowX: 'auto', marginTop: 14 }}>
            {String(this.state.error?.message || this.state.error)}
          </pre>
          <button onClick={() => this.setState({ error: null })}
            style={{ marginTop: 14, padding: '10px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', background: '#0d1326', color: '#d4a437', fontWeight: 700 }}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
