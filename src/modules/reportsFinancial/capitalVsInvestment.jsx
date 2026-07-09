// ─── Capital vs Investment — LIVE dashboard (Dashboard ▸ AD Dashboards) ───────
// 100% live from the posted Balance Sheet & P&L via /api/accounting/capital-analysis.
// Sequence: Capital Invested → less Capital Blocked → residual In-Flow Capital,
// then Section 4 tests whether that in-flow capital earns enough gross profit
// (benchmarked against an editable cost-of-capital hurdle). No static data.
import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../../core/api';
import { periodRange } from '../../core/period';
import { bc } from '../../core/styleTokens';

const DEFAULT_HURDLE = 18; // initial cost-of-capital benchmark % — user-editable on screen
const brCodeOf = (b) => (b === 'ALL' ? 'ALL' : (b?.code || 'BOM'));
const dmy = (s) => { const d = new Date(s); return Number.isNaN(d.getTime()) ? s : `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })} ${d.getFullYear()}`; };
const fyLabel = (s) => { const d = new Date(s); const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return `${y}–${String(y + 1).slice(-2)}`; };

// Branch-aware money formatters. India branches keep ₹ + Indian grouping (Cr/L);
// USD branches ($ — NBO/DAR/FBM) use en-US grouping and K/M/B short scale.
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
.cvd .banner.muted{background:linear-gradient(90deg,#f3f5f9,#f9fafc);border-color:var(--line)}
.cvd .banner.muted .ic{background:var(--dim)}.cvd .banner.muted .t{color:var(--ink2)}.cvd .banner.muted .s{color:var(--dim)}

/* KPI strip */
.cvd .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:14px}
.cvd .kpi{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;position:relative;overflow:hidden}
.cvd .kpi::before{content:"";position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--primary)}
.cvd .kpi.amber::before{background:var(--amber)}.cvd .kpi.violet::before{background:var(--violet)}
.cvd .kpi.green::before{background:var(--green)}.cvd .kpi.slate::before{background:#64748b}.cvd .kpi.red::before{background:var(--red)}
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
/* collapsible statement tree — group ▸ sub-group ▸ ledger (ledgers collapse under sub-groups) */
.cvd .stmt{padding:4px 0;overflow-x:auto;-webkit-overflow-scrolling:touch}
.cvd .stmt-tools{display:flex;justify-content:flex-end;gap:6px;padding:8px 18px}
.cvd .stmt-tools button{font-size:10.5px;font-weight:700;color:var(--dim);background:#f1f3f8;border:1px solid var(--line);border-radius:6px;padding:4px 9px;cursor:pointer}
.cvd .stmt-tools button:hover{color:var(--primary-d);border-color:var(--primary)}
.cvd .grphd,.cvd .row.led{display:flex;align-items:center;gap:8px;padding:7px 18px;border-bottom:1px solid var(--line2);font-size:13px}
.cvd .grphd{background:#fafbfd;font-weight:800;color:var(--primary-d);text-transform:uppercase;font-size:10.5px;letter-spacing:.6px;
  cursor:pointer;width:100%;text-align:left;border-top:0;border-left:0;border-right:0;font-family:inherit}
.cvd .grphd:hover{background:#f3f6fb}
.cvd .grphd:focus-visible{outline:2px solid var(--primary);outline-offset:-2px}
.cvd .grphd .chev{color:var(--primary);font-weight:800;font-size:11px;display:inline-block;transition:transform .15s;flex:none}
.cvd .grphd.open .chev{transform:rotate(90deg)}
.cvd .grphd .nm{flex:1;min-width:0;overflow-wrap:anywhere}.cvd .grphd .cnt{color:var(--dim);font-weight:700;font-size:10px;flex:none}
.cvd .grphd .amt{text-transform:none;letter-spacing:0;font-size:13px;color:var(--ink);font-weight:800}
.cvd .subhd{display:flex;align-items:center;gap:8px;padding:7px 18px;border-bottom:1px solid var(--line2);font-size:13px;
  cursor:pointer;font-weight:700;color:var(--ink);width:100%;text-align:left;background:none;border-top:0;border-left:0;border-right:0;font-family:inherit}
.cvd .subhd:hover{background:#f3f6fb}
.cvd .subhd:focus-visible{outline:2px solid var(--primary);outline-offset:-2px}
.cvd .subhd .chev{color:var(--primary);font-weight:800;font-size:11px;display:inline-block;transition:transform .15s}
.cvd .subhd.open .chev{transform:rotate(90deg)}
.cvd .subhd .nm{flex:1;min-width:0;overflow-wrap:anywhere}.cvd .subhd .cnt{color:var(--dim);font-weight:600;font-size:10.5px;flex:none}
.cvd .row.led .nm{flex:1;min-width:0;overflow-wrap:anywhere;color:var(--ink2)}
.cvd .amt{font-variant-numeric:tabular-nums;white-space:nowrap;text-align:right;min-width:118px}.cvd .amt.neg{color:var(--red)}
.cvd .tag{font-size:8.5px;font-weight:800;padding:1px 6px;border-radius:4px;margin-left:8px;letter-spacing:.4px;vertical-align:middle}
.cvd .tag.bs{background:#eef2fb;color:var(--blue)}.cvd .tag.pl{background:#f3eefb;color:var(--violet)}
.cvd .kids{padding-left:16px;border-left:2px solid #eef1f7;margin-left:18px}
.cvd .kids.top{margin-left:0;padding-left:0;border-left:0}
.cvd .totrow{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 18px;font-size:14px;font-weight:800;border-top:2px solid var(--ink);background:#f7f9fc}
.cvd .totrow .amt{color:var(--primary-d);min-width:0}
.cvd .totrow.amberT .amt{color:var(--amber)}.cvd .totrow.greenT .amt{color:var(--green)}.cvd .totrow.redT .amt{color:var(--red)}
.cvd .totrow.subt{border-top:1px solid var(--line);font-size:13px;background:#fafbfe}.cvd .totrow.subt .amt{color:var(--ink)}
.cvd .secband{padding:8px 18px;font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase;color:#14396b;background:#f0f4fa;border-bottom:2px solid #14396b}
.cvd .adjrow{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 18px;font-weight:600;color:var(--ink2);border-bottom:1px solid var(--line2);font-size:13px}
.cvd .adjrow .amt{min-width:0}
.cvd .emptyrow{padding:16px 18px;color:var(--dim);font-size:12.5px}

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
  .cvd .kids{margin-left:10px;padding-left:8px}
  .cvd .grphd,.cvd .subhd,.cvd .row.led{padding-left:12px;padding-right:12px}
  .cvd .amt{min-width:96px}
}
`;

// ── collapsible Tally tree (group ▸ sub-group ▸ ledger, any depth) ─────────────
// Nodes are { name, amount, isGroup, src, items }. Every group is collapsible; the
// section-level TreeCtx seeds each group's initial open state and remounting on its key
// re-seeds it. Context is { mode, open }: mode 'all' (Expand/Collapse all) forces every
// group to `open`; mode 'default' opens groups per the section default but keeps a few
// naturally-long groups (Fixed Assets) folded so the section stays scannable.
const TreeCtx = React.createContext({ mode: 'default', open: false });
// Groups kept collapsed even when a section opens expanded (long ledger lists).
const COLLAPSED_BY_DEFAULT = new Set(['Fixed Assets', 'Sundry Debtors']);
const leafCount = (n) => (n.isGroup ? (n.items || []).reduce((s, c) => s + leafCount(c), 0) : 1);
const Amt = ({ v, fmt }) => <span className={`amt ${v < 0 ? 'neg' : ''}`}>{fmt(v)}</span>;

function LeafRow({ node, fmt }) {
  return (
    <div className="row led">
      <span className="nm">{node.name}<span className={`tag ${node.src === 'pl' ? 'pl' : 'bs'}`}>{node.src === 'pl' ? 'P&L' : 'BS'}</span></span>
      <Amt v={node.amount} fmt={fmt} />
    </div>
  );
}
// Every group — top-level or nested — is collapsible and seeds its open state from
// TreeCtx, so Expand all / Collapse all (and the default collapsed state) reach every
// level, not just deep sub-groups. Top-level groups keep the uppercase `grphd` look.
function GroupNode({ node, depth, fmt }) {
  const ctx = React.useContext(TreeCtx);
  // Expand/Collapse all (mode 'all') forces every group; the default state opens groups
  // unless they're in COLLAPSED_BY_DEFAULT (e.g. Fixed Assets stays folded).
  const initialOpen = ctx.mode === 'all' ? ctx.open : ctx.open && !COLLAPSED_BY_DEFAULT.has(node.name);
  const [open, setOpen] = useState(initialOpen);
  const top = depth === 0;
  return (
    <div className="node">
      <button type="button" className={`${top ? 'grphd' : 'subhd'} ${open ? 'open' : ''}`} aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="chev">›</span><span className="nm">{node.name}</span><span className="cnt">{leafCount(node)}</span><Amt v={node.amount} fmt={fmt} />
      </button>
      {open && <div className={`kids ${top ? 'top' : ''}`}>{(node.items || []).map((c, i) => <TreeNode key={i} node={c} depth={depth + 1} fmt={fmt} />)}</div>}
    </div>
  );
}
function TreeNode({ node, depth, fmt }) {
  if (!node.isGroup) return <LeafRow node={node} fmt={fmt} />;
  return <GroupNode node={node} depth={depth} fmt={fmt} />;
}
const TreeList = ({ nodes, fmt }) => (nodes || []).map((n, i) => <TreeNode key={i} node={n} depth={0} fmt={fmt} />);

// Statement wrapper — provides the expand/collapse-all controls and default open state.
// `defaultOpen` seeds the initial expand state (used by Section 1, which opens expanded).
function Stmt({ children, defaultOpen = false }) {
  const [gen, setGen] = useState({ mode: 'default', open: defaultOpen, k: 0 });
  return (
    <div className="stmt">
      <div className="stmt-tools">
        <button type="button" onClick={() => setGen((g) => ({ mode: 'all', open: true, k: g.k + 1 }))}>⊞ Expand all</button>
        <button type="button" onClick={() => setGen((g) => ({ mode: 'all', open: false, k: g.k + 1 }))}>⊟ Collapse all</button>
      </div>
      <TreeCtx.Provider value={{ mode: gen.mode, open: gen.open }}><div key={gen.k}>{children}</div></TreeCtx.Provider>
    </div>
  );
}
const TotRow = ({ label, val, tone, fmt }) => <div className={`totrow ${tone || ''}`}><span>{label}</span><Amt v={val} fmt={fmt} /></div>;
const SecBand = ({ label }) => <div className="secband">{label}</div>;
const Empty = ({ txt }) => <div className="emptyrow">{txt}</div>;

const NAV = [
  ['ov', 'Overview', '◆'], ['s1', 'Capital Employed', '①'], ['s2', 'Capital Blocked', '②'],
  ['s3', 'In-Flow Capital', '③'], ['cl', 'Credit Lines', '◈'], ['s4', 'Performance', '④'], ['s5', 'Balance Sheet', '⑤'], ['s6', 'Profit & Loss', '⑥'],
];
const PRESETS = [['all', 'All'], ['mtd', 'MTD'], ['qtd', 'QTD'], ['cfy', 'CFY'], ['lfy', 'LFY']];

export function CapitalVsInvestmentLive({ branch }) {
  const [preset, setPreset] = useState('cfy');
  const [hurdle, setHurdle] = useState(DEFAULT_HURDLE); // cost-of-capital % — editable
  const [active, setActive] = useState('ov');
  const range = useMemo(() => periodRange(preset, { branch }), [preset, branch]);
  const cur = (bc(branch) || {}).cur || '₹';
  const inr = (n) => fmtAmt(cur, n);   // full amount in branch currency
  const cr = (n) => fmtShort(cur, n);  // short scale (Cr/L · K/M/B)
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['capital-analysis', brCodeOf(branch), range.from, range.to],
    queryFn: () => apiGet('/api/accounting/capital-analysis', { branch: brCodeOf(branch) === 'ALL' ? '' : brCodeOf(branch), from: range.from, to: range.to }),
  });
  // Credit Lines & Capacity — facilities master + live "drawn" from the ledgers.
  // Own In-Flow inside the payload agrees with the capital-analysis figure above.
  const { data: creditData } = useQuery({
    queryKey: ['credit-capacity', brCodeOf(branch), range.from, range.to],
    queryFn: () => apiGet('/api/credit-facilities/capacity', { branch: brCodeOf(branch) === 'ALL' ? '' : brCodeOf(branch), from: range.from, to: range.to }),
  });

  const t = data?.totals || {};
  // Capital Employed (net of retained earnings) is the deployed base for allocation,
  // In-Flow and yields. Older payloads without the split fall back to capitalInvested.
  const employed = (t.capitalEmployed != null ? t.capitalEmployed : t.capitalInvested) || 0;
  const good = (t.gpYield || 0) >= hurdle;
  const flowComp = t.flowComposition || 0;
  const reconciles = Math.abs(flowComp - (t.inflowCapital || 0)) < 1;
  const hasData = Math.abs(t.capitalInvested || 0) > 0.5 || Math.abs(employed) > 0.5 || Math.abs(t.grossProfit || 0) > 0.5 || Math.abs(t.inflowCapital || 0) > 0.5 || Math.abs(t.grossRevenue || 0) > 0.5;

  // Complete P&L (all accounts) — the backend returns a signed statement tree; split it
  // into the trading part (Sales → Less COGS) and the indirect part (Add Other Income
  // → Less Operating Exp) so Gross Profit can sit between them.
  const plFull = data?.profitAndLoss || {};
  const nTrade = (plFull.sales || []).length + (plFull.cogs || []).length;
  const plIndirect = (plFull.statement || []).slice(nTrade);

  // Capital-bridge rows (sources → invested → employed → in-flow) — magnitudes only.
  const capSum = (data?.capital || []).reduce((s, g) => s + (g.amount || 0), 0);
  const retSum = (data?.capitalAdjust || []).reduce((s, g) => s + (g.amount || 0), 0); // + profit / − loss
  const bridge = [
    { nm: 'Capital & Reserves', v: capSum, c: '#0d9488' },
    ...((t.quasiCapital || 0) > 0.5 ? [{ nm: 'Owner & Partner Loans', v: t.quasiCapital, c: '#0d9488' }] : []),
    { nm: '= Capital Invested', v: t.capitalInvested || 0, c: 'linear-gradient(90deg,#14b8a6,#0b7d73)', b: true },
    ...((data?.capitalAdjust || []).length ? [{ nm: retSum < 0 ? 'Less: Accumulated Loss' : 'Add: Retained Profit', v: retSum, c: retSum < 0 ? '#dc2626' : '#16a34a' }] : []),
    { nm: '= Capital Employed', v: employed, c: 'linear-gradient(90deg,#14b8a6,#0b7d73)', b: true },
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
  const yieldDiffN = (t.gpYield || 0) - hurdle;      // signed points above/below hurdle
  const yieldDiff = Math.abs(yieldDiffN).toFixed(1); // magnitude for display

  // Scroll-spy: highlight the rail link for whatever section is in view.
  useEffect(() => {
    if (isLoading || error || !data) return undefined;
    const ids = NAV.map(([id]) => document.getElementById('cvd-' + id)).filter(Boolean);
    if (!ids.length || typeof IntersectionObserver === 'undefined') return undefined;
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id.replace('cvd-', '')); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ids.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, [isLoading, error, data]);

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
          <div className="big num">{cr(employed)}</div>
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
          {/* The report always renders once data has loaded — a branch with no postings
              shows every figure as zero (with a neutral banner) rather than a dead-end
              empty state, so it stays consistent across all branches. */}
          {!isLoading && !error && data && (<>
            {/* verdict banner — neutral when there are no postings yet */}
            <div className={`banner ${!hasData ? 'muted' : good ? '' : 'bad'}`}>
              <div className="ic">{!hasData ? '○' : good ? '✓' : '!'}</div>
              <div>
                <div className="t">{!hasData ? 'No postings recorded for this period yet' : good ? 'In-Flow capital IS generating enough gross profit' : 'In-Flow capital is NOT generating enough gross profit'}</div>
                <div className="s">{!hasData
                  ? <>This branch has no capital, asset or trading entries in the selected period — every figure below shows as {cr(0)}. Record vouchers to populate the analysis.</>
                  : good
                  ? <>{(t.gpYield || 0).toFixed(1)}% GP-yield on in-flow capital — <b>above</b> the {hurdle}% cost-of-capital hurdle. {(t.netProfit || 0) < 0
                    ? <>But operating costs of {cr(t.indirectExpense)} turn it into a <b>net loss of {cr(t.netProfit)}</b>.</>
                    : <>Working capital recycled {(t.flowTurnover || 0).toFixed(2)}× a year at a {(t.gpMargin || 0).toFixed(1)}% margin into {cr(t.grossRevenue)} of turnover.</>}</>
                  : <>{(t.gpYield || 0).toFixed(1)}% GP-yield on in-flow capital — <b>below</b> the {hurdle}% hurdle. Improve margin (currently {(t.gpMargin || 0).toFixed(1)}%), recycle capital faster (currently {(t.flowTurnover || 0).toFixed(2)}×), or release blocked capital into flow.</>}
                </div>
              </div>
            </div>

            {/* KPI strip */}
            <div className="kpis" id="cvd-ov">
              <div className="kpi"><div className="l">Capital Invested <span className="pill up">COMMITTED</span></div><div className="v num">{cr(t.capitalInvested)}</div><div className="s">Capital + owner &amp; partner loans</div></div>
              <div className="kpi"><div className="l">Capital Employed <span className="pill warn">NET</span></div><div className="v num">{cr(employed)}</div><div className="s">Invested, net of retained earnings</div></div>
              <div className="kpi amber"><div className="l">Capital Blocked <span className="pill warn">{(t.blockedPct || 0).toFixed(1)}%</span></div><div className="v num">{cr(t.capitalBlocked)}</div><div className="s">Fixed &amp; slow assets — tied up</div></div>
              <div className="kpi"><div className="l">In-Flow Capital <span className="pill up">{(t.inflowPct || 0).toFixed(1)}%</span></div><div className="v num">{cr(t.inflowCapital)}</div><div className="s">Circulating working capital</div></div>
              <div className="kpi violet"><div className="l">Gross Profit</div><div className="v num">{cr(t.grossProfit)}</div><div className="s">{(t.gpMargin || 0).toFixed(1)}% margin on turnover</div></div>
              <div className={`kpi ${(t.netProfit || 0) < 0 ? 'red' : 'green'}`}><div className="l">Net {(t.netProfit || 0) < 0 ? 'Loss' : 'Profit'}</div><div className="v num" style={{ color: (t.netProfit || 0) < 0 ? 'var(--red)' : undefined }}>{cr(t.netProfit)}</div><div className="s">After {cr(t.indirectExpense)} operating costs</div></div>
              <div className="kpi"><div className="l">GP Yield on In-Flow</div><div className="v num">{(t.gpYield || 0).toFixed(1)}%</div><div className="s">vs {hurdle}% hurdle · <span style={{ color: good ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{yieldDiffN >= 0 ? '+' : '−'}{yieldDiff} pts</span></div></div>
              <div className="kpi slate"><div className="l">Flow Turnover</div><div className="v num">{(t.flowTurnover || 0).toFixed(2)}×</div><div className="s">Turnover ÷ In-Flow</div></div>
            </div>

            {/* analytics row */}
            <div className="analytics">
              <div className="card">
                <div className="hd"><div className="ti">Capital Allocation</div><div className="mut">of {cr(employed)} employed</div></div>
                <div className="bd">
                  <div className="donutwrap">
                    <svg width="132" height="132" viewBox="0 0 132 132" aria-label="Blocked vs in-flow allocation">
                      <circle cx="66" cy="66" r="46" fill="none" stroke="#f1f3f8" strokeWidth="18" />
                      <circle cx="66" cy="66" r="46" fill="none" stroke="#d97706" strokeWidth="18" strokeDasharray={`${blkLen} ${DC}`} transform="rotate(-90 66 66)" />
                      <circle cx="66" cy="66" r="46" fill="none" stroke="#0d9488" strokeWidth="18" strokeDasharray={`${flwLen} ${DC}`} strokeDashoffset={`-${blkLen}`} transform="rotate(-90 66 66)" />
                      <text x="66" y="63" textAnchor="middle" fontSize="15" fontWeight="800" fill="#151b28">{cr(employed)}</text>
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

            {/* Section 1 · Capital Invested → Employed */}
            <div className="card section" id="cvd-s1">
              <div className="sec-hd"><span className="no teal">1</span><div><div className="tt">Capital Invested → Employed</div><div className="ds">Group ▸ sub-group ▸ ledger · Capital Account{(t.quasiCapital || 0) > 0.5 ? ' + owner & partner loans' : ''} = Invested; net of retained earnings = Employed</div></div><span className="right num" style={{ color: 'var(--primary-d)' }}>{inr(employed)}</span></div>
              <Stmt defaultOpen>
                <TreeList nodes={[...(data.capital || []), ...(data.quasi || [])]} fmt={inr} />
                <TotRow label="CAPITAL INVESTED" val={t.capitalInvested} fmt={inr} />
                {(data.capitalAdjust || []).map((a, i) => (
                  <div className="adjrow" key={i}><span>{a.name}</span><Amt v={a.amount} fmt={inr} /></div>
                ))}
                <TotRow label="CAPITAL EMPLOYED" val={employed} fmt={inr} />
              </Stmt>
            </div>

            {/* Section 2 · Capital Blocked */}
            <div className="card section" id="cvd-s2">
              <div className="sec-hd"><span className="no amber">2</span><div><div className="tt">Capital Blocked</div><div className="ds">Fixed assets · investments · deposits · advances — group ▸ sub-group ▸ ledger</div></div><span className="right num" style={{ color: 'var(--amber)' }}>{inr(t.capitalBlocked)}</span></div>
              <Stmt defaultOpen>
                <TreeList nodes={data.blocked} fmt={inr} />
                {!(data.blocked || []).length && <Empty txt="No blocked-capital accounts in this period." />}
                <TotRow label="TOTAL BLOCKED" val={t.capitalBlocked} tone="amberT" fmt={inr} />
              </Stmt>
            </div>

            {/* Section 3 · In-Flow Capital */}
            <div className="card section" id="cvd-s3">
              <div className="sec-hd"><span className="no teal">3</span><div><div className="tt">In-Flow Capital</div><div className="ds">Employed − Blocked · current-asset composition (group ▸ sub-group ▸ ledger)</div></div><span className="right num" style={{ color: 'var(--primary-d)' }}>{inr(t.inflowCapital)}</span></div>
              <div className="pad">
                <div className="formula">
                  <div className="cell"><div className="l">Capital Employed</div><div className="v num">{cr(employed)}</div></div>
                  <div className="op">−</div>
                  <div className="cell blk"><div className="l">Capital Blocked</div><div className="v num">{cr(t.capitalBlocked)}</div></div>
                  <div className="op">=</div>
                  <div className="cell res"><div className="l">In-Flow Capital</div><div className="v num">{cr(t.inflowCapital)}</div></div>
                </div>
                <div className="recon">Composition of current-asset ledgers totals <b>{inr(flowComp)}</b> — {reconciles ? 'reconciles with the in-flow residual ✓' : <>the <b>{inr(flowComp - (t.inflowCapital || 0))}</b> gap is financed by external funding (creditors · loans · current liabilities), which totals <b>{inr(t.externalFunding)}</b>.</>}</div>
              </div>
              <Stmt defaultOpen>
                <TreeList nodes={data.flow} fmt={inr} />
                {!(data.flow || []).length && <Empty txt="No current-asset ledgers in this period." />}
                <TotRow label="COMPOSITION TOTAL (CURRENT ASSETS)" val={flowComp} fmt={inr} />
              </Stmt>
            </div>

            {/* Credit Lines & Capacity — own In-Flow geared with cycle-credit.
                "Drawn" is read live from each facility's ledgers by /api/credit-facilities/capacity;
                Trading Capacity = own In-Flow + total undrawn credit. */}
            {(() => {
              const cd = creditData || {};
              const facs = cd.facilities || [];
              const undrawn = (cd.totals || {}).available || 0;
              const utilCol = (u) => (u >= 90 ? 'var(--red)' : u >= 70 ? 'var(--amber)' : 'var(--primary-d)');
              // Format each row in its OWN facility currency (so a consolidated view never
              // prints a $ line with a ₹ symbol); the capacity/own-In-Flow figures stay in
              // the selected branch's currency via cr().
              const fc = (f, n) => fmtShort(f.currency === 'USD' ? '$' : (f.currency === '₹' || f.currency === 'INR' ? '₹' : cur), n);
              const cell = { padding: '8px 10px', borderBottom: '1px solid var(--line2)' };
              const numCell = { ...cell, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
              return (
                <div className="card section" id="cvd-cl">
                  <div className="sec-hd"><span className="no teal">◈</span><div><div className="tt">Credit Lines &amp; Capacity</div><div className="ds">Own In-Flow geared with cycle-credit — “drawn” read live from the ledgers</div></div><span className="right num" style={{ color: 'var(--primary-d)' }}>{cr(cd.tradingCapacity || 0)}</span></div>
                  <div className="pad">
                    <div className="formula">
                      <div className="cell"><div className="l">Own In-Flow Capital</div><div className="v num">{cr(cd.ownInflow || 0)}</div></div>
                      <div className="op">+</div>
                      <div className="cell"><div className="l">Undrawn Credit</div><div className="v num">{cr(undrawn)}</div></div>
                      <div className="op">=</div>
                      <div className="cell res"><div className="l">Trading Capacity</div><div className="v num">{cr(cd.tradingCapacity || 0)}</div></div>
                    </div>
                    {facs.length ? (
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                          <thead><tr>
                            {['Facility', 'Type', 'Limit', 'Drawn', 'Available', 'Util'].map((h, i) => (
                              <th key={h} style={{ textAlign: i < 2 ? 'left' : 'right', padding: '8px 10px', fontSize: 10, letterSpacing: '.5px', textTransform: 'uppercase', color: 'var(--dim)', borderBottom: '1px solid var(--line)' }}>{h}</th>
                            ))}
                          </tr></thead>
                          <tbody>
                            {facs.map((f) => (
                              <tr key={f.id}>
                                <td style={{ ...cell, fontWeight: 700 }}>{f.name}{f.secured ? <span className="tag bs" style={{ marginLeft: 6 }}>FD</span> : null}</td>
                                <td style={{ ...cell, color: 'var(--dim)' }}>{f.type}</td>
                                <td style={numCell}>{fc(f, f.limit)}</td>
                                <td style={numCell}>{fc(f, f.drawn)}</td>
                                <td style={{ ...numCell, fontWeight: 700, color: f.overLimit ? 'var(--red)' : 'var(--primary-d)' }}>{f.overLimit ? `over ${fc(f, f.drawn - f.limit)}` : fc(f, f.available)}</td>
                                <td style={{ ...numCell, fontWeight: 700, color: utilCol(f.utilisation) }}>{f.utilisation}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="recon">No credit facilities set for this branch. Add them in <b>Masters ▸ Supplier Master ▸ Credit Facilities &amp; Limits</b> — “drawn” then reads live from each facility’s ledgers.</div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Section 4 · Performance */}
            <div className="card section" id="cvd-s4">
              <div className="sec-hd"><span className="no">4</span><div><div className="tt">Turnover · Gross Profit · Net Profit</div><div className="ds">Trading — group ▸ sub-group (module) ▸ ledger</div></div><span className="right num" style={{ color: 'var(--violet)' }}>{inr(t.grossProfit)} GP</span></div>
              <div className="pad">
                <div className="formula">
                  <div className="cell"><div className="l">Gross Profit</div><div className="v num">{cr(t.grossProfit)}</div></div>
                  <div className="op">+</div>
                  <div className="cell"><div className="l">Other Income</div><div className="v num">{cr(t.indirectIncome)}</div></div>
                  <div className="op">−</div>
                  <div className="cell blk"><div className="l">Operating Exp.</div><div className="v num">{cr(t.indirectExpense)}</div></div>
                  <div className="op">=</div>
                  <div className="cell res"><div className="l">Net Profit</div><div className="v num" style={{ color: (t.netProfit || 0) < 0 ? 'var(--red)' : 'var(--primary-d)' }}>{cr(t.netProfit)}</div></div>
                </div>
                <div className="perfrow">
                  <div className="pcard"><div className="l">Flow Turnover</div><div className="v num">{(t.flowTurnover || 0).toFixed(2)}×</div><div className="d">Turnover ÷ In-Flow Capital — times working capital is recycled</div></div>
                  <div className="pcard"><div className="l">GP Yield on In-Flow</div><div className="v num">{(t.gpYield || 0).toFixed(1)}%</div><div className="d">Gross Profit ÷ In-Flow Capital — pre-operating return</div></div>
                  <div className="pcard"><div className="l">Net Yield on In-Flow</div><div className="v num" style={{ color: (t.netYield || 0) < 0 ? 'var(--red)' : 'var(--primary-d)' }}>{(t.netYield || 0).toFixed(1)}%</div><div className="d">Net Profit ÷ In-Flow Capital — after operating costs</div></div>
                </div>
              </div>
              <Stmt>
                <TreeList nodes={data.revenue} fmt={inr} />
                <TotRow label={`GROSS PROFIT · ${(t.gpMargin || 0).toFixed(1)}% margin`} val={t.grossProfit} fmt={inr} />
              </Stmt>
            </div>

            {/* Section 5 · Complete Balance Sheet — vertical, collapsible */}
            <div className="card section" id="cvd-s5">
              <div className="sec-hd"><span className="no">5</span><div><div className="tt">Complete Balance Sheet</div><div className="ds">Every account, both sides — as on {dmy(range.to)} · {data.balanceSheet?.balanced ? 'balanced ✓' : '⚠ unbalanced'}</div></div><span className="right num">{inr(t.totalAssets)}</span></div>
              <Stmt>
                <SecBand label="I.  Equity & Liabilities" />
                <TreeList nodes={data.balanceSheet?.liabilities} fmt={inr} />
                <TotRow label="TOTAL — EQUITY & LIABILITIES" val={t.totalLiabilities} fmt={inr} />
                <SecBand label="II. Assets" />
                <TreeList nodes={data.balanceSheet?.assets} fmt={inr} />
                <TotRow label="TOTAL — ASSETS" val={t.totalAssets} fmt={inr} />
              </Stmt>
            </div>

            {/* Section 6 · Complete P&L — vertical, collapsible */}
            <div className="card section" id="cvd-s6">
              <div className="sec-hd"><span className="no">6</span><div><div className="tt">Complete Profit &amp; Loss</div><div className="ds">Trading → Gross Profit → Net {(t.netProfit || 0) < 0 ? 'Loss' : 'Profit'} · group ▸ sub-group ▸ ledger</div></div><span className="right num" style={{ color: (t.netProfit || 0) < 0 ? 'var(--red)' : 'var(--green)' }}>{inr(t.netProfit)} {(t.netProfit || 0) < 0 ? 'NL' : 'NP'}</span></div>
              <Stmt>
                <SecBand label="Income — Revenue & Direct Income, less Cost of Sales" />
                <TreeList nodes={data.revenue} fmt={inr} />
                <TotRow label="GROSS PROFIT" val={t.grossProfit} tone="subt" fmt={inr} />
                <SecBand label="Add: Other Income · Less: Indirect / Operating Expenses" />
                <TreeList nodes={plIndirect} fmt={inr} />
                <TotRow label={`NET ${(t.netProfit || 0) < 0 ? 'LOSS' : 'PROFIT'} (to Capital A/c)`} val={t.netProfit} tone={(t.netProfit || 0) < 0 ? 'redT' : 'greenT'} fmt={inr} />
              </Stmt>
            </div>

            <div className="foot">Read-only · live from the posted <b>Balance Sheet</b> and <b>Profit &amp; Loss</b>. Sequence: Capital Invested → less Capital Blocked → the residual In-Flow Capital that circulates. Section 4 tests whether that in-flow capital generates enough gross profit, benchmarked against the editable {hurdle}% cost-of-capital hurdle.</div>
          </>)}
        </div>
      </div>
    </div>
  );
}
