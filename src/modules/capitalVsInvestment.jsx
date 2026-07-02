// ─── Capital vs Investment — LIVE dashboard (Dashboard ▸ AD Dashboards) ───────
// 100% live from the posted Balance Sheet & P&L via /api/accounting/capital-analysis.
// Sequence: Capital Invested → less Capital Blocked → residual In-Flow Capital,
// then Section 4 tests whether that in-flow capital earns enough gross profit
// (benchmarked against an editable cost-of-capital hurdle). No static data.
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../core/api';
import { periodRange } from '../core/period';
import { bc } from '../core/styleTokens';

const DEFAULT_HURDLE = 18; // initial cost-of-capital benchmark % — user-editable on screen
const brCodeOf = (b) => (b === 'ALL' ? 'ALL' : (b?.code || 'BOM'));
const dmy = (s) => { const d = new Date(s); return Number.isNaN(d.getTime()) ? s : `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()}`; };
const fyLabel = (s) => { const d = new Date(s); const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return `${y}–${String(y + 1).slice(-2)}`; };

// Branch-aware money formatters. India branches keep ₹ + Indian grouping (Cr/L);
// USD branches ($ — NBO/DAR/FBM) use en-US grouping and K/M/B short scale.
const round0 = (n) => Math.round(Number(n) || 0);
const localeOf = (cur) => (cur === '$' ? 'en-US' : 'en-IN');
const fmtAmt = (cur, n) => (n < 0 ? '-' : '') + (cur || '₹') + Math.abs(Math.round(Number(n) || 0)).toLocaleString(localeOf(cur));
const fmtShort = (cur, n) => {
  cur = cur || '₹'; n = Number(n) || 0; const s = n < 0 ? '-' : ''; n = Math.abs(n);
  if (cur === '$') {
    if (n >= 1e9) return s + '$' + (n / 1e9).toFixed(2) + ' B';
    if (n >= 1e6) return s + '$' + (n / 1e6).toFixed(2) + ' M';
    if (n >= 1e3) return s + '$' + (n / 1e3).toFixed(2) + ' K';
    return s + '$' + Math.round(n).toLocaleString('en-US');
  }
  if (n >= 1e7) return s + '₹' + (n / 1e7).toFixed(2) + ' Cr';
  if (n >= 1e5) return s + '₹' + (n / 1e5).toFixed(2) + ' L';
  return s + '₹' + Math.round(n).toLocaleString('en-IN');
};

