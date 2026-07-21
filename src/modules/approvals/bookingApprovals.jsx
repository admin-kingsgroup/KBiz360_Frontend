/* ════════════════════════════════════════════════════════════════════════════
   SO/PO/GP BOOKING APPROVAL QUEUE
   BUSINESS SUB-MODULE REORG (2026-07-14): extracted from
   bookingOrder/legacy.jsx — BookingApprovals is the Approvals nav module's own
   screen (used by modules/approvals/voucherApprovals.jsx's UnifiedApprovals
   dispatcher, domain "sopogp"), not an Accounts screen, so it belongs here
   rather than in bookingOrder/ (which now only holds the retired
   Pending/Approved/Deleted/Rejected screens, kept for reference — superseded
   by this unified queue). bookingOrder/legacy.jsx re-exports BookingApprovals
   from here so its existing barrel/test-mock surface needs no changes.

   GOLD_SOFT/GOLD_LINE/JournalView are imported from soPoGpVoucherEntry.jsx
   (exported there for this reuse) rather than redefined — BookingTable's
   revoked-badge and JV expansion share the exact SO/PO/GP voucher theme/JV
   view.

   MERGED FROM MAIN (2026-07-14): Edit PO removed from BookingApprovals/
   BookingTable (a Branch Accountant can't approve, so a pax-only fix
   dead-ended in Pending). Added the "needs fixing" filter (NeedsFixingChip) +
   an always-visible per-row remark for pending bookings the verification gate
   blocks.
   ════════════════════════════════════════════════════════════════════════════ */
