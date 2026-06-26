/* ════════════════════════════════════════════════════════════════════
   SHELL/NOTIFPANEL.JSX
   The header 🔔 bell dropdown + the full Notification Centre page.
   Both are driven by the LIVE alert engine (/api/alerts) — the same feed as
   the Alerts Dashboard. Alerts are OPEN while their condition holds and
   auto-RESOLVE (move to "Fixed") when it clears — no manual marking. Alerts
   are branch-specific: the consolidated (All branches) view shows none.
   ════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useRef, useState } from 'react';
import { ChevronRight, CheckCircle2, MapPin } from 'lucide-react';
import { useAlerts } from '../core/useAccounting';
import { setNavFocus } from '../core/ux/navFocus';
import { card } from '../core/styleTokens';
import { useFocusTrap } from '../core/ux/focus';
import { pushModal } from '../core/ux/modalStore';

// Severity → presentation. Matches the Alerts Dashboard / panel palette.
const SEV = {
  error: { clr: '#dc2626', bg: '#fbe9e9', bd: '#f3c0c0', icon: '🔴', label: 'Critical' },
  warn:  { clr: '#b45309', bg: '#fbeedb', bd: '#f0c36d', icon: '⚠',  label: 'Warning' },
  info:  { clr: '#2563eb', bg: '#e8f0ff', bd: '#cfe0f5', icon: 'ℹ',  label: 'To review' },
};
const sevOf = (s) => SEV[s] || SEV.info;
const GREEN = '#16a34a';
const fdt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const fmtDur = (ms) => {
  const m = Math.max(0, Math.round((Number(ms) || 0) / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
};

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
  const data = q.data || {};
  const branchRequired = !!data.branchRequired;
  const open = data.alerts || [];
  const c = data.counts || { error: 0, warn: 0, info: 0 };

  // Esc closes (via the modal stack); focus moves into the panel and returns to
  // the Bell trigger on close. top:52 clears the 64px app-bar.
  React.useEffect(() => pushModal(onClose), [onClose]);
  useFocusTrap(panelRef);

  return (
    <div ref={panelRef} role="dialog" aria-label="Alerts" className="animate-kb-rise"
      style={{ position: 'fixed', top: 52, right: 8, width: 360, maxHeight: 'calc(100vh - 70px)', overflowY: 'auto',
        background: '#fff', borderRadius: 14, boxShadow: '0 16px 40px -12px rgba(16,18,22,0.20), 0 2px 8px -4px rgba(16,18,22,0.10)',
        zIndex: 600, border: '1px solid #cdd1d8' }}>
      <div style={{ padding: '12px 14px', borderBottom: '1px solid #cdd1d8', position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#14161a' }}>Alerts</p>
          <p style={{ margin: '1px 0 0', fontSize: 10, color: '#5a6691' }}>
            {branchRequired ? 'select a branch' : q.isFetching ? 'refreshing…' : open.length ? `${open.length} open` : 'all clear'}
            {!branchRequired && c.error ? ` · ${c.error} critical` : ''}
          </p>
        </div>
        <button onClick={onClose} aria-label="Close alerts" style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 18, color: '#5a6691' }}>✕</button>
      </div>

      {q.isLoading && <p style={{ padding: 20, textAlign: 'center', color: '#bfc3d6', fontSize: 11 }}>Checking for issues…</p>}
      {q.isError && <p style={{ padding: 20, textAlign: 'center', color: '#dc2626', fontSize: 11 }}>Could not load alerts.</p>}
      {!q.isLoading && !q.isError && branchRequired && (
        <p style={{ padding: '20px 18px', textAlign: 'center', color: '#5a6691', fontSize: 11.5, lineHeight: 1.5 }}>
          <MapPin size={18} style={{ color: '#2563eb', display: 'block', margin: '0 auto 6px' }} />
          Pick a branch from the top-right selector to see its alerts.
        </p>
      )}
      {!q.isLoading && !q.isError && !branchRequired && open.length === 0 && (
        <p style={{ padding: '22px', textAlign: 'center', color: '#27500A', fontSize: 12, fontWeight: 600 }}>✓ All clear — no open alerts.</p>
      )}

      {!branchRequired && open.map((a) => {
        const s = sevOf(a.severity);
        return (
          <div key={a.key} style={{ padding: '10px 14px', borderBottom: '1px solid #dfe2e7', borderLeft: `3px solid ${s.clr}`, display: 'flex', gap: 9, alignItems: 'flex-start' }}>
            <div aria-hidden="true" style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{s.icon}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <button type="button" onClick={() => a.link && openAlert(a, setRoute, onClose)} title={a.link ? 'Open & fix' : undefined}
                style={{ display: 'block', width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: 0, cursor: a.link ? 'pointer' : 'default' }}>
                <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, color: '#0d1326' }}>{a.title}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#5a6691', lineHeight: 1.4 }}>{a.detail}</p>
              </button>
              {a.link && <div style={{ marginTop: 5 }}><button onClick={() => openAlert(a, setRoute, onClose)} style={linkBtn(s.clr)}>Open &amp; fix <ChevronRight size={11} style={{ verticalAlign: '-1px' }} /></button></div>}
            </div>
          </div>
        );
      })}

      <button type="button" onClick={() => { setRoute?.('/dashboard/alerts'); onClose?.(); }}
        style={{ display: 'flex', width: '100%', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '11px', border: 'none', borderTop: '1px solid #cdd1d8', background: '#fafbfd', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, color: '#2563eb', position: 'sticky', bottom: 0 }}>
        Open Alerts Dashboard <ChevronRight size={13} />
      </button>
    </div>
  );
}
const linkBtn = (clr) => ({ background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', fontSize: 10.5, fontWeight: 700, color: clr });

// ─── Full Notification Centre page ────────────────────────────────────────────
// Mirrors the dashboard: Open (live) + Fixed (auto-resolved, with audit trail).
// Branch-specific — the consolidated view shows nothing.
export function NotificationCentre({ branch, setRoute }) {
  const q = useAlerts(branch);
  const [tab, setTab] = useState('open');     // open | fixed
  const [sev, setSev] = useState('All');
  const [domain, setDomain] = useState('All');

  const data = q.data || {};
  const branchRequired = !!data.branchRequired;
  const all = data.alerts || [];
  const resolved = data.resolved || [];
  const sc = data.statusCounts || { open: 0, fixed: 0 };
  const domains = data.domains || [];

  const openRows = useMemo(() => all.filter((a) => {
    if (sev !== 'All' && a.severity !== sev) return false;
    if (domain !== 'All' && a.domain !== domain) return false;
    return true;
  }), [all, sev, domain]);

  const TABS = [['open', 'Open', sc.open], ['fixed', 'Fixed', sc.fixed]];
  const SEVS = [['All', `All ${all.length}`], ['error', `🔴 ${data.counts?.error || 0}`], ['warn', `⚠ ${data.counts?.warn || 0}`], ['info', `ℹ ${data.counts?.info || 0}`]];
  const pill = (on) => ({ fontSize: 11, padding: '4px 12px', borderRadius: 999, fontWeight: 700, cursor: 'pointer', border: '1px solid ' + (on ? '#2563eb' : '#e6e8ec'), background: on ? '#e8f0ff' : '#fff', color: on ? '#2563eb' : '#5a6691' });

  return (
    <div style={{ padding: '12px 10px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🔔</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0d1326' }}>Notification Centre</h2>
            <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#5a6691' }}>{branchRequired ? 'Select a branch' : `${sc.open} open · ${sc.fixed} fixed · Live from the books`}</p>
          </div>
        </div>
        <button onClick={() => setRoute?.('/dashboard/alerts')} style={{ fontSize: 11, fontWeight: 700, color: '#2563eb', background: 'transparent', border: '1px solid #cfe0f5', borderRadius: 7, padding: '7px 12px', cursor: 'pointer' }}>Open Alerts Dashboard →</button>
      </div>

      {branchRequired ? (
        <div style={{ ...card, padding: 28, textAlign: 'center' }}>
          <MapPin size={24} style={{ color: '#2563eb', margin: '0 auto 8px' }} />
          <div style={{ fontSize: 13.5, fontWeight: 800, color: '#0d1326', marginBottom: 5 }}>Select a branch to see its alerts</div>
          <div style={{ fontSize: 11.5, color: '#5a6691', maxWidth: 440, margin: '0 auto', lineHeight: 1.5 }}>The consolidated <b>All branches</b> view doesn’t show issues — alerts are actioned per branch. Pick one from the selector at the top-right.</div>
        </div>
      ) : (
        <>
          {/* tabs */}
          <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #cdd1d8', marginBottom: 10, overflowX: 'auto' }}>
            {TABS.map(([k, lab, n]) => (
              <button key={k} onClick={() => setTab(k)} style={{ padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: tab === k ? '#14161a' : '#5a6691', borderBottom: '2px solid ' + (tab === k ? '#2563eb' : 'transparent'), marginBottom: -2, flexShrink: 0 }}>{lab} <span style={{ fontSize: 10.5, color: '#5a6691' }}>({n})</span></button>
            ))}
          </div>

          {/* open-only filters */}
          {tab === 'open' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
              {SEVS.map(([k, lab]) => <span key={k} onClick={() => setSev(k)} style={pill(sev === k)}>{lab}</span>)}
              <span style={{ width: 1, background: '#e6e8ec', margin: '0 2px' }} />
              <span onClick={() => setDomain('All')} style={pill(domain === 'All')}>All areas</span>
              {domains.map((d) => <span key={d.key} onClick={() => setDomain(d.key)} style={pill(domain === d.key)}>{d.label} {d.pending ? `(${d.pending})` : ''}</span>)}
            </div>
          )}

          {q.isLoading && <div style={{ ...card, padding: 24, textAlign: 'center', color: '#5a6691' }}>Loading alerts…</div>}

          {/* OPEN */}
          {!q.isLoading && tab === 'open' && (openRows.length === 0
            ? <div style={{ ...card, padding: 24, textAlign: 'center', color: '#27500A', fontSize: 13 }}>✓ All clear! No open alerts</div>
            : openRows.map((a) => {
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
                  {a.link && <button onClick={() => openAlert(a, setRoute)} style={{ ...linkBtn('#2563eb'), fontSize: 11 }}>Open →</button>}
                </div>
              );
            }))}

          {/* FIXED — audit trail */}
          {!q.isLoading && tab === 'fixed' && (resolved.length === 0
            ? <div style={{ ...card, padding: 24, textAlign: 'center', color: '#5a6691', fontSize: 13 }}>Nothing fixed yet — resolved issues appear here with their audit trail.</div>
            : resolved.map((r) => {
              const s = sevOf(r.severity);
              return (
                <div key={r.alertKey} style={{ ...card, display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8, borderLeft: `4px solid ${GREEN}` }}>
                  <CheckCircle2 size={16} style={{ color: GREEN, marginTop: 2, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 2 }}>
                      <span style={{ fontWeight: 700, fontSize: 12, color: '#0d1326' }}>{r.title}</span>
                      <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: '#e8f6ed', color: GREEN, textTransform: 'uppercase' }}>Fixed</span>
                    </div>
                    {r.detail && <p style={{ margin: 0, fontSize: 11, color: '#384677' }}>{r.detail}</p>}
                    <p style={{ margin: '3px 0 0', fontSize: 10, color: '#5a6691' }}>Detected {fdt(r.firstSeenAt)} · Fixed {fdt(r.resolvedAt)} · open for {fmtDur(r.openMs)}</p>
                    <p style={{ margin: '1px 0 0', fontSize: 10.5, color: '#0d1326', fontWeight: 600 }}>
                      {r.resolvedBy ? <>Fixed by <span style={{ color: '#2563eb' }}>{r.resolvedBy}</span>{r.resolvedHow ? <span style={{ color: '#5a6691', fontWeight: 500 }}> · {r.resolvedHow}</span> : null}</> : <span style={{ color: '#5a6691', fontWeight: 500 }}>Auto-resolved — no linked transaction</span>}
                    </p>
                  </div>
                </div>
              );
            }))}
        </>
      )}
    </div>
  );
}
