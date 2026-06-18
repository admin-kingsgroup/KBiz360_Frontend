/* ════════════════════════════════════════════════════════════════════
   SHELL/MODULESEARCH.JSX

   Header "jump to" search box. Type any module or sub-module name and the
   matching pages appear in a dropdown — click (or ↑/↓ + Enter) to navigate
   straight there. Solves the "too many modules buried in the header" problem
   by giving a single search entry point to every page.

   The index is built from getMenu(branch, currentUser), so it is already
   permission-filtered: users only ever see/jump to pages they can access.

   Desktop → inline input in the top bar.
   Mobile  → a search icon that opens a full-width overlay panel.
   ════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Search, CornerDownLeft, ArrowRight, X } from 'lucide-react';
import { getMenu } from '../core/menus';
import { useMobile } from '../core/hooks';

const BLUE = '#0070f2', TEXT = '#475569', DIM = '#94a3b8', DARK = '#0d1326';

/* Walk the menu tree → flat list of every navigable leaf with its breadcrumb. */
function flattenMenu(nodes, trail = []) {
  const out = [];
  for (const node of nodes || []) {
    if (!node || node.divider) continue;
    const label = String(node.label || '').replace(/^[^\w(]+/, '').trim(); // strip leading emoji/icons
    if (node.href) out.push({ label: label || node.label, href: node.href, trail });
    if (node.children) out.push(...flattenMenu(node.children, [...trail, node.label]));
  }
  return out;
}

/* Score a menu item against the query. Higher = better; -1 = no match.
   Ranking: exact > label starts-with > word-boundary > label-contains > trail-only. */
function scoreItem(item, q) {
  const label = item.label.toLowerCase();
  const trail = item.trail.join(' ').toLowerCase();
  const hay = label + ' ' + trail;
  const tokens = q.split(/\s+/).filter(Boolean);
  if (!tokens.every((t) => hay.includes(t))) return -1; // every word must appear somewhere

  let score = 0;
  if (label === q) score += 100;
  else if (label.startsWith(q)) score += 70;
  else if (new RegExp('\\b' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(label)) score += 50;
  else if (label.includes(q)) score += 35;
  else score += 12; // matched only via the breadcrumb trail
  score -= Math.min(label.length, 40) * 0.1; // gentle preference for shorter, more specific labels
  return score;
}

/* Highlight the matched run of `q` inside `text`. */
function Highlight({ text, q }) {
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark style={{ background: 'rgba(0,112,242,0.16)', color: BLUE, fontWeight: 700, padding: 0, borderRadius: 2 }}>
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

export function ModuleSearch({ branch, currentUser, setRoute }) {
  const mob = useMobile();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);     // dropdown / overlay visibility
  const [active, setActive] = useState(0);     // highlighted result index
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  // The dropdown is portaled to <body> (to escape the app-bar's stacking context),
  // so it's positioned with a fixed rect measured from the search box.
  const [pos, setPos] = useState(null);
  const place = () => { const el = wrapRef.current; if (!el) return; const r = el.getBoundingClientRect(); setPos({ top: r.bottom + 6, left: r.left, width: r.width }); };

  /* Build (and cache) the searchable page index from the permission-filtered menu. */
  const index = useMemo(
    () => flattenMenu(getMenu(branch, currentUser)),
    [branch, currentUser?.role, currentUser?.id]
  );

  /* Top matches for the current query. */
  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return index
      .map((item) => ({ item, score: scoreItem(item, query) }))
      .filter((r) => r.score >= 0)
      .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
      .slice(0, 12)
      .map((r) => r.item);
  }, [q, index]);

  useEffect(() => setActive(0), [q]);

  /* Close on outside click (the dropdown lives in a body portal, so exclude it too). */
  useEffect(() => {
    const onDoc = (e) => {
      if (wrapRef.current && wrapRef.current.contains(e.target)) return;
      if (e.target.closest && e.target.closest('[data-modsearch]')) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  /* Keep the portaled dropdown aligned under the search box while it's open. */
  useEffect(() => {
    if (!open) return;
    place();
    const onReflow = () => place();
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    return () => { window.removeEventListener('resize', onReflow); window.removeEventListener('scroll', onReflow, true); };
  }, [open, q]);

  /* Cmd/Ctrl+K (or "/") focuses the search from anywhere. */
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      const inField = /^(input|textarea|select)$/i.test(e.target.tagName) || e.target.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && k === 'k') { e.preventDefault(); openSearch(); }
      else if (k === '/' && !inField) { e.preventDefault(); openSearch(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openSearch = () => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0); };

  const go = (item) => {
    if (!item) return;
    setRoute(item.href);
    setQ('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); go(results[active]); }
    else if (e.key === 'Escape') { setQ(''); setOpen(false); inputRef.current?.blur(); }
  };

  /* ── Shared results list ──────────────────────────────────────── */
  const ResultsList = (
    <div className="kb-modsearch-scroll" style={{ maxHeight: mob ? '60vh' : 380, overflowY: 'auto', padding: 6 }}>
      {results.map((r, i) => {
        const sel = i === active;
        return (
          <div key={r.href + i}
            onMouseEnter={() => setActive(i)}
            onMouseDown={(e) => { e.preventDefault(); go(r); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 7,
              cursor: 'pointer', background: sel ? 'rgba(0,112,242,0.08)' : 'transparent',
            }}>
            <Search size={14} style={{ flexShrink: 0, color: sel ? BLUE : DIM }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: DARK, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                <Highlight text={r.label} q={q.trim()} />
              </div>
              {r.trail.length > 0 && (
                <div style={{ fontSize: 10.5, color: DIM, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                  {r.trail.join(' › ')}
                </div>
              )}
            </div>
            {sel
              ? <CornerDownLeft size={13} style={{ flexShrink: 0, color: BLUE }} />
              : <ArrowRight size={13} style={{ flexShrink: 0, color: '#cbd5e1' }} />}
          </div>
        );
      })}
      {q.trim() && results.length === 0 && (
        <div style={{ padding: '22px 12px', textAlign: 'center', color: DIM, fontSize: 12.5 }}>
          No module or page matches “{q.trim()}”.
        </div>
      )}
      {/* Footer: fall through to the full voucher / records search. */}
      <div onMouseDown={(e) => { e.preventDefault(); setRoute('/search'); setQ(''); setOpen(false); }}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', marginTop: 4,
          borderTop: '1px solid #eef1f6', cursor: 'pointer', color: TEXT, fontSize: 11.5, fontWeight: 600,
        }}>
        <Search size={13} style={{ color: DIM }} />
        Search vouchers, clients &amp; records in Global Search
        <ArrowRight size={12} style={{ marginLeft: 'auto', color: '#cbd5e1' }} />
      </div>
    </div>
  );

  const scrollStyles = (
    <style>{`
      .kb-modsearch-scroll::-webkit-scrollbar{width:6px}
      .kb-modsearch-scroll::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
      .kb-modsearch-scroll::-webkit-scrollbar-track{background:transparent}
    `}</style>
  );

  /* ── Mobile: icon button → full-width overlay ─────────────────── */
  if (mob) {
    return (
      <div ref={wrapRef} style={{ display: 'flex', alignItems: 'center' }}>
        {scrollStyles}
        <button onClick={openSearch} title="Search modules (⌘K)"
          style={{ background: 'transparent', border: 'none', color: '#5a6691', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', borderRadius: 4 }}>
          <Search size={18} />
        </button>
        {open && createPortal(
          <>
            <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.35)', zIndex: 99998 }} />
            <div data-modsearch style={{
              position: 'fixed', top: 8, left: 8, right: 8, zIndex: 99999, background: '#fff', borderRadius: 12,
              boxShadow: '0 24px 48px rgba(0,0,0,0.18)', overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', borderBottom: '1px solid #eef1f6' }}>
                <Search size={16} style={{ color: DIM }} />
                <input ref={inputRef} autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKeyDown}
                  placeholder="Search any module or page…" aria-label="Search modules and pages"
                  style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, color: DARK, background: 'transparent' }} />
                <button type="button" onClick={() => setOpen(false)} aria-label="Close search" title="Close (Esc)" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: DIM, display: 'flex' }}>
                  <X size={18} />
                </button>
              </div>
              {ResultsList}
            </div>
          </>,
          document.body
        )}
      </div>
    );
  }

  /* ── Desktop: inline search box with dropdown ─────────────────── */
  return (
    <div ref={wrapRef} style={{ position: 'relative', flex: 1, maxWidth: 420, margin: '0 16px' }}>
      {scrollStyles}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, height: 34, padding: '0 12px',
        background: open ? '#fff' : '#f3f4f8', border: `1px solid ${open ? BLUE : '#e2e8f0'}`,
        borderRadius: 8, transition: 'all 0.15s ease', boxShadow: open ? '0 0 0 3px rgba(0,112,242,0.12)' : 'none',
      }}>
        <Search size={15} style={{ flexShrink: 0, color: open ? BLUE : DIM }} />
        <input ref={inputRef} value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search modules & pages…"
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: DARK, minWidth: 0 }} />
        {q
          ? <X size={14} style={{ flexShrink: 0, color: DIM, cursor: 'pointer' }} onMouseDown={(e) => { e.preventDefault(); setQ(''); inputRef.current?.focus(); }} />
          : <kbd style={{ flexShrink: 0, fontSize: 9.5, fontWeight: 700, color: DIM, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 4, padding: '1px 5px' }}>⌘K</kbd>}
      </div>

      {open && q.trim() && pos && createPortal(
        <div data-modsearch style={{
          position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 99999,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
          boxShadow: '0 20px 40px rgba(0,0,0,0.12)', overflow: 'hidden',
        }}>
          {ResultsList}
        </div>,
        document.body
      )}
    </div>
  );
}
