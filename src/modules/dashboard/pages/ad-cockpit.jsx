// ─── AD Cockpit (Beta) — sectioned dark "Command Bridge" owner cockpit ──────────
// Additive, owner-only route (/dashboard/cockpit) that reuses the SAME live hooks as
// the Owner Dashboard, so the existing AD Dashboard is untouched. Group-wide oversight,
// branch-wise, currencies NEVER summed: branches roll up into currency REGIONS
// (₹ India / $ Africa). Period presets (ALL/CM/QTD/FY/LFY) + region→branch drill.
import React, { useState, useMemo } from 'react';
import { BRANCHES, branchMainCurrency, currencySymbol } from '../../../core/data';
import { periodRange } from '../../../core/period';
import { compactAmt } from '../../../core/format';
import { isLiquidRow } from '../../../core/ledgerKind';
import { useModulePL, useBalanceSheet, useAgeing, useTrialBalance } from '../../../core/useAccounting';
import { useDirectorDashboard } from '../hooks/use-director-dashboard';
import { DashboardSkeleton } from '../../../core/ux/DashboardSkeleton';
import { DashboardError } from '../../../core/ux/DashboardError';

const PRESETS = [['all', 'ALL'], ['mtd', 'CM'], ['qtd', 'QTD'], ['cfy', 'FY'], ['lfy', 'LFY']];
const REGION_META = { INR: { key: 'IN', label: 'India', flag: '🇮🇳', accent: '#4d9bff' }, USD: { key: 'AF', label: 'Africa', flag: '🌍', accent: '#ffbe4d' } };
const REGIONS = Object.entries(REGION_META)
  .map(([cur, m]) => ({ cur, ...m, codes: BRANCHES.filter((b) => branchMainCurrency(b) === cur).map((b) => b.code) }))
  .filter((r) => r.codes.length);
const NAV = [['pulse', 'Pulse'], ['perf', 'Performance'], ['cash', 'Cash & WC'], ['capital', 'Capital'], ['commercial', 'Commercial'], ['gov', 'Governance']];

const money = (cur, n) => compactAmt(n, { currency: currencySymbol(cur) });
const pct = (n) => `${(Number(n) || 0).toFixed(1)}%`;
const sevColor = { error: '#ff6b6b', warn: '#ffd166', info: '#7fb4ff', crit: '#ff6b6b', serious: '#ff9f45' };
const byCode = (arr, code) => (Array.isArray(arr) ? arr.find((x) => x.branch === code) : null) || {};
const liquidOf = (rows) => (Array.isArray(rows) ? rows : []).filter(isLiquidRow).reduce((s, r) => s + ((r.closingDebit || 0) - (r.closingCredit || 0)), 0);
const netWorthOf = (liabs) => (Array.isArray(liabs) ? liabs : []).filter((l) => /capital|reserve|profit|equity|surplus/i.test(l.group || l.name || '')).reduce((s, l) => s + (l.amount || 0), 0);

