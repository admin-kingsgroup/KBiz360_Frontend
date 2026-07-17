// ─── Inbound Inter-Branch — the BUYER branch's INSO/INPO/INGP worklist ────────────
// Deals another branch pushed TO us. "Pending Conversion" = the seller has OFFERED the deal
// and we haven't accepted it yet — it exists nowhere in our books, not even as a draft.
// "Converted" = we accepted it: a pending SO/PO/GP now carries the purchase, and we fill the
// onward client sale on it. Convert is the event that creates that booking (the seller's Push
// only offers) — so this screen is the ONLY door into our SO/PO/GP queue for an INB deal.
// The purchase cost is the SELLING branch's frozen figure, shown in OUR book currency with
// the seller's breakdown for reference.
import React, { useState, useEffect } from 'react';
import { useInbInbound, useDeleteInbDeal, useConvertInb, useReturnInb } from '../../../core/useInterBranchVoucher';
import { localeOf } from '../../../core/format';
import { toast } from '../../../core/ux/toast';
import { confirmDialog } from '../../../core/ux/confirm';
import { bc } from '../../../core/styles.jsx';
import { inbTaxOf } from '../../../core/voucherSpecs.js';

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

// Mirrors the BE guard on POST /api/inter-branch/delete (inb.controller ADMIN_DELETE) —
// deleting reverses BOTH branches' posted vouchers, so it stays Super Admin / Director only.
// Keep the two regexes in step: a looser FE gate just hands the user a 403 after they've typed
// a reason. (Not a REST DELETE and not :linkNo-addressed — an INB link no contains slashes.)
const CAN_DELETE = /super.?admin|director/i;

