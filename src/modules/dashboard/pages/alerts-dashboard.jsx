import React, { useMemo, useState } from 'react';
import { RefreshCw, Check, Clock, ChevronRight, Search } from 'lucide-react';
import { useAlerts, useSetAlertStatus } from '../../../core/useAccounting';
import { setNavFocus } from '../../../core/ux/navFocus';
import { PageLayout } from '../../../shell/PageLayout';
import { toastInfo, toastSuccess, toastError } from '../../../core/ux/toast';
import { clickable } from '../../../core/ux/clickable';
import { listKeyNav } from '../../../core/ux/listKeys';

const DARK = '#14161a', DIM = '#5b616e', LINE = '#e6e8ec';
const SEV = {
  error: { dot: '#dc2626', bg: '#fbe9e9', label: 'Critical' },
  warn: { dot: '#B7791F', bg: '#fbeedb', label: 'Warning' },
  info: { dot: '#2563eb', bg: '#e8f0ff', label: 'To review' },
};
const REMIND_PRESETS = [['1 day', 1], ['3 days', 3], ['Next week', 7], ['2 weeks', 14]];

// Touch-target helpers — content controls get a 44px tap height below tablet.
const TAP = 'max-tablet:min-h-[44px]';
const TAP_CHIP = 'inline-flex items-center max-tablet:min-h-[40px]';

const branchCodeOf = (b) => (b === 'ALL' ? 'ALL' : (b?.code || b || 'ALL'));
const futureISO = (days) => new Date(Date.now() + days * 86400000).toISOString();
const ago = (iso) => {
  if (!iso) return '';
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
};

