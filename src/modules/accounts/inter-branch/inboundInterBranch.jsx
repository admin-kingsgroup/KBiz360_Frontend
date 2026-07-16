// ─── Inbound Inter-Branch — the BUYER branch's INSO/INPO/INGP worklist ────────────
// Deals another branch pushed TO us. "Pending Conversion" = the seller has OFFERED the deal
// and we haven't accepted it yet — it exists nowhere in our books, not even as a draft.
// "Converted" = we accepted it: a pending SO/PO/GP now carries the purchase, and we fill the
// onward client sale on it. Convert is the event that creates that booking (the seller's Push
// only offers) — so this screen is the ONLY door into our SO/PO/GP queue for an INB deal.
// The purchase cost is the SELLING branch's frozen figure, shown in OUR book currency with
// the seller's breakdown for reference.
import React, { useState } from 'react';
import { useInbInbound, useDeleteInbDeal, useConvertInb } from '../../../core/useInterBranchVoucher';
import { localeOf } from '../../../core/format';
import { toast } from '../../../core/ux/toast';
import { confirmDialog } from '../../../core/ux/confirm';
import { bc } from '../../../core/styles.jsx';

// Book-currency symbol for a branch (₹ for India, $ for Africa) — used so a same-currency
// deal with no fx (e.g. Africa↔Africa USD) still shows the right symbol, not a hardcoded ₹.
const symOf = (code) => (((bc({ code }) || {}).cur) || '₹');

const C = { dark: '#0d1326', blue: '#185FA5', dim: '#5a6691', border: '#cdd1d8', green: '#27500A', amber: '#8a6d00', bg: '#f7f9fc' };
const CCY_SYM = { INR: '₹', USD: '$' };
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0; };
// Translate a seller-currency amount into the buyer's book currency at the deal's frozen
// rate (base USD, quote INR): USD→INR ×rate, INR→USD ÷rate. Same-currency = pass-through.
const toBuyer = (amt, fx) => {
  if (!fx || !(Number(fx.rate) > 0) || fx.fromCcy === fx.toCcy) return r2(amt);
  if (fx.fromCcy === 'USD' && fx.toCcy === 'INR') return r2(num(amt) * Number(fx.rate));
  if (fx.fromCcy === 'INR' && fx.toCcy === 'USD') return r2(num(amt) / Number(fx.rate));
  return r2(amt);
};

// Mirrors the BE guard on DELETE /inb/deal/:linkNo (inb.controller ADMIN_DELETE) — deleting
// reverses BOTH branches' posted vouchers, so it stays Super Admin / Director only. Keep the two
// regexes in step: a looser FE gate just hands the user a 403 after they've typed a reason.
const CAN_DELETE = /super.?admin|director/i;

