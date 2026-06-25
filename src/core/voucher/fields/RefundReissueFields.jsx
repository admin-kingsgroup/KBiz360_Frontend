import React, { useState } from 'react';
import { FL, inp } from '../../styles';
import { todayISO } from '../../dates';
import { SmartDateInput } from '../../ux/SmartDateInput';
import { VPlaceOfSupply } from '../../../modules/transactions';
import { LedgerPicker } from '../LedgerPicker';
import { apiGet } from '../../api';
import { useVoucherPreview } from '../../useAccounting';
import { money2, r2 } from '../ui';
import { refundPrefillFromBooking, refundPrefillFromLeg, poSnapForView, splitRefundJv } from './refundPrefill';
import { buildRefundReissueBody } from './refundBody';
import { JvBlock } from '../JvBlock';

const num = (v) => (Number(v) || 0);
const fmtN = (v) => num(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const lockedInp = { ...inp, background: '#f3f4f7', color: '#444b5e', cursor: 'not-allowed' };

// Read-only grid that renders EVERY column present across the snapshot lines —
// including ones whose amount is 0/blank — so the preparer sees the full SO/PO/GP
// voucher exactly as captured at booking time.
function SnapGrid({ title, snap, color }) {
  if (!snap || typeof snap !== 'object') return null;
  const lines = Array.isArray(snap.lines) ? snap.lines : [];
  const cols = [];
  for (const r of lines) for (const k of Object.keys(r || {})) if (!cols.includes(k)) cols.push(k);
  const scalars = Object.entries(snap).filter(([k, v]) => k !== 'lines' && (typeof v !== 'object' || v === null));
  const th = { padding: '4px 8px', textAlign: 'right', fontWeight: 700, color: '#5a6691', borderBottom: '1px solid #e6e8ec', whiteSpace: 'nowrap' };
  const td = { padding: '4px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid #f0f1f4' };
  const cell = (v) => (v === null || v === undefined ? '' : (typeof v === 'number' ? fmtN(v) : (typeof v === 'object' ? JSON.stringify(v) : String(v))));
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11.5, fontWeight: 800, color, marginBottom: 4 }}>{title}</div>
      {cols.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10.5 }}>
            <thead><tr>{cols.map((c) => <th key={c} style={{ ...th, textAlign: 'left' }}>{c}</th>)}</tr></thead>
            <tbody>
              {lines.map((r, i) => <tr key={i}>{cols.map((c) => <td key={c} style={{ ...td, textAlign: 'left' }}>{cell(r ? r[c] : '')}</td>)}</tr>)}
            </tbody>
          </table>
        </div>
      ) : <div style={{ fontSize: 10.5, color: '#9197a3' }}>(no line grid)</div>}
      {scalars.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px', marginTop: 5, fontSize: 10.5, color: '#5b616e' }}>
          {scalars.map(([k, v]) => <span key={k}>{k}: <b style={{ color: '#14161a' }}>{cell(v)}</b></span>)}
        </div>
      )}
    </div>
  );
}


/**
 * Refund (RF) / Reissue (RI) body — two-party, raised against a sales invoice.
 * `kind` ('refund' | 'reissue') flips the customer/supplier direction:
 *   refund  → supplier (airline) refunds us; we refund the balance to the customer.
 *   reissue → supplier charges a fee + fare difference; we bill the customer.
 * Our retained service charge + Service Charge - 2 (margin) post as income; any charge the
 * supplier levies on us posts as our own cost. The customer figure is derived so
 * the voucher always balances (see posting.builder refundLines/reissueLines).
 *
 * The preparer enters the original SO/PO/GP **Link No** (or the booking / Sales /
 * Purchase invoice number); we fetch that booking read-only, lock the Sales &
 * Purchase invoice fields to what it spawned, and show the full SO/PO/GP grid below
 * so the cancellation can be checked against the original booking before saving.
 */
