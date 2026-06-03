/* ════════════════════════════════════════════════════════════════════
   MODULES/REPORTS-FINANCIAL.JSX

   The Reports → Profit & Loss and Balance Sheet screens, restyled to the
   SAP-Fiori / Tally-Classic look & feel, rendered from LIVE data:

     Profit & Loss  →  GET /api/accounting/module-pl   (module-wise GP →
                       indirect overheads → Net Profit bridge)
     Balance Sheet  →  GET /api/accounting/balance-sheet (group → ledger,
                       Tally-Classic ⇄ Fiori vertical toggle)

   Honest-data notes (mockup asked for things the books don't carry yet):
     · P&L sub-rows are real booking files (by Link No), not the mock's
       International/Domestic split (no int'l/domestic flag on a voucher).
     · The P&L bottom line is Net Profit (Gross − overheads). There is no
       fabricated "Provision for Tax @ 25.17%" line — tax shows only if a
       real tax ledger is posted under indirect expenses.
     · Prior-year columns/trends fetch the previous FY live and compare.
   ════════════════════════════════════════════════════════════════════ */

import React, { useMemo, useState } from 'react';
import { card, inp, bc } from '../core/styles';
import { useModulePL, useBalanceSheet, useLedgerStatement, useAgeing } from '../core/useAccounting';
import { VoucherEditor } from './accountingLive';
import { useMobile } from '../core/hooks';

/* ── palette (SAP Fiori) ─────────────────────────────────────────────── */
const SAP = {
  shell: '#1d2d3e', border: '#d9d9d9', borderLt: '#ededed',
  text: '#32363a', sec: '#6a6d70', label: '#8696a9',
  blue: '#0070f2', blueBg: '#e8f3ff', green: '#188918', greenBg: '#f1fdf1', greenDk: '#0d6b0d',
  red: '#bb0000', teal: '#04838f', purple: '#5c30a2', orange: '#e9730c', gold: '#c87b00',
  rowHover: '#f0f5ff', rowAlt: '#fafafa', headerBg: '#f0f3f4', pageBg: '#f5f6f7',
  grpBg: '#e8f0fb', grpText: '#0a2955', subBg: '#f3f7fc', subText: '#1a3a6e',
};
const SHADOW = '0 1px 4px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.08)';
const TALLY = { head: '#14396b', titlebar: '#dbe7f5', gold: '#b8860b', green: '#1a7a1a' };

/* ── number/format helpers ───────────────────────────────────────────── */
const curOf = (branch) => bc(branch).cur;
const branchLabel = (branch) => (!branch || branch === 'ALL' ? 'All branches' : (branch.code || branch));
const inr = (n) => { const v = Math.round(Number(n) || 0); return v ? v.toLocaleString('en-IN') : '—'; };
const paren = (n) => { const v = Math.round(Number(n) || 0); return v ? `(${v.toLocaleString('en-IN')})` : '—'; };
const compact = (cur, n) => {
  const v = Number(n) || 0, a = Math.abs(v);
  if (a >= 1e7) return `${cur}${(v / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${cur}${(v / 1e5).toFixed(2)} L`;
  return `${cur}${Math.round(v).toLocaleString('en-IN')}`;
};
const pctTxt = (p) => `${(Number(p) || 0).toFixed(2)}%`;
const gpColor = (p) => (p >= 13 ? SAP.greenDk : p >= 8 ? SAP.gold : SAP.orange);

/* ── financial-year helpers (Apr–Mar) ────────────────────────────────── */
function fyOptions() {
  const now = new Date();
  const sy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return Array.from({ length: 4 }, (_, i) => { const s = sy - i; return `${s}-${String(s + 1).slice(2)}`; });
}
const fyRange = (label) => { const s = parseInt(label.slice(0, 4), 10); return { from: `${s}-04-01`, to: `${s + 1}-03-31` }; };
const fyPrior = (label) => { const s = parseInt(label.slice(0, 4), 10); return fyRange(`${s - 1}-${String(s).slice(2)}`); };
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const asOn = (iso) => { if (!iso) return 'latest'; const d = new Date(iso); return `${String(d.getDate()).padStart(2, '0')}-${MON[d.getMonth()]}-${d.getFullYear()}`; };

