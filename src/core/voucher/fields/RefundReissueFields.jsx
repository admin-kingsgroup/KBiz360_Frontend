import React, { useState, useEffect } from 'react';
import { FL, inp, bc } from '../../styles';
import { isVatBranch, VSPECS, fareSum } from '../../voucherSpecs';
import { todayISO } from '../../dates';
import { SmartDateInput } from '../../ux/SmartDateInput';
import { VPlaceOfSupply } from '../../../modules/transactions';
import { LedgerPicker } from '../LedgerPicker';
import { apiGet } from '../../api';
import { useVoucherPreview } from '../../useAccounting';
import { money, money2, r2 } from '../ui';
import { localeOf, activeCurrency } from '../../format';
import { refundPrefillFromBooking, refundPrefillFromLeg, poSnapForView, splitRefundJv, clientNetFromJv, ticketSectors, sectorRefOf } from './refundPrefill';
import { buildRefundReissueBody } from './refundBody';
import { JvBlock } from '../JvBlock';

const num = (v) => (Number(v) || 0);
// Recognised Indian GST slabs — mirrors the backend's GST_SLABS (approvalChecks) so a
// refund can post at the correct rate (holiday 5%, most services 18%, exempt 0%) rather
// than a hardcoded 18%.
const GST_SLABS = [0, 5, 12, 18, 28];
// Branch-currency-aware grouping (Western for USD branches, Indian for ₹) — follows the
// active branch currency so a USD refund/reissue snapshot reads "485,000.00".
const fmtN = (v) => num(v).toLocaleString(localeOf(activeCurrency()), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const th = { padding: '4px 8px', textAlign: 'right', fontWeight: 700, color: '#5a6691', borderBottom: '1px solid #cdd1d8', whiteSpace: 'nowrap' };
  const td = { padding: '4px 8px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', borderBottom: '1px solid #dfe2e7' };
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

  // Branch tax regime — India (GST + slab list) vs the Africa VAT branches
  // (NBO/DAR/FBM). For a VAT branch we relabel GST→VAT / TDS→WHT, use the branch's
  // SINGLE VAT rate instead of the Indian slab list, and collapse the CGST/SGST/IGST
  // place-of-supply wording to one 'VAT' line. India stays byte-identical. Currency is
  // already branch-aware via ctx.cur / money2. Mirrors soPoGpVoucherEntry (taxLabel).
  const brCode = branchCode || (branch && (branch.code || branch)) || '';
  const isVatBr = isVatBranch(brCode);
  const VAT_FALLBACK = { NBO: 16, DAR: 18, FBM: 16 };
  const _brVatRaw = (bc({ code: brCode }) || {}).vatRate;   // honor an amended 0% (mirror PurchaseExpenseFields' != null)
  const vatPct = isVatBr ? (_brVatRaw != null ? num(_brVatRaw) : (VAT_FALLBACK[String(brCode).toUpperCase()] || 16)) : 0;
  const taxLabel = isVatBr ? 'VAT' : 'GST';
  const whtLabel = isVatBr ? 'WHT' : 'TDS';
  const rateSlabs = isVatBr ? [0, vatPct] : GST_SLABS;   // Africa: 0 (Without VAT, default) or the branch rate
  // Place-of-supply split is an Indian-GST concept; a VAT branch shows one 'VAT' line.
  const splitTax = isVatBr ? 'VAT' : (state.gstMode === 'inter' ? 'IGST' : 'CGST/SGST');
  const splitTaxPlus = isVatBr ? 'VAT' : (state.gstMode === 'inter' ? 'IGST' : 'CGST + SGST');

  // Seed the branch-appropriate default the FIRST time the rate is UNSET (a fresh manual refund
  // inits gstPct='' — see registry). VAT branches (incl DAR at 18%) open WITHOUT VAT (0) per the
  // Owner's rule (2026-07-21: no VAT until physically selected); India opens at 18. A real stored or
  // entered rate — INCLUDING a deliberate 0 or the branch rate like 16 — is never touched, so an EDIT
  // keeps its saved rate even after the branch VAT rate is amended, and the SO/PO/GP reversal (which
  // seeds a concrete 0/18 itself) is left alone. Keys on isVatBr/vatPct so it settles once branch loads.
  useEffect(() => {
    if (state.gstPct === '' || state.gstPct == null) patch({ gstPct: isVatBr ? 0 : 18 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVatBr, vatPct]);

  const [linkInput, setLinkInput] = useState(state.againstInvoice || '');
  const [booking, setBooking] = useState(null);
  const [bookingJv, setBookingJv] = useState(null);
  const [fetching, setFetching] = useState(false);
  const [fetchErr, setFetchErr] = useState('');
  // N-PO: which leg this refund targets. -1 = the primary leg (today's behaviour);
  // 0..n-1 = an additional purchase leg. One refund voucher per leg; for a full-folder
  // refund the preparer processes each leg in turn.
  const [legIdx, setLegIdx] = useState(-1);
  // Partial-by-ticket refund: which of the target PO's tickets (row indices) are in
  // this refund. null = ALL (a full refund — today's behaviour); a subset switches
  // the body onto the engine's partial path (fares-at-cost, rest of folder stands).
  const [pickedRows, setPickedRows] = useState(null);

  async function fetchLink() {
    const link = linkInput.trim();
    if (!link) return;
    setFetching(true); setFetchErr(''); setBooking(null); setBookingJv(null);
    try {
      const b = await apiGet('/api/booking-orders/by-link', { link, branch: branchCode || branch });
      setBooking(b);
      setLegIdx(-1); // default to the primary leg
      setPickedRows(null); // fresh fetch → full refund until tickets are unticked
      // Lock-fill the invoice refs + carry over the refundable amounts (supplier fare,
      // our Service Charge - 2 margin, commission reversal) — but NOT our service charge / its
      // GST nor the supplier service fee / its GST (those are retained, not refunded).
      patch({ ...refundPrefillFromBooking(b, state, isRefund), partialAmount: '' });   // honours the Commission-Reversal toggle; refund never retains SO SVC2
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
    setPickedRows(null); // re-target → back to a full refund of that PO
    const fresh = { commissionReversal: reverseCommission };
    patch({ ...(idx < 0 ? refundPrefillFromBooking(booking, fresh, isRefund) : refundPrefillFromLeg(booking.purchases[idx], booking, fresh)), partialAmount: '' });
  }

  // When opening an EXISTING refund/reissue (againstInvoice already set), auto-load the
  // linked SO/PO/GP booking for DISPLAY ONLY — so the read-only SO/PO/GP grid and the
  // "SO SVC2 — refunded to client" column populate without the preparer clicking
  // "Fetch SO/PO/GP". It deliberately does NOT prefill/clobber the saved form state
  // (supplierAmt, markup, party…) — that stays the manual button's job for fresh entries.
  useEffect(() => {
    const link = (state.againstInvoice || '').trim();
    if (!link || booking) return;
    let cancelled = false;
    (async () => {
      try {
        const b = await apiGet('/api/booking-orders/by-link', { link, branch: branchCode || branch });
        if (cancelled || !b) return;
        setBooking(b);
        setLinkInput((v) => v || link);
        if (b.id) { try { const jv = await apiGet('/api/booking-orders/' + b.id + '/journal'); if (!cancelled) setBookingJv(jv); } catch { /* no JV — ignore */ } }
      } catch { /* no booking behind this sale (pure import) — SO SVC2 stays blank */ }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.againstInvoice]);

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

  // Original SO SVC2 (Service Charge-2) the client was billed on the SALE + its GST —
  // refunded back to the client IN FULL on a cancellation (the sale reversal returns
  // it). Read-only, shown next to "Supplier refund". Source the NET SVC2 from the SO
  // `heads` (authoritative; the per-line `markup` is stored GST-inclusive), falling
  // back to (line markup − its GST). Its GST is the SO `otherTaxesGst`.
  const soSvc2Net = (() => {
    const heads = Array.isArray(booking?.so?.heads) ? booking.so.heads : [];
    const h = heads.find((x) => x && x.key === 'markup');
    if (h) return r2(num(h.amt));
    const ls = Array.isArray(booking?.so?.lines) ? booking.so.lines : [];
    return r2(ls.reduce((s, l) => s + (num(l && l.markup) - num(l && l.gstMk)), 0));
  })();
  const soSvc2Gst = r2(num(booking?.so?.otherTaxesGst));

  // Live, backend-computed JV for THIS refund — same body & engine VoucherShell posts
  // with (deduped by React-Query on an identical key), shown right under the form.
  // Resolve a concrete branch CODE for the preview so the tax ledgers read "… [BOM]"
  // and never "… [undefined]" (the body's branch falls back through branchCode → the
  // branch prop's code → the raw branch string).
  const branchResolved = branchCode || (branch && (branch.code || branch)) || '';
  const refundPv = useVoucherPreview({ ...buildRefundReissueBody(state, ctx, kind), branch: branchResolved, sourceRef: state.sourceRef || '' }).data || {};

  // The customer figure to SHOW must match what actually POSTS. The backend preview does
  // a FULL reversal of the linked sale (via originalsFor) and nets the airline cancellation
  // recovered from the client — so the true refund payable is the customer leg of the live
  // JV, NOT the local `total` (a net-settlement formula that predates the full-reversal
  // model and over-states the payable by the cancellation recovery). Fall back to `total`
  // only until the preview resolves (no postings yet / no party picked).
  const clientNet = clientNetFromJv(refundPv.postings, state.party, isRefund, total);

  // GST on the supplier's service fee + the airline cancellation fee auto-calculates
  // at the voucher's GST rate (the "GST on our charges" slab, 18% by default), so the
  // accountant doesn't key it by hand. Still editable — a manual override sticks until
  // the base or the slab changes again.
  // Respect an explicit 0% (Without VAT) — `|| fallback` used to coerce a real 0 back to the rate,
  // so the supplier-fee/cancellation GST kept computing under Without VAT. Fall back only when unset.
  const gstRate = (state.gstPct === '' || state.gstPct == null) ? (isVatBr ? vatPct : 18) : num(state.gstPct);
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
        <FL label="Link No  (or booking / Sales / Purchase / INB voucher no)">
          <input
            value={linkInput}
            onChange={(e) => setLinkInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); fetchLink(); } }}
            style={inp}
            placeholder="LK/BOM/00524  ·  BOM/0626/SF00495  ·  INB/BOM-AMD/26/0001"
          />
        </FL>
        <button type="button" onClick={fetchLink} disabled={fetching || !linkInput.trim()}
          style={{ padding: '9px 16px', borderRadius: 8, border: '1px solid #185FA5', background: fetching ? '#9bbbd8' : '#185FA5', color: '#fff', fontSize: 12, fontWeight: 700, cursor: fetching ? 'default' : 'pointer', height: 36 }}>
          {fetching ? 'Fetching…' : 'Fetch SO/PO/GP'}
        </button>
      </div>
      {fetchErr && <p style={{ margin: '-8px 0 12px', fontSize: 11, color: '#A32D2D', fontWeight: 600 }}>⚠ {fetchErr}</p>}

      {/* N-PO: this folder has extra purchase legs — pick which one this refund targets.
          Every PO carries its tickets' SECTORS, so the options say WHICH ticket/segments
          each PO is — the preparer picks by ticket, not by voucher number. */}
      {booking?.purchases?.length > 0 && (() => {
        const secSummary = (rows) => { const ss = ticketSectors(rows); return ss.length ? ` · ✈ ${ss.map((s) => s.sector).filter(Boolean).join(' + ')}` : ''; };
        return (
          <div style={{ marginBottom: 14, padding: 11, background: '#FFFDF7', border: '1px solid #eee3cf', borderRadius: 8 }}>
            <FL label={`${kind === 'refund' ? 'Refund' : 'Reissue'} which ticket / PO?`}>
              <select value={legIdx} onChange={(e) => selectLeg(Number(e.target.value))} style={inp}>
                <option value={-1}>PO #1 (primary) — {booking.module} · {booking.supplier?.ledgerName || booking.supplier?.name || '—'} · {booking.purchaseVno}{secSummary(booking.rows)}</option>
                {booking.purchases.map((leg, i) => (
                  <option key={i} value={i}>PO #{i + 2} — {leg.module} · {leg.supplier?.ledgerName || leg.supplier?.name || '—'} · {leg.purchaseVno || '(pending)'} ({money(cur, leg.po?.total || 0)}){secSummary(leg.rows)}</option>
                ))}
              </select>
            </FL>
            <p style={{ margin: '6px 0 0', fontSize: 10.5, color: '#9197a3' }}>
              This folder has {booking.purchases.length} additional purchase leg{booking.purchases.length > 1 ? 's' : ''} under one Link No. Refund <b>one leg</b> here (single / partial); for a <b>full</b> folder refund, process each leg as its own refund voucher.
            </p>
          </div>
        );
      })()}

      {/* The picked PO's segments — what this reversal actually reverses. Shown for
          single-PO folders too (the ticket being refunded should always be visible),
          and stamped onto the saved reversal (sectors/sectorRef via the prefill).
          On a multi-ticket PO a REFUND can untick tickets → PARTIAL refund: only the
          selected tickets' fares reverse at cost via the engine's partial path
          (partialAmount); the rest of the folder stands. Retained charges & the
          commission clawback don't apply on a partial, so those fields are cleared. */}
      {(() => {
        const targetRows = booking ? (legIdx < 0 ? (booking.rows || []) : ((booking.purchases?.[legIdx] || {}).rows || [])) : [];
        const targetSectors = ticketSectors(targetRows);
        if (!targetSectors.length) return null;
        const targetModule = legIdx < 0 ? booking.module : ((booking.purchases?.[legIdx] || {}).module || 'SF');
        const sp = VSPECS[targetModule] || VSPECS.SF;
        const rowIdxs = [...new Set(targetSectors.map((x) => x.rowIdx))];
        const multi = isRefund && rowIdxs.length > 1;
        const selected = pickedRows === null ? rowIdxs : pickedRows;
        const isSel = (ri) => selected.includes(ri);
        const toggleRow = (ri) => {
          const next = isSel(ri) ? selected.filter((i) => i !== ri) : [...selected, ri].sort((a, b) => a - b);
          if (!next.length) return;                             // at least one ticket stays in
          if (next.length === rowIdxs.length) { setPickedRows(null); selectLeg(legIdx); return; } // all back on → full prefill
          setPickedRows(next);
          const sel = targetRows.filter((_, i) => next.includes(i));
          const fares = r2(sel.reduce((s, r) => s + fareSum(sp, r), 0));
          const secs = targetSectors.filter((x) => next.includes(x.rowIdx));
          patch({
            supplierAmt: fares, partialAmount: fares,
            serviceCharge: '', markup: '', supplierSvc: '', supplierGst: '',
            supplierCancel: '', supplierCancelGst: '', incentiveAmt: '', incentiveGst: '', incentiveTds: '',
            sectors: secs, sectorRef: sectorRefOf(secs),
          });
        };
        const secTd = { padding: '5px 12px', fontSize: 11.5, borderBottom: '1px solid #eef1f5' };
        return (
          <div style={{ marginBottom: 14, padding: 11, background: '#F7FAFF', border: '1px solid #d8e0ea', borderRadius: 8 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.5px', color: '#185FA5', textTransform: 'uppercase', marginBottom: 6 }}>
              🎫 Segments this {kind} reverses — {legIdx < 0 ? 'PO #1 (primary)' : `Flight PO #${legIdx + 2}`}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ borderCollapse: 'collapse', minWidth: 560 }}>
                <thead><tr>{[...(multi ? ['Refund?'] : []), 'Passenger', 'Sector', 'Airline', 'Flight', 'Ticket No', 'PNR', 'Travel date'].map((h) => (
                  <th key={h} style={{ padding: '4px 12px', fontSize: 9.5, fontWeight: 800, letterSpacing: '.4px', color: '#5b616e', textTransform: 'uppercase', textAlign: 'left', borderBottom: '1px solid #d8e0ea' }}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {targetSectors.map((s, i) => {
                    const first = i === 0 || targetSectors[i - 1].rowIdx !== s.rowIdx;
                    const span = targetSectors.filter((x) => x.rowIdx === s.rowIdx).length;
                    const off = multi && !isSel(s.rowIdx);
                    return (
                      <tr key={i} style={off ? { opacity: 0.45 } : undefined}>
                        {multi && first && (
                          <td rowSpan={span} style={{ ...secTd, textAlign: 'center' }}>
                            <input type="checkbox" checked={!off} onChange={() => toggleRow(s.rowIdx)} title="Include this ticket in the refund" />
                          </td>
                        )}
                        <td style={{ ...secTd, fontWeight: 700 }}>{`${s.fn} ${s.sn}`.trim() || '—'}</td>
                        <td style={{ ...secTd, fontWeight: 700 }}>{s.sector || '—'}</td>
                        <td style={secTd}>{s.airline || '—'}</td>
                        <td style={secTd}>{s.flightNo || '—'}</td>
                        <td style={secTd}>{s.ticketNo || '—'}</td>
                        <td style={{ ...secTd, color: '#A07828', fontWeight: 700 }}>{s.pnr || '—'}</td>
                        <td style={secTd}>{s.travelDate || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {pickedRows !== null && (
              <p style={{ margin: '8px 0 0', fontSize: 11, fontWeight: 600, color: '#8a6d00' }}>
                ✂ Partial refund — only the selected tickets&apos; fares reverse, at cost ({money(cur, +state.partialAmount || 0)}), via the Sales&nbsp;Refunds / Purchase&nbsp;Refunds contra heads. The rest of the folder stands. Retained charges &amp; commission clawback don&apos;t apply on a partial, so those fields were cleared.
              </p>
            )}
          </div>
        );
      })()}

      {/* REISSUE ONLY — the NEW ticket the passenger now flies. The exchange posts
          the money (fee + fare difference); this records the itinerary that money
          bought: stamped onto the voucher (`newSectors`) and named in the default
          narration ("… BOM-DXB EK 501 → BOM-DXB EK 507 TKT …"). */}
      {!isRefund && (booking || (state.newSectors || []).length > 0) && (() => {
        const rows = Array.isArray(state.newSectors) ? state.newSectors : [];
        const setRow = (i, k, v) => patch({ newSectors: rows.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)) });
        const addRow = () => patch({ newSectors: [...rows, { sector: '', airline: '', flightNo: '', ticketNo: '', pnr: '', travelDate: '' }] });
        const delRow = (i) => patch({ newSectors: rows.filter((_, idx) => idx !== i) });
        const cell = { padding: '5px 7px', fontSize: 11.5, border: '1px solid #cdd1d8', borderRadius: 6 };
        return (
          <div style={{ marginBottom: 14, padding: 11, background: '#F6FFF7', border: '1px solid #cfe8d2', borderRadius: 8 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.5px', color: '#1a7a42', textTransform: 'uppercase', marginBottom: 6 }}>
              ✈ New ticket — segments after this reissue
            </div>
            {rows.length === 0 && <p style={{ margin: '0 0 8px', fontSize: 11, color: '#9197a3' }}>Record the replacement flight(s) — the folder then shows what the passenger actually flies, not just the money moved.</p>}
            {rows.map((r, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6, alignItems: 'center' }}>
                <input value={r.sector || ''} onChange={(e) => setRow(i, 'sector', e.target.value)} placeholder="Sector" style={{ ...cell, width: 110 }} />
                <input value={r.airline || ''} onChange={(e) => setRow(i, 'airline', e.target.value)} placeholder="Airline" style={{ ...cell, width: 110 }} />
                <input value={r.flightNo || ''} onChange={(e) => setRow(i, 'flightNo', e.target.value)} placeholder="Flight No" style={{ ...cell, width: 90 }} />
                <input value={r.ticketNo || ''} onChange={(e) => setRow(i, 'ticketNo', e.target.value)} placeholder="New Ticket No" style={{ ...cell, width: 130 }} />
                <input value={r.pnr || ''} onChange={(e) => setRow(i, 'pnr', e.target.value)} placeholder="PNR" style={{ ...cell, width: 90 }} />
                <input type="date" value={r.travelDate || ''} onChange={(e) => setRow(i, 'travelDate', e.target.value)} style={{ ...cell, width: 140 }} />
                <button type="button" onClick={() => delRow(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#c0392b', fontSize: 15 }} title="Remove segment">×</button>
              </div>
            ))}
            <button type="button" onClick={addRow} style={{ padding: '5px 12px', fontSize: 10.5, fontWeight: 700, color: '#1a7a42', background: '#e6f6e9', border: '1px solid #cfe8d2', borderRadius: 999, cursor: 'pointer' }}>+ Add segment</button>
          </div>
        );
      })()}

      {/* Double-refund override — the backend 409s a second refund against a PO that
          already has an active one; this is the explicit escape hatch for a genuine
          additional / partial refund. Refunds only (reissues may repeat freely). */}
      {isRefund && (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, margin: '0 0 14px', fontSize: 11.5, color: '#5b616e', cursor: 'pointer' }}>
          <input type="checkbox" checked={!!state.allowDuplicate} onChange={(e) => patch({ allowDuplicate: e.target.checked })} />
          Allow duplicate refund — this ticket already has a refund and this is a genuine additional / partial one
        </label>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 0.7fr', gap: 12, marginBottom: 14 }}>
        <FL label="Date"><SmartDateInput max={todayISO()} value={state.date || ''} onChange={(iso) => patch({ date: iso })} style={inp} /></FL>
        <FL label="Against sales invoice 🔒"><input value={state.againstInvoice || ''} readOnly tabIndex={-1} style={lockedInp} placeholder="fetch by Link No" title="Locked — set by Link No lookup" /></FL>
        <FL label="Related purchase invoice 🔒"><input value={state.againstPurchase || ''} readOnly tabIndex={-1} style={lockedInp} placeholder="fetch by Link No" title="Locked — set by Link No lookup" /></FL>
        {/* Place of Supply is an India-GST concept (intra = CGST+SGST, inter = IGST). An
            Africa (VAT) branch has a single VAT rate and no such split — hide it there, but
            keep the grid cell so the 5-column layout doesn't shift. Mirrors PXP. */}
        {!isVatBr ? <VPlaceOfSupply mode={state.gstMode} onChange={(m) => patch({ gstMode: m })} /> : <div />}
        {/* GST rate on OUR retained charges (Service Fee + SVC2) and the supplier fee /
            cancellation. Auto-seeded from the linked sale on fetch (a holiday sale at 5%
            refunds at 5%, not a blanket 18%); still editable to any valid GST slab. */}
        <FL label={`${taxLabel} rate`}>
          <select value={String(num(state.gstPct))} onChange={(e) => patch({ gstPct: +e.target.value })} style={inp} title={`${taxLabel} % applied to our Service Fee / SVC2 and the supplier fee & cancellation.${isVatBr ? '' : ' Defaults from the linked sale.'}`}>
            {rateSlabs.map((r) => <option key={r} value={r}>{r}%</option>)}
          </select>
        </FL>
      </div>

      {/* Read-only SO/PO/GP voucher view — every column, incl. 0 amounts */}
      {booking && (
        <div style={{ border: '1px solid #dfe2e7', borderRadius: 10, padding: 14, marginBottom: 16, background: '#fbfcfe' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 800, color: '#14161a' }}>{booking.isInterBranch ? 'Inter-branch (INB) deal' : 'SO/PO/GP voucher'} — {booking.bookingNo} <span style={{ color: '#9197a3', fontWeight: 600 }}>({booking.module || 'INB'} · {booking.status})</span></div>
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
              <label title={`Reverse the original commission/incentive (+ its ${taxLabel} & ${whtLabel}) on this refund?`}
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

      {isRefund ? (
        <>
          {/* Refunded back to the client from the SALE: the supplier-returned fare and
              the original SO SVC2 (+ its GST) — both go to the client on cancellation. */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 6 }}>
            <FL label={`Supplier refund (${cur})`}>
              <input type="number" value={state.supplierAmt} onChange={(e) => patch({ supplierAmt: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right', fontWeight: 700 }} />
            </FL>
            <FL label={`SO SVC2 — refunded to client (${cur})`}>
              <input value={money2(cur, soSvc2Net)} readOnly tabIndex={-1} title="The Service Charge-2 originally billed to the client on the sale. Refunded back in full on cancellation — the sale reversal returns it to the client (not retained by us)." style={{ ...lockedInp, textAlign: 'right' }} />
            </FL>
            <FL label={`SO SVC2 ${taxLabel} (${cur})`}>
              <input value={money2(cur, soSvc2Gst)} readOnly tabIndex={-1} title={`${taxLabel} on the original SO SVC2 — also refunded to the client with it.`} style={{ ...lockedInp, textAlign: 'right' }} />
            </FL>
          </div>
          {/* Charges WE levy on this refund (retained income) — separate from the SO SVC2 above. */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 10, marginBottom: 6 }}>
            <FL label={`Our Service Fee (${cur})`}><input type="number" value={state.serviceCharge} onChange={(e) => patch({ serviceCharge: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
            <FL label={`Our Service Charge - 2 (${cur})`}><input type="number" value={state.markup} onChange={(e) => patch({ markup: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
            <FL label={`Supplier ${taxLabel} (${cur}, input credit · auto ${gstRate}%)`}><input type="number" value={state.supplierGst} onChange={(e) => patch({ supplierGst: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
          </div>
        </>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 10, marginBottom: 6 }}>
          <FL label={`Supplier fee + fare diff (${cur})`}>
            <input type="number" value={state.supplierAmt} onChange={(e) => patch({ supplierAmt: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right', fontWeight: 700 }} />
          </FL>
          <FL label={`Our Service Fee (${cur})`}><input type="number" value={state.serviceCharge} onChange={(e) => patch({ serviceCharge: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
          <FL label={`Our Service Charge - 2 (${cur})`}><input type="number" value={state.markup} onChange={(e) => patch({ markup: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isRefund ? '1fr 1fr 1fr' : '1fr 1fr 1fr 1fr', gap: 12, marginTop: 10, marginBottom: 4 }}>
        <FL label={`SVF ${taxLabel} (${gstRate}%)`}><input value={money2(cur, taxAmt)} readOnly tabIndex={-1} title={`${taxLabel} at ${gstRate}% on the Service Fee → ${isVatBr ? 'VAT' : `regular ${splitTax}`} Output`} style={{ ...lockedInp, textAlign: 'right' }} /></FL>
        <FL label={`SVC2 ${taxLabel} (${gstRate}%)`}><input value={money2(cur, svc2Gst)} readOnly tabIndex={-1} title={`${taxLabel} at ${gstRate}% on the Service Charge-2 margin → dedicated SVC2 ${splitTax} Output ledgers`} style={{ ...lockedInp, textAlign: 'right' }} /></FL>
        <FL label={`Supplier service charge (${cur}, our cost)`}><input type="number" value={state.supplierSvc} onChange={(e) => patch({ supplierSvc: e.target.value, supplierGst: gstOf(e.target.value) })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
        {!isRefund && <FL label={`Supplier ${taxLabel} (${cur}, input credit · auto ${gstRate}%)`}><input type="number" value={state.supplierGst} onChange={(e) => patch({ supplierGst: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>}
      </div>
      <p style={{ margin: '0 0 6px', fontSize: 9.5, color: '#9197a3' }}>{splitTaxPlus} · SVC2 posts to its own ledgers</p>

      {isRefund && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 10, marginBottom: 6 }}>
            <FL label={`Airline cancellation fee (${cur}, supplier kept)`}><input type="number" value={state.supplierCancel} onChange={(e) => patch({ supplierCancel: e.target.value })} placeholder="0.00" style={{ ...inp, textAlign: 'right' }} /></FL>
            <FL label="Recover cancellation from customer"><label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, height: 34 }}><input type="checkbox" checked={state.cancelRecover !== false} onChange={(e) => patch({ cancelRecover: e.target.checked })} /> charge it to the client (pass-through)</label></FL>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 10, marginBottom: 6 }}>
            <FL label={`Commission clawback (${cur})`}><input type="number" value={reverseCommission ? state.incentiveAmt : 0} disabled={!reverseCommission} onChange={(e) => patch({ incentiveAmt: e.target.value })} placeholder="0.00" style={{ ...(reverseCommission ? inp : lockedInp), textAlign: 'right' }} /></FL>
            <FL label={`Commission ${taxLabel} (${cur})`}><input type="number" value={reverseCommission ? state.incentiveGst : 0} disabled={!reverseCommission} onChange={(e) => patch({ incentiveGst: e.target.value })} placeholder="0.00" style={{ ...(reverseCommission ? inp : lockedInp), textAlign: 'right' }} /></FL>
            <FL label={`${whtLabel} reversed (${cur})`}><input type="number" value={reverseCommission ? state.incentiveTds : 0} disabled={!reverseCommission} onChange={(e) => patch({ incentiveTds: e.target.value })} placeholder="0.00" style={{ ...(reverseCommission ? inp : lockedInp), textAlign: 'right' }} /></FL>
          </div>
          {!reverseCommission && <p style={{ margin: '0 0 8px', fontSize: 10.5, color: '#9197a3' }}>Commission Reversal is <b>No</b> — the original commission, its {taxLabel} and {whtLabel} are <b>not</b> reversed on this refund.</p>}
        </>
      )}

      <p style={{ margin: '2px 0 12px', fontSize: 10.5, color: '#5a6691' }}>
        Our income <b>{money2(cur, ourIncome)}</b> · {taxLabel} <b>{money2(cur, r2(taxAmt + svc2Gst))}</b> <span style={{ color: '#9197a3' }}>(SVF {taxLabel} {money2(cur, taxAmt)} + SVC2 {taxLabel} {money2(cur, svc2Gst)})</span> ·
        {isRefund ? ' Refund payable to customer ' : ' Billed to customer '}
        <b style={{ color: clientNet < 0 ? '#A32D2D' : '#185FA5' }}>{money2(cur, clientNet)}</b>
        {clientNet < 0 && ' — our charges exceed the supplier amount'}
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
          <div style={{ border: '1px solid #cdd1d8', borderRadius: 10, padding: 12, margin: '4px 0 14px', background: '#f7f9fc' }}>
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
