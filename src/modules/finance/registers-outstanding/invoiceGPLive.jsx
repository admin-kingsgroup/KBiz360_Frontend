/* ════════════════════════════════════════════════════════════════════
   INVOICE-WISE GROSS PROFIT (live)
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of accountingLive/legacy.jsx
   into finance's business sub-module folder — MENU_FINANCE ▸ Registers &
   Outstanding ▸ "Invoice-wise GP (Link No)" (href /reports/invoice-gp).

   Consolidated (All-branches) scope renders one GP table PER BRANCH, each in its
   own currency (India ₹ / Africa $) — sale/cost/GP are NEVER summed across branch
   currencies, so there is no cross-branch grand total. Each GP row carries its
   branch (from the backend), so the rows are grouped by branch on the client.
   ════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useMemo, useState } from 'react';
import { exportToExcel, vouchersToSheet } from '../../../core/exportExcel';
import { useSalesRegister, usePurchaseRegister, useInvoiceGP } from '../../../core/useAccounting';
import { inp } from '../../../core/styles';
import { clickable } from '../../../core/ux/clickable';
import { openBookingFolder } from '../../../core/BookingFolderHost';
import { SkeletonTable, Skeleton } from '../../../shell/primitives';
import { VoucherLines } from '../../accountingLive/legacy.jsx';
import {
  DARK, GOLD, DIM, BLUE, RED, GREEN, curOf, money, branchLabel, Page, Banner, State, ExportBtn,
  Table, Th, headRow, rowBg, num, DetailedTable, RangeBar, dateInRange, todayISO, monthStartISO,
} from '../../accountingLive/shared';

// Small Summary/Detailed view switch — exclusive to this screen.
function ViewToggle({ view, setView }) {
  const B = ({ id, label }) => (
    <button onClick={() => setView(id)} className="max-tablet:min-h-[44px]" style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 11, cursor: 'pointer', fontWeight: 700, background: view === id ? DARK : '#fff', color: view === id ? GOLD : DIM, borderColor: view === id ? DARK : '#cdd1d8' }}>{label}</button>
  );
  return <><B id="summary" label="Summary" /><B id="detailed" label="Detailed" /></>;
}

const STATUS = {
  matched: { c: GREEN, t: 'matched' }, 'no-cost': { c: '#d97706', t: 'no cost' }, 'no-sale': { c: RED, t: 'no sale' },
  'sale (no link)': { c: BLUE, t: 'sale · no link' }, 'purchase (no link)': { c: '#d97706', t: 'purchase · no link' },
};

// One branch's (or the single-branch) GP summary table, rendered in `cur`. Expand keys are
// prefixed so rows across branch tables never collide. `underlyingFor`/`branch` come in as props.
function GpSummaryTable({ rows, cur, keyPrefix, open, setOpen, underlyingFor, fields, detailReady, branch }) {
  const tot = rows.reduce((a, r) => ({ sale: a.sale + (r.sale || 0), cost: a.cost + (r.cost || 0), gp: a.gp + (r.gp || 0) }), { sale: 0, cost: 0, gp: 0 });
  const gpPct = tot.sale > 0 ? Math.round((tot.gp / tot.sale) * 10000) / 100 : 0;
  const SideTag = ({ tone, children }) => (
    <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.5px', padding: '2px 8px', borderRadius: 4, marginBottom: 8, display: 'inline-block', background: (tone === 'sale' ? BLUE : '#d97706') + '18', color: tone === 'sale' ? BLUE : '#d97706' }}>{children}</span>
  );
  return (
    <Table>
      <thead><tr style={headRow}>
        <Th>Link No / Voucher</Th><Th>Date</Th><Th>Customer</Th><Th>Supplier</Th><Th right>Sale</Th><Th right>Cost</Th><Th right>GP</Th><Th right>GP %</Th><Th>Status</Th>
      </tr></thead>
      <tbody>
        {rows.map((r, i) => {
          const s = STATUS[r.status] || { c: DIM, t: r.status };
          const f = fields(r);
          const rk = `${keyPrefix}#${i}`;
          const isOpen = open === rk;
          return (
            <React.Fragment key={rk}>
              <tr style={{ ...rowBg(i), cursor: 'pointer', background: isOpen ? '#eef4ff' : rowBg(i).background }} {...clickable(() => setOpen(isOpen ? null : rk))}>
                <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 10.5, color: r.linked ? '#6b21a8' : '#64748b', fontWeight: 700 }}>
                  <span style={{ color: DIM, marginRight: 5 }}>{isOpen ? '▾' : '▸'}</span>
                  {r.linked && r.linkNo
                    ? <span {...clickable((e) => { if (e && e.stopPropagation) e.stopPropagation(); openBookingFolder(r.linkNo, { branch: r.branch ? { code: r.branch } : branch, vno: r.ref }); })} title="Open the whole SO / PO / GP deal" style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>{f.ref}</span>
                    : f.ref}
                </td>
                <td style={{ padding: '8px 12px', color: DIM, whiteSpace: 'nowrap' }}>{f.date}</td>
                <td style={{ padding: '8px 12px', color: DARK }}>{f.customer}</td>
                <td style={{ padding: '8px 12px', color: DARK }}>{f.supplier}</td>
                <td style={{ padding: '8px 12px', ...num }}>{money(cur, r.sale)}</td>
                <td style={{ padding: '8px 12px', ...num, color: '#d97706' }}>{money(cur, r.cost)}</td>
                <td style={{ padding: '8px 12px', ...num, fontWeight: 700, color: r.gp >= 0 ? GREEN : RED }}>{money(cur, r.gp)}</td>
                <td style={{ padding: '8px 12px', ...num, fontWeight: 700, color: r.gp >= 0 ? GREEN : RED }}>{r.gpPct}%</td>
                <td style={{ padding: '8px 12px' }}><span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 999, fontWeight: 700, background: s.c + '22', color: s.c }}>{s.t}</span></td>
              </tr>
              {isOpen && (
                <tr>
                  <td colSpan={9} style={{ padding: 0, background: '#f7f9fc', borderBottom: '2px solid #cdd1d8' }}>
                    <div style={{ padding: 16 }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: DARK, marginBottom: 12 }}>
                        File {f.ref} — Sale {money(cur, r.sale)} − Cost {money(cur, r.cost)} = GP <span style={{ color: r.gp >= 0 ? GREEN : RED }}>{money(cur, r.gp)}</span> ({r.gpPct}%)
                      </div>
                      {f.u.sales.length === 0 && f.u.purchases.length === 0 && (
                        <div style={{ fontSize: 11, color: DIM }}>{detailReady ? 'No underlying voucher detail found.' : <Skeleton className="inline-block h-3 w-32 align-middle" />}</div>
                      )}
                      {f.u.sales.map((v) => (
                        <div key={v.id || v.vno} style={{ marginBottom: 14 }}><SideTag tone="sale">SALE</SideTag><VoucherLines voucher={v} cur={cur} /></div>
                      ))}
                      {f.u.purchases.map((v) => (
                        <div key={v.id || v.vno} style={{ marginBottom: 14 }}><SideTag tone="cost">PURCHASE / COST</SideTag><VoucherLines voucher={v} cur={cur} /></div>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
      <tfoot><tr style={{ background: DARK, borderTop: `2px solid ${GOLD}` }}>
        <td colSpan={4} style={{ padding: '9px 12px', fontWeight: 700, color: GOLD }}>TOTAL — {rows.length} rows</td>
        <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, tot.sale)}</td>
        <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, tot.cost)}</td>
        <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: GOLD }}>{money(cur, tot.gp)}</td>
        <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: GOLD }}>{gpPct}%</td>
        <td />
      </tr></tfoot>
    </Table>
  );
}

export function InvoiceGPLive({ branch }) {
  const cur = curOf(branch);
  const isAll = !branch || branch === 'ALL' || branch?.code === 'ALL';
  const [from, setFrom] = useState(monthStartISO);
  const [to, setTo] = useState(todayISO);
  const [open, setOpen] = useState(null);     // expanded row composite key
  const [view, setView] = useState('summary'); // summary | detailed
  useEffect(() => { setOpen(null); }, [from, to]);
  const q = useInvoiceGP(branch);
  const salesQ = useSalesRegister(branch);
  const purchQ = usePurchaseRegister(branch);
  const salesRows = salesQ.data || [];
  const purchRows = purchQ.data || [];
  const d = q.data;
  const allGpRows = d?.rows || [];

  const byLink = useMemo(() => {
    const m = new Map();
    const add = (v, side) => { const k = (v.linkNo || '').trim(); if (!k) return; if (!m.has(k)) m.set(k, { sales: [], purchases: [] }); m.get(k)[side].push(v); };
    salesRows.forEach((v) => add(v, 'sales'));
    purchRows.forEach((v) => add(v, 'purchases'));
    return m;
  }, [salesRows, purchRows]);
  const byVno = useMemo(() => { const m = new Map(); [...salesRows, ...purchRows].forEach((v) => m.set(v.vno, v)); return m; }, [salesRows, purchRows]);
  const underlyingFor = (r) => {
    if (r.linked && r.linkNo) return byLink.get(r.linkNo) || { sales: [], purchases: [] };
    const v = byVno.get(r.ref);
    if (!v) return { sales: [], purchases: [] };
    return v.category === 'sale' ? { sales: [v], purchases: [] } : { sales: [], purchases: [v] };
  };
  const fields = (r) => {
    const u = underlyingFor(r);
    return {
      u,
      ref: r.ref || r.linkNo || (Array.isArray(r.vnos) ? r.vnos.join(' · ') : '') || '—',
      date: r.date || u.sales[0]?.date || u.purchases[0]?.date || '—',
      customer: r.customer || u.sales[0]?.party || '—',
      supplier: r.supplier || u.purchases[0]?.party || '—',
    };
  };

  const gpDate = (r) => { const u = underlyingFor(r); return r.date || u.sales[0]?.date || u.purchases[0]?.date || ''; };
  const rows = useMemo(() => allGpRows.filter((r) => dateInRange(gpDate(r), from, to)), [allGpRows, from, to, byLink, byVno]);
  const linkedCount = rows.filter((r) => r.linked).length;
  const unlinked = { sales: rows.filter((r) => r.status === 'sale (no link)').length, purchases: rows.filter((r) => r.status === 'purchase (no link)').length };

  // Group rows by branch for the consolidated view (each rendered in its own currency).
  const groups = useMemo(() => {
    if (!isAll) return null;
    const m = new Map();
    rows.forEach((r) => { const k = r.branch || '—'; if (!m.has(k)) m.set(k, []); m.get(k).push(r); });
    return [...m.keys()].sort().map((k) => ({ branch: k, rows: m.get(k) }));
  }, [rows, isAll]);

  const exportSummary = () => {
    if (!rows.length) return;
    const columns = [
      { key: 'branch', label: 'Branch' }, { key: 'ref', label: 'Link No / Voucher' }, { key: 'date', label: 'Date' },
      { key: 'customer', label: 'Customer' }, { key: 'supplier', label: 'Supplier' },
      { key: 'sale', label: 'Sale' }, { key: 'cost', label: 'Cost' }, { key: 'gp', label: 'Gross Profit' }, { key: 'gpPct', label: 'GP %' },
      { key: 'status', label: 'Status' }, { key: 'vouchers', label: 'Vouchers' },
    ];
    const sheet = rows.map((r) => { const f = fields(r); return { branch: r.branch || '', ref: f.ref, date: f.date, customer: f.customer === '—' ? '' : f.customer, supplier: f.supplier === '—' ? '' : f.supplier, sale: r.sale, cost: r.cost, gp: r.gp, gpPct: r.gpPct, status: r.status, vouchers: Array.isArray(r.vnos) ? r.vnos.join(' · ') : '' }; });
    exportToExcel(`gross-profit-${branchLabel(branch)}`, columns, sheet);
  };
  const detailSheet = useMemo(() => {
    const list = [];
    rows.forEach((r) => {
      const u = r.linked && r.linkNo ? (byLink.get(r.linkNo) || { sales: [], purchases: [] })
        : (() => { const v = byVno.get(r.ref); return v ? (v.category === 'sale' ? { sales: [v], purchases: [] } : { sales: [], purchases: [v] }) : { sales: [], purchases: [] }; })();
      u.sales.forEach((v) => list.push({ ...v, __lead: { gpFile: r.ref || r.linkNo, side: 'Sale', fileGP: r.gp, fileGPpct: r.gpPct } }));
      u.purchases.forEach((v) => list.push({ ...v, __lead: { gpFile: r.ref || r.linkNo, side: 'Cost', fileGP: r.gp, fileGPpct: r.gpPct } }));
    });
    const lead = [{ key: 'gpFile', label: 'GP File / Link No' }, { key: 'side', label: 'Side' }, { key: 'fileGP', label: 'File GP' }, { key: 'fileGPpct', label: 'File GP %' }];
    return vouchersToSheet(list, lead);
  }, [rows, byLink, byVno]);
  const exportDetailed = () => { if (!detailSheet.rows.length) return; exportToExcel(`gross-profit-detailed-${branchLabel(branch)}`, detailSheet.columns, detailSheet.rows); };

  const detailReady = !salesQ.isLoading && !purchQ.isLoading;
  const tableProps = { open, setOpen, underlyingFor, fields, detailReady, branch };

  return (
    <Page
      wide={view === 'detailed'}
      title="Invoice-wise Gross Profit"
      sub={`${branchLabel(branch)} · ${rows.length} rows (${linkedCount} linked files)${isAll ? ' · each branch in its own currency · no cross-currency total' : ''} · ${view === 'detailed' ? 'every sale & purchase — scroll right' : 'click a row for the full base-fare / tax bifurcation'}`}
      right={<>
        <ViewToggle view={view} setView={setView} />
        <RangeBar from={from} to={to} setFrom={setFrom} setTo={setTo} branch={branch} />
        <ExportBtn onClick={exportSummary} disabled={!rows.length} label="Export GP" />
        <ExportBtn onClick={exportDetailed} disabled={!detailSheet.rows.length || !detailReady} label="Export Full Detail" />
      </>}
    >
      {(unlinked.sales > 0 || unlinked.purchases > 0) && (
        <Banner tone="info">{unlinked.sales} sale(s) and {unlinked.purchases} purchase(s) have no Link No — shown individually below. Give a sale and its purchase the same Link No to pair them into one file.</Banner>
      )}
      <State q={q} empty={rows.length === 0}>
        {view === 'detailed' ? (
          !detailReady ? <SkeletonTable rows={6} cols={6} />
            : isAll
              ? (groups || []).map((g) => {
                  const drows = detailSheet.rows.filter((dr) => (dr.branch || '—') === g.branch);
                  return (
                    <div key={g.branch} style={{ marginBottom: 22 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, borderBottom: `2px solid ${DARK}`, paddingBottom: 4, marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: DARK }}>{g.branch}</span><span style={{ fontSize: 11, fontWeight: 700, color: DIM }}>· {curOf({ code: g.branch })}</span>
                      </div>
                      <DetailedTable columns={detailSheet.columns} rows={drows} />
                    </div>
                  );
                })
              : <DetailedTable columns={detailSheet.columns} rows={detailSheet.rows} />
        ) : isAll ? (
          (groups || []).map((g) => (
            <div key={g.branch} style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, borderBottom: `2px solid ${DARK}`, paddingBottom: 4, marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: DARK }}>{g.branch}</span><span style={{ fontSize: 11, fontWeight: 700, color: DIM }}>· {curOf({ code: g.branch })}</span>
              </div>
              <GpSummaryTable rows={g.rows} cur={curOf({ code: g.branch })} keyPrefix={g.branch} {...tableProps} />
            </div>
          ))
        ) : (
          <GpSummaryTable rows={rows} cur={cur} keyPrefix="_" {...tableProps} />
        )}
      </State>
    </Page>
  );
}