const CSS = `
.cvd,.cvd *{box-sizing:border-box}
.cvd{--nav:#0f1729;--nav2:#16203a;--nav-ink:#c3cde0;--nav-dim:#6b7690;--nav-active:#14b8a6;
  --bg:#eef1f6;--card:#ffffff;--line:#e3e7ef;--line2:#eef1f6;--ink:#151b28;--ink2:#3a4356;--dim:#6b7488;
  --primary:#0d9488;--primary-d:#0b7d73;--amber:#d97706;--amber-s:#fdf3e6;--green:#16a34a;--red:#dc2626;
  --violet:#6366f1;--teal-s:#e9f6f4;--blue:#2563eb;
  font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:var(--ink);background:var(--bg);
  display:grid;grid-template-columns:236px 1fr;min-height:100vh;font-size:14px;line-height:1.45}
.cvd .num{font-variant-numeric:tabular-nums}

/* ── sidebar ─────────────────────────────────────────── */
.cvd .rail{background:var(--nav);color:var(--nav-ink);position:sticky;top:0;height:100vh;overflow-y:auto;
  display:flex;flex-direction:column;padding:18px 0}
.cvd .brand{padding:2px 20px 18px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #22304f}
.cvd .brand .logo{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#14b8a6,#0d9488);
  display:flex;align-items:center;justify-content:center;font-weight:800;color:#04211d;font-size:14px}
.cvd .brand .nm{font-weight:800;font-size:14px;color:#fff;letter-spacing:.3px}
.cvd .brand .nm span{display:block;font-size:9.5px;color:var(--nav-dim);font-weight:600;letter-spacing:1.5px;margin-top:1px}
.cvd .navlabel{font-size:9.5px;letter-spacing:1.5px;text-transform:uppercase;color:var(--nav-dim);padding:16px 20px 7px;font-weight:700}
.cvd .navlink{display:flex;align-items:center;gap:11px;padding:9px 20px;color:var(--nav-ink);text-decoration:none;
  font-size:13px;font-weight:500;border-left:3px solid transparent;cursor:pointer;transition:background .14s;background:none;border-top:0;border-right:0;border-bottom:0;width:100%;text-align:left;font-family:inherit}
.cvd .navlink:hover{background:#18223c}
.cvd .navlink.on{background:#18223c;border-left-color:var(--nav-active);color:#fff;font-weight:700}
.cvd .navlink:focus-visible{outline:2px solid var(--nav-active);outline-offset:-2px}
.cvd .navlink .ico{width:16px;text-align:center;color:var(--nav-active);font-size:13px}
.cvd .railcard{margin:18px 16px 6px;background:var(--nav2);border-radius:10px;padding:13px 14px}
.cvd .railcard .l{font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:var(--nav-dim);font-weight:700}
.cvd .railcard .big{font-size:22px;font-weight:800;color:#fff;margin-top:5px}
.cvd .railcard .sub{font-size:11px;color:#8ad9cf;margin-top:2px}
.cvd .rail .live{margin-top:auto;padding:14px 20px 4px;font-size:11px;color:var(--nav-dim);display:flex;align-items:center;gap:8px}
.cvd .rail .live .dot{width:7px;height:7px;border-radius:50%;background:#34d399;box-shadow:0 0 0 0 rgba(52,211,153,.6);animation:cvdpl 2s infinite}
@keyframes cvdpl{70%{box-shadow:0 0 0 6px rgba(52,211,153,0)}}
@media(prefers-reduced-motion:reduce){.cvd *{animation:none!important;transition:none!important;scroll-behavior:auto!important}}

/* ── main ────────────────────────────────────────────── */
.cvd .main{min-width:0;display:flex;flex-direction:column}
.cvd .topbar{position:sticky;top:0;z-index:20;background:rgba(255,255,255,.9);backdrop-filter:blur(8px);
  border-bottom:1px solid var(--line);padding:13px 26px;display:flex;align-items:center;gap:16px;flex-wrap:wrap}
.cvd .crumb{font-size:12px;color:var(--dim)}
.cvd .crumb b{color:var(--ink);font-weight:700}
.cvd .h1{font-size:17px;font-weight:800;letter-spacing:-.01em}
.cvd .controls{margin-left:auto;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.cvd .presets{display:flex;background:#f1f3f8;border:1px solid var(--line);border-radius:8px;overflow:hidden}
.cvd .presets button{appearance:none;border:0;background:transparent;font:inherit;font-size:12px;font-weight:600;color:var(--dim);
  padding:6px 11px;cursor:pointer;border-right:1px solid var(--line)}
.cvd .presets button:last-child{border-right:0}
.cvd .presets button.on{background:var(--primary);color:#fff}
.cvd .hurdle{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--dim);font-weight:600}
.cvd .hurdle input{width:56px;padding:6px 8px;border:1px solid var(--line);border-radius:7px;font:inherit;font-size:13px;
  font-weight:700;color:var(--ink);text-align:right}
.cvd .hurdle input:focus-visible{outline:2px solid var(--primary);outline-offset:1px}
.cvd .btn{display:inline-flex;align-items:center;gap:6px;padding:7px 13px;border:1px solid var(--line);border-radius:8px;
  background:#fff;font-size:12.5px;font-weight:700;color:var(--ink);cursor:pointer}
.cvd .btn.pri{background:var(--primary);border-color:var(--primary);color:#fff}

.cvd .content{padding:22px 26px 60px;display:flex;flex-direction:column;gap:22px}
.cvd .state{padding:48px 20px;text-align:center;color:var(--dim);font-size:14px;background:#fff;border:1px solid var(--line);border-radius:14px}

/* verdict banner */
.cvd .banner{display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:12px;
  background:linear-gradient(90deg,#e9f6f4,#f4fbfa);border:1px solid #c8ebe5}
.cvd .banner .ic{width:38px;height:38px;border-radius:10px;background:var(--primary);color:#fff;font-size:19px;
  display:flex;align-items:center;justify-content:center;flex:none;font-weight:800}
.cvd .banner .t{font-size:14px;font-weight:800;color:#0b5d55}
.cvd .banner .s{font-size:12.5px;color:#337b73;margin-top:2px}
.cvd .banner.bad{background:linear-gradient(90deg,#fdecec,#fff5f5);border-color:#f6cccc}
.cvd .banner.bad .ic{background:var(--red)}.cvd .banner.bad .t{color:#8f1d1d}.cvd .banner.bad .s{color:#a53a3a}

/* KPI strip */
.cvd .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.cvd .kpi{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;position:relative;overflow:hidden}
.cvd .kpi::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--primary)}
.cvd .kpi.amber::before{background:var(--amber)}.cvd .kpi.violet::before{background:var(--violet)}
.cvd .kpi.green::before{background:var(--green)}.cvd .kpi.slate::before{background:#64748b}
.cvd .kpi .l{font-size:10.5px;letter-spacing:.6px;text-transform:uppercase;color:var(--dim);font-weight:700;
  display:flex;align-items:center;justify-content:space-between;gap:8px}
.cvd .kpi .v{font-size:23px;font-weight:800;margin-top:8px;letter-spacing:-.01em}
.cvd .kpi .s{font-size:11.5px;color:var(--dim);margin-top:3px}
.cvd .kpi .pill{font-size:9.5px;font-weight:800;padding:2px 7px;border-radius:20px;white-space:nowrap}
.cvd .pill.up{background:#e7f6ec;color:var(--green)}.cvd .pill.warn{background:var(--amber-s);color:var(--amber)}
.cvd .pill.dn{background:#fdecec;color:var(--red)}

/* analytics row */
.cvd .analytics{display:grid;grid-template-columns:1fr 1.25fr 1fr;gap:16px}
.cvd .card{background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden}
.cvd .card>.hd{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 18px;border-bottom:1px solid var(--line)}
.cvd .card>.hd .ti{font-size:13px;font-weight:800}
.cvd .card>.hd .mut{font-size:11px;color:var(--dim);font-weight:600}
.cvd .card>.bd{padding:16px 18px}
.cvd .donutwrap{display:flex;align-items:center;gap:16px}
.cvd .legend{display:flex;flex-direction:column;gap:12px;font-size:12.5px;flex:1}
.cvd .legend .row{display:flex;align-items:center;gap:9px}
.cvd .legend .sw{width:11px;height:11px;border-radius:3px;flex:none}
.cvd .legend .amt{margin-left:auto;font-weight:800}
.cvd .legend .pc{color:var(--dim);font-size:11px;width:46px;text-align:right}
.cvd .bridge{display:flex;flex-direction:column;gap:11px}
.cvd .brow{display:grid;grid-template-columns:132px 1fr 108px;align-items:center;gap:12px;font-size:12.5px}
.cvd .brow .nm{color:var(--ink2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.cvd .brow .nm.b{font-weight:800;color:var(--ink)}
.cvd .track{height:16px;background:#f1f3f8;border-radius:5px;position:relative;overflow:hidden}
.cvd .fill{position:absolute;top:0;bottom:0;left:0;border-radius:5px}
.cvd .brow .amt{text-align:right;font-weight:800}
.cvd .amt.neg{color:var(--red)}
.cvd .gaugewrap{display:flex;flex-direction:column;align-items:center;gap:6px}
.cvd .gaugewrap .big{font-size:30px;font-weight:800;color:var(--primary);margin-top:-46px}
.cvd .gaugewrap .cap{font-size:11.5px;color:var(--dim);margin-top:2px;text-align:center;line-height:1.5}
.cvd .gaugewrap .cap b{color:var(--ink)}

/* section card */
.cvd .section{scroll-margin-top:80px}
.cvd .sec-hd{display:flex;align-items:center;gap:12px;padding:15px 18px;border-bottom:1px solid var(--line)}
.cvd .sec-hd .no{width:26px;height:26px;border-radius:8px;background:var(--ink);color:#fff;font-size:12px;font-weight:800;
  display:flex;align-items:center;justify-content:center;flex:none}
.cvd .sec-hd .no.amber{background:var(--amber)}.cvd .sec-hd .no.teal{background:var(--primary)}
.cvd .sec-hd .tt{font-size:14.5px;font-weight:800}
.cvd .sec-hd .ds{font-size:11.5px;color:var(--dim);margin-top:1px}
.cvd .sec-hd .right{margin-left:auto;font-size:13px;font-weight:800;text-align:right;white-space:nowrap}
.cvd .sec-hd.clk{cursor:pointer;user-select:none}
.cvd .sec-hd.clk:hover{background:#fafbfd}
.cvd .sec-hd.clk:focus-visible{outline:2px solid var(--primary);outline-offset:-2px}
.cvd .sec-hd .chev{flex:0 0 auto;font-size:20px;font-weight:800;color:var(--dim);line-height:1;transition:transform .2s}
.cvd .sec-hd.open .chev{transform:rotate(90deg)}
.cvd .sec-hd.clk .right{margin-left:auto}
.cvd .sec-hd.clk .chev{margin-left:2px}
.cvd table{width:100%;border-collapse:collapse}
.cvd .reg{overflow-x:auto;-webkit-overflow-scrolling:touch}
.cvd .reg th{text-align:left;font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:var(--dim);font-weight:700;
  padding:9px 18px;background:#f7f9fc;border-bottom:1px solid var(--line);white-space:nowrap}
.cvd .reg th.r,.cvd .reg td.r{text-align:right}
.cvd .reg td{padding:8px 18px;font-size:13px;border-bottom:1px solid var(--line2)}
.cvd .reg tr.grp td{font-size:10.5px;letter-spacing:.7px;text-transform:uppercase;color:var(--primary-d);font-weight:800;
  background:#fafbfd;padding-top:11px}
.cvd .reg td.nm{color:var(--ink2)}
.cvd .reg td.led{padding-left:34px;color:var(--ink2)}
.cvd .reg td.amt{text-align:right;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap}
.cvd .reg td.amt.neg{color:var(--red)}
.cvd .reg .tag{font-size:8.5px;font-weight:800;padding:1px 6px;border-radius:4px;margin-left:8px;letter-spacing:.4px;vertical-align:middle}
.cvd .tag.bs{background:#eef2fb;color:var(--blue)}.cvd .tag.pl{background:#f3eefb;color:var(--violet)}
.cvd .reg tr.sub td{font-weight:800;color:var(--ink);border-bottom:1px solid var(--line)}
.cvd .reg tr.tot td{font-size:14px;font-weight:800;border-top:2px solid var(--ink);background:#f7f9fc}
.cvd .reg tr.tot td.amt{color:var(--primary-d)}
.cvd .reg tr.tot.amberT td.amt{color:var(--amber)}
.cvd .reg tr.tot.greenT td.amt{color:var(--green)}

/* formula + perf inside sections */
.cvd .pad{padding:16px 18px;display:flex;flex-direction:column;gap:14px}
.cvd .formula{display:flex;flex-wrap:wrap;align-items:stretch;border:1px solid var(--line);border-radius:10px;overflow:hidden}
.cvd .formula .cell{flex:1;min-width:120px;padding:13px 16px;border-right:1px solid var(--line)}
.cvd .formula .cell:last-child{border-right:0}
.cvd .formula .cell .l{font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:var(--dim);font-weight:700}
.cvd .formula .cell .v{font-size:19px;font-weight:800;margin-top:4px}
.cvd .formula .op{flex:0 0 34px;display:flex;align-items:center;justify-content:center;font-size:20px;color:var(--dim);
  font-weight:800;border-right:1px solid var(--line)}
.cvd .formula .cell.res{background:var(--teal-s)}.cvd .formula .cell.res .v{color:var(--primary-d)}
.cvd .formula .cell.blk .v{color:var(--amber)}
.cvd .perfrow{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
.cvd .pcard{border:1px solid var(--line);border-radius:10px;padding:13px 15px}
.cvd .pcard .l{font-size:10px;letter-spacing:.5px;text-transform:uppercase;color:var(--dim);font-weight:700}
.cvd .pcard .v{font-size:22px;font-weight:800;color:var(--primary-d);margin-top:4px}
.cvd .pcard .d{font-size:10.5px;color:var(--dim);margin-top:3px;line-height:1.4}
.cvd .recon{font-size:12px;color:var(--ink2);background:#f7f9fc;border:1px dashed var(--line);border-radius:9px;padding:11px 14px}
.cvd .recon b{color:var(--primary-d)}

.cvd .bsgrid{display:grid;grid-template-columns:1fr 1fr;gap:0}
.cvd .bsgrid>div:first-child{border-right:1px solid var(--line)}
.cvd .foot{font-size:11px;color:var(--dim);padding:0 2px;line-height:1.6}
.cvd .foot b{color:var(--ink2)}

@media(max-width:1080px){.cvd .analytics{grid-template-columns:1fr 1fr}.cvd .analytics .card:last-child{grid-column:1/-1}}
@media(max-width:900px){
  .cvd{grid-template-columns:1fr}
  .cvd .rail{position:static;height:auto;flex-direction:row;flex-wrap:wrap;align-items:center;gap:4px;padding:12px}
  .cvd .rail .navlabel,.cvd .railcard,.cvd .rail .live{display:none}
  .cvd .rail .brand{border:0;padding:2px 8px 2px 4px}
  .cvd .navlink{border-left:0;border-radius:8px;padding:7px 11px;width:auto}
  .cvd .navlink.on{border-left:0}
  .cvd .kpis{grid-template-columns:1fr 1fr}
  .cvd .bsgrid{grid-template-columns:1fr}
  .cvd .bsgrid>div:first-child{border-right:0;border-bottom:1px solid var(--line)}
}
@media(max-width:560px){
  .cvd .content{padding:16px 12px 48px}
  .cvd .analytics{grid-template-columns:1fr}
  .cvd .perfrow{grid-template-columns:1fr}
  .cvd .brow{grid-template-columns:104px 1fr 92px}
  .cvd .topbar{padding:11px 14px}
}
`;

