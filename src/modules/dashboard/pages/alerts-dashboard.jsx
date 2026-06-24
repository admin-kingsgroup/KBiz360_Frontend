import React, { useMemo, useState } from 'react';
import { RefreshCw, ChevronRight, Search, CheckCircle2, MapPin } from 'lucide-react';
import { useAlerts } from '../../../core/useAccounting';
import { setNavFocus } from '../../../core/ux/navFocus';
import { PageLayout } from '../../../shell/PageLayout';
import { toastInfo } from '../../../core/ux/toast';
import { clickable } from '../../../core/ux/clickable';

const DARK = '#14161a', DIM = '#5b616e', LINE = '#e6e8ec', GREEN = '#16a34a';
const SEV = {
  error: { dot: '#dc2626', bg: '#fbe9e9', label: 'Critical' },
  warn: { dot: '#B7791F', bg: '#fbeedb', label: 'Warning' },
  info: { dot: '#2563eb', bg: '#e8f0ff', label: 'To review' },
};

// Touch-target helpers — content controls get a 44px tap height below tablet.
const TAP = 'max-tablet:min-h-[44px]';
const TAP_CHIP = 'inline-flex items-center max-tablet:min-h-[40px]';

const branchCodeOf = (b) => (b === 'ALL' ? 'ALL' : (b?.code || b || 'ALL'));
const ago = (iso) => {
  if (!iso) return '';
  const m = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
  return m < 1 ? 'just now' : m < 60 ? `${m}m ago` : `${Math.round(m / 60)}h ago`;
};
const fdt = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
const fmtDur = (ms) => {
  const m = Math.max(0, Math.round((Number(ms) || 0) / 60000));
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24); const rh = h % 24;
  return rh ? `${d}d ${rh}h` : `${d}d`;
};

