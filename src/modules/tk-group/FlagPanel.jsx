import React from 'react';
import { Badge, Button, EmptyState } from '../../shell/primitives';

// ─── TK GROUP · FE · control flags panel (presentational) ────────────────────
// Lists each control flag with its ON/OFF state. Foundation flags are always on
// and can't be switched. Toggling calls onToggle(key, next) — the container turns
// that into a change-request (Owner-only), it does not flip anything directly.

export function FlagPanel({ rows = [], onToggle }) {
  if (!rows.length) return <EmptyState title="No controls configured yet." />;
  return (
    <ul className="m-0 list-none p-0">
      {rows.map((r) => (
        <li key={r.key} className="flex items-center gap-2.5 border-b border-surface-border px-3 py-2 text-xs">
          <span className="flex-1 font-mono text-[11.5px] text-ink">{r.key}</span>
          {r.foundation ? <span className="text-[10px] text-warning">foundation</span> : null}
          {r.foundation ? (
            <Badge tone={r.enabled ? 'success' : 'neutral'} size="sm">{r.enabled ? 'ON' : 'OFF'}</Badge>
          ) : (
            <Button
              variant={r.enabled ? 'success' : 'secondary'}
              size="xs"
              role="switch"
              aria-checked={r.enabled}
              aria-label={r.key}
              onClick={() => onToggle && onToggle(r.key, !r.enabled)}
            >
              {r.enabled ? 'ON' : 'OFF'}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
