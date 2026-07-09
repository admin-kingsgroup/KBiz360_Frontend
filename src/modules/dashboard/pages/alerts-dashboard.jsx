import React, { useMemo, useState } from 'react';
import { RefreshCw, ChevronRight, Search, CheckCircle2, MapPin, Layers, Database, TrendingUp, GitBranch } from 'lucide-react';
import { useAlerts, useAlertTrend, useAlertsByBranch } from '../../../core/useAccounting';
import { setNavFocus } from '../../../core/ux/navFocus';
import { PageLayout } from '../../../shell/PageLayout';
import { toastInfo } from '../../../core/ux/toast';
import { clickable } from '../../../core/ux/clickable';
import { bc } from '../../../core/styleTokens';

const DARK = '#14161a', DIM = '#5b616e', LINE = '#cdd1d8', GREEN = '#16a34a', AMBER = '#B7791F', RED = '#dc2626';
const SEV = {
  error: { dot: '#dc2626', bg: '#fbe9e9', label: 'Critical' },
  warn: { dot: '#B7791F', bg: '#fbeedb', label: 'Warning' },
  info: { dot: '#2563eb', bg: '#e8f0ff', label: 'To review' },
};
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
// Branch-aware money. INR branches keep Cr/L + Indian grouping; USD branches
// (NBO/DAR/FBM, cur='$') use K/M/B short scale + en-US grouping.
const fmtMoney = (cur, n) => {
  cur = cur || '₹';
  const v = Math.round(Number(n) || 0); const a = Math.abs(v);
  if (cur === '$') {
    if (a >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (a >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    if (a >= 1e3) return `$${(v / 1e3).toFixed(2)}K`;
    return `$${v.toLocaleString('en-US')}`;
  }
  if (a >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (a >= 1e5) return `₹${(v / 1e5).toFixed(2)}L`;
  return `₹${v.toLocaleString('en-IN')}`;
};
const symOf = (b) => (bc(b) || {}).cur || '₹';
const scoreColor = (s) => (s >= 80 ? GREEN : s >= 50 ? AMBER : RED);

export function AlertsDashboard({ branch, setRoute }) {
  const code = branchCodeOf(branch);
  const cur = symOf(branch);                 // active branch currency (₹ India · $ NBO/DAR/FBM)
  const money = (n) => fmtMoney(cur, n);
  const q = useAlerts(branch);
  const trendQ = useAlertTrend(branch);
  const branchesQ = useAlertsByBranch();
  const [tab, setTab] = useState('overview');  // overview | open | fixed
  const [sev, setSev] = useState('all');
  const [domain, setDomain] = useState('all');
  const [search, setSearch] = useState('');
  const [typeSel, setTypeSel] = useState(null);  // {label, types:[]} — drill from an Overview number to its exact issues

  const data = q.data || {};
  const branchRequired = !!data.branchRequired;
  const all = data.alerts || [];
  const resolved = data.resolved || [];
  const sc = data.statusCounts || { open: 0, fixed: 0 };
  const an = data.analytics || { score: 100, exposure: 0, areas: [], dataCapture: { issues: 0, score: 100 } };

  // ── Open-tab derivations ──
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
    if (typeSel && !typeSel.types.includes(a.type)) return false;
    if (sev !== 'all' && a.severity !== sev) return false;
    if (activeDomain !== 'all' && a.domain !== activeDomain) return false;
    if (search) { const s = search.toLowerCase(); if (!(`${a.title} ${a.detail} ${a.why || ''} ${a.suggestion || ''}`.toLowerCase().includes(s))) return false; }
    return true;
  }), [all, sev, activeDomain, search, typeSel]);

  const groups = useMemo(() => {
    const order = (data.domains || []).map((d) => d.key);
    const label = Object.fromEntries((data.domains || []).map((d) => [d.key, d.label]));
    const byDom = new Map();
    openRows.forEach((a) => { if (!byDom.has(a.domain)) byDom.set(a.domain, []); byDom.get(a.domain).push(a); });
    const ordered = order.filter((k) => byDom.has(k));
    const extras = [...byDom.keys()].filter((k) => !order.includes(k));
    return [...ordered, ...extras].map((k) => ({ key: k, label: label[k] || k, items: byDom.get(k) }));
  }, [openRows, data.domains]);

  const fixedRows = useMemo(() => resolved.filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return `${r.title} ${r.detail} ${r.resolvedBy} ${r.resolvedHow}`.toLowerCase().includes(s);
  }), [resolved, search]);

  const onRefresh = () => { toastInfo('Refreshing scrutiny…'); q.refetch(); trendQ.refetch && trendQ.refetch(); branchesQ.refetch && branchesQ.refetch(); };
  const go = (route, focus) => { if (!route) return; setNavFocus(route, focus || {}); if (setRoute) setRoute(route); };
  // Every Overview number is a drill-in: jump to Open Issues pre-filtered to the
  // exact set behind the number, where each card explains the issue + the fix.
  const drillArea = (key) => { setTypeSel(null); setDomain(key); setSev('all'); setSearch(''); setTab('open'); };
  const drillSev = (k) => { setTypeSel(null); setDomain('all'); setSev(k); setSearch(''); setTab('open'); };
  const drillTypes = (label, types) => { setTypeSel({ label, types }); setDomain('all'); setSev('all'); setSearch(''); setTab('open'); };
  const pickSev = (k) => { setTypeSel(null); setSev(k); };
  const pickDomain = (k) => { setTypeSel(null); setDomain(k); };

  const TABS = [['overview', 'Overview'], ['open', 'Open Issues', sc.open], ['fixed', 'Fixed', sc.fixed]];
  const chip = (active, bg, color) => ({ padding: '4px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', border: '1px solid ' + (active ? color : LINE), background: active ? bg : '#fff', color: active ? color : DIM });
  const SEV_CARDS = [
    ['all', 'All', sevCounts.all, '#eef0f3', DARK],
    ['error', 'Critical', sevCounts.error, SEV.error.bg, SEV.error.dot],
    ['warn', 'Warnings', sevCounts.warn, SEV.warn.bg, SEV.warn.dot],
    ['info', 'To review', sevCounts.info, SEV.info.bg, SEV.info.dot],
  ];

  const metaBadge = { fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, background: '#f1f3f6', color: DARK, whiteSpace: 'nowrap' };
  const renderOpenCard = (a) => {
    const s = SEV[a.severity] || SEV.info;
    const samples = (Array.isArray(a.sample) ? a.sample : []).filter(Boolean).slice(0, 12);
    return (
      <div key={a.key} className="rounded-brand border border-surface-border bg-surface shadow-card" style={{ borderLeft: `5px solid ${s.dot}`, padding: '16px 18px' }}>
        {/* Title row + status badges + action */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ width: 11, height: 11, borderRadius: 999, background: s.dot, marginTop: 6, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 15.5, fontWeight: 800, color: DARK, lineHeight: 1.25 }}>{a.title}</span>
              <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 9px', borderRadius: 999, background: s.bg, color: s.dot, textTransform: 'uppercase', letterSpacing: 0.4 }}>{s.label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginTop: 7 }}>
              {a.count != null && <span style={metaBadge}>{a.count} {a.count === 1 ? 'item' : 'items'}</span>}
              {a.amount ? <span style={{ ...metaBadge, background: s.bg, color: s.dot }}>{money(a.amount)} at stake</span> : null}
              <span style={{ fontSize: 13, color: '#3a3f4a', lineHeight: 1.55 }}>{a.detail}</span>
            </div>
          </div>
          {a.link && (
            <button onClick={() => go(typeof a.link === 'string' ? a.link : a.link.route, a.focus || { kind: a.type, sample: a.sample })} title="Open the screen where you fix this" className={TAP} style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 5, padding: '9px 15px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, background: '#2563eb', color: '#fff' }}>Open &amp; fix <ChevronRight size={15} /></button>
          )}
        </div>

        {/* What this means + What to do — the full narration */}
        {(a.why || a.suggestion) && (
          <div style={{ display: 'grid', gap: 8, marginTop: 12 }} className="tablet:grid-cols-2">
            {a.why && (
              <div style={{ borderRadius: 9, background: '#f7f8fa', border: '1px solid ' + LINE, padding: '10px 12px' }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: DIM, marginBottom: 3 }}>What this means</div>
                <div style={{ fontSize: 12.5, color: DARK, lineHeight: 1.55 }}>{a.why}</div>
              </div>
            )}
            {a.suggestion && (
              <div style={{ borderRadius: 9, background: '#f0f6ff', border: '1px solid #d6e4ff', padding: '10px 12px' }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase', color: '#2563eb', marginBottom: 3 }}>Suggested action</div>
                <div style={{ fontSize: 12.5, color: DARK, lineHeight: 1.55 }}>{a.suggestion}</div>
              </div>
            )}
          </div>
        )}

        {/* Affected entries */}
        {samples.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginTop: 11 }}>
            <span style={{ fontSize: 10.5, fontWeight: 700, color: DIM, textTransform: 'uppercase', letterSpacing: 0.4 }}>Affected:</span>
            {samples.map((x, i) => <span key={i} style={{ fontSize: 11.5, fontWeight: 600, color: DARK, background: '#fff', border: '1px solid ' + LINE, borderRadius: 6, padding: '2px 8px' }}>{x}</span>)}
            {a.count != null && a.count > samples.length && <span style={{ fontSize: 11, color: DIM, fontWeight: 600 }}>+{a.count - samples.length} more</span>}
          </div>
        )}
      </div>
    );
  };

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
            <div style={{ fontSize: 10.5, color: DIM, marginTop: 4 }}>Detected {fdt(r.firstSeenAt)} · Fixed {fdt(r.resolvedAt)} · open for {fmtDur(r.openMs)}</div>
            <div style={{ fontSize: 11, color: DARK, marginTop: 2, fontWeight: 600 }}>
              {r.resolvedBy ? <>Fixed by <span style={{ color: '#2563eb' }}>{r.resolvedBy}</span>{r.resolvedHow ? <span style={{ color: DIM, fontWeight: 500 }}> · {r.resolvedHow}</span> : null}</> : <span style={{ color: DIM, fontWeight: 500 }}>Auto-resolved — no linked transaction found</span>}
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

  const sectionTitle = (Icon, txt) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '18px 2px 9px' }}>
      <Icon size={15} style={{ color: '#2563eb' }} />
      <span style={{ fontSize: 12.5, fontWeight: 800, color: DARK }}>{txt}</span>
    </div>
  );

  const renderOverview = () => {
    const trend = trendQ.data || { weeks: [], avgFixHrs: 0, openNow: 0, fixedTotal: 0 };
    const tmax = Math.max(1, ...trend.weeks.flatMap((w) => [w.opened, w.fixed]));
    // Scoped to the selected branch — the cross-branch comparison rows would
    // leak other branches' issue counts/exposure (this page always runs with a
    // specific branch; the org-wide table belongs to a group view).
    const branches = (branchesQ.data || []).filter((b) => !code || b.branch === code);
    const dc = an.dataCapture || {};
    const CAP = [
      ['Cannot post', dc.unposted, ['needs-attention']],
      ['Awaiting approval', dc.pendingApproval, ['pending']],
      ['Bad entries', dc.badEntries, ['dup-voucher', 'missing-costcentre', 'booking-unbilled', 'zero-voucher', 'backdated']],
      ['Masters incomplete', dc.missingMasters, ['supplier-credit', 'client-credit', 'company-profile', 'party-tax-id']],
      ['Idle ledgers', dc.idleLedgers, ['idle-ledger']],
      ['Unreconciled', dc.unreconciled, ['recon-bank', 'recon-client', 'recon-supplier', 'recon-tally', 'recon-interbranch', 'recon-tax']],
    ];
    const allCapTypes = CAP.flatMap((c) => c[2]);
    return (
      <>
        <div style={{ fontSize: 12, color: DIM, margin: '0 2px 10px', lineHeight: 1.5 }}>Every number below is clickable — tap it to see the exact issues, each with a plain-language explanation and a suggested fix.</div>
        {/* Scrutiny score banner */}
        <div className="grid grid-cols-2 gap-3 tablet:grid-cols-4" style={{ marginBottom: 6 }}>
          <button onClick={() => drillSev('all')} className={TAP} style={{ textAlign: 'left', cursor: 'pointer', gridColumn: 'span 2', borderRadius: 12, padding: '16px 18px', border: '1px solid ' + LINE, background: '#fff', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 66, height: 66, borderRadius: 999, border: `5px solid ${scoreColor(an.score)}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 24, fontWeight: 800, color: scoreColor(an.score) }}>{an.score}</span>
            </div>
            <div>
              <div style={{ fontSize: 14.5, fontWeight: 800, color: DARK }}>Scrutiny score</div>
              <div style={{ fontSize: 12.5, color: DIM, marginTop: 2 }}>{sc.open} open issue{sc.open !== 1 ? 's' : ''} · {money(an.exposure)} at stake</div>
              <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 700, marginTop: 4 }}>View all open issues →</div>
            </div>
          </button>
          <button onClick={() => drillTypes('Data-capture issues', allCapTypes)} className={TAP} style={{ textAlign: 'left', cursor: 'pointer', borderRadius: 12, padding: '14px 16px', border: '1px solid ' + LINE, background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: scoreColor(an.dataCapture?.score ?? 100) }}>{an.dataCapture?.score ?? 100}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: DIM }}>Data-capture</div>
          </button>
          <button onClick={() => setTab('fixed')} className={TAP} style={{ textAlign: 'left', cursor: 'pointer', borderRadius: 12, padding: '14px 16px', border: '1px solid ' + LINE, background: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: trend.fixedTotal >= trend.openNow ? GREEN : AMBER }}>{trend.avgFixHrs ? `${trend.avgFixHrs}h` : '—'}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: DIM }}>Avg time to fix</div>
          </button>
        </div>

        {/* Area breakdown */}
        {sectionTitle(Layers, 'Scrutiny by area')}
        {an.areas.length === 0
          ? <div className="rounded-brand border border-surface-border bg-surface p-5 text-center text-ink-muted shadow-card" style={{ fontSize: 12.5, color: GREEN, fontWeight: 700 }}>✓ All areas clean — nothing to scrutinise for {code}.</div>
          : (
            <div className="grid grid-cols-1 gap-3 tablet:grid-cols-2 desktop:grid-cols-3 wide:grid-cols-4">
              {an.areas.map((a) => (
                <button key={a.key} onClick={() => drillArea(a.key)} className={TAP} style={{ textAlign: 'left', cursor: 'pointer', borderRadius: 12, border: '1px solid ' + LINE, background: '#fff', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 800, color: DARK }}>{a.label}</span>
                    <span style={{ fontSize: 16, fontWeight: 800, color: scoreColor(a.score) }}>{a.score}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap', fontSize: 12, color: DIM }}>
                    <span style={{ fontWeight: 700, color: DARK }}>{a.open} open</span>
                    {a.error > 0 && <span style={{ color: RED }}>● {a.error}</span>}
                    {a.warn > 0 && <span style={{ color: AMBER }}>● {a.warn}</span>}
                    {a.info > 0 && <span style={{ color: '#2563eb' }}>● {a.info}</span>}
                    {a.exposure > 0 && <span style={{ marginLeft: 'auto', fontWeight: 700, color: DARK }}>{money(a.exposure)}</span>}
                  </div>
                  <div style={{ fontSize: 11, color: '#2563eb', fontWeight: 700 }}>See these issues →</div>
                </button>
              ))}
            </div>
          )}

        {/* Data-capture completeness */}
        {sectionTitle(Database, 'Data-capture completeness')}
        <div className="grid grid-cols-2 gap-3 tablet:grid-cols-3 desktop:grid-cols-6">
          {CAP.map(([lab, n, types]) => {
            const has = (n || 0) > 0;
            return (
              <button key={lab} onClick={() => has && drillTypes(lab, types)} disabled={!has} className={TAP} style={{ textAlign: 'left', cursor: has ? 'pointer' : 'default', borderRadius: 12, border: '1px solid ' + (has ? '#f0e2c4' : LINE), background: has ? '#fffdf7' : '#fff', padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontSize: 23, fontWeight: 800, color: has ? AMBER : GREEN }}>{n || 0}</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: DIM, lineHeight: 1.3 }}>{lab}</div>
              </button>
            );
          })}
        </div>

        {/* Trend */}
        {sectionTitle(TrendingUp, 'Issues opened vs fixed (8 weeks)')}
        <div className="rounded-brand border border-surface-border bg-surface p-3.5 shadow-card">
          {trend.weeks.length === 0
            ? <div style={{ fontSize: 11.5, color: DIM, textAlign: 'center', padding: 8 }}>No history yet — the trend builds as issues are detected and fixed.</div>
            : (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 86 }}>
                  {trend.weeks.map((w, i) => (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 64 }}>
                        <div title={`${w.opened} opened`} style={{ width: 9, height: `${(w.opened / tmax) * 100}%`, minHeight: w.opened ? 3 : 0, background: '#f0c36d', borderRadius: '2px 2px 0 0' }} />
                        <div title={`${w.fixed} fixed`} style={{ width: 9, height: `${(w.fixed / tmax) * 100}%`, minHeight: w.fixed ? 3 : 0, background: GREEN, borderRadius: '2px 2px 0 0' }} />
                      </div>
                      <span style={{ fontSize: 8.5, color: DIM }}>{(w.weekStart || '').slice(5)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 10.5, color: DIM }}>
                  <span><span style={{ color: '#f0c36d', fontWeight: 800 }}>■</span> Opened</span>
                  <span><span style={{ color: GREEN, fontWeight: 800 }}>■</span> Fixed</span>
                  <span style={{ marginLeft: 'auto' }}>{trend.openNow} open now · {trend.fixedTotal} fixed all-time</span>
                </div>
              </>
            )}
        </div>

        {/* Per-branch comparison */}
        {sectionTitle(GitBranch, 'Open issues by branch')}
        <div className="rounded-brand border border-surface-border bg-surface shadow-card" style={{ overflowX: 'auto' }}>
          {branches.length === 0
            ? <div style={{ fontSize: 11.5, color: DIM, textAlign: 'center', padding: 14 }}>Branch comparison builds as each branch is scrutinised.</div>
            : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  {['Branch', 'Open', 'Critical', 'Warnings', 'Exposure'].map((h, i) => <th key={h} style={{ padding: '7px 12px', textAlign: i === 0 ? 'left' : 'right', fontSize: 10, fontWeight: 700, color: DIM, textTransform: 'uppercase', borderBottom: '1px solid ' + LINE, whiteSpace: 'nowrap' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {branches.map((b) => {
                    const here = b.branch === code;
                    return (
                      <tr key={b.branch} style={{ background: here ? '#f0f4ff' : '#fff' }}>
                        <td style={{ padding: '7px 12px', fontSize: 12, fontWeight: here ? 800 : 600, color: DARK, borderBottom: '1px solid #dfe2e7' }}>{b.branch}{here ? ' ·' : ''}</td>
                        <td style={{ padding: '7px 12px', fontSize: 12, textAlign: 'right', fontWeight: 700, borderBottom: '1px solid #dfe2e7' }}>{b.open}</td>
                        <td style={{ padding: '7px 12px', fontSize: 12, textAlign: 'right', color: b.critical ? RED : DIM, fontWeight: 700, borderBottom: '1px solid #dfe2e7' }}>{b.critical}</td>
                        <td style={{ padding: '7px 12px', fontSize: 12, textAlign: 'right', color: b.warning ? AMBER : DIM, borderBottom: '1px solid #dfe2e7' }}>{b.warning}</td>
                        <td style={{ padding: '7px 12px', fontSize: 12, textAlign: 'right', borderBottom: '1px solid #dfe2e7' }}>{fmtMoney(symOf({ code: b.branch }), b.exposure)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
        </div>
        <div style={{ fontSize: 9.5, color: DIM, margin: '5px 2px 0' }}>Branch comparison reflects each branch’s most recent scan (open the branch to refresh its figures).</div>
      </>
    );
  };

  return (
    <PageLayout>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div>
          <h1 className="kbiz-page-title" style={{ margin: 0 }}>🔎 Scrutiny Dashboard</h1>
          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: DIM }}>Accounts · Operations · Data capture — {code} · {q.isFetching ? 'refreshing…' : `updated ${ago(data.generatedAt)}`}</p>
        </div>
        <button onClick={onRefresh} className={`${TAP} max-tablet:px-4`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', border: '1px solid ' + LINE, borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: DARK }}><RefreshCw size={13} /> Refresh</button>
      </div>

      {branchRequired ? (
        <div className="rounded-brand border border-surface-border bg-surface p-[34px] text-center shadow-card">
          <MapPin size={26} style={{ color: '#2563eb', margin: '0 auto 10px' }} />
          <div style={{ fontSize: 14, fontWeight: 800, color: DARK, marginBottom: 6 }}>Select a branch to scrutinise</div>
          <div style={{ fontSize: 12, color: DIM, maxWidth: 460, margin: '0 auto', lineHeight: 1.5 }}>
            The consolidated <b>All branches</b> view doesn’t scrutinise issues — scrutiny is per branch. Pick a branch from the selector at the top-right.
          </div>
        </div>
      ) : (
        <>
          {/* ── Tabs ── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 10, flexWrap: 'wrap', borderBottom: '2px solid ' + LINE, marginBottom: 10 }}>
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
              {TABS.map(([k, lab, n]) => (
                <button key={k} onClick={() => setTab(k)} className={`${TAP} shrink-0`} style={{ padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: tab === k ? DARK : DIM, borderBottom: '2px solid ' + (tab === k ? '#2563eb' : 'transparent'), marginBottom: -2 }}>{lab}{n != null ? <span style={{ fontSize: 10.5, color: DIM }}> ({n})</span> : null}</button>
              ))}
            </div>
            {tab !== 'overview' && (
              <div className="max-tablet:w-full" style={{ position: 'relative', marginBottom: 6 }}>
                <Search size={13} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: DIM }} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tab === 'fixed' ? 'Search fixed…' : 'Search issues…'} className={`${TAP} max-tablet:w-full`} style={{ padding: '7px 10px 7px 28px', border: '1px solid ' + LINE, borderRadius: 7, fontSize: 12, minWidth: 200 }} />
              </div>
            )}
          </div>

          {q.isLoading && <div style={{ padding: 30, textAlign: 'center', color: DIM }}>Loading scrutiny…</div>}
          {q.isError && (
            <div className="rounded-brand border border-surface-border bg-surface p-5 text-center shadow-card">
              <div style={{ color: RED, fontSize: 12.5, fontWeight: 600, marginBottom: 10 }}>⚠ {q.error?.message || 'Could not load.'}</div>
              <button onClick={onRefresh} className={TAP} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid ' + LINE, borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: DARK }}><RefreshCw size={13} /> Retry</button>
            </div>
          )}

          {/* ── Overview ── */}
          {!q.isLoading && !q.isError && tab === 'overview' && renderOverview()}

          {/* ── Open Issues ── */}
          {!q.isLoading && !q.isError && tab === 'open' && (
            <>
              {typeSel && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12, borderRadius: 9, border: '1px solid #d6e4ff', background: '#f0f6ff', padding: '10px 14px' }}>
                  <span style={{ fontSize: 12.5, color: DARK }}>Showing issues behind <b>{typeSel.label}</b> — <b>{openRows.length}</b> found</span>
                  <button onClick={() => setTypeSel(null)} className={TAP} style={{ marginLeft: 'auto', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#2563eb', background: '#fff', border: '1px solid #d6e4ff', borderRadius: 7, padding: '5px 11px' }}>Show all open issues ✕</button>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3 tablet:grid-cols-4" style={{ marginBottom: 12 }}>
                {SEV_CARDS.map(([k, lab, n, bg, color]) => {
                  const active = sev === k && !typeSel;
                  return (
                    <button key={k} onClick={() => pickSev(k)} aria-pressed={active} className={TAP}
                      style={{ textAlign: 'left', cursor: 'pointer', borderRadius: 12, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 4, background: active ? bg : '#fff', border: '1px solid ' + (active ? color : LINE), boxShadow: active ? `inset 0 0 0 1px ${color}` : 'none' }}>
                      <span style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: k === 'all' ? DARK : color }}>{n}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: DIM }}>{lab}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 6 }}>
                {domainOpts.map(([k, lab, n]) => (
                  <span key={k} {...clickable(() => pickDomain(k))} className={TAP_CHIP} style={chip(activeDomain === k && !typeSel, '#eef0f3', DARK)}>{lab}<span style={{ marginLeft: 5, opacity: 0.55 }}>{n}</span></span>
                ))}
              </div>
              {groups.length === 0
                ? <div className="rounded-brand border border-surface-border bg-surface p-[30px] text-center text-ink-muted shadow-card" style={{ marginTop: 8 }}>✓ All clear — no open issues for {code}.</div>
                : groups.map((g) => (
                  <section key={g.key} style={{ marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '18px 2px 10px' }}>
                      <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: DIM }}>{g.label}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 800, color: DIM, background: '#eef0f3', borderRadius: 999, padding: '1px 8px' }}>{g.items.length}</span>
                      <span style={{ flex: 1, height: 1, background: LINE }} />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{g.items.map((a) => renderOpenCard(a))}</div>
                  </section>
                ))}
            </>
          )}

          {/* ── Fixed ── */}
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