export function RefundReissueFields({ state, setState, ctx, kind }) {
  const { branch, branchCode, cur } = ctx;
  const isRefund = kind === 'refund';
  const patch = (p) => setState((s) => ({ ...s, ...p }));

  const [linkInput, setLinkInput] = useState(state.againstInvoice || '');
  const [booking, setBooking] = useState(null);
  const [bookingJv, setBookingJv] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [fetchErr, setFetchErr] = useState('');
  // N-PO: which leg this refund targets. -1 = the primary leg (today's behaviour);
  // 0..n-1 = an additional purchase leg. One refund voucher per leg; for a full-folder
  // refund the preparer processes each leg in turn.
  const [legIdx, setLegIdx] = useState(-1);

  async function fetchLink() {
    const link = linkInput.trim();
    if (!link) return;
    setFetching(true); setFetchErr(''); setBooking(null); setBookingJv(null);
    try {
      const b = await apiGet('/api/booking-orders/by-link', { link, branch: branchCode || branch });
      setBooking(b);
      setLegIdx(-1); // default to the primary leg
      // Lock-fill the invoice refs + carry over the refundable amounts (supplier fare,
      // our Service Charge - 2 margin, commission reversal) — but NOT our service charge / its
      // GST nor the supplier service fee / its GST (those are retained, not refunded).
      patch(refundPrefillFromBooking(b, state));   // honours the Commission-Reversal toggle
      // Also pull the original booking's JV (Sale + Purchase posting legs) to show below.
      if (b?.id) { try { setBookingJv(await apiGet('/api/booking-orders/' + b.id + '/journal')); } catch { setBookingJv(null); } }
    } catch (e) {
      setFetchErr(e?.message || 'Lookup failed');
    } finally {
      setFetching(false);
    }
  }

  // Re-target the refund at a folder leg (-1 = primary). Re-prefills the supplier,
  // refundable amount, commission clawback + the locked againstPurchase from that leg;
  // the folder SALE (againstInvoice) and customer stay. One RF per leg.
  function selectLeg(idx) {
    if (!booking) return;
    setLegIdx(idx);
    const fresh = { commissionReversal: reverseCommission };
    patch(idx < 0 ? refundPrefillFromBooking(booking, fresh) : refundPrefillFromLeg(booking.purchases[idx], booking, fresh));
  }

  const supplierAmt = r2(+state.supplierAmt || 0);   // airline refund receivable (RF) / payable (RI)
  const svc = r2(+state.serviceCharge || 0);
  const markup = r2(+state.markup || 0);
  const ourIncome = r2(svc + markup);
  // GST split by component (mirrors buildRefundReissueBody): Service-Fee GST → regular
  // output GST; Service Charge-2 (SVC2) GST → the dedicated SVC2 GST ledgers.
  const gstFrac = (+state.gstPct || 0) / 100;
  const taxAmt = r2(svc * gstFrac);          // GST on the Service Fee
  const svc2Gst = r2(markup * gstFrac);      // GST on the SVC2 margin (otherTaxesGst)
  const supSvc = r2(+state.supplierSvc || 0);
  const supGst = r2(+state.supplierGst || 0);
  // Customer refund payable (RF) / amount billed (RI).
  const total = isRefund
    ? r2(supplierAmt + supSvc + supGst - ourIncome - taxAmt - svc2Gst)
    : r2(supplierAmt - supSvc - supGst + ourIncome + taxAmt + svc2Gst);

  // Live, backend-computed JV for THIS refund — same body & engine VoucherShell posts
  // with (deduped by React-Query on an identical key), shown right under the form.
  // Resolve a concrete branch CODE for the preview so the tax ledgers read "… [BOM]"
  // and never "… [undefined]" (the body's branch falls back through branchCode → the
  // branch prop's code → the raw branch string).
  const branchResolved = branchCode || (branch && (branch.code || branch)) || '';
  const refundPv = useVoucherPreview({ ...buildRefundReissueBody(state, ctx, kind), branch: branchResolved, sourceRef: state.sourceRef || '' }).data || {};

  // GST on the supplier's service fee + the airline cancellation fee auto-calculates
  // at the voucher's GST rate (the "GST on our charges" slab, 18% by default), so the
  // accountant doesn't key it by hand. Still editable — a manual override sticks until
  // the base or the slab changes again.
  const gstRate = num(state.gstPct) || 18;
  const gstOf = (base) => r2(num(base) * gstRate / 100);

  // Commission Reversal (refund only): the "clawback" IS the commission reversal.
  // When OFF, the original commission / its GST / TDS are NOT reversed on the refund —
  // the three fields lock to 0 so the posting engine skips them entirely.
  const reverseCommission = state.commissionReversal !== false;
  const setReverseCommission = (on) => {
    if (!on) { patch({ commissionReversal: false, incentiveAmt: '', incentiveGst: '', incentiveTds: '' }); return; }
    const po = booking?.po || {};                                   // re-apply the fetched booking's commission, if any
    patch({
      commissionReversal: true,
      incentiveAmt: po.incentiveAmt ? r2(num(po.incentiveAmt)) : state.incentiveAmt,
      incentiveGst: po.incentiveGst ? r2(num(po.incentiveGst)) : state.incentiveGst,
      incentiveTds: po.incentiveTds ? r2(num(po.incentiveTds)) : state.incentiveTds,
    });
  };

  return (
    <>
      {/* Link No → fetch the original SO/PO/GP booking (read-only) */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr auto', gap: 12, marginBottom: 14, alignItems: 'end' }}>
        <FL label="Link No  (or booking / Sales / Purchase invoice no)">
          <input
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fetchLink(); } }}
            style={inp}
            placeholder="LK/BOM/00524  ·  BKG/BOM/26/0357  ·  SF/BOM/26/0001"
          />
        </FL>
        <button type="button" onClick={fetchLink} disabled={fetching || !linkInput.trim()}
          style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #185FA5', background: fetching ? '#9bbbd8' : '#185FA5', color: '#fff', fontSize: 12, fontWeight: 700, cursor: fetching ? 'default' : 'pointer', height: 36 }}>
          {fetching ? 'Fetching…' : 'Fetch SO/PO/GP'}
        </button>
      </div>
      {fetchErr && <p style={{ margin: '-8px 0 12px', fontSize: 11, color: '#A32D2D', fontWeight: 600 }}>⚠ {fetchErr}</p>}

      {/* N-PO: this folder has extra purchase legs — pick which one this refund targets. */}
      {booking?.purchases?.length > 0 && (
        <div style={{ marginBottom: 14, padding: 11, background: '#FFFDF7', border: '1px solid #eee3cf', borderRadius: 8 }}>
          <FL label="Refund which cost leg?">
            <select value={legIdx} onChange={(e) => selectLeg(Number(e.target.value))} style={inp}>
              <option value={-1}>Primary — {booking.module} · {booking.supplier?.ledgerName || booking.supplier?.name || '—'} · {booking.purchaseVno}</option>
              {booking.purchases.map((leg, i) => (
                <option key={i} value={i}>{leg.module} · {leg.supplier?.ledgerName || leg.supplier?.name || '—'} · {leg.purchaseVno || '(pending)'} (₹{Number(leg.po?.total || 0).toLocaleString('en-IN')})</option>
              ))}
            </select>
          </FL>
          <p style={{ margin: '6px 0 0', fontSize: 10.5, color: '#9197a3' }}>
            This folder has {booking.purchases.length} additional purchase leg{booking.purchases.length > 1 ? 's' : ''} under one Link No. Refund <b>one leg</b> here (single / partial); for a <b>full</b> folder refund, process each leg as its own refund voucher.
          </p>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12, marginBottom: 14 }}>
        <FL label="Date"><SmartDateInput max={todayISO()} value={state.date || ''} onChange={(iso) => patch({ date: iso })} style={inp} /></FL>
        <FL label="Against sales invoice 🔒"><input value={state.againstInvoice || ''} readOnly tabIndex={-1} style={lockedInp} placeholder="— fetch by Link No —" title="Locked — set by Link No lookup" /></FL>
        <FL label="Related purchase invoice 🔒"><input value={state.againstPurchase || ''} readOnly tabIndex={-1} style={lockedInp} placeholder="— fetch by Link No —" title="Locked — set by Link No lookup" /></FL>
        <VPlaceOfSupply mode={state.gstMode} onChange={(m) => patch({ gstMode: m })} />
      </div>

      {/* Read-only SO/PO/GP voucher view — every column, incl. 0 amounts */}
      {booking && (
        <div style={{ border: '1px solid #dfe3ea', borderRadius: 10, padding: 14, marginBottom: 16, background: '#fbfcfe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: '#14161a' }}>SO/PO/GP voucher — {booking.bookingNo} <span style={{ color: '#9197a3', fontWeight: 600 }}>({booking.module} · {booking.status})</span></div>
            <button type="button" onClick={() => { setBooking(null); setBookingJv(null); }} style={{ border: 'none', background: 'none', color: '#9197a3', cursor: 'pointer', fontSize: 11 }}>hide ✕</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 16px', fontSize: 10.5, color: '#5b616e', marginBottom: 12 }}>
            <span>Link No: <b style={{ color: '#14161a' }}>{booking.linkNo || '—'}</b></span>
            <span>Date: <b style={{ color: '#14161a' }}>{booking.date || '—'}</b></span>
            <span>Sale inv: <b style={{ color: '#14161a' }}>{booking.saleVno || '—'}</b></span>
            <span>Purchase inv: <b style={{ color: '#14161a' }}>{booking.purchaseVno || '—'}</b></span>
            <span>Customer: <b style={{ color: '#14161a' }}>{booking.customer?.name || booking.customer?.ledgerName || '—'}</b></span>
            <span>Supplier: <b style={{ color: '#14161a' }}>{booking.supplier?.name || booking.supplier?.ledgerName || '—'}</b></span>
            {booking.saleTallyRef ? <span>Sale Ref: <b style={{ color: '#14161a' }}>{booking.saleTallyRef}</b></span> : null}
            {booking.purTallyRef ? <span>Pur Ref: <b style={{ color: '#14161a' }}>{booking.purTallyRef}</b></span> : null}
          </div>
          <SnapGrid title="SO — Sales / sell side" snap={booking.so} color="#185FA5" />
          <SnapGrid title="PO — Purchase / cost side (incl. Supplier Incentive)" snap={poSnapForView(booking.po, booking.rows)} color="#A32D2D" />
          <SnapGrid title="GP — Gross Profit" snap={booking.gp} color="#A07828" />
          {bookingJv && (bookingJv.sale || bookingJv.purchase) && (
            <div style={{ marginTop: 6, paddingTop: 10, borderTop: '1px dashed #dfe3ea' }}>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: '#14161a', marginBottom: 6 }}>JV — Accounting effect of this booking</div>
              <JvBlock title="Sales voucher" sub={bookingJv.sale?.vno} postings={bookingJv.sale?.postings} color="#185FA5" />
              <JvBlock title="Purchase voucher" sub={bookingJv.purchase?.vno} postings={bookingJv.purchase?.postings} color="#A32D2D" />
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
        {/* Customer + the Commission-Reversal (Yes/No) tick sitting right next to it */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 10, color: '#5a6691', fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase' }}>Customer (Debtor)</label>
            {isRefund && (
              <label title="Reverse the original commission/incentive (+ its GST & TDS) on this refund?"
                style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', userSelect: 'none', color: reverseCommission ? '#185FA5' : '#9197a3' }}>
                <input type="checkbox" checked={reverseCommission} onChange={(e) => setReverseCommission(e.target.checked)} />
                Commission Reversal: {reverseCommission ? 'Yes' : 'No'}
              </label>
            )}
          </div>
          <LedgerPicker branch={branch} value={state.party} onChange={(v) => patch({ party: v })} filter={(l) => l.type === 'Debtor'} placeholder="Select customer / debtor..." />
        </div>
        <FL label="Supplier / Airline (Creditor)">
          <LedgerPicker branch={branch} value={state.counterParty} onChange={(v) => patch({ counterParty: v })} filter={(l) => l.type === 'Creditor'} placeholder="Select airline / supplier..." />
        </FL>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 6 }}>
        <FL label={isRefund ? `Supplier refund (${cur})` : `Supplier fee + fare diff (${cur})`}>
          <input type="number" value={state.supplierAmt} onChange={(e) => patch({ supplierAmt: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right', fontWeight: 700 }} />
        </FL>
        <FL label={`Our Service Fee (${cur})`}><input type="number" value={state.serviceCharge} onChange={(e) => patch({ serviceCharge: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
        <FL label={`Our Service Charge - 2 (${cur})`}><input type="number" value={state.markup} onChange={(e) => patch({ markup: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 6 }}>
        <FL label={`SVF GST (${gstRate}%)`}><input value={money2(cur, taxAmt)} readOnly tabIndex={-1} title={`GST at ${gstRate}% on the Service Fee → regular ${state.gstMode === 'inter' ? 'IGST' : 'CGST/SGST'} Output`} style={{ ...lockedInp, textAlign: 'right' }} /></FL>
        <FL label={`SVC2 GST (${gstRate}%)`}><input value={money2(cur, svc2Gst)} readOnly tabIndex={-1} title={`GST at ${gstRate}% on the Service Charge-2 margin → dedicated SVC2 ${state.gstMode === 'inter' ? 'IGST' : 'CGST/SGST'} Output ledgers`} style={{ ...lockedInp, textAlign: 'right' }} /></FL>
        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 9, fontSize: 9.5, color: '#9197a3' }}>{state.gstMode === 'inter' ? 'IGST' : 'CGST + SGST'} · SVC2 posts to its own ledgers</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 6 }}>
        <FL label={`Supplier service charge (${cur}, our cost)`}><input type="number" value={state.supplierSvc} onChange={(e) => patch({ supplierSvc: e.target.value, supplierGst: gstOf(e.target.value) })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
        <FL label={`Supplier GST (${cur}, input credit · auto ${gstRate}%)`}><input type="number" value={state.supplierGst} onChange={(e) => patch({ supplierGst: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
        <div />
      </div>

      {isRefund && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 6 }}>
            <FL label={`Airline cancellation fee (${cur}, supplier kept)`}><input type="number" value={state.supplierCancel} onChange={(e) => patch({ supplierCancel: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
            <FL label="Recover cancellation from customer"><label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, height: 34 }}><input type="checkbox" checked={state.cancelRecover !== false} onChange={(e) => patch({ cancelRecover: e.target.checked })} /> charge it to the client (pass-through)</label></FL>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 6 }}>
            <FL label={`Commission clawback (${cur})`}><input type="number" value={reverseCommission ? state.incentiveAmt : 0} disabled={!reverseCommission} onChange={(e) => patch({ incentiveAmt: e.target.value })} placeholder="0.00" style={{ ...(reverseCommission ? inp : lockedInp), textAlign: 'right' }} /></FL>
            <FL label={`Commission GST (${cur})`}><input type="number" value={reverseCommission ? state.incentiveGst : 0} disabled={!reverseCommission} onChange={(e) => patch({ incentiveGst: e.target.value })} placeholder="0.00" style={{ ...(reverseCommission ? inp : lockedInp), textAlign: 'right' }} /></FL>
            <FL label={`TDS reversed (${cur})`}><input type="number" value={reverseCommission ? state.incentiveTds : 0} disabled={!reverseCommission} onChange={(e) => patch({ incentiveTds: e.target.value })} placeholder="0.00" style={{ ...(reverseCommission ? inp : lockedInp), textAlign: 'right' }} /></FL>
          </div>
          {!reverseCommission && <p style={{ margin: '0 0 8px', fontSize: 10.5, color: '#9197a3' }}>Commission Reversal is <b>No</b> — the original commission, its GST and TDS are <b>not</b> reversed on this refund.</p>}
        </>
      )}

      <p style={{ margin: '2px 0 12px', fontSize: 10.5, color: '#5a6691' }}>
        Our income <b>{money2(cur, ourIncome)}</b> · GST <b>{money2(cur, r2(taxAmt + svc2Gst))}</b> <span style={{ color: '#9197a3' }}>(SVF GST {money2(cur, taxAmt)} + SVC2 GST {money2(cur, svc2Gst)})</span> ·
        {isRefund ? ' Refund payable to customer ' : ' Billed to customer '}
        <b style={{ color: total < 0 ? '#A32D2D' : '#185FA5' }}>{money2(cur, total)}</b>
        {total < 0 && ' — our charges exceed the supplier amount'}
      </p>
      {isRefund && (
        <p style={{ margin: '-6px 0 12px', fontSize: 10.5, color: '#A07828' }}>
          The linked sale (and purchase, if referenced) is <b>reversed in full</b> on posting; the customer is refunded the original invoice less the cancellation charge above. The net refund is finalised from the original invoice when posted.
        </p>
      )}

      {/* Live JV for this refund — the actual double-entry that will post, split into
          the sale-reversal and purchase-reversal sides (each a Dr/Cr T-block) and
          recomputed as you type, right under the amounts. */}
      {(() => {
        const sides = splitRefundJv(refundPv.postings, { party: state.party, counterParty: state.counterParty });
        return (
          <div style={{ border: '1px solid #cdd6e6', borderRadius: 10, padding: 12, margin: '4px 0 14px', background: '#f7f9fc' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#14161a' }}>Live JV — this {kind} (where it hits the books)</div>
              <span style={{ fontSize: 11, fontWeight: 800, color: refundPv.error ? '#A32D2D' : refundPv.balanced ? '#16a34a' : '#A32D2D' }}>
                {refundPv.error ? '⚠ ' + refundPv.error : refundPv.balanced ? '✓ Balanced' : (refundPv.postings || []).length ? `✗ Out by ${money2(cur, refundPv.diff)}` : ''}
              </span>
            </div>
            {(refundPv.postings || []).length ? (
              <>
                <JvBlock title={`${isRefund ? 'Refund' : 'Reissue'} — Sales side`} sub={state.againstInvoice ? `reverses ${state.againstInvoice}` : ''} postings={sides.sale} color="#185FA5" />
                <JvBlock title={`${isRefund ? 'Refund' : 'Reissue'} — Purchase side`} sub={state.againstPurchase ? `reverses ${state.againstPurchase}` : ''} postings={sides.purchase} color="#A32D2D" />
              </>
            ) : <div style={{ padding: 12, textAlign: 'center', color: '#9197a3', fontSize: 11 }}>Fill the refund (and fetch the Link No) to see the journal effect.</div>}
          </div>
        );
      })()}

      <FL label="Narration"><textarea value={state.remarks || ''} onChange={(e) => patch({ remarks: e.target.value })} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder={`Being ${kind}${state.againstInvoice ? ` against ${state.againstInvoice}` : ''}`} /></FL>
    </>
  );
}
