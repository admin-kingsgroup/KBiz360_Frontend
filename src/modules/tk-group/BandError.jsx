import React from 'react';

// ─── TK GROUP · FE · band / dashboard error state ────────────────────────────
// Shown when a Control-Tower band or oversight dashboard's LIVE roll-up fails, in
// place of the derived view. Without it these bands fall back to their empty shape
// — which reads as a *false* "all healthy / 100 / 0% / flat", making a backend
// outage indistinguishable from a genuinely clean group. Matches the dashed-danger
// style already used by the Module Tower.
export function BandError({ label = 'this view', onRetry }) {
  return (
    <div role="alert" className="rounded-lg border border-dashed border-danger px-4 py-6 text-center text-sm text-danger">
      Couldn’t load {label} — the live roll-up failed.{' '}
      {onRetry && <button type="button" onClick={onRetry} className="font-semibold underline">Retry</button>}
    </div>
  );
}

export default BandError;