export function InboundInterBranch({ branch, setRoute, currentUser }) {
  const canDelete = CAN_DELETE.test(String(currentUser?.role || ''));
  const q = useInbInbound(branch);
  const data = q.data || { rows: [], totals: { pending: 0, converted: 0, approved: 0, deleted: 0, edited: 0 } };
  const rows = Array.isArray(data.rows) ? data.rows : [];
  // `branch` arrives as a code string or a {code} object depending on the caller.
  const brLabel = typeof branch === 'string' ? branch : (branch?.code || 'this branch');
  const [tab, setTab] = useState('pending');
  // Land on the tab that actually HAS rows. The screen always opened on Pending Conversion,
  // so a branch whose only deal was already converted saw an empty table and reasonably
  // concluded the pipeline was broken — the row was one click away on Converted. Steers the
  // first render only, once data lands; after that the user's choice wins.
  const [tabSteered, setTabSteered] = useState(false);
  useEffect(() => {
    if (tabSteered || q.isLoading) return;
    // Land on the first tab with actual WORK on it, in lifecycle order. Deliberately only
    // these three: Deleted is an archive and Edited is a cross-cut (its rows already sit on
    // their real tab), so steering to either presents history as a to-do list. A branch whose
    // only row is a deleted deal opened straight into it — alarming, and not their work.
    // Falling through to Pending is right: its empty state explains that a deal appears only
    // once the selling branch pushes one.
    if (!data.totals.pending) {
      const first = ['converted', 'approved'].find((k) => data.totals[k] > 0);
      if (first) setTab(first);
    }
    setTabSteered(true);
  }, [tabSteered, q.isLoading, data.totals]);
  // Edited is a CROSS-CUT (a deal changed after it was raised), not a lifecycle bucket — a
  // deal can be both Converted and Edited — so it filters on its own flag, not on `state`.
  const shown = tab === 'edited' ? rows.filter((r) => r.edited) : rows.filter((r) => r.state === tab);
  const del = useDeleteInbDeal();
  const conv = useConvertInb();
  const ret = useReturnInb();
  const [converting, setConverting] = useState('');
  // RETURN the deal to the seller for correction — the key WE hold. Only offered once our own
  // SO/PO/GP is gone (the row is back in Pending), because clearing our books is what frees
  // the deal. The reason is the entire message to the seller: without it they get a deal back
  // and no idea what to fix, and the round trip runs again.
  const onReturn = async (rw) => {
    const { confirmed, reason } = await confirmDialog({
      title: `Return ${rw.inbLinkNo} to ${rw.fromBranch} for correction?`,
      message: `${rw.fromBranch} will be able to revoke, edit and re-push it. Until they do, this deal cannot be converted — they are about to un-post the very legs it is built on. It stays in your Pending list and refreshes automatically when they re-push.`,
      reasonRequired: true, reasonLabel: `What needs correcting? (${rw.fromBranch} acts on this)`,
      confirmLabel: 'Return to ' + rw.fromBranch,
    });
    if (!confirmed) return;
    ret.mutate({ linkNo: rw.inbLinkNo, reason: (reason || '').trim() }, {
      onSuccess: () => toast(`${rw.inbLinkNo} returned to ${rw.fromBranch} — they can now revoke and correct it`, 'success'),
      onError: (e) => toast(e?.message || 'Return failed', 'error'),
    });
  };
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
        <div style={{ fontSize: 17, fontWeight: 800, color: C.dark }}>INB · Incoming <span style={{ fontWeight: 700, fontSize: 12.5, color: C.dim }}>— deals another branch sells to us</span></div>
        <div style={{ fontSize: 12, color: C.dim }}>
          Deals pushed to <b>{brLabel}</b> · Convert accepts one into a pending SO/PO/GP — until then it is not in your books or your approval queue. The purchase from the selling branch is locked.
        </div>
      </div>

      {/* The buyer-side lifecycle, mirroring the seller's Outgoing pipeline:
          Pending (offered, not ours yet) → Converted (accepted; our SO/PO/GP is a draft, still
          nothing in our books) → Approved & Locked (our SO/PO/GP is approved and its JV is
          passed in OUR books — live on both sides, immutable). Edited is a cross-cut. */}
      <div role="tablist" aria-label="Incoming state" style={{ display: 'inline-flex', gap: 4, padding: 4, borderRadius: 9, background: '#eef1f5', border: `1px solid ${C.border}`, marginBottom: 12, flexWrap: 'wrap' }}>
        {tabBtn('pending', 'Pending', data.totals.pending || 0)}
        {tabBtn('converted', 'Converted', data.totals.converted || 0)}
        {tabBtn('approved', 'Approved & Locked', data.totals.approved || 0)}
        {tabBtn('edited', 'Edited', data.totals.edited || 0)}
        {tabBtn('deleted', 'Deleted', data.totals.deleted || 0)}
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
              /* An empty tab here is almost always "nobody has pushed anything to us yet",
                 NOT a broken screen — a deal is invisible to the buyer until the seller
                 Pushes it (that is the Convert gate). Every state says WHAT it means and WHAT
                 fills it; a bare "nothing here" is what read as a fault. */
              <tr><td style={{ ...td, color: C.dim }} colSpan={7}>
                {tab === 'pending' ? <>
                  <div style={{ fontWeight: 700, color: C.dark, marginBottom: 3 }}>Nothing awaiting conversion.</div>
                  <div>A deal appears here only once the selling branch <b>approves and Pushes</b> it to {brLabel}. Until then it stays in their own pipeline and is invisible to you.</div>
                  {(data.totals.converted > 0) && <div style={{ marginTop: 4 }}>You have <b>{data.totals.converted}</b> already converted — see the Converted tab.</div>}
                </> : tab === 'converted' ? <>
                  <div style={{ fontWeight: 700, color: C.dark, marginBottom: 3 }}>No converted deals yet.</div>
                  <div>Deals you accept from the Pending tab land here with the SO/PO/GP they created. They stay here until that SO/PO/GP is approved, which moves them to <b>Approved &amp; Locked</b>.</div>
                </> : tab === 'approved' ? <>
                  <div style={{ fontWeight: 700, color: C.dark, marginBottom: 3 }}>Nothing approved &amp; locked yet.</div>
                  <div>A converted deal lands here once <b>your</b> SO/PO/GP is approved and its JV is passed in {brLabel}&apos;s books. From then the deal is live on both branches and immutable — a correction is a cascade Delete and a fresh deal from the seller, never an edit.</div>
                </> : tab === 'edited' ? <>
                  <div style={{ fontWeight: 700, color: C.dark, marginBottom: 3 }}>No edited deals.</div>
                  <div>Deals the selling branch changed after raising them show here, so a figure that moved under you is never silent.</div>
                </> : <>
                  <div style={{ fontWeight: 700, color: C.dark, marginBottom: 3 }}>No deleted deals.</div>
                  <div>A deal retired by a cascade Delete stays here for audit — both branches&apos; postings are reversed and the seller re-raises a corrected one.</div>
                </>}
              </td></tr>
            ) : shown.map((rw) => {
              const fx = rw.fx && Number(rw.fx.rate) > 0 && rw.fx.fromCcy !== rw.fx.toCcy ? rw.fx : null;
              const sSym = fx ? (CCY_SYM[fx.fromCcy] || symOf(rw.fromBranch)) : symOf(rw.fromBranch);
              const bSym = fx ? (CCY_SYM[fx.toCcy] || symOf(rw.toBranch)) : symOf(rw.toBranch);
              const buyerCost = toBuyer(rw.total, fx);
              return (
                <tr key={rw.inbLinkNo}>
                  <td style={{ ...td, fontFamily: 'monospace', color: C.blue }}>
                    {rw.inbLinkNo}
                    {/* Say the state on the row, not just in a tooltip — this is why Convert
                        is greyed, and it is the thing the user is waiting on. */}
                    {rw.returned && <div style={{ marginTop: 3, fontFamily: 'system-ui', fontSize: 10.5, fontWeight: 700, color: C.amber }}>
                      ↩ returned to {rw.fromBranch} — awaiting their re-push
                      {rw.returnedReason && <div style={{ fontWeight: 400, color: C.dim }}>“{rw.returnedReason}”</div>}
                    </div>}
                    {rw.rePushed && !rw.returned && <div style={{ marginTop: 3, fontFamily: 'system-ui', fontSize: 10, fontWeight: 700, color: C.green }} title={`${rw.fromBranch} corrected and re-pushed this deal — the figures below are the revised ones`}>✓ re-pushed · figures revised</div>}
                  </td>
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
                      {/* The tax NAME follows the SELLER's regime, not ours: an FBM/NBO seller billed
                          VAT (16%), a DAR one VAT 18%, an India one IGST — this row shows the seller's
                          frozen figure, so relabelling it as IGST misnames the tax on the very screen
                          the buyer decides to Convert from. rw.fromBranch is the seller. */}
                      fares {sSym}{r2(rw.fares).toLocaleString(localeOf(sSym))} · fee {sSym}{r2(rw.serviceFee).toLocaleString(localeOf(sSym))}{num(rw.taxAmt) > 0 ? ` · ${inbTaxOf({ branch: rw.fromBranch }).name} ${sSym}${r2(rw.taxAmt).toLocaleString(localeOf(sSym))}` : ''}
                    </div>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* Convert is the ACCEPT action and only exists while the deal is still
                          only offered. Every later state shows what it became instead. */}
                      {rw.state === 'pending'
                        ? <>
                            {/* RETURNED: the seller is un-posting these very legs right now, so
                                converting would book a cost off an un-posted deal — and off the
                                OLD figures we already asked them to change. Disabled with the
                                reason showing, never a live button that 409s. */}
                            <button type="button" onClick={() => onConvert(rw)} disabled={!!converting || rw.returned}
                              title={rw.returned
                                ? `Returned to ${rw.fromBranch} for correction${rw.returnedReason ? ` — “${rw.returnedReason}”` : ''}. Wait for their re-push; this row refreshes with the corrected figures.`
                                : `Accept this deal — creates a pending SO/PO/GP with ${rw.fromBranch}'s purchase locked in`}
                              style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 6, cursor: (converting || rw.returned) ? 'default' : 'pointer', color: '#fff', background: rw.returned ? '#9aa3b2' : C.green, opacity: converting ? 0.6 : 1 }}>
                              {converting === rw.inbLinkNo ? 'Converting…' : 'Convert →'}
                            </button>
                            {/* The key we hold. Reachable only here — the row is only in Pending
                                once our own SO/PO/GP is revoked AND deleted, which is exactly the
                                precondition, enforced by the backend too. */}
                            {!rw.returned && <button type="button" onClick={() => onReturn(rw)} disabled={ret.isPending}
                              title={`Send this deal back to ${rw.fromBranch} to correct — unlocks their Revoke. Do this only after revoking and deleting your own SO/PO/GP.`}
                              style={{ padding: '5px 9px', fontSize: 11, fontWeight: 700, border: `1px solid ${C.amber}`, borderRadius: 6, cursor: ret.isPending ? 'default' : 'pointer', color: C.amber, background: '#fff', opacity: ret.isPending ? 0.6 : 1 }}>↩ Revoke INB</button>}
                          </>
                        : <span style={{ fontFamily: 'monospace', color: C.dark }}>
                            {rw.buyerBookingNo || '—'}
                            <div style={{ fontSize: 10.5, color: C.dim }}>
                              {rw.state === 'approved' ? <span style={{ color: C.green, fontWeight: 800 }}>🔒 approved · JV passed</span>
                                : rw.state === 'deleted' ? <span style={{ color: '#A32D2D', fontWeight: 800 }}>deleted</span>
                                  : (rw.buyerStatus || '')}
                            </div>
                            {/* Converted but the client sale isn't filled in yet — the booking can't be
                                approved until it is, so surface it rather than let it sit unnoticed. */}
                            {rw.state === 'converted' && !rw.saleDone && <button type="button" onClick={() => setRoute && setRoute('/bookings/pending')}
                              style={{ marginTop: 3, padding: '3px 7px', fontSize: 10, fontWeight: 700, border: `1px solid ${C.amber}`, borderRadius: 5, cursor: 'pointer', color: C.amber, background: '#fff' }}>Add sale →</button>}
                          </span>}
                      {/* An already-deleted deal has nothing left to delete — offering the
                          button would be a control that can only fail. */}
                      {canDelete && rw.state !== 'deleted' && <button type="button" onClick={() => onDelete(rw)} disabled={del.isPending}
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
