import React from 'react';
import { isChunkLoadError } from '../core/lazyModule';

/**
 * Catches render-time errors in a page so one broken screen never white-screens
 * (or "loading-screens") the whole app — the top bar / nav stay usable and the
 * user sees what went wrong with a recover button.
 *
 * Stale-chunk failures (a lazy module 404s because a new build shipped while the
 * tab was open) get special treatment: clearing state can't fix them because
 * React.lazy caches the rejected promise, so we offer a hard reload instead.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, showDetails: false };
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
    if (prev.resetKey !== this.props.resetKey && this.state.error) this.setState({ error: null, showDetails: false });
  }

  render() {
    if (this.state.error) {
      const stale = isChunkLoadError(this.state.error);
      return (
        <div style={{ padding: 32, maxWidth: 640, margin: '40px auto', textAlign: 'center', color: '#5a6691' }}>
          <div style={{ fontSize: 30, marginBottom: 10 }}>{stale ? '🔄' : '⚠️'}</div>
          <h2 style={{ margin: 0, fontSize: 18, color: '#0d1326' }}>
            {stale ? 'A new version is available' : 'This screen hit an error'}
          </h2>
          <p style={{ fontSize: 12.5, marginTop: 8 }}>
            {stale
              ? 'This screen couldn’t load because the app was updated. Reload to get the latest version.'
              : 'The rest of the app still works — pick another item from the menu, or reload.'}
          </p>
          {!stale && (
            <div style={{ marginTop: 14 }}>
              <button
                onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#5a6691', fontSize: 11.5, textDecoration: 'underline' }}>
                {this.state.showDetails ? 'Hide technical details' : 'Show technical details'}
              </button>
              {this.state.showDetails && (
                <pre style={{ textAlign: 'left', background: '#fff', border: '1px solid #e1e3ec', borderRadius: 8, padding: 12, fontSize: 11, color: '#A32D2D', overflowX: 'auto', marginTop: 10 }}>
                  {String(this.state.error?.message || this.state.error)}
                </pre>
              )}
            </div>
          )}
          <button
            onClick={() => (stale ? window.location.reload() : this.setState({ error: null }))}
            style={{ marginTop: 14, padding: '10px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', background: '#0d1326', color: '#d4a437', fontWeight: 700 }}>
            {stale ? 'Reload app' : 'Try again'}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
