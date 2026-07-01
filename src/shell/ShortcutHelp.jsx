// "?" — keyboard shortcut cheat-sheet overlay. One source of truth for the
// global keymap; toggled with Shift+/ (i.e. "?") from anywhere.
import React, { useEffect, useState } from 'react';
import { useHotkey } from '../core/ux/hotkeys';
import { pushModal } from '../core/ux/modalStore';

const DARK = '#0d1326', DIM = '#5a6691';

export const SHORTCUTS = [
  ['Esc', 'Close dialog · go back'],
  ['Alt + ←  /  Alt + →', 'Back / forward through history'],
  ['Ctrl / ⌘ + L', 'Quick-switch ledger'],
  ['Ctrl / ⌘ + K', 'Global search'],
  ['Ctrl / ⌘ + 1…9', 'Restore a minimized item from the bar'],
  ['Enter', 'In a form: next field (last field saves)'],
  ['Ctrl / ⌘ + Enter', 'Save the current form'],
  ['?', 'Show this shortcut help'],
];

export function ShortcutHelp() {
  const [open, setOpen] = useState(false);
  useHotkey('?', () => setOpen((o) => !o), []);
  useEffect(() => {
    if (!open) return undefined;
    return pushModal(() => setOpen(false));
  }, [open]);

  if (!open) return null;
  return (
    <div onMouseDown={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.5)', zIndex: 9300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, background: '#fff', borderRadius: 12, boxShadow: '0 24px 70px rgba(13,19,38,.4)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: DARK }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 800 }}>⌨ Keyboard shortcuts</span>
          <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#cfd6ea', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: '6px 0' }}>
          {SHORTCUTS.map(([k, d]) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '9px 16px', borderBottom: '1px solid #dfe2e7' }}>
              <span style={{ fontSize: 12.5, color: DIM }}>{d}</span>
              <kbd style={{ fontFamily: 'inherit', fontSize: 11, fontWeight: 700, color: DARK, background: '#f1f3f8', border: '1px solid #cdd1d8', borderBottomWidth: 2, borderRadius: 5, padding: '2px 8px', whiteSpace: 'nowrap' }}>{k}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
