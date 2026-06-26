// Shared UI atoms used by the keyboard/UX system.
//   <Kbd>⌃↵</Kbd>                       — shortcut hint chip
//   <Combobox items value onChange/>     — type-to-search select (↑↓/Enter/Esc)
//   <FormFooter onSave onCancel .../>     — sticky Save/Cancel/Back bar
//   <ScreenHeader title crumbs right/>    — title + breadcrumb + actions
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNav } from './nav';

const DARK = '#0d1326', DIM = '#5a6691', LINE = '#d6dbe6', BLUE = '#185FA5';

/* ── Kbd: a tiny keyboard-hint chip ──────────────────────────────────────── */
export function Kbd({ children }) {
  return (
    <kbd style={{ display: 'inline-flex', alignItems: 'center', fontFamily: 'inherit', fontSize: 9.5, fontWeight: 700,
      color: DIM, background: '#f1f3f8', border: `1px solid ${LINE}`, borderBottomWidth: 2, borderRadius: 4, padding: '1px 5px', lineHeight: 1.5, whiteSpace: 'nowrap' }}>{children}</kbd>
  );
}

/* ── Combobox: dependency-free searchable select ─────────────────────────── */
const normItems = (items) => (items || []).map((it) => (typeof it === 'string' ? { value: it, label: it } : it));

export function Combobox({ items, value, onChange, placeholder = 'Search…', width = 220, autoFocus, style, disabled }) {
  const all = useMemo(() => normItems(items), [items]);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hi, setHi] = useState(0);
  const boxRef = useRef(null);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return all.slice(0, 200);
    return all.filter((it) => it.label.toLowerCase().includes(s)).slice(0, 200);
  }, [all, q]);

  useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);
  useEffect(() => { if (open && inputRef.current) inputRef.current.focus(); }, [open]);
  useEffect(() => { setHi(0); }, [q, open]);

  const pick = (it) => { if (!it) return; onChange && onChange(it.value, it); setOpen(false); setQ(''); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, filtered.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); pick(filtered[hi]); }
    else if (e.key === 'Escape') { e.preventDefault(); setOpen(false); setQ(''); }
  };

  const current = all.find((it) => it.value === value);
  const btn = { width, minHeight: 32, fontSize: 11.5, padding: '6px 10px', border: `1px solid ${LINE}`, borderRadius: 6, background: disabled ? '#f3f4f8' : '#fff', color: current ? DARK : DIM, cursor: disabled ? 'not-allowed' : 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, ...style };

  return (
    <div ref={boxRef} style={{ position: 'relative', display: 'inline-block' }}>
      <button type="button" disabled={disabled} onClick={() => setOpen((o) => !o)} style={btn} title={current ? current.label : placeholder}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{current ? current.label : placeholder}</span>
        <span style={{ color: DIM, fontSize: 9 }}>▾</span>
      </button>
      {open && !disabled && (
        <div style={{ position: 'absolute', zIndex: 9200, top: 'calc(100% + 4px)', left: 0, width: Math.max(width, 240), background: '#fff', border: `1px solid ${LINE}`, borderRadius: 8, boxShadow: '0 10px 30px rgba(13,19,38,.18)', overflow: 'hidden' }}>
          <div style={{ padding: 7, borderBottom: '1px solid #dfe2e7' }}>
            <input ref={inputRef} autoFocus={autoFocus} value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder={placeholder}
              style={{ width: '100%', boxSizing: 'border-box', padding: '6px 9px', fontSize: 12, border: `1px solid ${LINE}`, borderRadius: 5, outline: 'none' }} />
          </div>
          <div style={{ maxHeight: 280, overflow: 'auto' }}>
            {filtered.length === 0 && <div style={{ padding: '10px 12px', fontSize: 11.5, color: DIM }}>No matches</div>}
            {filtered.map((it, i) => (
              <div key={it.value} onMouseEnter={() => setHi(i)} onMouseDown={(e) => { e.preventDefault(); pick(it); }}
                style={{ padding: '7px 12px', fontSize: 12, cursor: 'pointer', color: DARK, background: i === hi ? '#eef4ff' : it.value === value ? '#f6f8fc' : '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: it.value === value ? 700 : 400 }}>{it.label}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── FormFooter: sticky Save / Cancel / Back action bar ──────────────────── */
export function FormFooter({ onSave, onCancel, onBack, saving, saved, dirty = true, saveLabel = 'Save', disabled }) {
  const blocked = saving || disabled || !dirty;
  return (
    <div style={{ position: 'sticky', bottom: 0, zIndex: 20, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#fff', borderTop: `1px solid ${LINE}`, boxShadow: '0 -4px 16px rgba(13,19,38,.06)' }}>
      {onBack && <button type="button" onClick={onBack} style={ghost}>‹ Back <Kbd>Esc</Kbd></button>}
      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
        {saved && !dirty && <span style={{ fontSize: 11.5, color: '#1a7a1a', fontWeight: 700 }}>✓ Saved</span>}
        {onCancel && <button type="button" onClick={onCancel} style={ghost}>Cancel</button>}
        <button type="button" onClick={onSave} disabled={blocked} style={{ ...primary, opacity: blocked ? 0.55 : 1, cursor: blocked ? 'not-allowed' : 'pointer' }}>
          {saving ? 'Saving…' : <>{saveLabel} <Kbd>⌃↵</Kbd></>}
        </button>
      </div>
    </div>
  );
}
const ghost = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 12, fontWeight: 600, color: DIM, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 6, cursor: 'pointer' };
const primary = { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 18px', fontSize: 12.5, fontWeight: 700, color: '#fff', background: BLUE, border: 'none', borderRadius: 6 };

/* ── ScreenHeader: title + breadcrumb + actions (optional per-screen use) ── */
export function ScreenHeader({ title, sub, crumbs, right, showBack = true }) {
  const nav = useNav();
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        {showBack && (
          <button type="button" onClick={nav.goBack} disabled={!nav.canBack} title="Back (Esc)"
            style={{ ...ghost, padding: '4px 10px', opacity: nav.canBack ? 1 : 0.45, cursor: nav.canBack ? 'pointer' : 'not-allowed' }}>‹ Back</button>
        )}
        {(crumbs || []).map((c, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5 }}>
            {i > 0 && <span style={{ color: '#b9bed4' }}>›</span>}
            {c.href ? <button type="button" onClick={() => nav.navigate(c.href)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: BLUE, fontWeight: 600, fontSize: 11.5 }}>{c.label}</button>
              : <span style={{ color: DIM }}>{c.label}</span>}
          </span>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: DARK }}>{title}</h2>
          {sub && <p style={{ margin: '2px 0 0', fontSize: 10.5, color: DIM }}>{sub}</p>}
        </div>
        {right && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{right}</div>}
      </div>
    </div>
  );
}
