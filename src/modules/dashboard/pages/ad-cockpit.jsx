// ─── AD Cockpit (Beta) — sectioned dark "Command Bridge" owner cockpit ──────────
// Additive, owner-only route (/dashboard/cockpit) that reuses the SAME live hooks as
// the Owner Dashboard, so the existing AD Dashboard is untouched. Group-wide oversight,
// branch-wise, currencies NEVER summed: branches roll up into currency REGIONS
// (₹ India / $ Africa). Period presets (ALL/CM/QTD/FY/LFY) + region→branch drill.
import React, { useState, useMemo, useEffect } from 'react';
import { BRANCHES, branchMainCurrency, currencySymbol } from '../../../core/data';
import { periodRange } from '../../../core/period';
import { compactAmt } from '../../../core/format';
import { CUR_FY } from '../../../core/dates';
import { isLiquidRow } from '../../../core/ledgerKind';
import { useModulePL, useBalanceSheet, useAgeing, useTrialBalance, useBudgetVsActual, useAlerts } from '../../../core/useAccounting';
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
  background:var(--bg);color:var(--ink);font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;font-size:13px;line-height:1.45;min-height:100%;margin:0;padding:0 0 60px}
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
.adc .conc-row{display:grid;grid-template-columns:1.3fr 1fr auto 40px;gap:10px;align-items:center;padding:6px 0;font-size:12px;cursor:pointer}
.adc .conc-row:hover{background:#151a22}
.adc .conc-bar{height:9px;background:var(--panel2);border-radius:5px;overflow:hidden}.adc .conc-bar span{display:block;height:100%;border-radius:5px;background:#4d9bff}
.adc .conc-v{text-align:right;font-variant-numeric:tabular-nums}.adc .conc-s{text-align:right;color:var(--dim)}
.adc .bk-row{display:flex;align-items:center;gap:12px;padding:6px 0;border-bottom:1px solid var(--line);font-size:12px}.adc .bk-row:last-child{border-bottom:none}
.adc .bk-n{width:150px;flex:none}.adc .bk-bar{flex:1;height:12px;background:var(--panel2);border-radius:5px;overflow:hidden}.adc .bk-bar span{display:block;height:100%;border-radius:5px}.adc .bk-v{width:90px;text-align:right;font-weight:600;font-variant-numeric:tabular-nums}
.adc .ig-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.adc .ig-cell{background:var(--panel2);border:1px solid var(--line);border-radius:9px;padding:11px 12px}
.adc .ig-v{font-size:22px;font-weight:700;line-height:1}.adc .ig-k{font-size:11px;color:var(--ink);font-weight:600;margin-top:6px}
.adc .drawer-wrap{position:fixed;inset:0;z-index:40;background:rgba(0,0,0,.55)}
.adc .drawer{position:absolute;top:0;right:0;height:100%;width:min(400px,92vw);background:var(--panel);border-left:1px solid var(--line);padding:20px 22px;overflow-y:auto;box-shadow:-24px 0 60px rgba(0,0,0,.6)}
.adc .dh{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}
.adc .dt{font-size:16px;font-weight:800}
.adc .dclose{appearance:none;background:var(--panel2);border:1px solid var(--line);color:var(--dim);border-radius:8px;width:30px;height:30px;font-size:14px;cursor:pointer;flex:none}
.adc .drow{display:flex;justify-content:space-between;gap:12px;padding:10px 0;border-bottom:1px solid var(--line);font-size:13px}.adc .drow b{font-variant-numeric:tabular-nums}
.adc .dlink{display:inline-block;margin-top:16px;color:#7fb4ff;font-weight:700;text-decoration:none}
.adc .dchip{display:inline-block;font-size:9px;font-weight:800;letter-spacing:.05em;padding:3px 9px;border-radius:20px;background:#12233a;color:#7fb4ff;margin-top:10px}
@media(max-width:900px){.adc .hero,.adc .rich2{grid-template-columns:1fr}.adc .hk-grid{grid-template-columns:repeat(2,1fr)}.adc .ig-grid{grid-template-columns:repeat(2,1fr)}}
`;

const spark = (vals, color, w = 300, h = 46) => {
  const a = (vals || []).map(Number).filter((n) => !Number.isNaN(n));
  if (a.length < 2) return null;
  const min = Math.min(...a), max = Math.max(...a), rng = (max - min) || 1;
  const pts = a.map((v, i) => `${(i / (a.length - 1) * (w - 3) + 1.5).toFixed(1)},${(h - 3 - (v - min) / rng * (h - 6)).toFixed(1)}`).join(' ');
  return <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block', maxWidth: '100%' }}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>;
};
const HK = ({ l, v, c }) => <div className="hk"><div className="hk-l">{l}</div><div className="hk-v mono" style={c ? { color: c } : undefined}>{v}</div></div>;
const Panel = ({ title, sub, children }) => <div className="panel"><div className="ph">{title}<span>{sub}</span></div>{children}</div>;

export function AdCockpitPage({ setRoute }) {
  const [preset, setPreset] = useState('all');
  const [scope, setScope] = useState('group');   // group | region | branch
  const [region, setRegion] = useState(null);     // currency code
  const [branchSel, setBranchSel] = useState(null); // branch code
  const [section, setSection] = useState('pulse');
  const [drawer, setDrawer] = useState(null);
  const openDrawer = (d) => setDrawer(d);
  useEffect(() => { const k = (e) => { if (e.key === 'Escape') setDrawer(null); }; document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k); }, []);

  const range = useMemo(() => periodRange(preset), [preset]);
  const { from, to, label } = range;

  const dir = useDirectorDashboard({ scope: 'ALL', from, to });
  const mplQ = useModulePL('ALL', { from, to, summary: true });
  const ageQ = useAgeing('ALL', to);
  const mpl = mplQ.data || {};
  const age = ageQ.data || {};
  const bs = useBalanceSheet('ALL', { to }).data || {};
  const trial = useTrialBalance('ALL', { from, to }).data || {};
  const bud = useBudgetVsActual('ALL', { from, to, fy: CUR_FY.label }).data || {};
  const alertsData = useAlerts('ALL').data || {};        // rich /api/alerts (single source, carries domain)
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

  // Gate on the CORE financial hooks too — otherwise a failed module-PL / ageing fetch
  // would silently render every branch as ₹0 instead of an error.
  if (dir.isError || mplQ.isError || ageQ.isError) return <DashboardError error={dir.error || mplQ.error || ageQ.error} onRetry={() => { dir.refetch?.(); mplQ.refetch?.(); ageQ.refetch?.(); }} title="Could not load the AD Cockpit." />;
  if (dir.isLoading || mplQ.isLoading || ageQ.isLoading || !dir.data) return <DashboardSkeleton numKpis={12} />;
  const D = dir.data || {};
  const richAlerts = Array.isArray(alertsData.alerts) ? alertsData.alerts : (Array.isArray(D.keyAlerts) ? D.keyAlerts : []);

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
    const list = richAlerts;
    if (!list.length) return <div className="empty">No open alerts — books look clean for this period.</div>;
    return list.slice(0, 12).map((a, i) => { const sev = a.severity || a.sev || 'info'; const col = sevColor[sev] || '#7fb4ff';
      return (<div className="alert" key={a.key || i}><div className="ic" style={{ background: `${col}22`, color: col }}>{sev === 'error' || sev === 'crit' ? '!' : sev === 'warn' ? '▲' : 'i'}</div>
        <div><div className="t">{a.title || a.msg || a.type}</div><div className="s">{a.detail || a.sub || ''}</div></div></div>);
    });
  };

  // Customer / supplier concentration — ranked by share (% is currency-agnostic);
  // magnitudes are the consolidated ₹-equivalent the service already produces.
  const concBlock = (list, label, kind) => {
    // When drilled into a region, keep only that region's branches' entries (rows carry .branch).
    const activeCodes = scope === 'group' ? null : new Set(rows.filter((r) => activeRegions.some((R) => R.cur === r.cur)).map((r) => r.code));
    let arr = Array.isArray(list) ? list : [];
    if (activeCodes) arr = arr.filter((r) => !r.branch || activeCodes.has(r.branch));
    arr = arr.slice(0, 6);
    if (!arr.length) return <div className="empty">No {label} data for this scope.</div>;
    const val = (r) => r.revenue ?? r.spend ?? r.value ?? r.amount ?? 0;
    const tot = arr.reduce((s, r) => s + val(r), 0) || 1;
    const mx = Math.max(1, ...arr.map((r) => val(r)));
    const conc = Math.round(arr.slice(0, 3).reduce((s, r) => s + val(r), 0) / tot * 100);
    const risk = conc >= 60 ? 'HIGH' : conc >= 40 ? 'MODERATE' : 'LOW';
    return (<div>
      <div className="grphd"><b>{label}</b> <span style={{ color: 'var(--dim)' }}>top-3 = {conc}% · {risk} · consolidated (₹-equiv)</span></div>
      {arr.map((r) => { const share = r.share != null ? r.share : Math.round(val(r) / tot * 100);
        return (<div className="conc-row" key={r.name} onClick={() => go(kind === 'supplier' ? '/reports/pay' : '/reports/rec')}>
          <span>{r.name}</span><span className="conc-bar"><span style={{ width: `${Math.round(val(r) / mx * 100)}%` }} /></span>
          <span className="mono conc-v">{money('INR', val(r))}</span><span className="mono conc-s">{share}%</span></div>); })}
    </div>);
  };
  // SO/PO/GP pipeline — per region (whole queue, not date-bound). Currency-safe: each
  // region aggregates only its own branches, so ₹ and $ are never mixed.
  const pipelineBlock = (R) => {
    const list = Array.isArray(D.bookingsByBranch) ? D.bookingsByBranch : [];
    const brs = rows.filter((r) => r.cur === R.cur).map((r) => r.code);
    const agg = { aC: 0, aV: 0, pC: 0, pV: 0 };
    list.filter((b) => brs.includes(b.branch)).forEach((b) => {
      agg.aC += b.approved?.count || 0; agg.aV += b.approved?.sales || 0; agg.pC += b.pending?.count || 0; agg.pV += b.pending?.sales || 0;
    });
    return (<div key={R.cur}><div className="grphd"><b style={{ color: R.accent }}>{R.flag} {R.label}</b> · {currencySymbol(R.cur)} {R.cur}</div>
      <div className="hk-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <HK l="Pending · to approve" v={`${agg.pC} · ${money(R.cur, agg.pV)}`} c="#ffd166" />
        <HK l="Approved · to invoice" v={`${agg.aC} · ${money(R.cur, agg.aV)}`} c="#2ee6a6" />
      </div></div>);
  };
  // Bank balances come from the consolidated finance snapshot (all tagged ₹-equivalent,
  // not attributable to a branch/currency) — so this is one consolidated ₹-equiv list,
  // clearly labelled. Region-correct cash sits in the hero / branch board (trial-balance).
  const bankPanel = () => {
    const accs = (Array.isArray(D.bankAccounts) ? D.bankAccounts : []).slice().sort((a, b) => Math.abs(b.openingBal || 0) - Math.abs(a.openingBal || 0));
    if (!accs.length) return <div className="empty">No bank accounts in the snapshot.</div>;
    const mx = Math.max(1, ...accs.map((a) => Math.abs(a.openingBal || 0)));
    return (<div>
      {accs.map((a, i) => { const v = a.openingBal || 0; return (<div className="bk-row" key={a.bank || a.id || a.name || i}>
        <span className="bk-n">{a.bank || a.name || a.ledger || a.id || 'Bank'}</span>
        <span className="bk-bar"><span style={{ width: `${Math.max(Math.abs(v) / mx * 100, 3)}%`, background: v < 0 ? '#ff6b6b' : '#4d9bff' }} /></span>
        <span className="mono bk-v" style={v < 0 ? { color: '#ff6b6b' } : undefined}>{money('INR', v)}</span></div>); })}
      <div className="note">Consolidated ₹-equivalent snapshot. Per-branch cash (own currency) is on the hero band &amp; Branch Board.</div>
    </div>);
  };
  // Uses the rich /api/alerts feed (every alert carries `domain` + `type`), so the
  // domain-keyed tiles are accurate. Falls back to severity where domain is absent.
  const integrityTiles = () => {
    const list = richAlerts;
    const cnt = (fn) => list.filter(fn).length;
    const tiles = [
      { k: 'Open exceptions', v: list.length, sev: list.length ? 'warn' : 'ok' },
      { k: 'Errors', v: cnt((a) => ['error', 'crit'].includes(a.severity || a.sev)), sev: 'crit' },
      { k: 'Reconciliation', v: cnt((a) => a.domain === 'recon' || /recon/i.test(a.type || a.title || '')), sev: 'warn' },
      { k: 'Approvals pending', v: cnt((a) => a.domain === 'approvals' || ['pending', 'needs-attention'].includes(a.type)), sev: 'serious' },
      { k: 'Masters / Tax', v: cnt((a) => ['masters', 'tax'].includes(a.domain) || /gstin|pan|master|filing|gst|tds/i.test(a.type || a.title || '')), sev: 'warn' },
    ];
    return (<div className="ig-grid">{tiles.map((t) => (<div className="ig-cell" key={t.k}><div className="ig-v" style={{ color: sevColor[t.sev] || '#7fb4ff' }}>{t.v}</div><div className="ig-k">{t.k}</div></div>))}</div>);
  };
  // Revenue trend — consolidated ₹-equiv (current vs last year), same source as the
  // Owner Dashboard chart. A magnitude trend, clearly labelled; not a cross-currency total.
  const trendPanel = () => {
    const t = Array.isArray(D.revenueTrend) ? D.revenueTrend : [];
    const cy = t.map((p) => p.cy ?? p.revenue ?? p.value ?? 0);
    if (cy.length < 2) return <div className="empty">Not enough history for a trend.</div>;
    const last = cy[cy.length - 1], prev = cy[cy.length - 2] || 0, mom = prev ? (last - prev) / Math.abs(prev) * 100 : 0;
    return (<div>
      <div className="hk-grid" style={{ gridTemplateColumns: '1fr' }}><HK l="Current-year revenue · latest month" v={money('INR', last)} c={mom >= 0 ? '#2ee6a6' : '#ff6b6b'} /></div>
      <div style={{ marginTop: 12 }}>{spark(cy, '#4d9bff', 320, 48)}</div>
      <div className="note">Consolidated ₹-equivalent (current vs last year). {mom >= 0 ? '▲' : '▼'} {Math.abs(mom).toFixed(1)}% vs prior month.</div>
    </div>);
  };
  // Region Module GP — aggregate each region's branches' module splits (currency-safe,
  // one region = one currency). Rows drill into a module drawer.
  const regionModuleGP = (R) => {
    const brs = new Set(rows.filter((r) => r.cur === R.cur).map((r) => r.code));
    const acc = {};
    (Array.isArray(mpl.byBranch) ? mpl.byBranch : []).filter((b) => brs.has(b.branch)).forEach((b) => {
      (b.modules || []).forEach((m) => { const k = m.name || m.key; if (!k) return; const e = acc[k] || (acc[k] = { name: k, sales: 0, gp: 0 }); e.sales += m.sales || 0; e.gp += m.gp || 0; });
    });
    const list = Object.values(acc).sort((a, b) => b.gp - a.gp);
    if (!list.length) return <div key={R.cur} className="empty">No module breakdown for {R.label}.</div>;
    return (<div key={R.cur}><div className="grphd"><b style={{ color: R.accent }}>{R.flag} {R.label}</b> · {currencySymbol(R.cur)} {R.cur}</div>
      <table><thead><tr><th>Module</th><th>Sales</th><th>GP</th><th>GP%</th></tr></thead>
        <tbody>{list.map((m) => (<tr key={m.name} style={{ cursor: 'pointer' }} onClick={() => openDrawer({ type: 'module', cur: R.cur, m })}><td>{m.name}</td><td>{money(R.cur, m.sales)}</td><td className={m.gp < 0 ? 'r' : 'g'}>{money(R.cur, m.gp)}</td><td>{pct(m.sales ? m.gp / m.sales * 100 : 0)}</td></tr>))}</tbody></table></div>);
  };
  const overdueBlock = (R) => {
    const brs = new Set(rows.filter((r) => r.cur === R.cur).map((r) => r.code));
    const parties = [];
    (Array.isArray(age.byBranch) ? age.byBranch : []).filter((b) => brs.has(b.branch)).forEach((b) => {
      (b.receivables?.rows || []).forEach((row) => parties.push({ name: row.party || row.name || row.ledger || '—', total: row.total ?? row.balance ?? row.closing ?? 0, d90: row.d90 ?? row.over90 ?? 0 }));
    });
    const top = parties.filter((p) => (p.d90 || 0) > 0).sort((a, b) => b.d90 - a.d90).slice(0, 5);
    if (!top.length) return <div key={R.cur} className="empty">No 90+ overdue debtors in {R.label}.</div>;
    return (<div key={R.cur}><div className="grphd"><b style={{ color: R.accent }}>{R.flag} {R.label}</b> · top overdue (90+)</div>
      {top.map((p, i) => (<div className="conc-row" key={i} onClick={() => openDrawer({ type: 'debtor', cur: R.cur, p })}><span>{p.name}</span><span className="conc-bar"><span style={{ width: '100%', background: '#ff6b6b' }} /></span><span className="mono conc-v">{money(R.cur, p.d90)}</span><span className="mono conc-s">90+</span></div>))}
    </div>);
  };
  const expenseBudget = () => {
    const rb = Array.isArray(bud.rows) ? bud.rows : (Array.isArray(bud.ledgers) ? bud.ledgers : []);
    if (!rb.length) return <div className="empty">No expense budget set for this period.</div>;
    return (<><div className="note" style={{ marginTop: 0 }}>Consolidated ₹-equivalent · top overspends first.</div>
      <table><thead><tr><th>Head</th><th>Budget</th><th>Actual</th><th>Used</th></tr></thead>
        <tbody>{rb.slice().sort((a, b) => ((b.actual ?? b.spent ?? 0) - (b.budget ?? b.budgeted ?? 0)) - ((a.actual ?? a.spent ?? 0) - (a.budget ?? a.budgeted ?? 0))).slice(0, 8).map((x, i) => {
          const budg = x.budget ?? x.budgeted ?? 0, act = x.actual ?? x.spent ?? 0, p = budg ? Math.round(act / budg * 100) : 0, over = act > budg;
          return (<tr key={x.ledger || x.name || i}><td>{x.ledger || x.name || x.head}</td><td>{money('INR', budg)}</td><td>{money('INR', act)}</td><td className={over ? 'r' : p >= 90 ? 'amber' : 'g'}>{p}%</td></tr>);
        })}</tbody></table></>);
  };
  const drawerBody = () => {
    if (!drawer) return null;
    if (drawer.type === 'module') { const m = drawer.m, cur = drawer.cur, gpPct = m.sales ? m.gp / m.sales * 100 : 0;
      return (<><div className="dh"><div className="dt">{m.name} · Module GP</div><button className="dclose" onClick={() => setDrawer(null)}>✕</button></div>
        <div className="drow"><span>Sales</span><b>{money(cur, m.sales)}</b></div><div className="drow"><span>Gross Profit</span><b>{money(cur, m.gp)}</b></div><div className="drow"><span>GP margin</span><b>{pct(gpPct)}</b></div>
        <a className="dlink" href="#" onClick={(e) => { e.preventDefault(); setDrawer(null); go('/dashboards/module-gp'); }}>Open Module GP report ↗</a><div className="dchip">routes to /dashboards/module-gp · Esc to close</div></>);
    }
    const p = drawer.p, cur = drawer.cur;
    return (<><div className="dh"><div className="dt">{p.name} · Receivable</div><button className="dclose" onClick={() => setDrawer(null)}>✕</button></div>
      <div className="drow"><span>Outstanding</span><b>{money(cur, p.total)}</b></div><div className="drow"><span>90+ overdue</span><b style={{ color: '#ff6b6b' }}>{money(cur, p.d90)}</b></div>
      <a className="dlink" href="#" onClick={(e) => { e.preventDefault(); setDrawer(null); go('/reports/rec'); }}>Open ledger / AR statement ↗</a><div className="dchip">routes to /reports/rec · Esc to close</div></>);
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
    const totGp = mods.reduce((s, m) => s + (m.gp || 0), 0);
    const npAlloc = (m) => (m.gp || 0) - (totGp ? r.opex * ((m.gp || 0) / totGp) : 0); // overhead allocated by GP share
    return (<>
      <Panel title={`${branchSel} · Profit & Loss`} sub={`${label} · ${currencySymbol(cur)} ${cur}`}>
        {steps.map((s, i) => (<div className="wf-row" key={i}><span className={`wf-k${s.b ? ' b' : ''}`}>{s.k}</span>
          <span className="wf-bar"><span style={{ width: `${Math.abs(s.v) / mx * 100}%`, background: s.c }} /></span>
          <span className={`mono wf-v${s.v < 0 ? ' neg' : ''}`}>{money(cur, s.v)}</span></div>))}
      </Panel>
      <Panel title={`${branchSel} · Profit by Module`} sub={`${label} · NP allocated by GP share`}>
        {mods.length ? (<><table><thead><tr><th>Module</th><th>Sales</th><th>GP</th><th>GP%</th><th>NP (alloc)</th></tr></thead>
          <tbody>{mods.map((m) => { const np = npAlloc(m); return (<tr key={m.key || m.name} style={{ cursor: 'pointer' }} onClick={() => openDrawer({ type: 'module', cur, m })}><td>{m.name || m.key}</td><td>{money(cur, m.sales)}</td><td className={(m.gp || 0) < 0 ? 'r' : 'g'}>{money(cur, m.gp)}</td><td>{pct(m.gpPct || (m.sales ? m.gp / m.sales * 100 : 0))}</td><td className={np < 0 ? 'r' : 'g'}>{money(cur, np)}</td></tr>); })}</tbody></table>
          <div className="note">NP (alloc) = module GP less this branch&apos;s operating expenses ({money(cur, r.opex)}) apportioned by each module&apos;s share of GP — an estimate, since overheads aren&apos;t booked per module.</div></>)
          : <div className="empty">No module breakdown for this branch/period.</div>}
      </Panel>
      <div className="panel"><a href="#" onClick={(e) => { e.preventDefault(); go('/dashboards/branch'); }} style={{ color: '#7fb4ff', fontWeight: 700 }}>Open full {branchSel} dashboard ↗</a><span className="note" style={{ marginLeft: 10 }}>Deep-links to the branch's P&L, ledger and AR/AP.</span></div>
    </>);
  };

  const sections = {
    pulse: () => (<>{Panel({ title: 'Key Alerts', sub: 'what needs attention · live', children: alertsPanel() })}
      <div className="note">Pulse = the glance. The hero band stays on every section; deeper detail lives in the other sections.</div></>),
    perf: () => (<>{Panel({ title: 'Branch Board', sub: `Revenue → GP → Expenses → Net Profit · ${label}`, children: branchBoard() })}
      {Panel({ title: 'Gross Profit by Module', sub: 'per region · click a module for detail', children: <div className={`rich2${activeRegions.length === 1 ? ' one' : ''}`}>{activeRegions.map(regionModuleGP)}</div> })}
      {Panel({ title: 'Revenue Trend', sub: 'trailing months · current vs last year', children: trendPanel() })}</>),
    cash: () => (<>{Panel({ title: 'Bank Balances · by account', sub: 'consolidated snapshot (₹-equivalent)', children: bankPanel() })}
      {Panel({ title: 'AR / AP · by branch', sub: `as-on ${to || 'today'} · currencies never summed`, children: <div className={`rich2${activeRegions.length === 1 ? ' one' : ''}`}>{activeRegions.map(arapBlock)}</div> })}
      {Panel({ title: 'Top Overdue Debtors', sub: '90+ days · click to open the ledger', children: <div className={`rich2${activeRegions.length === 1 ? ' one' : ''}`}>{activeRegions.map(overdueBlock)}</div> })}</>),
    capital: () => (<>{Panel({ title: 'Capital & Returns', sub: `net worth & return · ${label}`, children: <div className={`rich2${activeRegions.length === 1 ? ' one' : ''}`}>{activeRegions.map(capitalBlock)}</div> })}
      <div className="note">Net worth is as-on; Net Profit &amp; Return reflect the selected period.</div></>),
    commercial: () => (<>{Panel({ title: 'SO / PO / GP Pipeline', sub: 'whole approval queue · by region', children: <div className={`rich2${activeRegions.length === 1 ? ' one' : ''}`}>{activeRegions.map(pipelineBlock)}</div> })}
      {Panel({ title: 'Customer Concentration', sub: 'share of revenue · click a name to open its statement', children: concBlock(D.topCustomers, 'customer mix', 'customer') })}
      {Panel({ title: 'Supplier Concentration', sub: 'share of spend · dependency risk', children: concBlock(D.topSuppliers, 'supplier mix', 'supplier') })}</>),
    gov: () => (<>{Panel({ title: 'Data Integrity & Control', sub: 'live now · period-independent counts', children: integrityTiles() })}
      {Panel({ title: 'Expense Budget vs Actual', sub: 'opex adherence · overspends first', children: expenseBudget() })}
      {Panel({ title: 'Governance · Alerts', sub: 'exceptions across every domain', children: alertsPanel() })}</>),
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
      {drawer && (<div className="drawer-wrap" onClick={(e) => { if (e.target.classList.contains('drawer-wrap')) setDrawer(null); }}>
        <aside className="drawer">{drawerBody()}</aside></div>)}
    </div>
  );
}

export default AdCockpitPage;
