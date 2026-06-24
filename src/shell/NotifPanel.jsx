/* ════════════════════════════════════════════════════════════════════
   SHELL/NOTIFPANEL.JSX
   The header 🔔 bell dropdown + the full Notification Centre page.
   Both are now driven by the LIVE alert engine (/api/alerts) — the same
   feed as the Alerts Dashboard — so the bell, the centre and the dashboard
   can never disagree. (They previously read an empty demo store and showed
   "No notifications" no matter what was actually wrong in the books.)
   ════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useRef, useState } from 'react';
import { ChevronRight, Check } from 'lucide-react';
import { useAlerts, useSetAlertStatus, branchCode } from '../core/useAccounting';
import { setNavFocus } from '../core/ux/navFocus';
import { card } from '../core/styleTokens';
import { useFocusTrap } from '../core/ux/focus';
import { pushModal } from '../core/ux/modalStore';
import { toastSuccess, toastError } from '../core/ux/toast';

// Severity → presentation. Matches the Alerts Dashboard / panel palette.
const SEV = {
  error: { clr: '#dc2626', bg: '#fbe9e9', bd: '#f3c0c0', icon: '🔴', label: 'Critical' },
  warn:  { clr: '#b45309', bg: '#fbeedb', bd: '#f0c36d', icon: '⚠',  label: 'Warning' },
  info:  { clr: '#2563eb', bg: '#e8f0ff', bd: '#cfe0f5', icon: 'ℹ',  label: 'To review' },
};
const sevOf = (s) => SEV[s] || SEV.info;

// Pending alerts only (the ones that still need action), already sorted error→info
// by the backend. Snoozed/finished alerts live on the dashboard, not in the bell.
const pendingOf = (data) => (data?.alerts || []).filter((a) => (a.status || 'pending') === 'pending');

// Open an alert's fix screen, carrying the entity to focus (deep-link).
function openAlert(a, setRoute, after) {
  const route = typeof a.link === 'string' ? a.link : a.link?.route;
  if (!route) return;
  setNavFocus(route, a.focus || { kind: a.type, sample: a.sample });
  setRoute?.(route);
  after?.();
}

// ─── Header bell dropdown ─────────────────────────────────────────────────────
export function NotifPanel({ onClose, setRoute, branch }) {
  const panelRef = useRef(null);
  const q = useAlerts(branch);
  const setStatus = useSetAlertStatus();
  const pending = pendingOf(q.data);
  const c = q.data?.counts || { error: 0, warn: 0, info: 0 };

  // Esc closes (via the modal stack); focus moves into the panel and returns to
  // the Bell trigger on close. top:52 clears the 64px app-bar.
  React.useEffect(() => pushModal(onClose), [onClose]);
  useFocusTrap(panelRef);

  const finish = (a) => setStatus.mutate(
    { alertKey: a.key, branch: branchCode(branch) || 'ALL', status: 'finished', signature: a.signature, magnitude: a.magnitude },
    { onSuccess: () => toastSuccess('Marked finished'), onError: (e) => toastError(e?.message || 'Could not update alert') },
  );

  return (
    <div ref={panelRef} role="dialog" aria-label="Alerts" className="animate-kb-rise"
      style={{ position: 'fixed', top: 52, right: 8, width: 360, maxHeight: 'calc(100vh - 70px)', overflowY: 'auto',
        background: '#fff', borderRadius: 14, boxShadow: '0 16px 40px -12px rgba(16,18,22,0.20), 0 2px 8px -4px rgba(16,18,22,0.10)',
        zIndex: 600, border: '1px solid #e6e8ec' }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #e6e8ec', position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#14161a' }}>Alerts</p>
          <p style={{ margin: '1px 0 0', fontSize: 10, color: '#5a6691' }}>
            {q.isFetching ? 'refreshing…' : pending.length ? `${pending.length} open` : 'all clear'}
            {c.error ? ` · ${c.error} critical` : ''}
          </p>
        </div>
        <button onClick={onClose} aria-label="Close alerts" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: '#5a6691' }}>✕</button>
      </div>

      {q.isLoading && <p style={{ padding: 20, textAlign: 'center', color: '#bfc3d6', fontSize: 11 }}>Checking for issues…</p>}
      {q.isError && <p style={{ padding: 20, textAlign: 'center', color: '#dc2626', fontSize: 11 }}>Could not load alerts.</p>}
      {!q.isLoading && !q.isError && pending.length === 0 && (
        <p style={{ padding: '22px', textAlign: 'center', color: '#27500A', fontSize: 12, fontWeight: 600 }}>✓ All clear — no open alerts.</p>
      )}

      {pending.map((a) => {
        const s = sevOf(a.severity);
        return (
          <div key={a.key} style={{ padding: '10px 14px', borderBottom: '1px solid #f1f2f4', borderLeft: `3px solid ${s.clr}`, display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <div aria-hidden="true" style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{s.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <button type="button" onClick={() => a.link && openAlert(a, setRoute, onClose)} title={a.link ? 'Open & fix' : undefined}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: a.link ? 'pointer' : 'default' }}>
                <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: '#0d1326' }}>{a.title}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#5a6691', lineHeight: 1.4 }}>{a.detail}</p>
              </button>
              <div style={{ display: 'flex', gap: 8, marginTop: 5 }}>
                {a.link && <button onClick={() => openAlert(a, setRoute, onClose)} style={linkBtn(s.clr)}>Open <ChevronRight size={11} style={{ verticalAlign: '-1px' }} /></button>}
                <button onClick={() => finish(a)} style={linkBtn('#16a34a')}><Check size={11} style={{ verticalAlign: '-1px' }} /> Finish</button>
              </div>
            </div>
          </div>
        );
      })}

      <button type="button" onClick={() => { setRoute?.('/dashboard/alerts'); onClose?.(); }}
        style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '11px', border: 'none', borderTop: '1px solid #e6e8ec', background: '#fafbfd', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: '#2563eb', position: 'sticky', bottom: 0 }}>
        View all alerts <ChevronRight size={13} />
      </button>
    </div>
  );
}
const linkBtn = (clr) => ({ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: 10.5, fontWeight: 700, color: clr });

// ─── Full Notification Centre page ────────────────────────────────────────────
// Same live feed, with severity + domain filters and the full pending/remind/
// finished lifecycle. (Routable companion to the bell; mirrors the dashboard.)
export function NotificationCentre({ branch, setRoute }) {
  const q = useAlerts(branch);
  const setStatus = useSetAlertStatus();
  const [tab, setTab] = useState('pending');     // pending | remind | finished
  const [sev, setSev] = useState('All');
  const [domain, setDomain] = useState('All');

  const data = q.data || {};
  const all = data.alerts || [];
  const sc = data.statusCounts || { pending: 0, remind: 0, finished: 0 };
  const domains = data.domains || [];

  const rows = useMemo(() => all.filter((a) => {
    if ((a.status || 'pending') !== tab) return false;
    if (sev !== 'All' && a.severity !== sev) return false;
    if (domain !== 'All' && a.domain !== domain) return false;
    return true;
  }), [all, tab, sev, domain]);

  const act = (a, status) => setStatus.mutate(
    { alertKey: a.key, branch: branchCode(branch) || 'ALL', status, signature: a.signature, magnitude: a.magnitude },
    { onSuccess: () => toastSuccess(status === 'finished' ? 'Marked finished' : 'Moved back to pending'), onError: (e) => toastError(e?.message || 'Could not update alert') },
  );

  const TABS = [['pending', 'Pending', sc.pending], ['remind', 'Remind Later', sc.remind], ['finished', 'Finished', sc.finished]];
  const SEVS = [['All', `All ${all.length}`], ['error', `🔴 ${data.counts?.error || 0}`], ['warn', `⚠ ${data.counts?.warn || 0}`], ['info', `ℹ ${data.counts?.info || 0}`]];
  const pill = (on) => ({ fontSize: 11, padding: '4px 12px', borderRadius: 999, fontWeight: 700, cursor: 'pointer', border: '1px solid ' + (on ? '#2563eb' : '#e6e8ec'), background: on ? '#e8f0ff' : '#fff', color: on ? '#2563eb' : '#5a6691' });

  return (
    <div style={{ padding: '12px 10px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🔔</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0d1326' }}>Notification Centre</h2>
            <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#5a6691' }}>{sc.pending} open · {all.length} total · Live from the books</p>
          </div>
        </div>
        <button onClick={() => setRoute?.('/dashboard/alerts')} style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: 'transparent', border: '1px solid #cfe0f5', borderRadius: 7, padding: '7px 12px', cursor: 'pointer' }}>Open Alerts Dashboard →</button>
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e6e8ec', marginBottom: 10, overflowX: 'auto' }}>
        {TABS.map(([k, lab, n]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: tab === k ? '#14161a' : '#5a6691', borderBottom: '2px solid ' + (tab === k ? '#2563eb' : 'transparent'), marginBottom: -2, flexShrink: 0 }}>{lab} <span style={{ fontSize: 10.5, color: '#5a6691' }}>({n})</span></button>
        ))}
      </div>

      {/* severity + domain filters */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        {SEVS.map(([k, lab]) => <span key={k} onClick={() => setSev(k)} style={pill(sev === k)}>{lab}</span>)}
        <span style={{ width: 1, background: '#e6e8ec', margin: '0 2px' }} />
        <span onClick={() => setDomain('All')} style={pill(domain === 'All')}>All areas</span>
        {domains.map((d) => <span key={d.key} onClick={() => setDomain(d.key)} style={pill(domain === d.key)}>{d.label} {d.pending ? `(${d.pending})` : ''}</span>)}
      </div>

      {q.isLoading && <div style={{ ...card, padding: 24, textAlign: 'center', color: '#5a6691' }}>Loading alerts…</div>}
      {!q.isLoading && rows.length === 0 && (
        <div style={{ ...card, padding: 24, textAlign: 'center', color: '#27500A', fontSize: 13 }}>
          {tab === 'pending' ? '✓ All clear! No open alerts' : tab === 'remind' ? 'Nothing snoozed.' : 'Nothing marked finished.'}
        </div>
      )}

      {rows.map((a) => {
        const s = sevOf(a.severity);
        return (
          <div key={a.key} style={{ ...card, display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8, borderLeft: `4px solid ${s.clr}` }}>
            <span style={{ fontSize: 18, flexShrink: 0 }} aria-hidden="true">{s.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 }}>
                <span style={{ fontWeight: 700, fontSize: 12, color: '#0d1326' }}>{a.title}</span>
                <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: s.bg, color: s.clr, textTransform: 'uppercase' }}>{s.label}</span>
              </div>
              <p style={{ margin: 0, fontSize: 11, color: '#384677' }}>{a.detail}</p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {a.link && <button onClick={() => openAlert(a, setRoute)} style={{ ...linkBtn('#2563eb'), fontSize: 11 }}>Open →</button>}
              {tab !== 'finished' && <button onClick={() => act(a, 'finished')} style={{ ...linkBtn('#16a34a'), fontSize: 11 }}><Check size={12} style={{ verticalAlign: '-2px' }} /> Finish</button>}
              {tab !== 'pending' && <button onClick={() => act(a, 'pending')} style={{ ...linkBtn('#5a6691'), fontSize: 11 }}>Reopen</button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
