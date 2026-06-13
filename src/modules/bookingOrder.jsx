// ─── SO / PO / GP Voucher (approval-gated) ────────────────────────────────────
// Travkings-style combined voucher across all 7 modules. The user fills the
// Purchase grid (cost) + per-line markup & service charge; the Sales side derives,
// Gross Profit shows live. Saving creates a PENDING voucher — NO books impact.
// It then appears under Pending; an approver reviews the full JV (which ledger,
// which group, Dr/Cr) and Approves & Posts → that spawns the linked LOCKED Sales
// + Purchase vouchers (and their double-entry), and it moves to Approved. One
// Link No ties SO/PO/GP so profit is tracked invoice-wise.
import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus, Trash2, Save, ArrowRight, Check, Lock, RefreshCw, Clock, CheckCircle2,
  XCircle, ChevronDown, ChevronRight, Link2, FileCheck2, Pencil,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { inp, card, btnG, btnGh, FL, bc } from '../core/styles.jsx';
import { PeriodBar, periodRange } from '../core/period';
import { openPrintPreview } from '../core/PrintPreview';
import { buildBookingInvoice } from '../core/invoiceHtml';
import { apiGet, apiPost, apiPut } from '../core/api';
import { useLedgerRegistry } from '../core/useReference';
import { useHotkey } from '../core/ux/hotkeys';
import { toast } from '../core/ux/toast';
import {
  VSPECS, VMODULE_LIST, blankLine, blankSector, normalizeLine, syncLineRefs, bookingTotals, lineCalc,
} from '../core/voucherSpecs.js';

