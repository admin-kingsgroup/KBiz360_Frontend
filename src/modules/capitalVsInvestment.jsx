// ─── Capital vs Investment — LIVE (Dashboard ▸ Overview) ──────────────────────
// 100% live from the posted Balance Sheet & P&L via /api/accounting/capital-analysis.
// Sequence: Capital Invested → less Capital Blocked → residual In-Flow Capital,
// then Section 4 tests whether that in-flow capital earns enough gross profit
// (benchmarked against an assumed cost-of-capital hurdle). No static data.
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../core/api';
import { PeriodBar } from '../core/period';
import { bc } from '../core/styleTokens';

const DEFAULT_HURDLE = 18; // initial cost-of-capital benchmark % — user-editable on screen
const brCodeOf = (b) => (b === 'ALL' ? 'ALL' : (b?.code || 'BOM'));
const fyDefault = () => { const d = new Date(); const y = d.getMonth() >= 3 ? d.getFullYear() : d.getFullYear() - 1; return { from: `${y}-04-01`, to: d.toISOString().slice(0, 10) }; };
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
.cvi{--gold:#A07828;--gold-l:#C49A3C;--dark:#111;--ink:#1A1A1A;--ink2:#3A3A3A;--ink3:#6A6A6A;--ink4:#9A9A9A;--rule:#DEDBD4;--bg-lt:#F7F4EF;--paper:#FFF;--flow:#1B6B4C;--flow-l:#e7f3ec;--block:#B7791F;--cr:#9B2C2C;--bs:#2C5C8F;--bs-l:#e8f0f8;--pl:#7A4DA0;--pl-l:#f1ebf7;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:var(--ink)}
.cvi *{box-sizing:border-box}
.cvi .sheet{max-width:1000px;margin:0 auto;background:var(--paper);border-left:4px solid var(--gold);box-shadow:0 8px 40px rgba(0,0,0,.12);border-bottom:3px solid var(--gold)}
.cvi .hdr{padding:20px 30px 14px;border-bottom:1.5px solid var(--dark);display:flex;justify-content:space-between;align-items:flex-end;flex-wrap:wrap;gap:14px}
.cvi .logo{font-size:23px;font-weight:800;letter-spacing:2px}
.cvi .sub{font-size:8.5px;letter-spacing:2.5px;color:var(--ink4);font-weight:700}
.cvi .doc-title{text-align:right}.cvi .doc-title h1{font-size:15px;font-weight:800}.cvi .doc-title .accent{height:3px;background:var(--gold);margin-top:4px}
.cvi .badge{display:inline-block;margin-top:6px;font-size:9px;font-weight:800;letter-spacing:1px;color:var(--gold);text-transform:uppercase}
.cvi .fetchbar{display:flex;align-items:center;gap:14px;padding:9px 30px;background:var(--dark);color:#fff;flex-wrap:wrap}
.cvi .live{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:700}
.cvi .pulse{width:8px;height:8px;border-radius:50%;background:#3ad08a;animation:cvipulse 2s infinite}
@keyframes cvipulse{0%{box-shadow:0 0 0 0 rgba(58,208,138,.5)}70%{box-shadow:0 0 0 7px rgba(58,208,138,0)}100%{box-shadow:0 0 0 0 rgba(58,208,138,0)}}
.cvi .src{font-size:10.5px;color:#cfcfcf}.cvi .src b{color:var(--gold-l)}
.cvi .tag{font-size:8.5px;font-weight:800;padding:2px 7px;border-radius:4px;text-transform:uppercase;margin-left:8px;vertical-align:middle}
.cvi .tag.bs{background:var(--bs-l);color:var(--bs)}.cvi .tag.pl{background:var(--pl-l);color:var(--pl)}
.cvi .meta{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;padding:14px 30px;border-bottom:1px solid var(--rule)}
.cvi .meta .l{font-size:9px;font-weight:700;letter-spacing:1px;color:var(--gold);text-transform:uppercase;margin-bottom:3px}
.cvi .meta .v{font-size:13px;font-weight:700}
.cvi .kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;padding:18px 30px 6px}
.cvi .kpi{border:1px solid var(--rule);border-radius:8px;padding:13px 15px;background:var(--bg-lt)}
.cvi .kpi .k{font-size:9px;font-weight:700;color:var(--ink4);text-transform:uppercase}
.cvi .kpi .v{font-size:18px;font-weight:800;margin-top:5px}
.cvi .kpi .s{font-size:11px;font-weight:700;margin-top:2px;color:var(--ink3)}
.cvi .kpi.block .v,.cvi .kpi.block .s{color:var(--block)}.cvi .kpi.flow .v,.cvi .kpi.flow .s{color:var(--flow)}.cvi .kpi.gp .v{color:var(--gold)}
.cvi .section{padding:16px 30px 4px}
.cvi .sec-band{display:flex;align-items:center;gap:10px;margin-bottom:8px}
.cvi .sec-num{width:22px;height:22px;border-radius:50%;background:var(--dark);color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center}
.cvi .sec-num.flow{background:var(--flow)}.cvi .sec-num.block{background:var(--block)}
.cvi .sec-name{font-size:12.5px;font-weight:800;text-transform:uppercase}
.cvi .sec-sub{font-size:10px;color:var(--ink4);font-style:italic}
.cvi table{width:100%;border-collapse:collapse}
.cvi .grp-row td{padding:8px 8px 4px;font-size:11px;font-weight:800;text-transform:uppercase;border-bottom:.5px solid var(--rule)}
.cvi .led-row td{padding:5px 8px;font-size:12px;border-bottom:.5px dotted #e9e5db}
.cvi .led-row td.nm{color:var(--ink2);padding-left:24px}
.cvi .led-row td.amt{text-align:right;font-weight:600;width:160px;font-variant-numeric:tabular-nums}
.cvi .led-row td.amt.neg{color:var(--cr)}
.cvi .sub-row td{padding:6px 8px;font-size:12px;font-weight:700;border-bottom:1px solid var(--rule);color:var(--ink3)}
.cvi .sub-row td.amt{text-align:right;color:var(--ink)}.cvi .sub-row td.nm{padding-left:14px}
.cvi .tot-row td{padding:9px 8px;font-size:13px;font-weight:800;border-top:1.5px solid var(--dark);background:var(--bg-lt)}
.cvi .tot-row td.amt{text-align:right}
.cvi .seccap .tot-row td.amt{color:var(--gold)}.cvi .secblock .tot-row td.amt{color:var(--block)}.cvi .secrev .tot-row td.amt{color:var(--pl)}
.cvi .sec-divider{height:1px;background:var(--rule);margin:14px 30px 0}
.cvi .formula{display:flex;margin:8px 0 6px;border:1px solid var(--rule);border-radius:8px;overflow:hidden}
.cvi .formula .cell{flex:1;padding:14px 16px;text-align:center;border-right:1px solid var(--rule)}
.cvi .formula .cell:last-child{border-right:none}
.cvi .formula .cell .k{font-size:9px;font-weight:700;color:var(--ink4);text-transform:uppercase}
.cvi .formula .cell .v{font-size:18px;font-weight:800;margin-top:4px}
.cvi .formula .op{display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:var(--ink3);flex:0 0 30px;border-right:1px solid var(--rule)}
.cvi .formula .cell.inv .v{color:var(--gold)}.cvi .formula .cell.blk .v{color:var(--block)}.cvi .formula .cell.res{background:var(--flow-l)}.cvi .formula .cell.res .v{color:var(--flow);font-size:20px}
.cvi .reconcile{font-size:10.5px;color:var(--ink3);font-style:italic;margin:2px 2px 8px}.cvi .reconcile b{color:var(--flow);font-style:normal}
.cvi .perf{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:6px 30px 4px}
.cvi .pcard{border:1px solid var(--rule);border-radius:8px;padding:13px 15px}
.cvi .pcard .k{font-size:9.5px;font-weight:700;color:var(--ink4);text-transform:uppercase}
.cvi .pcard .v{font-size:22px;font-weight:800;color:var(--gold);margin-top:4px}
.cvi .pcard .d{font-size:10px;color:var(--ink4);margin-top:2px;line-height:1.4}
.cvi .verdict{margin:12px 30px 6px;padding:14px 18px;border-radius:8px;display:flex;align-items:flex-start;gap:12px}
.cvi .verdict.good{background:var(--flow-l);border:1px solid #bfe0cd}.cvi .verdict.bad{background:#fbeaea;border:1px solid #f0c9c9}
.cvi .verdict .icon{font-size:20px}.cvi .verdict .t{font-size:13px;font-weight:800}
.cvi .verdict.good .t{color:var(--flow)}.cvi .verdict.bad .t{color:var(--cr)}
.cvi .verdict .x{font-size:11.5px;color:var(--ink2);margin-top:4px;line-height:1.6}
.cvi .summary-line{margin:14px 30px 6px;padding:14px 18px;background:var(--dark);color:#fff;border-radius:8px;font-size:13px;line-height:1.7}.cvi .summary-line b{color:var(--gold-l)}
.cvi .hint{padding:10px 30px 22px;font-size:10px;color:var(--ink4);font-style:italic;line-height:1.6}
.cvi .state{padding:50px 30px;text-align:center;color:var(--ink3);font-size:13px}
@media(max-width:760px){.cvi .meta,.cvi .kpis,.cvi .perf{grid-template-columns:1fr 1fr}.cvi .formula{flex-wrap:wrap}}
`;

const SecTable = ({ groups, totalLabel, totalVal, fmt }) => (
  <table>
    <tbody>
      {(groups || []).map((g, gi) => (
        <React.Fragment key={gi}>
          <tr className="grp-row"><td colSpan={2}>{g.grp}</td></tr>
          {(g.ledgers || []).map((l, li) => (
            <tr className="led-row" key={li}>
              <td className="nm">{l.n}<span className={`tag ${g.src}`}>{g.src === 'pl' ? 'P&L' : 'BS'}</span></td>
              <td className={`amt ${l.a < 0 ? 'neg' : ''}`}>{fmt(l.a)}</td>
            </tr>
          ))}
          <tr className="sub-row"><td className="nm">{g.grp} — subtotal</td><td className="amt">{fmt(g.total)}</td></tr>
        </React.Fragment>
      ))}
      {totalLabel && <tr className="tot-row"><td>{totalLabel}</td><td className="amt">{fmt(totalVal)}</td></tr>}
      {(!groups || !groups.length) && <tr><td colSpan={2} style={{ padding: 14, color: '#9A9A9A', fontSize: 12 }}>No ledgers in this bucket.</td></tr>}
    </tbody>
  </table>
);

export function CapitalVsInvestmentLive({ branch }) {
  const [range, setRange] = useState(fyDefault);
  const [hurdle, setHurdle] = useState(DEFAULT_HURDLE); // cost-of-capital % — editable
  const cur = (bc(branch) || {}).cur || '₹';            // branch currency (₹ India · $ NBO/DAR/FBM)
  const inr = (n) => fmtAmt(cur, n);                    // full amount in branch currency
  const cr = (n) => fmtShort(cur, n);                   // short scale (Cr/L · K/M/B)
  const { data, isLoading, error } = useQuery({
    queryKey: ['capital-analysis', brCodeOf(branch), range.from, range.to],
    queryFn: () => apiGet('/api/accounting/capital-analysis', { branch: brCodeOf(branch) === 'ALL' ? '' : brCodeOf(branch), from: range.from, to: range.to }),
  });

  const t = data?.totals || {};
  const good = (t.gpYield || 0) >= hurdle;
  const flowComp = t.flowComposition || 0;
  const reconciles = Math.abs(flowComp - (t.inflowCapital || 0)) < 1;
  // No capital/GP posted → show an empty state rather than a misleading verdict on zeros.
  const hasData = Math.abs(t.capitalInvested || 0) > 0.5 || Math.abs(t.grossProfit || 0) > 0.5 || Math.abs(t.inflowCapital || 0) > 0.5 || Math.abs(t.grossRevenue || 0) > 0.5;

  return (
    <div className="cvi">
      <style>{CSS}</style>
      <div className="sheet">
        <div className="hdr">
          <div><div className="logo">{brCodeOf(branch)}</div><div className="sub">KBIZ360 · CHART OF ACCOUNTS</div></div>
          <div className="doc-title"><h1>CAPITAL VS INVESTMENT</h1><div className="accent" /><span className="badge">Detailed · Ledger-wise · Live</span></div>
        </div>

        <div className="fetchbar">
          <div className="live"><span className="pulse" />AUTO-FETCHED</div>
          <div className="src">Source: <b>Balance Sheet</b> &amp; <b>Profit &amp; Loss</b> · KBiz360 · read-only</div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ fontSize: 10.5, color: '#cfcfcf', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>Hurdle %
              <input type="number" min="0" step="0.5" value={hurdle} onChange={(e) => setHurdle(Number(e.target.value) || 0)}
                title="Cost-of-capital benchmark used for the GP-yield verdict" style={{ width: 58, padding: '4px 7px', borderRadius: 4, border: '1px solid #555', background: '#1e1e1e', color: '#fff', fontSize: 11, fontWeight: 700 }} />
            </label>
            <PeriodBar branch={branch} compact defaultPreset="all" onChange={(r) => setRange({ from: r.from, to: r.to })} />
          </div>
        </div>

        <div className="meta">
          <div><div className="l">Branch</div><div className="v">{brCodeOf(branch)}</div></div>
          <div><div className="l">As On</div><div className="v">{dmy(range.to)}</div></div>
          <div><div className="l">Financial Year</div><div className="v">{fyLabel(range.to)}</div></div>
        </div>

        {isLoading && <div className="state">Loading live capital analysis…</div>}
        {error && <div className="state" style={{ color: '#9B2C2C' }}>Couldn’t load: {String(error.message || error)}</div>}
        {!isLoading && !error && data && !hasData && (
          <div className="state">No capital or gross-profit postings for this period. Record vouchers to populate the capital-vs-investment analysis.</div>
        )}

        {!isLoading && !error && data && hasData && (<>
          <div className="kpis">
            <div className="kpi"><div className="k">Capital Invested</div><div className="v">{cr(t.capitalInvested)}</div><div className="s">capital employed</div></div>
            <div className="kpi block"><div className="k">Capital Blocked</div><div className="v">{cr(t.capitalBlocked)}</div><div className="s">{(t.blockedPct || 0).toFixed(1)}% of capital</div></div>
            <div className="kpi flow"><div className="k">In-Flow Capital</div><div className="v">{cr(t.inflowCapital)}</div><div className="s">{(t.inflowPct || 0).toFixed(1)}% of capital</div></div>
            <div className="kpi gp"><div className="k">Gross Profit</div><div className="v">{cr(t.grossProfit)}</div><div className="s">{(t.gpMargin || 0).toFixed(1)}% margin</div></div>
          </div>

          <div className="section seccap">
            <div className="sec-band"><span className="sec-num">1</span><span className="sec-name">Capital Invested</span><span className="sec-sub">Capital Account + Reserves &amp; Surplus + accumulated P&amp;L — from Balance Sheet</span></div>
            <SecTable groups={data.capital} totalLabel="CAPITAL EMPLOYED" totalVal={t.capitalInvested} fmt={inr} />
          </div>
          <div className="sec-divider" />

          <div className="section secblock">
            <div className="sec-band"><span className="sec-num block">2</span><span className="sec-name">Capital Blocked</span><span className="sec-sub">fixed &amp; slow assets — tied up, not circulating</span></div>
            <SecTable groups={data.blocked} totalLabel="TOTAL BLOCKED" totalVal={t.capitalBlocked} fmt={inr} />
          </div>
          <div className="sec-divider" />

          <div className="section secflow">
            <div className="sec-band"><span className="sec-num flow">3</span><span className="sec-name">In-Flow Capital</span><span className="sec-sub">what's left to circulate &amp; earn = Invested − Blocked</span></div>
            <div className="formula">
              <div className="cell inv"><div className="k">Capital Invested</div><div className="v">{cr(t.capitalInvested)}</div></div>
              <div className="op">−</div>
              <div className="cell blk"><div className="k">Capital Blocked</div><div className="v">{cr(t.capitalBlocked)}</div></div>
              <div className="op">=</div>
              <div className="cell res"><div className="k">In-Flow Capital</div><div className="v">{cr(t.inflowCapital)}</div></div>
            </div>
            <div className="reconcile">Composition of current-asset ledgers totals <b>{inr(flowComp)}</b> — {reconciles ? 'reconciles with the in-flow residual ✓' : `difference ${inr((t.inflowCapital || 0) - flowComp)} (funded by current liabilities)`}</div>
            <SecTable groups={data.flow} totalLabel="COMPOSITION TOTAL (CURRENT ASSETS)" totalVal={flowComp} fmt={inr} />
          </div>
          <div className="sec-divider" />

          <div className="section secrev">
            <div className="sec-band"><span className="sec-num">4</span><span className="sec-name">Turnover &amp; GP Performance</span><span className="sec-sub">is the in-flow capital generating enough gross profit? — from P&amp;L</span></div>
            <SecTable groups={data.revenue} totalLabel="GROSS PROFIT" totalVal={t.grossProfit} fmt={inr} />
            <div className="perf">
              <div className="pcard"><div className="k">Flow Turnover</div><div className="v">{(t.flowTurnover || 0).toFixed(2)}×</div><div className="d">Revenue ÷ In-Flow Capital — times the working capital is recycled</div></div>
              <div className="pcard"><div className="k">GP Margin</div><div className="v">{(t.gpMargin || 0).toFixed(1)}%</div><div className="d">Gross Profit ÷ Revenue — margin earned on sales</div></div>
              <div className="pcard"><div className="k">GP Yield on In-Flow Capital</div><div className="v">{(t.gpYield || 0).toFixed(1)}%</div><div className="d">Gross Profit ÷ In-Flow Capital — return the working capital throws off</div></div>
            </div>
            <div className={`verdict ${good ? 'good' : 'bad'}`}>
              <div className="icon">{good ? '✓' : '!'}</div>
              <div>
                <div className="t">{good ? 'In-Flow capital IS generating enough gross profit' : 'In-Flow capital is NOT generating enough gross profit'}</div>
                <div className="x">{good
                  ? <>Every {cur}1 of in-flow capital throws off <b>{cur}{((t.gpYield || 0) / 100).toFixed(2)}</b> of gross profit a year ({(t.gpYield || 0).toFixed(1)}% yield) — above the {hurdle}% cost-of-capital hurdle. Working capital is recycled {(t.flowTurnover || 0).toFixed(2)}× at a {(t.gpMargin || 0).toFixed(1)}% margin.</>
                  : <>In-flow capital yields only {(t.gpYield || 0).toFixed(1)}%, below the {hurdle}% cost-of-capital hurdle. Improve margin (currently {(t.gpMargin || 0).toFixed(1)}%) or recycle capital faster (currently {(t.flowTurnover || 0).toFixed(2)}×), or release blocked capital into flow.</>}
                </div>
              </div>
            </div>
          </div>

          <div className="summary-line">
            <b>{cr(t.capitalInvested)}</b> invested − <b>{cr(t.capitalBlocked)}</b> blocked = <b>{cr(t.inflowCapital)}</b> in flow → recycled <b>{(t.flowTurnover || 0).toFixed(2)}×</b> into <b>{cr(t.grossRevenue)}</b> turnover at <b>{(t.gpMargin || 0).toFixed(1)}%</b> margin = <b>{cr(t.grossProfit)}</b> GP (a {(t.gpYield || 0).toFixed(0)}% yield on in-flow capital).
          </div>
          <div className="hint">Read-only · live from posted Balance Sheet (BS) and Profit &amp; Loss (P&amp;L). Sequence: <b>Capital Invested</b> → less <b>Capital Blocked</b> → the residual <b>In-Flow Capital</b> that actually circulates. Section 4 tests whether that in-flow capital generates enough gross profit, benchmarked against the editable {hurdle}% cost-of-capital hurdle.</div>
        </>)}
      </div>
    </div>
  );
}
