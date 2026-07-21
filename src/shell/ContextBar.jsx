// ───────────────────────────────────────────────────────────────────────────
// The app-wide context bar: rendered once in the shell, ABOVE <main>, so EVERY
// screen gets Back / Forward / breadcrumb / Recents / minimized-items without
// per-screen wiring. Also owns the global navigation hotkeys (Esc, Alt+←/→,
// Ctrl/Cmd+K, Ctrl/Cmd+1…9 to restore a minimized item).
// ───────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from 'react';
import { Bell, Printer } from 'lucide-react';
import { useNav } from '../core/ux/nav';
import { useHotkey } from '../core/ux/hotkeys';
import { usePrefs } from '../core/prefs';
import { useDock } from '../core/ux/dock';
import { crumbsFor, labelFor } from '../core/routeMeta';
import { closeTopModal, modalCount } from '../core/ux/modalStore';
import { openLedgerModal } from '../core/LedgerModalHost';
import { Kbd } from '../core/ux/widgets.jsx';
import { clickable } from '../core/ux/clickable';
import { listKeyNav } from '../core/ux/listKeys';
import { ReportIssueButton } from '../modules/support/components/ReportIssueButton';
import { InboxBadgeLive } from '../modules/tk-group/InboxBadgeLive';
import { ScreenBadge } from './ScreenBadge';
import { useFyStore, FY_OPTIONS } from '../store/fy';
import { Menu as DropdownMenu } from '../core/ux/Menu';

const DARK = '#0d1326', DIM = '#5a6691', BLUE = '#185FA5', LINE = '#e1e3ec';

// Compact FY picker for the ContextBar row — sized to match the Print/Bell
// icon buttons here, unlike the taller app-bar version in AppShell.
function FyMiniSelector() {
  const fy = useFyStore((s) => s.fy);
  const setFy = useFyStore((s) => s.setFy);
  const current = FY_OPTIONS.find((o) => o.startYear === fy.startYear);
  return (
    <DropdownMenu
      ariaLabel="Financial year"
      menuRole="listbox"
      width={130}
      items={FY_OPTIONS.map((o) => ({ key: o.startYear, label: o.label, selected: fy.startYear === o.startYear, onSelect: () => setFy(o.startYear) }))}
      renderTrigger={({ ref, toggle, triggerProps }) => (
        <button
          ref={ref} {...triggerProps} onClick={toggle} type="button" title="Financial year"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 26, padding: '0 7px', background: '#fff', border: `1px solid ${LINE}`, borderRadius: 6, cursor: 'pointer' }}
        >
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.04em', color: DIM }}>FY</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: DARK }}>{current?.label || fy.startYear}</span>
          <span style={{ fontSize: 9, color: DIM }}>▾</span>
        </button>
      )}
    />
  );
}

