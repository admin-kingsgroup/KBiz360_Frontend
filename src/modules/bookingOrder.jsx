// ─── SO / PO / GP Booking ─────────────────────────────────────────────────────
// One combined screen (mirrors the CRM Confirm-Booking modal): fill the Purchase
// (cost) grid + a markup %, the Sales side auto-derives, Gross Profit shows live.
// On Save the backend mints a Link No and spawns a LOCKED Sales voucher + Purchase
// voucher joined by that Link No — both non-editable except through this booking.
import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Save, ArrowRight, Check, Lock, RefreshCw } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { inp, card, btnG, btnGh, FL, bc } from '../core/styles.jsx';
import { apiGet, apiPost, apiDelete } from '../core/api';
import {
  BOOKING_SPECS, BOOKING_MODULE_LIST, seedRows, blankRow,
  computeTotals, deriveSales, grossProfit,
} from '../core/bookingSpecs.js';

const brCodeOf = (branch) => (branch === 'ALL' ? null : (branch?.code || 'BOM'));
const today = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => Number(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ── Editable grid driven by a module's column spec ─────────────────────────── */
function Grid({ spec, rows, onChange, readOnly = false }) {
  const moneyKeys = spec.columns.filter((c) => c.money).map((c) => c.key);
  const upd = (i, k, v) => onChange(rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const add = () => onChange([...rows, blankRow(spec.columns)]);
  const rm = (i) => onChange(rows.filter((_, idx) => idx !== i));
  const lineTotalOf = (r) => moneyKeys.reduce((a, k) => a + (Number(r[k]) || 0), 0);
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
        <thead><tr style={{ background: '#f3f4f8' }}>
          <th style={th}>#</th>
          {spec.columns.map((c) => <th key={c.key} style={{ ...th, textAlign: c.money || c.type === 'number' ? 'right' : 'left' }}>{c.label}</th>)}
          <th style={{ ...th, textAlign: 'right' }}>Line ₹</th>
          {!readOnly && <th style={th}></th>}
        </tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #e1e3ec' }}>
              <td style={{ ...td, color: '#5a6691' }}>{i + 1}</td>
              {spec.columns.map((c) => (
                <td key={c.key} style={{ padding: 3 }}>
                  {readOnly
                    ? <div style={{ ...inp, background: '#f7f8fb', textAlign: c.money || c.type === 'number' ? 'right' : 'left', minHeight: 28 }}>{String(r[c.key] ?? '') || '—'}</div>
                    : c.type === 'select'
                      ? <select value={r[c.key]} onChange={(e) => upd(i, c.key, e.target.value)} style={{ ...inp, minHeight: 28 }}>{c.options.map((o) => <option key={o}>{o}</option>)}</select>
                      : <input type={c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : 'text'} value={r[c.key]}
                          onChange={(e) => upd(i, c.key, c.type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)}
                          style={{ ...inp, minHeight: 28, textAlign: c.money || c.type === 'number' ? 'right' : 'left' }} />}
                </td>
              ))}
              <td style={{ ...td, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(lineTotalOf(r))}</td>
              {!readOnly && (
                <td style={{ ...td, textAlign: 'center' }}>
                  <button onClick={() => rm(i)} disabled={rows.length <= 1} title="Remove row"
                    style={{ background: 'transparent', border: 'none', cursor: rows.length <= 1 ? 'not-allowed' : 'pointer', color: '#8b94b3', opacity: rows.length <= 1 ? 0.4 : 1 }}>
                    <Trash2 size={13} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly && (
        <button onClick={add} style={{ ...btnGh, marginTop: 8, padding: '5px 11px', fontSize: 11 }}><Plus size={12} /> Add row</button>
      )}
    </div>
  );
}
const th = { padding: '7px 8px', textAlign: 'left', fontSize: 10, color: '#5a6691', fontWeight: 600, whiteSpace: 'nowrap' };
const td = { padding: '4px 8px', fontSize: 11.5 };

/* ── Totals strip ───────────────────────────────────────────────────────────── */
function Totals({ t, cur, label, accent }) {
  const row = (l, v, strong) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, padding: '2px 0', fontWeight: strong ? 700 : 400, color: strong ? '#0d1326' : '#5a6691' }}>
      <span>{l}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{cur + ' ' + fmt(v)}</span>
    </div>
  );
  return (
    <div style={{ ...card, padding: '10px 13px', background: '#fff' }}>
      <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</p>
      {row('Line total', t.lineTotal)}
      {t.serviceCharge > 0 && row('Service charge / margin', t.serviceCharge)}
      {t.gst > 0 && row('GST', t.gst)}
      {t.tcs > 0 && row('TCS', t.tcs)}
      <div style={{ borderTop: '1px solid #e1e3ec', marginTop: 4, paddingTop: 4 }}>{row('Total', t.total, true)}</div>
    </div>
  );
}

