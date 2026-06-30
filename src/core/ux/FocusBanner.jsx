import React from 'react';
import { useNav } from './nav';
import { useNavFocusStore } from './navFocus';

// Default human label for a focus payload by kind.
function labelFor(p = {}) {
  switch (p.kind) {
    case 'voucher': return p.sample && p.sample.length ? `Fix flagged voucher(s): ${p.sample.slice(0, 3).join(', ')}${p.sample.length > 3 ? '…' : ''}` : 'Fix the flagged voucher(s)';
    case 'ledger': return p.name ? `Find & open ledger “${p.name}”` : 'Find the flagged ledger';
    case 'fy': return p.fy ? `Set the sales target for ${p.fy}` : 'Set the sales target';
    case 'fields': return p.fields && p.fields.length ? `Complete: ${p.fields.join(', ')}` : 'Complete the missing setup';
    case 'file': return p.ref ? `Revoke its ${p.label || 'parent file'} ${p.ref} here — the whole file un-posts together` : 'Open the parent file';
    default: return p.label || 'Resolve the flagged issue';
  }
}

/**
 * Shows a one-line banner on a screen that was opened from an Alert deep-link,
 * naming the exact entity to fix. Renders only when the current route matches the
 * stored focus. `render` lets a screen customise the label. Dismiss clears it.
 */
export function FocusBanner({ render }) {
  const { route } = useNav();
  const focus = useNavFocusStore((s) => s.focus);
  const clear = useNavFocusStore((s) => s.clear);
  if (!focus || focus.route !== route) return null;
  const label = render ? render(focus.params) : labelFor(focus.params);
  const prefix = focus.params && focus.params.kind === 'file' ? '' : 'From Alerts: ';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '8px 12px', margin: '0 0 10px', borderRadius: 8, background: '#E6F1FB', border: '1px solid #B9D6F2' }}>
      <span style={{ fontSize: 12, fontWeight: 700, color: '#185FA5' }}>⮕ {prefix}{label}</span>
      <button onClick={clear} title="Clear focus" style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#5a6691', fontSize: 16, lineHeight: 1 }}>✕</button>
    </div>
  );
}