export function AlertsDashboard({ branch, setRoute }) {
  const code = branchCodeOf(branch);
  const q = useAlerts(branch);
  const [tab, setTab] = useState('open');      // open | fixed
  const [sev, setSev] = useState('all');       // all | error | warn | info
  const [domain, setDomain] = useState('all');
  const [search, setSearch] = useState('');

  const data = q.data || {};
  const branchRequired = !!data.branchRequired;  // consolidated (ALL) view — no issues
  const all = data.alerts || [];                 // open alerts (live)
  const resolved = data.resolved || [];          // Fixed feed (auto-resolved)
  const sc = data.statusCounts || { open: 0, fixed: 0 };

  // ── Open-tab derivations (severity KPIs + domain chips reflect the open set) ──
  const sevCounts = useMemo(() => ({
    all: all.length,
    error: all.filter((a) => a.severity === 'error').length,
    warn: all.filter((a) => a.severity === 'warn').length,
    info: all.filter((a) => a.severity === 'info').length,
  }), [all]);
  const domCount = useMemo(() => { const m = {}; all.forEach((a) => { m[a.domain] = (m[a.domain] || 0) + 1; }); return m; }, [all]);
  const domainOpts = useMemo(
    () => [['all', 'All', all.length], ...(data.domains || []).filter((d) => (domCount[d.key] || 0) > 0).map((d) => [d.key, d.label, domCount[d.key] || 0])],
    [data.domains, domCount, all.length],
  );
  const activeDomain = (domain !== 'all' && (domCount[domain] || 0) === 0) ? 'all' : domain;

  const openRows = useMemo(() => all.filter((a) => {
    if (sev !== 'all' && a.severity !== sev) return false;
    if (activeDomain !== 'all' && a.domain !== activeDomain) return false;
    if (search) { const s = search.toLowerCase(); if (!(`${a.title} ${a.detail}`.toLowerCase().includes(s))) return false; }
    return true;
  }), [all, sev, activeDomain, search]);

  const groups = useMemo(() => {
    const order = (data.domains || []).map((d) => d.key);
    const label = Object.fromEntries((data.domains || []).map((d) => [d.key, d.label]));
    const byDom = new Map();
    openRows.forEach((a) => { if (!byDom.has(a.domain)) byDom.set(a.domain, []); byDom.get(a.domain).push(a); });
    const ordered = order.filter((k) => byDom.has(k));
    const extras = [...byDom.keys()].filter((k) => !order.includes(k));
    return [...ordered, ...extras].map((k) => ({ key: k, label: label[k] || k, items: byDom.get(k) }));
  }, [openRows, data.domains]);

  // ── Fixed-tab derivations (search across what was fixed + who fixed it) ──
  const fixedRows = useMemo(() => resolved.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return `${r.title} ${r.detail} ${r.resolvedBy} ${r.resolvedHow}`.toLowerCase().includes(s);
  }), [resolved, search]);

  // User-triggered refresh → confirm with a toast (passive refetches stay silent).
  const onRefresh = () => { toastInfo('Refreshing alerts…'); q.refetch(); };

  // Open the fix/verify screen, carrying the entity to focus (deep-link).
  const go = (route, focus) => { if (!route) return; setNavFocus(route, focus || {}); if (setRoute) setRoute(route); };

  const TABS = [['open', 'Open', sc.open], ['fixed', 'Fixed', sc.fixed]];
  const chip = (active, bg, color) => ({ padding: '4px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', border: '1px solid ' + (active ? color : LINE), background: active ? bg : '#fff', color: active ? color : DIM });
  const SEV_CARDS = [
    ['all', 'All', sevCounts.all, '#eef0f3', DARK],
    ['error', 'Critical', sevCounts.error, SEV.error.bg, SEV.error.dot],
    ['warn', 'Warnings', sevCounts.warn, SEV.warn.bg, SEV.warn.dot],
    ['info', 'To review', sevCounts.info, SEV.info.bg, SEV.info.dot],
  ];

  // One OPEN alert — auto-disappears when its condition clears (no manual Finish).
  const renderOpenCard = (a) => {
    const s = SEV[a.severity] || SEV.info;
    return (
      <div key={a.key} className="flex flex-col gap-3 rounded-brand border border-surface-border bg-surface px-3.5 py-2.5 shadow-card tablet:flex-row tablet:items-start" style={{ borderLeft: `4px solid ${s.dot}` }}>
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span style={{ width: 9, height: 9, borderRadius: 999, background: s.dot, marginTop: 5, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{a.title}</span>
              <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: s.bg, color: s.dot, textTransform: 'uppercase' }}>{s.label}</span>
            </div>
            <div style={{ fontSize: 11.5, color: '#5b616e', marginTop: 2 }}>{a.detail}</div>
          </div>
        </div>
        {a.link && (
          <div className="flex items-center max-tablet:w-full" style={{ flexShrink: 0 }}>
            <button onClick={() => go(typeof a.link === 'string' ? a.link : a.link.route, a.focus || { kind: a.type, sample: a.sample })} title="Open & fix" className={TAP} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 11px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, background: '#2563eb', color: '#fff' }}>Open &amp; fix <ChevronRight size={13} /></button>
          </div>
        )}
      </div>
    );
  };

  // One FIXED alert — the audit trail: what it was, how long it was open, when it
  // cleared, and a best-effort who/how (from the audit log; else auto-resolved).
  const renderFixedCard = (r) => {
    const s = SEV[r.severity] || SEV.info;
    return (
      <div key={r.alertKey} className="flex flex-col gap-2 rounded-brand border border-surface-border bg-surface px-3.5 py-2.5 shadow-card tablet:flex-row tablet:items-start" style={{ borderLeft: `4px solid ${GREEN}` }}>
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <CheckCircle2 size={16} style={{ color: GREEN, marginTop: 3, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{r.title}</span>
              <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: s.bg, color: s.dot, textTransform: 'uppercase' }}>{s.label}</span>
              <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: '#e8f6ed', color: GREEN, textTransform: 'uppercase' }}>Fixed</span>
            </div>
            {r.detail && <div style={{ fontSize: 11.5, color: '#5b616e', marginTop: 2 }}>{r.detail}</div>}
            <div style={{ fontSize: 10.5, color: DIM, marginTop: 4 }}>
              Detected {fdt(r.firstSeenAt)} · Fixed {fdt(r.resolvedAt)} · open for {fmtDur(r.openMs)}
            </div>
            <div style={{ fontSize: 11, color: DARK, marginTop: 2, fontWeight: 600 }}>
              {r.resolvedBy
                ? <>Fixed by <span style={{ color: '#2563eb' }}>{r.resolvedBy}</span>{r.resolvedHow ? <span style={{ color: DIM, fontWeight: 500 }}> · {r.resolvedHow}</span> : null}</>
                : <span style={{ color: DIM, fontWeight: 500 }}>Auto-resolved — no linked transaction found</span>}
            </div>
          </div>
        </div>
        {r.link && (
          <div className="flex items-center max-tablet:w-full" style={{ flexShrink: 0 }}>
            <button onClick={() => go(r.link, { kind: r.type })} title="Verify on the source screen" className={TAP} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid ' + LINE, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, background: '#fff', color: DIM }}>View <ChevronRight size={13} /></button>
          </div>
        )}
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

      {/* ── Consolidated view: alerts are branch-specific ──────── */}
      {branchRequired ? (
        <div className="rounded-brand border border-surface-border bg-surface p-[34px] text-center shadow-card">
          <MapPin size={26} style={{ color: '#2563eb', margin: '0 auto 10px' }} />
          <div style={{ fontSize: 14, fontWeight: 800, color: DARK, marginBottom: 6 }}>Select a branch to see its alerts</div>
          <div style={{ fontSize: 12, color: DIM, maxWidth: 460, margin: '0 auto', lineHeight: 1.5 }}>
            The consolidated <b>All branches</b> view doesn’t show issues — alerts are owned and actioned per branch. Pick a branch from the selector at the top-right.
          </div>
        </div>
      ) : (
        <>
          {/* ── Severity overview (open tab only) — also the severity filter ─ */}
          {tab === 'open' && (
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
          )}

          {/* ── Toolbar: Open / Fixed tabs + search ──────────────── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap', borderBottom: '2px solid ' + LINE, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
              {TABS.map(([k, lab, n]) => (
                <button key={k} onClick={() => setTab(k)} className={`${TAP} shrink-0`} style={{ padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: tab === k ? DARK : DIM, borderBottom: '2px solid ' + (tab === k ? '#2563eb' : 'transparent'), marginBottom: -2 }}>{lab} <span style={{ fontSize: 10.5, color: DIM }}>({n})</span></button>
              ))}
            </div>
            <div className="max-tablet:w-full" style={{ position: 'relative', marginBottom: 6 }}>
              <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: DIM }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tab === 'fixed' ? 'Search fixed…' : 'Search alerts…'} className={`${TAP} max-tablet:w-full`} style={{ padding: '7px 10px 7px 28px', border: '1px solid ' + LINE, borderRadius: 7, fontSize: 12, minWidth: 200 }} />
            </div>
          </div>

          {/* ── Area (domain) filter — open tab only ─────────────── */}
          {tab === 'open' && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
              {domainOpts.map(([k, lab, n]) => (
                <span key={k} {...clickable(() => setDomain(k))} className={TAP_CHIP} style={chip(activeDomain === k, '#eef0f3', DARK)}>{lab}<span style={{ marginLeft: 5, opacity: 0.55 }}>{n}</span></span>
              ))}
            </div>
          )}

          {/* ── States ───────────────────────────────────────────── */}
          {q.isLoading && <div style={{ padding: 30, textAlign: 'center', color: DIM }}>Loading alerts…</div>}
          {q.isError && (
            <div className="rounded-brand border border-surface-border bg-surface p-5 text-center shadow-card">
              <div style={{ color: SEV.error.dot, fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>⚠ {q.error?.message || 'Could not load alerts.'}</div>
              <button onClick={onRefresh} className={TAP} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid ' + LINE, borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: DARK }}><RefreshCw size={13} /> Retry</button>
            </div>
          )}

          {/* ── Open tab: grouped into domain sections ───────────── */}
          {!q.isLoading && !q.isError && tab === 'open' && (
            groups.length === 0
              ? <div className="rounded-brand border border-surface-border bg-surface p-[30px] text-center text-ink-muted shadow-card" style={{ marginTop: 8 }}>✓ All clear — no open alerts for {code}.</div>
              : groups.map((g) => (
                <section key={g.key} style={{ marginBottom: 2 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '14px 2px 8px' }}>
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: DIM }}>{g.label}</span>
                    <span style={{ fontSize: 10, fontWeight: 800, color: DIM, background: '#eef0f3', borderRadius: 999, padding: '1px 7px' }}>{g.items.length}</span>
                    <span style={{ flex: 1, height: 1, background: LINE }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {g.items.map((a) => renderOpenCard(a))}
                  </div>
                </section>
              ))
          )}

          {/* ── Fixed tab: audit trail of auto-resolved issues ───── */}
          {!q.isLoading && !q.isError && tab === 'fixed' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
              {fixedRows.length === 0
                ? <div className="rounded-brand border border-surface-border bg-surface p-[30px] text-center text-ink-muted shadow-card">Nothing fixed yet — resolved issues will appear here with their audit trail.</div>
                : fixedRows.map((r) => renderFixedCard(r))}
            </div>
          )}
        </>
      )}
    </PageLayout>
  );
}