import React, { useMemo, useState } from 'react';
import {
  Plus, Trash2, RefreshCw, CheckCircle2, XCircle, ChevronDown, ChevronRight, Pencil, RotateCcw,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { card, btnG, btnGh, bc } from '../../core/styles.jsx';
import { useModalEsc } from '../../core/ux/useModalEsc';
import { localeOf, activeCurrency } from '../../core/format';
import { periodRange } from '../../core/period';
import { printBookingInvoice } from '../../core/printInvoice';
import { apiGet, apiPost, isViewOnly, VIEW_ONLY_REASON } from '../../core/api';
import { useApprovalChain, nextActionFor, StageChip } from '../../core/approvalChain';
import { AuditTrail } from '../../core/AuditTrail';
import { toast } from '../../core/ux/toast';
import { confirmDialog } from '../../core/ux/confirm';
import { usePager, Pager } from '../../core/ux/pager';
import { VSPECS } from '../../core/voucherSpecs.js';
import { useRefundLiveAmount } from '../../core/voucher/useRefundLiveAmount';
import { invalidateBooks, useVoucherApprovals, useApproveVoucher, useRejectVoucher, useRevokeVoucher, fetchRevokeCheck } from '../../core/useAccounting';
import { VoucherEditor } from '../accountingLive';
import { SoPoGpVoucherEntry, GOLD_SOFT, GOLD_LINE, JournalView } from '../accounts/daily-entry/soPoGpVoucherEntry';
import { SkeletonTable } from '../../shell/primitives';

const GOLD = '#A07828', DARK = '#141414', DR = '#1A7A42', BLUE = '#2563eb';
const fmt = (n) => Number(Math.round((Number(n) || 0) * 100) / 100).toLocaleString(localeOf(activeCurrency()), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Blank/unresolved branch → null (like core/voucher/ui.js), never a silent 'BOM' default.
const brCodeOf = (branch) => (branch === 'ALL' ? null : (branch?.code || null));

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
  // Recently Approved wise: not a bucketed group — a flat list sorted by approval
  // recency (most recent first). Unapproved rows (no approvedAt) sort last.
  if (by === 'recent') return [{ key: '__all', label: null, rows: [...rows].sort((a, b) => new Date(b.approvedAt || 0) - new Date(a.approvedAt || 0)) }];
  if (by !== 'client' && by !== 'supplier' && by !== 'module') return [{ key: '__all', label: null, rows }];
  const keyOf = (b) => (by === 'client' ? (b.customer?.name || '—') : by === 'supplier' ? (b.supplier?.name || '—') : (b.module || '—'));
  const labelOf = (b) => (by === 'module' ? ((VSPECS[b.module] && VSPECS[b.module].name) || b.module || '—') : keyOf(b));
  const map = new Map();
  for (const b of rows) { const k = keyOf(b); if (!map.has(k)) map.set(k, { key: k, label: labelOf(b), rows: [] }); map.get(k).rows.push(b); }
  return [...map.values()].sort((a, b) => String(a.label).localeCompare(String(b.label)));
}
const sumT = (rows, path) => rows.reduce((s, b) => s + ((b[path] && b[path].total) || 0), 0);
// Purchase SHOWN = what is actually payable to the supplier. For Insurance (SI) carrying a
// supplier commission the payable is NET of that commission (mirrors backend creditorNet and
// the SO/PO/GP entry screen's net-payable total); every other module shows the gross PO total.
const poNetPay = (po) => (Number(po?.total) || 0) - (Number(po?.incentiveAmt) || 0) - (Number(po?.incentiveGst) || 0) + (Number(po?.incentiveTds) || 0);
const poShown = (b) => (b && b.module === 'SI' && (Number(b?.po?.incentiveAmt) || 0) > 0 ? poNetPay(b.po) : (b?.po?.total || 0));
const sumPo = (rows) => rows.reduce((s, b) => s + poShown(b), 0);
const gpPctOf = (gp, sale) => (sale ? (gp / sale) * 100 : 0);
const gpPctTxt = (gp, sale) => `${gpPctOf(gp, sale).toFixed(1)}%`;

function BookingTable({ rows, isLoading, cur, open, setOpen, mode, groupBy = 'none', onApprove, onReview, onCancel, onDelete, canDelete, onEdit, onRevoke, canRevoke, onInvoice, busyId, sel, onToggleSel }) {
  const chainCfg = useApprovalChain(); // three-level chain assignees (drives the stage-aware button)
  // View-only accounts (e.g. a view-only Director) may browse the queue but not act. Every
  // write button below is pre-DISABLED with a reason (never a live button that only 403s on
  // click — the "never leave a screen silent / disable-with-reason" rule). The ONE exception
  // is the Director/Owner escalation sign-off, which a view-only Director IS allowed to give.
  const vo = isViewOnly();
  const cols = mode === 'approved'
    ? ['', 'Booking No', 'Voucher Date', 'Link No', 'Tally Ref', 'Module', 'Sale Inv', 'Purchase Inv', 'Sale', 'Purchase', 'GP', 'GP %', 'Approved', 'Actions']
    : mode === 'rejected'
      ? ['', 'Booking No', 'Link No', 'Module', 'Customer', 'Supplier', 'Sale', 'Purchase', 'GP', 'GP %', 'Voucher Date', 'Reason']
      : mode === 'deleted'
        ? ['', 'Booking No', 'Link No', 'Module', 'Sale Inv', 'Purchase Inv', 'Sale', 'Purchase', 'GP', 'GP %', 'Deleted', 'By']
        : ['', 'Booking No', 'Voucher Date', 'Link No', 'Tally Ref', 'Module', 'Customer', 'Supplier', 'Sale', 'Purchase', 'GP', 'GP %', 'Actions'];
  // The four money columns drive both header right-alignment and the group-summary
  // colSpans; derive their start from the header so adding lead columns can't misalign them.
  const numStart = cols.indexOf('Sale');
  // Page the flat (un-grouped) list so the DOM stays bounded on big branches. Grouped
  // views render in full so each group's subtotal stays correct (the grouping itself
  // already bounds how much is on screen).
  const pg = usePager(rows);
  const shown = groupBy === 'none' ? pg.pageRows : rows;
  // View-only action cell — a disabled "👁 View only" indicator (reason on hover) in place of
  // the whole write-button cluster, EXCEPT the Director/Owner escalation sign-off, which a
  // view-only Director may still give (mirrors voucherApprovals + the server's read-only exemption).
  const voCell = (b) => {
    if (mode === 'pending') {
      const na = nextActionFor(b, chainCfg);
      if (na.action === 'director' || na.action === 'owner') {
        return (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <StageChip e={b} />
            <button disabled={busyId === b.id || !na.allowed} onClick={() => onReview && onReview(b, na.action)} title={na.hint} aria-label={na.hint} style={{ ...btnG, padding: '4px 10px', fontSize: 10.5, background: !na.allowed ? '#cfd6e4' : GOLD, cursor: na.allowed ? 'pointer' : 'not-allowed' }}>
              {busyId === b.id ? <RefreshCw size={12} className="spin" /> : <CheckCircle2 size={12} />} {na.label}
            </button>
          </div>
        );
      }
    }
    return <span title={VIEW_ONLY_REASON} aria-label={VIEW_ONLY_REASON} style={{ fontSize: 10.5, fontWeight: 700, color: '#9197a3', cursor: 'not-allowed' }}>👁 View only</span>;
  };
  return (
    <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1080 }}>
        <thead><tr style={{ background: '#f3f4f8' }}>
          {cols.map((h, i) => <th key={i} style={{ padding: '9px 12px', fontSize: 10, fontWeight: 700, color: '#5b616e', textTransform: 'uppercase', textAlign: i >= numStart && i <= numStart + 3 ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {isLoading && Array.from({ length: 6 }).map((_, r) => (
            <tr key={'sk' + r}><td colSpan={cols.length} style={{ padding: '8px 10px' }}><div className="kb-skeleton" style={{ height: 14, borderRadius: 6, opacity: Math.max(0.4, 1 - r * 0.12) }} /></td></tr>
          ))}
          {!isLoading && rows.length === 0 && <tr><td colSpan={cols.length} style={{ padding: 22, textAlign: 'center', color: '#9197a3', fontSize: 12 }}>{mode === 'pending' ? 'No pending vouchers. Create one under “SO/PO/GP Voucher”.' : mode === 'rejected' ? 'No rejected vouchers.' : mode === 'deleted' ? 'No deleted vouchers.' : 'No approved vouchers yet.'}</td></tr>}
          {groupBookings(shown, groupBy).map((g) => (
            <React.Fragment key={g.key}>
              {g.label != null && (
                <tr style={{ background: '#eef1f8' }}>
                  <td colSpan={numStart} style={{ padding: '7px 12px', fontWeight: 700, fontSize: 11.5, color: DARK }}>{g.label} <span style={{ color: '#9197a3', fontWeight: 600 }}>· {g.rows.length} bill{g.rows.length === 1 ? '' : 's'}</span></td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{fmt(sumT(g.rows, 'so'))}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{fmt(sumPo(g.rows))}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: DR, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{fmt(sumT(g.rows, 'gp'))}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontWeight: 700, color: DR, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{gpPctTxt(sumT(g.rows, 'gp'), sumT(g.rows, 'so'))}</td>
                  <td colSpan={cols.length - numStart - 4}></td>
                </tr>
              )}
              {g.rows.map((b) => {
            const sp = VSPECS[b.module];
            const isOpen = open === b.id;
            return (
              <React.Fragment key={b.id}>
                <tr onClick={() => setOpen(isOpen ? null : b.id)} style={{ borderBottom: '1px solid #dfe2e7', cursor: 'pointer', background: isOpen ? '#faf7ef' : '#fff' }}>
                  <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{mode === 'pending' && onToggleSel && <input type="checkbox" checked={!!(sel && sel.has(b.id))} onChange={() => onToggleSel(b.id)} onClick={(e) => e.stopPropagation()} style={{ marginRight: 6, verticalAlign: 'middle', cursor: 'pointer' }} />}{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, fontSize: 11.5 }}>{b.bookingNo}{mode === 'pending' && b.validation?.hasErrors ? <span title={(b.validation.errors || []).join(' · ')} style={{ marginLeft: 6, color: '#dc2626', fontWeight: 800 }}>⚠</span> : null}{mode === 'pending' && b.revokedAt ? <span title={`Revoked${b.revokedBy ? ' by ' + b.revokedBy : ''}${b.revokeReason ? ' — ' + b.revokeReason : ''}`} style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 20, background: GOLD_SOFT, color: '#8a6d12', border: '1px solid ' + GOLD_LINE, whiteSpace: 'nowrap' }}>⟲ Revoked</span> : null}{/travkings\s+tours\s+and\s+travels/i.test(b.supplier?.name || '') ? <span title={`Buyer-side of a pushed inter-branch (INB) deal — the cost from ${b.supplier?.name || 'the selling branch'} is pre-filled. Add your end-customer + onward-sale margin, then approve.`} style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 20, background: '#e7f0fb', color: BLUE, border: '1px solid #b9d3ef', whiteSpace: 'nowrap' }}>⇄ INB</span> : null}</td>
                  {(mode === 'approved' || mode === 'pending') && <td style={{ padding: '8px 12px', fontSize: 11, color: '#5b616e' }}>{b.date || '—'}</td>}
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: BLUE, fontSize: 11.5 }}>{b.linkNo}</td>
                  {(mode === 'pending' || mode === 'approved') && <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: 11, color: '#5b616e', whiteSpace: 'nowrap' }} title="Sales / Purchase Tally Ref">{(b.saleTallyRef || '—')}{b.purTallyRef ? ' / ' + b.purTallyRef : ''}</td>}
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
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }} title={b.module === 'SI' && (Number(b?.po?.incentiveAmt) || 0) > 0 ? `net payable to supplier · gross ${fmt(b.po?.total)} less commission ${fmt(b.po?.incentiveAmt)}` : undefined}>{fmt(poShown(b))}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: DR, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{fmt(b.gp?.total)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: DR, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{gpPctTxt(b.gp?.total || 0, b.so?.total || 0)}</td>
                  {mode !== 'pending' && <td style={{ padding: '8px 12px', fontSize: 11, color: '#5b616e' }}>{mode === 'approved' ? (b.approvedAt ? String(b.approvedAt).slice(0, 10) : '—') : mode === 'deleted' ? (b.deletedAt ? String(b.deletedAt).slice(0, 10) : '—') : b.date}</td>}
                  <td style={{ padding: '8px 12px' }} onClick={(e) => e.stopPropagation()}>
                    {vo && (mode === 'pending' || mode === 'approved') ? voCell(b) : mode === 'pending' ? (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <StageChip e={b} />
                        <button disabled={busyId === b.id} onClick={() => onEdit(b)} style={{ ...btnGh, padding: '4px 9px', fontSize: 10.5, color: BLUE, borderColor: '#bcd4ee' }}><Pencil size={12} /> Edit</button>
                        {(() => {
                          // Stage-aware chain action: Check (L1) → Verify (L2) → Approve & Post (L3).
                          const na = nextActionFor(b, chainCfg);
                          if (na.action !== 'approve') {
                            return <button disabled={busyId === b.id || !na.allowed} onClick={() => onReview && onReview(b, na.action)} title={na.hint} style={{ ...btnG, padding: '4px 10px', fontSize: 10.5, background: !na.allowed ? '#cfd6e4' : (na.action === 'check' ? BLUE : GOLD), cursor: na.allowed ? 'pointer' : 'not-allowed' }}>
                              {busyId === b.id ? <RefreshCw size={12} className="spin" /> : <CheckCircle2 size={12} />} {na.label}
                            </button>;
                          }
                          const ok = !b.validation?.hasErrors && na.allowed;
                          return <button disabled={busyId === b.id || !ok} onClick={() => onApprove(b)} title={!na.allowed ? na.hint : (b.validation?.hasErrors ? 'Verification failed — ' + (b.validation.errors || []).join(' · ') : 'Level 3 — posts to the books')} aria-label={ok ? undefined : `Approve disabled — ${!na.allowed ? na.hint : (b.validation?.hasErrors ? 'verification failed: ' + (b.validation.errors || []).join(' · ') : 'fix the error first')}`} style={{ ...btnG, padding: '4px 10px', fontSize: 10.5, background: ok ? DR : '#cfd6e4', cursor: ok ? 'pointer' : 'not-allowed' }}>
                            {busyId === b.id ? <RefreshCw size={12} className="spin" /> : <CheckCircle2 size={12} />} Approve
                          </button>;
                        })()}
                        <button disabled={busyId === b.id} onClick={() => onCancel(b)} style={{ ...btnGh, padding: '4px 9px', fontSize: 10.5, color: '#dc2626', borderColor: '#f3c9c9' }}><XCircle size={12} /> Reject</button>
                        {canDelete && <button disabled={busyId === b.id} onClick={() => onDelete(b)} title="Delete — remove from Pending, view-only (number not reusable)" style={{ ...btnG, padding: '4px 10px', fontSize: 10.5, background: '#dc2626' }}><Trash2 size={12} /> Delete</button>}
                      </div>
                    ) : mode === 'approved' ? (
                      // An approved booking is READ-ONLY: Revoke un-posts all its legs and
                      // returns it to Pending (edit there, then re-approve under the SAME
                      // numbers). Revoke is approver-only; Delete is admin-only.
                      <div style={{ display: 'flex', gap: 6 }}>
                        {canRevoke && onRevoke && <button disabled={busyId === b.id} onClick={() => onRevoke(b)} title="Revoke — un-post the Sales/Purchase and return this booking to Pending so it can be edited & re-approved (numbers kept)" style={{ ...btnGh, padding: '4px 9px', fontSize: 10.5, color: GOLD, borderColor: '#e3cd97' }}><RotateCcw size={12} /> Revoke</button>}
                        {canDelete && <button disabled={busyId === b.id} onClick={() => onDelete(b)} style={{ ...btnGh, padding: '4px 9px', fontSize: 10.5, color: '#dc2626', borderColor: '#f3c9c9' }}><Trash2 size={12} /> Delete</button>}
                        {!(canRevoke && onRevoke) && !canDelete && <span style={{ fontSize: 10.5, color: '#b0b7cc' }}>—</span>}
                      </div>
                    ) : mode === 'deleted' ? (
                      <span style={{ fontSize: 11, color: '#9197a3' }} title={b.deletedReason || ''}>{b.deletedBy || '—'}{b.deletedReason ? ` · ${b.deletedReason}` : ''}</span>
                    ) : (
                      // Rejected is a SEND-BACK, not a dead end: editing revives the booking to
                      // Pending and re-enters the chain at Check (bookingOrders.service.update).
                      // Without this the tab was terminal — the maker had to re-key the whole
                      // booking under a new Link No. It is also where a Branch Accountant locked
                      // out of a booking they Checked gets it back, which is exactly what the
                      // lock's message tells them to ask the verifier for.
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: '#9197a3' }} title={b.rejectedReason || ''}>{b.rejectedReason || '—'}</span>
                        <button disabled={busyId === b.id || vo} onClick={() => onEdit(b)}
                          title={vo ? VIEW_ONLY_REASON : "Correct and resubmit — this returns the booking to Pending and re-enters the approval chain at Check. The Link No is kept."}
                          aria-label={vo ? VIEW_ONLY_REASON : undefined}
                          style={{ ...btnGh, padding: '4px 9px', fontSize: 10.5, color: vo ? '#9197a3' : BLUE, borderColor: vo ? '#dfe2e7' : '#bcd4ee', marginLeft: 'auto', whiteSpace: 'nowrap', cursor: vo ? 'not-allowed' : 'pointer' }}>
                          <Pencil size={12} /> Edit &amp; resubmit
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
                {/* Always-visible remark for a pending booking that can't be approved yet
                    (e.g. an untagged Flight/Holiday needing International/Domestic). The reason
                    text comes from the same verification gate that blocks Approve, so the team
                    can read WHY and fix it without hovering the disabled button. */}
                {mode === 'pending' && b.validation?.hasErrors && (
                  <tr style={{ background: '#fdf2f2' }}>
                    <td colSpan={cols.length} style={{ padding: '5px 12px 7px 40px', borderBottom: '1px solid #f3c9c9' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#b42318' }}>⚠ Can’t approve yet — {(b.validation.errors || []).join(' · ')}</span>
                      {(b.validation.warnings || []).length > 0 && <span style={{ fontSize: 10.5, color: '#9a6a00', marginLeft: 8 }}>· {(b.validation.warnings || []).join(' · ')}</span>}
                    </td>
                  </tr>
                )}
                {isOpen && (
                  <tr><td colSpan={cols.length} style={{ padding: '12px 16px', background: '#faf9f5', borderBottom: '1px solid #eee3cf' }}>
                    {onInvoice && (b.status === 'approved' || b.status === 'posted') && (
                      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        <button onClick={() => onInvoice(b, 'sale')} style={{ ...btnGh, padding: '4px 10px', fontSize: 10.5, color: BLUE, borderColor: '#bcd4ee' }}>🧾 Sales Invoice</button>
                        {!b.noSupplier && <button onClick={() => onInvoice(b, 'purchase')} style={{ ...btnGh, padding: '4px 10px', fontSize: 10.5 }}>📄 Purchase Invoice</button>}
                      </div>
                    )}
                    <JournalView id={b.id} cur={cur} date={b.date} />
                  </td></tr>
                )}
              </React.Fragment>
            );
          })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {groupBy === 'none' && <Pager pager={pg} />}
    </div>
  );
}

