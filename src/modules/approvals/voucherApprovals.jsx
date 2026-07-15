// ─── Voucher Approvals ────────────────────────────────────────────────────────
// Approval queue for the gated voucher types (Payment, Receipt, Contra, Journal,
// Debit Note, Purchase Expense). Manual entries AND bulk uploads land
// here as PENDING and hit the books only when approved.
// Single nested sheet: Group › Sub-group › Ledger › Entry (collapsible).
import React, { useMemo, useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../../core/api';
import { AuditTrail } from '../../core/AuditTrail';
import { JvBlock } from '../../core/voucher/JvBlock';
import { VoucherView } from '../reportsFinancial/pnlTally';
import { openPrintWindow } from '../../core/voucher-print';
import { useModalEsc } from '../../core/ux/useModalEsc';
import { confirmDialog } from '../../core/ux/confirm';
import { clickable } from '../../core/ux/clickable';
import { toast } from '../../core/ux/toast';
import { FocusBanner } from '../../core/ux/FocusBanner';
import { useNavFocusStore } from '../../core/ux/navFocus';
import { useVoucherApprovals, useApproveVoucher, useRejectVoucher, useDeleteVoucher, useRevokeVoucher, fetchRevokeCheck, useApproveMany, useApproveAll, branchCode } from '../../core/useAccounting';
import { VoucherEditor } from '../accountingLive';
import { BookingApprovals, SoPoGpVoucherEntry } from '../bookingOrder';
import { useInbDeal } from '../../core/useInterBranchVoucher';
import { bc } from '../../core/styles';
import { localeOf } from '../../core/format';
import { PeriodBar, periodRange } from '../../core/period';
import { CONSOLIDATED_LABEL } from '../../core/data';
import { SkeletonTable, SkeletonText } from '../../shell/primitives';
import { useRefundLiveAmount } from '../../core/voucher/useRefundLiveAmount';
import { useApprovalChain, nextActionFor, StageTracker } from '../../core/approvalChain';

// Full branch-currency amount (₹ India · $ USD branches) — NO Cr/L abbreviation.
// Grouping follows the currency: Indian lakh/crore for ₹, Western thousands for $.
const fmtAmount = (n, cur = '₹') => cur + Math.round(Number(n) || 0).toLocaleString(localeOf(cur));

const C = { dark: '#1a1c22', gold: '#c2a04a', blue: '#2563eb', red: '#dc2626', green: '#16a34a', dim: '#5b616e', border: '#cdd1d8' };
const VCH = { payment: 'Payment', receipt: 'Receipt', contra: 'Contra', journal: 'Journal', 'debit-note': 'Debit Note', 'purchase-expense': 'Purchase Expense', refund: 'Refund', reissue: 'Reissue', adm: 'ADM', acm: 'ACM' };
const card = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' };
const num = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
const branchLabel = (b) => (!b || b === 'ALL' ? CONSOLIDATED_LABEL : (b.code || b));
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// Dates arrive mixed (ISO "2026-01-07" and "07-01-2026") — normalise to "07 Jan 2026".
const fmtDate = (s) => {
  if (!s) return '';
  const str = String(s);
  let iso = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  let dmy = str.match(/^(\d{2})-(\d{2})-(\d{4})/);
  let dd, mm, yy;
  if (iso) { yy = iso[1]; mm = +iso[2]; dd = iso[3]; }
  else if (dmy) { dd = dmy[1]; mm = +dmy[2]; yy = dmy[3]; }
  else return str;
  return `${dd} ${MON[mm - 1] || mm} ${yy}`;
};
// Voucher double-entry summary from its postings.
const drCrOf = (e) => {
  const dr = (e.postings || []).filter((p) => (p.debit || 0) > 0);
  const cr = (e.postings || []).filter((p) => (p.credit || 0) > 0);
  const name = (legs) => (legs.length ? legs[0].ledger + (legs.length > 1 ? ` (+${legs.length - 1})` : '') : '—');
  return { drLedger: name(dr), crLedger: name(cr), drAmt: dr.reduce((s, p) => s + (p.debit || 0), 0), crAmt: cr.reduce((s, p) => s + (p.credit || 0), 0) };
};
// Amount cell for an INB refund/reissue queue row — its own component (not inlined in
// the .map()) so useRefundLiveAmount's hooks run once per row, consistently, per the
// Rules of Hooks. Mirrors the Edit modal's Live JV exactly instead of the bulk preview.
function RefundAmountCell({ entry, money }) {
  return money(useRefundLiveAmount(entry));
}

export function VoucherApprovals({ branch, currentUser, category = '' }) {
  // `category` (receipt / payment / …) turns this into a single-type approval screen:
  // the query is scoped server-side, "Voucher Type wise" is dropped (redundant), the
  // heading names the type, and Approve-all only touches that type. Empty = combined queue.
  const single = !!category;
  // Deleting a voucher is admin-only (Super Admin / Director). A Branch Accountant
  // can EDIT (which returns it to Pending for re-approval) but never delete — so the
  // Delete button is hidden for non-admins (the backend also 403s the delete).
  const isAdmin = /super.?admin|director/i.test(currentUser?.role || '');
  // Revoking un-posts a posted voucher — restricted to approver-level roles (stricter
  // than approving). The server enforces this too; this just gates the button.
  const isApprover = /super.?admin|director|senior\s+finance\s+manager|sr\.?\s*accounts\s+executive/i.test(currentUser?.role || '');
  // Three-level chain (Check → Verify → Approve): live assignee config + cache handle
  // for refreshing the queue after a Check/Verify (which don't go through the hooks).
  const chainCfg = useApprovalChain();
  const qc = useQueryClient();
  const [status, setStatus] = useState('pending');
  const [open, setOpen] = useState({});
  const [sel, setSel] = useState(() => new Set()); // selected voucher ids (multi-approve)
  const [editId, setEditId] = useState(null);      // voucher being edited (fix → approve)
  const [viewId, setViewId] = useState(null);      // voucher being viewed (read-only formatted view)
  const viewRef = useRef(null);
  const [view, setView] = useState('tree');        // entry | voucher | tree (Group-Subgroup-Ledger)
  // On a single-type screen the "Voucher Type wise" view is meaningless (one type) —
  // fall back to the tree so a stale 'voucher' selection never shows an empty view.
  const effView = single && view === 'voucher' ? 'tree' : view;
  useModalEsc(() => setViewId(null), !!viewId);     // Esc closes the view modal
  useModalEsc(() => setEditId(null), !!editId);     // Esc closes the edit modal
  const cur = (bc(branch) || {}).cur || '₹';
  const money = (n) => fmtAmount(n, cur);
  // Default to the current FY (not All): the Approved/Deleted tabs can hold thousands
  // of settled entries, and loading them all-time was ~18-40s. PENDING defaults to ALL
  // (no date filter — every pending voucher must be visible for approval, regardless of
  // its date); the large settled tabs (Approved/Rejected/Deleted) keep CFY for speed.
  // The period bar still lets you narrow/widen any tab.
  const presetFor = (s) => (s === 'pending' ? 'all' : 'cfy');
  const [range, setRange] = useState(() => periodRange('all', { branch })); // initial tab = pending → All
  // PENDING shows every pending voucher with NO date filter and NO period bar — always
  // "all" regardless of any range left over from another tab. The settled tabs use `range`.
  const effRange = status === 'pending' ? periodRange('all', { branch }) : range;
  // INB refunds/reissues are routed to the INB pipeline (InbApprovals) — exclude them
  // from this SO/PO/GP-side queue so they aren't shown (and approved) in both places.
  const q = useVoucherApprovals(branch, status, { from: effRange.from, to: effRange.to, category, refundScope: 'sopogp' });
  const d = q.data || {};
  // Vouchers edited ≥ once (cross-cuts status) — its own source for the Edited tab.
  // Uses the SAME branch resolution as every other voucher query (branchCode →
  // undefined for "ALL", which apiGet omits → all branches).
  const brCode = branchCode(branch);
  const editedQ = useQuery({ queryKey: ['voucher-edited', brCode || 'all'], queryFn: () => apiGet('/api/vouchers/edited', brCode ? { branch: brCode } : {}) });
  // The edited feed spans all types; a single-type screen shows only its own edits.
  const editedRows = useMemo(() => (single ? (editedQ.data || []).filter((r) => r.category === category) : (editedQ.data || [])), [editedQ.data, single, category]);
  const counts = {
    ...(d.counts || { pending: { n: 0, amount: 0 }, approved: { n: 0, amount: 0 }, rejected: { n: 0, amount: 0 }, deleted: { n: 0, amount: 0 } }),
    edited: { n: editedRows.length, amount: editedRows.reduce((s, r) => s + (r.total || 0), 0) },
  };
  const entries = d.entries || [];
  // ── Search + latest-first ordering ──────────────────────────────────────────
  // One box filters the visible list (every view) by Vch No, party, type, entered-by,
  // narration, any posting ledger, or amount. Order is newest-date-first throughout.
  const [search, setSearch] = useState('');
  const [onlyFlagged, setOnlyFlagged] = useState(false); // "needs fixing" filter — show only un-approvable pending vouchers
  React.useEffect(() => { setOnlyFlagged(false); }, [status]); // reset when leaving the Pending tab
  const needle = search.trim().toLowerCase();
  const matchEntry = (e) => {
    if (!needle) return true;
    const legs = e.postings || [];
    const hay = [
      e.vno, e.party, VCH[e.category] || e.category, e.type, e.narration, e.submittedBy,
      String(Math.round(e.total || 0)),
      ...legs.map((p) => p.ledger),
      ...legs.map((p) => (p.debit ? String(Math.round(p.debit)) : p.credit ? String(Math.round(p.credit)) : '')),
    ].filter(Boolean).join(' ').toLowerCase();
    return hay.includes(needle);
  };
  const searchedEntries = useMemo(() => (needle ? entries.filter(matchEntry) : entries), [entries, needle]); // eslint-disable-line react-hooks/exhaustive-deps
  // Pending vouchers the verification gate blocks (postable=false) — e.g. an untagged
  // Flight/Holiday needing International/Domestic. Count feeds the toolbar chip; the filter
  // (when on) shows ONLY these so the team can clear the blocked list. Every view builds off
  // visibleEntries, so this filters all of them (and select-all) at once.
  const flaggedCount = status === 'pending' ? searchedEntries.filter((e) => !e.postable).length : 0;
  const visibleEntries = useMemo(() => (status === 'pending' && onlyFlagged ? searchedEntries.filter((e) => !e.postable) : searchedEntries), [searchedEntries, onlyFlagged, status]);
  // Auto-clear the filter once nothing is flagged, so clearing the list to zero never leaves
  // the filter stuck ON (hiding the remaining pending vouchers behind a vanished chip).
  React.useEffect(() => { if (flaggedCount === 0 && onlyFlagged) setOnlyFlagged(false); }, [flaggedCount, onlyFlagged]);
  // Newest first: date desc, then Vch No desc (numeric-aware) as a stable tiebreak.
  const cmpLatest = (a, b) => String(b.date || '').localeCompare(String(a.date || '')) || String(b.vno || '').localeCompare(String(a.vno || ''), undefined, { numeric: true });
  // Edited tab: same search, ordered most-recently-edited first.
  const visibleEdited = useMemo(() => {
    const list = needle
      ? editedRows.filter((r) => [r.vno, VCH[r.category] || r.type, r.party, r.lastBy, r.lastReason, String(Math.round(r.total || 0))].filter(Boolean).join(' ').toLowerCase().includes(needle))
      : editedRows;
    return [...list].sort((a, b) => String(b.lastAt || '').localeCompare(String(a.lastAt || '')));
  }, [editedRows, needle]);
  const approve = useApproveVoucher();
  const reject = useRejectVoucher();
  const del = useDeleteVoucher();
  const revoke = useRevokeVoucher();
  const approveMany = useApproveMany();
  const approveAll = useApproveAll();
  const busy = approve.isPending || reject.isPending || del.isPending || revoke.isPending || approveMany.isPending || approveAll.isPending;

  // P3 deep-link: opened from an Alert targeting voucher(s) → jump to the flagged
  // status and auto-open the first unpostable voucher's editor (once per focus).
  // The flagged vnos are highlighted in the list. Focus persists (banner stays)
  // until dismissed; the openedRef stops it re-opening after the modal is closed.
  const navFocus = useNavFocusStore((s) => s.focus);
  const fp = navFocus && navFocus.params && navFocus.params.kind === 'voucher' ? navFocus.params : null;
  const flagged = useMemo(() => new Set(fp?.sample || []), [fp]);
  const openedRef = useRef(null);
  React.useEffect(() => {
    if (!fp) return;
    if (fp.status && fp.status !== status) setStatus(fp.status);
    if (fp.open && openedRef.current !== fp.open) { openedRef.current = fp.open; setEditId(fp.open); }
  }, [fp]); // eslint-disable-line react-hooks/exhaustive-deps

  const allIds = useMemo(() => [...new Set(visibleEntries.map((e) => e.id))], [visibleEntries]);
  React.useEffect(() => { setSel(new Set()); }, [status, branch]); // clear selection on tab/branch change
  const toggleSel = (id) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAllSel = () => setSel((s) => (s.size === allIds.length ? new Set() : new Set(allIds)));

  const doApprove = (id) => approve.mutate({ id, approver: 'admin' }, { onSuccess: () => toast('Voucher approved & posted'), onError: (e) => toast(e?.message || 'Approve failed', 'error') });
  // Levels 1 & 2 of the three-level chain (no books impact). The server enforces
  // stage order + who may act; these buttons only route the click.
  const doReview = async (id, action) => {
    try {
      await apiPost(`/api/vouchers/${id}/review`, { action });
      toast(action === 'check' ? 'Checked (level 1) — awaiting Verify' : 'Verified (level 2) — awaiting final Approval');
      qc.invalidateQueries({ queryKey: ['vouchers'] });
    } catch (e) { toast(e?.message || `${action} failed`, 'error'); }
  };
  const doReviewSelected = async (action) => {
    if (!sel.size) return;
    try {
      const res = await apiPost('/api/vouchers/review-many', { ids: [...sel], action });
      setSel(new Set());
      const d = res?.done ?? 0, f = res?.failed ?? 0;
      toast(f > 0 ? `${action === 'check' ? 'Checked' : 'Verified'} ${d} · ${f} failed${res?.errors?.[0] ? ` — ${res.errors[0]}` : ''}` : `${action === 'check' ? 'Checked' : 'Verified'} ${d} voucher(s)`, f > 0 ? 'error' : undefined);
      qc.invalidateQueries({ queryKey: ['vouchers'] });
    } catch (e) { toast(e?.message || `${action} failed`, 'error'); }
  };
  const doReject = async (id) => {
    const { confirmed, reason } = await confirmDialog({ title: 'Reject voucher?', message: 'It will be marked Rejected (no books impact).', danger: true, reasonRequired: true, reasonLabel: 'Reason for rejection', confirmLabel: 'Reject' });
    if (confirmed) reject.mutate({ id, by: 'admin', reason }, { onSuccess: () => toast('Voucher rejected'), onError: (e) => toast(e?.message || 'Reject failed', 'error') });
  };
  const doDelete = async (id) => {
    // A pending voucher hasn't posted, so there's nothing to reverse — only the
    // approved-tab delete unwinds the books. Either way the number is burned.
    const pending = status === 'pending';
    const { confirmed, reason } = await confirmDialog({ title: 'Delete voucher?', message: pending ? 'It will be removed from Pending and kept view-only under Deleted — its number can never be reused.' : 'It will be reversed out of the books and kept view-only — its number can never be reused.', danger: true, reasonRequired: true, reasonLabel: 'Reason for deletion', confirmLabel: 'Delete' });
    if (confirmed) del.mutate({ id, by: 'admin', reason }, { onSuccess: () => toast(pending ? 'Voucher deleted' : 'Voucher deleted & reversed'), onError: (e) => toast(e?.message || 'Delete failed', 'error') });
  };
  // Revoke (un-approve) → Pending. Runs the server preflight first so the dialog shows
  // the exact blast radius (journal rows un-posted + any warnings) before committing; a
  // hard block (locked / bank-reconciled / live refund) is surfaced and stops the action.
  const doRevoke = async (id) => {
    let pre = null;
    try { pre = await fetchRevokeCheck(id); } catch (e) { toast(e?.message || 'Could not check this voucher', 'error'); return; }
    if (pre && (pre.blocks || []).length) { toast(`Can't revoke — ${pre.blocks.map((b) => b.msg).join(' ')}`, 'error'); return; }
    const warns = (pre?.warnings || []).map((w) => w.msg).filter(Boolean);
    const rows = pre?.journalRows ? `This un-posts ${pre.journalRows} journal row${pre.journalRows === 1 ? '' : 's'}. ` : '';
    const { confirmed, reason } = await confirmDialog({
      title: 'Revoke voucher?',
      message: `${rows}It returns to Pending for editing & re-approval (the number is kept).${warns.length ? ' Note: ' + warns.join(' ') : ''}`,
      danger: true, reasonRequired: true, reasonLabel: 'Reason for revoke', confirmLabel: 'Revoke',
    });
    if (confirmed) revoke.mutate({ id, reason }, { onSuccess: () => toast('Voucher revoked → Pending'), onError: (e) => toast(e?.message || 'Revoke failed', 'error') });
  };
  const doApproveSelected = async () => {
    if (!sel.size) return;
    const { confirmed } = await confirmDialog({ title: `Approve ${sel.size} voucher(s)?`, message: 'They will post to the books.', confirmLabel: 'Approve' });
    if (confirmed) approveMany.mutate({ ids: [...sel], approver: 'admin' }, {
      // Read the server tally instead of blindly claiming success — some may fail the
      // posting gate / be out of branch scope. Surface "Approved X of Y · N failed (why)".
      onSuccess: (res) => {
        setSel(new Set());
        const a = res?.approved ?? 0, f = res?.failed ?? 0, t = res?.total ?? a + f;
        if (f > 0) {
          const why = (res?.errors || []).map((e) => e?.error).filter(Boolean).slice(0, 2).join(' · ');
          toast(`Approved ${a} of ${t} · ${f} failed${why ? ` — ${why}` : ''}`, 'error');
        } else { toast(`Approved ${a} voucher(s)`); }
      },
      onError: (e) => toast(e?.message || 'Approve failed', 'error'),
    });
  };
  const doApproveAll = async () => {
    const { confirmed } = await confirmDialog({ title: `Approve all ${counts.pending.n} pending vouchers?`, message: `For ${branchLabel(branch)}. They will post to the books.`, confirmLabel: 'Approve all' });
    if (confirmed) approveAll.mutate({ branch, category, approver: 'admin' }, {
      onSuccess: (res) => {
        const a = res?.approved ?? 0, f = res?.failed ?? 0, t = res?.total ?? a + f;
        if (f > 0) toast(`Approved ${a} of ${t} · ${f} failed`, 'error');
        else toast(`Approved all ${a} pending voucher(s)`);
      },
      onError: (e) => toast(e?.message || 'Approve failed', 'error'),
    });
  };

  // Build the nested tree: Group › Sub-group › Ledger › Entries (one row per
  // posting leg, so a voucher appears under each ledger it touches).
  const { tree, allKeys } = useMemo(() => {
    const groups = {}; const allKeys = [];
    const bump = (o, p) => { o.debit += p.debit || 0; o.credit += p.credit || 0; };
    visibleEntries.forEach((e) => {
      // Entries that can't build a posting (e.g. don't balance) still surface here,
      // under a "Needs attention" node, so they can be reviewed/rejected (not hidden).
      const pts = (e.postings && e.postings.length) ? e.postings
        : [{ group: '⚠ Needs attention', subGroup: 'Cannot post — review / fix import / reject', ledger: e.party || '—', debit: 0, credit: 0 }];
      pts.forEach((p) => {
        const gName = p.group || '—', sName = p.subGroup || gName, lName = p.ledger || '—';
        const g = groups[gName] || (groups[gName] = { name: gName, subs: {}, debit: 0, credit: 0 }); bump(g, p);
        const s = g.subs[sName] || (g.subs[sName] = { name: sName, ledgers: {}, debit: 0, credit: 0 }); bump(s, p);
        const l = s.ledgers[lName] || (s.ledgers[lName] = { name: lName, entries: [], debit: 0, credit: 0 }); bump(l, p);
        l.entries.push({ ...e, legDebit: p.debit || 0, legCredit: p.credit || 0, legNarration: p.narration || e.narration });
      });
    });
    const out = Object.values(groups).sort((a, b) => (b.debit + b.credit) - (a.debit + a.credit)).map((g) => {
      allKeys.push('g:' + g.name);
      const subs = Object.values(g.subs).sort((a, b) => (b.debit + b.credit) - (a.debit + a.credit)).map((s) => {
        allKeys.push('s:' + g.name + '/' + s.name);
        const ledgers = Object.values(s.ledgers).sort((a, b) => (b.debit + b.credit) - (a.debit + a.credit)).map((l) => {
          allKeys.push('l:' + g.name + '/' + s.name + '/' + l.name);
          return { ...l, entries: l.entries.sort(cmpLatest) };
        });
        return { ...s, ledgers };
      });
      return { ...g, subs };
    });
    return { tree: out, allKeys };
  }, [visibleEntries]); // eslint-disable-line react-hooks/exhaustive-deps

  const isOpen = (k, def) => (open[k] === undefined ? def : open[k]);
  const toggle = (k, def) => setOpen((s) => ({ ...s, [k]: !(s[k] === undefined ? def : s[k]) }));
  const setAll = (v) => setOpen(Object.fromEntries(allKeys.map((k) => [k, v])));
  const setMany = (keys, v) => setOpen((s) => ({ ...s, ...Object.fromEntries(keys.map((k) => [k, v])) }));

  const tab = (k, label) => (
    <button key={k} onClick={() => setStatus(k)} className="max-tablet:min-h-[44px]" style={{ padding: '8px 16px', borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: `3px solid ${status === k ? C.gold : 'transparent'}`, background: 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: status === k ? C.dark : C.dim }}>
      {label} <span style={{ fontSize: 11, color: C.dim }}>({counts[k]?.n || 0} · {money(counts[k]?.amount || 0)})</span>
    </button>
  );
  const amt = (dr, cr) => (dr ? <span style={{ color: C.blue }}>{money(dr)} Dr</span> : cr ? <span style={{ color: C.red }}>{money(cr)} Cr</span> : '');
  const Caret = ({ o }) => <span style={{ color: C.gold, width: 12, display: 'inline-block' }}>{o ? '▾' : '▸'}</span>;

  // ── Shared bits for the flat (Entry wise / Voucher wise) tables ──────────────
  const flatEntries = useMemo(() => [...visibleEntries].sort(cmpLatest), [visibleEntries]); // eslint-disable-line react-hooks/exhaustive-deps
  // Total Debit & Total Credit across the shown vouchers — both equal the header
  // total. (A purchase with TDS credits the supplier NET; the TDS posts to Duties &
  // Taxes — so the supplier leg alone reads less than the gross header by the TDS.)
  const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
  const totDr = useMemo(() => r2(flatEntries.reduce((s, e) => s + (e.postings || []).reduce((a, p) => a + (p.debit || 0), 0), 0)), [flatEntries]);
  const totCr = useMemo(() => r2(flatEntries.reduce((s, e) => s + (e.postings || []).reduce((a, p) => a + (p.credit || 0), 0), 0)), [flatEntries]);
  const totalsFoot = (cols) => (
    <tfoot><tr style={{ fontWeight: 800, background: '#eef3fb', borderTop: `2px solid ${C.border}` }}>
      <td style={{ ...flatTd, color: C.dark }} colSpan={cols}>Total · {flatEntries.length} voucher{flatEntries.length === 1 ? '' : 's'}</td>
      <td style={{ ...flatTd, textAlign: 'right', color: C.blue }}>{money(totDr)}</td>
      <td style={{ ...flatTd, textAlign: 'right', color: C.red }}>{money(totCr)}</td>
      <td style={flatTd} colSpan={2}></td>
    </tr></tfoot>
  );
  const flatTh = { padding: '6px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.3, borderBottom: `2px solid ${C.border}`, position: 'sticky', top: 0, background: '#f3f6fb', whiteSpace: 'nowrap' };
  const flatTd = { padding: '6px 10px', borderBottom: '1px solid #dfe2e7', whiteSpace: 'nowrap', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis' };
  const ABTN = (col, filled) => ({ padding: '3px 9px', background: filled ? col : '#fff', color: filled ? '#fff' : col, border: filled ? 'none' : `1px solid ${col}`, borderRadius: 5, fontWeight: 700, fontSize: 10.5, cursor: 'pointer', marginRight: 5 });
  const ckbox = (e) => (status === 'pending' ? <input type="checkbox" checked={sel.has(e.id)} onChange={() => toggleSel(e.id)} onClick={(ev) => ev.stopPropagation()} style={{ marginRight: 6, verticalAlign: 'middle', cursor: 'pointer' }} /> : null);
  // Combined blocking alert (preview build error + verification-gate errors) and the
  // soft warnings, for the narration cell + the Approve tooltip.
  const alertOf = (e) => [e.error, ...((e.errors) || [])].filter(Boolean).join(' · ');
  const warnOf = (e) => ((e.warnings) || []).filter(Boolean).join(' · ');
  const actionCell = (e) => (
    status === 'pending' ? (
      <>
        <StageTracker e={e} />
        <button onClick={() => setEditId(e.id)} disabled={busy} style={{ ...ABTN(C.blue), marginLeft: 6 }}>Edit</button>
        {(() => {
          // Stage-aware action: Check (L1, anyone in branch) → Verify (L2) → Approve & Post (L3).
          const na = nextActionFor(e, chainCfg);
          if (na.action !== 'approve') {
            return <button onClick={() => doReview(e.id, na.action)} disabled={busy || !na.allowed} title={na.hint} style={{ ...ABTN(na.action === 'check' ? C.blue : C.gold, true), background: na.allowed ? (na.action === 'check' ? C.blue : C.gold) : '#cfd6e4', cursor: na.allowed ? 'pointer' : 'not-allowed' }}>{na.label}</button>;
          }
          const ok = e.postable && na.allowed;
          return <button onClick={() => doApprove(e.id)} disabled={busy || !ok} title={!na.allowed ? na.hint : (e.postable ? 'Level 3 — posts to the books' : (alertOf(e) || 'Fix the error (Edit) before approving'))} aria-label={ok ? undefined : `Approve disabled — ${!na.allowed ? na.hint : (alertOf(e) || 'fix the error (Edit) first')}`} style={{ ...ABTN(C.green, true), background: ok ? C.green : '#cfd6e4', cursor: ok ? 'pointer' : 'not-allowed' }}>Approve</button>;
        })()}
        <button onClick={() => doReject(e.id)} disabled={busy} style={ABTN(C.red)}>Reject</button>
        {isAdmin && <button onClick={() => doDelete(e.id)} disabled={busy} title="Delete — remove from Pending, view-only (number not reusable)" style={ABTN(C.red, true)}>Delete</button>}
      </>
    ) : status === 'approved' ? (
      <>
        {isApprover && <button onClick={() => doRevoke(e.id)} disabled={busy} title="Revoke — un-post this voucher and return it to Pending so it can be edited & re-approved (number kept)" style={ABTN(C.gold)}>Revoke</button>}
        {isAdmin && <button onClick={() => doDelete(e.id)} disabled={busy} title="Reverse out of the books → view-only (number not reusable)" style={ABTN(C.red)}>Delete</button>}
      </>
    ) : status === 'deleted' ? (
      <span title={e.deletedReason || ''} style={{ fontSize: 10, fontWeight: 700, color: C.dim }}>🗑 {e.deletedBy || 'deleted'}</span>
    ) : <span style={{ fontSize: 10, fontWeight: 700, color: C.red }}>✗ rejected</span>
  );
  // "Revoked — was posted" chip: an entry that was approved then revoked back to Pending
  // (vs a freshly-entered one). Shows who/why on hover from the live revoke trail.
  const RevokedChip = ({ e }) => (e.revokedAt ? <span title={`Revoked${e.revokedBy ? ' by ' + e.revokedBy : ''}${e.revokeReason ? ' — ' + e.revokeReason : ''}`} style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 20, background: '#FBF3DE', color: '#8a6d12', border: '1px solid #e3cd97', whiteSpace: 'nowrap' }}>⟲ Revoked</span> : null);
  const vnoCell = (e, show = true) => <td {...(show ? clickable(() => setViewId(e.id)) : {})} title={show ? 'View full voucher' : ''} style={{ ...flatTd, color: C.blue, fontWeight: 700, cursor: show ? 'pointer' : 'default', textDecoration: show ? 'underline' : 'none', background: flagged.has(e.vno) ? '#FFF6D6' : undefined }}>{show ? e.vno : ''}{show && status === 'pending' ? <RevokedChip e={e} /> : null}</td>;

  // A single voucher row + the shared header (used by the Voucher-Type-wise groups).
  // One voucher in the "Voucher" view: a header (select · date · vno · type · party ·
  // actions) above its full JV rendered by the shared JvBlock T-account — so the
  // approval list shows the same side-by-side Dr/Cr layout as every other JV view.
  const voucherJvCard = (e) => {
    const al = alertOf(e), wn = warnOf(e);
    const hasLegs = e.postable && e.postings && e.postings.length;
    return (
      <div key={e.id} style={{ padding: '10px 12px', borderTop: '1px solid #dfe2e7', background: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
          {ckbox(e)}
          <span style={{ color: C.dim, fontSize: 11.5, whiteSpace: 'nowrap' }}>{fmtDate(e.date)}</span>
          <span {...clickable(() => setViewId(e.id))} title="View full voucher" style={{ color: C.blue, fontWeight: 800, cursor: 'pointer', textDecoration: 'underline', background: flagged.has(e.vno) ? '#FFF6D6' : undefined }}>{e.vno}</span>
          <span style={{ color: C.dim, fontSize: 11.5 }}>{VCH[e.category] || e.type}</span>
          <span style={{ fontWeight: 600, color: C.dark }} title={e.party}>{e.party || '—'}</span>
          {e.submittedBy && <span style={{ color: C.dim, fontSize: 10.5, fontStyle: 'italic', whiteSpace: 'nowrap' }} title="Entered by">✎ {e.submittedBy}</span>}
          <span style={{ marginLeft: 'auto' }}>{actionCell(e)}</span>
        </div>
        {(al || wn) && <div style={{ fontSize: 11, color: al ? C.red : '#9a6a00', marginBottom: 6, fontStyle: 'italic' }}>⚠ {al || wn}</div>}
        {hasLegs
          ? <JvBlock postings={e.postings} />
          : <div style={{ fontSize: 11.5, color: C.red, padding: 8, background: '#fff6f6', borderRadius: 6 }}>No postings — {e.error || 'needs attention'}.</div>}
      </div>
    );
  };

  // Voucher Type wise — vouchers grouped by type (Receipt / Payment / …), collapsible.
  const TYPE_ORDER = ['receipt', 'payment', 'contra', 'journal', 'debit-note', 'purchase-expense'];
  const byType = useMemo(() => {
    const m = {};
    flatEntries.forEach((e) => { (m[e.category] = m[e.category] || []).push(e); });
    return Object.keys(m).sort((a, b) => TYPE_ORDER.indexOf(a) - TYPE_ORDER.indexOf(b)).map((cat) => {
      let dr = 0, cr = 0; m[cat].forEach((e) => { const x = drCrOf(e); dr += x.drAmt || 0; cr += x.crAmt || 0; });
      return { cat, rows: m[cat], debit: r2(dr), credit: r2(cr) };
    });
  }, [flatEntries]);
  const typeKeys = byType.map((g) => 't:' + g.cat);
  const voucherTypeWise = () => (
    <div>
      {byType.map((g) => {
        const tk = 't:' + g.cat, tOpen = isOpen(tk, true);
        return (
          <div key={tk}>
            <div {...clickable(() => toggle(tk, true))} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#eef3fb', borderTop: '1px solid #dbe5f3', cursor: 'pointer', fontWeight: 800, color: C.dark }}>
              <Caret o={tOpen} /><span>{VCH[g.cat] || g.cat}</span>
              <span style={{ fontSize: 11, color: C.dim, fontWeight: 600 }}>· {g.rows.length} voucher{g.rows.length === 1 ? '' : 's'}</span>
              <span style={{ marginLeft: 'auto', ...num }}>{money(g.debit)} Dr · {money(g.credit)} Cr</span>
            </div>
            {tOpen && <div>{g.rows.map((e) => voucherJvCard(e))}</div>}
          </div>
        );
      })}
    </div>
  );

  // Entry wise — one row per Dr/Cr posting leg (grouped under its voucher).
  const entryWise = () => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
      <thead><tr>{['Date', 'Vch No', 'Type', 'Entered by', 'Ledger', 'Group', 'Sub-group', 'Debit', 'Credit', 'Narration', 'Action'].map((h) => <th key={h} style={{ ...flatTh, textAlign: h === 'Debit' || h === 'Credit' ? 'right' : h === 'Action' ? 'center' : 'left' }}>{h}</th>)}</tr></thead>
      <tbody>
        {flatEntries.flatMap((e) => {
          const legs = (e.postable && e.postings && e.postings.length) ? e.postings : [{ ledger: e.party || '—', group: '⚠ Needs attention', subGroup: '', debit: 0, credit: 0, narration: e.error || '' }];
          return legs.map((p, li) => (
            <tr key={e.id + ':' + li} style={{ background: '#fff', borderTop: li === 0 ? '1px solid #dfe2e7' : 'none' }}>
              <td style={{ ...flatTd, color: C.dim }}>{li === 0 ? <>{ckbox(e)}{fmtDate(e.date)}</> : ''}</td>
              {li === 0 ? vnoCell(e) : <td style={flatTd}></td>}
              <td style={{ ...flatTd, color: C.dim }}>{li === 0 ? (VCH[e.category] || e.type) : ''}</td>
              <td style={{ ...flatTd, color: C.dim }} title={li === 0 ? `Entered by ${e.submittedBy || '—'}` : ''}>{li === 0 ? (e.submittedBy || '—') : ''}</td>
              <td style={{ ...flatTd, fontWeight: 600, color: C.dark }} title={p.ledger}>{p.ledger}</td>
              <td style={{ ...flatTd, color: C.dim }} title={p.group}>{p.group}</td>
              <td style={{ ...flatTd, color: C.dim }} title={p.subGroup || p.group}>{p.subGroup || p.group}</td>
              <td style={{ ...flatTd, textAlign: 'right', color: C.blue }}>{p.debit ? money(p.debit) : ''}</td>
              <td style={{ ...flatTd, textAlign: 'right', color: C.red }}>{p.credit ? money(p.credit) : ''}</td>
              <td style={{ ...flatTd, color: (li === 0 && alertOf(e)) ? C.red : C.dim, fontStyle: 'italic' }} title={p.narration || (li === 0 ? (alertOf(e) || warnOf(e)) : '') || e.narration || ''}>{p.narration || (li === 0 ? (alertOf(e) ? `⚠ ${alertOf(e)}` : warnOf(e) ? `⚠ ${warnOf(e)}` : e.narration) : '') || ''}</td>
              <td style={{ ...flatTd, textAlign: 'center' }}>{li === 0 ? actionCell(e) : ''}</td>
            </tr>
          ));
        })}
      </tbody>
      {totalsFoot(7)}
    </table>
  );

  // Columnar per module — one table per voucher category. Columns = the union of
  // every component head (non-party posting ledger) any voucher of that module
  // uses, so each module shows its FULL column set; a head a given voucher doesn't
  // use shows 0 (column never hidden). Party (debtor) + Supplier (creditor) get
  // their own columns. Branch tags ([BOM]…) are trimmed from headers (full name on
  // hover); [Pur] is kept so sale vs purchase heads stay distinct.
  const shortHead = (h) => String(h).replace(/\s*\[(BOMMB|BOM|AMD|NBO|DAR|FBM)\]/gi, '').trim();
  const columnarWise = () => {
    const byCat = {};
    flatEntries.forEach((e) => { (byCat[e.category] || (byCat[e.category] = [])).push(e); });
    const cats = Object.keys(byCat).sort((a, b) => {
      const ia = TYPE_ORDER.indexOf(a), ib = TYPE_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    const isPartyLeg = (e, p) => p.ledger === e.party || p.ledger === e.counterParty;
    return (
      <div>
        {cats.map((cat) => {
          const list = byCat[cat];
          const heads = [];
          list.forEach((e) => (e.postings || []).forEach((p) => {
            if (p.ledger && !isPartyLeg(e, p) && !heads.includes(p.ledger)) heads.push(p.ledger);
          }));
          const hasSupplier = list.some((e) => e.counterParty);
          const cellOf = (e, head) => r2((e.postings || []).reduce((v, p) => v + (p.ledger === head ? (p.debit || 0) - (p.credit || 0) : 0), 0));
          return (
            <div key={cat} style={{ marginBottom: 16, overflowX: 'auto' }}>
              <div style={{ fontWeight: 800, color: C.dark, fontSize: 12.5, margin: '10px 0 4px' }}>
                {VCH[cat] || cat} <span style={{ color: C.dim, fontWeight: 600, fontSize: 11 }}>· {list.length} voucher{list.length === 1 ? '' : 's'}</span>
              </div>
              <table style={{ borderCollapse: 'collapse', fontSize: 11, minWidth: '100%' }}>
                <thead><tr>
                  <th style={flatTh}>Date</th>
                  <th style={flatTh}>Vch No</th>
                  <th style={flatTh}>Party</th>
                  {hasSupplier && <th style={flatTh}>Supplier</th>}
                  {heads.map((h) => <th key={h} style={{ ...flatTh, textAlign: 'right' }} title={h}>{shortHead(h)}</th>)}
                  <th style={{ ...flatTh, textAlign: 'right' }}>Total</th>
                  <th style={{ ...flatTh, textAlign: 'center' }}>Action</th>
                </tr></thead>
                <tbody>
                  {list.map((e) => {
                    const tot = r2((e.postings || []).reduce((s, p) => s + (p.debit || 0), 0));
                    return (
                      <tr key={e.id} style={{ background: '#fff', borderTop: '1px solid #dfe2e7' }}>
                        <td style={{ ...flatTd, color: C.dim }}>{ckbox(e)}{fmtDate(e.date)}</td>
                        <td {...clickable(() => setViewId(e.id))} title="View full voucher" style={{ ...flatTd, whiteSpace: 'normal', maxWidth: 260, overflow: 'visible', color: C.blue, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', background: flagged.has(e.vno) ? '#FFF6D6' : undefined }}>{e.vno}{status === 'pending' && !e.postable && alertOf(e) ? <div style={{ marginTop: 2, fontSize: 10, fontWeight: 700, fontStyle: 'italic', color: C.red, textDecoration: 'none' }}>⚠ {alertOf(e)}</div> : null}</td>
                        <td style={flatTd} title={e.party}>{e.party || '—'}</td>
                        {hasSupplier && <td style={flatTd} title={e.counterParty}>{e.counterParty || '—'}</td>}
                        {heads.map((h) => {
                          const v = cellOf(e, h);
                          return <td key={h} style={{ ...flatTd, ...num, color: v > 0 ? C.blue : v < 0 ? C.red : '#c2c8da' }}>{v ? money(Math.abs(v)) : '0'}</td>;
                        })}
                        <td style={{ ...flatTd, ...num, fontWeight: 700, color: C.dark }}>{money(tot)}</td>
                        <td style={{ ...flatTd, textAlign: 'center' }}>{actionCell(e)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ margin: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <div>
          <div className="kbiz-page-title">{single ? `${VCH[category] || category} Approvals` : 'Voucher Approvals'}</div>
          <div style={{ fontSize: 12, color: C.dim }}>{branchLabel(branch)} · {single ? `${VCH[category] || category} vouchers` : 'Payment · Receipt · Contra · Journal · Debit Note · Purchase Expense'} — manual & bulk post only when approved</div>
        </div>
        {status !== 'pending' && (
          <PeriodBar key={status} branch={branch} compact defaultPreset={presetFor(status)} onChange={setRange} />
        )}
        {status === 'pending' && counts.pending.n > 0 && (
          <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8 }}>
            {sel.size > 0 && (
              <>
                {/* Bulk levels 1 & 2 — the server skips already-done / wrong-stage /
                    wrong-user entries and reports the tally. */}
                <button onClick={() => doReviewSelected('check')} disabled={busy} className="max-tablet:min-h-[44px]" style={{ padding: '8px 12px', background: '#fff', color: C.blue, border: `1px solid ${C.blue}`, borderRadius: 6, fontWeight: 700, fontSize: 12.5, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                  Check selected ({sel.size})
                </button>
                <button onClick={() => doReviewSelected('verify')} disabled={busy} className="max-tablet:min-h-[44px]" style={{ padding: '8px 12px', background: '#fff', color: C.gold, border: `1px solid ${C.gold}`, borderRadius: 6, fontWeight: 700, fontSize: 12.5, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                  Verify selected ({sel.size})
                </button>
              </>
            )}
            {sel.size > 0 && (
              <button onClick={doApproveSelected} disabled={busy} aria-busy={busy || undefined} className="max-tablet:min-h-[44px]" style={{ padding: '8px 16px', background: C.blue, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12.5, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}>
                {busy ? `⏳ Approving ${sel.size}…` : `✓ Approve selected (${sel.size})`}
              </button>
            )}
            <button onClick={doApproveAll} disabled={busy} aria-busy={busy || undefined} className="max-tablet:min-h-[44px]" style={{ padding: '8px 16px', background: C.green, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12.5, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}>
              {busy ? `⏳ Approving ${counts.pending.n}…` : `✓ Approve all ${counts.pending.n} pending`}
            </button>
          </div>
        )}
      </div>

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
          {tab('pending', 'Pending')}{tab('approved', 'Approved')}{tab('rejected', 'Rejected')}{tab('deleted', 'Deleted')}{tab('edited', 'Edited')}
        </div>
        <div style={{ display: 'flex', gap: 10, padding: '8px 12px', borderBottom: `1px solid ${C.border}`, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '0 1 380px', minWidth: 220 }}>
            <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: C.dim, pointerEvents: 'none' }}>🔍</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Vch No · party · ledger · narration · amount…"
              aria-label="Search vouchers"
              style={{ width: '100%', padding: '6px 26px 6px 28px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, outline: 'none', background: '#fff' }}
            />
            {search && <button onClick={() => setSearch('')} aria-label="Clear search" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: C.dim, fontSize: 14, lineHeight: 1 }}>✕</button>}
          </div>
          {needle && <span style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>{(status === 'edited' ? visibleEdited.length : visibleEntries.length)} match{(status === 'edited' ? visibleEdited.length : visibleEntries.length) === 1 ? '' : 'es'}</span>}
          {status === 'pending' && flaggedCount > 0 && (
            <button onClick={() => setOnlyFlagged((v) => !v)} title="Show only vouchers that can’t be approved yet — they need a fix (e.g. tag International vs Domestic) before they can post" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', fontSize: 11, fontWeight: 700, borderRadius: 6, cursor: 'pointer', border: '1px solid ' + (onlyFlagged ? '#b42318' : '#f0c2c2'), background: onlyFlagged ? '#b42318' : '#fdecec', color: onlyFlagged ? '#fff' : '#b42318' }}>⚠ {flaggedCount} need fixing{onlyFlagged ? ' · showing only these' : ''}</button>
          )}
        </div>
        {status !== 'edited' && <div style={{ display: 'flex', gap: 6, padding: '8px 12px', background: '#fafbfe', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', border: '1px solid #cdd1d8', borderRadius: 7, overflow: 'hidden' }}>
            {[['entry', 'Entry wise'], ['columnar', 'Columnar (all heads)'], ...(single ? [] : [['voucher', 'Voucher Type wise']]), ['tree', 'Group-Subgroup-Ledger-Entry']].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '5px 11px', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: effView === v ? C.blue : '#fff', color: effView === v ? '#fff' : C.dim }}>{l}</button>
            ))}
          </div>
          <span style={{ fontSize: 11, color: C.dim, fontWeight: 700 }} title="Total Debit = Total Credit = the tab total. A purchase with TDS credits the supplier net; the TDS sits in Duties & Taxes.">Σ Dr {money(totDr)} = Cr {money(totCr)}</span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6 }}>
            {status === 'pending' && allIds.length > 0 && (
              <button onClick={toggleAllSel} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${C.blue}`, borderRadius: 5, background: sel.size === allIds.length ? C.blue : '#fff', color: sel.size === allIds.length ? '#fff' : C.blue, cursor: 'pointer' }}>{sel.size === allIds.length ? '☑ Clear' : `☐ Select all (${allIds.length})`}</button>
            )}
            {(effView === 'tree' || effView === 'voucher') && <>
              <button onClick={() => setMany(effView === 'tree' ? allKeys : typeKeys, true)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${C.dark}`, borderRadius: 5, background: '#fff', color: C.dark, cursor: 'pointer' }}>⊞ Expand all</button>
              <button onClick={() => setMany(effView === 'tree' ? allKeys : typeKeys, false)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${C.dark}`, borderRadius: 5, background: '#fff', color: C.dark, cursor: 'pointer' }}>⊟ Collapse all</button>
            </>}
          </span>
          {q.isFetching && <span style={{ fontSize: 11, color: C.dim }}>updating…</span>}
        </div>}
      </div>

      {status === 'edited' ? (
        <EditedVouchersList rows={visibleEdited} isLoading={editedQ.isLoading} open={open} setOpen={setOpen} setViewId={setViewId} cur={cur} />
      ) : (
      <div style={{ ...card }}>
        {q.isLoading ? <div style={{ padding: 12 }}><SkeletonTable rows={8} cols={5} /></div> : (
          <div style={{ maxHeight: '72vh', overflow: 'auto', fontSize: 12.5 }}>
            {flatEntries.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: C.dim }}>{needle ? `No ${status} vouchers match “${search.trim()}”.` : `No ${status} vouchers.`}</div>}
            {flatEntries.length > 0 && effView === 'voucher' && voucherTypeWise()}
            {flatEntries.length > 0 && effView === 'entry' && entryWise()}
            {flatEntries.length > 0 && effView === 'columnar' && columnarWise()}
            {effView === 'tree' && tree.map((g) => {
              const gk = 'g:' + g.name, gOpen = isOpen(gk, false);
              return (
                <div key={gk}>
                  <div {...clickable(() => toggle(gk, false))} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#eef3fb', borderTop: '1px solid #dbe5f3', cursor: 'pointer', fontWeight: 800, color: C.dark }}>
                    <Caret o={gOpen} /><span style={{ textDecoration: 'underline' }}>{g.name}</span>
                    <span style={{ marginLeft: 'auto', ...num }}>{amt(g.debit, g.credit)}</span>
                  </div>
                  {gOpen && g.subs.map((s) => {
                    const sk = 's:' + g.name + '/' + s.name, sOpen = isOpen(sk, false);
                    return (
                      <div key={sk}>
                        <div {...clickable(() => toggle(sk, false))} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 28px', background: '#f6f9fd', cursor: 'pointer', fontWeight: 700, color: '#1a3a6e' }}>
                          <Caret o={sOpen} />{s.name}{s.name !== g.name ? <span style={{ fontSize: 9, padding: '1px 5px', borderRadius: 4, background: '#e7eef9', color: C.dim, fontWeight: 700 }}>sub-group</span> : null}
                          <span style={{ marginLeft: 'auto', ...num }}>{amt(s.debit, s.credit)}</span>
                        </div>
                        {sOpen && s.ledgers.map((l) => {
                          const lk = 'l:' + g.name + '/' + s.name + '/' + l.name, lOpen = isOpen(lk, false);
                          return (
                            <div key={lk}>
                              <div {...clickable(() => toggle(lk, false))} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px 6px 46px', borderBottom: '1px solid #dfe2e7', cursor: 'pointer', fontWeight: 600, color: C.dark }}>
                                <Caret o={lOpen} />{l.name}
                                <span style={{ color: C.dim, fontWeight: 400, fontSize: 11 }}>· {l.entries.length} entr{l.entries.length === 1 ? 'y' : 'ies'}</span>
                                <span style={{ marginLeft: 'auto', ...num }}>{amt(l.debit, l.credit)}</span>
                              </div>
                              {lOpen && (
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                  <thead><tr style={{ background: '#f3f6fb' }}>
                                    {[['Date', 'left', 64], ['Vch No', 'left', 8], ['Type', 'left', 8], ['Debit Ledger', 'left', 8], ['Credit Ledger', 'left', 8], ['Narration', 'left', 8], ['Debit', 'right', 8], ['Credit', 'right', 8], ['Action', 'center', 8]].map(([h, a, pl]) => (
                                      <th key={h} style={{ padding: `4px 8px 4px ${pl}px`, textAlign: a, fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.3, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                                    ))}
                                  </tr></thead>
                                  <tbody>
                                    {l.entries.map((e, i) => {
                                      const x = drCrOf(e);
                                      return (
                                      <tr key={e.id + ':' + i} style={{ background: i % 2 ? '#fcfdff' : '#fff' }}>
                                        <td style={{ padding: '5px 8px 5px 44px', whiteSpace: 'nowrap', color: C.dim, borderBottom: '1px solid #dfe2e7' }}>{status === 'pending' && <input type="checkbox" checked={sel.has(e.id)} onChange={() => toggleSel(e.id)} onClick={(ev) => ev.stopPropagation()} style={{ marginRight: 6, verticalAlign: 'middle', cursor: 'pointer' }} />}{fmtDate(e.date)}</td>
                                        <td {...clickable(() => setViewId(e.id))} title="View full voucher" style={{ padding: '5px 8px', color: C.blue, fontWeight: 700, whiteSpace: 'nowrap', borderBottom: '1px solid #dfe2e7', cursor: 'pointer', textDecoration: 'underline', background: flagged.has(e.vno) ? '#FFF6D6' : undefined }}>{e.vno}</td>
                                        <td style={{ padding: '5px 8px', color: C.dim, whiteSpace: 'nowrap', borderBottom: '1px solid #dfe2e7' }}>{VCH[e.category] || e.type}</td>
                                        <td style={{ padding: '5px 8px', fontWeight: 600, color: C.blue, borderBottom: '1px solid #dfe2e7', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={x.drLedger}>{x.drLedger}</td>
                                        <td style={{ padding: '5px 8px', fontWeight: 600, color: C.red, borderBottom: '1px solid #dfe2e7', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={x.crLedger}>{x.crLedger}</td>
                                        <td style={{ padding: '5px 8px', color: alertOf(e) ? C.red : C.dim, fontStyle: 'italic', borderBottom: '1px solid #dfe2e7', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={alertOf(e) || e.narration || e.legNarration || ''}>{alertOf(e) ? `⚠ ${alertOf(e)}` : (e.narration || e.legNarration || '—')}{e.rejectedReason ? ` · ✗ ${e.rejectedReason}` : ''}</td>
                                        <td style={{ ...num, padding: '5px 8px', color: C.blue, borderBottom: '1px solid #dfe2e7' }}>{x.drAmt ? money(x.drAmt) : ''}</td>
                                        <td style={{ ...num, padding: '5px 8px', color: C.red, borderBottom: '1px solid #dfe2e7' }}>{x.crAmt ? money(x.crAmt) : ''}</td>
                                        <td style={{ padding: '5px 8px', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid #dfe2e7' }}>
                                          {status === 'pending' ? (
                                            <>
                                              <button onClick={() => setEditId(e.id)} disabled={busy} style={{ padding: '3px 9px', background: '#fff', color: C.blue, border: `1px solid ${C.blue}`, borderRadius: 5, fontWeight: 700, fontSize: 10.5, cursor: 'pointer', marginRight: 5 }}>Edit</button>
                                              {(() => {
                                                const na = nextActionFor(e, chainCfg);
                                                if (na.action !== 'approve') return <button onClick={() => doReview(e.id, na.action)} disabled={busy || !na.allowed} title={na.hint} style={{ padding: '3px 9px', background: na.allowed ? (na.action === 'check' ? C.blue : C.gold) : '#cfd6e4', color: '#fff', border: 'none', borderRadius: 5, fontWeight: 700, fontSize: 10.5, cursor: na.allowed ? 'pointer' : 'not-allowed', marginRight: 5 }}>{na.label}</button>;
                                                const ok = e.postable && na.allowed;
                                                return <button onClick={() => doApprove(e.id)} disabled={busy || !ok} title={!na.allowed ? na.hint : (e.postable ? '' : 'Fix the error (Edit) before approving')} style={{ padding: '3px 9px', background: ok ? C.green : '#cfd6e4', color: '#fff', border: 'none', borderRadius: 5, fontWeight: 700, fontSize: 10.5, cursor: ok ? 'pointer' : 'not-allowed', marginRight: 5 }}>Approve</button>;
                                              })()}
                                              <button onClick={() => doReject(e.id)} disabled={busy} style={{ padding: '3px 9px', background: '#fff', color: C.red, border: `1px solid ${C.red}`, borderRadius: 5, fontWeight: 700, fontSize: 10.5, cursor: 'pointer', marginRight: 5 }}>Reject</button>
                                              {isAdmin && <button onClick={() => doDelete(e.id)} disabled={busy} title="Delete — remove from Pending, view-only (number not reusable)" style={{ padding: '3px 9px', background: C.red, color: '#fff', border: 'none', borderRadius: 5, fontWeight: 700, fontSize: 10.5, cursor: 'pointer' }}>Delete</button>}
                                            </>
                                          ) : status === 'approved' ? (
                                            <>
                                              {isApprover && <button onClick={() => doRevoke(e.id)} disabled={busy} title="Revoke — un-post this voucher and return it to Pending so it can be edited & re-approved (number kept)" style={{ padding: '3px 9px', background: '#fff', color: C.gold, border: `1px solid ${C.gold}`, borderRadius: 5, fontWeight: 700, fontSize: 10.5, cursor: 'pointer', marginRight: 5 }}>Revoke</button>}
                                              {isAdmin && <button onClick={() => doDelete(e.id)} disabled={busy} title="Reverse out of the books → view-only (number not reusable)" style={{ padding: '3px 9px', background: '#fff', color: C.red, border: `1px solid ${C.red}`, borderRadius: 5, fontWeight: 700, fontSize: 10.5, cursor: 'pointer' }}>Delete</button>}
                                            </>
                                          ) : status === 'deleted' ? (
                                            <span title={e.deletedReason || ''} style={{ fontSize: 10, fontWeight: 700, color: C.dim }}>🗑 {e.deletedBy || 'deleted'}</span>
                                          ) : <span style={{ fontSize: 10, fontWeight: 700, color: C.red }}>✗ rejected</span>}
                                        </td>
                                      </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
      )}
      {(approve.isError || reject.isError || approveAll.isError) && <div style={{ marginTop: 8, color: C.red, fontSize: 12 }}>⚠ {(approve.error || reject.error || approveAll.error)?.message}</div>}

      {viewId && (
        <div onClick={() => setViewId(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.5)', zIndex: 900, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '5vh 12px' }}>
          <div onClick={(ev) => ev.stopPropagation()} style={{ background: '#fff', width: 'min(760px, 96vw)', maxHeight: '90vh', overflowY: 'auto', borderRadius: 10, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: '#fff' }}>
              <strong style={{ color: C.dark }}>Voucher View</strong>
              <span style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                <button onClick={() => openPrintWindow(branch, (entries.find((e) => e.id === viewId) || {}).vno || '', 'Voucher', viewRef.current)} className="max-tablet:min-h-[44px]" style={{ padding: '5px 11px', background: C.dark, color: C.gold, border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 11.5, cursor: 'pointer' }}>🖨 Print / PDF</button>
                <button onClick={() => setViewId(null)} className="inline-flex items-center justify-center max-tablet:min-h-[44px] max-tablet:min-w-[44px]" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.dim }}>✕</button>
              </span>
            </div>
            <div ref={viewRef}><VoucherView id={viewId} cur={cur} /></div>
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}` }}>
              <div style={{ fontWeight: 800, fontSize: 12, color: C.dark, marginBottom: 8 }}>Audit Trail</div>
              <AuditTrail entityType="voucher" entityId={viewId} cur={cur} />
            </div>
          </div>
        </div>
      )}
      {editId && (
        <div onClick={async () => { const { confirmed } = await confirmDialog({ title: 'Discard changes to this voucher?', message: 'Any edits you have not saved will be lost.', confirmLabel: 'Discard', danger: true }); if (confirmed) setEditId(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.5)', zIndex: 900, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '5vh 12px' }}>
          <div role="dialog" aria-modal="true" aria-label="Edit voucher" onClick={(ev) => ev.stopPropagation()} style={{ background: '#fff', width: 'min(720px, 96vw)', maxHeight: '90vh', overflowY: 'auto', borderRadius: 10, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: '#fff' }}>
              <strong style={{ color: C.dark }}>Edit Voucher — fix &amp; approve</strong>
              <button onClick={() => setEditId(null)} aria-label="Close editor" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.dim }}>✕</button>
            </div>
            <div style={{ padding: 4 }}>
              <VoucherEditor voucherId={editId} cur={cur} onBack={() => setEditId(null)} />
            </div>
            <div style={{ padding: '8px 16px', fontSize: 11, color: C.dim, borderTop: `1px solid ${C.border}` }}>Tip: set Subtotal + GST so the total balances, Save, then click Approve on the row.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// The "Edited" tab body for Vouchers — one row per voucher edited ≥ once, expanding
// to its full audit timeline (who/when/why + field-level changes + full snapshot).
// Cross-cuts status: an approved voucher later edited shows here. Click the Vch No to
// open the full formatted voucher view (which also shows the trail).
function EditedVouchersList({ rows, isLoading, open, setOpen, setViewId, cur = '₹' }) {
  const money = (n) => fmtAmount(n, cur);
  const th = { padding: '7px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.dim, textTransform: 'uppercase', letterSpacing: 0.3, borderBottom: `2px solid ${C.border}`, whiteSpace: 'nowrap' };
  const td = { padding: '7px 10px', borderBottom: '1px solid #dfe2e7', fontSize: 12, whiteSpace: 'nowrap' };
  if (isLoading) return <div style={{ ...card, padding: 12 }}><SkeletonTable rows={5} cols={9} /></div>;
  if (!rows.length) return <div style={{ ...card, padding: 24, textAlign: 'center', color: C.dim }}>No edited vouchers.</div>;
  const fmtAt = (s) => { const dd = new Date(s); return isNaN(dd) ? (s || '—') : dd.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); };
  return (
    <div style={{ ...card, overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
        <thead><tr>{['', 'Vch No', 'Type', 'Party', 'Total', 'Status', 'Edits', 'Last edited', 'Last reason'].map((h) => <th key={h} style={th}>{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r) => {
            const isOpen = open['edit:' + r.id];
            return (
              <React.Fragment key={r.id}>
                <tr style={{ background: isOpen ? '#fbfcfe' : '#fff' }}>
                  <td {...clickable(() => setOpen((s) => ({ ...s, ['edit:' + r.id]: !s['edit:' + r.id] })))} style={{ ...td, color: C.gold, fontWeight: 800, cursor: 'pointer' }}>{isOpen ? '▾' : '▸'}</td>
                  <td {...clickable(() => setViewId(r.id))} title="View full voucher" style={{ ...td, fontWeight: 700, color: C.blue, cursor: 'pointer', textDecoration: 'underline' }}>{r.vno}</td>
                  <td style={td}>{VCH[r.category] || r.type}</td>
                  <td style={{ ...td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.party || '—'}</td>
                  <td style={{ ...num, ...td }}>{money(r.total)}</td>
                  <td style={{ ...td, textTransform: 'capitalize', color: C.dim, fontWeight: 700, fontSize: 10.5 }}>{r.status}</td>
                  <td style={{ ...td, textAlign: 'center' }}><span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 8px', borderRadius: 20, background: '#FFF6D6', color: '#8a6d12' }}>{r.edits}{r.preAudit ? '*' : ''}</span></td>
                  <td style={td}>{r.lastBy || 'unknown'} · {fmtAt(r.lastAt)}</td>
                  <td style={{ ...td, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', color: C.dim }} title={r.lastReason || ''}>{r.lastReason || (r.preAudit ? '— pre-audit —' : '—')}</td>
                </tr>
                {isOpen && (
                  <tr><td colSpan={9} style={{ padding: 12, background: '#f7f8fb', borderBottom: `1px solid ${C.border}` }}>
                    <AuditTrail entityType="voucher" entityId={r.id} cur={cur} />
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

// ─── Inter-Branch (INB SPG) Approvals ─────────────────────────────────────────
// INB SPG vouchers land here as PENDING (never auto-approved) and post to the books
// only on approval — exactly like SO/PO/GP. Each deal groups the INB SALE leg with
// its airline PURCHASE leg under one INB Link No (sourceRef); approving posts both.
// Module label from the INB-* cost centre (or the [IB] ledger group) — so the INB SPG
// grid carries a Module column just like SO/PO/GP.
const INB_MOD = { FLT: '✈ Flight', HOL: '🌴 Holiday', HOT: '🏨 Hotel', VIS: '🛂 Visa', CAR: '🚗 Car', INS: '🛡 Insurance', MISC: '📦 Misc' };
const inbModuleOf = (leg) => {
  const cc = String((leg && leg.costCenter) || '').match(/INB-([A-Z]+)/);
  if (cc && INB_MOD[cc[1]]) return INB_MOD[cc[1]] + (/-(INT)/.test(leg.costCenter) ? ' (Intl)' : /-(DOM)/.test(leg.costCenter) ? ' (Dom)' : '');
  const g = String((leg && leg.lines && leg.lines[0] && leg.lines[0].group) || '');
  if (/Flight/i.test(g)) return '✈ Flight'; if (/Holiday/i.test(g)) return '🌴 Holiday'; if (/Hotel/i.test(g)) return '🏨 Hotel';
  return '—';
};

// Expanded JV — fetches each leg's posted journal (Dr/Cr) and renders it via the shared
// JvBlock, exactly like the SO/PO/GP approval expand.
function InbDealJv({ sale, purchase }) {
  const sid = sale && (sale.id || sale._id), pid = purchase && (purchase.id || purchase._id);
  const sj = useQuery({ queryKey: ['vouchers', sid, 'journal'], queryFn: () => apiGet(`/api/vouchers/${sid}/journal`), enabled: !!sid });
  const pj = useQuery({ queryKey: ['vouchers', pid, 'journal'], queryFn: () => apiGet(`/api/vouchers/${pid}/journal`), enabled: !!pid });
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', padding: 12 }}>
      {sale && <div style={{ flex: 1, minWidth: 300 }}><JvBlock title={`INB Sale · ${sale.vno}`} sub={sale.costCenter || ''} color={C.green} postings={(sj.data && sj.data.postings) || []} /></div>}
      {purchase && <div style={{ flex: 1, minWidth: 300 }}><JvBlock title={`Airline Purchase · ${purchase.vno}`} sub={(purchase.party || '') + (purchase.costCenter ? ` · ${purchase.costCenter}` : '')} color={C.red} postings={(pj.data && pj.data.postings) || []} /></div>}
      {!purchase && <div style={{ flex: 1, minWidth: 300, alignSelf: 'center', color: C.dim, fontSize: 12 }}>No purchase leg (no-supplier / sale-only INB deal).</div>}
    </div>
  );
}

// Edit a whole INB deal on the SAME unified screen as SO/PO/GP: fetch the deal (both
// legs reconstructed into one booking-input shape), then hand it to SoPoGpVoucherEntry in
// interBranch EDIT mode. Only PENDING deals are editable — an approved deal is Revoked
// first (the backend also guards this). `onDone` returns to the INB approvals list.
function InbEditGate({ linkNo, branch, onDone }) {
  const dq = useInbDeal(linkNo);
  const wrap = (msg, tone) => (
    <div style={{ margin: 12, padding: 16, background: '#fff', border: `1px solid ${C.border}`, borderRadius: 10 }}>
      <div style={{ color: tone || C.dim, fontSize: 13, marginBottom: 10 }}>{msg}</div>
      <button onClick={onDone} style={{ padding: '7px 14px', background: C.dark, color: C.gold, border: 'none', borderRadius: 7, fontWeight: 800, cursor: 'pointer' }}>← Back to INB list</button>
    </div>
  );
  if (dq.isLoading) return wrap(<SkeletonText lines={3} />);
  if (dq.error || !dq.data) return wrap(`Could not load ${linkNo}${dq.error ? ` — ${dq.error.message}` : ''}.`, C.red);
  const deal = dq.data;
  if (!deal.editable) return wrap(`INB deal ${linkNo} is not fully pending (${deal.saleStatus}${deal.purchaseStatus ? ` / ${deal.purchaseStatus}` : ''}) — Revoke it first, then edit.`, C.gold);
  const editBooking = {
    isInterBranch: true, linkNo: deal.linkNo, bookingNo: deal.linkNo,
    branch: deal.fromBranch, toBranch: deal.toBranch, module: deal.module,
    packageType: deal.packageType, date: deal.date, headerRef: deal.reference, passenger: deal.passenger,
    noSupplier: deal.noSupplier, fareLines: deal.fareLines, serviceFee: deal.serviceFee,
    // Purchase-side detail: the Supplier Service Charge head + incentive/GST-mode live
    // here (not in fareLines) — without them the Edit grid opens blank on those fields
    // and the next save silently drops them from the rebuilt purchase leg.
    purchaseHeads: deal.purchaseHeads || [], purchase: deal.purchase || null,
    supplier: deal.supplier
      ? { name: deal.supplier.name, ledgerName: deal.supplier.ledgerName, ledgerGroup: deal.supplier.ledgerGroup }
      : { name: '', ledgerName: '', ledgerGroup: '' },
  };
  return <SoPoGpVoucherEntry branch={branch} interBranch editBooking={editBooking} onDone={onDone} />;
}

// The "Edited" tab body for INB — one row per INB voucher leg edited ≥ once, from the
// shared /api/vouchers/edited feed. Cross-cuts status (a pushed leg later edited shows
// here too), mirroring the SO/PO/GP Edited tab. Read-only summary (edits + who + when).
function InbEditedList({ rows, isLoading, money }) {
  const th = { padding: '9px 12px', fontSize: 10, fontWeight: 700, color: '#5b616e', textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: 'left' };
  const td = { padding: '7px 12px', fontSize: 12, whiteSpace: 'nowrap' };
  if (isLoading) return <SkeletonTable rows={5} cols={8} />;
  if (!rows.length) return <div style={{ padding: 22, textAlign: 'center', color: C.dim, fontSize: 12 }}>No edited INB deals.</div>;
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
      <thead><tr style={{ background: '#f3f4f8' }}>{['Vch No', 'Party', 'Amount', 'Status', 'Edits', 'Last edited by', 'When', 'Last reason'].map((h, i) => (
        <th key={i} style={{ ...th, textAlign: h === 'Amount' || h === 'Edits' ? 'right' : 'left' }}>{h}</th>))}</tr></thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} style={{ borderTop: `1px solid ${C.border}` }}>
            <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700 }}>{r.vno}</td>
            <td style={td}>{r.party || '—'}</td>
            <td style={{ ...td, ...num }}>{money(r.total || 0)}</td>
            <td style={{ ...td, color: C.dim }}>{r.status === 'saved' ? 'approved' : (r.status === 'approved' && r.pushed) ? 'pushed' : r.status}</td>
            <td style={{ ...td, ...num, fontWeight: 700 }}>{r.edits}</td>
            <td style={td}>{r.lastBy || '—'}</td>
            <td style={td}>{fmtDate(r.lastAt) || '—'}</td>
            <td style={{ ...td, color: C.dim, whiteSpace: 'normal', maxWidth: 280 }}>{r.lastReason || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function InbApprovals({ branch, setRoute, currentUser, initialSearch = '', initialStatus = '' }) {
  const brCode = branchCode(branch);
  const cur = (bc(branch) || {}).cur || '₹';
  const money = (n) => fmtAmount(n, cur);
  const isApprover = /super.?admin|director|senior\s+finance\s+manager|sr\.?\s*accounts\s+executive/i.test(currentUser?.role || '');
  const chainCfg = useApprovalChain(); // three-level chain assignees (Check → Verify → Approve)

  const [status, setStatus] = useState(initialStatus || 'pending');
  const [open, setOpen] = useState(null);     // single expanded deal key (mirrors SO/PO/GP)
  const [sel, setSel] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState(initialSearch || '');
  const [editId, setEditId] = useState(null);      // legacy: single INB leg edited in a modal (fallback)
  const [editLink, setEditLink] = useState(null);  // INB Link No edited as a UNIT on the unified SPG screen
  useModalEsc(() => setEditId(null), !!editId);     // Esc / header Back closes the edit modal
  useModalEsc(() => setEditLink(null), !!editLink); // Esc / header Back closes the SPG edit screen

  // One fetch of every INB voucher (both legs of every deal, all statuses) — INB
  // volume is small, so we group + count + filter client-side, mirroring how the
  // SO/PO/GP tab loads all bookings. The books-invalidation on approve refreshes it.
  const q = useQuery({
    queryKey: ['vouchers', 'inb', brCode || 'all'],
    queryFn: () => apiGet('/api/vouchers', { type: 'INB', branch: brCode === 'ALL' ? '' : brCode }),
  });
  const rows = Array.isArray(q.data) ? q.data : (q.data && q.data.data) || [];

  // Edited tab source — INB legs edited ≥ once (cross-cuts status, exactly like the
  // SO/PO/GP "Edited" tab). One shared /api/vouchers/edited feed, filtered to type INB.
  const editedQ = useQuery({
    queryKey: ['vouchers', 'inb-edited', brCode || 'all'],
    queryFn: () => apiGet('/api/vouchers/edited', { branch: brCode === 'ALL' ? '' : brCode }),
  });

  // INB refunds/reissues (RF/RI that reverse an INB deal) are routed to THIS pipeline,
  // not the SO/PO/GP queue. They're single vouchers (not a sale+purchase pair), so they
  // get their own section below the deals, fetched via the approvals report scoped to INB.
  const rfQ = useVoucherApprovals(branch, status, { refundScope: 'inb' });
  const inbRefunds = useMemo(() => {
    const list = (rfQ.data && rfQ.data.entries) || [];
    const nd = search.trim().toLowerCase();
    return list.filter((e) => !nd || [e.vno, e.party, e.againstInvoice, String(Math.round(e.total || 0))].filter(Boolean).join(' ').toLowerCase().includes(nd));
  }, [rfQ.data, search]);

  const approveMany = useApproveMany();
  const reject = useRejectVoucher();
  const qc = useQueryClient();

  // Pair the two INB legs into one deal. The robust link is the SALE's `againstPurchase`
  // (set on every deal — historical folded + new); fall back to a shared INB-Link
  // `sourceRef` for any new 2-leg deal that hasn't stamped againstPurchase. (Historical
  // folded legs carry their original Tally sourceRefs, which differ between legs, so
  // sourceRef alone would wrongly split a deal — hence againstPurchase first.)
  const deals = useMemo(() => {
    const toOf = (p) => String(p || '').replace(/^Travkings Tours and Travels\s+/i, '').trim();
    const sales = [], purchases = [];
    for (const v of rows) (v.category === 'purchase' ? purchases : sales).push(v);
    const purByVno = new Map(purchases.map((p) => [p.vno, p]));
    const purBySrc = new Map();
    purchases.forEach((p) => { if (p.sourceRef && /^INB\//.test(p.sourceRef)) purBySrc.set(p.sourceRef, p); });
    const used = new Set();
    const mk = (sale, purchase) => {
      const lead = sale || purchase;
      // Bucket the deal into the INB tabs: Pending · Approved · Pushed · Edited · Deleted.
      //  • Approve POSTS to OUR (seller) books → status 'approved'/'saved', pushed:false → APPROVED
      //    (still revocable/editable-after-revoke).
      //  • Push locks it + hands it to the buyer branch → pushed:true → PUSHED (read-only).
      //  • 'rejected'/'deleted' → Deleted; legacy 'unpushed' → Pending (re-approve to post).
      // Edited is a cross-cut (own data source), not a status bucket.
      const pushed = !!((sale && sale.pushed) || (purchase && purchase.pushed));
      const raw = lead.status || 'pending';
      let st = (raw === 'approved' || raw === 'saved') ? (pushed ? 'pushed' : 'approved')
        : raw === 'rejected' ? 'deleted'
        : raw === 'unpushed' ? 'pending'
        : raw;
      // Half-approved guard: a deal whose OTHER leg is still pending/unposted (e.g. the
      // sale posted but the purchase refused on a missing tax head) must surface under
      // PENDING — fix the refusal and re-approve the deal as one unit — never under
      // Approved looking done while one leg hasn't reached the books.
      if (st === 'approved' && [sale, purchase].some((l) => l && ((l.status || 'pending') === 'pending' || l.status === 'unpushed'))) st = 'pending';
      const saleNet = sale ? (Number(sale.total) || 0) - (Number(sale.taxAmt) || 0) : 0;
      const purNet = purchase ? (Number(purchase.total) || 0) - (Number(purchase.taxAmt) || 0) : 0;
      // The real INB Link No lives in bookingId (the shared deal id — e.g. INB/BOM-NBO/26/0007);
      // engine-created legs also carry it in sourceRef, but migrated legs keep per-leg Tally
      // refs there. Prefer bookingId, fall back to an INB-shaped sourceRef, else the sale vno.
      const inbLink = [sale, purchase].map((l) => l && l.bookingId).find((s) => s && /^INB\//.test(s))
        || [sale, purchase].map((l) => l && l.sourceRef).find((s) => s && /^INB\//.test(s));
      const saleTotal = sale ? Number(sale.total) || 0 : 0;
      const margin = Math.round((saleNet - purNet) * 100) / 100;
      return {
        key: (sale && sale.vno) || (purchase && purchase.vno), linkNo: inbLink || (sale && sale.vno) || (purchase && purchase.vno),
        sale, purchase, extras: [], status: st, rawStatus: raw, pushed, from: lead.branch, to: toOf((sale || lead).party), date: lead.date,
        module: inbModuleOf(sale || purchase), saleVno: (sale && sale.vno) || '', purchaseVno: (purchase && purchase.vno) || '',
        approvedAt: (sale && (sale.approvedAt || sale.updatedAt)) || '',
        saleTotal, saleNet, purTotal: purchase ? Number(purchase.total) || 0 : 0,
        margin, gpPct: saleNet > 0 ? Math.round((margin / saleNet) * 1000) / 10 : 0,
      };
    };
    const out = [];
    for (const sale of sales) {
      let pur = null;
      if (sale.againstPurchase && purByVno.has(sale.againstPurchase)) pur = purByVno.get(sale.againstPurchase);
      else if (sale.sourceRef && /^INB\//.test(sale.sourceRef) && purBySrc.has(sale.sourceRef)) pur = purBySrc.get(sale.sourceRef);
      if (pur) used.add(pur.vno);
      out.push(mk(sale, pur));
    }
    // N-PO: attach the remaining purchase legs to their deal by INB link (bookingId /
    // engine sourceRef) — extra supplier costs under the same Link No. Their nets fold
    // into the deal's purchase total + margin so the row shows the true folder figures.
    const linkOfP = (p) => (p.bookingId && /^INB\//.test(p.bookingId) && p.bookingId) || (p.sourceRef && /^INB\//.test(p.sourceRef) && p.sourceRef) || null;
    for (const p of purchases) {
      if (used.has(p.vno)) continue;
      const lk = linkOfP(p);
      const d = lk && out.find((x) => x.linkNo === lk);
      if (!d) continue;
      used.add(p.vno);
      d.extras.push(p);
      const extraNet = (Number(p.total) || 0) - (Number(p.taxAmt) || 0);
      d.purTotal = Math.round((d.purTotal + (Number(p.total) || 0)) * 100) / 100;
      d.margin = Math.round((d.margin - extraNet) * 100) / 100;
      d.gpPct = d.saleNet > 0 ? Math.round((d.margin / d.saleNet) * 1000) / 10 : 0;
    }
    out.forEach((d) => { if (d.extras.length) d.purchaseVno = `${d.purchaseVno} (+${d.extras.length} leg${d.extras.length > 1 ? 's' : ''})`; });
    for (const p of purchases) if (!used.has(p.vno)) out.push(mk(null, p)); // orphan purchase (no matching sale)
    return out.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(a.linkNo).localeCompare(String(b.linkNo)));
  }, [rows]);

  const counts = useMemo(() => {
    const c = {};
    for (const d of deals) { (c[d.status] = c[d.status] || { n: 0, amount: 0 }); c[d.status].n++; c[d.status].amount += d.saleTotal; }
    return c;
  }, [deals]);

  // Search filters the visible list by INB Link / vno / branch / module / amount; the
  // tab counts stay unfiltered (mirrors SO/PO/GP).
  const needle = search.trim().toLowerCase();
  const matchDeal = (d) => !needle || [d.linkNo, d.saleVno, d.purchaseVno, d.from, d.to, d.module, String(Math.round(d.saleTotal))].filter(Boolean).join(' ').toLowerCase().includes(needle);
  const shown = deals.filter((d) => d.status === status && matchDeal(d));
  const pendingTab = status === 'pending';       // Edit / Approve / Reject + bulk Approve
  const approvedTab = status === 'approved';      // Push / Revoke + bulk Push (posted to our books, pre-push)
  const pushedTab = status === 'pushed';          // locked — handed to buyer branch, read-only
  const editedTab = status === 'edited';          // cross-cut list, own data source
  const actionTab = pendingTab || approvedTab;    // tabs that show the checkbox + Actions column
  // Edited INB legs (type INB, edited ≥ once), search-filtered like the deals list.
  const editedInb = useMemo(() => {
    const list = Array.isArray(editedQ.data) ? editedQ.data : (editedQ.data && editedQ.data.data) || [];
    return list.filter((r) => r.type === 'INB')
      .filter((r) => !needle || [r.vno, r.party, r.lastBy, String(Math.round(r.total || 0))].filter(Boolean).join(' ').toLowerCase().includes(needle))
      .sort((a, b) => String(b.lastAt || '').localeCompare(String(a.lastAt || '')));
  }, [editedQ.data, needle]);
  const allKeys = shown.map((d) => d.key);
  const toggleAll = () => setSel((s) => (s.size === allKeys.length ? new Set() : new Set(allKeys)));
  // Only PENDING legs can be approved/rejected; an already-approved leg is skipped.
  // Includes any N-PO extra purchase legs so a deal always acts as ONE unit.
  const idsOf = (d) => [d.sale, d.purchase, ...(d.extras || [])].filter(Boolean).filter((l) => l.status === 'pending').map((l) => l.id || l._id);
  const toggle = (lk) => setSel((s) => { const n = new Set(s); if (n.has(lk)) n.delete(lk); else n.add(lk); return n; });

  const doApprove = async (list) => {
    // One group per deal → the backend approves each deal ATOMICALLY: if one leg
    // refuses (e.g. missing tax head), its sibling rolls back and the WHOLE deal
    // stays Pending — never a half-posted deal sitting in the Approved tab.
    const groups = list.map(idsOf).filter((g) => g.length);
    const ids = groups.flat();
    if (!ids.length) return;
    const { confirmed } = await confirmDialog({ title: `Approve ${list.length} INB deal(s)?`, message: 'Posts each deal’s INB Sale + airline Purchase to OUR (seller) books now. It stays revocable/editable until you Push it to the buyer branch.', confirmLabel: 'Approve' });
    if (!confirmed) return;
    setBusy(true);
    approveMany.mutate({ ids, groups, approver: 'admin' }, {
      onSuccess: (res) => { setSel(new Set()); const a = (res && res.approved) != null ? res.approved : groups.length, f = (res && res.failed) || 0; toast(f ? `Approved ${a} deal(s), ${f} deal(s) failed — nothing from a failed deal was posted${res?.errors?.[0] ? `. ${res.errors[0]}` : ''}` : `${list.length} INB deal(s) approved — posted to our books`, f ? 'error' : 'success'); },
      onError: (e) => toast((e && e.message) || 'Approve failed', 'error'),
      onSettled: () => setBusy(false),
    });
  };

  // Levels 1 & 2 of the chain, deal-level: Check/Verify BOTH pending legs together.
  const doReviewDeal = async (d, action) => {
    const ids = idsOf(d);
    if (!ids.length) return;
    setBusy(true);
    try {
      const res = await apiPost('/api/vouchers/review-many', { ids, action });
      const f = res?.failed || 0;
      toast(f ? `${action} failed on ${f} leg(s)${res?.errors?.[0] ? ` — ${res.errors[0]}` : ''}` : (action === 'check' ? `Deal ${d.linkNo} checked (L1) — awaiting Verify` : `Deal ${d.linkNo} verified (L2) — awaiting final Approval`), f ? 'error' : 'success');
      qc.invalidateQueries({ queryKey: ['vouchers'] });
      qc.invalidateQueries({ queryKey: ['inb'] });
    } catch (e) { toast(e?.message || `${action} failed`, 'error'); }
    finally { setBusy(false); }
  };

  // Push an APPROVED INB deal → locks it (no more revoke) and hands a pending INB voucher
  // to the buyer branch (it does NOT re-post our books). Deal-level, by INB Link No. Accepts
  // a list so the same handler serves the per-row button and the "Push selected" bulk action.
  const doPush = async (list) => {
    const targets = list.filter((d) => d.status === 'approved' && !d.pushed && /^INB\//.test(d.linkNo));
    if (!targets.length) { toast('Nothing to push — approve the deal first.', 'error'); return; }
    const { confirmed } = await confirmDialog({ title: `Push ${targets.length} INB deal(s)?`, message: 'Locks each deal (no more revoke) and sends it to the buyer branch’s INB pipeline as a pending voucher for them to fill their onward sale and approve.', confirmLabel: 'Push' });
    if (!confirmed) return;
    setBusy(true);
    let ok = 0, fail = 0;
    for (const d of targets) {
      try { await apiPost('/api/inter-branch/push', { linkNo: d.linkNo }); ok++; }
      catch (e) { fail++; toast(`${d.linkNo}: ${(e && e.message) || 'push failed'}`, 'error'); }
    }
    setSel(new Set());
    if (ok) toast(`Pushed ${ok} INB deal(s) → sent to buyer branch`, 'success');
    qc.invalidateQueries({ queryKey: ['vouchers'] }); qc.invalidateQueries({ queryKey: ['accounting'] }); qc.invalidateQueries({ queryKey: ['inb'] });
    setBusy(false);
  };

  const doReject = async (d) => {
    const { confirmed, reason } = await confirmDialog({ title: `Reject INB ${d.linkNo}?`, message: 'Both legs are marked Rejected (no books impact).', danger: true, reasonRequired: true, reasonLabel: 'Reason for rejection', confirmLabel: 'Reject' });
    if (!confirmed) return;
    setBusy(true);
    try { for (const id of idsOf(d)) await reject.mutateAsync({ id, by: 'admin', reason }); toast(`Rejected ${d.linkNo}`); }
    catch (e) { toast((e && e.message) || 'Reject failed', 'error'); }
    finally { setBusy(false); }
  };

  // Revoke an APPROVED deal as a unit — un-post BOTH legs to Pending (the legs are locked
  // to the deal, never revoked alone). Preflight surfaces the settlement-release plan and
  // hard-blocks a bank-reconciled settler.
  const doRevoke = async (d) => {
    let pre = null;
    try { pre = await apiGet('/api/inter-branch/revoke-check', { linkNo: d.linkNo }); }
    catch (e) { toast((e && e.message) || 'Could not check this deal', 'error'); return; }
    if (pre && (pre.blocks || []).length) { toast(`Can't revoke — ${pre.blocks.map((b) => b.msg).join(' ')}`, 'error'); return; }
    const warns = (pre && pre.warnings || []).map((w) => w.msg).filter(Boolean);
    const { confirmed, reason } = await confirmDialog({
      title: `Revoke INB ${d.linkNo}?`,
      message: `Both legs (${(pre && pre.legs || []).join(', ') || `${d.saleVno}, ${d.purchaseVno}`}) un-post to Pending — the numbers are kept.${warns.length ? ' ' + warns.join(' ') : ''}`,
      danger: true, reasonRequired: true, reasonLabel: 'Reason for revoke', confirmLabel: 'Revoke',
    });
    if (!confirmed) return;
    setBusy(true);
    try { await apiPost('/api/inter-branch/revoke', { linkNo: d.linkNo, reason }); toast(`Revoked ${d.linkNo} → Pending`); qc.invalidateQueries({ queryKey: ['vouchers'] }); qc.invalidateQueries({ queryKey: ['accounting'] }); qc.invalidateQueries({ queryKey: ['inb'] }); }
    catch (e) { toast((e && e.message) || 'Revoke failed', 'error'); }
    finally { setBusy(false); }
  };

  // INB refund/reissue is a single voucher — approve/reject it on its own (reuses the
  // shared voucher mutations, same as the SO/PO/GP queue would). Single approve (NOT
  // approveMany) so the backend's real refusal ("Awaiting Check…", validation error)
  // reaches the toast instead of being flattened to "failed to post".
  const approveRefund = useApproveVoucher();
  const doApproveRefund = async (e) => {
    const { confirmed } = await confirmDialog({ title: `Approve refund ${e.vno}?`, message: 'Posts this INB refund to the books.', confirmLabel: 'Approve' });
    if (!confirmed) return;
    setBusy(true);
    try { await approveRefund.mutateAsync({ id: e.id, approver: 'admin' }); toast(`Approved ${e.vno} — posted to the books`); }
    catch (err) { toast(`${e.vno}: ${(err && err.message) || 'failed to post'}`, 'error'); }
    finally { setBusy(false); }
  };
  // Levels 1 & 2 of the chain for an INB refund (no books impact) — server enforces
  // stage order and who may act; the button only routes the click.
  const doReviewRefund = async (e, action) => {
    setBusy(true);
    try {
      await apiPost(`/api/vouchers/${e.id}/review`, { action });
      toast(action === 'check' ? `Checked ${e.vno} (level 1) — awaiting Verify` : `Verified ${e.vno} (level 2) — awaiting final Approval`);
      qc.invalidateQueries({ queryKey: ['vouchers'] });
    } catch (err) { toast((err && err.message) || `${action} failed`, 'error'); }
    finally { setBusy(false); }
  };
  const doRejectRefund = async (e) => {
    const { confirmed, reason } = await confirmDialog({ title: `Reject refund ${e.vno}?`, message: 'Marks it Rejected (no books impact).', danger: true, reasonRequired: true, reasonLabel: 'Reason for rejection', confirmLabel: 'Reject' });
    if (!confirmed) return;
    setBusy(true);
    try { await reject.mutateAsync({ id: e.id, by: 'admin', reason }); toast(`Rejected ${e.vno}`); }
    catch (err) { toast((err && err.message) || 'Reject failed', 'error'); }
    finally { setBusy(false); }
  };

  const tab = (k, label) => {
    const c = k === 'edited' ? { n: editedInb.length, amount: editedInb.reduce((s, r) => s + (Number(r.total) || 0), 0) } : counts[k];
    return (
      <button key={k} onClick={() => { setStatus(k); setSel(new Set()); }} style={{ padding: '8px 16px', border: 'none', borderBottom: `3px solid ${status === k ? C.gold : 'transparent'}`, background: 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: status === k ? C.dark : C.dim }}>
        {label} <span style={{ fontSize: 11, color: C.dim }}>({(c && c.n) || 0}{c ? ` · ${money(c.amount)}` : ''})</span>
      </button>
    );
  };

  const COLS = actionTab
    ? ['', 'INB Link No', 'Date', 'From → To', 'Module', 'Sale Inv', 'Purchase Inv', 'Sale', 'Purchase', 'Margin (SVF)', 'GP %', 'Actions']
    : ['INB Link No', 'Date', 'From → To', 'Module', 'Sale Inv', 'Purchase Inv', 'Sale', 'Purchase', 'Margin (SVF)', 'GP %', pushedTab ? 'Pushed' : 'Status'];
  const colSpan = COLS.length;

  // Editing a whole INB deal takes over the screen with the unified SPG editor (both
  // legs), exactly like SO/PO/GP. Placed after every hook so hook order never changes.
  if (editLink) {
    return <InbEditGate linkNo={editLink} branch={branch}
      onDone={() => { setEditLink(null); setOpen(null); qc.invalidateQueries({ queryKey: ['vouchers'] }); qc.invalidateQueries({ queryKey: ['inb'] }); }} />;
  }

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '12px 2px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: C.dark }}>INB SPG Approvals</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: C.dim }}><b>Approve</b> posts the deal to OUR (seller) books → <b>Approved</b> (revocable/editable). <b>Push</b> then locks it and hands it to the buyer branch → <b>Pushed</b> (read-only; the buyer fills their onward sale &amp; approves in their books). Each row is one inter-branch deal.</p>
        </div>
        {setRoute && <button onClick={() => setRoute('/bookings/inter-branch')} style={{ padding: '8px 14px', background: C.dark, color: C.gold, border: 'none', borderRadius: 7, fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>+ New INB Voucher</button>}
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>{tab('pending', 'Pending')}{tab('approved', 'Approved')}{tab('pushed', 'Pushed')}{tab('edited', 'Edited')}{tab('deleted', 'Deleted')}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <div style={{ position: 'relative', flex: '0 1 380px', minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9197a3', pointerEvents: 'none' }}>🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search INB Link · Vno · branch · module · amount…" aria-label="Search INB deals"
            style={{ width: '100%', padding: '6px 26px 6px 28px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, outline: 'none', background: '#fff' }} />
          {search && <button onClick={() => setSearch('')} aria-label="Clear search" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#9197a3', fontSize: 14, lineHeight: 1 }}>✕</button>}
        </div>
        {needle && <span style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>{(editedTab ? editedInb.length : shown.length)} match{(editedTab ? editedInb.length : shown.length) === 1 ? '' : 'es'}</span>}
        {actionTab && shown.length > 0 && (
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <button onClick={toggleAll} style={{ padding: '5px 11px', fontSize: 11, color: C.blue, background: '#fff', border: '1px solid #bcd4ee', borderRadius: 6, cursor: 'pointer' }}>{sel.size === allKeys.length && allKeys.length ? '☑ Clear' : `☐ Select all (${allKeys.length})`}</button>
            {sel.size > 0 && isApprover && pendingTab && <button disabled={busy} onClick={() => doApprove(shown.filter((d) => sel.has(d.key)))} style={{ padding: '5px 13px', fontSize: 11.5, background: C.green, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 800, cursor: 'pointer' }}>Approve selected ({sel.size})</button>}
            {sel.size > 0 && isApprover && approvedTab && <button disabled={busy} onClick={() => doPush(shown.filter((d) => sel.has(d.key)))} style={{ padding: '5px 13px', fontSize: 11.5, background: C.blue, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 800, cursor: 'pointer' }}>Push selected ({sel.size})</button>}
          </span>
        )}
      </div>

      <div style={{ ...card, overflowX: 'auto' }}>
        {editedTab
          ? <InbEditedList rows={editedInb} isLoading={editedQ.isLoading} money={money} />
          : q.isLoading ? <div style={{ padding: 12 }}><SkeletonTable rows={6} cols={COLS.length} /></div>
          : shown.length === 0 ? <div style={{ padding: 24, textAlign: 'center', color: C.dim, fontSize: 12 }}>{pendingTab ? 'No pending INB deals. Create one under “INB Voucher”.' : approvedTab ? 'No approved INB deals awaiting Push.' : pushedTab ? 'No pushed INB deals.' : `No ${status} INB deals.`}</div>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#f3f4f8' }}>
                  {COLS.map((h, i) => <th key={i} style={{ padding: '9px 12px', fontSize: 10, fontWeight: 700, color: '#5b616e', textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: /Sale|Purchase|Margin|GP/.test(h) ? 'right' : 'left' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {shown.map((d) => (
                  <React.Fragment key={d.key}>
                    <tr style={{ borderTop: `1px solid ${C.border}` }}>
                      {actionTab && <td style={{ padding: '7px 12px' }}><input type="checkbox" checked={sel.has(d.key)} onChange={() => toggle(d.key)} aria-label={`select ${d.linkNo}`} /></td>}
                      <td {...clickable(() => setOpen((o) => (o === d.key ? null : d.key)))} title="Show JV details" style={{ padding: '7px 12px', fontFamily: 'monospace', color: C.blue, cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}>{open === d.key ? '▾ ' : '▸ '}{d.linkNo}
                        {pushedTab && <span title="Pushed to the buyer branch — locked" style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 4, background: '#eef2ff', color: '#3d4ea8', fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>🔒 pushed</span>}</td>
                      <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>{fmtDate(d.date)}</td>
                      <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>{d.from} → {d.to}</td>
                      <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>{d.module}</td>
                      <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 11 }}>{d.saleVno || '—'}</td>
                      <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 11 }}>{d.purchaseVno || '—'}</td>
                      <td style={{ padding: '7px 12px', ...num }}>{d.sale ? money(d.saleTotal) : '—'}</td>
                      <td style={{ padding: '7px 12px', ...num }}>{d.purchase ? money(d.purTotal) : '—'}</td>
                      <td style={{ padding: '7px 12px', ...num, color: C.green, fontWeight: 700 }}>{money(d.margin)}</td>
                      <td style={{ padding: '7px 12px', ...num, color: C.dim }}>{d.gpPct}%</td>
                      {actionTab
                        ? <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                            {!isApprover ? <span style={{ fontSize: 11, color: C.dim }}>Approver only</span>
                              : pendingTab ? <>{/* Pending: Edit / Approve (posts to our books) / Reject */}
                              {/* One unified edit — opens the SAME SO/PO/GP booking screen with BOTH legs
                                  loaded (interBranch mode). Falls back to per-leg edit only for a rare
                                  legacy deal with no proper INB Link No (getDeal keys on the INB link). */}
                              {/^INB\//.test(d.linkNo)
                                ? <button disabled={busy} onClick={() => setEditLink(d.linkNo)} title="Edit this INB deal (both legs) on the SO/PO/GP screen, then approve" style={{ marginRight: 6, padding: '5px 10px', background: '#fff', color: C.blue, border: `1px solid ${C.blue}`, borderRadius: 5, fontWeight: 700, cursor: 'pointer' }}>✎ Edit</button>
                                : <>
                                  {d.sale && <button disabled={busy} onClick={() => setEditId(d.sale.id || d.sale._id)} title="Edit the INB sale leg, then approve" style={{ marginRight: 6, padding: '5px 10px', background: '#fff', color: C.blue, border: `1px solid ${C.blue}`, borderRadius: 5, fontWeight: 700, cursor: 'pointer' }}>✎ Sale</button>}
                                  {d.purchase && <button disabled={busy} onClick={() => setEditId(d.purchase.id || d.purchase._id)} title="Edit the airline purchase leg, then approve" style={{ marginRight: 6, padding: '5px 10px', background: '#fff', color: C.blue, border: `1px solid ${C.blue}`, borderRadius: 5, fontWeight: 700, cursor: 'pointer' }}>✎ Pur</button>}
                                </>}
                              {(() => {
                                // Stage-aware chain action (stage lives on the sale leg; review acts on BOTH legs).
                                const na = nextActionFor(d.sale || d.purchase || {}, chainCfg);
                                if (na.action !== 'approve') return <><StageTracker e={d.sale || d.purchase || {}} /><button disabled={busy || !na.allowed} onClick={() => doReviewDeal(d, na.action)} title={na.hint} style={{ margin: '0 6px', padding: '5px 10px', background: na.allowed ? (na.action === 'check' ? C.blue : C.gold) : '#cfd6e4', color: '#fff', border: 'none', borderRadius: 5, fontWeight: 700, cursor: na.allowed ? 'pointer' : 'not-allowed' }}>{na.label}</button></>;
                                return <button disabled={busy || !na.allowed} onClick={() => doApprove([d])} title={na.allowed ? 'Approve (L3) → post both legs to OUR (seller) books now' : na.hint} style={{ marginRight: 6, padding: '5px 10px', background: na.allowed ? C.green : '#cfd6e4', color: '#fff', border: 'none', borderRadius: 5, fontWeight: 700, cursor: na.allowed ? 'pointer' : 'not-allowed' }}>Approve</button>;
                              })()}
                              <button disabled={busy} onClick={() => doReject(d)} style={{ padding: '5px 10px', background: '#fff', color: C.red, border: `1px solid ${C.red}`, borderRadius: 5, fontWeight: 700, cursor: 'pointer' }}>Reject</button>
                            </> : <>{/* Approved (in our books, pre-push): Push locks + hands to buyer; Revoke → Pending */}
                              <button disabled={busy} onClick={() => doPush([d])} title="Push → lock this deal and send it to the buyer branch to fill their onward sale" style={{ marginRight: 6, padding: '5px 12px', background: C.blue, color: '#fff', border: 'none', borderRadius: 5, fontWeight: 800, cursor: 'pointer' }}>⇪ Push</button>
                              <button disabled={busy} onClick={() => doRevoke(d)} title="Revoke → un-post from our books, back to Pending (numbers kept); allowed only before Push" style={{ padding: '5px 10px', background: '#fff', color: C.gold, border: `1px solid ${C.gold}`, borderRadius: 5, fontWeight: 700, cursor: 'pointer' }}>⟲ Revoke</button>
                            </>}
                          </td>
                        : <td style={{ padding: '7px 12px', whiteSpace: 'nowrap', color: C.dim }}>{pushedTab
                            ? <span title="Pushed to the buyer branch — locked (no revoke)">Pushed {fmtDate((d.sale && d.sale.pushedAt) || (d.purchase && d.purchase.pushedAt)) || ''} · awaiting buyer</span>
                            : (d.rawStatus || d.status)}</td>}
                    </tr>
                    {open === d.key && (
                      <tr><td colSpan={colSpan} style={{ padding: 0, background: '#fbfcfd' }}>
                        <InbDealJv sale={d.sale} purchase={d.purchase} />
                      </td></tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
      </div>
      <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>INB SPG deals are two-step: <b>Approve</b> (Pending → Approved) posts the INB Sale + airline Purchase to OUR (seller) books; the deal stays <b>revocable + editable</b> (Revoke → un-post to Pending). <b>Push</b> (Approved → Pushed) <b>locks</b> the deal — no more revoke — and hands a pending INB voucher to the buyer branch, where their person fills the onward sale and approves it into their books. The <b>Edited</b> tab lists deals changed ≥ once. Click a row for the JV (Dr/Cr) of both legs.</div>

      {/* INB Refunds — RF/RI vouchers that reverse an INB deal. Routed here (not the
          SO/PO/GP queue); each is a single voucher, approved/rejected on its own row.
          Hidden on the Edited tab (which is a cross-cut list, not a status queue). */}
      {!editedTab && (
      <div style={{ ...card, overflowX: 'auto', marginTop: 16 }}>
        <div style={{ padding: '10px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontWeight: 800, color: C.dark, fontSize: 13 }}>INB Refunds &amp; Reissues <span style={{ fontWeight: 700, color: C.dim, fontSize: 11 }}>— reverse an INB deal</span></span>
          <span style={{ fontSize: 11.5, color: C.dim, fontWeight: 700 }}>{inbRefunds.length} {status}</span>
        </div>
        {rfQ.isLoading ? <div style={{ padding: 12 }}><SkeletonTable rows={3} cols={6} /></div>
          : inbRefunds.length === 0 ? <div style={{ padding: 18, textAlign: 'center', color: C.dim, fontSize: 12 }}>No {status} INB refunds.</div>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: '#f3f4f8' }}>
                  {['Vch No', 'Date', 'Reverses (INB)', 'Party', 'Amount', pendingTab ? 'Actions' : 'Status'].map((h, i) => (
                    <th key={i} style={{ padding: '9px 12px', fontSize: 10, fontWeight: 700, color: '#5b616e', textTransform: 'uppercase', whiteSpace: 'nowrap', textAlign: h === 'Amount' ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {inbRefunds.map((e) => (
                  <tr key={e.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontWeight: 700, whiteSpace: 'nowrap' }}>
                      {e.vno}
                      <span style={{ marginLeft: 6, padding: '1px 6px', borderRadius: 4, background: '#eef2ff', color: '#3d4ea8', fontSize: 9, fontWeight: 800, textTransform: 'uppercase' }}>INB {e.category === 'reissue' ? 'RI' : 'RF'}</span>
                    </td>
                    <td style={{ padding: '7px 12px', whiteSpace: 'nowrap', color: C.dim }}>{fmtDate(e.date)}</td>
                    <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 11, color: C.dim }}>{e.againstInvoice || e.linkNo || '—'}</td>
                    <td style={{ padding: '7px 12px' }}>{e.party || '—'}</td>
                    <td style={{ padding: '7px 12px', ...num }}><RefundAmountCell entry={e} money={money} /></td>
                    {pendingTab
                      ? <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                          <StageTracker e={e} />
                          {isApprover && <>
                            {/* Single voucher (RF/RI) — edit it in place via the shared voucher
                                editor (saving reverts it to Pending), then re-enter the chain. */}
                            <button disabled={busy} onClick={() => setEditId(e.id)} title="Edit this INB refund/reissue voucher, then approve" style={{ margin: '0 6px', padding: '5px 10px', background: '#fff', color: C.blue, border: `1px solid ${C.blue}`, borderRadius: 5, fontWeight: 700, cursor: 'pointer' }}>✎ Edit</button>
                          </>}
                          {(() => {
                            // Stage-aware action (mirrors the Vouchers queue): Check (L1, anyone in
                            // branch) → Verify (L2) → Approve & Post (L3). Server re-enforces all gates.
                            const na = nextActionFor(e, chainCfg);
                            if (na.action !== 'approve') {
                              return <button disabled={busy || !na.allowed} title={na.hint} onClick={() => doReviewRefund(e, na.action)} style={{ marginLeft: isApprover ? 0 : 6, marginRight: 6, padding: '5px 10px', background: na.allowed ? (na.action === 'check' ? C.blue : C.gold) : '#cfd6e4', color: '#fff', border: 'none', borderRadius: 5, fontWeight: 700, cursor: na.allowed ? 'pointer' : 'not-allowed' }}>{na.label}</button>;
                            }
                            const ok = e.postable && na.allowed;
                            return <button disabled={busy || !ok} title={!na.allowed ? na.hint : (e.postable ? 'Level 3 — posts to the books' : (e.error || (e.errors && e.errors[0]) || 'Fix the error before approving'))} onClick={() => doApproveRefund(e)} style={{ marginRight: 6, padding: '5px 10px', background: ok ? C.green : '#cfd6e4', color: '#fff', border: 'none', borderRadius: 5, fontWeight: 700, cursor: ok ? 'pointer' : 'not-allowed' }}>{na.label}</button>;
                          })()}
                          {isApprover && <button disabled={busy} onClick={() => doRejectRefund(e)} style={{ padding: '5px 10px', background: '#fff', color: C.red, border: `1px solid ${C.red}`, borderRadius: 5, fontWeight: 700, cursor: 'pointer' }}>Reject</button>}
                          {!e.postable && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, color: C.red }}>blocked</span>}
                        </td>
                      : <td style={{ padding: '7px 12px', color: C.dim }}>{e.status}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
      )}

      {/* Edit an INB leg in place (reuses the Vouchers editor). Saving reverts the leg to
          Pending; then Approve/Reject the deal on its row. Legs are editable only while
          Pending — the backend allows a locked INB leg to be edited only in that state. */}
      {editId && (
        <div onClick={async () => { const { confirmed } = await confirmDialog({ title: 'Discard changes to this voucher?', message: 'Any edits you have not saved will be lost.', confirmLabel: 'Discard', danger: true }); if (confirmed) setEditId(null); }} style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.5)', zIndex: 900, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '5vh 12px' }}>
          <div role="dialog" aria-modal="true" aria-label="Edit INB voucher" onClick={(ev) => ev.stopPropagation()} style={{ background: '#fff', width: 'min(720px, 96vw)', maxHeight: '90vh', overflowY: 'auto', borderRadius: 10, boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, background: '#fff' }}>
              <strong style={{ color: C.dark }}>Edit INB Leg — fix &amp; approve</strong>
              <button onClick={() => setEditId(null)} aria-label="Close editor" style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: C.dim }}>✕</button>
            </div>
            <div style={{ padding: 4 }}>
              <VoucherEditor voucherId={editId} cur={cur} onBack={() => setEditId(null)} />
            </div>
            <div style={{ padding: '8px 16px', fontSize: 11, color: C.dim, borderTop: `1px solid ${C.border}` }}>Tip: edit the leg's amounts/ledgers so it balances, Save (reverts it to Pending), then click Approve on the row.</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Unified Approvals ────────────────────────────────────────────────────────
// One screen for ALL approvals: a top segment bar switches between SO/PO/GP bookings
// (which also carry the Refund/Reissue reversal modules), INB SPG, and a dedicated
// screen per gated voucher type (Receipt · Payment · … · ACM). Each shows
// Pending · Approved · Rejected (· Deleted · Edited).
// Refund & Reissue have NO tab of their own here — they are SO/PO/GP reversal modules
// (BookingOrder module RF/RI), so they live under SO/PO/GP with a module filter.
const VOUCHER_TABS = [
  ['receipt', 'Receipt'], ['payment', 'Payment'], ['contra', 'Contra'], ['journal', 'Journal'],
  ['purchase-expense', 'Purchase Expense'], ['debit-note', 'Debit Note'],
  ['adm', 'ADM'], ['acm', 'ACM'],
];
const VOUCHER_KEYS = new Set(VOUCHER_TABS.map(([k]) => k));
export function UnifiedApprovals({ branch, setRoute, currentUser, initialDomain = 'sopogp' }) {
  // Opened from an Alert deep-link targeting a voucher → start on the combined Vouchers
  // queue (the deep-link auto-opens the flagged voucher's editor, which VoucherApprovals
  // handles for any type without needing to know its category up front).
  const navFocus = useNavFocusStore((s) => s.focus);
  const focusVoucher = navFocus && navFocus.params && navFocus.params.kind === 'voucher';
  // File deep-link (from a read-only booking/INB leg) → land on its domain, filtered.
  const fileFocus = navFocus && navFocus.params && navFocus.params.kind === 'file' ? navFocus.params : null;
  const [domain, setDomain] = useState(fileFocus ? fileFocus.domain : (focusVoucher ? 'vouchers' : initialDomain));
  const seg = (k, label) => (
    <button key={k} onClick={() => setDomain(k)} style={{ padding: '8px 16px', fontSize: 12.5, fontWeight: 800, borderRadius: 7, border: `1px solid ${domain === k ? C.dark : '#d6dbe6'}`, background: domain === k ? C.dark : '#fff', color: domain === k ? C.gold : C.dim, cursor: 'pointer' }}>{label}</button>
  );
  // A category domain (receipt / payment / …) drives the single-type VoucherApprovals;
  // 'vouchers' keeps the combined queue for alert deep-links.
  const catDomain = VOUCHER_KEYS.has(domain) ? domain : '';
  return (
    <div style={{ margin: '12px 0' }}>
      <FocusBanner />
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
        {seg('sopogp', 'SO / PO / GP')}{seg('inbspg', 'INB')}
        {VOUCHER_TABS.map(([k, l]) => seg(k, l))}
      </div>
      {domain === 'sopogp'
        ? <BookingApprovals branch={branch} setRoute={setRoute} currentUser={currentUser} initialSearch={fileFocus?.search || ''} initialStatus={fileFocus?.status || ''} />
        : domain === 'inbspg'
          ? <InbApprovals branch={branch} setRoute={setRoute} currentUser={currentUser} initialSearch={fileFocus?.search || ''} initialStatus={fileFocus?.status || ''} />
          : <VoucherApprovals branch={branch} currentUser={currentUser} category={catDomain} />}
    </div>
  );
}