const GOLD = '#A07828', DARK = '#0d1326', DR = '#1B6B4C', CR = '#9B2C2C', BLUE = '#185FA5';
const brCodeOf = (branch) => (branch === 'ALL' ? null : (branch?.code || 'BOM'));
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => Number(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (n) => (Number.isFinite(Number(n)) ? Number(n) : 0);

/* shared cell styles */
const thM = { padding: '7px 6px', fontSize: 9, fontWeight: 700, letterSpacing: '.3px', color: '#27500A', textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '2px solid #cfe6d8', background: '#f4faf6' };
const thA = { padding: '7px 6px', fontSize: 9, fontWeight: 700, letterSpacing: '.3px', color: GOLD, textTransform: 'uppercase', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '2px solid #d9c79a', background: '#f7f2e6' };
const thL = { textAlign: 'left' };
const tdC = { padding: '3px 6px', fontSize: 11.5, textAlign: 'right', borderBottom: '1px solid #eef0f5', fontVariantNumeric: 'tabular-nums' };
const tdAuto = { ...tdC, background: '#faf7ef', color: '#5a6691', fontWeight: 600 };
const tdTot = { ...tdC, fontWeight: 800, color: DARK };
const cellInp = { width: 78, padding: '5px 6px', fontSize: 11.5, textAlign: 'right', border: '1px solid #e1e3ec', borderRadius: 3, background: '#fff', fontFamily: 'inherit' };
const cellTxt = { width: 90, padding: '5px 6px', fontSize: 11.5, textAlign: 'left', border: '1px solid #e1e3ec', borderRadius: 3, background: '#fff', fontFamily: 'inherit', fontWeight: 600 };
const tfTd = { borderTop: '1.5px solid ' + DARK, padding: '8px 6px', fontWeight: 800, fontSize: 11.5, background: '#f7f8fb', textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

/* ════════════════════════════════════════════════════════════════════════════
   SO / PO / GP Voucher entry
   ════════════════════════════════════════════════════════════════════════════ */
export function SoPoGpVoucherEntry({ branch, setRoute, editBooking = null, onDone = null }) {
  const qc = useQueryClient();
  const editing = !!editBooking;
  // Editing keeps the booking's own branch; a fresh voucher uses the top-bar branch.
  const brCode = editing ? (editBooking.branch || brCodeOf(branch)) : brCodeOf(branch);
  const cur = bc(editing ? { code: editBooking.branch } : branch).cur;

  const initModule = (editing && VSPECS[editBooking.module]) ? editBooking.module : 'SF';
  const [moduleCode, setModuleCode] = useState(initModule);
  const spec = VSPECS[moduleCode];

  const [lines, setLines] = useState(() => {
    if (editing) {
      const sp = VSPECS[initModule];
      const rows = Array.isArray(editBooking.rows) ? editBooking.rows : [];
      return rows.length ? rows.map((r) => normalizeLine(sp, r)) : [blankLine(sp)];
    }
    return [blankLine(VSPECS.SF)];   // start blank — no demo rows
  });
  const [date, setDate] = useState(editing ? (editBooking.date || today()) : today());
  const [headerRef, setHeaderRef] = useState(editing ? (editBooking.headerRef || '') : '');
  const [customer, setCustomer] = useState(editing
    ? { name: editBooking.customer?.name || '', gstin: editBooking.customer?.gstin || '', address: editBooking.customer?.address || '', email: editBooking.customer?.email || '', contact: editBooking.customer?.contact || '', group: editBooking.customer?.group || '', ledgerName: editBooking.customer?.ledgerName || '', ledgerGroup: editBooking.customer?.ledgerGroup || '' }
    : { name: '', gstin: '', address: '', email: '', contact: '', group: '', ledgerName: '', ledgerGroup: '' });
  const [supplier, setSupplier] = useState(editing
    ? { name: editBooking.supplier?.name || '', gstin: editBooking.supplier?.gstin || '', address: editBooking.supplier?.address || '', email: editBooking.supplier?.email || '', contact: editBooking.supplier?.contact || '', ledgerGroup: editBooking.supplier?.ledgerGroup || '' }
    : { name: '', gstin: '', address: '', email: '', contact: '', ledgerGroup: '' });
  // No-supplier mode (Misc only): a sale with no purchase leg — full sale value is
  // income. Hides the Purchase Order + supplier fields and posts only the sale.
  const [noSupplier, setNoSupplier] = useState(editing ? !!editBooking.noSupplier : false);
  const [gstMode, setGstMode] = useState(editing ? (editBooking.gstMode || 'intra') : 'intra');
  const [packageType, setPackageType] = useState(editing ? (editBooking.packageType || 'Domestic') : 'Domestic');
  const [remarks, setRemarks] = useState(editing ? (editBooking.remarks || '') : '');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Switching module reloads the seed grid for that module — never while editing
  // (the module is locked to the existing voucher so its lines aren't wiped).
  useEffect(() => { if (editing) return; setLines([blankLine(VSPECS[moduleCode])]); setNoSupplier(false); setResult(null); setError(''); }, [moduleCode]);

  // No-supplier is only offered on Miscellaneous (sell-without-buy: seats / extra
  // services). Any other module always has a supplier (cost) leg.
  const isNoSupp = moduleCode === 'SM' && noSupplier;
  const totals = useMemo(() => bookingTotals(spec, lines, { packageType, noSupplier: isNoSupp }), [spec, lines, packageType, isNoSupp]);
  const hasPackage = moduleCode === 'SF' || moduleCode === 'SH';

  const setLine = (i, key, val, numeric) =>
    setLines(lines.map((l, idx) => (idx === i ? { ...l, [key]: numeric ? (val === '' ? '' : Number(val)) : val } : l)));
  const addLine = () => setLines([...lines, blankLine(spec)]);
  const delLine = (i) => setLines(lines.length > 1 ? lines.filter((_, idx) => idx !== i) : [blankLine(spec)]);

  // ── Sectors (Flight): per-sector travel detail, entered on the Purchase grid ──
  const setSec = (li, si, key, val) => setLines(lines.map((l, i) => (i === li ? { ...l, sectors: (l.sectors || []).map((s, j) => (j === si ? { ...s, [key]: val } : s)) } : l)));
  const addSec = (li) => setLines(lines.map((l, i) => (i === li ? { ...l, sectors: [...(l.sectors || []), blankSector()] } : l)));
  const delSec = (li, si) => setLines(lines.map((l, i) => (i === li ? { ...l, sectors: (l.sectors || []).length > 1 ? l.sectors.filter((_, j) => j !== si) : l.sectors } : l)));

  // Both posting ledgers are mandatory: the customer's Debtor ledger (receivable)
  // and the supplier's Creditor ledger (payable).
  const hasCustLedger = !!(customer.ledgerName || '').trim();
  const hasSuppLedger = !!supplier.name.trim();
  // No-supplier needs only a sale + a customer; otherwise a supplier + cost are required.
  const canSave = !!brCode && !saving && totals.so.total > 0 && customer.name.trim() && hasCustLedger
    && (isNoSupp || (totals.po.total > 0 && hasSuppLedger));

  const save = async (thenApprove = false) => {
    setError(''); setSaving(true);
    try {
      const gpLines = lines.map((l) => {
        const c = lineCalc(spec, l);
        return { fn: l.fn, sn: l.sn, finalSales: c.finalSales, salesGST: c.salesGST, finalPurchase: c.finalPurchase, gstPur: c.gstPur, gp: c.gp, gpPct: c.gpPct };
      });
      const payload = {
        module: moduleCode, branch: brCode, date, noSupplier: isNoSupp,
        customer: { name: customer.name, gstin: customer.gstin, address: customer.address, email: customer.email, contact: customer.contact, group: customer.group, ledgerName: customer.ledgerName || customer.name, ledgerGroup: customer.ledgerGroup || customer.group },
        supplier: isNoSupp ? { name: '', gstin: '', address: '', email: '', contact: '', ledgerGroup: '' }
          : { name: supplier.name, gstin: supplier.gstin, address: supplier.address, email: supplier.email, contact: supplier.contact, ledgerGroup: supplier.ledgerGroup },
        gstMode, packageType: hasPackage ? packageType : '',
        headerRef, rows: lines.map((l) => syncLineRefs(spec, l)),
        po: totals.po, so: totals.so,
        gp: { lines: gpLines, total: totals.gp.total, pct: totals.gp.pct },
        remarks,
      };
      let booking = editing
        ? await apiPut('/api/booking-orders/' + editBooking.id, payload)
        : await apiPost('/api/booking-orders', payload);
      if (thenApprove) booking = await apiPost('/api/booking-orders/' + booking.id + '/approve');
      setResult({ ...booking, _approved: thenApprove, _edited: editing });
      qc.invalidateQueries({ queryKey: ['booking-orders'] });
      toast(thenApprove ? `Voucher ${booking.bookingNo || ''} approved & posted` : `Voucher ${booking.bookingNo || ''} saved — pending approval`);
    } catch (e) { setError(e.message || 'Failed to save voucher'); toast(`Could not save — ${e.message || 'failed'}`, 'error'); }
    finally { setSaving(false); }
  };
  // Ctrl/Cmd+Enter saves from anywhere on this (large, multi-grid) entry screen.
  useHotkey('mod+enter', () => { if (canSave) save(false); }, [canSave]);

  const reset = () => { setLines([blankLine(spec)]); setCustomer({ name: '', gstin: '', address: '', email: '', contact: '', group: '', ledgerName: '', ledgerGroup: '' }); setSupplier({ name: '', gstin: '', address: '', email: '', contact: '', ledgerGroup: '' }); setNoSupplier(false); setResult(null); setError(''); };

  if (result) {
    const approved = result._approved;
    const noSupp = !!result.noSupplier;
    const fields = [['Booking No', result.bookingNo], ['Link No', result.linkNo], ['Module', VSPECS[result.module]?.name || result.module], ['Status', (result.status || 'pending').toUpperCase()]];
    if (approved) { fields.push(['Sales invoice', result.saleVno || '—']); if (!noSupp) fields.push(['Purchase invoice', result.purchaseVno || '—']); }
    else { fields.push(['Sales (incl GST)', cur + ' ' + fmt(result.so?.total)], ['Gross Profit', cur + ' ' + fmt(result.gp?.total) + ` (${result.gp?.pct ?? 0}%)`]); }
    return (
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '24px 12px' }}>
        <div style={{ ...card, textAlign: 'center', padding: 28 }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: approved ? '#EAF3DE' : '#FEF6E6', color: approved ? '#27500A' : GOLD, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>{approved ? <Check size={28} /> : <Clock size={28} />}</div>
          <h2 style={{ margin: '0 0 4px', fontSize: 18, color: DARK }}>
            {approved ? 'Voucher approved & posted' : result._edited ? 'Voucher updated — still Pending' : 'Voucher saved — Pending approval'}
          </h2>
          <p style={{ margin: '0 0 18px', fontSize: 12.5, color: '#5a6691' }}>
            {approved
              ? (noSupp
                  ? <>The <b>Sales invoice</b> was generated and posted to the books — no purchase leg (the full sale value is income).</>
                  : <>The linked <b>Sales &amp; Purchase invoices</b> were generated and posted to the books, tied by the Link No.</>)
              : <>It has <b>no effect on the books yet</b>. Approve it under <b>Pending</b> to post {noSupp ? <>the <b>Sales invoice</b> (no purchase leg)</> : <>the linked Sales &amp; Purchase invoices</>}.</>}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, textAlign: 'left' }}>
            {fields.map(([k, v]) => (
              <div key={k} style={{ background: '#f7f8fb', borderRadius: 8, padding: '8px 12px' }}>
                <p style={{ margin: 0, fontSize: 9.5, color: '#8b94b3', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k}</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: DARK, fontFamily: 'monospace' }}>{v}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 9, justifyContent: 'center', marginTop: 20 }}>
            {editing
              ? <button onClick={() => (onDone ? onDone() : setRoute && setRoute(approved ? '/bookings/approved' : '/bookings/pending'))} style={btnG}><ArrowRight size={14} /> Back to list</button>
              : <>
                  <button onClick={reset} style={btnG}><Plus size={14} /> New voucher</button>
                  <button onClick={() => setRoute && setRoute(approved ? '/bookings/approved' : '/bookings/pending')} style={btnGh}>Go to {approved ? 'Approved' : 'Pending'} <ArrowRight size={14} /></button>
                </>}
          </div>
        </div>
      </div>
    );
  }

  const refKeys = spec.idCols.slice(2); // module reference fields (Ticket/PNR/etc.)
  const pkg = spec.model === 'package';  // Holiday tour-operator model (no service charge; 5% GST; entered supplier GST)
  // Bill-To is free text ONLY for B2C debtors (pooled per-staff ledgers); a named
  // B2B/B2E client IS the ledger, so its name doubles as the Bill-To.
  const isB2C = /b2c/i.test(customer.ledgerGroup || '');
  // Column counts for the full-width sectors sub-row (Flight only).
  const soCols = spec.idCols.length + spec.fareCols.length + 1 + (pkg ? 0 : 1) + (pkg ? 0 : 1) + 1 + 1 + 1;
  const poCols = 2 + refKeys.length + spec.fareCols.length + 3;

  // Sectors sub-table for a passenger line — editable on the Purchase grid,
  // read-only ("fetched & locked") on the Sales grid.
  const sectorBlock = (l, li, readOnly, colSpan) => (
    <tr key={'sec-' + li}>
      <td colSpan={colSpan} style={{ padding: '2px 6px 8px 26px', background: readOnly ? '#faf7ef' : '#fbfcff', borderBottom: '1px solid #eef0f5' }}>
        <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '.3px', color: '#9A9A9A', textTransform: 'uppercase', margin: '2px 0' }}>{readOnly ? '▣ Sectors — from Purchase (locked)' : '✎ Sectors — enter each segment'}</div>
        <table style={{ borderCollapse: 'collapse' }}>
          <thead><tr>
            {spec.sectorCols.map((sc) => <th key={sc.key} style={{ ...thA, ...thL, fontSize: 8.5, padding: '3px 6px' }}>{sc.label}</th>)}
            {!readOnly && <th style={{ ...thA, width: 26 }} />}
          </tr></thead>
          <tbody>
            {(l.sectors || []).map((s, si) => (
              <tr key={si}>
                {spec.sectorCols.map((sc) => (
                  <td key={sc.key} style={{ padding: 2 }}>
                    {readOnly
                      ? <span style={{ fontSize: 11, fontWeight: 600, color: sc.kind === 'pnr' ? GOLD : '#3A3A3A' }}>{s[sc.key] || '—'}</span>
                      : <input type={sc.type === 'date' ? 'date' : 'text'} value={s[sc.key] ?? ''} onChange={(e) => setSec(li, si, sc.key, e.target.value)} style={{ ...cellTxt, width: sc.type === 'date' ? 124 : 92, color: sc.kind === 'pnr' ? GOLD : DARK }} />}
                  </td>
                ))}
                {!readOnly && <td style={{ padding: 2, textAlign: 'center' }}><button onClick={() => delSec(li, si)} title="Remove sector" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#b9b9b9' }}><Trash2 size={12} /></button></td>}
              </tr>
            ))}
          </tbody>
        </table>
        {!readOnly && <button onClick={() => addSec(li)} style={{ ...btnGh, marginTop: 4, padding: '3px 9px', fontSize: 10 }}><Plus size={11} /> Add sector</button>}
      </td>
    </tr>
  );

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '12px 10px 90px' }}>
      {/* Header */}
      <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 14, borderLeft: '4px solid ' + GOLD }}>
        <div style={{ padding: '14px 18px', background: DARK, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: '0.5px', color: '#fff' }}>{editing ? `EDIT — ${editBooking.bookingNo}` : 'SO / PO / GP VOUCHER'}</p>
            <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#8b94b3' }}>
              {editing
                ? <>Fix any data-entry mistake, then <b style={{ color: GOLD }}>Save</b> or <b style={{ color: GOLD }}>Save &amp; Approve</b> · {brCode} · still Pending until approved</>
                : <>Enter cost + markup → Sales auto-derives. Saving creates a <b style={{ color: GOLD }}>Pending</b> voucher · {brCode || 'select a branch'}</>}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {VMODULE_LIST.map((m) => (
              <button key={m.code} disabled={editing && m.code !== moduleCode} onClick={() => { if (!editing) setModuleCode(m.code); }}
                title={editing ? 'Module is locked while editing' : ''}
                style={{ padding: '5px 11px', borderRadius: 999, border: '1px solid ' + (moduleCode === m.code ? GOLD : '#2a3450'), background: moduleCode === m.code ? GOLD : 'transparent', color: moduleCode === m.code ? '#fff' : '#8b94b3', fontSize: 10.5, fontWeight: 700, cursor: editing ? (m.code === moduleCode ? 'default' : 'not-allowed') : 'pointer', opacity: editing && m.code !== moduleCode ? 0.35 : 1 }}>
                {m.icon} {m.name}
              </button>
            ))}
          </div>
        </div>
        {/* Link band */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', background: '#1b2138' }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.2px', color: '#C49A3C', textTransform: 'uppercase' }}>Link No</span>
          <span style={{ padding: '5px 12px', borderRadius: 4, background: '#11162a', color: '#fff', fontWeight: 800, letterSpacing: '.5px', fontFamily: 'monospace', fontSize: 13 }}>Auto · assigned on save</span>
          <span style={{ fontSize: 10.5, color: '#9aa2c0', fontStyle: 'italic' }}>links the Sales Order, Purchase Order &amp; Gross Profit of this invoice</span>
          <span style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {['SO', 'PO', 'GP'].map((c) => <span key={c} style={{ fontSize: 9, fontWeight: 800, padding: '3px 9px', borderRadius: 20, background: '#262c47', color: '#C49A3C' }}>{c}</span>)}
          </span>
        </div>
      </div>

      {/* Misc: with / without supplier. "Without" = we sell but don't buy (extra
          seats / services) → no purchase leg, the full sale value is income. */}
      {moduleCode === 'SM' && (
        <div style={{ ...card, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: DARK, textTransform: 'uppercase', letterSpacing: '.3px' }}>Supplier</span>
          <div style={{ display: 'inline-flex', border: '1px solid #d8dcec', borderRadius: 7, overflow: 'hidden' }}>
            {[['with', 'With supplier (cost + margin)'], ['without', 'Without supplier (pure income)']].map(([v, l]) => {
              const active = (v === 'without') === noSupplier;
              return (
                <button key={v} type="button" onClick={() => setNoSupplier(v === 'without')}
                  style={{ padding: '6px 14px', fontSize: 11.5, fontWeight: 600, border: 'none', cursor: 'pointer', background: active ? GOLD : '#fff', color: active ? '#fff' : '#5a6691' }}>{l}</button>
              );
            })}
          </div>
          <span style={{ fontSize: 10.5, color: '#9A9A9A', fontStyle: 'italic' }}>
            {noSupplier
              ? 'No purchase leg — the full sale value is income (Sales — Other Services). Gross Profit = 100%.'
              : 'A linked Purchase invoice posts the supplier cost; Gross Profit = sale − cost.'}
          </span>
        </div>
      )}

      {!brCode && (
        <div style={{ ...card, background: '#FCEBEB', border: '1px solid #F7C1C1', color: '#A32D2D', fontSize: 12, marginBottom: 14 }}>
          Select a specific branch (not “All branches”) from the top bar to create a voucher.
        </div>
      )}

      {editing && !(Array.isArray(editBooking.rows) && editBooking.rows.length) && (
        <div style={{ ...card, background: '#FFF7E6', border: '1px solid #F0C36D', color: '#7a5b12', fontSize: 12, marginBottom: 14 }}>
          ⓘ This voucher was bulk-imported without per-line detail. Re-enter the line(s) below — <b>saving recomputes the totals</b> from what you enter here.
        </div>
      )}

      {/* Header fields */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 11 }}>
          <FL label="Booking date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} /></FL>
          <FL label={spec.headerLabel}><input value={headerRef} onChange={(e) => setHeaderRef(e.target.value)} placeholder={spec.headerLabel} style={inp} /></FL>
          <FL label="Post receivable to (Debtor ledger) *">
            <PartyPicker branch={branch} kind="customer" value={{ name: customer.ledgerName, group: customer.ledgerGroup }}
              onChange={(v) => setCustomer((c) => {
                const b2c = /b2c/i.test(v.group || '');
                // B2B/B2E: the ledger IS the customer → Bill-To = ledger name.
                // B2C (pooled per-staff ledger): keep the free-typed end-customer name.
                return { ...c, ledgerName: v.name, ledgerGroup: v.group, group: v.group, name: b2c ? c.name : v.name };
              })} />
            {!hasCustLedger && <span style={{ fontSize: 10, color: '#A32D2D' }}>Required — pick the Debtor ledger to post & follow for payment</span>}
          </FL>
          {isB2C && (
            <FL label="Customer (Bill to) — free text *">
              <input value={customer.name} onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))} placeholder="End-customer name (B2C)" style={inp} />
              {!customer.name.trim() && <span style={{ fontSize: 10, color: '#A32D2D' }}>Required — type the end customer's name for the invoice</span>}
            </FL>
          )}
          {!isNoSupp && <FL label="Supplier ledger (Pay to) *">
            <PartyPicker branch={branch} kind="supplier" value={{ name: supplier.name, group: supplier.ledgerGroup }}
              onChange={(v) => setSupplier({ ...supplier, name: v.name, ledgerGroup: v.group })} />
            {!hasSuppLedger && <span style={{ fontSize: 10, color: '#A32D2D' }}>Required — pick the Creditor ledger to post & pay against</span>}
          </FL>}
          {!isNoSupp && <FL label="Supplier sub-group (auto)"><input value={supplier.ledgerGroup} readOnly placeholder="picks with the supplier" style={{ ...inp, background: '#faf7ef', color: '#5a6691' }} /></FL>}
          <FL label="GST mode"><select value={gstMode} onChange={(e) => setGstMode(e.target.value)} style={inp}><option value="intra">Intra-state (CGST+SGST)</option><option value="inter">Inter-state (IGST)</option></select></FL>
          {hasPackage && <FL label="Package type"><select value={packageType} onChange={(e) => setPackageType(e.target.value)} style={inp}><option>Domestic</option><option>International</option></select></FL>}
          <FL label="Customer GSTIN"><input value={customer.gstin} onChange={(e) => setCustomer({ ...customer, gstin: e.target.value })} placeholder="GSTIN" style={inp} /></FL>
          <FL label="Customer Address"><input value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder="Billing address (for invoice)" style={inp} /></FL>
          <FL label="Customer Email"><input value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="email" style={inp} /></FL>
          <FL label="Customer Contact"><input value={customer.contact} onChange={(e) => setCustomer({ ...customer, contact: e.target.value })} placeholder="phone" style={inp} /></FL>
          {!isNoSupp && <FL label="Supplier GSTIN"><input value={supplier.gstin} onChange={(e) => setSupplier({ ...supplier, gstin: e.target.value })} placeholder="GSTIN" style={inp} /></FL>}
          {!isNoSupp && <FL label="Supplier Address"><input value={supplier.address} onChange={(e) => setSupplier({ ...supplier, address: e.target.value })} placeholder="address" style={inp} /></FL>}
          {!isNoSupp && <FL label="Supplier Email"><input value={supplier.email} onChange={(e) => setSupplier({ ...supplier, email: e.target.value })} placeholder="email" style={inp} /></FL>}
          {!isNoSupp && <FL label="Supplier Contact"><input value={supplier.contact} onChange={(e) => setSupplier({ ...supplier, contact: e.target.value })} placeholder="phone" style={inp} /></FL>}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 18, alignItems: 'center', padding: '8px 14px', marginBottom: 12, background: '#FDFAF4', border: '1px solid #eee3cf', borderRadius: 8, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10.5, fontWeight: 700, color: '#3A3A3A' }}><span style={{ width: 24, height: 15, borderRadius: 3, background: '#fff', border: '1px solid #C49A3C' }} /> Manual — you enter</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10.5, fontWeight: 700, color: '#3A3A3A' }}><span style={{ width: 24, height: 15, borderRadius: 3, background: '#faf7ef', border: '1px dashed #9A9A9A' }} /> Auto — calculated</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, color: '#9A9A9A', fontStyle: 'italic' }}>shaded fields are computed and can't be typed into · {pkg ? 'Holiday package: 5% GST on (Land + Supplier Service + Supplier Service GST + Markup + Markup GST); Intl adds 2% TCS' : 'markup is GST-inclusive (GST = markup × 18 ÷ 118)'}</span>
      </div>

      {/* ① Sales Order */}
      <Section n="1" name="Sales Order" sub={pkg ? 'what the customer pays · 5% GST on the package + 2% TCS (Intl)' : 'what the customer pays · markup is GST-inclusive'} accent={BLUE}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 860 }}>
            <thead><tr>
              {spec.idCols.map((c) => <th key={c.key} style={{ ...thM, ...thL }}>{c.label}</th>)}
              {spec.fareCols.map((c) => <th key={c.key} style={thA}>{c.label}</th>)}
              <th style={thM}>Markup</th>{!pkg && <th style={thM}>Service Chg</th>}
              {!pkg && <th style={thA}>GST/Service</th>}<th style={thA}>GST/Markup{pkg ? ' (5%)' : ''}</th><th style={thA}>Total</th><th style={thA}></th>
            </tr></thead>
            <tbody>
              {lines.map((l, i) => {
                const c = lineCalc(spec, l);
                return (
                  <React.Fragment key={i}>
                  <tr>
                    {spec.idCols.map((col) => (
                      <td key={col.key} style={{ ...tdC, textAlign: 'left', padding: 3 }}>
                        {spec.sectors
                          ? <span style={{ fontSize: 11.5, fontWeight: 600, color: DARK }}>{l[col.key] || '—'}</span>
                          : <input value={l[col.key] ?? ''} onChange={(e) => setLine(i, col.key, e.target.value)} style={{ ...cellTxt, color: col.kind === 'pnr' ? GOLD : DARK }} />}
                      </td>
                    ))}
                    {spec.fareCols.map((col) => (isNoSupp
                      ? <td key={col.key} style={{ padding: 3 }}><input type="number" min="0" value={l[col.key]} onChange={(e) => setLine(i, col.key, e.target.value, true)} style={cellInp} /></td>
                      : <td key={col.key} style={tdAuto}>{fmt(l[col.key])}</td>))}
                    <td style={{ padding: 3 }}><input type="number" min="0" value={l.markup} onChange={(e) => setLine(i, 'markup', e.target.value, true)} style={cellInp} /></td>
                    {!pkg && <td style={{ padding: 3 }}><input type="number" min="0" value={l.ssvc} onChange={(e) => setLine(i, 'ssvc', e.target.value, true)} style={cellInp} /></td>}
                    {!pkg && <td style={tdAuto}>{fmt(c.gstSvc)}</td>}
                    <td style={tdAuto}>{fmt(c.gstMk)}</td>
                    <td style={{ ...tdC, fontWeight: 800, color: DARK, background: '#faf7ef' }}>{fmt(c.finalSales)}</td>
                    <td style={{ ...tdC, textAlign: 'center', background: '#faf7ef' }}><button onClick={() => delLine(i)} title="Remove" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#b9b9b9' }}><Trash2 size={13} /></button></td>
                  </tr>
                  {spec.sectors && sectorBlock(l, i, true, soCols)}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot><tr>
              <td style={{ ...tfTd, textAlign: 'left' }}>TOTAL</td>
              {spec.idCols.slice(1).map((c) => <td key={c.key} style={tfTd} />)}
              {spec.fareCols.map((c) => <td key={c.key} style={tfTd}>{fmt(lines.reduce((s, l) => s + num(l[c.key]), 0))}</td>)}
              <td style={tfTd}>{fmt(lines.reduce((s, l) => s + num(l.markup), 0))}</td>
              {!pkg && <td style={tfTd}>{fmt(lines.reduce((s, l) => s + num(l.ssvc), 0))}</td>}
              <td style={tfTd} colSpan={pkg ? 1 : 2}>{fmt(totals.so.gst)} GST</td>
              <td style={tfTd}>{fmt(totals.so.total)}</td><td style={tfTd} />
            </tr></tfoot>
          </table>
        </div>
        <button onClick={addLine} style={{ ...btnGh, marginTop: 8, padding: '6px 12px', fontSize: 11 }}><Plus size={12} /> Add line</button>
      </Section>

      {/* ② Purchase Order — hidden in no-supplier mode (there's no cost leg). */}
      {!isNoSupp && (
      <Section n="2" name="Purchase Order" sub="what you pay the airline / supplier" accent={CR}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
            <thead><tr>
              <th style={{ ...thM, ...thL }}>{spec.idCols[0].label}</th>
              <th style={{ ...thM, ...thL }}>{spec.idCols[1].label}</th>
              {refKeys.map((c) => <th key={c.key} style={{ ...thA, ...thL }}>{c.label}</th>)}
              {spec.fareCols.map((c) => <th key={c.key} style={thM}>{c.label}</th>)}
              <th style={thM}>Supplier Service</th><th style={pkg ? thM : thA}>{pkg ? 'Supplier Service GST' : 'GST'}</th><th style={thA}>Total</th>
            </tr></thead>
            <tbody>
              {lines.map((l, i) => {
                const c = lineCalc(spec, l);
                return (
                  <React.Fragment key={i}>
                  <tr>
                    <td style={{ ...tdC, textAlign: 'left', padding: 3 }}><input value={l.fn ?? ''} onChange={(e) => setLine(i, 'fn', e.target.value)} style={cellTxt} /></td>
                    <td style={{ ...tdC, textAlign: 'left', padding: 3 }}><input value={l.sn ?? ''} onChange={(e) => setLine(i, 'sn', e.target.value)} style={cellTxt} /></td>
                    {refKeys.map((col) => <td key={col.key} style={{ ...tdAuto, textAlign: 'left', fontWeight: 700, color: col.kind === 'pnr' ? GOLD : '#3A3A3A' }}>{l[col.key] || '—'}</td>)}
                    {spec.fareCols.map((col) => <td key={col.key} style={{ padding: 3 }}><input type="number" min="0" value={l[col.key]} onChange={(e) => setLine(i, col.key, e.target.value, true)} style={cellInp} /></td>)}
                    <td style={{ padding: 3 }}><input type="number" min="0" value={l.psvc} onChange={(e) => setLine(i, 'psvc', e.target.value, true)} style={cellInp} /></td>
                    {pkg
                      ? <td style={{ padding: 3 }}><input type="number" min="0" value={l.psvcGst} onChange={(e) => setLine(i, 'psvcGst', e.target.value, true)} style={cellInp} /></td>
                      : <td style={tdAuto}>{fmt(c.gstPur)}</td>}
                    <td style={{ ...tdC, fontWeight: 800, color: DARK, background: '#faf7ef' }}>{fmt(c.finalPurchase)}</td>
                  </tr>
                  {spec.sectors && sectorBlock(l, i, false, poCols)}
                  </React.Fragment>
                );
              })}
            </tbody>
            <tfoot><tr>
              <td style={{ ...tfTd, textAlign: 'left' }}>TOTAL</td>
              <td style={tfTd} />
              {refKeys.map((c) => <td key={c.key} style={tfTd} />)}
              {spec.fareCols.map((c) => <td key={c.key} style={tfTd}>{fmt(lines.reduce((s, l) => s + num(l[c.key]), 0))}</td>)}
              <td style={tfTd}>{fmt(lines.reduce((s, l) => s + num(l.psvc), 0))}</td>
              <td style={tfTd}>{pkg ? fmt(lines.reduce((s, l) => s + num(l.psvcGst), 0)) : fmt(totals.po.gst)}</td>
              <td style={tfTd}>{fmt(totals.po.total)}</td>
            </tr></tfoot>
          </table>
        </div>
      </Section>
      )}

      {/* ③ Gross Profit */}
      <Section n="3" name="Gross Profit" sub="GP = net sales − net purchase · % on final sales value" accent={DR}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 12 }}>
          <GpCard k={'Total Sales (incl GST' + (totals.so.tcs > 0 ? ' & TCS' : '') + ')'} v={cur + ' ' + fmt(totals.so.total)} color={DARK} />
          <GpCard k="Total Purchase (incl GST)" v={cur + ' ' + fmt(totals.po.total)} color={CR} />
          <GpCard k="Gross Profit" v={cur + ' ' + fmt(totals.gp.total)} color={DR} pct={totals.gp.pct + '% margin'} />
        </div>
        {totals.so.tcs > 0 && (
          <div style={{ marginBottom: 12, padding: '8px 12px', borderRadius: 7, background: '#FFF7E6', border: '1px solid #F0C36D', color: '#7a5b12', fontSize: 11.5 }}>
            Incl. <b>TCS @ {spec.tcs.rate}% = {cur} {fmt(totals.so.tcs)}</b> collected from the customer on this International package (u/s 206C(1G)) — posts to <b>TCS Payable</b> (Balance Sheet), not income, so GP is unaffected.
          </div>
        )}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
            <thead><tr>
              <th style={{ ...thA, ...thL }}>First Name</th><th style={{ ...thA, ...thL }}>Surname</th>
              <th style={thA}>Final Sales</th><th style={thA}>Sales GST</th><th style={thA}>Final Purchase</th><th style={thA}>Purchase GST</th>
              <th style={thA}>Gross Profit</th><th style={thA}>GP %</th>
            </tr></thead>
            <tbody>
              {lines.map((l, i) => {
                const c = lineCalc(spec, l);
                return (
                  <tr key={i}>
                    <td style={{ ...tdAuto, textAlign: 'left' }}>{l.fn || '—'}</td><td style={{ ...tdAuto, textAlign: 'left' }}>{l.sn || ''}</td>
                    <td style={tdAuto}>{fmt(c.finalSales)}</td><td style={tdAuto}>{fmt(c.salesGST)}</td>
                    <td style={tdAuto}>{fmt(c.finalPurchase)}</td><td style={tdAuto}>{fmt(c.gstPur)}</td>
                    <td style={{ ...tdAuto, fontWeight: 800, color: DR }}>{fmt(c.gp)}</td>
                    <td style={{ ...tdAuto, fontWeight: 800, color: GOLD }}>{c.gpPct.toFixed(2)}%</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot><tr>
              <td style={{ ...tfTd, textAlign: 'left' }} colSpan={2}>TOTAL</td>
              <td style={tfTd}>{fmt(totals.so.total)}</td><td style={tfTd}>{fmt(totals.so.gst)}</td>
              <td style={tfTd}>{fmt(totals.po.total)}</td><td style={tfTd}>{fmt(totals.po.gst)}</td>
              <td style={{ ...tfTd, color: DR }}>{fmt(totals.gp.total)}</td><td style={{ ...tfTd, color: GOLD }}>{totals.gp.pct.toFixed(2)}%</td>
            </tr></tfoot>
          </table>
        </div>
      </Section>

      {error && <div style={{ ...card, background: '#FCEBEB', border: '1px solid #F7C1C1', color: '#A32D2D', fontSize: 12, marginBottom: 14 }}>{error}</div>}

      {/* Footer */}
      <div style={{ position: 'sticky', bottom: 0, background: '#f3f4f8', borderTop: '1px solid #e1e3ec', padding: '12px 0', display: 'flex', gap: 9, justifyContent: 'flex-end', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: '#5a6691', marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
          {editing ? <><Pencil size={12} /> Editing a pending voucher — “Save &amp; Approve” fixes it and posts the books in one step.</> : <><Clock size={12} /> Saving creates a Pending voucher — it posts to the books only after approval.</>}
        </span>
        <FL label="Remarks"><input value={remarks} onChange={(e) => setRemarks(e.target.value)} style={{ ...inp, width: 220 }} placeholder="optional" /></FL>
        {editing && (
          <button onClick={() => (onDone ? onDone() : setRoute && setRoute('/bookings/pending'))} style={btnGh}><XCircle size={14} /> Cancel</button>
        )}
        <button disabled={!canSave} onClick={() => save(false)}
          style={{ ...btnG, background: canSave ? (editing ? DARK : GOLD) : '#9ca3af', cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.7 }}>
          {saving ? <RefreshCw size={14} className="spin" /> : <Save size={14} />} {saving ? 'Saving…' : (editing ? 'Save changes' : 'Save voucher (Pending)')}
        </button>
        {editing && (
          <button disabled={!canSave} onClick={() => save(true)}
            style={{ ...btnG, background: canSave ? DR : '#9ca3af', cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.7 }}>
            {saving ? <RefreshCw size={14} className="spin" /> : <CheckCircle2 size={14} />} Save &amp; Approve
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ n, name, sub, accent, children }) {
  return (
    <div style={{ ...card, marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <span style={{ width: 24, height: 24, borderRadius: '50%', background: DARK, color: '#fff', fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.5px', color: accent, textTransform: 'uppercase' }}>{name}</span>
        <span style={{ fontSize: 10.5, color: '#9A9A9A', fontStyle: 'italic' }}>{sub}</span>
      </div>
      {children}
    </div>
  );
}

function GpCard({ k, v, color, pct }) {
  return (
    <div style={{ border: '1px solid #e8e2d2', borderRadius: 8, padding: '12px 14px', background: '#faf7ef' }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.7px', color: '#9A9A9A', textTransform: 'uppercase' }}>{k}</div>
      <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4, color }}>{v}</div>
      {pct && <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, marginTop: 2 }}>{pct}</div>}
    </div>
  );
}

// Searchable customer / supplier picker — lists existing debtor / creditor ledgers
// and auto-fills the SUB-GROUP when one is chosen (the most specific chart bucket,
// e.g. "B2B Clients" / "Supplier Air Lines"; falls back to the top group when the
// ledger has no sub-group). Typing a NEW name keeps it (default Sundry Debtors /
// Sundry Creditors) so a fresh party still works — the posting auto-creates its
// ledger on approval.
const subGroupOf = (l) => (l && (l.subGroup || l.group)) || '';
function PartyPicker({ branch, kind, value, onChange }) {
  const wantType = kind === 'customer' ? 'Debtor' : 'Creditor';
  const defaultGroup = kind === 'customer' ? 'Sundry Debtors' : 'Sundry Creditors';
  const reg = useLedgerRegistry(branch).data || [];
  const list = reg.filter((l) => l.type === wantType);
  const [open, setOpen] = useState(false);
  const q = value.name || '';
  const matches = list.filter((l) => !q || l.name.toLowerCase().includes(q.toLowerCase())).slice(0, 12);
  const setName = (v) => {
    const exact = list.find((l) => l.name.trim().toLowerCase() === v.trim().toLowerCase());
    onChange({ name: v, group: exact ? subGroupOf(exact) : defaultGroup });
  };
  const pick = (l) => { onChange({ name: l.name, group: subGroupOf(l) || defaultGroup }); setOpen(false); };
  return (
    <div style={{ position: 'relative' }}>
      <input value={q} placeholder={kind === 'customer' ? 'Search or type customer…' : 'Search or type supplier…'}
        onChange={(e) => { setName(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} style={inp} />
      {open && matches.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 60, marginTop: 2, background: '#fff', border: '1px solid #e1e3ec', borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.16)', maxHeight: 220, overflowY: 'auto' }}>
          {matches.map((l) => (
            <div key={l.id} onMouseDown={() => pick(l)}
              style={{ padding: '7px 11px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f4ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              <span style={{ color: '#0d1326', fontWeight: 500 }}>{l.name}</span>
              <span style={{ color: '#8b94b3', fontSize: 9.5, flexShrink: 0 }}>{subGroupOf(l) || l.group}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   JV / posting detail view (one voucher side)
   ════════════════════════════════════════════════════════════════════════════ */
function PostingTable({ side, accent, title }) {
  if (!side) return null;
  const balanced = Math.abs((side.totalDr || 0) - (side.totalCr || 0)) < 0.01;
  return (
    <div style={{ border: '1px solid #e1e3ec', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: accent + '12', borderBottom: '1px solid #e1e3ec' }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: accent }}>{title}</span>
        <span style={{ fontSize: 10.5, fontFamily: 'monospace', color: '#5a6691' }}>{side.vno} · {side.type}</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: '#f7f8fb' }}>
          {['Ledger', 'Group', 'Debit', 'Credit'].map((h, i) => <th key={h} style={{ padding: '6px 10px', fontSize: 9.5, fontWeight: 700, color: '#5a6691', textTransform: 'uppercase', textAlign: i >= 2 ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {(side.postings || []).map((p, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f0f2f7' }}>
              <td style={{ padding: '5px 10px', fontSize: 11.5, fontWeight: 600, color: DARK, paddingLeft: p.credit > 0 ? 22 : 10 }}>{p.ledger}</td>
              <td style={{ padding: '5px 10px', fontSize: 10.5, color: '#8b94b3' }}>{p.group}</td>
              <td style={{ padding: '5px 10px', fontSize: 11.5, textAlign: 'right', color: DR, fontVariantNumeric: 'tabular-nums' }}>{p.debit > 0 ? fmt(p.debit) : ''}</td>
              <td style={{ padding: '5px 10px', fontSize: 11.5, textAlign: 'right', color: CR, fontVariantNumeric: 'tabular-nums' }}>{p.credit > 0 ? fmt(p.credit) : ''}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr style={{ borderTop: '1.5px solid ' + DARK, background: '#f7f8fb' }}>
          <td style={{ padding: '6px 10px', fontSize: 11, fontWeight: 800 }} colSpan={2}>{balanced ? '✓ Balanced' : '⚠ Unbalanced'}</td>
          <td style={{ padding: '6px 10px', fontSize: 11.5, fontWeight: 800, textAlign: 'right', color: DR }}>{fmt(side.totalDr)}</td>
          <td style={{ padding: '6px 10px', fontSize: 11.5, fontWeight: 800, textAlign: 'right', color: CR }}>{fmt(side.totalCr)}</td>
        </tr></tfoot>
      </table>
    </div>
  );
}

function JournalView({ id, cur }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['booking-journal', id],
    queryFn: () => apiGet('/api/booking-orders/' + id + '/journal'),
  });
  if (isLoading) return <div style={{ padding: 14, fontSize: 12, color: '#8b94b3' }}>Building JV…</div>;
  if (error) return <div style={{ padding: 14, fontSize: 12, color: '#A32D2D' }}>{error.message || 'Failed to build JV'}</div>;
  if (!data) return null;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 10, fontSize: 11.5, color: '#5a6691' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'monospace', fontWeight: 700, color: BLUE }}><Link2 size={13} /> {data.linkNo}</span>
        <span>Gross Profit: <b style={{ color: DR }}>{cur} {fmt(data.gp?.total)}</b> ({data.gp?.pct ?? 0}%)</span>
        <span style={{ fontStyle: 'italic', color: '#9A9A9A' }}>journal entries that {data.status === 'approved' || data.status === 'posted' ? 'were posted' : 'will post on approval'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(330px,1fr))', gap: 12 }}>
        <PostingTable side={data.purchase} accent={CR} title="Purchase invoice (Dr cost · Cr supplier)" />
        <PostingTable side={data.sale} accent={BLUE} title="Sales invoice (Dr customer · Cr sales)" />
      </div>
      <WhereItPosts approved={data.status === 'approved' || data.status === 'posted'} />
    </div>
  );
}

// Plain-English map of where the two invoices flow once approved.
function WhereItPosts({ approved }) {
  const items = [
    ['Day Book / Ledgers', 'both vouchers appear in the Day Book and each ledger statement (Sundry Debtors, Supplier, every Sales/Purchase component head, GST).'],
    ['Trial Balance', 'every Dr/Cr leg above lands in the Trial Balance under its group.'],
    ['Profit & Loss', 'each head nests in the Tally chart — Sales Accounts → module sub-group (Ticketing → Domestic/International) → DT-Base Fare / DT-K3-Taxes / DT-Other Taxes / DT-Service Charges; Purchase Accounts → … [Pur] incl. Supplier Service (an agency cost that reduces GP). Drill the P&L to see it head-wise.'],
    ['Balance Sheet', 'customer (Sundry Debtors, asset), supplier (Sundry Creditors, liability), CGST/SGST (Duties & Taxes) and any TCS Payable sit on the Balance Sheet.'],
    ['Sales & Purchase Registers', 'the sale shows in the Sales Register, the purchase in the Purchase Register.'],
    ['Invoice GP / Sales-GP Analytics', 'both are tied by the Link No, so GP is tracked invoice-wise.'],
    ['GST reports (GSTR-1 / 3B)', 'Output GST (sale) and Input GST (purchase) flow into the GST returns; TCS into the TCS return.'],
  ];
  return (
    <div style={{ marginTop: 14, border: '1px dashed #cdbb8e', borderRadius: 8, background: '#FDFAF4', padding: '12px 14px' }}>
      <div style={{ fontSize: 11, fontWeight: 800, color: GOLD, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
        {approved ? '✓ Where this is posted' : 'Where this will post on approval'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: '6px 18px' }}>
        {items.map(([k, v]) => (
          <div key={k} style={{ fontSize: 11, color: '#3A3A3A', lineHeight: 1.45 }}>
            <b style={{ color: DARK }}>{k}</b> — {v}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   Pending & Approved lists
   ════════════════════════════════════════════════════════════════════════════ */
function useBookings(brCode) {
  return useQuery({
    queryKey: ['booking-orders', brCode],
    queryFn: () => apiGet('/api/booking-orders', { branch: brCode === 'ALL' ? '' : brCode }),
  });
}

// Group bookings for the "… wise" views. 'none' = bill-wise (flat).
function groupBookings(rows, by) {
  if (by !== 'client' && by !== 'supplier' && by !== 'module') return [{ key: '__all', label: null, rows }];
  const keyOf = (b) => (by === 'client' ? (b.customer?.name || '—') : by === 'supplier' ? (b.supplier?.name || '—') : (b.module || '—'));
  const labelOf = (b) => (by === 'module' ? ((VSPECS[b.module] && VSPECS[b.module].name) || b.module || '—') : keyOf(b));
  const map = new Map();
  for (const b of rows) { const k = keyOf(b); if (!map.has(k)) map.set(k, { key: k, label: labelOf(b), rows: [] }); map.get(k).rows.push(b); }
  return [...map.values()].sort((a, b) => String(a.label).localeCompare(String(b.label)));
}
const sumT = (rows, path) => rows.reduce((s, b) => s + ((b[path] && b[path].total) || 0), 0);
const gpPctOf = (gp, sale) => (sale ? (gp / sale) * 100 : 0);
const gpPctTxt = (gp, sale) => `${gpPctOf(gp, sale).toFixed(1)}%`;

function BookingTable({ rows, isLoading, cur, open, setOpen, mode, groupBy = 'none', onApprove, onCancel, onDelete, canDelete, onEdit, onInvoice, busyId, sel, onToggleSel }) {
  const cols = mode === 'approved'
    ? ['', 'Booking No', 'Link No', 'Module', 'Sale Inv', 'Purchase Inv', 'Sale', 'Purchase', 'GP', 'GP %', 'Approved', 'Actions']
    : mode === 'rejected'
      ? ['', 'Booking No', 'Link No', 'Module', 'Customer', 'Supplier', 'Sale', 'Purchase', 'GP', 'GP %', 'Date', 'Reason']
      : mode === 'deleted'
        ? ['', 'Booking No', 'Link No', 'Module', 'Sale Inv', 'Purchase Inv', 'Sale', 'Purchase', 'GP', 'GP %', 'Deleted', 'By']
        : ['', 'Booking No', 'Link No', 'Module', 'Customer', 'Supplier', 'Sale', 'Purchase', 'GP', 'GP %', 'Date', 'Actions'];
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: '#f3f4f8' }}>
          {cols.map((h, i) => <th key={i} style={{ padding: '9px 12px', fontSize: 10, fontWeight: 700, color: '#5a6691', textTransform: 'uppercase', textAlign: i >= 6 && i <= 9 ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {isLoading && <tr><td colSpan={cols.length} style={{ padding: 20, textAlign: 'center', color: '#8b94b3', fontSize: 12 }}>Loading…</td></tr>}
          {!isLoading && rows.length === 0 && <tr><td colSpan={cols.length} style={{ padding: 22, textAlign: 'center', color: '#8b94b3', fontSize: 12 }}>{mode === 'pending' ? 'No pending vouchers. Create one under “SO/PO/GP Voucher”.' : mode === 'rejected' ? 'No rejected vouchers.' : mode === 'deleted' ? 'No deleted vouchers.' : 'No approved vouchers yet.'}</td></tr>}
          {groupBookings(rows, groupBy).map((g) => (
            <React.Fragment key={g.key}>
              {g.label != null && (
                <tr style={{ background: '#eef1f8' }}>
                  <td colSpan={6} style={{ padding: '7px 12px', fontWeight: 700, fontSize: 11.5, color: DARK }}>{g.label} <span style={{ color: '#8b94b3', fontWeight: 600 }}>· {g.rows.length} bill{g.rows.length === 1 ? '' : 's'}</span></td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{fmt(sumT(g.rows, 'so'))}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{fmt(sumT(g.rows, 'po'))}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: DR, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{fmt(sumT(g.rows, 'gp'))}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: DR, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{gpPctTxt(sumT(g.rows, 'gp'), sumT(g.rows, 'so'))}</td>
                  <td colSpan={2}></td>
                </tr>
              )}
              {g.rows.map((b) => {
            const sp = VSPECS[b.module];
            const isOpen = open === b.id;
            return (
              <React.Fragment key={b.id}>
                <tr onClick={() => setOpen(isOpen ? null : b.id)} style={{ borderBottom: '1px solid #f0f2f7', cursor: 'pointer', background: isOpen ? '#faf7ef' : '#fff' }}>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{mode === 'pending' && onToggleSel && <input type="checkbox" checked={!!(sel && sel.has(b.id))} onChange={() => onToggleSel(b.id)} onClick={(e) => e.stopPropagation()} style={{ marginRight: 6, verticalAlign: 'middle', cursor: 'pointer' }} />}{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, fontSize: 11.5 }}>{b.bookingNo}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: BLUE, fontSize: 11.5 }}>{b.linkNo}</td>
                  <td style={{ padding: '8px 12px', fontSize: 12 }}>{sp ? sp.icon + ' ' + sp.name : b.module}</td>
                  {mode === 'approved' || mode === 'deleted' ? (
                    <>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>{b.saleVno || '—'}</td>
                      <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11 }}>{b.purchaseVno || '—'}</td>
                    </>
                  ) : (
                    <>
                      <td style={{ padding: '8px 12px', fontSize: 12 }}>{b.customer?.name || '—'}</td>
                      <td style={{ padding: '8px 12px', fontSize: 12 }}>{b.supplier?.name || '—'}</td>
                    </>
                  )}
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{fmt(b.so?.total)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{fmt(b.po?.total)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: DR, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{fmt(b.gp?.total)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: DR, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{gpPctTxt(b.gp?.total || 0, b.so?.total || 0)}</td>
                  <td style={{ padding: '8px 12px', fontSize: 11, color: '#5a6691' }}>{mode === 'approved' ? (b.approvedAt ? String(b.approvedAt).slice(0, 10) : '—') : mode === 'deleted' ? (b.deletedAt ? String(b.deletedAt).slice(0, 10) : '—') : b.date}</td>
                  <td style={{ padding: '8px 12px' }} onClick={(e) => e.stopPropagation()}>
                    {mode === 'pending' ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button disabled={busyId === b.id} onClick={() => onEdit(b)} style={{ ...btnGh, padding: '4px 9px', fontSize: 10.5, color: BLUE, borderColor: '#bcd4ee' }}><Pencil size={12} /> Edit</button>
                        <button disabled={busyId === b.id} onClick={() => onApprove(b)} style={{ ...btnG, padding: '4px 10px', fontSize: 10.5, background: DR }}>
                          {busyId === b.id ? <RefreshCw size={12} className="spin" /> : <CheckCircle2 size={12} />} Approve
                        </button>
                        <button disabled={busyId === b.id} onClick={() => onCancel(b)} style={{ ...btnGh, padding: '4px 9px', fontSize: 10.5, color: '#A32D2D', borderColor: '#F7C1C1' }}><XCircle size={12} /> Reject</button>
                      </div>
                    ) : mode === 'approved' ? (
                      canDelete
                        ? <button disabled={busyId === b.id} onClick={() => onDelete(b)} style={{ ...btnGh, padding: '4px 9px', fontSize: 10.5, color: '#A32D2D', borderColor: '#F7C1C1' }}><Trash2 size={12} /> Delete</button>
                        : <span style={{ fontSize: 10.5, color: '#b0b7cc' }}>admin only</span>
                    ) : mode === 'deleted' ? (
                      <span style={{ fontSize: 11, color: '#8b94b3' }} title={b.deletedReason || ''}>{b.deletedBy || '—'}{b.deletedReason ? ` · ${b.deletedReason}` : ''}</span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#8b94b3' }}>{b.rejectedReason || '—'}</span>
                    )}
                  </td>
                </tr>
                {isOpen && (
                  <tr><td colSpan={cols.length} style={{ padding: '12px 16px', background: '#faf9f5', borderBottom: '1px solid #eee3cf' }}>
                    {onInvoice && (b.status === 'approved' || b.status === 'posted') && (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        <button onClick={() => onInvoice(b, 'sale')} style={{ ...btnGh, padding: '4px 10px', fontSize: 10.5, color: BLUE, borderColor: '#bcd4ee' }}>🧾 Sales Invoice</button>
                        {!b.noSupplier && <button onClick={() => onInvoice(b, 'purchase')} style={{ ...btnGh, padding: '4px 10px', fontSize: 10.5 }}>📄 Purchase Invoice</button>}
                      </div>
                    )}
                    <JournalView id={b.id} cur={cur} />
                  </td></tr>
                )}
              </React.Fragment>
            );
          })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Bill-wise / Client-wise / Supplier-wise / Module-wise grouping toggle.
function GroupByBar({ value, onChange }) {
  const OPTS = [['none', 'Bill wise'], ['client', 'Client wise'], ['supplier', 'Supplier wise'], ['module', 'Module wise']];
  return (
    <div style={{ display: 'inline-flex', border: '1px solid #d8dcec', borderRadius: 7, overflow: 'hidden', marginBottom: 12 }}>
      {OPTS.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)}
          style={{ padding: '6px 12px', fontSize: 11.5, fontWeight: 600, border: 'none', cursor: 'pointer', background: value === v ? BLUE : '#fff', color: value === v ? '#fff' : '#5a6691' }}>{l}</button>
      ))}
    </div>
  );
}

export function PendingBookings({ branch, setRoute }) {
  const brCode = brCodeOf(branch) || 'ALL';
  const cur = bc(branch).cur;
  const qc = useQueryClient();
  const { data = [], isLoading } = useBookings(brCode);
  const [open, setOpen] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(null);
  const [groupBy, setGroupBy] = useState('none');
  const [sel, setSel] = useState(() => new Set());

  const rows = data.filter((b) => b.status === 'pending');
  const allIds = rows.map((b) => b.id);
  const toggleSel = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAllSel = () => setSel((s) => (s.size === allIds.length ? new Set() : new Set(allIds)));

  // Editing a pending voucher reuses the full SO/PO/GP entry form (PUT on save).
  if (editing) {
    return <SoPoGpVoucherEntry branch={branch} setRoute={setRoute} editBooking={editing}
      onDone={() => { setEditing(null); setOpen(null); qc.invalidateQueries({ queryKey: ['booking-orders'] }); }} />;
  }

  const onApprove = async (b) => {
    setBusyId(b.id); setMsg('');
    try {
      const res = await apiPost('/api/booking-orders/' + b.id + '/approve');
      setMsg(res.noSupplier
        ? `✓ Approved ${b.bookingNo}. Posted Sales ${res.saleVno} (no purchase leg) under Link ${res.linkNo}.`
        : `✓ Approved ${b.bookingNo}. Posted Sales ${res.saleVno} + Purchase ${res.purchaseVno} under Link ${res.linkNo}.`);
      qc.invalidateQueries({ queryKey: ['booking-orders'] });
    } catch (e) { setMsg('⚠ ' + (e.message || 'Approve failed')); }
    finally { setBusyId(null); }
  };
  const onCancel = async (b) => {
    const reason = window.prompt(`Reject voucher ${b.bookingNo}? It will be marked Rejected (no books impact). Optional reason:`, '');
    if (reason === null) return; // user dismissed the prompt
    setBusyId(b.id);
    try { await apiPost('/api/booking-orders/' + b.id + '/reject', { reason }); qc.invalidateQueries({ queryKey: ['booking-orders'] }); setOpen(null); setMsg(`✓ Rejected ${b.bookingNo}.`); }
    catch (e) { setMsg('⚠ ' + (e.message || 'Reject failed')); }
    finally { setBusyId(null); }
  };
  const onApproveSelected = async () => {
    if (!sel.size || !window.confirm(`Approve ${sel.size} selected voucher(s)? Each posts its linked Sales + Purchase.`)) return;
    setBusyId('bulk'); setMsg('');
    try {
      const res = await apiPost('/api/booking-orders/approve-many', { ids: [...sel] });
      setMsg(`✓ Approved ${res.approved} of ${res.total}${res.failed ? ` · ${res.failed} failed` : ''}.`);
      setSel(new Set()); qc.invalidateQueries({ queryKey: ['booking-orders'] });
    } catch (e) { setMsg('⚠ ' + (e.message || 'Bulk approve failed')); }
    finally { setBusyId(null); }
  };

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={18} style={{ color: GOLD }} /> Pending Approval</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5a6691' }}>These have <b>no books impact</b> yet. Expand a row to review the full JV, then <b>Approve &amp; Post</b> to generate the linked Sales &amp; Purchase invoices.</p>
        </div>
        <button onClick={() => setRoute && setRoute('/bookings/new')} style={btnG}><Plus size={14} /> New voucher</button>
      </div>
      {msg && <div style={{ ...card, marginBottom: 12, fontSize: 12, color: msg.startsWith('⚠') ? '#A32D2D' : '#27500A', background: msg.startsWith('⚠') ? '#FCEBEB' : '#EAF3DE', border: '1px solid ' + (msg.startsWith('⚠') ? '#F7C1C1' : '#cde3b6') }}>{msg}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <PeriodBar branch={branch} compact defaultPreset="all" onChange={setRange} />
        <GroupByBar value={groupBy} onChange={setGroupBy} />
        {rows.length > 0 && (
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <button onClick={toggleAllSel} style={{ ...btnGh, padding: '5px 11px', fontSize: 11, color: BLUE, borderColor: '#bcd4ee' }}>{sel.size === allIds.length ? '☑ Clear' : `☐ Select all (${allIds.length})`}</button>
            {sel.size > 0 && <button disabled={busyId === 'bulk'} onClick={onApproveSelected} style={{ ...btnG, padding: '5px 13px', fontSize: 11.5, background: DR }}>{busyId === 'bulk' ? <RefreshCw size={12} className="spin" /> : <CheckCircle2 size={12} />} Approve selected ({sel.size})</button>}
          </span>
        )}
      </div>
      <BookingTable rows={rows} isLoading={isLoading} cur={cur} open={open} setOpen={setOpen} mode="pending" groupBy={groupBy} onApprove={onApprove} onCancel={onCancel} onEdit={setEditing} busyId={busyId} sel={sel} onToggleSel={toggleSel} />
    </div>
  );
}

const isAdminRole = (u) => ['Super Admin', 'Director'].includes(u?.role);

export function ApprovedBookings({ branch, setRoute, currentUser }) {
  const brCode = brCodeOf(branch) || 'ALL';
  const cur = bc(branch).cur;
  const qc = useQueryClient();
  const { data = [], isLoading } = useBookings(brCode);
  const [open, setOpen] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [groupBy, setGroupBy] = useState('none');
  const canDelete = isAdminRole(currentUser);

  const rows = data.filter((b) => b.status === 'approved' || b.status === 'posted');

  // Admin-only delete: reverses the posted Sales/Purchase out of the books (no
  // accounting effect) and keeps a view-only record under Deleted; the numbers are
  // never reused.
  const onDelete = async (b) => {
    if (!canDelete) return;
    const reason = window.prompt(`Delete approved booking ${b.bookingNo}?\n\nIts Sales (${b.saleVno}) & Purchase (${b.purchaseVno}) invoices will be reversed out of the books. The record stays view-only under Deleted and its numbers can never be reused.\n\nOptional reason:`, '');
    if (reason === null) return;
    setBusyId(b.id);
    try { await apiPost('/api/booking-orders/' + b.id + '/delete', { reason }); qc.invalidateQueries({ queryKey: ['booking-orders'] }); setOpen(null); }
    catch (e) { window.alert(e.message || 'Delete failed'); }
    finally { setBusyId(null); }
  };

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}><FileCheck2 size={18} style={{ color: DR }} /> Approved &amp; Posted</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5a6691' }}>Posted to the books as linked Sales + Purchase invoices. Expand to see the JV &amp; ledger posting. The <b>Link No</b> tracks invoice-wise GP everywhere.{canDelete ? ' Admins can Delete a booking — it reverses out of the books and is kept view-only under Deleted.' : ''}</p>
        </div>
        <button onClick={() => setRoute && setRoute('/bookings/pending')} style={btnGh}><Clock size={14} /> View pending</button>
      </div>
      <div><GroupByBar value={groupBy} onChange={setGroupBy} /></div>
      <BookingTable rows={rows} isLoading={isLoading} cur={cur} open={open} setOpen={setOpen} mode="approved" groupBy={groupBy} onDelete={onDelete} canDelete={canDelete} busyId={busyId} />
    </div>
  );
}

export function DeletedBookings({ branch, setRoute }) {
  const brCode = brCodeOf(branch) || 'ALL';
  const cur = bc(branch).cur;
  const { data = [], isLoading } = useBookings(brCode);
  const [open, setOpen] = useState(null);

  const rows = data.filter((b) => b.status === 'deleted');

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}><Trash2 size={18} style={{ color: '#A32D2D' }} /> Deleted</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5a6691' }}>Approved bookings an admin deleted. They were <b>reversed out of the books</b> (no accounting effect). This is a <b>view-only</b> audit trail — the Booking No, Link No and Sale/Purchase invoice numbers shown here are <b>permanently retired and can never be reused</b>.</p>
        </div>
        <button onClick={() => setRoute && setRoute('/bookings/approved')} style={btnGh}><FileCheck2 size={14} /> View approved</button>
      </div>
      <BookingTable rows={rows} isLoading={isLoading} cur={cur} open={open} setOpen={setOpen} mode="deleted" busyId={null} />
    </div>
  );
}

// Unified SO/PO/GP approval — Pending · Approved · Rejected · Deleted in one screen
// with internal tabs (mirrors Voucher Approvals). Reuses BookingTable + all actions.
export function BookingApprovals({ branch, setRoute, currentUser }) {
  const brCode = brCodeOf(branch) || 'ALL';
  const cur = bc(branch).cur;
  const qc = useQueryClient();
  const { data = [], isLoading } = useBookings(brCode);
  const custs = useQuery({ queryKey: ['customers'], queryFn: () => apiGet('/api/customers') }).data || [];
  const sups = useQuery({ queryKey: ['suppliers'], queryFn: () => apiGet('/api/suppliers') }).data || [];
  const partyBy = (arr) => { const m = {}; (arr || []).forEach((x) => { if (x && x.name) m[String(x.name).toLowerCase().trim()] = x; }); return m; };
  const custMap = partyBy(custs), supMap = partyBy(sups);
  const [status, setStatus] = useState('pending');
  const [open, setOpen] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(null);
  const [groupBy, setGroupBy] = useState('none');
  const [sel, setSel] = useState(() => new Set());
  const [range, setRange] = useState(() => periodRange('all', { branch })); // default All so Pending shows everything
  const canDelete = isAdminRole(currentUser);
  const inRange = (dt) => (!range.from || dt >= range.from) && (!range.to || dt <= range.to);

  const bucket = (b) => (b.status === 'posted' ? 'approved' : b.status);
  const counts = { pending: 0, approved: 0, rejected: 0, deleted: 0 };
  data.forEach((b) => { if (counts[bucket(b)] !== undefined && inRange(b.date || '')) counts[bucket(b)]++; });
  const rows = data.filter((b) => bucket(b) === status && inRange(b.date || ''));
  const allIds = rows.map((b) => b.id);
  const toggleSel = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAllSel = () => setSel((s) => (s.size === allIds.length ? new Set() : new Set(allIds)));
  React.useEffect(() => { setSel(new Set()); }, [status, brCode]);

  if (editing) {
    return <SoPoGpVoucherEntry branch={branch} setRoute={setRoute} editBooking={editing}
      onDone={() => { setEditing(null); setOpen(null); qc.invalidateQueries({ queryKey: ['booking-orders'] }); }} />;
  }

  const onApprove = async (b) => {
    setBusyId(b.id); setMsg('');
    try { const res = await apiPost('/api/booking-orders/' + b.id + '/approve'); setMsg(res.noSupplier ? `✓ Approved ${b.bookingNo}. Posted Sales ${res.saleVno} (no purchase leg).` : `✓ Approved ${b.bookingNo}. Posted Sales ${res.saleVno} + Purchase ${res.purchaseVno}.`); qc.invalidateQueries({ queryKey: ['booking-orders'] }); }
    catch (e) { setMsg('⚠ ' + (e.message || 'Approve failed')); } finally { setBusyId(null); }
  };
  const onCancel = async (b) => {
    const reason = window.prompt(`Reject voucher ${b.bookingNo}? Marked Rejected (no books impact). Optional reason:`, ''); if (reason === null) return;
    setBusyId(b.id);
    try { await apiPost('/api/booking-orders/' + b.id + '/reject', { reason }); qc.invalidateQueries({ queryKey: ['booking-orders'] }); setOpen(null); setMsg(`✓ Rejected ${b.bookingNo}.`); }
    catch (e) { setMsg('⚠ ' + (e.message || 'Reject failed')); } finally { setBusyId(null); }
  };
  const onDelete = async (b) => {
    if (!canDelete) return;
    const reason = window.prompt(`Delete approved booking ${b.bookingNo}?\nIts Sales (${b.saleVno}) & Purchase (${b.purchaseVno}) are reversed out of the books; kept view-only under Deleted, numbers never reused.\nReason:`, ''); if (reason === null) return;
    setBusyId(b.id);
    try { await apiPost('/api/booking-orders/' + b.id + '/delete', { reason }); qc.invalidateQueries({ queryKey: ['booking-orders'] }); setOpen(null); setMsg(`✓ Deleted ${b.bookingNo}.`); }
    catch (e) { setMsg('⚠ ' + (e.message || 'Delete failed')); } finally { setBusyId(null); }
  };
  const onApproveSelected = async () => {
    if (!sel.size || !window.confirm(`Approve ${sel.size} selected voucher(s)? Each posts its linked Sales + Purchase.`)) return;
    setBusyId('bulk'); setMsg('');
    try { const res = await apiPost('/api/booking-orders/approve-many', { ids: [...sel] }); setMsg(`✓ Approved ${res.approved} of ${res.total}${res.failed ? ` · ${res.failed} failed` : ''}.`); setSel(new Set()); qc.invalidateQueries({ queryKey: ['booking-orders'] }); }
    catch (e) { setMsg('⚠ ' + (e.message || 'Bulk approve failed')); } finally { setBusyId(null); }
  };

  const tab = (k, label) => (
    <button key={k} onClick={() => setStatus(k)} style={{ padding: '8px 16px', border: 'none', borderBottom: `3px solid ${status === k ? GOLD : 'transparent'}`, background: 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: status === k ? DARK : '#5a6691' }}>{label} <span style={{ fontSize: 11, color: '#8b94b3' }}>({counts[k]})</span></button>
  );

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: DARK }}>SO/PO/GP Approvals</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5a6691' }}>Pending have no books impact; approving posts the linked Sales + Purchase. Deleted are reversed out & view-only.</p>
        </div>
        <button onClick={() => setRoute && setRoute('/bookings/new')} style={btnG}><Plus size={14} /> New voucher</button>
      </div>
      <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #e1e3ec', flexWrap: 'wrap' }}>{tab('pending', 'Pending')}{tab('approved', 'Approved')}{tab('rejected', 'Rejected')}{tab('deleted', 'Deleted')}</div>
      </div>
      {msg && <div style={{ ...card, marginBottom: 12, fontSize: 12, padding: '8px 12px', color: msg.startsWith('⚠') ? '#A32D2D' : '#27500A', background: msg.startsWith('⚠') ? '#FCEBEB' : '#EAF3DE', border: '1px solid ' + (msg.startsWith('⚠') ? '#F7C1C1' : '#cde3b6') }}>{msg}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <GroupByBar value={groupBy} onChange={setGroupBy} />
        {status === 'pending' && rows.length > 0 && (
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <button onClick={toggleAllSel} style={{ ...btnGh, padding: '5px 11px', fontSize: 11, color: BLUE, borderColor: '#bcd4ee' }}>{sel.size === allIds.length ? '☑ Clear' : `☐ Select all (${allIds.length})`}</button>
            {sel.size > 0 && <button disabled={busyId === 'bulk'} onClick={onApproveSelected} style={{ ...btnG, padding: '5px 13px', fontSize: 11.5, background: DR }}>{busyId === 'bulk' ? <RefreshCw size={12} className="spin" /> : <CheckCircle2 size={12} />} Approve selected ({sel.size})</button>}
          </span>
        )}
      </div>
      <BookingTable rows={rows} isLoading={isLoading} cur={cur} open={open} setOpen={setOpen} mode={status} groupBy={groupBy} onApprove={onApprove} onCancel={onCancel} onEdit={setEditing} onDelete={onDelete} canDelete={canDelete} onInvoice={(b, side) => { const master = side === 'sale' ? custMap[String(b.customer?.name || '').toLowerCase().trim()] : supMap[String(b.supplier?.name || '').toLowerCase().trim()]; openPrintPreview({ title: `${side === 'sale' ? 'Sales Invoice' : 'Purchase Invoice'} · ${b.bookingNo}`, recommend: 'portrait', html: buildBookingInvoice(b, side, branch, master) }); }} busyId={busyId} sel={sel} onToggleSel={toggleSel} />
    </div>
  );
}

export function RejectedBookings({ branch, setRoute }) {
  const brCode = brCodeOf(branch) || 'ALL';
  const cur = bc(branch).cur;
  const { data = [], isLoading } = useBookings(brCode);
  const [open, setOpen] = useState(null);
  const [groupBy, setGroupBy] = useState('none');

  const rows = data.filter((b) => b.status === 'rejected');

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}><XCircle size={18} style={{ color: '#A32D2D' }} /> Rejected</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5a6691' }}>Declined SO/PO/GP vouchers. They <b>never touched the books</b> (no Sales/Purchase invoices posted). Expand a row to review what was entered.</p>
        </div>
        <button onClick={() => setRoute && setRoute('/bookings/pending')} style={btnGh}><Clock size={14} /> View pending</button>
      </div>
      <div><GroupByBar value={groupBy} onChange={setGroupBy} /></div>
      <BookingTable rows={rows} isLoading={isLoading} cur={cur} open={open} setOpen={setOpen} mode="rejected" groupBy={groupBy} busyId={null} />
    </div>
  );
}
