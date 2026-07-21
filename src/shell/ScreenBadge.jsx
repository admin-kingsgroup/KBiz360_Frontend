/* ════════════════════════════════════════════════════════════════════════════
   SHELL/SCREENBADGE.JSX
   The "SCREEN #142" pill in the top bar — present on every screen. It gives each
   screen a short, stable, spoken-aloud id so anyone can report a problem precisely
   ("Screen #142 is broken") and a developer can jump straight to the code.
   Click → a popover with the screen number, route and breadcrumb, plus:
     • Copy report — copies a one-line issue token to the clipboard
     • Report      — opens the Support ticket form pre-filled with this context
   Reads the current route from NavContext; needs no per-screen wiring.
   ════════════════════════════════════════════════════════════════════════════ */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Hash, Copy, Bug } from 'lucide-react';
import { useNav } from '../core/ux/nav';
import { toastSuccess } from '../core/ux/toast';
import { pushModal } from '../core/ux/modalStore';
import { screenTag, screenBreadcrumb, buildIssueToken, issueTitle } from '../core/screenNumber';
import { setSupportPrefill } from '../core/supportPrefill';

async function copyText(text) {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fall through to the legacy path */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

export function ScreenBadge({ currentUser, branch, route: routeProp, navigate: navProp }) {
  const nav = useNav();
  const route = routeProp || nav.route;
  const navigate = navProp || nav.navigate;
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);

  // Popover is portalled to <body> (see render below) so it isn't trapped inside the
  // header's own stacking context (header is `sticky z-40`) — nested there, its z-index
  // only wins against OTHER header children. Anything elsewhere in the app that's also
  // `position + z-index` (e.g. ReportActionBar's sticky toolbar, also z-40) sits in its
  // own stacking context and — tying on z-index — wins on DOM order instead, painting
  // over this popover. Matches the same fixed+portal pattern as UserMenu next to it.
  const place = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ top: r.bottom + 8, right: Math.max(8, window.innerWidth - r.right) });
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const reflow = () => place();
    window.addEventListener('resize', reflow);
    window.addEventListener('scroll', reflow, true);
    return () => {
      window.removeEventListener('resize', reflow);
      window.removeEventListener('scroll', reflow, true);
    };
  }, [open, place]);

  const tag = screenTag(route);
  const context = { route, branch, role: currentUser?.role, name: currentUser?.name || currentUser?.email };

  const doCopy = async () => {
    const ok = await copyText(buildIssueToken(context));
    if (ok) toastSuccess(`Screen ${tag} details copied — paste it into your report.`);
    setOpen(false);
  };

  const doReport = () => {
    // Carry the reported screen's route so the ticket's pageUrl/module point at THIS
    // screen, not the Support page the modal opens on.
    setSupportPrefill({ title: issueTitle(route), description: buildIssueToken(context), route });
    setOpen(false);
    navigate('/support/tickets');
  };

  // Register in the shared modal stack while open, so the app's global Esc handler
  // closes THIS popover via closeTopModal() (which then returns true and STOPS) —
  // instead of a raw window listener that let Esc also fall through to the ContextBar's
  // Esc→goBack, navigating the user off the screen. Matches <Modal> / the mobile drawer.
  useEffect(() => {
    if (!open) return undefined;
    return pushModal(() => setOpen(false));
  }, [open]);

  const iconBtn = {
    display: 'flex', alignItems: 'center', gap: 6, width: '100%',
    background: 'transparent', border: '1px solid #d6dae2', borderRadius: 6,
    padding: '7px 9px', color: '#3a4468', fontSize: 12.5, fontWeight: 600,
    cursor: 'pointer', textAlign: 'left',
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        ref={triggerRef}
        onClick={() => setOpen((o) => { if (!o) place(); return !o; })}
        title={`This screen is ${tag} — click to copy details or report an issue`}
        aria-haspopup="dialog"
        aria-expanded={open}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: open ? 'rgba(0,112,242,0.08)' : '#f3f5f9',
          border: '1px solid #d6dae2', borderRadius: 6, padding: '4px 8px',
          color: '#3a4468', fontSize: 12, fontWeight: 800, cursor: 'pointer',
          fontFamily: 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
          fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', lineHeight: 1,
        }}
      >
        <Hash size={12} strokeWidth={2.5} />
        {tag.replace('#', '')}
      </button>

      {open && pos && createPortal(
        <>
          <div aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: 598 }} onClick={() => setOpen(false)} />
          <div
            role="dialog"
            aria-label={`Screen ${tag}`}
            style={{
              position: 'fixed', top: pos.top, right: pos.right, zIndex: 599,
              width: 280, background: '#fff', border: '1px solid #cdd1d8', borderRadius: 10,
              boxShadow: '0 8px 28px rgba(13,19,38,0.16)', padding: 14,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#0d1326', letterSpacing: '-0.01em' }}>Screen {tag}</span>
            </div>
            <div style={{ fontSize: 12, color: '#5a6691', lineHeight: 1.5, wordBreak: 'break-word' }}>
              <div style={{ fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', color: '#3a4468' }}>{route}</div>
              <div style={{ marginTop: 3 }}>{screenBreadcrumb(route)}</div>
            </div>
            <p style={{ margin: 0, fontSize: 11.5, color: '#727fa4', lineHeight: 1.5 }}>
              Reporting a problem here? Copy the details or raise a ticket — the screen number, page and your branch are attached automatically.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <button type="button" onClick={doCopy} style={iconBtn}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f5f9'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}>
                <Copy size={14} /> Copy report details
              </button>
              <button type="button" onClick={doReport}
                style={{ ...iconBtn, background: '#0d1326', border: '1px solid #0d1326', color: '#fff', fontWeight: 700, justifyContent: 'center' }}>
                <Bug size={14} /> Report an issue on this screen
              </button>
            </div>
          </div>
        </>,
        document.body,
      )}
    </div>
  );
}

export default ScreenBadge;