export function InboundInterBranch({ branch, setRoute, currentUser }) {
  const canDelete = CAN_DELETE.test(String(currentUser?.role || ''));
  const q = useInbInbound(branch);
  const data = q.data || { rows: [], totals: { pending: 0, converted: 0 } };
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const [tab, setTab] = useState('pending');
  const shown = rows.filter((r) => r.state === tab);
  const del = useDeleteInbDeal();
  const conv = useConvertInb();
  const [converting, setConverting] = useState('');
  // ACCEPT the offered deal: creates the pending SO/PO/GP carrying the seller's purchase (the
  // sale side blank for us to fill) and moves the row to Converted. Confirmed because it is the
  // point of no return for the buyer — once converted the deal is live in our pipeline and the
  // purchase is locked; a wrong one is a cascade Delete, not an edit.
  const onConvert = async (rw) => {
    const { confirmed } = await confirmDialog({
      title: `Convert ${rw.inbLinkNo} into a SO/PO/GP?`,
      message: `A pending SO/PO/GP is created with the purchase from ${rw.fromBranch} filled in and locked. Add your client sale on it, then approve it through your normal SO/PO/GP flow.`,
      confirmLabel: 'Convert',
    });
    if (!confirmed) return;
    setConverting(rw.inbLinkNo);
    conv.mutate({ linkNo: rw.inbLinkNo }, {
      onSuccess: (d) => {
        const no = d?.buyerBookingNo || '';
        toast(d?.duplicate
          ? `${rw.inbLinkNo} was already converted — booking ${no}`
          : `Converted ${rw.inbLinkNo} → ${no}. Add the client sale and approve it.`, 'success');
        setTab('converted');
      },
      onError: (e) => toast(e?.message || 'Convert failed', 'error'),
      onSettled: () => setConverting(''),
    });
  };
  // Cascade delete — reverses BOTH sides (kept for audit); the selling branch re-raises a fresh,
  // corrected deal. Used when the seller's cost was wrong after we converted (it can't be edited).
  const onDelete = async (rw) => {
    const { confirmed, reason } = await confirmDialog({
      title: `Delete inter-branch deal ${rw.inbLinkNo}?`,
      message: `Both sides are reversed and soft-deleted (kept for audit); ${rw.fromBranch} then re-raises a corrected deal. This reverses posted vouchers — Super Admin / Director only.`,
      reasonRequired: true, reasonLabel: 'Reason for deleting (saved to the audit trail)',
      confirmLabel: 'Delete deal', danger: true,
    });
    if (!confirmed) return;
    del.mutate({ linkNo: rw.inbLinkNo, reason: (reason || '').trim() }, {
      onSuccess: () => toast(`Deal ${rw.inbLinkNo} deleted — ${rw.fromBranch} can re-raise a corrected deal`, 'success'),
      onError: (e) => toast(e?.message || 'Delete failed', 'error'),
    });
  };

  const card = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 9, padding: 0, overflow: 'hidden' };
  const th = { padding: '8px 12px', fontSize: 10.5, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase', color: C.dim, textAlign: 'left', background: C.bg, borderBottom: `1px solid ${C.border}` };
  const td = { padding: '9px 12px', fontSize: 12.5, borderBottom: `1px solid ${C.border}`, verticalAlign: 'top' };
  const tabBtn = (key, label, n) => (
    <button type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
      style={{ padding: '7px 15px', fontSize: 12.5, fontWeight: 700, border: 'none', borderRadius: 7, cursor: 'pointer',
        background: tab === key ? C.blue : 'transparent', color: tab === key ? '#fff' : C.dim }}>
      {label} <span style={{ opacity: 0.85, fontVariantNumeric: 'tabular-nums' }}>({n})</span>
    </button>
  );

  return (
    <div style={{ margin: 12, maxWidth: 1200 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.dark }}>Inbound Inter-Branch · INSO / INPO / INGP</div>
        <div style={{ fontSize: 12, color: C.dim }}>
          Deals pushed to <b>{typeof branch === 'string' ? branch : (branch?.code || '—')}</b> · Convert accepts one into a pending SO/PO/GP — until then it is not in your books or your approval queue. The purchase from the selling branch is locked.
        </div>
      </div>

      <div role="tablist" aria-label="Inbound state" style={{ display: 'inline-flex', gap: 4, padding: 4, borderRadius: 9, background: '#eef1f5', border: `1px solid ${C.border}`, marginBottom: 12 }}>
        {tabBtn('pending', 'Pending Conversion', data.totals.pending || 0)}
        {tabBtn('converted', 'Converted', data.totals.converted || 0)}
      </div>

      <div style={{ ...card, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
          <thead><tr>
            <th style={th}>INB Link No</th><th style={th}>From</th><th style={th}>Date</th><th style={th}>Passenger</th>
            <th style={{ ...th, textAlign: 'right' }}>Purchase cost</th><th style={th}>Reference</th>
            <th style={th}>{tab === 'pending' ? 'Action' : 'SO/PO/GP'}</th>
          </tr></thead>
          <tbody>
            {q.isLoading ? (
              <tr><td style={td} colSpan={7}>Loading…</td></tr>
            ) : shown.length === 0 ? (
              <tr><td style={{ ...td, color: C.dim }} colSpan={7}>{tab === 'pending' ? 'Nothing awaiting conversion.' : 'No converted deals yet.'}</td></tr>
            ) : shown.map((rw) => {
              const fx = rw.fx && Number(rw.fx.rate) > 0 && rw.fx.fromCcy !== rw.fx.toCcy ? rw.fx : null;
              const sSym = fx ? (CCY_SYM[fx.fromCcy] || symOf(rw.fromBranch)) : symOf(rw.fromBranch);
              const bSym = fx ? (CCY_SYM[fx.toCcy] || symOf(rw.toBranch)) : symOf(rw.toBranch);
              const buyerCost = toBuyer(rw.total, fx);
              return (
                <tr key={rw.inbLinkNo}>
                  <td style={{ ...td, fontFamily: 'monospace', color: C.blue }}>{rw.inbLinkNo}</td>
                  <td style={td}>{rw.fromBranch}</td>
                  <td style={td}>{rw.date}</td>
                  <td style={td}>{rw.passenger || '—'}</td>
                  <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                    {bSym}{buyerCost.toLocaleString(localeOf(bSym), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ ...td, fontSize: 11, color: C.dim }}>
                    {sSym}{r2(rw.total).toLocaleString(localeOf(sSym))}
                    {fx && <> @ 1 USD = ₹{Number(fx.rate).toLocaleString(localeOf('₹'))}</>}
                    <div style={{ fontSize: 10.5, color: '#8a94a3' }}>
                      fares {sSym}{r2(rw.fares).toLocaleString(localeOf(sSym))} · fee {sSym}{r2(rw.serviceFee).toLocaleString(localeOf(sSym))}{num(rw.taxAmt) > 0 ? ` · IGST ${sSym}${r2(rw.taxAmt).toLocaleString(localeOf(sSym))}` : ''}
                    </div>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {tab === 'pending'
                        ? <button type="button" onClick={() => onConvert(rw)} disabled={!!converting}
                            title={`Accept this deal — creates a pending SO/PO/GP with ${rw.fromBranch}'s purchase locked in`}
                            style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 6, cursor: converting ? 'default' : 'pointer', color: '#fff', background: C.green, opacity: converting ? 0.6 : 1 }}>
                            {converting === rw.inbLinkNo ? 'Converting…' : 'Convert →'}
                          </button>
                        : <span style={{ fontFamily: 'monospace', color: C.dark }}>
                            {rw.buyerBookingNo || '—'}
                            <div style={{ fontSize: 10.5, color: C.dim }}>{rw.buyerStatus || ''}</div>
                            {/* Converted but the client sale isn't filled in yet — the booking can't be
                                approved until it is, so surface it rather than let it sit unnoticed. */}
                            {!rw.saleDone && <button type="button" onClick={() => setRoute && setRoute('/bookings/pending')}
                              style={{ marginTop: 3, padding: '3px 7px', fontSize: 10, fontWeight: 700, border: `1px solid ${C.amber}`, borderRadius: 5, cursor: 'pointer', color: C.amber, background: '#fff' }}>Add sale →</button>}
                          </span>}
                      {canDelete && <button type="button" onClick={() => onDelete(rw)} disabled={del.isPending}
                        title="Delete this deal — reverses both sides (kept for audit); the selling branch re-raises a corrected one"
                        style={{ padding: '5px 9px', fontSize: 11, fontWeight: 700, border: '1px solid #A32D2D', borderRadius: 6, cursor: del.isPending ? 'default' : 'pointer', color: '#A32D2D', background: '#fff', opacity: del.isPending ? 0.6 : 1 }}>Delete</button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>
        Cost shown in your book currency at the deal's frozen rate; the seller's figures are reference only. To fix a wrong cost, revoke the converted SO/PO/GP so the deal can be corrected at source and re-pushed.
      </div>
    </div>
  );
}