// ── register table (group ▸ ledgers ▸ subtotal, then a bold total row) ─────────
function Reg({ groups, totalLabel, totalVal, tone, fmt }) {
  const totClass = tone === 'amber' ? 'tot amberT' : tone === 'green' ? 'tot greenT' : 'tot';
  return (
    <div className="reg">
      <table>
        <thead><tr><th>Ledger</th><th className="r">Amount</th></tr></thead>
        <tbody>
          {(groups || []).map((g, gi) => (
            <React.Fragment key={gi}>
              <tr className="grp"><td>{g.grp}</td><td className="r" /></tr>
              {(g.ledgers || []).map((l, li) => (
                <tr key={li}>
                  <td className="led">{l.n}<span className={`tag ${g.src === 'pl' ? 'pl' : 'bs'}`}>{g.src === 'pl' ? 'P&L' : 'BS'}</span></td>
                  <td className={`amt ${l.a < 0 ? 'neg' : ''}`}>{fmt(l.a)}</td>
                </tr>
              ))}
              <tr className="sub"><td className="nm">{g.grp} — subtotal</td><td className="amt">{fmt(g.total)}</td></tr>
            </React.Fragment>
          ))}
          {!(groups || []).length && <tr><td colSpan={2} style={{ padding: 16, color: '#6b7488', fontSize: 12.5 }}>No ledgers in this bucket.</td></tr>}
          {totalLabel && <tr className={totClass}><td>{totalLabel}</td><td className="amt">{fmt(totalVal)}</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

// ── compact group-level list (used for the two-sided Balance Sheet) ────────────
function GroupList({ head, groups, totalLabel, totalVal, fmt }) {
  return (
    <div className="reg">
      <table>
        <thead><tr><th>{head}</th><th className="r">Amount</th></tr></thead>
        <tbody>
          {(groups || []).map((g, i) => (
            <tr key={i}><td className="nm">{g.grp}</td><td className={`amt ${g.total < 0 ? 'neg' : ''}`}>{fmt(g.total)}</td></tr>
          ))}
          <tr className="tot"><td>{totalLabel}</td><td className="amt">{fmt(totalVal)}</td></tr>
        </tbody>
      </table>
    </div>
  );
}

const NAV = [
  ['ov', 'Overview', '◆'], ['s1', 'Capital Employed', '①'], ['s2', 'Capital Blocked', '②'],
  ['s3', 'In-Flow Capital', '③'], ['s4', 'Performance', '④'], ['s5', 'Balance Sheet', '⑤'], ['s6', 'Profit & Loss', '⑥'],
];
const PRESETS = [['all', 'All'], ['mtd', 'MTD'], ['qtd', 'QTD'], ['cfy', 'CFY'], ['lfy', 'LFY']];

export function CapitalVsInvestmentLive({ branch }) {
  const [preset, setPreset] = useState('cfy');
  const [hurdle, setHurdle] = useState(DEFAULT_HURDLE); // cost-of-capital % — editable
  const [active, setActive] = useState('ov');
  // The three detail-heavy sections start collapsed; click the header to expand.
  const [openSec, setOpenSec] = useState({ s4: false, s5: false, s6: false });
  const toggleSec = (k) => setOpenSec((o) => ({ ...o, [k]: !o[k] }));
  const range = useMemo(() => periodRange(preset, { branch }), [preset, branch]);
  const cur = (bc(branch) || {}).cur || '₹';
  const inr = (n) => fmtAmt(cur, n);   // full amount in branch currency
  const cr = (n) => fmtShort(cur, n);  // short scale (Cr/L · K/M/B)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['capital-analysis', brCodeOf(branch), range.from, range.to],
    queryFn: () => apiGet('/api/accounting/capital-analysis', { branch: brCodeOf(branch) === 'ALL' ? '' : brCodeOf(branch), from: range.from, to: range.to }),
  });

  const t = data?.totals || {};
  const good = (t.gpYield || 0) >= hurdle;
  const flowComp = t.flowComposition || 0;
  const reconciles = Math.abs(flowComp - (t.inflowCapital || 0)) < 1;
  const hasData = Math.abs(t.capitalInvested || 0) > 0.5 || Math.abs(t.grossProfit || 0) > 0.5 || Math.abs(t.inflowCapital || 0) > 0.5 || Math.abs(t.grossRevenue || 0) > 0.5;

  // Complete P&L statement (all accounts) for Section 6.
  const plFull = data?.profitAndLoss || {};
  const signGrp = (arr, prefix, factor) => (arr || []).map((g) => ({
    ...g, grp: prefix + g.grp, total: round0(factor * g.total),
    ledgers: (g.ledgers || []).map((l) => ({ ...l, a: round0(factor * l.a) })),
  }));
  const plStatement = [
    ...(plFull.sales || []),
    ...signGrp(plFull.cogs, 'Less: ', -1),
    ...signGrp(plFull.indirectIncome, 'Add: ', 1),
    ...signGrp(plFull.indirectExpense, 'Less: ', -1),
  ];

  // Capital-bridge rows (sources → employed → in-flow) — magnitudes only.
  const capSum = (data?.capital || []).reduce((s, g) => s + g.total, 0);
  const lossSum = (data?.capitalAdjust || []).reduce((s, g) => s + g.total, 0);
  const bridge = [
    { nm: 'Capital & Reserves', v: capSum, c: '#0d9488' },
    ...((t.quasiCapital || 0) > 0.5 ? [{ nm: 'Owner & Partner Loans', v: t.quasiCapital, c: '#0d9488' }] : []),
    ...((data?.capitalAdjust || []).length ? [{ nm: 'Less: Accumulated Loss', v: lossSum, c: '#dc2626' }] : []),
    { nm: '= Capital Employed', v: t.capitalInvested || 0, c: 'linear-gradient(90deg,#14b8a6,#0b7d73)', b: true },
    { nm: 'Less: Blocked', v: -(t.capitalBlocked || 0), c: '#d97706' },
    { nm: '= In-Flow Capital', v: t.inflowCapital || 0, c: 'linear-gradient(90deg,#2dd4bf,#0d9488)', b: true },
  ];
  const maxAbs = Math.max(1, ...bridge.map((r) => Math.abs(r.v)));

  // Donut (blocked vs in-flow) + gauge (GP yield vs hurdle).
  const DC = 289.03; // 2π·46
  const blkLen = (DC * Math.max(0, Math.min(100, t.blockedPct || 0)) / 100).toFixed(1);
  const flwLen = (DC * Math.max(0, Math.min(100, t.inflowPct || 0)) / 100).toFixed(1);
  const ARC = 257.6; // π·82 semicircle
  const gaugeFill = (ARC * Math.max(0, Math.min(40, t.gpYield || 0)) / 40).toFixed(1);
  const needleAng = (Math.max(0, Math.min(40, hurdle)) / 40 * 180 - 90).toFixed(1);
  const yieldDiff = ((t.gpYield || 0) - hurdle).toFixed(1);

  // Scroll-spy: highlight the rail link for whatever section is in view.
  useEffect(() => {
    if (!hasData) return undefined;
    const ids = NAV.map(([id]) => document.getElementById('cvd-' + id)).filter(Boolean);
    if (!ids.length || typeof IntersectionObserver === 'undefined') return undefined;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id.replace('cvd-', '')); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ids.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [hasData]);

  const jump = (id) => { const el = document.getElementById('cvd-' + id); if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActive(id); };

  return (
    <div className="cvd">
      <style>{CSS}</style>

      {/* ═══ SIDEBAR ═══ */}
      <aside className="rail">
        <div className="brand">
          <div className="logo">K</div>
          <div className="nm">KBiz360<span>AD DASHBOARDS</span></div>
        </div>
        <div className="navlabel">Capital vs Investment</div>
        {NAV.map(([id, label, ico]) => (
          <button key={id} type="button" className={`navlink ${active === id ? 'on' : ''}`} onClick={() => jump(id)} aria-current={active === id ? 'true' : undefined}>
            <span className="ico">{ico}</span> {label}
          </button>
        ))}
        <div className="railcard">
          <div className="l">Capital Employed</div>
          <div className="big num">{cr(t.capitalInvested)}</div>
          <div className="sub">In-Flow {(t.inflowPct || 0).toFixed(1)}% · Blocked {(t.blockedPct || 0).toFixed(1)}%</div>
        </div>
        <div className="live"><span className="dot" /> Live · Balance Sheet + P&amp;L</div>
      </aside>

      {/* ═══ MAIN ═══ */}
      <div className="main">
        <div className="topbar">
          <div>
            <div className="crumb">Dashboards › AD Dashboards › <b>Capital vs Investment</b></div>
            <div className="h1">Capital vs Investment · {brCodeOf(branch)}</div>
          </div>
          <div className="controls">
            <div className="presets" role="group" aria-label="Period">
              {PRESETS.map(([k, label]) => (
                <button key={k} type="button" className={preset === k ? 'on' : ''} onClick={() => setPreset(k)}>{label}</button>
              ))}
            </div>
            <div className="hurdle"><label htmlFor="cvd-hurdle">Hurdle</label>
              <input id="cvd-hurdle" type="number" min="0" step="0.5" value={hurdle}
                onChange={(e) => setHurdle(Number(e.target.value) || 0)}
                title="Cost-of-capital benchmark used for the GP-yield verdict" />%
            </div>
            <button className="btn" type="button" onClick={() => { if (typeof window !== 'undefined' && window.print) window.print(); }}>⤓ Export</button>
            <button className="btn pri" type="button" onClick={() => refetch && refetch()}>↻ Refresh</button>
          </div>
        </div>

        <div className="content">
          {isLoading && <div className="state">Loading live capital analysis…</div>}
          {error && <div className="state" style={{ color: '#dc2626' }}>Couldn’t load: {String(error.message || error)}</div>}
          {!isLoading && !error && data && !hasData && (
            <div className="state">No capital or gross-profit postings for this period. Record vouchers to populate the capital-vs-investment analysis.</div>
          )}

          {!isLoading && !error && data && hasData && (<>
            {/* verdict banner */}
            <div className={`banner ${good ? '' : 'bad'}`}>
              <div className="ic">{good ? '✓' : '!'}</div>
              <div>
                <div className="t">{good ? 'In-Flow capital IS generating enough gross profit' : 'In-Flow capital is NOT generating enough gross profit'}</div>
                <div className="s">{good
                  ? <>{(t.gpYield || 0).toFixed(1)}% GP-yield on in-flow capital — <b>above</b> the {hurdle}% cost-of-capital hurdle. Working capital recycled {(t.flowTurnover || 0).toFixed(2)}× a year at a {(t.gpMargin || 0).toFixed(1)}% margin into {cr(t.grossRevenue)} of turnover.</>
                  : <>{(t.gpYield || 0).toFixed(1)}% GP-yield on in-flow capital — <b>below</b> the {hurdle}% hurdle. Improve margin (currently {(t.gpMargin || 0).toFixed(1)}%), recycle capital faster (currently {(t.flowTurnover || 0).toFixed(2)}×), or release blocked capital into flow.</>}
                </div>
              </div>
            </div>

            {/* KPI strip */}
            <div className="kpis" id="cvd-ov">
              <div className="kpi"><div className="l">Capital Invested <span className="pill up">EMPLOYED</span></div><div className="v num">{cr(t.capitalInvested)}</div><div className="s">Owner + partner funds, net of loss</div></div>
              <div className="kpi amber"><div className="l">Capital Blocked <span className="pill warn">{(t.blockedPct || 0).toFixed(1)}%</span></div><div className="v num">{cr(t.capitalBlocked)}</div><div className="s">Fixed &amp; slow assets — tied up</div></div>
              <div className="kpi"><div className="l">In-Flow Capital <span className="pill up">{(t.inflowPct || 0).toFixed(1)}%</span></div><div className="v num">{cr(t.inflowCapital)}</div><div className="s">Circulating working capital</div></div>
              <div className="kpi violet"><div className="l">Gross Profit</div><div className="v num">{cr(t.grossProfit)}</div><div className="s">{(t.gpMargin || 0).toFixed(1)}% margin on turnover</div></div>
              <div className="kpi green"><div className="l">Net Profit</div><div className="v num">{cr(t.netProfit)}</div><div className="s">After operating costs</div></div>
              <div className="kpi"><div className="l">GP Yield on In-Flow</div><div className="v num">{(t.gpYield || 0).toFixed(1)}%</div><div className="s">vs {hurdle}% hurdle · <span style={{ color: good ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{yieldDiff >= 0 ? '+' : ''}{yieldDiff} pts</span></div></div>
              <div className="kpi slate"><div className="l">Flow Turnover</div><div className="v num">{(t.flowTurnover || 0).toFixed(2)}×</div><div className="s">Turnover ÷ In-Flow</div></div>
              <div className="kpi slate"><div className="l">External Funding</div><div className="v num">{cr(t.externalFunding)}</div><div className="s">Creditors + current liabilities</div></div>
            </div>

            {/* analytics row */}
            <div className="analytics">
              <div className="card">
                <div className="hd"><div className="ti">Capital Allocation</div><div className="mut">of {cr(t.capitalInvested)}</div></div>
                <div className="bd">
                  <div className="donutwrap">
                    <svg width="132" height="132" viewBox="0 0 132 132" aria-label="Blocked vs in-flow allocation">
                      <circle cx="66" cy="66" r="46" fill="none" stroke="#f1f3f8" strokeWidth="18" />
                      <circle cx="66" cy="66" r="46" fill="none" stroke="#d97706" strokeWidth="18" strokeDasharray={`${blkLen} ${DC}`} transform="rotate(-90 66 66)" />
                      <circle cx="66" cy="66" r="46" fill="none" stroke="#0d9488" strokeWidth="18" strokeDasharray={`${flwLen} ${DC}`} strokeDashoffset={`-${blkLen}`} transform="rotate(-90 66 66)" />
                      <text x="66" y="63" textAnchor="middle" fontSize="15" fontWeight="800" fill="#151b28">{cr(t.capitalInvested)}</text>
                      <text x="66" y="80" textAnchor="middle" fontSize="8.5" letterSpacing="1" fill="#6b7488">EMPLOYED</text>
                    </svg>
                    <div className="legend">
                      <div className="row"><span className="sw" style={{ background: '#d97706' }} />Blocked <span className="amt num">{cr(t.capitalBlocked)}</span><span className="pc">{(t.blockedPct || 0).toFixed(1)}%</span></div>
                      <div className="row"><span className="sw" style={{ background: '#0d9488' }} />In-Flow <span className="amt num">{cr(t.inflowCapital)}</span><span className="pc">{(t.inflowPct || 0).toFixed(1)}%</span></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="hd"><div className="ti">Capital Bridge</div><div className="mut">sources → employed → in-flow</div></div>
                <div className="bd">
                  <div className="bridge">
                    {bridge.map((r, i) => (
                      <div className="brow" key={i}>
                        <span className={`nm ${r.b ? 'b' : ''}`}>{r.nm}</span>
                        <div className="track"><div className="fill" style={{ width: `${Math.max(1.5, Math.abs(r.v) / maxAbs * 100)}%`, background: r.c }} /></div>
                        <span className={`amt num ${r.v < 0 ? 'neg' : ''}`} style={r.b ? { color: 'var(--primary-d)' } : (r.c === '#d97706' ? { color: 'var(--amber)' } : undefined)}>{cr(r.v)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="hd"><div className="ti">Return vs Hurdle</div><div className="mut">hurdle {hurdle}%</div></div>
                <div className="bd">
                  <div className="gaugewrap">
                    <svg width="200" height="118" viewBox="0 0 200 118" aria-label="GP yield versus hurdle gauge">
                      <path d="M18 104 A82 82 0 0 1 182 104" fill="none" stroke="#f1f3f8" strokeWidth="15" strokeLinecap="round" />
                      <path d="M18 104 A82 82 0 0 1 182 104" fill="none" stroke={good ? '#0d9488' : '#dc2626'} strokeWidth="15" strokeLinecap="round" strokeDasharray={`${gaugeFill} 999`} />
                      <g transform={`rotate(${needleAng} 100 104)`}>
                        <line x1="100" y1="104" x2="100" y2="34" stroke="#151b28" strokeWidth="2.5" />
                        <circle cx="100" cy="104" r="5" fill="#151b28" />
                      </g>
                    </svg>
                    <div className="big num" style={{ color: good ? 'var(--primary-d)' : 'var(--red)' }}>{(t.gpYield || 0).toFixed(1)}%</div>
                    <div className="cap">GP yield on in-flow capital<br /><b>{good ? `clears the ${hurdle}% hurdle by ${yieldDiff} pts` : `short of the ${hurdle}% hurdle by ${Math.abs(yieldDiff)} pts`}</b></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 1 · Capital Employed */}
            <div className="card section" id="cvd-s1">
              <div className="sec-hd"><span className="no teal">1</span><div><div className="tt">Capital Employed</div><div className="ds">Capital Account + Reserves{(t.quasiCapital || 0) > 0.5 ? ' + owner & partner loans (quasi-capital)' : ''}, net of accumulated loss — from Balance Sheet</div></div><span className="right num" style={{ color: 'var(--primary-d)' }}>{inr(t.capitalInvested)}</span></div>
              <Reg groups={[...(data.capital || []), ...(data.quasi || []), ...(data.capitalAdjust || [])]} totalLabel="CAPITAL EMPLOYED" totalVal={t.capitalInvested} fmt={inr} />
            </div>

            {/* Section 2 · Capital Blocked */}
            <div className="card section" id="cvd-s2">
              <div className="sec-hd"><span className="no amber">2</span><div><div className="tt">Capital Blocked</div><div className="ds">Fixed &amp; slow assets — tied up, not circulating</div></div><span className="right num" style={{ color: 'var(--amber)' }}>{inr(t.capitalBlocked)}</span></div>
              <Reg groups={data.blocked} totalLabel="TOTAL BLOCKED" totalVal={t.capitalBlocked} tone="amber" fmt={inr} />
            </div>

            {/* Section 3 · In-Flow Capital */}
            <div className="card section" id="cvd-s3">
              <div className="sec-hd"><span className="no teal">3</span><div><div className="tt">In-Flow Capital</div><div className="ds">What's left to circulate &amp; earn = Invested − Blocked</div></div><span className="right num" style={{ color: 'var(--primary-d)' }}>{inr(t.inflowCapital)}</span></div>
              <div className="pad">
                <div className="formula">
                  <div className="cell"><div className="l">Capital Invested</div><div className="v num">{cr(t.capitalInvested)}</div></div>
                  <div className="op">−</div>
                  <div className="cell blk"><div className="l">Capital Blocked</div><div className="v num">{cr(t.capitalBlocked)}</div></div>
                  <div className="op">=</div>
                  <div className="cell res"><div className="l">In-Flow Capital</div><div className="v num">{cr(t.inflowCapital)}</div></div>
                </div>
                <div className="recon">Composition of current-asset ledgers totals <b>{inr(flowComp)}</b> — {reconciles ? 'reconciles with the in-flow residual ✓' : <>the <b>{inr(flowComp - (t.inflowCapital || 0))}</b> gap is financed by external funding (creditors · loans · current liabilities), which totals <b>{inr(t.externalFunding)}</b> — see the complete Balance Sheet below.</>}</div>
              </div>
              <Reg groups={data.flow} totalLabel="COMPOSITION TOTAL (CURRENT ASSETS)" totalVal={flowComp} fmt={inr} />
            </div>

            {/* Section 4 · Performance */}
            <div className="card section" id="cvd-s4">
              <div className={`sec-hd clk ${openSec.s4 ? 'open' : ''}`} role="button" tabIndex={0} aria-expanded={openSec.s4}
                onClick={() => toggleSec('s4')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSec('s4'); } }}
                title={openSec.s4 ? 'Click to collapse' : 'Click to expand'}>
                <span className="no">4</span><div><div className="tt">Turnover · Gross Profit · Net Profit</div><div className="ds">Is the in-flow capital generating enough profit? — from P&amp;L</div></div><span className="right num" style={{ color: 'var(--violet)' }}>{inr(t.grossProfit)} GP</span><span className="chev" aria-hidden="true">›</span>
              </div>
              {openSec.s4 && (<>
              <div className="pad">
                <div className="formula">
                  <div className="cell"><div className="l">Gross Profit</div><div className="v num">{cr(t.grossProfit)}</div></div>
                  <div className="op">+</div>
                  <div className="cell"><div className="l">Other Income</div><div className="v num">{cr(t.indirectIncome)}</div></div>
                  <div className="op">−</div>
                  <div className="cell blk"><div className="l">Operating Exp.</div><div className="v num">{cr(t.indirectExpense)}</div></div>
                  <div className="op">=</div>
                  <div className="cell res"><div className="l">Net Profit</div><div className="v num">{cr(t.netProfit)}</div></div>
                </div>
                <div className="perfrow">
                  <div className="pcard"><div className="l">Flow Turnover</div><div className="v num">{(t.flowTurnover || 0).toFixed(2)}×</div><div className="d">Turnover ÷ In-Flow Capital — times working capital is recycled</div></div>
                  <div className="pcard"><div className="l">GP Yield on In-Flow</div><div className="v num">{(t.gpYield || 0).toFixed(1)}%</div><div className="d">Gross Profit ÷ In-Flow Capital — pre-operating return</div></div>
                  <div className="pcard"><div className="l">Net Yield on In-Flow</div><div className="v num">{(t.netYield || 0).toFixed(1)}%</div><div className="d">Net Profit ÷ In-Flow Capital — after operating costs</div></div>
                </div>
              </div>
              <Reg groups={data.revenue} totalLabel="GROSS PROFIT" totalVal={t.grossProfit} fmt={inr} />
              </>)}
            </div>

            {/* Section 5 · Complete Balance Sheet */}
            <div className="card section" id="cvd-s5">
              <div className={`sec-hd clk ${openSec.s5 ? 'open' : ''}`} role="button" tabIndex={0} aria-expanded={openSec.s5}
                onClick={() => toggleSec('s5')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSec('s5'); } }}
                title={openSec.s5 ? 'Click to collapse' : 'Click to expand'}>
                <span className="no">5</span><div><div className="tt">Complete Balance Sheet</div><div className="ds">Every account, both sides — as on {dmy(range.to)} · {data.balanceSheet?.balanced ? 'balanced ✓' : '⚠ unbalanced'}</div></div><span className="right num">{inr(t.totalAssets)}</span><span className="chev" aria-hidden="true">›</span>
              </div>
              {openSec.s5 && (
              <div className="bsgrid">
                <GroupList head="Liabilities & Equity" groups={data.balanceSheet?.liabilities} totalLabel="TOTAL LIABILITIES & EQUITY" totalVal={t.totalLiabilities} fmt={inr} />
                <GroupList head="Assets" groups={data.balanceSheet?.assets} totalLabel="TOTAL ASSETS" totalVal={t.totalAssets} fmt={inr} />
              </div>
              )}
            </div>

            {/* Section 6 · Complete P&L */}
            <div className="card section" id="cvd-s6">
              <div className={`sec-hd clk ${openSec.s6 ? 'open' : ''}`} role="button" tabIndex={0} aria-expanded={openSec.s6}
                onClick={() => toggleSec('s6')} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSec('s6'); } }}
                title={openSec.s6 ? 'Click to collapse' : 'Click to expand'}>
                <span className="no">6</span><div><div className="tt">Complete Profit &amp; Loss</div><div className="ds">Every account — trading → Gross Profit {cr(t.grossProfit)} → Net Profit</div></div><span className="right num" style={{ color: 'var(--green)' }}>{inr(t.netProfit)} NP</span><span className="chev" aria-hidden="true">›</span>
              </div>
              {openSec.s6 && <Reg groups={plStatement} totalLabel="NET PROFIT" totalVal={t.netProfit} tone="green" fmt={inr} />}
            </div>

            <div className="foot">Read-only · live from the posted <b>Balance Sheet</b> and <b>Profit &amp; Loss</b>. Sequence: Capital Invested → less Capital Blocked → the residual In-Flow Capital that circulates. Section 4 tests whether that in-flow capital generates enough gross profit, benchmarked against the editable {hurdle}% cost-of-capital hurdle.</div>
          </>)}
        </div>
      </div>
    </div>
  );
}