export function ContextBar({ branch, route, unread, showNotif, onToggleNotif, onPrint, currentUser }) {
  const nav = useNav();
  const { prefs, setPref } = usePrefs();
  const dock = useDock();
  const [recOpen, setRecOpen] = useState(false);
  const recRef = useRef(null);
  const crumbs = crumbsFor(nav.route);
  const branchCode = typeof branch === 'string' ? branch : (branch && branch.code) || '';

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
  const parked = Array.isArray(dock.items) ? dock.items : [];

  // Esc closes the topmost modal; else, when editing a field, just blur it
  // (never lose work by navigating away); otherwise go back. Alt+←/→ history.
  useHotkey('esc', () => {
    if (closeTopModal()) return;
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) { el.blur(); return; }
    nav.goBack();
  }, [nav.route, nav.canBack]);
  useHotkey('alt+left', () => { if (closeTopModal()) return; nav.goBack(); }, [nav.canBack]);
  useHotkey('alt+right', () => nav.goForward(), [nav.canForward]);
  useHotkey('mod+k', () => nav.navigate('/search'), []);

  // A parked chip can be restored only when its branch matches the live branch —
  // otherwise the modal (which reads the live branch) would show the wrong books.
  const canRestore = (it) => !it.branch || it.branch === branchCode;
  const restore = (it) => {
    if (!it || !canRestore(it)) return;
    if (it.kind === 'ledger') openLedgerModal(it.payload.name, { from: it.payload.from, to: it.payload.to });
    else if (it.kind === 'route') nav.navigate(it.payload.route);
    dock.unpark(it.id);
  };

  // Ctrl/Cmd+1…9 — jump to the Nth minimized item (if its branch matches).
  const restoreN = (n) => { const it = parked[n - 1]; if (it && canRestore(it)) restore(it); };
  useHotkey('mod+1', () => restoreN(1), [parked, branchCode]);
  useHotkey('mod+2', () => restoreN(2), [parked, branchCode]);
  useHotkey('mod+3', () => restoreN(3), [parked, branchCode]);
  useHotkey('mod+4', () => restoreN(4), [parked, branchCode]);
  useHotkey('mod+5', () => restoreN(5), [parked, branchCode]);
  useHotkey('mod+6', () => restoreN(6), [parked, branchCode]);
  useHotkey('mod+7', () => restoreN(7), [parked, branchCode]);
  useHotkey('mod+8', () => restoreN(8), [parked, branchCode]);
  useHotkey('mod+9', () => restoreN(9), [parked, branchCode]);

  // Recents dropdown: close on outside-click (replaces the finicky mouse-leave).
  useEffect(() => {
    if (!recOpen) return undefined;
    const onDoc = (e) => { if (recRef.current && !recRef.current.contains(e.target)) setRecOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [recOpen]);

  const navBtn = (enabled) => ({ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 28, height: 26, padding: '0 7px', fontSize: 13, fontWeight: 700, color: enabled ? DARK : '#b9bed4', background: '#fff', border: `1px solid ${LINE}`, borderRadius: 6, cursor: enabled ? 'pointer' : 'not-allowed' });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#fff', borderBottom: `1px solid ${LINE}`, minHeight: 38, flexWrap: 'nowrap', overflow: 'hidden' }}>
      <button type="button" title="Back (Esc / Alt+←)" onClick={() => { if (closeTopModal()) return; nav.goBack(); }} disabled={!nav.canBack && modalCount() === 0} style={navBtn(nav.canBack)}>‹</button>
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

      {/* padding: '4px 0' gives the corner count badges (Bell / Inbox — both sit at
          top:-4px off a 26px-tall trigger) headroom against this row's own
          overflow:hidden, which otherwise clips them flush with its top edge. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, maxWidth: '52%', overflow: 'hidden', padding: '4px 0' }}>
        {/* Minimized / parked items — restore by click or Ctrl/Cmd+1…9 */}
        {parked.map((it, i) => {
          const ok = canRestore(it);
          return (
            <span key={it.id} style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 6, border: `1px solid ${ok ? '#cfe0f5' : LINE}`, background: ok ? '#f3f8ff' : '#f6f7fb', overflow: 'hidden', maxWidth: 190, opacity: ok ? 1 : 0.55 }}>
              <button type="button" disabled={!ok} onClick={() => restore(it)}
                title={ok ? `Restore ${it.label}${i < 9 ? ` (Ctrl+${i + 1})` : ''}` : `${it.label} — switch to branch ${it.branch} to restore`}
                aria-label={`Restore ${it.label}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 6px 4px 8px', fontSize: 11, fontWeight: 600, color: ok ? DARK : DIM, background: 'none', border: 'none', cursor: ok ? 'pointer' : 'not-allowed', minWidth: 0 }}>
                <span>{it.kind === 'ledger' ? '📒' : '🗂'}</span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.label}</span>
                {it.branch && <span style={{ color: BLUE, fontWeight: 700, fontSize: 9.5, flexShrink: 0 }}>· {it.branch}</span>}
              </button>
              <button type="button" onClick={() => dock.unpark(it.id)} title="Remove" aria-label={`Remove ${it.label}`}
                style={{ background: 'none', border: 'none', padding: '0 6px', cursor: 'pointer', color: '#9aa2bd', fontSize: 13, lineHeight: 1, flexShrink: 0 }}>✕</button>
            </span>
          );
        })}

        <FyMiniSelector />

        {onPrint && (
          <button type="button" title="Print / Save as PDF" onClick={onPrint} style={navBtn(true)}>
            <Printer size={14} />
          </button>
        )}

        {onToggleNotif && (
          <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
            <button type="button" onClick={onToggleNotif}
              aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
              aria-haspopup="dialog" aria-expanded={!!showNotif}
              style={navBtn(true)}>
              <Bell size={14} />
            </button>
            {unread > 0 && (
              <span style={{ position: 'absolute', top: -4, right: -4, display: 'flex', height: 15, minWidth: 15, alignItems: 'center', justifyContent: 'center', borderRadius: 999, border: '2px solid #fff', background: '#dc2626', padding: '0 3px', fontSize: 8.5, fontWeight: 800, color: '#fff' }}>
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </span>
        )}

        {/* TK Group pending-approvals badge — central roles only, hidden at 0 (dormant-safe) */}
        <InboxBadgeLive currentUser={currentUser} setRoute={nav.navigate} />

        {/* Stable screen number — click to copy report details or raise a ticket for THIS screen */}
        <ScreenBadge currentUser={currentUser} branch={branch} route={route} navigate={nav.navigate} />

        <ReportIssueButton route={route}/>

        {recents.length > 0 && (
          <div ref={recRef} style={{ position: 'relative' }} onKeyDown={listKeyNav({ onEscape: () => setRecOpen(false) })}>
            <button type="button" onClick={() => setRecOpen((o) => !o)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 9px', fontSize: 11, fontWeight: 600, color: DIM, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 6, cursor: 'pointer' }}>🕑 Recent ▾</button>
            {recOpen && (
              <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', zIndex: 9200, minWidth: 220, background: '#fff', border: `1px solid ${LINE}`, borderRadius: 8, boxShadow: '0 10px 30px rgba(13,19,38,.18)', overflow: 'hidden' }}>
                {recents.map((r) => (
                  <div key={r.route} {...clickable(() => { setRecOpen(false); nav.navigate(r.route); }, { role: 'option' })}
                    style={{ padding: '8px 12px', fontSize: 12, color: DARK, cursor: 'pointer', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#eef4ff')} onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}>{r.label}</div>
                ))}
              </div>
            )}
          </div>
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: DIM, flexShrink: 0 }} title="Quick-switch ledger">
          <Kbd>Ctrl L</Kbd><span style={{ color: '#b9bed4' }}>ledger</span>
        </span>
      </div>
    </div>
  );
}
