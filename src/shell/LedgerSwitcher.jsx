// ───────────────────────────────────────────────────────────────────────────
// Ctrl/Cmd+L — quick-switch ledger palette. Open from ANY screen, type to
// filter the live chart of accounts, Enter to open that ledger. The choice is
// persisted (prefs.lastLedger), and the ledger opens in the shared full-screen
// ledger modal (openLedgerModal) — the same Tally UI used everywhere.
// ───────────────────────────────────────────────────────────────────────────
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useChartOfAccounts } from '../core/useAccounting';
import { useHotkey } from '../core/ux/hotkeys';
import { usePrefs } from '../core/prefs';
import { pushModal } from '../core/ux/modalStore';
import { openLedgerModal } from '../core/LedgerModalHost';

const DARK = '#0d1326', DIM = '#5a6691', BLUE = '#185FA5';

export function LedgerSwitcher({ branch }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const inputRef = useRef(null);
  const chart = useChartOfAccounts(branch);
  const ledgers = chart.data || [];
  const { setPref } = usePrefs();

  useHotkey('mod+l', () => setOpen(true), []);
  useEffect(() => {
    if (!open) return undefined;
    const pop = pushModal(() => setOpen(false));      // Esc closes this first
    const id = setTimeout(() => inputRef.current && inputRef.current.focus(), 30);
    return () => { pop(); clearTimeout(id); };
  }, [open]);
  useEffect(() => { setHi(0); }, [q]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = ledgers.map((l) => ({ name: l.name, group: l.group || l.parent || '' }));
    return (s ? list.filter((l) => l.name.toLowerCase().includes(s)) : list).slice(0, 60);
  }, [ledgers, q]);

  const choose = (name) => {
    if (!name) return;
    setPref('lastLedger', name);
    // Open the maximised, uniform ledger view in place — no navigation needed.
    openLedgerModal(name, { branch });
    setOpen(false); setQ('');
  };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); choose(filtered[hi] && filtered[hi].name); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); setQ(''); }
  };

  if (!open) return null;
  return (
    <div onMouseDown={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.45)', zIndex: 9300, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, background: '#fff', borderRadius: 12, boxShadow: '0 24px 70px rgba(13,19,38,.4)', overflow: 'hidden' }}>
        <div style={{ padding: 12, borderBottom: '1px solid #dfe2e7', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14 }}>📒</span>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey}
            placeholder="Switch ledger — type to search…  (↑ ↓ · Enter)"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, color: DARK }} />
          <span style={{ fontSize: 10, color: DIM }}>Esc to close</span>
        </div>
        <div style={{ maxHeight: '52vh', overflow: 'auto' }}>
          {chart.isLoading && <div style={{ padding: 18, fontSize: 12.5, color: DIM }}>Loading ledgers…</div>}
          {!chart.isLoading && filtered.length === 0 && <div style={{ padding: 18, fontSize: 12.5, color: DIM }}>No ledgers match “{q}”.</div>}
          {filtered.map((l, i) => (
            <div key={l.name} onMouseEnter={() => setHi(i)} onMouseDown={(e) => { e.preventDefault(); choose(l.name); }}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', background: i === hi ? '#eef4ff' : '#fff' }}>
              <span style={{ fontSize: 12.5, color: DARK, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</span>
              {l.group && <span style={{ fontSize: 10.5, color: BLUE, flexShrink: 0 }}>{l.group}</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