export function AlertsDashboard({ branch, setRoute }) {
  const code = branchCodeOf(branch);
  const q = useAlerts(branch);
  const setStatus = useSetAlertStatus();
  const [tab, setTab] = useState('pending');       // pending | remind | finished
  const [sev, setSev] = useState('all');           // all | error | warn | info
  const [domain, setDomain] = useState('all');
  const [search, setSearch] = useState('');
  const [remindFor, setRemindFor] = useState(null); // alertKey whose remind menu is open

  const data = q.data || {};
  const all = data.alerts || [];
  const sc = data.statusCounts || { pending: 0, remind: 0, finished: 0 };

  // Everything below the status tabs reflects the CURRENT tab, so the severity KPIs
  // and domain chips show "what's in Pending" (not totals across every status).
  const tabAlerts = useMemo(() => all.filter((a) => (a.status || 'pending') === tab), [all, tab]);
  const sevCounts = useMemo(() => ({
    all: tabAlerts.length,
    error: tabAlerts.filter((a) => a.severity === 'error').length,
    warn: tabAlerts.filter((a) => a.severity === 'warn').length,
    info: tabAlerts.filter((a) => a.severity === 'info').length,
  }), [tabAlerts]);
  const domCount = useMemo(() => { const m = {}; tabAlerts.forEach((a) => { m[a.domain] = (m[a.domain] || 0) + 1; }); return m; }, [tabAlerts]);

  // Domain chips driven by the backend `domains` summary (so a new alert type is
  // reachable the moment it's added server-side); counts + visibility follow the tab.
  const domainOpts = useMemo(
    () => [['all', 'All', tabAlerts.length], ...(data.domains || []).filter((d) => (domCount[d.key] || 0) > 0).map((d) => [d.key, d.label, domCount[d.key] || 0])],
    [data.domains, domCount, tabAlerts.length],
  );
  // If the picked domain has nothing in this tab, fall back to All (no stuck-empty view).
  const activeDomain = (domain !== 'all' && (domCount[domain] || 0) === 0) ? 'all' : domain;

  const rows = useMemo(() => tabAlerts.filter((a) => {
    if (sev !== 'all' && a.severity !== sev) return false;
    if (activeDomain !== 'all' && a.domain !== activeDomain) return false;
    if (search) { const s = search.toLowerCase(); if (!(`${a.title} ${a.detail}`.toLowerCase().includes(s))) return false; }
    return true;
  }), [tabAlerts, sev, activeDomain, search]);

  // Group the filtered rows into domain sections (in the backend's domain order) so a
  // long list reads as a few labelled clusters instead of one undifferentiated stack.
  const groups = useMemo(() => {
    const order = (data.domains || []).map((d) => d.key);
    const label = Object.fromEntries((data.domains || []).map((d) => [d.key, d.label]));
    const byDom = new Map();
    rows.forEach((a) => { if (!byDom.has(a.domain)) byDom.set(a.domain, []); byDom.get(a.domain).push(a); });
    const ordered = order.filter((k) => byDom.has(k));
    const extras = [...byDom.keys()].filter((k) => !order.includes(k)); // safety: any untagged
    return [...ordered, ...extras].map((k) => ({ key: k, label: label[k] || k, items: byDom.get(k) }));
  }, [rows, data.domains]);

  // User-triggered refresh → confirm with a toast (passive refetches stay silent).
  const onRefresh = () => { toastInfo('Refreshing alerts…'); q.refetch(); };

  const STATUS_MSG = { finished: 'Marked finished', remind: 'Snoozed — moved to Remind Later', pending: 'Moved back to pending' };
  const act = (a, status, remindUntil = '') => {
    setRemindFor(null);
    setStatus.mutate(
      { alertKey: a.key, branch: code, status, remindUntil, signature: a.signature, magnitude: a.magnitude },
      {
        onSuccess: () => toastSuccess(STATUS_MSG[status] || 'Alert updated'),
        onError: (e) => toastError(e?.message || 'Could not update alert'),
      },
    );
  };

  // Open the fix screen, carrying the entity to focus (P2 deep-link).
  const open = (a) => {
    const route = typeof a.link === 'string' ? a.link : a.link.route;
    setNavFocus(route, a.focus || { kind: a.type, sample: a.sample });
    if (setRoute) setRoute(route);
  };

  const TABS = [['pending', 'Pending', sc.pending], ['remind', 'Remind Later', sc.remind], ['finished', 'Finished', sc.finished]];
  const chip = (active, bg, color) => ({ padding: '4px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', border: '1px solid ' + (active ? color : LINE), background: active ? bg : '#fff', color: active ? color : DIM });
  const SEV_CARDS = [
    ['all', 'All', sevCounts.all, '#eef0f3', DARK, '📋'],
    ['error', 'Critical', sevCounts.error, SEV.error.bg, SEV.error.dot, '🔴'],
    ['warn', 'Warnings', sevCounts.warn, SEV.warn.bg, SEV.warn.dot, '🟠'],
    ['info', 'To review', sevCounts.info, SEV.info.bg, SEV.info.dot, '🔵'],
  ];

  // One alert card — rendered inside its domain section.
  const renderCard = (a) => {
    const s = SEV[a.severity] || SEV.info;
    return (
      <div key={a.key} className="flex flex-col gap-3 rounded-brand border border-surface-border bg-surface px-3.5 py-2.5 shadow-card tablet:flex-row tablet:items-start" style={{ borderLeft: `4px solid ${s.dot}` }}>
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span style={{ width: 9, height: 9, borderRadius: 999, background: s.dot, marginTop: 5, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{a.title}</span>
              <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: s.bg, color: s.dot, textTransform: 'uppercase' }}>{s.label}</span>
              {a.remindUntil && tab === 'remind' && <span style={{ fontSize: 10, color: DIM }}>· until {new Date(a.remindUntil).toLocaleDateString('en-IN')}</span>}
            </div>
            <div style={{ fontSize: 11.5, color: '#5b616e', marginTop: 2 }}>{a.detail}</div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 max-tablet:w-full" style={{ flexShrink: 0, position: 'relative' }} onKeyDown={listKeyNav({ onEscape: () => setRemindFor(null) })}>
          {a.link && <button onClick={() => open(a)} title="Open & fix" className={TAP} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 11px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, background: '#2563eb', color: '#fff' }}>Open <ChevronRight size={13} /></button>}
          {tab !== 'finished' && <button onClick={() => act(a, 'finished')} title="Mark finished" className={TAP} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid ' + LINE, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, background: '#fff', color: '#16a34a' }}><Check size={13} /> Finish</button>}
          {tab !== 'remind' && <button onClick={() => setRemindFor(remindFor === a.key ? null : a.key)} title="Remind later" className={TAP} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid ' + LINE, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, background: '#fff', color: '#B7791F' }}><Clock size={13} /> Remind</button>}
          {tab !== 'pending' && <button onClick={() => act(a, 'pending')} title="Move back to pending" className={TAP} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid ' + LINE, cursor: 'pointer', fontSize: 11.5, fontWeight: 600, background: '#fff', color: DIM }}>Reopen</button>}
          {remindFor === a.key && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', border: '1px solid ' + LINE, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 10, overflow: 'hidden', minWidth: 130 }}>
              {REMIND_PRESETS.map(([lab, d]) => (
                <div key={d} {...clickable(() => act(a, 'remind', futureISO(d)), { role: 'option' })} className={`${TAP} flex items-center`} style={{ padding: '8px 12px', fontSize: 11.5, cursor: 'pointer', color: DARK }} onMouseEnter={(e) => e.currentTarget.style.background = '#f0f4ff'} onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}>{lab}</div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <PageLayout maxWidth="mx-auto max-w-[1100px]">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div>
          <h1 className="kbiz-page-title" style={{ margin: 0 }}>🔔 Alerts Dashboard</h1>
          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: DIM }}>{code} · {q.isFetching ? 'refreshing…' : `updated ${ago(data.generatedAt)}`}</p>
        </div>
        <button onClick={onRefresh} className={`${TAP} max-tablet:px-4`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', border: '1px solid ' + LINE, borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: DARK }}><RefreshCw size={13} /> Refresh</button>
      </div>

      {/* ── Severity overview (also the severity filter) ───────── */}
      <div className="grid grid-cols-2 gap-2.5 tablet:grid-cols-4" style={{ marginBottom: 14 }}>
        {SEV_CARDS.map(([k, lab, n, bg, color]) => {
          const active = sev === k;
          return (
            <button key={k} onClick={() => setSev(k)} aria-pressed={active} className={TAP}
              style={{ textAlign: 'left', cursor: 'pointer', borderRadius: 10, padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 3, background: active ? bg : '#fff', border: '1px solid ' + (active ? color : LINE), boxShadow: active ? `inset 0 0 0 1px ${color}` : 'none' }}>
              <span style={{ fontSize: 21, fontWeight: 800, lineHeight: 1, color: k === 'all' ? DARK : color }}>{n}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: DIM }}>{lab}</span>
            </button>
          );
        })}
      </div>

      {/* ── Toolbar: status tabs + search ──────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap', borderBottom: '2px solid ' + LINE, marginBottom: 10 }}>
        <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
          {TABS.map(([k, lab, n]) => (
            <button key={k} onClick={() => setTab(k)} className={`${TAP} shrink-0`} style={{ padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: tab === k ? DARK : DIM, borderBottom: '2px solid ' + (tab === k ? '#2563eb' : 'transparent'), marginBottom: -2 }}>{lab} <span style={{ fontSize: 10.5, color: DIM }}>({n})</span></button>
          ))}
        </div>
        <div className="max-tablet:w-full" style={{ position: 'relative', marginBottom: 6 }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: DIM }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search alerts…" className={`${TAP} max-tablet:w-full`} style={{ padding: '7px 10px 7px 28px', border: '1px solid ' + LINE, borderRadius: 7, fontSize: 12, minWidth: 200 }} />
        </div>
      </div>

      {/* ── Area (domain) filter — counts reflect the current tab ─ */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
        {domainOpts.map(([k, lab, n]) => (
          <span key={k} {...clickable(() => setDomain(k))} className={TAP_CHIP} style={chip(activeDomain === k, '#eef0f3', DARK)}>{lab}<span style={{ marginLeft: 5, opacity: 0.55 }}>{n}</span></span>
        ))}
      </div>

      {/* ── List (grouped into domain sections) ────────────────── */}
      {q.isLoading && <div style={{ padding: 30, textAlign: 'center', color: DIM }}>Loading alerts…</div>}
      {q.isError && (
        <div className="rounded-brand border border-surface-border bg-surface p-5 text-center shadow-card">
          <div style={{ color: SEV.error.dot, fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>⚠ {q.error?.message || 'Could not load alerts.'}</div>
          <button onClick={onRefresh} className={TAP} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid ' + LINE, borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: DARK }}><RefreshCw size={13} /> Retry</button>
        </div>
      )}
      {!q.isLoading && !q.isError && groups.length === 0 && (
        <div className="rounded-brand border border-surface-border bg-surface p-[30px] text-center text-ink-muted shadow-card" style={{ marginTop: 8 }}>
          {tab === 'pending' ? '✓ All clear — no open alerts for this branch.' : tab === 'remind' ? 'Nothing snoozed.' : 'Nothing marked finished.'}
        </div>
      )}

      {groups.map((g) => (
        <section key={g.key} style={{ marginBottom: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 2px 8px' }}>
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: DIM }}>{g.label}</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: DIM, background: '#eef0f3', borderRadius: 999, padding: '1px 7px' }}>{g.items.length}</span>
            <span style={{ flex: 1, height: 1, background: LINE }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {g.items.map((a) => renderCard(a))}
          </div>
        </section>
      ))}
    </PageLayout>
  );
}