/* ── tiny shared chrome ──────────────────────────────────────────────── */
function Wrap({ children }) {
  return <div style={{ maxWidth: 1180, margin: '0 auto', padding: '4px 6px 28px' }}>{children}</div>;
}
function FioriHead({ system, title, sub, right }) {
  return (
    <>
      <div style={{ background: SAP.shell, minHeight: 40, display: 'flex', alignItems: 'center', padding: '6px 16px', borderRadius: '8px 8px 0 0', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ background: '#fff', color: SAP.shell, width: 22, height: 22, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>KB</span>
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 700 }}>{system}</span>
        {right && <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>{right}</div>}
      </div>
      <div style={{ background: '#fff', padding: '12px 20px', border: `1px solid ${SAP.border}`, borderTop: 'none' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: SAP.text }}>{title}</div>
        <div style={{ fontSize: 12, color: SAP.sec, marginTop: 3 }}>{sub}</div>
      </div>
    </>
  );
}
const FyPicker = ({ fy, setFy, compare, setCompare, label = 'Period' }) => (
  <>
    <span style={{ color: '#fff', fontSize: 11, opacity: 0.8 }}>{label}</span>
    <select value={fy} onChange={(e) => setFy(e.target.value)} style={{ ...inp, width: 'auto', minHeight: 30, fontSize: 11, cursor: 'pointer' }}>
      <option value="ALL">All periods</option>
      {fyOptions().map((f) => <option key={f} value={f}>FY {f}</option>)}
    </select>
    {fy !== 'ALL' && (
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#fff', fontSize: 11, cursor: 'pointer' }}>
        <input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> vs prior&nbsp;yr
      </label>
    )}
  </>
);
function StateBox({ q, empty, children }) {
  if (q.isLoading) return <div style={{ ...card, padding: 30, textAlign: 'center', color: SAP.sec, fontSize: 12, borderRadius: '0 0 8px 8px' }}>Loading live data…</div>;
  if (q.isError) return <div style={{ ...card, padding: 16, color: SAP.red, fontSize: 12, fontWeight: 600, borderRadius: '0 0 8px 8px' }}>⚠ {q.error?.message || 'Failed to load from backend'}</div>;
  if (empty) return <div style={{ ...card, padding: 30, textAlign: 'center', color: SAP.sec, fontSize: 12, borderRadius: '0 0 8px 8px' }}>No data for this selection.</div>;
  return children;
}
function Kpi({ tone, label, value, sub, trend }) {
  const bar = { blue: SAP.blue, green: SAP.green, teal: SAP.teal, purple: SAP.purple, red: SAP.red, orange: SAP.orange }[tone] || SAP.blue;
  const vc = { green: SAP.greenDk, blue: SAP.blue, teal: SAP.teal, purple: SAP.purple, red: SAP.red }[tone] || SAP.text;
  return (
    <div style={{ background: '#fff', border: `1px solid ${SAP.border}`, borderRadius: 8, padding: 14, boxShadow: SHADOW, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: bar }} />
      <div style={{ fontSize: 10, fontWeight: 600, color: SAP.label, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 19, fontWeight: 700, color: vc }}>{value}</div>
      <div style={{ fontSize: 10, color: SAP.label, display: 'flex', gap: 6 }}>{trend}{sub}</div>
    </div>
  );
}
const KpiGrid = ({ children }) => <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 14 }}>{children}</div>;
function Trend({ cur, prev, invert }) {
  if (prev == null || !isFinite(prev) || prev === 0) return null;
  const p = ((cur - prev) / Math.abs(prev)) * 100, up = p >= 0, good = invert ? !up : up;
  return <span style={{ color: good ? SAP.green : SAP.red, fontWeight: 600 }}>{up ? '▲' : '▼'} {Math.abs(p).toFixed(1)}%</span>;
}
function FCard({ title, sub, badge, children }) {
  return (
    <div style={{ background: '#fff', border: `1px solid ${SAP.border}`, borderRadius: 8, boxShadow: SHADOW, overflow: 'hidden', marginBottom: 14 }}>
      <div style={{ padding: '12px 18px', borderBottom: `1px solid ${SAP.borderLt}`, background: SAP.headerBg, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div><div style={{ fontSize: 14, fontWeight: 700, color: SAP.text }}>{title}</div>{sub && <div style={{ fontSize: 11, color: SAP.sec, marginTop: 2 }}>{sub}</div>}</div>
        {badge}
      </div>
      {children}
    </div>
  );
}
const Badge = ({ children, bg = SAP.greenBg, c = SAP.greenDk, bd = '#b8ecb8' }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: bg, color: c, border: `1px solid ${bd}`, whiteSpace: 'nowrap' }}>{children}</span>
);
const Toggle = ({ open }) => <span style={{ display: 'inline-flex', width: 14, height: 14, border: '1px solid currentColor', borderRadius: 3, fontSize: 9, alignItems: 'center', justifyContent: 'center', marginRight: 7, opacity: 0.7 }}>{open ? '−' : '+'}</span>;
const num = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', padding: '7px 20px 7px 16px' };
// Booking-file drill rows (shared by single-leaf modules and sub-centres).
// Clickable when the file carries editable vouchers → opens the voucher drill.
function FileRows({ files, indent = 48, onPick }) {
  return (files || []).map((f, i) => {
    const drillable = !f.aggregate && (f.vouchers || []).length > 0;
    return (
      <tr key={(f.ref || '') + i} onClick={() => drillable && onPick && onPick(f)}
        style={{ background: i % 2 ? SAP.rowAlt : '#fff', borderBottom: `1px solid ${SAP.borderLt}`, fontStyle: f.aggregate ? 'italic' : 'normal', cursor: drillable ? 'pointer' : 'default' }}>
        <td style={{ padding: `5px 16px 5px ${indent}px`, color: SAP.text }}>{f.ref}{!f.aggregate && (f.customer || f.supplier) ? <span style={{ color: SAP.label }}> · {f.customer || f.supplier}</span> : null}{drillable ? <span style={{ color: SAP.blue, fontWeight: 700, marginLeft: 6 }}>›</span> : null}</td>
        <td style={num}>{inr(f.sale)}</td>
        <td style={num}>{inr(f.cost)}</td>
        <td style={{ ...num, color: f.gp >= 0 ? SAP.greenDk : SAP.red }}>{inr(f.gp)}</td>
        <td style={{ ...num, color: gpColor(f.gpPct) }}>{pctTxt(f.gpPct)}</td>
        <td style={num} />
      </tr>
    );
  });
}

/* ════════════════════════ Drill-to-voucher (touch) ═════════════════════ */
const tapRow = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: `1px solid ${SAP.borderLt}`, cursor: 'pointer' };

