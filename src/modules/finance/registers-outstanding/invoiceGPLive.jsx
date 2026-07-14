/* ════════════════════════════════════════════════════════════════════
   INVOICE-WISE GROSS PROFIT (live)
   BUSINESS SUB-MODULE REORG (2026-07-14): moved out of accountingLive/legacy.jsx
   into finance's business sub-module folder — MENU_FINANCE ▸ Registers &
   Outstanding ▸ "Invoice-wise GP (Link No)" (href /reports/invoice-gp).
   accountingLive/index.js re-exports InvoiceGPLive from here so App.jsx's
   barrel import needed zero changes. ViewToggle (view switch) is exclusive
   to this screen and moved with it. VoucherLines stays in
   accountingLive/legacy.jsx (shared) — imported directly from that file
   (not the accountingLive barrel) since the barrel re-exports InvoiceGPLive
   from HERE, and going through it would be a circular import.

   Fixed a pre-existing bug while moving: the date-range picker referenced
   an undefined `DateRange` component (never defined anywhere in the
   codebase — no test rendered this screen, so it went uncaught). Every
   other screen in this shared kit uses `RangeBar` for the exact same
   {from,to,setFrom,setTo,branch} props — swapped in here.
   ════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useMemo, useState } from 'react';
import { exportToExcel, vouchersToSheet } from '../../../core/exportExcel';
import { useSalesRegister, usePurchaseRegister, useInvoiceGP } from '../../../core/useAccounting';
import { inp } from '../../../core/styles';
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

export function InvoiceGPLive({ branch }) {
  const cur = curOf(branch);
  const [from, setFrom] = useState(monthStartISO);
  const [to, setTo] = useState(todayISO);
  const [open, setOpen] = useState(null);     // expanded row index
  const [view, setView] = useState('summary'); // summary | detailed
  // The expanded row is tracked by array index, but `rows` is re-derived when the
  // date range changes — so a stale index would expand the wrong (or a missing)
  // file. Collapse on any filter change to keep the open row honest.
  useEffect(() => { setOpen(null); }, [from, to]);
  // Fetch all; date filtering is client-side (Tally dates are mixed-format strings).
  const q = useInvoiceGP(branch);
  // Underlying vouchers (with full Tally bifurcation in line.meta) → drill + export.
  const salesQ = useSalesRegister(branch);
  const purchQ = usePurchaseRegister(branch);
  const salesRows = salesQ.data || [];
  const purchRows = purchQ.data || [];
  const d = q.data;
  const allGpRows = d?.rows || [];
  const STATUS = {
    matched: { c: GREEN, t: 'matched' }, 'no-cost': { c: '#d97706', t: 'no cost' }, 'no-sale': { c: RED, t: 'no sale' },
    'sale (no link)': { c: BLUE, t: 'sale · no link' }, 'purchase (no link)': { c: '#d97706', t: 'purchase · no link' },
  };

  // Index underlying vouchers by Link No and by voucher no.
  const byLink = useMemo(() => {
    const m = new Map();
    const add = (v, side) => {
      const k = (v.linkNo || '').trim(); if (!k) return;
      if (!m.has(k)) m.set(k, { sales: [], purchases: [] });
      m.get(k)[side].push(v);
    };
    salesRows.forEach((v) => add(v, 'sales'));
    purchRows.forEach((v) => add(v, 'purchases'));
    return m;
  }, [salesRows, purchRows]);
  const byVno = useMemo(() => {
    const m = new Map();
    [...salesRows, ...purchRows].forEach((v) => m.set(v.vno, v));
    return m;
  }, [salesRows, purchRows]);
  const underlyingFor = (r) => {
    if (r.linked && r.linkNo) return byLink.get(r.linkNo) || { sales: [], purchases: [] };
    const v = byVno.get(r.ref);
    if (!v) return { sales: [], purchases: [] };
    return v.category === 'sale' ? { sales: [v], purchases: [] } : { sales: [], purchases: [v] };
  };
  // Fall back to underlying voucher fields so the table is fully populated even
  // against an older backend that didn't return date on the GP rows.
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

  // Date-filter the GP rows client-side (resolve the file's date from the row or
  // its underlying voucher), then recompute the totals for the filtered set.
  const gpDate = (r) => { const u = underlyingFor(r); return r.date || u.sales[0]?.date || u.purchases[0]?.date || ''; };
  const rows = useMemo(() => allGpRows.filter((r) => dateInRange(gpDate(r), from, to)), [allGpRows, from, to, byLink, byVno]);
  const linkedCount = rows.filter((r) => r.linked).length;
  const unlinked = { sales: rows.filter((r) => r.status === 'sale (no link)').length, purchases: rows.filter((r) => r.status === 'purchase (no link)').length };
  const totals = useMemo(() => {
    const sale = Math.round(rows.reduce((s, r) => s + (r.sale || 0), 0) * 100) / 100;
    const cost = Math.round(rows.reduce((s, r) => s + (r.cost || 0), 0) * 100) / 100;
    const gp = Math.round((sale - cost) * 100) / 100;
    return { sale, cost, gp, gpPct: sale > 0 ? Math.round((gp / sale) * 10000) / 100 : 0 };
  }, [rows]);

  const exportSummary = () => {
    if (!rows.length) return;
    const columns = [
      { key: 'ref', label: 'Link No / Voucher' }, { key: 'date', label: 'Date' },
      { key: 'customer', label: 'Customer' }, { key: 'supplier', label: 'Supplier' },
      { key: 'sale', label: 'Sale' }, { key: 'cost', label: 'Cost' },
      { key: 'gp', label: 'Gross Profit' }, { key: 'gpPct', label: 'GP %' },
      { key: 'status', label: 'Status' }, { key: 'vouchers', label: 'Vouchers' },
    ];
    const sheet = rows.map((r) => {
      const f = fields(r);
      return {
        ref: f.ref, date: f.date, customer: f.customer === '—' ? '' : f.customer, supplier: f.supplier === '—' ? '' : f.supplier,
        sale: r.sale, cost: r.cost, gp: r.gp, gpPct: r.gpPct, status: r.status,
        vouchers: Array.isArray(r.vnos) ? r.vnos.join(' · ') : '',
      };
    });
    exportToExcel(`gross-profit-${branchLabel(branch)}`, columns, sheet);
  };
  // Flatten every GP file into its underlying sale & purchase vouchers, tagged
  // with the file's GP — drives both the inline Detailed table and the export.
  const detailSheet = useMemo(() => {
    const list = [];
    rows.forEach((r) => {
      const u = r.linked && r.linkNo ? (byLink.get(r.linkNo) || { sales: [], purchases: [] })
        : (() => { const v = byVno.get(r.ref); return v ? (v.category === 'sale' ? { sales: [v], purchases: [] } : { sales: [], purchases: [v] }) : { sales: [], purchases: [] }; })();
      u.sales.forEach((v) => list.push({ ...v, __lead: { gpFile: r.ref || r.linkNo, side: 'Sale', fileGP: r.gp, fileGPpct: r.gpPct } }));
      u.purchases.forEach((v) => list.push({ ...v, __lead: { gpFile: r.ref || r.linkNo, side: 'Cost', fileGP: r.gp, fileGPpct: r.gpPct } }));
    });
    const lead = [
      { key: 'gpFile', label: 'GP File / Link No' }, { key: 'side', label: 'Side' },
      { key: 'fileGP', label: 'File GP' }, { key: 'fileGPpct', label: 'File GP %' },
    ];
    return vouchersToSheet(list, lead);
  }, [rows, byLink, byVno]);
  const exportDetailed = () => {
    if (!detailSheet.rows.length) return;
    exportToExcel(`gross-profit-detailed-${branchLabel(branch)}`, detailSheet.columns, detailSheet.rows);
  };

  const detailReady = !salesQ.isLoading && !purchQ.isLoading;
  const SideTag = ({ tone, children }) => (
    <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '0.5px', padding: '2px 8px', borderRadius: 4, marginBottom: 8, display: 'inline-block',
      background: (tone === 'sale' ? BLUE : '#d97706') + '18', color: tone === 'sale' ? BLUE : '#d97706' }}>{children}</span>
  );

  return (
    <Page
      wide={view === 'detailed'}
      title="Invoice-wise Gross Profit"
      sub={`${branchLabel(branch)} · ${rows.length} rows (${linkedCount} linked files) · ${view === 'detailed' ? 'every sale & purchase with full base-fare / tax bifurcation — scroll right' : 'click a row for the full base-fare / tax bifurcation'}`}
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
          !detailReady ? <div style={{ ...card, padding: 28, textAlign: 'center', color: DIM, fontSize: 12 }}>Loading full detail…</div>
            : <DetailedTable columns={detailSheet.columns} rows={detailSheet.rows} />
        ) : (
        <Table>
          <thead><tr style={headRow}>
            <Th>Link No / Voucher</Th><Th>Date</Th><Th>Customer</Th><Th>Supplier</Th><Th right>Sale</Th><Th right>Cost</Th><Th right>GP</Th><Th right>GP %</Th><Th>Status</Th>
          </tr></thead>
          <tbody>
            {rows.map((r, i) => {
              const s = STATUS[r.status] || { c: DIM, t: r.status };
              const f = fields(r);
              const isOpen = open === i;
              return (
                <React.Fragment key={r.ref + '-' + i}>
                  <tr style={{ ...rowBg(i), cursor: 'pointer', background: isOpen ? '#eef4ff' : rowBg(i).background }} {...clickable(() => setOpen(isOpen ? null : i))}>
                    <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 10.5, color: r.linked ? '#6b21a8' : '#64748b', fontWeight: 700 }}>
                      <span style={{ color: DIM, marginRight: 5 }}>{isOpen ? '▾' : '▸'}</span>{f.ref}
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
                            <div style={{ fontSize: 11, color: DIM }}>{detailReady ? 'No underlying voucher detail found.' : 'Loading detail…'}</div>
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
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, totals.sale)}</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: '#fff' }}>{money(cur, totals.cost)}</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: GOLD }}>{money(cur, totals.gp)}</td>
            <td style={{ padding: '9px 12px', ...num, fontWeight: 800, color: GOLD }}>{totals.gpPct}%</td>
            <td />
          </tr></tfoot>
        </Table>
        )}
      </State>
    </Page>
  );
}