// Toolbar chip for the Pending queues: shows how many rows the verification gate blocks
// (mostly untagged Flights/Holiday needing International/Domestic) and toggles a filter to
// show ONLY those, so the team can work the blocked list to zero. Hidden when count is 0.
function NeedsFixingChip({ count, active, onToggle }) {
  return (
    <button onClick={onToggle}
      title="Show only bookings that can’t be approved yet — they need a fix (e.g. tag International vs Domestic) before they can post"
      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, boxSizing: 'border-box', padding: '0 12px', fontSize: 11.5, fontWeight: 700, borderRadius: 7, cursor: 'pointer', border: '1px solid ' + (active ? '#b42318' : '#f0c2c2'), background: active ? '#b42318' : '#fdecec', color: active ? '#fff' : '#b42318' }}>
      ⚠ {count} need fixing{active ? ' · showing only these' : ''}
    </button>
  );
}

// Bill-wise / Client-wise / Supplier-wise / Module-wise grouping toggle.
function GroupByBar({ value, onChange, extra = [] }) {
  const OPTS = [['none', 'Bill wise'], ['client', 'Client wise'], ['supplier', 'Supplier wise'], ['module', 'Module wise'], ...extra];
  return (
    <div style={{ display: 'inline-flex', height: 32, boxSizing: 'border-box', border: '1px solid #cdd1d8', borderRadius: 7, overflow: 'hidden' }}>
      {OPTS.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)}
          style={{ display: 'flex', alignItems: 'center', padding: '0 12px', fontSize: 11.5, fontWeight: 600, border: 'none', cursor: 'pointer', background: value === v ? BLUE : '#fff', color: value === v ? '#fff' : '#5b616e' }}>{l}</button>
      ))}
    </div>
  );
}