// Full-screen on phones, centred sheet on desktop. Tap the backdrop to close.
function Modal({ title, onClose, mobile, children }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.45)', zIndex: 800, display: 'flex', justifyContent: 'center', alignItems: mobile ? 'stretch' : 'flex-start', padding: mobile ? 0 : '5vh 12px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: mobile ? '100%' : 'min(720px, 96vw)', height: mobile ? '100%' : 'auto', maxHeight: mobile ? '100%' : '90vh', borderRadius: mobile ? 0 : 10, overflowY: 'auto', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
        <div style={{ position: 'sticky', top: 0, background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: `1px solid ${SAP.borderLt}`, zIndex: 2 }}>
          <div style={{ fontWeight: 700, color: SAP.text, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, lineHeight: 1, cursor: 'pointer', color: SAP.sec, padding: '2px 8px' }}>✕</button>
        </div>
        <div style={{ flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

// P&L booking file → its sale/purchase vouchers → edit (saving re-posts the journal).
function FileVoucherDrill({ file, cur, mobile, onClose }) {
  const [vid, setVid] = useState(null);
  const vouchers = file?.vouchers || [];
  return (
    <Modal title={vid ? 'Edit Voucher' : `${file.ref} — ${vouchers.length} voucher(s)`} onClose={onClose} mobile={mobile}>
      {vid
        ? <VoucherEditor voucherId={vid} cur={cur} onBack={() => setVid(null)} />
        : (vouchers.length === 0
          ? <div style={{ padding: 24, textAlign: 'center', color: SAP.sec, fontSize: 12 }}>Aggregated row — open a specific sub-centre to reach individual vouchers.</div>
          : vouchers.map((vh) => (
            <div key={vh.id} onClick={() => setVid(vh.id)} style={tapRow}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: SAP.blue, fontWeight: 600, fontSize: 12.5 }}>{vh.vno} <span style={{ color: SAP.label, fontWeight: 400 }}>· {vh.category} · {vh.date}</span></div>
                <div style={{ fontSize: 11, color: SAP.sec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{vh.party || '—'}</div>
              </div>
              <div style={{ fontWeight: 700, color: SAP.text, whiteSpace: 'nowrap' }}>{cur}{inr(vh.total)} ›</div>
            </div>
          )))}
    </Modal>
  );
}

// Balance-sheet ledger → its postings → the voucher → edit.
function LedgerVoucherDrill({ ledger, branch, to, cur, mobile, onClose }) {
  const [vid, setVid] = useState(null);
  const q = useLedgerStatement(ledger, branch, { to });
  const lines = q.data?.lines || [];
  return (
    <Modal title={vid ? 'Edit Voucher' : ledger} onClose={onClose} mobile={mobile}>
      {vid
        ? <VoucherEditor voucherId={vid} cur={cur} onBack={() => setVid(null)} />
        : (
          <>
            {q.isLoading && <div style={{ padding: 24, textAlign: 'center', color: SAP.sec }}>Loading ledger…</div>}
            {q.isError && <div style={{ padding: 16, color: SAP.red, fontSize: 12 }}>⚠ {q.error?.message}</div>}
            {!q.isLoading && lines.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: SAP.sec, fontSize: 12 }}>No postings up to this date.</div>}
            {lines.map((ln, i) => (
              <div key={i} onClick={() => ln.voucherId && setVid(ln.voucherId)} style={{ ...tapRow, cursor: ln.voucherId ? 'pointer' : 'default' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ color: SAP.blue, fontWeight: 600, fontSize: 12.5 }}>{ln.vno} <span style={{ color: SAP.label, fontWeight: 400 }}>· {ln.date}</span></div>
                  <div style={{ fontSize: 11, color: SAP.sec, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ln.narration || ln.party || ln.category}</div>
                </div>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <div style={{ fontWeight: 700, color: ln.debit ? SAP.blue : SAP.red, fontSize: 12 }}>{ln.debit ? `Dr ${inr(ln.debit)}` : `Cr ${inr(ln.credit)}`}</div>
                  {ln.voucherId ? <div style={{ fontSize: 10, color: SAP.label }}>tap to edit ›</div> : null}
                </div>
              </div>
            ))}
          </>
        )}
    </Modal>
  );
}
const Th = ({ children, right, w }) => <th style={{ background: '#f7f8f9', color: SAP.sec, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, padding: right ? '9px 20px 9px 16px' : '9px 16px', borderBottom: `2px solid ${SAP.border}`, textAlign: right ? 'right' : 'left', width: w }}>{children}</th>;

/* ════════════════════════ PROFIT & LOSS (Fiori) ════════════════════════ */
export function ReportPnLLive({ branch }) {
  const cur = curOf(branch);
  const [fy, setFy] = useState('ALL');
  const [compare, setCompare] = useState(true);
  const period = fy === 'ALL' ? { from: '', to: '' } : fyRange(fy);
  const showPY = fy !== 'ALL' && compare;
  const prior = showPY ? fyPrior(fy) : { from: '', to: '' };

  const q = useModulePL(branch, period);
  const qP = useModulePL(branch, prior);
  const d = q.data;
  const prev = showPY ? qP.data : null;

  const mobile = useMobile();
  const [openMod, setOpenMod] = useState({});
  const [openSub, setOpenSub] = useState({});
  const [openExp, setOpenExp] = useState({});
  const [drillFile, setDrillFile] = useState(null);

  const ranking = useMemo(() => (d?.modules || []).slice().sort((a, b) => b.gp - a.gp), [d]);
  // Estimated tax provision → PAT (matches the HTML's Section C; statutory rate, flagged estimated).
  const TAX_RATE = 0.2517;
  const tax = d ? Math.max(d.bridge.netProfit, 0) * TAX_RATE : 0;
  const pat = d ? d.bridge.netProfit - tax : 0;
  const ratios = useMemo(() => {
    if (!d) return [];
    const mods = (d.modules || []).filter((m) => m.sales > 0);
    const hi = mods.slice().sort((a, b) => b.gpPct - a.gpPct)[0];
    const lo = mods.slice().sort((a, b) => a.gpPct - b.gpPct)[0];
    const s = d.totals.sales || 0;
    return [
      ['Blended Gross Profit Margin', pctTxt(d.totals.gpPct)],
      ['Highest GP% Module', hi ? `${hi.name} (${pctTxt(hi.gpPct)})` : '—'],
      ['Lowest GP% Module', lo ? `${lo.name} (${pctTxt(lo.gpPct)})` : '—'],
      ['Indirect Exp. as % of GP', d.totals.gp ? pctTxt((d.indirect.expense / d.totals.gp) * 100) : '—'],
      ['Net Profit Margin (PBT)', pctTxt(s ? (d.bridge.netProfit / s) * 100 : 0)],
      ['Net Profit Margin (PAT)', pctTxt(s ? (pat / s) * 100 : 0)],
      ['Break-even GP needed', compact(cur, d.indirect.expense)],
    ];
  }, [d, pat, cur]);
  const periodTxt = fy === 'ALL' ? 'all periods' : `FY ${fy} (Apr–Mar)`;

  return (
    <Wrap>
      <FioriHead
        system="KBiz360 · Finance"
        title="Profit & Loss — Module-wise Gross Profit"
        sub={<><strong>{branchLabel(branch)}</strong> &nbsp;|&nbsp; {cur} INR (excl. GST) &nbsp;|&nbsp; {periodTxt} &nbsp;|&nbsp; Tally double-entry · live</>}
        right={<FyPicker fy={fy} setFy={setFy} compare={compare} setCompare={setCompare} />}
      />
      <div style={{ background: SAP.pageBg, padding: 16, border: `1px solid ${SAP.border}`, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
        <StateBox q={q} empty={!d || !(d.modules || []).length}>
          {d && <>
            {/* KPIs */}
            <KpiGrid>
              <Kpi tone="blue" label="Total Sales" value={compact(cur, d.totals.sales)}
                trend={prev && <Trend cur={d.totals.sales} prev={prev.totals?.sales} />} sub={`${(d.modules || []).length} modules`} />
              <Kpi tone="red" label="Total COGS" value={compact(cur, d.totals.cogs)} sub={`${pctTxt(d.totals.sales ? d.totals.cogs / d.totals.sales * 100 : 0)} of sales`} />
              <Kpi tone="green" label="Gross Profit" value={compact(cur, d.totals.gp)}
                trend={prev && <Trend cur={d.totals.gp} prev={prev.totals?.gp} />} sub={`GP ${pctTxt(d.totals.gpPct)}`} />
              <Kpi tone="orange" label="Indirect Expenses" value={compact(cur, d.indirect.expense)} sub={`${pctTxt(d.totals.sales ? d.indirect.expense / d.totals.sales * 100 : 0)} of sales`} />
              <Kpi tone="teal" label="Net Profit" value={compact(cur, d.bridge.netProfit)}
                trend={prev && <Trend cur={d.bridge.netProfit} prev={prev.bridge?.netProfit} />} sub={`NPM ${pctTxt(d.totals.sales ? d.bridge.netProfit / d.totals.sales * 100 : 0)}`} />
            </KpiGrid>

            {/* Section A — module / sub-centre GP (cost-centre driven) */}
            <FCard title="Section A — Module-wise Sales, COGS & Gross Profit"
              sub={`${(d.modules || []).length} modules · cost-centre driven · click a module → sub-centre → booking files · ${cur} excl. GST`}
              badge={<Badge bg={SAP.blueBg} c={SAP.blue} bd="#b8d6ff">{(d.modules || []).length} Modules</Badge>}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead><tr><Th w="34%">Module / Sub-centre / Booking File</Th><Th right>Sales</Th><Th right>COGS</Th><Th right>Gross Profit</Th><Th right w="10%">GP %</Th><Th right w="11%">% of Sales</Th></tr></thead>
                  <tbody>
                    {(d.modules || []).map((m) => {
                      const open = !!openMod[m.key];
                      const tag = m.hasSubs ? `${(m.subs || []).length} sub · ${m.fileCount} files` : `${m.fileCount} files`;
                      return (
                        <React.Fragment key={m.key}>
                          <tr onClick={() => setOpenMod((s) => ({ ...s, [m.key]: !s[m.key] }))}
                            style={{ background: SAP.grpBg, color: SAP.grpText, cursor: 'pointer', borderTop: '2px solid #b3ccf5' }}>
                            <td style={{ padding: '9px 16px', fontWeight: 700 }}><Toggle open={open} /><span style={{ marginRight: 6 }}>{m.icon}</span>{m.name}<span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 5, marginLeft: 8, background: '#fff', color: SAP.blue, border: '1px solid #b8d6ff' }}>{tag}</span></td>
                            <td style={{ ...num, fontWeight: 700 }}>{inr(m.sales)}</td>
                            <td style={{ ...num, fontWeight: 700 }}>{inr(m.cogs)}</td>
                            <td style={{ ...num, fontWeight: 700, color: SAP.greenDk }}>{inr(m.gp)}</td>
                            <td style={{ ...num, fontWeight: 700, color: gpColor(m.gpPct) }}>{pctTxt(m.gpPct)}</td>
                            <td style={{ ...num, color: SAP.sec }}>{pctTxt(m.pctOfSales)}</td>
                          </tr>
                          {/* multi-leaf modules (Flights/Holiday) → sub-centre rows → files */}
                          {open && m.hasSubs && (m.subs || []).map((s) => {
                            const sk = `${m.key}|${s.code}`;
                            const so = !!openSub[sk];
                            return (
                              <React.Fragment key={s.code}>
                                <tr onClick={() => setOpenSub((st) => ({ ...st, [sk]: !st[sk] }))}
                                  style={{ background: SAP.subBg, color: SAP.subText, cursor: 'pointer', borderBottom: `1px solid ${SAP.borderLt}` }}>
                                  <td style={{ padding: '6px 16px 6px 38px', fontWeight: 600 }}><Toggle open={so} />{s.name}<span style={{ fontSize: 9, color: SAP.label, marginLeft: 6 }}>· {s.fileCount} files</span></td>
                                  <td style={{ ...num, fontWeight: 600 }}>{inr(s.sales)}</td>
                                  <td style={{ ...num, fontWeight: 600 }}>{inr(s.cogs)}</td>
                                  <td style={{ ...num, fontWeight: 600, color: SAP.greenDk }}>{inr(s.gp)}</td>
                                  <td style={{ ...num, fontWeight: 600, color: gpColor(s.gpPct) }}>{pctTxt(s.gpPct)}</td>
                                  <td style={{ ...num, color: SAP.sec }}>{pctTxt(s.pctOfSales)}</td>
                                </tr>
                                {so && <FileRows files={s.files} indent={62} onPick={setDrillFile} />}
                              </React.Fragment>
                            );
                          })}
                          {/* single-leaf modules → files directly */}
                          {open && !m.hasSubs && <FileRows files={m.files} indent={48} onPick={setDrillFile} />}
                        </React.Fragment>
                      );
                    })}
                    <tr style={{ background: SAP.greenBg, color: SAP.greenDk, fontWeight: 700, borderTop: '2px solid #b8ecb8' }}>
                      <td style={{ padding: '10px 16px' }}>✚ TOTAL — Gross Profit (All Modules)</td>
                      <td style={num}>{inr(d.totals.sales)}</td>
                      <td style={num}>{inr(d.totals.cogs)}</td>
                      <td style={num}>{inr(d.totals.gp)}</td>
                      <td style={num}>{pctTxt(d.totals.gpPct)}</td>
                      <td style={num}>100%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </FCard>

            {/* Section B — indirect expenses */}
            <FCard title="Section B — Indirect Expenses (Overheads)"
              sub={`${(d.indirect.groups || []).length} expense group(s) · grouped by ledger sub-group · click to expand`}
              badge={<Badge bg="#fef7e0" c={SAP.gold} bd="#ffd966">{(d.indirect.groups || []).length} Groups</Badge>}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead><tr><Th w="48%">Expense Head</Th><Th right>Amount</Th><Th right>% of Group</Th><Th right>% of Sales</Th></tr></thead>
                  <tbody>
                    {(d.indirect.groups || []).length === 0 && <tr><td colSpan={4} style={{ padding: 18, textAlign: 'center', color: SAP.sec }}>No indirect overheads posted for this period.</td></tr>}
                    {(d.indirect.groups || []).map((g, gi) => {
                      const open = openExp[g.name] !== false; // default expanded
                      return (
                        <React.Fragment key={g.name}>
                          <tr onClick={() => setOpenExp((s) => ({ ...s, [g.name]: !(s[g.name] !== false) }))}
                            style={{ background: SAP.subBg, color: SAP.subText, cursor: 'pointer', borderTop: gi ? `1px solid ${SAP.border}` : 'none' }}>
                            <td style={{ padding: '8px 16px', fontWeight: 700 }}><Toggle open={open} />{g.name}</td>
                            <td style={{ ...num, fontWeight: 700, color: SAP.red }}>{inr(g.amount)}</td>
                            <td style={{ ...num, color: SAP.sec }}>100%</td>
                            <td style={{ ...num, color: SAP.sec }}>{pctTxt(g.pctOfSales)}</td>
                          </tr>
                          {open && (g.ledgers || []).map((l, i) => (
                            <tr key={i} style={{ background: i % 2 ? SAP.rowAlt : '#fff', borderBottom: `1px solid ${SAP.borderLt}` }}>
                              <td style={{ padding: '5px 16px 5px 48px', color: SAP.text }}>{l.name}</td>
                              <td style={{ ...num, color: SAP.red }}>{inr(l.amount)}</td>
                              <td style={{ ...num, color: SAP.sec }}>{pctTxt(l.pctOfGroup)}</td>
                              <td style={{ ...num, color: SAP.sec }}>{pctTxt(l.pctOfSales)}</td>
                            </tr>
                          ))}
                        </React.Fragment>
                      );
                    })}
                    <tr style={{ background: '#fff3f3', color: SAP.red, fontWeight: 700, borderTop: '1px solid #ffb3b3', borderBottom: '1px solid #ffb3b3' }}>
                      <td style={{ padding: '9px 16px' }}>TOTAL INDIRECT EXPENSES</td>
                      <td style={num}>{inr(d.indirect.expense)}</td>
                      <td style={num} />
                      <td style={num}>{pctTxt(d.totals.sales ? d.indirect.expense / d.totals.sales * 100 : 0)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </FCard>

            {/* Section C — profit bridge */}
            <FCard title="Section C — Profit Bridge (Gross Profit → Net Profit)" badge={<Badge>✓ {d.bridge.result}</Badge>}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <tbody>
                  <tr style={{ background: SAP.greenBg, color: SAP.greenDk, fontWeight: 700 }}>
                    <td style={{ padding: '10px 16px', width: '62%' }}>Gross Profit (All Modules)</td>
                    <td style={num}>{inr(d.bridge.grossProfit)}</td>
                    <td style={{ ...num, width: '20%' }}>{pctTxt(d.totals.gpPct)} of Sales</td>
                  </tr>
                  {d.bridge.indirectIncome > 0 && (
                    <tr style={{ borderBottom: `1px solid ${SAP.borderLt}` }}>
                      <td style={{ padding: '7px 16px' }}>Add: Indirect Income</td>
                      <td style={{ ...num, color: SAP.greenDk }}>{inr(d.bridge.indirectIncome)}</td>
                      <td style={num} />
                    </tr>
                  )}
                  <tr style={{ borderBottom: `1px solid ${SAP.borderLt}` }}>
                    <td style={{ padding: '7px 16px' }}>Less: Indirect Expenses (Overheads)</td>
                    <td style={{ ...num, color: SAP.red }}>{paren(d.bridge.indirectExpense)}</td>
                    <td style={{ ...num, color: SAP.sec }}>{pctTxt(d.totals.sales ? d.bridge.indirectExpense / d.totals.sales * 100 : 0)}</td>
                  </tr>
                  <tr style={{ background: SAP.blueBg, color: '#003d99', fontWeight: 700 }}>
                    <td style={{ padding: '10px 16px' }}>NET PROFIT BEFORE TAX (PBT)</td>
                    <td style={num}>{inr(d.bridge.netProfit)}</td>
                    <td style={num}>{pctTxt(d.totals.sales ? d.bridge.netProfit / d.totals.sales * 100 : 0)} of Sales</td>
                  </tr>
                  <tr style={{ borderBottom: `1px solid ${SAP.borderLt}` }}>
                    <td style={{ padding: '7px 16px' }}>Less: Provision for Tax @ 25.17% <span style={{ color: SAP.label, fontSize: 10 }}>(estimated)</span></td>
                    <td style={{ ...num, color: SAP.red }}>{paren(tax)}</td>
                    <td style={{ ...num, color: SAP.sec }}>{pctTxt(d.totals.sales ? tax / d.totals.sales * 100 : 0)}</td>
                  </tr>
                  <tr style={{ background: SAP.shell, color: '#fff', fontWeight: 700, fontSize: 14 }}>
                    <td style={{ padding: '12px 16px' }}>★ &nbsp;NET PROFIT AFTER TAX (PAT)</td>
                    <td style={{ ...num, color: pat >= 0 ? '#4ade80' : '#fca5a5' }}>{inr(pat)}</td>
                    <td style={{ ...num, color: '#9fb4cc' }}>{pctTxt(d.totals.sales ? pat / d.totals.sales * 100 : 0)}</td>
                  </tr>
                </tbody>
              </table>
            </FCard>

            {/* Bottom row — Module GP ranking + Key profitability ratios (like the HTML) */}
            <div style={{ display: 'grid', gridTemplateColumns: mobile ? '1fr' : '1fr 1fr', gap: 14 }}>
              <FCard title="Module GP Ranking (by Gross Profit value)" badge={<Badge bg={SAP.blueBg} c={SAP.blue} bd="#b8d6ff">Top contributors</Badge>}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <tbody>
                    {ranking.map((m, i) => (
                      <tr key={m.key} style={{ borderBottom: `1px solid ${SAP.borderLt}`, background: i % 2 ? SAP.rowAlt : '#fff' }}>
                        <td style={{ padding: '8px 16px', color: SAP.text }}>{i + 1}. {m.icon} {m.name}</td>
                        <td style={{ ...num, color: SAP.greenDk, fontWeight: 600 }}>{compact(cur, m.gp)} <span style={{ color: gpColor(m.gpPct), fontWeight: 700 }}>({pctTxt(m.gpPct)})</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </FCard>
              <FCard title="Key Profitability Ratios" badge={<Badge>FY {fy === 'ALL' ? 'all' : fy}</Badge>}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <tbody>
                    {ratios.map(([k, v], i) => (
                      <tr key={k} style={{ borderBottom: `1px solid ${SAP.borderLt}`, background: i % 2 ? SAP.rowAlt : '#fff' }}>
                        <td style={{ padding: '8px 16px', color: SAP.sec }}>{k}</td>
                        <td style={{ ...num, color: SAP.text, fontWeight: 600 }}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </FCard>
            </div>
          </>}
        </StateBox>
      </div>
      {drillFile && <FileVoucherDrill file={drillFile} cur={cur} mobile={mobile} onClose={() => setDrillFile(null)} />}
    </Wrap>
  );
}

/* ════════════════════════ BALANCE SHEET (Classic ⇄ Fiori) ══════════════ */
const CURRENT_ASSETS = new Set(['Current Assets', 'Bank Accounts', 'Cash-in-Hand', 'Deposits (Asset)', 'Loans & Advances (Asset)', 'Stock-in-Hand', 'Sundry Debtors']);
const CURRENT_LIABS = new Set(['Current Liabilities', 'Duties & Taxes', 'Provisions', 'Sundry Creditors', 'Bank OD Accounts']);
const NETWORTH = new Set(['Capital Account', 'Reserves & Surplus', 'Profit & Loss A/c']);
const sumGroups = (rows, set) => (rows || []).filter((g) => set.has(g.group)).reduce((s, g) => s + (g.amount || 0), 0);

export function ReportBSLive({ branch }) {
  const cur = curOf(branch);
  const mobile = useMobile();
  const [view, setView] = useState('fiori'); // 'fiori' | 'classic'
  const [fy, setFy] = useState('ALL');
  const [compare, setCompare] = useState(true);
  const to = fy === 'ALL' ? '' : fyRange(fy).to;
  const showPY = fy !== 'ALL' && compare;
  const toPrev = showPY ? fyPrior(fy).to : '';

  const q = useBalanceSheet(branch, { to });
  const qP = useBalanceSheet(branch, { to: toPrev });
  const d = q.data;
  const prev = showPY ? qP.data : null;
  const prevMap = useMemo(() => {
    const m = {}; [...(prev?.liabilities || []), ...(prev?.assets || [])].forEach((g) => { m[g.group] = g.amount; }); return m;
  }, [prev]);

  const curLabel = `as at ${asOn(to || (d && d.filter && d.filter.to))}`;
  const prevLabel = `as at ${asOn(toPrev)}`;

  const Switcher = () => (
    <div style={{ display: 'inline-flex', background: '#fff', border: `1px solid ${SAP.border}`, borderRadius: 6, overflow: 'hidden' }}>
      {[['fiori', '▪ SAP Fiori'], ['classic', '▭ Tally Classic']].map(([id, label]) => (
        <button key={id} onClick={() => setView(id)} style={{ padding: '7px 14px', fontSize: 11.5, fontWeight: 600, border: 'none', cursor: 'pointer', background: view === id ? SAP.blue : '#fff', color: view === id ? '#fff' : SAP.sec }}>{label}</button>
      ))}
    </div>
  );

  return (
    <Wrap>
      <FioriHead
        system="KBiz360 · Finance"
        title={`Balance Sheet — ${curLabel}`}
        sub={<><strong>{branchLabel(branch)}</strong> &nbsp;|&nbsp; {cur} INR (excl. GST) &nbsp;|&nbsp; Tally 28-Group Master &nbsp;|&nbsp; live double-entry</>}
        right={<><Switcher /><FyPicker fy={fy} setFy={setFy} compare={compare} setCompare={setCompare} label="As on" /></>}
      />
      <div style={{ background: SAP.pageBg, padding: view === 'classic' ? 0 : 16, border: `1px solid ${SAP.border}`, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
        <StateBox q={q} empty={!d}>
          {d && (view === 'fiori'
            ? <FioriBS d={d} prev={prev} prevMap={prevMap} cur={cur} showPY={showPY} curLabel={curLabel} prevLabel={prevLabel} branch={branch} to={to} mobile={mobile} />
            : <ClassicBS d={d} cur={cur} curLabel={curLabel} />)}
        </StateBox>
      </div>
    </Wrap>
  );
}

/* ── Fiori vertical view ─────────────────────────────────────────────── */
function FioriBS({ d, prev, prevMap, cur, showPY, curLabel, prevLabel, branch, to, mobile }) {
  const netWorth = sumGroups(d.liabilities, NETWORTH);
  const ca = sumGroups(d.assets, CURRENT_ASSETS), cl = sumGroups(d.liabilities, CURRENT_LIABS);
  const workingCap = ca - cl;
  const ratio = cl > 0 ? (ca / cl).toFixed(2) : '—';
  const [drillLedger, setDrillLedger] = useState(null);
  return (
    <>
      <div style={{ background: d.balanced ? SAP.greenBg : '#fff3f3', border: `1px solid ${d.balanced ? '#b8ecb8' : '#ffb3b3'}`, borderRadius: 8, padding: '11px 18px', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, fontWeight: 600, color: d.balanced ? SAP.greenDk : SAP.red }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: d.balanced ? SAP.green : SAP.red, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>{d.balanced ? '✓' : '!'}</span>
        {d.balanced ? 'Balanced' : 'Out of balance'} — Total Assets {cur}{inr(d.totalAssets)} {d.balanced ? '=' : '≠'} Total Liabilities {cur}{inr(d.totalLiabilities)} &nbsp;|&nbsp; Net Profit {cur}{inr(d.netProfit)} from P&amp;L A/c
      </div>

      <KpiGrid>
        <Kpi tone="blue" label="Balance Sheet Total" value={compact(cur, d.totalAssets)} sub="Assets = Liabilities" />
        <Kpi tone="green" label="Net Worth" value={compact(cur, netWorth)} sub="Capital + P&L A/c" trend={prev && <Trend cur={netWorth} prev={sumGroups(prev.liabilities, NETWORTH)} />} />
        <Kpi tone="teal" label="Working Capital" value={compact(cur, workingCap)} sub="CA − CL" />
        <Kpi tone="purple" label="Current Ratio" value={ratio} sub={`CA ${compact(cur, ca)} / CL ${compact(cur, cl)}`} />
      </KpiGrid>

      <BSSideCard title="Liabilities — Tally Groups" rows={d.liabilities} total={d.totalLiabilities} totalLabel="TOTAL LIABILITIES"
        prevMap={prevMap} prevTotal={prev?.totalLiabilities} cur={cur} showPY={showPY} curLabel={curLabel} prevLabel={prevLabel} onPickLedger={setDrillLedger} />
      <BSSideCard title="Assets — Tally Groups" rows={d.assets} total={d.totalAssets} totalLabel="TOTAL ASSETS"
        prevMap={prevMap} prevTotal={prev?.totalAssets} cur={cur} showPY={showPY} curLabel={curLabel} prevLabel={prevLabel} onPickLedger={setDrillLedger} />

      <div style={{ background: '#fff', border: `1px solid ${SAP.border}`, borderRadius: 8, padding: '10px 18px', fontSize: 11, color: SAP.sec, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8, boxShadow: SHADOW }}>
        <span><strong style={{ color: SAP.text }}>Group Master:</strong> Tally Default 28 Groups &nbsp;|&nbsp; <strong style={{ color: SAP.text }}>Net Profit:</strong> {cur}{inr(d.netProfit)} (from P&amp;L A/c) &nbsp;|&nbsp; <strong style={{ color: SAP.text }}>Tax:</strong> Excl. GST</span>
      </div>
      {drillLedger && <LedgerVoucherDrill ledger={drillLedger} branch={branch} to={to} cur={cur} mobile={mobile} onClose={() => setDrillLedger(null)} />}
    </>
  );
}
function BSSideCard({ title, rows, total, totalLabel, prevMap, prevTotal, cur, showPY, curLabel, prevLabel, onPickLedger }) {
  const [open, setOpen] = useState({});
  return (
    <FCard title={title} sub="Click a group to expand into its ledgers" badge={<Badge bg="#fef0e0" c={SAP.orange} bd="#ffcf9e">Tally Logic</Badge>}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
          <thead><tr><Th w={showPY ? '50%' : '64%'}>Group / Ledger</Th><Th right>{curLabel} ({cur})</Th>{showPY && <Th right>{prevLabel} ({cur})</Th>}</tr></thead>
          <tbody>
            {rows.map((g, gi) => {
              const hasLedgers = (g.ledgers || []).length > 0;
              const isOpen = !!open[g.group];
              const pv = prevMap[g.group];
              const rowBg = g.isResult ? SAP.greenBg : SAP.grpBg;
              const rowColor = g.isResult ? SAP.greenDk : SAP.grpText;
              return (
                <React.Fragment key={g.group + gi}>
                  <tr onClick={() => hasLedgers && setOpen((s) => ({ ...s, [g.group]: !s[g.group] }))}
                    style={{ background: rowBg, color: rowColor, cursor: hasLedgers ? 'pointer' : 'default', borderTop: '2px solid #b3ccf5', fontWeight: 700 }}>
                    <td style={{ padding: '9px 16px' }}>{hasLedgers ? <Toggle open={isOpen} /> : <span style={{ marginRight: 7 }}>{g.isResult ? '●' : '•'}</span>}{g.group}</td>
                    <td style={num}>{inr(g.amount)}</td>
                    {showPY && <td style={{ ...num, color: SAP.sec }}>{pv == null ? '—' : inr(pv)}</td>}
                  </tr>
                  {hasLedgers && isOpen && g.ledgers.map((l, i) => (
                    <tr key={i} onClick={() => onPickLedger && onPickLedger(l.name)}
                      style={{ background: i % 2 ? SAP.rowAlt : '#fff', borderBottom: `1px solid ${SAP.borderLt}`, cursor: onPickLedger ? 'pointer' : 'default' }}>
                      <td style={{ padding: '5px 16px 5px 48px', color: SAP.text }}>{l.name}{onPickLedger ? <span style={{ color: SAP.blue, fontWeight: 700, marginLeft: 6 }}>›</span> : null}</td>
                      <td style={num}>{inr(l.amount)}</td>
                      {showPY && <td style={{ ...num, color: SAP.sec }}>—</td>}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
            <tr style={{ background: SAP.shell, color: '#fff', fontWeight: 700, borderTop: `2px solid ${SAP.blue}` }}>
              <td style={{ padding: '11px 16px' }}>{totalLabel}</td>
              <td style={num}>{inr(total)}</td>
              {showPY && <td style={{ ...num, color: '#9fb4cc' }}>{prevTotal == null ? '—' : inr(prevTotal)}</td>}
            </tr>
          </tbody>
        </table>
      </div>
    </FCard>
  );
}

/* ── Tally Classic (white) view ──────────────────────────────────────── */
const sideRows = (groups) => (groups || []).flatMap((g) => [
  { label: g.group, amount: g.amount, group: true, result: g.isResult },
  ...((g.ledgers || []).map((l) => ({ label: l.name, amount: l.amount }))),
]);
function ClassicBS({ d, cur, curLabel }) {
  const left = sideRows(d.liabilities), right = sideRows(d.assets);
  const n = Math.max(left.length, right.length);
  const mono = { fontFamily: "'Courier New', Courier, monospace" };
  const Cell = ({ r }) => r ? (
    <>
      <td style={{ padding: '2px 12px', color: r.group ? TALLY.head : '#444', fontWeight: r.group ? 700 : 400, paddingLeft: r.group ? 12 : 26, ...mono }}>{r.label}</td>
      <td style={{ padding: '2px 12px', textAlign: 'right', color: r.result ? TALLY.green : '#1a1a1a', fontWeight: r.result ? 700 : 400, ...mono }}>{inr(r.amount)}</td>
    </>
  ) : (<><td /><td /></>);
  const ca = sumGroups(d.assets, CURRENT_ASSETS), cl = sumGroups(d.liabilities, CURRENT_LIABS);
  return (
    <div style={{ background: '#fff', border: '1px solid #b0b0b0', borderRadius: 4, overflow: 'hidden', ...mono, margin: 12 }}>
      <div style={{ background: TALLY.titlebar, color: TALLY.head, padding: '5px 12px', fontSize: 12, fontWeight: 700, display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #a9c2e0' }}>
        <span>KBiz360 Books — {branchLabelClassic(d)}</span><span style={{ color: TALLY.gold }}>Balance Sheet</span>
      </div>
      <div style={{ textAlign: 'center', padding: '10px 8px 8px', borderBottom: `2px solid ${TALLY.head}` }}>
        <div style={{ color: TALLY.head, fontSize: 16, fontWeight: 700 }}>{branchLabelClassic(d)}</div>
        <div style={{ fontSize: 13 }}>Balance Sheet</div>
        <div style={{ color: TALLY.gold, fontSize: 11, fontWeight: 700 }}>{curLabel}</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <tbody>
          <tr style={{ color: TALLY.head, fontWeight: 700, background: '#f0f4fa', borderBottom: `2px solid ${TALLY.head}` }}>
            <td style={{ padding: '5px 12px', ...mono }}>Liabilities</td><td style={{ padding: '5px 12px', textAlign: 'right', ...mono }}>{curLabel}</td>
            <td style={{ padding: '5px 12px', ...mono }}>Assets</td><td style={{ padding: '5px 12px', textAlign: 'right', ...mono }}>{curLabel}</td>
          </tr>
          {Array.from({ length: n }).map((_, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}><Cell r={left[i]} /><Cell r={right[i]} /></tr>
          ))}
          <tr style={{ color: TALLY.head, fontWeight: 700, borderTop: `2px solid ${TALLY.head}`, borderBottom: `3px double ${TALLY.head}`, background: '#f0f4fa' }}>
            <td style={{ padding: '6px 12px', ...mono }}>Total</td><td style={{ padding: '6px 12px', textAlign: 'right', color: TALLY.gold, ...mono }}>{inr(d.totalLiabilities)}</td>
            <td style={{ padding: '6px 12px', ...mono }}>Total</td><td style={{ padding: '6px 12px', textAlign: 'right', color: TALLY.gold, ...mono }}>{inr(d.totalAssets)}</td>
          </tr>
        </tbody>
      </table>
      <div style={{ background: TALLY.titlebar, color: TALLY.head, fontSize: 11, fontWeight: 700, padding: '4px 12px', display: 'flex', justifyContent: 'space-between', borderTop: `2px solid ${TALLY.head}`, ...mono }}>
        <span>Working Capital : <span style={{ color: TALLY.green }}>{inr(ca - cl)}</span></span>
        <span>Net Profit : <span style={{ color: TALLY.green }}>{inr(d.netProfit)}</span></span>
        <span>Diff in Op Balance : <span style={{ color: TALLY.green }}>{d.balanced ? '0.00' : inr(d.totalLiabilities - d.totalAssets)}</span></span>
      </div>
    </div>
  );
}
const branchLabelClassic = (d) => (d?.filter?.branch && d.filter.branch !== 'ALL' ? d.filter.branch : 'All Branches — Consolidated');

/* ════════════════════════ AR / AP AGEING (Phase 2, live) ═══════════════════ */
export function ReceivablesLive({ branch }) { return <AgeingReport branch={branch} side="receivables" />; }
export function PayablesLive({ branch }) { return <AgeingReport branch={branch} side="payables" />; }

const BUCKETS = [['d0', '0–30'], ['d30', '31–60'], ['d60', '61–90'], ['d90', '90+']];
const bucketColor = (k) => ({ d0: SAP.greenDk, d30: SAP.gold, d60: SAP.orange, d90: SAP.red }[k] || SAP.text);

function AgeingReport({ branch, side }) {
  const cur = curOf(branch);
  const mobile = useMobile();
  const q = useAgeing(branch);
  const d = q.data;
  const data = d ? d[side] : null;
  const rows = data?.rows || [];
  const totals = data?.totals || { d0: 0, d30: 0, d60: 0, d90: 0, total: 0 };
  const [drillLedger, setDrillLedger] = useState(null);

  const isRec = side === 'receivables';
  const partyLabel = isRec ? 'Customer' : 'Supplier';
  const overdue = totals.d30 + totals.d60 + totals.d90;
  const share = (x) => (totals.total > 0 ? (x / totals.total) * 100 : 0);

  return (
    <Wrap>
      <FioriHead
        system="KBiz360 · Finance"
        title={isRec ? 'Accounts Receivable — Ageing' : 'Accounts Payable — Ageing'}
        sub={<><strong>{branchLabel(branch)}</strong> &nbsp;|&nbsp; {cur} incl. GST &nbsp;|&nbsp; as of {d?.asOf || '—'} &nbsp;|&nbsp; FIFO · live double-entry</>}
      />
      <div style={{ background: SAP.pageBg, padding: 16, border: `1px solid ${SAP.border}`, borderTop: 'none', borderRadius: '0 0 8px 8px' }}>
        <StateBox q={q} empty={!data || rows.length === 0}>
          <KpiGrid>
            <Kpi tone="blue" label="Total Outstanding" value={compact(cur, totals.total)} sub={`${rows.length} ${partyLabel.toLowerCase()}s`} />
            <Kpi tone="green" label="Current (0–30)" value={compact(cur, totals.d0)} sub={pctTxt(share(totals.d0))} />
            <Kpi tone="orange" label="Overdue (>30 days)" value={compact(cur, overdue)} sub={pctTxt(share(overdue))} />
            <Kpi tone="red" label="Critical (90+ days)" value={compact(cur, totals.d90)} sub={pctTxt(share(totals.d90))} />
          </KpiGrid>

          <FCard title={`${partyLabel}-wise Ageing`} sub="Tap a row to drill into the ledger and edit its vouchers"
            badge={<Badge bg={SAP.blueBg} c={SAP.blue} bd="#b8d6ff">{rows.length} {partyLabel.toLowerCase()}s</Badge>}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead><tr><Th w="30%">{partyLabel}</Th>{BUCKETS.map(([, lbl]) => <Th key={lbl} right>{lbl}</Th>)}<Th right>Total</Th></tr></thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={r.party + i} onClick={() => setDrillLedger(r.party)}
                      style={{ background: i % 2 ? SAP.rowAlt : '#fff', borderBottom: `1px solid ${SAP.borderLt}`, cursor: 'pointer' }}>
                      <td style={{ padding: '7px 16px', color: SAP.text, fontWeight: 600 }}>{r.party}<span style={{ color: SAP.blue, fontWeight: 700, marginLeft: 6 }}>›</span></td>
                      {BUCKETS.map(([k]) => <td key={k} style={{ ...num, color: r[k] ? bucketColor(k) : SAP.label }}>{inr(r[k])}</td>)}
                      <td style={{ ...num, fontWeight: 700, color: SAP.text }}>{inr(r.total)}</td>
                    </tr>
                  ))}
                  <tr style={{ background: SAP.shell, color: '#fff', fontWeight: 700, borderTop: `2px solid ${SAP.blue}` }}>
                    <td style={{ padding: '10px 16px' }}>TOTAL</td>
                    {BUCKETS.map(([k]) => <td key={k} style={num}>{inr(totals[k])}</td>)}
                    <td style={num}>{inr(totals.total)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </FCard>
        </StateBox>
        {drillLedger && <LedgerVoucherDrill ledger={drillLedger} branch={branch} to="" cur={cur} mobile={mobile} onClose={() => setDrillLedger(null)} />}
      </div>
    </Wrap>
  );
}
