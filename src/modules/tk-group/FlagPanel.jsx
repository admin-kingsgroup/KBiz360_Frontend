import React from 'react';

// ─── TK GROUP · FE · control flags panel (presentational) ────────────────────
// Lists each control flag with its ON/OFF state. Foundation flags are always on
// and can't be switched. Toggling calls onToggle(key, next) — the container turns
// that into a change-request (Farhan + Owner), it does not flip anything directly.
const sw = (on) => ({
  background: on ? '#1F6E4C' : '#cbd2dc', color: '#fff', border: 'none', borderRadius: 20,
  fontSize: 10, fontWeight: 700, padding: '3px 10px', minWidth: 38,
});

export function FlagPanel({ rows = [], onToggle }) {
  if (!rows.length) return <div style={{ padding: 14, color: '#777', fontSize: 12.5 }}>No controls configured yet.</div>;
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
      {rows.map((r) => (
        <li key={r.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '1px solid #eee', fontSize: 12.5 }}>
          <span style={{ flex: 1, fontFamily: 'monospace', fontSize: 11.5 }}>{r.key}</span>
          {r.foundation ? <span style={{ fontSize: 10, color: '#8a620f' }}>foundation</span> : null}
          <button
            type="button" role="switch" aria-checked={r.enabled} aria-label={r.key}
            disabled={r.foundation}
            onClick={() => onToggle && onToggle(r.key, !r.enabled)}
            style={{ ...sw(r.enabled), opacity: r.foundation ? 0.6 : 1, cursor: r.foundation ? 'not-allowed' : 'pointer' }}
          >
            {r.enabled ? 'ON' : 'OFF'}
          </button>
        </li>
      ))}
    </ul>
  );
}