const CSS = `
.adc,.adc *{box-sizing:border-box}
.adc{--bg:#07080a;--panel:#111318;--panel2:#0c0d10;--line:#22252d;--ink:#e7eaf0;--dim:#8b93a3;--ok:#2ee6a6;--warn:#ffd166;--crit:#ff6b6b;--blue:#2a78d6;
  background:var(--bg);color:var(--ink);font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.45;min-height:100vh;margin:-16px -16px 0;padding:0 0 60px}
.adc .mono{font-variant-numeric:tabular-nums}
.adc .hdr{position:sticky;top:0;z-index:5;background:#0a0b0e;border-bottom:1px solid var(--line)}
.adc .hrow{display:flex;align-items:center;gap:14px;flex-wrap:wrap;padding:12px 22px}
.adc .brand{font-weight:800;font-size:14px;display:flex;align-items:center;gap:9px}
.adc .brand .dot{width:9px;height:9px;border-radius:50%;background:var(--ok)}
.adc .brand small{color:var(--dim);font-weight:600;font-size:11px}
.adc .spacer{flex:1}
.adc .pills{display:flex;background:var(--panel2);border:1px solid var(--line);border-radius:9px;overflow:hidden}
.adc .pills button{appearance:none;border:0;background:transparent;color:var(--dim);font:inherit;font-weight:700;font-size:12px;padding:7px 13px;cursor:pointer;border-right:1px solid var(--line)}
.adc .pills button:last-child{border-right:0}
.adc .pills button.on{background:var(--blue);color:#fff}
.adc .plabel{color:var(--dim);font-size:11.5px;font-weight:600;padding:0 22px 9px}
.adc .plabel b{color:var(--ink)}
.adc .sectabs{display:flex;gap:2px;padding:0 16px;overflow-x:auto}
.adc .sectabs button{appearance:none;border:0;background:transparent;color:var(--dim);font:inherit;font-weight:700;font-size:12.5px;padding:11px 15px;cursor:pointer;border-bottom:2px solid transparent;white-space:nowrap}
.adc .sectabs button.on{color:var(--ink);border-bottom-color:var(--blue)}
.adc .stage{max-width:1280px;margin:0 auto;padding:16px 22px}
.adc .crumb{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:12px;font-size:12.5px}
.adc .cb{appearance:none;background:none;border:0;color:var(--dim);font:inherit;font-weight:700;cursor:pointer;padding:2px 4px}
.adc .cb.on{color:var(--ink)}.adc .crumb .sep{color:#3a3f49}.adc .crumb-hint{color:#4b515c;font-size:11px;font-style:italic}
.adc .hero{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:8px}
.adc .hcard{background:var(--panel);border:1px solid var(--line);border-radius:13px;padding:14px 16px}
.adc .hcard.click{cursor:pointer;transition:border-color .12s,transform .12s}
.adc .hcard.click:hover{border-color:var(--blue);transform:translateY(-1px)}
.adc .hcard.span{grid-column:1/-1}
.adc .hcard-hd{font-size:12.5px;margin-bottom:11px}.adc .drill{float:right;color:var(--dim);font-size:11px;font-weight:700}
.adc .hk-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.adc .hk{background:var(--panel2);border:1px solid var(--line);border-radius:9px;padding:9px 10px}
.adc .hk-l{font-size:9px;letter-spacing:.04em;text-transform:uppercase;color:var(--dim);font-weight:700}
.adc .hk-v{font-size:16px;font-weight:700;margin-top:3px}
.adc .chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px;padding-top:11px;border-top:1px solid var(--line)}
.adc .chip{appearance:none;background:var(--panel2);border:1px solid var(--line);border-radius:9px;padding:8px 11px;color:var(--ink);font:inherit;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:7px}
.adc .chip:hover{border-color:var(--blue)}.adc .chip i{width:8px;height:8px;border-radius:2px}
.adc .panel{background:var(--panel);border:1px solid var(--line);border-radius:13px;padding:15px 17px;margin-top:14px}
.adc .ph{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;font-weight:800;padding-bottom:11px;margin-bottom:11px;border-bottom:1px solid var(--line)}
.adc .ph span{letter-spacing:.03em;text-transform:none;color:var(--dim);font-weight:600;font-size:10.5px}
.adc table{width:100%;border-collapse:collapse}
.adc th{font-size:10px;text-transform:uppercase;letter-spacing:.05em;color:var(--dim);font-weight:700;text-align:right;padding:7px 8px;border-bottom:1px solid var(--line)}
.adc th:first-child{text-align:left}
.adc td{padding:8px;border-bottom:1px solid var(--line);text-align:right;font-variant-numeric:tabular-nums;font-size:12.5px}
.adc td:first-child{text-align:left}
.adc tr:last-child td{border-bottom:none}
.adc tr[data-branch]{cursor:pointer}.adc tr[data-branch]:hover td{background:#151a22}
.adc .bcode{display:flex;align-items:center;gap:8px;font-weight:700}.adc .bcode i{width:8px;height:8px;border-radius:2px}.adc .bcur{color:var(--dim);font-size:10px}
.adc .g{color:var(--ok)}.adc .r{color:var(--crit)}.adc .amber{color:var(--warn)}
.adc .rich2{display:grid;grid-template-columns:1fr 1fr;gap:16px}.adc .rich2.one{grid-template-columns:1fr}
.adc .alert{display:flex;gap:11px;align-items:flex-start;padding:9px 0;border-bottom:1px solid var(--line)}.adc .alert:last-child{border-bottom:none}
.adc .alert .ic{width:24px;height:24px;border-radius:7px;display:grid;place-items:center;font-weight:800;flex:none;font-size:12px}
.adc .alert .t{font-weight:700;font-size:12.5px}.adc .alert .s{color:var(--dim);font-size:11px}
.adc .wf-row{display:grid;grid-template-columns:190px 1fr 120px;gap:14px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line)}.adc .wf-row:last-child{border-bottom:none}
.adc .wf-k{color:var(--dim)}.adc .wf-k.b{color:var(--ink);font-weight:800}
.adc .wf-bar{height:16px;background:var(--panel2);border-radius:5px;overflow:hidden}.adc .wf-bar span{display:block;height:100%;border-radius:5px}
.adc .wf-v{text-align:right;font-weight:700}.adc .wf-v.neg{color:var(--warn)}
.adc .note{color:var(--dim);font-size:10.5px;margin-top:8px;font-style:italic}
.adc .grphd{font-size:12px;margin-bottom:10px}
.adc .empty{color:var(--dim);font-size:12px;padding:10px 0}
@media(max-width:900px){.adc .hero,.adc .rich2{grid-template-columns:1fr}.adc .hk-grid{grid-template-columns:repeat(2,1fr)}}
`;