// Shared Check/Verify handlers for the booking queues — levels 1 & 2 of the
// three-level chain (no books impact; the server enforces stage + eligibility).
const makeBookingReview = (qc, setBusyId, setMsg) => async (b, action) => {
  setBusyId(b.id);
  try {
    await apiPost(`/api/booking-orders/${b.id}/review`, { action });
    setMsg(`✓ ${action === 'check' ? 'Checked (L1)' : 'Verified (L2)'} ${b.bookingNo} — ${action === 'check' ? 'awaiting Verify' : 'awaiting final Approval'}.`);
    qc.invalidateQueries({ queryKey: ['booking-orders'] });
  } catch (e) { setMsg('⚠ ' + (e.message || `${action} failed`)); }
  finally { setBusyId(null); }
};
const makeBookingReviewSelected = (qc, setBusyId, setMsg, sel, setSel) => async (action) => {
  if (!sel.size) return;
  setBusyId('bulk');
  try {
    const res = await apiPost('/api/booking-orders/review-many', { ids: [...sel], action });
    setMsg(`✓ ${action === 'check' ? 'Checked' : 'Verified'} ${res.done} of ${res.total}${res.failed ? ` · ${res.failed} failed${res.errors?.[0] ? ` — ${res.errors[0]}` : ''}` : ''}.`);
    setSel(new Set()); qc.invalidateQueries({ queryKey: ['booking-orders'] });
  } catch (e) { setMsg('⚠ ' + (e.message || `${action} failed`)); }
  finally { setBusyId(null); }
};

const isAdminRole = (u) => ['Super Admin', 'Director'].includes(u?.role);
// Revoking un-posts a posted booking — approver-level roles only (the server enforces
// this too; this just gates the button). Stricter than approving, looser than delete.
const isApproverRole = (u) => ['Super Admin', 'Director', 'Senior Finance Manager', 'Sr. Accounts Executive'].includes(u?.role);
// Booking revoke is one notch looser than the approver set: Branch Accountant may also
// revoke SO/PO/GP bookings (branch-scoped server-side), so they can pull an approved
// booking back to Pending, edit it and send it through the chain again. Approver-only
// actions elsewhere (refund queue, finance vouchers) still use isApproverRole.
const canRevokeBooking = (u) => isApproverRole(u) || u?.role === 'Branch Accountant';

// Shared Revoke handler factory for the booking screens — runs the server preflight so
// the dialog shows the blast radius (which legs un-post) and any warnings, blocks on a
// hard block, requires a reason, then posts the revoke and refreshes both books roots.
function makeOnRevoke({ qc, setBusyId, setOpen, toastFn }) {
  return async (b) => {
    let pre = null;
    try { pre = await apiGet('/api/booking-orders/' + b.id + '/revoke-check'); }
    catch (e) { toastFn(e.message || 'Could not check this booking', 'error'); return; }
    if (pre && (pre.blocks || []).length) { toastFn(`Can't revoke — ${pre.blocks.map((x) => x.msg).join(' ')}`, 'error'); return; }
    const warns = (pre?.warnings || []).map((w) => w.msg).filter(Boolean);
    const legs = (pre?.legs || []).filter(Boolean);
    const { confirmed, reason } = await confirmDialog({
      title: `Revoke booking ${b.bookingNo}?`,
      message: `This un-posts its ${legs.length || ''} spawned invoice(s)${legs.length ? ` (${legs.join(', ')})` : ''} and returns the booking to Pending for editing & re-approval (the numbers are kept).${warns.length ? ' Note: ' + warns.join(' ') : ''}`,
      danger: true, reasonRequired: true, reasonLabel: 'Reason for revoke', confirmLabel: 'Revoke',
    });
    if (!confirmed) return;
    setBusyId(b.id);
    try { await apiPost('/api/booking-orders/' + b.id + '/revoke', { reason }); qc.invalidateQueries({ queryKey: ['booking-orders'] }); invalidateBooks(qc); setOpen(null); toastFn(`Revoked ${b.bookingNo} → Pending`); }
    catch (e) { toastFn(e.message || 'Revoke failed', 'error'); }
    finally { setBusyId(null); }
  };
}

// Amount cell for a refund/reissue queue row — its own component (not inlined in the
// .map()) so useRefundLiveAmount's hooks run once per row, consistently, per the Rules
// of Hooks. Mirrors the Edit modal's Live JV exactly instead of the bulk preview.
function RefundAmountCell({ entry, cur, fmt }) {
  return <>{cur} {fmt(useRefundLiveAmount(entry))}</>;
}

