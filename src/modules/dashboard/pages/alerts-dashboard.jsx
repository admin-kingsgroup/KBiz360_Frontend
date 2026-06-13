import React, { useMemo, useState } from 'react';
import { RefreshCw, Check, Clock, ChevronRight, Search } from 'lucide-react';
import { useAlerts, useSetAlertStatus } from '../../../core/useAccounting';
import { setNavFocus } from '../../../core/ux/navFocus';
import { card } from '../../../core/styles';

const DARK = '#0d1326', DIM = '#5a6691', LINE = '#e1e3ec';
const SEV = {
  error: { dot: '#A32D2D', bg: '#FCEBEB', label: 'Critical' },
  warn: { dot: '#B7791F', bg: '#FAEEDA', label: 'Warning' },
  info: { dot: '#185FA5', bg: '#E6F1FB', label: 'To review' },
};
const DOMAINS = [
  ['all', 'All'],
  ['acct', 'Accounting', ['tb-unbalanced', 'needs-attention', 'pending']],
  ['masters', 'Masters', ['idle-ledger', 'supplier-credit', 'client-credit', 'company-profile']],
  ['targets', 'Targets', ['sales-target-missing']],
  ['tax', 'Tax', ['company-profile']],
  ['arap', 'AR / AP', ['receivables', 'payables', 'onacc-rcpt', 'onacc-pay']],
];
const REMIND_PRESETS = [['1 day', 1], ['3 days', 3], ['Next week', 7], ['2 weeks', 14]];

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

  const domainKeys = useMemo(() => {
    const d = DOMAINS.find((x) => x[0] === domain);
    return d && d[2] ? new Set(d[2]) : null;
  }, [domain]);

  const rows = useMemo(() => all.filter((a) => {
    if ((a.status || 'pending') !== tab) return false;
    if (sev !== 'all' && a.severity !== sev) return false;
    if (domainKeys && !domainKeys.has(a.type)) return false;
    if (search) { const s = search.toLowerCase(); if (!(`${a.title} ${a.detail}`.toLowerCase().includes(s))) return false; }
    return true;
  }), [all, tab, sev, domainKeys, search]);

  const act = (a, status, remindUntil = '') => {
    setRemindFor(null);
    setStatus.mutate({ alertKey: a.key, branch: code, status, remindUntil, signature: a.signature, magnitude: a.magnitude });
  };

  // Open the fix screen, carrying the entity to focus (P2 deep-link).
  const open = (a) => {
    const route = typeof a.link === 'string' ? a.link : a.link.route;
    setNavFocus(route, a.focus || { kind: a.type, sample: a.sample });
    if (setRoute) setRoute(route);
  };

  const TABS = [['pending', 'Pending', sc.pending], ['remind', 'Remind Later', sc.remind], ['finished', 'Finished', sc.finished]];
  const chip = (active, bg, color) => ({ padding: '4px 11px', borderRadius: 999, fontSize: 11.5, fontWeight: 700, cursor: 'pointer', border: '1px solid ' + (active ? color : LINE), background: active ? bg : '#fff', color: active ? color : DIM });

  return (
    <div style={{ padding: '14px 16px', maxWidth: 1100, margin: '0 auto' }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: DARK }}>🔔 Alerts Dashboard</h1>
          <p style={{ margin: '2px 0 0', fontSize: 11.5, color: DIM }}>{code} · {q.isFetching ? 'refreshing…' : `updated ${ago(data.generatedAt)}`}</p>
        </div>
        <button onClick={() => q.refetch()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', border: '1px solid ' + LINE, borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: DARK }}><RefreshCw size={13} /> Refresh</button>
      </div>

      {/* severity chips */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <span onClick={() => setSev('all')} style={chip(sev === 'all', '#eef1f6', DARK)}>All {all.length}</span>
        <span onClick={() => setSev('error')} style={chip(sev === 'error', SEV.error.bg, SEV.error.dot)}>🔴 {data.counts?.error || 0} Critical</span>
        <span onClick={() => setSev('warn')} style={chip(sev === 'warn', SEV.warn.bg, SEV.warn.dot)}>🟠 {data.counts?.warn || 0} Warnings</span>
        <span onClick={() => setSev('info')} style={chip(sev === 'info', SEV.info.bg, SEV.info.dot)}>🔵 {data.counts?.info || 0} To review</span>
      </div>

      {/* tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid ' + LINE, marginBottom: 10 }}>
        {TABS.map(([k, lab, n]) => (
          <button key={k} onClick={() => setTab(k)} style={{ padding: '8px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: tab === k ? DARK : DIM, borderBottom: '2px solid ' + (tab === k ? '#185FA5' : 'transparent'), marginBottom: -2 }}>{lab} <span style={{ fontSize: 10.5, color: DIM }}>({n})</span></button>
        ))}
      </div>

      {/* domain filter + search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {DOMAINS.map(([k, lab]) => (
            <span key={k} onClick={() => setDomain(k)} style={chip(domain === k, '#eef1f6', DARK)}>{lab}</span>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 9, top: 9, color: DIM }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search alerts…" style={{ padding: '7px 10px 7px 28px', border: '1px solid ' + LINE, borderRadius: 7, fontSize: 12, minWidth: 200 }} />
        </div>
      </div>

      {/* list */}
      {q.isLoading && <div style={{ padding: 30, textAlign: 'center', color: DIM }}>Loading alerts…</div>}
      {q.isError && <div style={{ padding: 16, color: SEV.error.dot }}>⚠ {q.error?.message}</div>}
      {!q.isLoading && rows.length === 0 && (
        <div style={{ ...card, padding: 30, textAlign: 'center', color: DIM }}>
          {tab === 'pending' ? '✓ All clear — no open alerts for this branch.' : tab === 'remind' ? 'Nothing snoozed.' : 'Nothing marked finished.'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((a) => {
          const s = SEV[a.severity] || SEV.info;
          return (
            <div key={a.key} style={{ ...card, padding: '11px 14px', display: 'flex', alignItems: 'flex-start', gap: 12, borderLeft: `4px solid ${s.dot}` }}>
              <span style={{ width: 9, height: 9, borderRadius: 999, background: s.dot, marginTop: 5, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{a.title}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, padding: '1px 7px', borderRadius: 999, background: s.bg, color: s.dot, textTransform: 'uppercase' }}>{s.label}</span>
                  {a.remindUntil && tab === 'remind' && <span style={{ fontSize: 10, color: DIM }}>· until {new Date(a.remindUntil).toLocaleDateString('en-IN')}</span>}
                </div>
                <div style={{ fontSize: 11.5, color: '#384677', marginTop: 2 }}>{a.detail}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, position: 'relative' }}>
                {a.link && <button onClick={() => open(a)} title="Open & fix" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 11px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, background: '#185FA5', color: '#fff' }}>Open <ChevronRight size={13} /></button>}
                {tab !== 'finished' && <button onClick={() => act(a, 'finished')} title="Mark finished" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid ' + LINE, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, background: '#fff', color: '#27500A' }}><Check size={13} /> Finish</button>}
                {tab !== 'remind' && <button onClick={() => setRemindFor(remindFor === a.key ? null : a.key)} title="Remind later" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 6, border: '1px solid ' + LINE, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, background: '#fff', color: '#B7791F' }}><Clock size={13} /> Remind</button>}
                {tab !== 'pending' && <button onClick={() => act(a, 'pending')} title="Move back to pending" style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid ' + LINE, cursor: 'pointer', fontSize: 11.5, fontWeight: 600, background: '#fff', color: DIM }}>Reopen</button>}
                {remindFor === a.key && (
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: '#fff', border: '1px solid ' + LINE, borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 10, overflow: 'hidden', minWidth: 130 }}>
                    {REMIND_PRESETS.map(([lab, d]) => (
                      <div key={d} onClick={() => act(a, 'remind', futureISO(d))} style={{ padding: '8px 12px', fontSize: 11.5, cursor: 'pointer', color: DARK }} onMouseEnter={(e) => e.currentTarget.style.background = '#f0f4ff'} onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}>{lab}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