const HK = ({ l, v, c }) => <div className="hk"><div className="hk-l">{l}</div><div className="hk-v mono" style={c ? { color: c } : undefined}>{v}</div></div>;
const Panel = ({ title, sub, children }) => <div className="panel"><div className="ph">{title}<span>{sub}</span></div>{children}</div>;

export function AdCockpitPage({ setRoute }) {
  const [preset, setPreset] = useState('all');
  const [scope, setScope] = useState('group');   // group | region | branch
  const [region, setRegion] = useState(null);     // currency code
  const [branchSel, setBranchSel] = useState(null); // branch code
  const [section, setSection] = useState('pulse');

  const range = useMemo(() => periodRange(preset), [preset]);
  const { from, to, label } = range;

  const dir = useDirectorDashboard({ scope: 'ALL', from, to });
  const mpl = useModulePL('ALL', { from, to, summary: true }).data || {};
  const age = useAgeing('ALL', to).data || {};
  const bs = useBalanceSheet('ALL', { to }).data || {};
  const trial = useTrialBalance('ALL', { from, to }).data || {};
  const focusArg = scope === 'branch' && branchSel ? { code: branchSel } : 'ALL';
  const mplFocus = useModulePL(focusArg, { from, to }).data || {};

  const rows = useMemo(() => BRANCHES.map((bx) => {
    const code = bx.code, cur = branchMainCurrency(bx);
    const p = byCode(mpl.byBranch, code), a = byCode(age.byBranch, code), b = byCode(bs.byBranch, code), tr = byCode(trial.byBranch, code);
    const sales = p?.totals?.sales || 0, gp = p?.totals?.gp || 0, net = p?.bridge?.netProfit || 0;
    return {
      code, cur, sales, gp, net, gpPct: sales ? (gp / sales) * 100 : 0, opex: gp - net,
      cash: liquidOf(tr?.rows), recv: a?.receivables?.totals?.total || 0, over90: a?.receivables?.totals?.d90 || 0,
      pay: a?.payables?.totals?.total || 0, networth: netWorthOf(b?.liabilities),
    };
  }), [mpl.byBranch, age.byBranch, bs.byBranch, trial.byBranch]);

  const regionRoll = (cur) => {
    const rs = rows.filter((r) => r.cur === cur); const s = (k) => rs.reduce((a, r) => a + (r[k] || 0), 0);
    return { cur, sales: s('sales'), gp: s('gp'), net: s('net'), cash: s('cash'), recv: s('recv'), pay: s('pay'), networth: s('networth'), gpPct: s('sales') ? (s('gp') / s('sales')) * 100 : 0 };
  };
  const activeRegions = scope === 'group' ? REGIONS : REGIONS.filter((r) => r.cur === region);
  const regionOf = (cur) => REGION_META[cur] || { label: cur, flag: '', accent: '#888' };

  if (dir.isError) return <DashboardError error={dir.error} onRetry={dir.refetch} title="Could not load the AD Cockpit." />;
  if (dir.isLoading || !dir.data) return <DashboardSkeleton numKpis={12} />;
  const D = dir.data || {};

  // ── hero ──
  const hero = () => {
    if (scope === 'branch') {
      const r = rows.find((x) => x.code === branchSel) || {}; const cur = r.cur, Rm = regionOf(cur);
      return (
        <div className="hcard span"><div className="hcard-hd"><b style={{ color: '#9fb6d4' }}>{branchSel}</b> · {Rm.flag} {Rm.label} · {currencySymbol(cur)} {cur}</div>
          <div className="hk-grid">
            <HK l="Revenue" v={money(cur, r.sales)} /><HK l="Gross Profit" v={money(cur, r.gp)} /><HK l="Expenses" v={money(cur, r.opex)} c="#ffd166" /><HK l="Net Profit" v={money(cur, r.net)} c={r.net < 0 ? '#ff6b6b' : '#2ee6a6'} />
            <HK l="Cash & Bank" v={money(cur, r.cash)} /><HK l="Receivables" v={money(cur, r.recv)} /><HK l="Payables" v={money(cur, r.pay)} /><HK l="GP margin" v={pct(r.gpPct)} />
          </div></div>
      );
    }
    return activeRegions.map((R) => {
      const z = regionRoll(R.cur); const single = scope !== 'group';
      const chips = scope === 'region' ? (
        <div className="chips">{rows.filter((r) => r.cur === R.cur).map((r) => (
          <button key={r.code} className="chip" data-branch={r.code} onClick={() => drillBranch(r.code)}><i style={{ background: R.accent }} />{r.code} <b className={r.net < 0 ? 'r' : 'g'}>{money(R.cur, r.net)}</b></button>
        ))}</div>
      ) : null;
      return (
        <div key={R.cur} className={`hcard${scope === 'group' ? ' click' : ''}${single ? ' span' : ''}`} onClick={scope === 'group' ? () => drillRegion(R.cur) : undefined}>
          <div className="hcard-hd"><b style={{ color: R.accent }}>{R.flag} {R.label}</b> · {currencySymbol(R.cur)} {R.cur}{scope === 'group' ? <span className="drill">drill ›</span> : null}</div>
          <div className="hk-grid">
            <HK l="Revenue" v={money(R.cur, z.sales)} /><HK l="Gross Profit" v={money(R.cur, z.gp)} /><HK l="Net Profit" v={money(R.cur, z.net)} c={z.net < 0 ? '#ff6b6b' : undefined} /><HK l="Cash & Bank" v={money(R.cur, z.cash)} />
            <HK l="Receivables" v={money(R.cur, z.recv)} /><HK l="Payables" v={money(R.cur, z.pay)} /><HK l="Net Worth" v={money(R.cur, z.networth)} /><HK l="GP margin" v={pct(z.gpPct)} />
          </div>{chips}
        </div>
      );
    });
  };

  const drillRegion = (cur) => { setScope('region'); setRegion(cur); };
  const drillBranch = (code) => { const bx = BRANCHES.find((b) => b.code === code); setBranchSel(code); setRegion(branchMainCurrency(bx)); setScope('branch'); };
  const go = (route) => { if (typeof setRoute === 'function') setRoute(route); };

  // ── panels ──
  const branchBoard = () => {
    const curs = activeRegions.map((R) => R.cur);
    const brs = rows.filter((r) => curs.includes(r.cur));
    if (!brs.length) return <div className="empty">No branch data for this scope.</div>;
    return (<table><thead><tr><th>Branch</th><th>Revenue</th><th>GP</th><th>GP%</th><th>Expenses</th><th>Net Profit</th><th>Cash</th><th>Recv</th></tr></thead>
      <tbody>{brs.map((r) => (
        <tr key={r.code} data-branch={r.code} onClick={() => drillBranch(r.code)}>
          <td><span className="bcode"><i style={{ background: regionOf(r.cur).accent }} />{r.code}<span className="bcur">{currencySymbol(r.cur)}</span></span></td>
          <td>{money(r.cur, r.sales)}</td><td>{money(r.cur, r.gp)}</td><td>{pct(r.gpPct)}</td>
          <td className="amber">− {money(r.cur, r.opex)}</td><td className={r.net < 0 ? 'r' : 'g'}>{money(r.cur, r.net)}</td>
          <td>{money(r.cur, r.cash)}</td><td>{money(r.cur, r.recv)}</td>
        </tr>))}</tbody></table>);
  };

  const arapBlock = (R) => {
    const brs = rows.filter((r) => r.cur === R.cur);
    return (<div key={R.cur}><div className="grphd"><b style={{ color: R.accent }}>{R.flag} {R.label}</b> · {currencySymbol(R.cur)} {R.cur}</div>
      <table><thead><tr><th>Branch</th><th>Receivables</th><th>90+ overdue</th><th>Payables</th></tr></thead>
        <tbody>{brs.map((r) => (<tr key={r.code} data-branch={r.code} onClick={() => drillBranch(r.code)}>
          <td>{r.code}</td><td>{money(r.cur, r.recv)}</td><td className={r.over90 > 0 ? 'r' : ''}>{money(r.cur, r.over90)}</td><td>{money(r.cur, r.pay)}</td></tr>))}</tbody></table></div>);
  };

  const capitalBlock = (R) => { const z = regionRoll(R.cur); const roc = z.networth ? (z.net / z.networth) * 100 : 0;
    return (<div key={R.cur}><div className="grphd"><b style={{ color: R.accent }}>{R.flag} {R.label}</b> · {currencySymbol(R.cur)} {R.cur}</div>
      <div className="hk-grid"><HK l="Net Worth" v={money(R.cur, z.networth)} /><HK l={`Net Profit · ${label}`} v={money(R.cur, z.net)} c={z.net < 0 ? '#ff6b6b' : '#2ee6a6'} /><HK l="Cash & Bank" v={money(R.cur, z.cash)} /><HK l="Return on Net Worth" v={pct(roc)} c={roc < 0 ? '#ff6b6b' : '#2ee6a6'} /></div></div>);
  };

  const alertsPanel = () => {
    const list = Array.isArray(D.keyAlerts) ? D.keyAlerts : [];
    if (!list.length) return <div className="empty">No open alerts — books look clean for this period.</div>;
    return list.slice(0, 12).map((a, i) => { const sev = a.severity || a.sev || 'info'; const col = sevColor[sev] || '#7fb4ff';
      return (<div className="alert" key={a.key || i}><div className="ic" style={{ background: `${col}22`, color: col }}>{sev === 'error' || sev === 'crit' ? '!' : sev === 'warn' ? '▲' : 'i'}</div>
        <div><div className="t">{a.title || a.msg || a.type}</div><div className="s">{a.detail || a.sub || ''}</div></div></div>);
    });
  };

  const branchDetail = () => {
    const r = rows.find((x) => x.code === branchSel) || {}; const cur = r.cur;
    const steps = [
      { k: 'Revenue', v: r.sales, c: '#4d9bff' }, { k: '− Cost of Sales', v: -(r.sales - r.gp), c: '#7c6cf0' },
      { k: '= Gross Profit', v: r.gp, c: '#1baf7a', b: true }, { k: '− Operating Expenses', v: -r.opex, c: '#ffbe4d' },
      { k: '= Net Profit', v: r.net, c: r.net < 0 ? '#ff6b6b' : '#2ee6a6', b: true },
    ];
    const mx = Math.max(1, ...steps.map((s) => Math.abs(s.v)));
    const mods = (mplFocus.modules || []).slice().sort((a, b) => (b.gp || 0) - (a.gp || 0));
    return (<>
      <Panel title={`${branchSel} · Profit & Loss`} sub={`${label} · ${currencySymbol(cur)} ${cur}`}>
        {steps.map((s, i) => (<div className="wf-row" key={i}><span className={`wf-k${s.b ? ' b' : ''}`}>{s.k}</span>
          <span className="wf-bar"><span style={{ width: `${Math.abs(s.v) / mx * 100}%`, background: s.c }} /></span>
          <span className={`mono wf-v${s.v < 0 ? ' neg' : ''}`}>{money(cur, s.v)}</span></div>))}
      </Panel>
      <Panel title={`${branchSel} · Gross Profit by Module`} sub={label}>
        {mods.length ? (<table><thead><tr><th>Module</th><th>Sales</th><th>GP</th><th>GP%</th></tr></thead>
          <tbody>{mods.map((m) => (<tr key={m.key || m.name}><td>{m.name || m.key}</td><td>{money(cur, m.sales)}</td><td className={(m.gp || 0) < 0 ? 'r' : 'g'}>{money(cur, m.gp)}</td><td>{pct(m.gpPct || (m.sales ? m.gp / m.sales * 100 : 0))}</td></tr>))}</tbody></table>)
          : <div className="empty">No module breakdown for this branch/period.</div>}
      </Panel>
      <div className="panel"><a href="#" onClick={(e) => { e.preventDefault(); go('/dashboards/branch'); }} style={{ color: '#7fb4ff', fontWeight: 700 }}>Open full {branchSel} dashboard ↗</a><span className="note" style={{ marginLeft: 10 }}>Deep-links to the branch's P&L, ledger and AR/AP.</span></div>
    </>);
  };

  const sections = {
    pulse: () => (<>{Panel({ title: 'Key Alerts', sub: 'what needs attention · live', children: alertsPanel() })}
      <div className="note">Pulse = the glance. The hero band stays on every section; deeper detail lives in the other sections.</div></>),
    perf: () => (<>{Panel({ title: 'Branch Board', sub: `Revenue → GP → Expenses → Net Profit · ${label}`, children: branchBoard() })}</>),
    cash: () => (<>{Panel({ title: 'AR / AP · by branch', sub: `as-on ${to || 'today'} · currencies never summed`, children: <div className={`rich2${activeRegions.length === 1 ? ' one' : ''}`}>{activeRegions.map(arapBlock)}</div> })}</>),
    capital: () => (<>{Panel({ title: 'Capital & Returns', sub: `net worth & return · ${label}`, children: <div className={`rich2${activeRegions.length === 1 ? ' one' : ''}`}>{activeRegions.map(capitalBlock)}</div> })}
      <div className="note">Net worth is as-on; Net Profit &amp; Return reflect the selected period.</div></>),
    commercial: () => (<>{Panel({ title: 'Commercial', sub: 'drill to the full reports', children: (
      <div className="empty">Customer / supplier concentration and the SO/PO/GP pipeline open in their reports —
        {' '}<a href="#" onClick={(e) => { e.preventDefault(); go('/reports/gp'); }} style={{ color: '#7fb4ff', fontWeight: 700 }}>GP report ↗</a>.</div>) })}</>),
    gov: () => (<>{Panel({ title: 'Governance · Alerts & Control', sub: 'exceptions across every domain', children: alertsPanel() })}</>),
  };

  const crumb = (
    <div className="crumb">
      <button className={`cb ${scope === 'group' ? 'on' : ''}`} onClick={() => { setScope('group'); setRegion(null); setBranchSel(null); }}>All</button>
      {scope !== 'group' && <><span className="sep">▸</span><button className={`cb ${scope === 'region' ? 'on' : ''}`} onClick={() => { setScope('region'); setBranchSel(null); }}>{regionOf(region).flag} {regionOf(region).label}</button></>}
      {scope === 'branch' && <><span className="sep">▸</span><span className="cb on">{branchSel}</span></>}
      <span className="crumb-hint">{scope === 'group' ? '· click a region card to drill into its branches' : '· click a chip / row to drill · breadcrumb to go up'}</span>
    </div>
  );

  return (
    <div className="adc">
      <style>{CSS}</style>
      <div className="hdr">
        <div className="hrow">
          <div className="brand"><span className="dot" /> TK Group Central <small>· AD Cockpit (Beta)</small></div>
          <div className="spacer" />
          <div className="pills">{PRESETS.map(([k, lb]) => <button key={k} className={preset === k ? 'on' : ''} onClick={() => setPreset(k)}>{lb}</button>)}</div>
        </div>
        <div className="plabel">Showing <b>{label}</b> · currencies never summed (₹ India / $ Africa)</div>
        <div className="sectabs">{NAV.map(([k, lb]) => <button key={k} className={section === k ? 'on' : ''} onClick={() => { if (scope === 'branch') setScope('region'); setSection(k); }}>{lb}</button>)}</div>
      </div>
      <div className="stage">
        {crumb}
        <div className="hero">{hero()}</div>
        {scope === 'branch' ? branchDetail() : sections[section]()}
      </div>
    </div>
  );
}

export default AdCockpitPage;