// SO/PO/GP Refunds & Reissues — RF/RI vouchers that reverse a SO/PO/GP sale. Unlike a
// forward booking (a sale+purchase pair spawned from a booking master), a refund/reissue
// is a SINGLE voucher (category 'refund'/'reissue'), so it lives in its own section under
// this same window and is approved/rejected on its own row via the shared voucher
// mutations. INB refunds are routed to the INB window instead — refundScope 'sopogp'
// excludes anything reversing an INB deal (againstInvoice/linkNo starting 'INB/'). Hidden
// on the Edited tab (a cross-cut list, not a status queue).
function SopogpRefunds({ branch, status, needle, currentUser }) {
  const cur = bc(branch).cur;
  const isApprover = isApproverRole(currentUser);
  // View-only: the refund/reissue write buttons are pre-disabled with a reason (see BookingTable).
  const vo = isViewOnly();
  const q = useVoucherApprovals(branch, status, { refundScope: 'sopogp' });
  const approveOne = useApproveVoucher();
  const reject = useRejectVoucher();
  const revoke = useRevokeVoucher();
  const qc = useQueryClient();
  const chainCfg = useApprovalChain(); // three-level chain assignees (Check → Verify → Approve)
  const [busy, setBusy] = useState(false);
  const [editId, setEditId] = useState(null); // fix a blocked refund voucher in place, then approve
  useModalEsc(() => setEditId(null), !!editId);
  const pendingTab = status === 'pending';
  const list = useMemo(() => {
    const all = Array.isArray(q.data && q.data.entries) ? q.data.entries : [];
    return all
      .filter((e) => e.category === 'refund' || e.category === 'reissue')
      .filter((e) => !needle || [e.vno, e.party, e.againstInvoice, e.linkNo, String(Math.round(e.total || 0))].filter(Boolean).join(' ').toLowerCase().includes(needle));
  }, [q.data, needle]);

  // A refund/reissue is one voucher — approve/reject it on its own (exactly like the
  // INB Refunds section). Single-voucher approve (NOT approveMany) so the backend's
  // real refusal ("Awaiting Check…", validation error) reaches the toast instead of
  // being flattened to "failed to post".
  const doApprove = async (e) => {
    const { confirmed } = await confirmDialog({ title: `Approve refund ${e.vno}?`, message: 'Posts this refund / reissue to the books (reverses the linked sale).', confirmLabel: 'Approve' });
    if (!confirmed) return;
    setBusy(true);
    try { await approveOne.mutateAsync({ id: e.id, approver: 'admin' }); toast(`Approved ${e.vno} — posted to the books`); }
    catch (err) { toast(`${e.vno}: ${(err && err.message) || 'failed to post'}`, 'error'); }
    finally { setBusy(false); }
  };
  // Levels 1 & 2 of the chain (no books impact) — the server enforces stage order
  // and who may act; these buttons only route the click. Mirrors the Vouchers queue.
  const doReview = async (e, action) => {
    setBusy(true);
    try {
      await apiPost(`/api/vouchers/${e.id}/review`, { action });
      toast(action === 'check' ? `Checked ${e.vno} (level 1) — awaiting Verify` : `Verified ${e.vno} (level 2) — awaiting final Approval`);
      qc.invalidateQueries({ queryKey: ['vouchers'] });
    } catch (err) { toast((err && err.message) || `${action} failed`, 'error'); }
    finally { setBusy(false); }
  };
  const doReject = async (e) => {
    const { confirmed, reason } = await confirmDialog({ title: `Reject refund ${e.vno}?`, message: 'Marks it Rejected (no books impact).', danger: true, reasonRequired: true, reasonLabel: 'Reason for rejection', confirmLabel: 'Reject' });
    if (!confirmed) return;
    setBusy(true);
    try { await reject.mutateAsync({ id: e.id, by: 'admin', reason }); toast(`Rejected ${e.vno}`); }
    catch (err) { toast((err && err.message) || 'Reject failed', 'error'); }
    finally { setBusy(false); }
  };
  // Revoke an APPROVED refund/reissue → back to Pending (un-posts the reversal). Runs the
  // server preflight first so the dialog shows the blast radius (journal rows un-posted +
  // warnings) and hard-blocks a locked / bank-reconciled / live-refund voucher. Mirrors the
  // Voucher Approvals queue's doRevoke — the same capability the row's voucher view offers.
  const doRevoke = async (e) => {
    let pre = null;
    try { pre = await fetchRevokeCheck(e.id); } catch (err) { toast((err && err.message) || 'Could not check this voucher', 'error'); return; }
    if (pre && (pre.blocks || []).length) { toast(`Can't revoke — ${pre.blocks.map((b) => b.msg).join(' ')}`, 'error'); return; }
    const warns = (pre?.warnings || []).map((w) => w.msg).filter(Boolean);
    const rows = pre?.journalRows ? `This un-posts ${pre.journalRows} journal row${pre.journalRows === 1 ? '' : 's'}. ` : '';
    const { confirmed, reason } = await confirmDialog({
      title: `Revoke ${e.vno}?`,
      message: `${rows}It returns to Pending for editing & re-approval (the number is kept).${warns.length ? ' Note: ' + warns.join(' ') : ''}`,
      danger: true, reasonRequired: true, reasonLabel: 'Reason for revoke', confirmLabel: 'Revoke',
    });
    if (!confirmed) return;
    setBusy(true);
    try { await revoke.mutateAsync({ id: e.id, reason }); toast(`Revoked ${e.vno} → Pending`); }
    catch (err) { toast((err && err.message) || 'Revoke failed', 'error'); }
    finally { setBusy(false); }
  };

  // View-only action cell for a refund/reissue row — a disabled "👁 View only" indicator
  // (reason on hover) in place of Edit / Approve / Reject / Check / Verify, EXCEPT the
  // Director/Owner escalation sign-off, which a view-only Director may still give.
  const voRefundCell = (e) => {
    const na = nextActionFor(e, chainCfg);
    if (na.action === 'director' || na.action === 'owner') {
      return <><StageChip e={e} /><button disabled={busy || !na.allowed} title={na.hint} aria-label={na.hint} onClick={() => doReview(e, na.action)} style={{ marginLeft: 6, marginRight: 6, padding: '5px 10px', background: na.allowed ? GOLD : '#cfd6e4', color: '#fff', border: 'none', borderRadius: 5, fontWeight: 700, cursor: na.allowed ? 'pointer' : 'not-allowed' }}>{na.label}</button></>;
    }
    return <><StageChip e={e} /><span title={VIEW_ONLY_REASON} aria-label={VIEW_ONLY_REASON} style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, color: '#9197a3', cursor: 'not-allowed' }}>👁 View only</span></>;
  };

  const th = { padding: '9px 12px', fontSize: 10, fontWeight: 700, color: '#5b616e', textTransform: 'uppercase', whiteSpace: 'nowrap' };
  return (
    <div style={{ ...card, padding: 0, overflowX: 'auto', marginTop: 14 }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid #cdd1d8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
        <span style={{ fontWeight: 800, color: DARK, fontSize: 13 }}>Refunds &amp; Reissues <span style={{ fontWeight: 700, color: '#9197a3', fontSize: 11 }}>— reverse a SO/PO/GP sale</span></span>
        <span style={{ fontSize: 11.5, color: '#5b616e', fontWeight: 700 }}>{list.length} {status}</span>
      </div>
      {q.isLoading ? <SkeletonTable rows={5} cols={6} />
        : list.length === 0 ? <div style={{ padding: 18, textAlign: 'center', color: '#9197a3', fontSize: 12 }}>No {status} refunds / reissues.</div>
        : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead><tr style={{ background: '#f3f4f8' }}>
              {['Vch No', 'Voucher Date', 'Reverses (Sale)', 'Party', 'Amount', pendingTab ? 'Actions' : (status === 'approved' ? 'Status / Action' : 'Status')].map((h, i) => (
                <th key={i} style={{ ...th, textAlign: h === 'Amount' ? 'right' : 'left' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {list.map((e) => (
                <tr key={e.id} style={{ borderTop: '1px solid #dfe2e7' }}>
                  <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap' }}>
                    {e.vno}
                    <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 4, background: '#eef2ff', color: '#3d4ea8', fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>{e.category === 'reissue' ? 'RI' : 'RF'}</span>
                    {/* Was-posted-then-revoked provenance on the Pending tab (parity with the main
                        voucher queue + the bookings table): shows who revoked it and why on hover. */}
                    {pendingTab && e.revokedAt && <span title={`Revoked${e.revokedBy ? ' by ' + e.revokedBy : ''}${e.revokeReason ? ' — ' + e.revokeReason : ''}`} style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 20, background: '#FBF3DE', color: '#8a6d12', border: '1px solid #e3cd97', whiteSpace: 'nowrap' }}>⟲ Revoked</span>}
                  </td>
                  <td style={{ padding: '7px 12px', whiteSpace: 'nowrap', fontSize: 11, color: '#5b616e' }}>{e.date || '—'}</td>
                  <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 11, color: '#5b616e' }}>{e.againstInvoice || e.linkNo || '—'}</td>
                  <td style={{ padding: '7px 12px' }}>{e.party || '—'}</td>
                  <td style={{ padding: '7px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}><RefundAmountCell entry={e} cur={cur} fmt={fmt} /></td>
                  {pendingTab
                    ? <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                        {vo ? voRefundCell(e) : <>
                        <StageChip e={e} />
                        {isApprover && <>
                          {/* Edit in place (reuses the shared voucher editor); saving reverts it to
                              Pending, then re-enter the chain. Lets an approver fix a blocked refund inline. */}
                          <button disabled={busy} onClick={() => setEditId(e.id)} title="Edit this refund / reissue voucher, then approve" style={{ margin: '0 6px', padding: '5px 10px', background: '#fff', color: BLUE, border: `1px solid ${BLUE}`, borderRadius: 5, fontWeight: 700, cursor: 'pointer' }}>✎ Edit</button>
                        </>}
                        {(() => {
                          // Stage-aware action (mirrors the Vouchers queue): Check (L1, anyone in
                          // branch) → Verify (L2) → Approve & Post (L3). Server re-enforces all gates.
                          const na = nextActionFor(e, chainCfg);
                          if (na.action !== 'approve') {
                            return <button disabled={busy || !na.allowed} title={na.hint} onClick={() => doReview(e, na.action)} style={{ margin: isApprover ? 0 : '0 0 0 6px', marginRight: 6, padding: '5px 10px', background: na.allowed ? (na.action === 'check' ? BLUE : GOLD) : '#cfd6e4', color: '#fff', border: 'none', borderRadius: 5, fontWeight: 700, cursor: na.allowed ? 'pointer' : 'not-allowed' }}>{na.label}</button>;
                          }
                          const ok = e.postable && na.allowed;
                          return <button disabled={busy || !ok} title={!na.allowed ? na.hint : (e.postable ? 'Level 3 — posts to the books' : (e.error || (e.errors && e.errors[0]) || 'Fix the error before approving'))} aria-label={ok ? undefined : `Approve disabled — ${!na.allowed ? na.hint : (e.error || (e.errors && e.errors[0]) || 'fix the error first')}`} onClick={() => doApprove(e)} style={{ marginRight: 6, padding: '5px 10px', background: ok ? DR : '#cfd6e4', color: '#fff', border: 'none', borderRadius: 5, fontWeight: 700, cursor: ok ? 'pointer' : 'not-allowed' }}>{na.label}</button>;
                        })()}
                        {isApprover && <button disabled={busy} onClick={() => doReject(e)} style={{ padding: '5px 10px', background: '#fff', color: '#dc2626', border: '1px solid #f3c9c9', borderRadius: 5, fontWeight: 700, cursor: 'pointer' }}>Reject</button>}
                        {!e.postable && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, color: '#dc2626' }}>blocked</span>}
                        </>}
                      </td>
                    : <td style={{ padding: '7px 12px', color: '#5b616e', whiteSpace: 'nowrap' }}>
                        <span style={{ textTransform: 'capitalize' }}>{e.status}</span>
                        {isApprover && !vo && (e.status === 'approved' || e.status === 'saved' || e.status === 'posted') && (
                          e.locked
                            // A booking-driven (locked) refund/reissue CANNOT be voucher-revoked — the
                            // /revoke endpoint 409s ("driven by booking …"). It must be un-posted on its
                            // reversal booking (which un-posts both the voucher AND the booking in sync).
                            // Point the approver there instead of a button that always errors.
                            ? <span title={`Driven by booking ${e.bookingId || ''} — revoke it on the SO/PO/GP booking so both sides un-post in sync`} style={{ marginLeft: 10, fontSize: 10.5, fontWeight: 700, color: '#8a6d12', display: 'inline-flex', alignItems: 'center', gap: 4, verticalAlign: 'middle' }}>🔒 revoke on booking{e.bookingId ? ` ${e.bookingId}` : ''}</span>
                            // A standalone / imported refund IS voucher-revocable — same preflight-guarded
                            // flow as the main Voucher Approvals queue.
                            : <button disabled={busy} onClick={() => doRevoke(e)} title="Revoke — un-post this refund / reissue and return it to Pending so it can be edited & re-approved (number kept)" style={{ marginLeft: 10, padding: '4px 10px', background: '#fff', color: GOLD, border: '1px solid #e3cd97', borderRadius: 5, fontWeight: 700, fontSize: 11, cursor: busy ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, verticalAlign: 'middle', opacity: busy ? 0.6 : 1 }}><RotateCcw size={12} /> Revoke</button>
                        )}
                      </td>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      {/* Edit a refund/reissue voucher in place (reuses the Vouchers editor). Saving
          reverts it to Pending; then Approve on the row. Mirrors the INB Refunds edit. */}
      {editId && (
        <div onClick={async () => { const { confirmed } = await confirmDialog({ title: 'Discard changes to this voucher?', message: 'Any edits you have not saved will be lost.', confirmLabel: 'Discard', danger: true }); if (confirmed) setEditId(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.5)', zIndex: 900, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '5vh 12px' }}>
          <div role="dialog" aria-modal="true" aria-label="Edit refund voucher" onClick={(ev) => ev.stopPropagation()} style={{ background: '#fff', width: 'min(720px, 96vw)', maxHeight: '90vh', overflowY: 'auto', borderRadius: 10, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid #cdd1d8', position: 'sticky', top: 0, background: '#fff' }}>
              <strong style={{ color: DARK }}>Edit Refund / Reissue — fix &amp; approve</strong>
              <button onClick={() => setEditId(null)} aria-label="Close editor" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9197a3' }}>✕</button>
            </div>
            <div style={{ padding: 4 }}>
              <VoucherEditor voucherId={editId} cur={cur} onBack={() => setEditId(null)} />
            </div>
            <div style={{ padding: '8px 16px', fontSize: 11, color: '#5b616e', borderTop: '1px solid #cdd1d8' }}>Tip: fix the amounts / ledgers so it balances, Save (reverts it to Pending), then click Approve on the row.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Unified SO/PO/GP approval — Pending · Approved · Rejected · Deleted in one screen
// with internal tabs (mirrors Voucher Approvals). Reuses BookingTable + all actions.
export function BookingApprovals({ branch, setRoute, currentUser, initialSearch = '', initialStatus = '' }) {
  const brCode = brCodeOf(branch) || 'ALL';
  const cur = bc(branch).cur;
  const qc = useQueryClient();
  const { data = [], isLoading } = useBookings(brCode);
  const custs = useQuery({ queryKey: ['customers'], queryFn: () => apiGet('/api/customers') }).data || [];
  const sups = useQuery({ queryKey: ['suppliers'], queryFn: () => apiGet('/api/suppliers') }).data || [];
  const partyBy = (arr) => { const m = {}; (arr || []).forEach((x) => { if (x && x.name) m[String(x.name).toLowerCase().trim()] = x; }); return m; };
  const custMap = partyBy(custs), supMap = partyBy(sups);
  const [status, setStatus] = useState(initialStatus || 'pending');
  const [open, setOpen] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(null); useModalEsc(() => setEditing(null), !!editing);
  const [groupBy, setGroupBy] = useState('none');
  // Refund/Reissue (SO/PO/GP reversal modules RF/RI) live in this same queue and show
  // inline in the normal Pending window alongside forward bookings — no separate filter.
  const [sel, setSel] = useState(() => new Set());
  const [onlyFlagged, setOnlyFlagged] = useState(false); // "needs fixing" filter (pending tab only)
  const [range, setRange] = useState(() => periodRange('all', { branch })); // default All so Pending shows everything
  const [search, setSearch] = useState(initialSearch || '');
  const canDelete = isAdminRole(currentUser);
  // View-only: hide the bulk write toolbar (Check / Verify / Approve selected) — those post
  // to the books and would only 403. The per-row buttons are disabled-with-reason in the table.
  const vo = isViewOnly();
  const inRange = (dt) => (!range.from || dt >= range.from) && (!range.to || dt <= range.to);
  // Search filters the visible list by Booking No, Link No, module, customer, supplier,
  // posted Sale/Purchase Vch No, or amount. Counts (tab badges) stay unfiltered.
  const needle = search.trim().toLowerCase();
  const matchBooking = (b) => {
    if (!needle) return true;
    const hay = [b.bookingNo, b.linkNo, b.module, b.customer && b.customer.name, b.supplier && b.supplier.name, b.saleVno, b.purchaseVno, String(Math.round(b.saleTotal || 0))].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(needle);
  };
  // Newest first: date desc, then Booking No desc (numeric-aware) as a stable tiebreak.
  const cmpLatest = (a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.bookingNo || '').localeCompare(String(a.bookingNo || ''), undefined, { numeric: true });

  // Bookings edited ≥ once (cross-cuts status) — its own source for the Edited tab.
  const editedQ = useQuery({ queryKey: ['booking-edited', brCode], queryFn: () => apiGet('/api/booking-orders/edited', { branch: brCode === 'ALL' ? '' : brCode }) });
  const editedRows = (editedQ.data || []).filter((r) => inRange(r.date || ''));
  const editedVisible = editedRows
    .filter((r) => !needle || [r.bookingNo, r.linkNo, r.module, r.customer, r.lastBy, r.lastReason, String(Math.round(r.saleTotal || 0))].filter(Boolean).join(' ').toLowerCase().includes(needle))
    .slice().sort((a, b) => String(b.lastAt || '').localeCompare(String(a.lastAt || '')));
  const bucket = (b) => (b.status === 'posted' ? 'approved' : b.status);
  const counts = { pending: 0, approved: 0, rejected: 0, deleted: 0, edited: editedRows.length };
  data.forEach((b) => { if (counts[bucket(b)] !== undefined && inRange(b.date || '')) counts[bucket(b)]++; });
  // Rows in the current status+range (before the search filter) — the visible list.
  const statusRows = data.filter((b) => bucket(b) === status && inRange(b.date || ''));
  const rows = statusRows.filter((b) => matchBooking(b)).sort(cmpLatest);
  // Pending rows the verification gate blocks (e.g. untagged Flight/Holiday) → toolbar chip
  // + optional "show only these" filter. Only meaningful on the Pending tab (others carry no
  // validation flag). visibleRows is what the table + select-all operate on.
  const flaggedCount = status === 'pending' ? rows.filter((b) => b.validation?.hasErrors).length : 0;
  const visibleRows = (status === 'pending' && onlyFlagged) ? rows.filter((b) => b.validation?.hasErrors) : rows;
  const allIds = visibleRows.map((b) => b.id);
  const toggleSel = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAllSel = () => setSel((s) => (s.size === allIds.length ? new Set() : new Set(allIds)));
  React.useEffect(() => { setSel(new Set()); setOnlyFlagged(false); }, [status, brCode]);
  // Auto-clear the filter once nothing is flagged, so clearing the list to zero never leaves
  // the filter stuck ON (hiding the remaining pending rows behind a chip that has vanished).
  React.useEffect(() => { if (flaggedCount === 0 && onlyFlagged) setOnlyFlagged(false); }, [flaggedCount, onlyFlagged]);

  const onApprove = async (b) => {
    setBusyId(b.id); setMsg('');
    try { const res = await apiPost('/api/booking-orders/' + b.id + '/approve'); setMsg(res.noSupplier ? `✓ Approved ${b.bookingNo}. Posted Sales ${res.saleVno} (no purchase leg).` : `✓ Approved ${b.bookingNo}. Posted Sales ${res.saleVno} + Purchase ${res.purchaseVno}.`); qc.invalidateQueries({ queryKey: ['booking-orders'] }); invalidateBooks(qc); }
    catch (e) { setMsg('⚠ ' + (e.message || 'Approve failed')); } finally { setBusyId(null); }
  };
  // Open the editor. Editing an already-approved booking reverses its posted Sales/
  // Purchase out of the books and returns it to Pending for re-approval — warn first.
  const onEdit = async (b) => {
    if (b.status === 'approved' || b.status === 'posted') {
      const { confirmed } = await confirmDialog({ title: `Edit approved booking ${b.bookingNo}?`, message: `Its posted Sales (${b.saleVno})${b.noSupplier ? '' : ` & Purchase (${b.purchaseVno})`} will be reversed out of the books and the booking returns to Pending for re-approval.`, danger: true, confirmLabel: 'Edit & reverse' });
      if (!confirmed) return;
    }
    setEditing(b);
  };
  const onCancel = async (b) => {
    const { confirmed, reason } = await confirmDialog({ title: `Reject voucher ${b.bookingNo}?`, message: 'Marked Rejected (no books impact).', danger: true, reasonRequired: true, reasonLabel: 'Reason for rejection', confirmLabel: 'Reject' });
    if (!confirmed) return;
    setBusyId(b.id);
    try { await apiPost('/api/booking-orders/' + b.id + '/reject', { reason }); qc.invalidateQueries({ queryKey: ['booking-orders'] }); setOpen(null); setMsg(`✓ Rejected ${b.bookingNo}.`); }
    catch (e) { setMsg('⚠ ' + (e.message || 'Reject failed')); } finally { setBusyId(null); }
  };
  const onDelete = async (b) => {
    if (!canDelete) return;
    // A pending booking hasn't posted, so there's nothing to reverse — only the
    // approved-tab delete unwinds the posted Sales/Purchase. Either way the number is burned.
    const posted = b.status === 'approved' || b.status === 'posted';
    const { confirmed, reason } = await confirmDialog({ title: `Delete ${posted ? 'approved ' : ''}booking ${b.bookingNo}?`, message: posted ? `Its Sales (${b.saleVno}) & Purchase (${b.purchaseVno}) are reversed out of the books; kept view-only under Deleted, numbers never reused.` : `It has no books impact; kept view-only under Deleted, numbers never reused.`, danger: true, reasonRequired: true, reasonLabel: 'Reason for deletion', confirmLabel: 'Delete' });
    if (!confirmed) return;
    setBusyId(b.id);
    try { await apiPost('/api/booking-orders/' + b.id + '/delete', { reason }); qc.invalidateQueries({ queryKey: ['booking-orders'] }); invalidateBooks(qc); setOpen(null); setMsg(`✓ Deleted ${b.bookingNo}.`); }
    catch (e) { setMsg('⚠ ' + (e.message || 'Delete failed')); } finally { setBusyId(null); }
  };
  const canRevoke = canRevokeBooking(currentUser);
  const onRevoke = makeOnRevoke({ qc, setBusyId, setOpen, toastFn: (m, kind) => setMsg((kind === 'error' ? '⚠ ' : '✓ ') + m) });
  const onApproveSelected = async () => {
    if (!sel.size) return;
    // Pre-flight: how many of the selection failed verification and can't post? Warn up
    // front instead of letting them land in the failed tally (mirrors the vouchers queue).
    const blocked = rows.filter((b) => sel.has(b.id) && b.validation?.hasErrors).length;
    const { confirmed } = await confirmDialog({
      title: `Approve ${sel.size} selected voucher(s)?`,
      message: blocked === 0
        ? 'Each posts its linked Sales + Purchase.'
        : blocked === sel.size
          ? `None of the ${sel.size} selected pass verification yet — they'll stay in Pending. Fix them from the list first.`
          : `Each posts its linked Sales + Purchase. ${blocked} of ${sel.size} fail verification and will stay in Pending — the rest will be approved.`,
      confirmLabel: 'Approve',
    });
    if (!confirmed) return;
    setBusyId('bulk'); setMsg(`⏳ Approving ${sel.size} voucher(s)… please wait.`);
    try { const res = await apiPost('/api/booking-orders/approve-many', { ids: [...sel] }); setMsg(`✓ Approved ${res.approved} of ${res.total}${res.failed ? ` · ${res.failed} failed${res.errors?.[0] ? ` — ${res.errors[0]}` : ''}` : ''}.`); setSel(new Set()); qc.invalidateQueries({ queryKey: ['booking-orders'] }); invalidateBooks(qc); }
    catch (e) { setMsg('⚠ ' + (e.message || 'Bulk approve failed')); } finally { setBusyId(null); }
  };
  const onReview = makeBookingReview(qc, setBusyId, setMsg);
  const onReviewSelected = makeBookingReviewSelected(qc, setBusyId, setMsg, sel, setSel);

  // Editing opens the FULL SO/PO/GP entry form (same as the Pending bookings page),
  // not the compact PO-only modal — customer, SO, PO and sectors are all editable.
  if (editing) {
    return <SoPoGpVoucherEntry branch={branch} setRoute={setRoute} editBooking={editing}
      onDone={() => { setEditing(null); setOpen(null); qc.invalidateQueries({ queryKey: ['booking-orders'] }); }} />;
  }

  const tab = (k, label) => (
    <button key={k} onClick={() => setStatus(k)} className="max-tablet:min-h-[44px]" style={{ padding: '8px 16px', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: `3px solid ${status === k ? GOLD : 'transparent'}`, background: 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: status === k ? DARK : '#5b616e' }}>{label} <span style={{ fontSize: 11, color: '#9197a3' }}>({counts[k]})</span></button>
  );

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: DARK }}>SO/PO/GP Approvals</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5b616e' }}>Pending have no books impact; approving posts the linked Sales + Purchase. Deleted are reversed out & view-only.</p>
        </div>
        <button onClick={() => setRoute && setRoute('/bookings/new')} className="max-tablet:min-h-[44px]" style={btnG}><Plus size={14} /> New voucher</button>
      </div>
      <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #cdd1d8', flexWrap: 'wrap' }}>{tab('pending', 'Pending')}{tab('approved', 'Approved')}{tab('rejected', 'Rejected')}{tab('deleted', 'Deleted')}{tab('edited', 'Edited')}</div>
      </div>
      {msg && <div style={{ ...card, marginBottom: 12, fontSize: 12, padding: '8px 12px', color: msg.startsWith('⚠') ? '#dc2626' : '#16a34a', background: msg.startsWith('⚠') ? '#fbe9e9' : '#e8f6ed', border: '1px solid ' + (msg.startsWith('⚠') ? '#f3c9c9' : '#cde3b6') }}>{msg}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <GroupByBar value={groupBy} onChange={setGroupBy} extra={status === 'approved' ? [['recent', 'Recently Approved']] : []} />
        <div style={{ position: 'relative', flex: '0 1 360px', minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9197a3', pointerEvents: 'none' }}>🔍</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Booking No · Link · customer · supplier · amount…"
            aria-label="Search bookings"
            style={{ width: '100%', padding: '6px 26px 6px 28px', border: '1px solid #cdd1d8', borderRadius: 7, fontSize: 12, outline: 'none', background: '#fff' }}
          />
          {search && <button onClick={() => setSearch('')} aria-label="Clear search" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#9197a3', fontSize: 14, lineHeight: 1 }}>✕</button>}
        </div>
        {needle && <span style={{ fontSize: 11, color: '#5b616e', fontWeight: 700 }}>{(status === 'edited' ? editedVisible.length : rows.length)} match{(status === 'edited' ? editedVisible.length : rows.length) === 1 ? '' : 'es'}</span>}
        {status === 'pending' && flaggedCount > 0 && <NeedsFixingChip count={flaggedCount} active={onlyFlagged} onToggle={() => setOnlyFlagged((v) => !v)} />}
        {status === 'pending' && rows.length > 0 && !vo && (
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <button onClick={toggleAllSel} style={{ ...btnGh, padding: '5px 11px', fontSize: 11, color: BLUE, borderColor: '#bcd4ee' }}>{sel.size === allIds.length ? '☑ Clear' : `☐ Select all (${allIds.length})`}</button>
            {sel.size > 0 && <button disabled={busyId === 'bulk'} onClick={() => onReviewSelected('check')} style={{ ...btnGh, padding: '5px 11px', fontSize: 11, color: BLUE, borderColor: '#bcd4ee' }}>Check selected ({sel.size})</button>}
            {sel.size > 0 && <button disabled={busyId === 'bulk'} onClick={() => onReviewSelected('verify')} style={{ ...btnGh, padding: '5px 11px', fontSize: 11, color: GOLD, borderColor: '#e3cd97' }}>Verify selected ({sel.size})</button>}
            {sel.size > 0 && <button disabled={busyId === 'bulk'} onClick={onApproveSelected} style={{ ...btnG, padding: '5px 13px', fontSize: 11.5, background: DR }}>{busyId === 'bulk' ? <RefreshCw size={12} className="spin" /> : <CheckCircle2 size={12} />} {busyId === 'bulk' ? 'Approving…' : `Approve selected (${sel.size})`}</button>}
          </span>
        )}
      </div>
      {status === 'edited'
        ? <EditedBookingsList rows={editedVisible} isLoading={editedQ.isLoading} cur={cur} open={open} setOpen={setOpen} />
        : <>
            <BookingTable rows={visibleRows} isLoading={isLoading} cur={cur} open={open} setOpen={setOpen} mode={status} groupBy={groupBy} onApprove={onApprove} onReview={onReview} onCancel={onCancel} onEdit={onEdit} onDelete={onDelete} canDelete={canDelete} onRevoke={onRevoke} canRevoke={canRevoke} onInvoice={(b, side) => { const master = side === 'sale' ? custMap[String(b.customer?.name || '').toLowerCase().trim()] : supMap[String(b.supplier?.name || '').toLowerCase().trim()]; printBookingInvoice({ booking: b, side, branch, master, title: `${side === 'sale' ? 'Sales Invoice' : 'Purchase Invoice'} · ${b.bookingNo}` }); }} busyId={busyId} sel={sel} onToggleSel={toggleSel} />
            <SopogpRefunds branch={branch} status={status} needle={needle} currentUser={currentUser} />
          </>}
    </div>
  );
}

// The "Edited" tab body for SO/PO/GP — one row per booking edited ≥ once, expanding
// to its full audit timeline (who/when/why + field-level changes + full snapshot) and
// the live JV. Cross-cuts status: an approved booking that was later edited shows here.
function EditedBookingsList({ rows, isLoading, cur, open, setOpen }) {
  const th = { padding: '7px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#5b616e', textTransform: 'uppercase', letterSpacing: 0.3, borderBottom: '2px solid #cdd1d8', whiteSpace: 'nowrap' };
  const td = { padding: '7px 10px', borderBottom: '1px solid #dfe2e7', fontSize: 12, whiteSpace: 'nowrap' };
  if (isLoading) return <div style={{ ...card, padding: 12 }}><SkeletonTable rows={5} cols={10} /></div>;
  if (!rows.length) return <div style={{ ...card, padding: 22, textAlign: 'center', color: '#9197a3' }}>No edited bookings in this period.</div>;
  const fmtAt = (s) => { const d = new Date(s); return isNaN(d) ? (s || '—') : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  return (
    <div style={{ ...card, padding: 0, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
        <thead><tr>{['', 'Booking No', 'Link No', 'Module', 'Customer', 'Sale', 'Status', 'Edits', 'Last edited', 'Last reason'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => {
            const isOpen = open === 'edit:' + r.id;
            return (
              <React.Fragment key={r.id}>
                <tr onClick={() => setOpen(isOpen ? null : 'edit:' + r.id)} style={{ cursor: 'pointer', background: isOpen ? '#fbfcfe' : '#fff' }}>
                  <td style={{ ...td, color: GOLD, fontWeight: 800 }}>{isOpen ? '▾' : '▸'}</td>
                  <td style={{ ...td, fontWeight: 700, color: BLUE }}>{r.bookingNo}</td>
                  <td style={{ ...td, fontFamily: 'monospace', color: '#5b616e' }}>{r.linkNo || '—'}</td>
                  <td style={td}>{r.module}</td>
                  <td style={{ ...td, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.customer || '—'}</td>
                  <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{cur} {Math.round(r.saleTotal || 0).toLocaleString(localeOf(cur))}</td>
                  <td style={td}><span style={{ fontSize: 10.5, fontWeight: 700, color: '#5b616e', textTransform: 'capitalize' }}>{r.status}</span></td>
                  <td style={{ ...td, textAlign: 'center' }}><span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: '#FFF6D6', color: '#8a6d12' }}>{r.edits}{r.preAudit ? '*' : ''}</span></td>
                  <td style={td}>{r.lastBy || 'unknown'} · {fmtAt(r.lastAt)}</td>
                  <td style={{ ...td, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', color: '#5b616e' }} title={r.lastReason || ''}>{r.lastReason || (r.preAudit ? '— pre-audit —' : '—')}</td>
                </tr>
                {isOpen && (
                  <tr><td colSpan={10} style={{ padding: 12, background: '#f7f8fb', borderBottom: '1px solid #cdd1d8' }}>
                    <div style={{ fontWeight: 800, fontSize: 12, color: DARK, marginBottom: 8 }}>Audit trail — {r.bookingNo}</div>
                    <AuditTrail entityType="booking" entityId={r.id} cur={cur} />
                  </td></tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