/* ── SO / PO / GP entry screen ──────────────────────────────────────────────── */
export function BookingOrderEntry({ branch, setRoute }) {
  const qc = useQueryClient();
  const brCode = brCodeOf(branch);
  const cur = bc(branch).cur;

  const [moduleCode, setModuleCode] = useState('SHT');
  const spec = BOOKING_SPECS[moduleCode];

  const [customer, setCustomer] = useState({ name: '', gstin: '', group: '' });
  const [supplier, setSupplier] = useState({ name: '', gstin: '', ledgerName: '', ledgerGroup: '' });
  const [poLines, setPoLines] = useState(() => seedRows(BOOKING_SPECS.SHT));
  const [markupPct, setMarkupPct] = useState(15);
  const [packageType, setPackageType] = useState('International');
  const [gstMode, setGstMode] = useState('intra');
  const [date, setDate] = useState(today());
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Reset the purchase grid whenever the module changes.
  useEffect(() => { setPoLines(seedRows(BOOKING_SPECS[moduleCode])); setResult(null); setError(''); }, [moduleCode]);

  const poTotals = useMemo(() => computeTotals(spec, poLines, { serviceCharge: 0, packageType }), [spec, poLines, packageType]);
  const sales = useMemo(() => deriveSales(spec, poLines, markupPct, { packageType }), [spec, poLines, markupPct, packageType]);
  const gp = useMemo(() => grossProfit(poTotals, sales.totals), [poTotals, sales]);

  const canSave = !!brCode && !saving && poTotals.total > 0 && sales.totals.total > 0 && supplier.name.trim() && customer.name.trim();

  const save = async () => {
    setError(''); setSaving(true);
    try {
      const payload = {
        module: moduleCode, branch: brCode, date,
        customer, supplier,
        markupPct: Number(markupPct) || 0,
        packageType: spec.packageTypeField ? packageType : '',
        gstMode,
        po: { lines: poLines, serviceCharge: 0, lineTotal: poTotals.lineTotal, gst: poTotals.gst, tcs: poTotals.tcs, total: poTotals.total },
        so: { lines: sales.lines, serviceCharge: sales.serviceCharge, lineTotal: sales.totals.lineTotal, gst: sales.totals.gst, tcs: sales.totals.tcs, total: sales.totals.total },
        gp: { total: gp.total, pct: gp.pct },
        remarks,
      };
      const booking = await apiPost('/api/booking-orders', payload);
      setResult(booking);
      qc.invalidateQueries({ queryKey: ['booking-orders'] });
    } catch (e) { setError(e.message || 'Failed to save booking'); }
    finally { setSaving(false); }
  };

  if (result) {
    return (
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '24px 12px' }}>
        <div style={{ ...card, textAlign: 'center', padding: 28 }}>
          <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#EAF3DE', color: '#27500A', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}><Check size={28} /></div>
          <h2 style={{ margin: '0 0 4px', fontSize: 18, color: '#0d1326' }}>Booking posted</h2>
          <p style={{ margin: '0 0 18px', fontSize: 12.5, color: '#5a6691' }}>The Sales &amp; Purchase vouchers were created and linked. Both are locked to this booking.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, textAlign: 'left' }}>
            {[['Booking No', result.bookingNo], ['Link No', result.linkNo], ['Sales voucher', result.saleVno], ['Purchase voucher', result.purchaseVno], ['Gross Profit', cur + ' ' + fmt(result.gp?.total) + ` (${result.gp?.pct ?? 0}%)`], ['Cost centre', result.costCenter || '—']].map(([k, v]) => (
              <div key={k} style={{ background: '#f7f8fb', borderRadius: 8, padding: '8px 12px' }}>
                <p style={{ margin: 0, fontSize: 9.5, color: '#8b94b3', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k}</p>
                <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 700, color: '#0d1326', fontFamily: 'monospace' }}>{v}</p>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 9, justifyContent: 'center', marginTop: 20 }}>
            <button onClick={() => { setResult(null); setPoLines(seedRows(spec)); setCustomer({ name: '', gstin: '', group: '' }); setSupplier({ name: '', gstin: '', ledgerName: '', ledgerGroup: '' }); }} style={btnG}><Plus size={14} /> New booking</button>
            <button onClick={() => setRoute && setRoute('/bookings/list')} style={btnGh}>View all bookings <ArrowRight size={14} /></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '12px 10px 80px' }}>
      {/* Header */}
      <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 14 }}>
        <div style={{ padding: '12px 16px', background: '#0d1326', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
          <div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>SO / PO / GP Booking</p>
            <p style={{ margin: 0, fontSize: 10.5, color: '#8b94b3' }}>Enter cost + markup → auto-spawns linked Sales &amp; Purchase · {brCode || 'select a branch'}</p>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {BOOKING_MODULE_LIST.map((m) => (
              <button key={m.code} onClick={() => setModuleCode(m.code)}
                style={{ padding: '5px 11px', borderRadius: 999, border: '1px solid ' + (moduleCode === m.code ? '#d4a437' : '#2a3450'), background: moduleCode === m.code ? '#d4a437' : 'transparent', color: moduleCode === m.code ? '#0d1326' : '#8b94b3', fontSize: 10.5, fontWeight: 700, cursor: 'pointer' }}>
                {m.icon} {m.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {!brCode && (
        <div style={{ ...card, background: '#FCEBEB', border: '1px solid #F7C1C1', color: '#A32D2D', fontSize: 12, marginBottom: 14 }}>
          Select a specific branch (not “All branches”) from the top bar to create a booking.
        </div>
      )}

      {/* Booking header fields */}
      <div style={{ ...card, marginBottom: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 11 }}>
          <FL label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} /></FL>
          <FL label="Customer name"><input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Bill to…" style={inp} /></FL>
          <FL label="Customer GSTIN"><input value={customer.gstin} onChange={(e) => setCustomer({ ...customer, gstin: e.target.value.toUpperCase() })} style={{ ...inp, fontFamily: 'monospace' }} /></FL>
          <FL label="Supplier name"><input value={supplier.name} onChange={(e) => setSupplier({ ...supplier, name: e.target.value })} placeholder="Pay to…" style={inp} /></FL>
          <FL label="Supplier ledger group"><input value={supplier.ledgerGroup} onChange={(e) => setSupplier({ ...supplier, ledgerGroup: e.target.value })} placeholder="e.g. Supplier Air Lines" style={inp} /></FL>
          <FL label="GST mode"><select value={gstMode} onChange={(e) => setGstMode(e.target.value)} style={inp}><option value="intra">Intra-state (CGST+SGST)</option><option value="inter">Inter-state (IGST)</option></select></FL>
          {spec.packageTypeField && (
            <FL label="Package type"><select value={packageType} onChange={(e) => setPackageType(e.target.value)} style={inp}><option>Domestic</option><option>International</option></select></FL>
          )}
        </div>
      </div>

      {/* Purchase (cost) grid */}
      <div style={{ ...card, marginBottom: 14 }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#9B2C2C' }}>① Purchase Order — supplier cost ({spec.icon} {spec.name})</p>
        <Grid spec={spec} rows={poLines} onChange={setPoLines} />
      </div>

      {/* Markup */}
      <div style={{ ...card, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#0d1326' }}>② Markup</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="number" value={markupPct} onChange={(e) => setMarkupPct(e.target.value === '' ? '' : Number(e.target.value))} style={{ ...inp, width: 90, textAlign: 'right' }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#5a6691' }}>% on cost</span>
        </div>
        <span style={{ fontSize: 11.5, color: '#5a6691' }}>Margin = {cur} {fmt(sales.margin)} → the Sales side below is derived automatically.</span>
      </div>

      {/* Derived Sales (read-only) */}
      <div style={{ ...card, marginBottom: 14 }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: '#185FA5' }}>③ Sales Order — auto-derived (cost + markup)</p>
        <Grid spec={spec} rows={sales.lines} onChange={() => {}} readOnly />
      </div>

      {/* Totals + GP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12, marginBottom: 14 }}>
        <Totals t={poTotals} cur={cur} label="Purchase (cost)" accent="#9B2C2C" />
        <Totals t={sales.totals} cur={cur} label="Sales" accent="#185FA5" />
        <div style={{ ...card, padding: '12px 14px', background: '#0d1326' }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, color: '#d4a437', textTransform: 'uppercase', letterSpacing: '0.5px' }}>④ Gross Profit</p>
          <p style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{cur} {fmt(gp.total)}</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8b94b3' }}>Margin {gp.pct}% · sale {cur} {fmt(gp.saleNet)} − cost {cur} {fmt(gp.costNet)} (ex-tax)</p>
        </div>
      </div>

      {error && <div style={{ ...card, background: '#FCEBEB', border: '1px solid #F7C1C1', color: '#A32D2D', fontSize: 12, marginBottom: 14 }}>{error}</div>}

      {/* Footer actions */}
      <div style={{ position: 'sticky', bottom: 0, background: '#f3f4f8', borderTop: '1px solid #e1e3ec', padding: '12px 0', display: 'flex', gap: 9, justifyContent: 'flex-end', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: '#5a6691', marginRight: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}><Lock size={12} /> Saving spawns a locked Sales + Purchase voucher linked by one Link No.</span>
        <FL label="Remarks"><input value={remarks} onChange={(e) => setRemarks(e.target.value)} style={{ ...inp, width: 220 }} placeholder="optional" /></FL>
        <button disabled={!canSave} onClick={save}
          style={{ ...btnG, background: canSave ? '#27500A' : '#9ca3af', cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.7 }}>
          {saving ? <RefreshCw size={14} className="spin" /> : <Save size={14} />} {saving ? 'Posting…' : 'Save & post booking'}
        </button>
      </div>
    </div>
  );
}

/* ── Bookings list + read-only detail ───────────────────────────────────────── */
export function BookingOrdersList({ branch, setRoute }) {
  const brCode = brCodeOf(branch) || 'ALL';
  const cur = bc(branch).cur;
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: ['booking-orders', brCode],
    queryFn: () => apiGet('/api/booking-orders', { branch: brCode === 'ALL' ? '' : brCode }),
  });
  const [open, setOpen] = useState(null);

  const cancel = async (id) => {
    if (!window.confirm('Cancel this booking? Its Sales & Purchase vouchers will be un-posted.')) return;
    try { await apiDelete('/api/booking-orders/' + id); qc.invalidateQueries({ queryKey: ['booking-orders'] }); setOpen(null); }
    catch (e) { window.alert(e.message || 'Cancel failed'); }
  };

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: '#0d1326' }}>SO / PO / GP Bookings</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5a6691' }}>Each booking drives one linked Sales + Purchase voucher</p>
        </div>
        <button onClick={() => setRoute && setRoute('/bookings/new')} style={btnG}><Plus size={14} /> New booking</button>
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: '#f3f4f8' }}>
            {['Booking No', 'Link No', 'Module', 'Customer', 'Supplier', 'Sale', 'Purchase', 'GP', 'Status', ''].map((h, i) => (
              <th key={i} style={{ ...th, padding: '9px 12px', textAlign: i >= 5 && i <= 7 ? 'right' : 'left' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {isLoading && <tr><td colSpan={10} style={{ padding: 20, textAlign: 'center', color: '#8b94b3', fontSize: 12 }}>Loading…</td></tr>}
            {!isLoading && data.length === 0 && <tr><td colSpan={10} style={{ padding: 22, textAlign: 'center', color: '#8b94b3', fontSize: 12 }}>No bookings yet. Create one with “New booking”.</td></tr>}
            {data.map((b) => {
              const spec = BOOKING_SPECS[b.module];
              return (
                <tr key={b.id} onClick={() => setOpen(open === b.id ? null : b.id)} style={{ borderBottom: '1px solid #f0f2f7', cursor: 'pointer', background: open === b.id ? '#f7f8fb' : '#fff' }}>
                  <td style={{ ...td, padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700 }}>{b.bookingNo}</td>
                  <td style={{ ...td, padding: '8px 12px', fontFamily: 'monospace', color: '#185FA5' }}>{b.linkNo}</td>
                  <td style={{ ...td, padding: '8px 12px' }}>{spec ? spec.icon + ' ' + spec.name : b.module}</td>
                  <td style={{ ...td, padding: '8px 12px' }}>{b.customer?.name || '—'}</td>
                  <td style={{ ...td, padding: '8px 12px' }}>{b.supplier?.name || '—'}</td>
                  <td style={{ ...td, padding: '8px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(b.so?.total)}</td>
                  <td style={{ ...td, padding: '8px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(b.po?.total)}</td>
                  <td style={{ ...td, padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#27500A', fontVariantNumeric: 'tabular-nums' }}>{fmt(b.gp?.total)}</td>
                  <td style={{ ...td, padding: '8px 12px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: b.status === 'cancelled' ? '#FCEBEB' : '#EAF3DE', color: b.status === 'cancelled' ? '#A32D2D' : '#27500A' }}>{b.status}</span>
                  </td>
                  <td style={{ ...td, padding: '8px 12px', textAlign: 'right' }}>
                    {b.status !== 'cancelled' && <button onClick={(e) => { e.stopPropagation(); cancel(b.id); }} style={{ ...btnGh, padding: '3px 9px', fontSize: 10.5, color: '#A32D2D', borderColor: '#F7C1C1' }}>Cancel</button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Read-only detail of the selected booking */}
      {open && (() => {
        const b = data.find((x) => x.id === open); if (!b) return null;
        const spec = BOOKING_SPECS[b.module];
        return (
          <div style={{ ...card, marginTop: 14 }}>
            <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700 }}>{b.bookingNo} · {spec ? spec.name : b.module}</p>
            <p style={{ margin: '0 0 12px', fontSize: 11, color: '#5a6691' }}>Link {b.linkNo} · Sale {b.saleVno} · Purchase {b.purchaseVno} · Cost centre {b.costCenter || '—'}</p>
            {spec && b.po?.lines && (<><p style={{ margin: '8px 0 6px', fontSize: 11, fontWeight: 700, color: '#9B2C2C' }}>Purchase (cost)</p><Grid spec={spec} rows={b.po.lines} onChange={() => {}} readOnly /></>)}
            {spec && b.so?.lines && (<><p style={{ margin: '12px 0 6px', fontSize: 11, fontWeight: 700, color: '#185FA5' }}>Sales</p><Grid spec={spec} rows={b.so.lines} onChange={() => {}} readOnly /></>)}
            <p style={{ margin: '12px 0 0', fontSize: 13, fontWeight: 700, color: '#27500A' }}>Gross Profit: {cur} {fmt(b.gp?.total)} ({b.gp?.pct ?? 0}%)</p>
          </div>
        );
      })()}
    </div>
  );
}
