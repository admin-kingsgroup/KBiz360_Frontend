// ───────────────────────────────────────────────────────────────────────────
// The app-wide context bar: rendered once in the shell, ABOVE <main>, so EVERY
// screen gets Back / Forward / breadcrumb / Recents without per-screen wiring.
// Also owns the global navigation hotkeys (Esc, Alt+←/→, Ctrl/Cmd+K).
// ───────────────────────────────────────────────────────────────────────────
import React, { useEffect, useState } from 'react';
import { useNav } from '../core/ux/nav';
import { useHotkey } from '../core/ux/hotkeys';
import { usePrefs } from '../core/prefs';
import { crumbsFor, labelFor } from '../core/routeMeta';
import { closeTopModal } from '../core/ux/modalStore';
import { Kbd } from '../core/ux/widgets.jsx';

const DARK = '#0d1326', DIM = '#5a6691', BLUE = '#185FA5', LINE = '#e1e3ec';

export function ContextBar() {
  const nav = useNav();
  const { prefs, setPref } = usePrefs();
  const [recOpen, setRecOpen] = useState(false);
  const crumbs = crumbsFor(nav.route);

  // Record visited screens (most-recent-first, deduped) into per-user prefs.
  useEffect(() => {
    if (!nav.route || nav.route === '/dashboard') return;
    const prev = Array.isArray(prefs.recents) ? prefs.recents : [];
    if (prev[0] && prev[0].route === nav.route) return;
    const next = [{ route: nav.route, label: labelFor(nav.route) }, ...prev.filter((r) => r.route !== nav.route)].slice(0, 12);
    setPref('recents', next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nav.route]);

  const recents = (Array.isArray(prefs.recents) ? prefs.recents : []).filter((r) => r.route !== nav.route).slice(0, 8);

  // Esc closes the topmost modal; else, when editing a field, just blur it
  // (never lose work by navigating away); otherwise go back. Alt+←/→ history.
  useHotkey('esc', () => {
    if (closeTopModal()) return;
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) { el.blur(); return; }
    nav.goBack();
  }, [nav.route, nav.canBack]);
  useHotkey('alt+left', () => nav.goBack(), [nav.canBack]);
  useHotkey('alt+right', () => nav.goForward(), [nav.canForward]);
  useHotkey('mod+k', () => nav.navigate('/search'), []);

  const navBtn = (enabled) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 28, height: 26, padding: '0 7px', fontSize: 13, fontWeight: 700, color: enabled ? DARK : '#b9bed4', background: '#fff', border: `1px solid ${LINE}`, borderRadius: 6, cursor: enabled ? 'pointer' : 'not-allowed' });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#fff', borderBottom: `1px solid ${LINE}`, minHeight: 38, flexWrap: 'nowrap', overflow: 'hidden' }}>
      <button type="button" title="Back (Esc / Alt+←)" onClick={nav.goBack} disabled={!nav.canBack} style={navBtn(nav.canBack)}>‹</button>
      <button type="button" title="Forward (Alt+→)" onClick={nav.goForward} disabled={!nav.canForward} style={navBtn(nav.canForward)}>›</button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, overflow: 'hidden', flex: 1 }}>
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
            {i > 0 && <span style={{ color: '#c4c9da', fontSize: 11 }}>›</span>}
            {c.href && i < crumbs.length - 1
              ? <button type="button" onClick={() => nav.navigate(c.href)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: BLUE, fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{c.label}</button>
              : <span style={{ color: i === crumbs.length - 1 ? DARK : DIM, fontWeight: i === crumbs.length - 1 ? 700 : 500, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.label}</span>}
          </span>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {recents.length > 0 && (
          <div style={{ position: 'relative' }} onMouseLeave={() => setRecOpen(false)}>
            <button type="button" onClick={() => setRecOpen((o) => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', fontSize: 11, fontWeight: 600, color: DIM, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 6, cursor: 'pointer' }}>🕑 Recent ▾</button>
            {recOpen && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 9200, minWidth: 220, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 8, boxShadow: '0 10px 30px rgba(13,19,38,.18)', overflow: 'hidden' }}>
                {recents.map((r) => (
                  <div key={r.route} onClick={() => { setRecOpen(false); nav.navigate(r.route); }}
                    style={{ padding: '8px 12px', fontSize: 12, color: DARK, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#eef4ff')} onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}>{r.label}</div>
                ))}
              </div>
            )}
          </div>
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: DIM }} title="Quick-switch ledger">
          <Kbd>Ctrl L</Kbd><span style={{ color: '#b9bed4' }}>ledger</span>
        </span>
      </div>
    </div>
  );
}
