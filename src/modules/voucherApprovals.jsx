// ─── Voucher Approvals ────────────────────────────────────────────────────────
// Approval queue for the gated voucher types (Payment, Receipt, Contra, Journal,
// Debit Note, Purchase Expense). Manual entries AND bulk uploads land
// here as PENDING and hit the books only when approved.
// Single nested sheet: Group › Sub-group › Ledger › Entry (collapsible).
import React, { useMemo, useState, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../core/api';
import { AuditTrail } from '../core/AuditTrail';
import { JvBlock } from '../core/voucher/JvBlock';
import { VoucherView } from './pnlTally';
import { openPrintWindow } from '../core/voucher-print';
import { useModalEsc } from '../core/ux/useModalEsc';
import { confirmDialog } from '../core/ux/confirm';
import { clickable } from '../core/ux/clickable';
import { toast } from '../core/ux/toast';
import { FocusBanner } from '../core/ux/FocusBanner';
import { useNavFocusStore } from '../core/ux/navFocus';
import { useVoucherApprovals, useApproveVoucher, useRejectVoucher, useDeleteVoucher, useRevokeVoucher, fetchRevokeCheck, useApproveMany, useApproveAll, branchCode } from '../core/useAccounting';
import { VoucherEditor } from './accountingLive';
import { BookingApprovals } from './bookingOrder';
import { bc } from '../core/styles';
import { localeOf } from '../core/format';
import { PeriodBar, periodRange } from '../core/period';
import { CONSOLIDATED_LABEL } from '../core/data';
import { SkeletonTable } from '../shell/primitives';

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
  const q = useVoucherApprovals(branch, status, { from: effRange.from, to: effRange.to, category });
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
  const visibleEntries = useMemo(() => (needle ? entries.filter(matchEntry) : entries), [entries, needle]); // eslint-disable-line react-hooks/exhaustive-deps
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
        <button onClick={() => setEditId(e.id)} disabled={busy} style={ABTN(C.blue)}>Edit</button>
        <button onClick={() => doApprove(e.id)} disabled={busy || !e.postable} title={e.postable ? '' : (alertOf(e) || 'Fix the error (Edit) before approving')} aria-label={e.postable ? undefined : `Approve disabled — ${alertOf(e) || 'fix the error (Edit) first'}`} style={{ ...ABTN(C.green, true), background: e.postable ? C.green : '#cfd6e4', cursor: e.postable ? 'pointer' : 'not-allowed' }}>Approve</button>
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
                        <td {...clickable(() => setViewId(e.id))} title="View full voucher" style={{ ...flatTd, color: C.blue, fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', background: flagged.has(e.vno) ? '#FFF6D6' : undefined }}>{e.vno}</td>
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
                                        <td style={{ padding: '5px 8px', color: e.error ? C.red : C.dim, fontStyle: 'italic', borderBottom: '1px solid #dfe2e7', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={e.error || e.narration || e.legNarration || ''}>{e.error ? `⚠ ${e.error}` : (e.narration || e.legNarration || '—')}{e.rejectedReason ? ` · ✗ ${e.rejectedReason}` : ''}</td>
                                        <td style={{ ...num, padding: '5px 8px', color: C.blue, borderBottom: '1px solid #dfe2e7' }}>{x.drAmt ? money(x.drAmt) : ''}</td>
                                        <td style={{ ...num, padding: '5px 8px', color: C.red, borderBottom: '1px solid #dfe2e7' }}>{x.crAmt ? money(x.crAmt) : ''}</td>
                                        <td style={{ padding: '5px 8px', textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '1px solid #dfe2e7' }}>
                                          {status === 'pending' ? (
                                            <>
                                              <button onClick={() => setEditId(e.id)} disabled={busy} style={{ padding: '3px 9px', background: '#fff', color: C.blue, border: `1px solid ${C.blue}`, borderRadius: 5, fontWeight: 700, fontSize: 10.5, cursor: 'pointer', marginRight: 5 }}>Edit</button>
                                              <button onClick={() => doApprove(e.id)} disabled={busy || !e.postable} title={e.postable ? '' : 'Fix the error (Edit) before approving'} style={{ padding: '3px 9px', background: e.postable ? C.green : '#cfd6e4', color: '#fff', border: 'none', borderRadius: 5, fontWeight: 700, fontSize: 10.5, cursor: e.postable ? 'pointer' : 'not-allowed', marginRight: 5 }}>Approve</button>
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
  if (isLoading) return <div style={{ ...card, padding: 24, textAlign: 'center', color: C.dim }}>Loading edited vouchers…</div>;
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

export function InbApprovals({ branch, setRoute, currentUser, initialSearch = '', initialStatus = '' }) {
  const brCode = branchCode(branch);
  const cur = (bc(branch) || {}).cur || '₹';
  const money = (n) => fmtAmount(n, cur);
  const isApprover = /super.?admin|director|senior\s+finance\s+manager|sr\.?\s*accounts\s+executive/i.test(currentUser?.role || '');

  const [status, setStatus] = useState(initialStatus || 'pending');
  const [open, setOpen] = useState(null);     // single expanded deal key (mirrors SO/PO/GP)
  const [sel, setSel] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState(initialSearch || '');
  const [editId, setEditId] = useState(null);  // INB leg being edited in the modal (reuses the Vouchers editor)

  // One fetch of every INB voucher (both legs of every deal, all statuses) — INB
  // volume is small, so we group + count + filter client-side, mirroring how the
  // SO/PO/GP tab loads all bookings. The books-invalidation on approve refreshes it.
  const q = useQuery({
    queryKey: ['vouchers', 'inb', brCode || 'all'],
    queryFn: () => apiGet('/api/vouchers', { type: 'INB', branch: brCode === 'ALL' ? '' : brCode }),
  });
  const rows = Array.isArray(q.data) ? q.data : (q.data && q.data.data) || [];

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
      const st = lead.status === 'saved' ? 'approved' : (lead.status || 'pending');
      const saleNet = sale ? (Number(sale.total) || 0) - (Number(sale.taxAmt) || 0) : 0;
      const purNet = purchase ? (Number(purchase.total) || 0) - (Number(purchase.taxAmt) || 0) : 0;
      // Show the real INB Link No when the voucher carries it (sourceRef = INB/…),
      // otherwise the sale voucher number is the deal's identifier.
      const inbLink = [sale, purchase].map((l) => l && l.sourceRef).find((s) => s && /^INB\//.test(s));
      const saleTotal = sale ? Number(sale.total) || 0 : 0;
      const margin = Math.round((saleNet - purNet) * 100) / 100;
      return {
        key: (sale && sale.vno) || (purchase && purchase.vno), linkNo: inbLink || (sale && sale.vno) || (purchase && purchase.vno),
        sale, purchase, status: st, from: lead.branch, to: toOf((sale || lead).party), date: lead.date,
        module: inbModuleOf(sale || purchase), saleVno: (sale && sale.vno) || '', purchaseVno: (purchase && purchase.vno) || '',
        approvedAt: (sale && (sale.approvedAt || sale.updatedAt)) || '',
        saleTotal, purTotal: purchase ? Number(purchase.total) || 0 : 0,
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
  const pendingTab = status === 'pending';
  const allKeys = shown.map((d) => d.key);
  const toggleAll = () => setSel((s) => (s.size === allKeys.length ? new Set() : new Set(allKeys)));
  // Only PENDING legs can be approved/rejected; an already-approved leg is skipped.
  const idsOf = (d) => [d.sale, d.purchase].filter(Boolean).filter((l) => l.status === 'pending').map((l) => l.id || l._id);
  const toggle = (lk) => setSel((s) => { const n = new Set(s); if (n.has(lk)) n.delete(lk); else n.add(lk); return n; });

  const doApprove = async (list) => {
    const ids = list.flatMap(idsOf);
    if (!ids.length) return;
    const { confirmed } = await confirmDialog({ title: `Approve ${list.length} INB deal(s)?`, message: 'Each posts its INB Sale + airline Purchase to the books.', confirmLabel: 'Approve' });
    if (!confirmed) return;
    setBusy(true);
    approveMany.mutate({ ids, approver: 'admin' }, {
      onSuccess: (res) => { setSel(new Set()); const a = (res && res.approved) != null ? res.approved : ids.length, f = (res && res.failed) || 0; toast(f ? `Approved ${a}, ${f} failed` : `Approved ${list.length} INB deal(s)`, f ? 'error' : 'success'); },
      onError: (e) => toast((e && e.message) || 'Approve failed', 'error'),
      onSettled: () => setBusy(false),
    });
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
    try { await apiPost('/api/inter-branch/revoke', { linkNo: d.linkNo, reason }); toast(`Revoked ${d.linkNo} → Pending`); qc.invalidateQueries({ queryKey: ['vouchers'] }); qc.invalidateQueries({ queryKey: ['accounting'] }); }
    catch (e) { toast((e && e.message) || 'Revoke failed', 'error'); }
    finally { setBusy(false); }
  };

  const tab = (k, label) => (
    <button key={k} onClick={() => { setStatus(k); setSel(new Set()); }} style={{ padding: '8px 16px', border: 'none', borderBottom: `3px solid ${status === k ? C.gold : 'transparent'}`, background: 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: status === k ? C.dark : C.dim }}>
      {label} <span style={{ fontSize: 11, color: C.dim }}>({(counts[k] && counts[k].n) || 0}{counts[k] ? ` · ${money(counts[k].amount)}` : ''})</span>
    </button>
  );

  const COLS = pendingTab
    ? ['', 'INB Link No', 'Date', 'From → To', 'Module', 'Sale Inv', 'Purchase Inv', 'Sale', 'Purchase', 'Margin (SVF)', 'GP %', 'Actions']
    : ['INB Link No', 'Date', 'From → To', 'Module', 'Sale Inv', 'Purchase Inv', 'Sale', 'Purchase', 'Margin (SVF)', 'GP %', status === 'approved' ? 'Approved' : 'Status'];
  const colSpan = COLS.length;

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '12px 2px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: C.dark }}>INB SPG Approvals</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: C.dim }}>Pending have no books impact; approving posts the linked INB Sale + airline Purchase under one INB Link No. Each row is one inter-branch deal.</p>
        </div>
        {setRoute && <button onClick={() => setRoute('/bookings/inter-branch')} style={{ padding: '8px 14px', background: C.dark, color: C.gold, border: 'none', borderRadius: 7, fontWeight: 800, fontSize: 12.5, cursor: 'pointer' }}>+ New INB Voucher</button>}
      </div>

      <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>{tab('pending', 'Pending')}{tab('approved', 'Approved')}{tab('rejected', 'Rejected')}</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <div style={{ position: 'relative', flex: '0 1 380px', minWidth: 200 }}>
          <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9197a3', pointerEvents: 'none' }}>🔍</span>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search INB Link · Vno · branch · module · amount…" aria-label="Search INB deals"
            style={{ width: '100%', padding: '6px 26px 6px 28px', border: `1px solid ${C.border}`, borderRadius: 7, fontSize: 12, outline: 'none', background: '#fff' }} />
          {search && <button onClick={() => setSearch('')} aria-label="Clear search" style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#9197a3', fontSize: 14, lineHeight: 1 }}>✕</button>}
        </div>
        {needle && <span style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>{shown.length} match{shown.length === 1 ? '' : 'es'}</span>}
        {pendingTab && shown.length > 0 && (
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <button onClick={toggleAll} style={{ padding: '5px 11px', fontSize: 11, color: C.blue, background: '#fff', border: '1px solid #bcd4ee', borderRadius: 6, cursor: 'pointer' }}>{sel.size === allKeys.length && allKeys.length ? '☑ Clear' : `☐ Select all (${allKeys.length})`}</button>
            {sel.size > 0 && isApprover && <button disabled={busy} onClick={() => doApprove(shown.filter((d) => sel.has(d.key)))} style={{ padding: '5px 13px', fontSize: 11.5, background: C.green, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 800, cursor: 'pointer' }}>Approve selected ({sel.size})</button>}
          </span>
        )}
      </div>

      <div style={{ ...card, overflowX: 'auto' }}>
        {q.isLoading ? <div style={{ padding: 12 }}><SkeletonTable rows={6} cols={COLS.length} /></div>
          : shown.length === 0 ? <div style={{ padding: 24, textAlign: 'center', color: C.dim, fontSize: 12 }}>{pendingTab ? 'No pending INB deals. Create one under “INB Voucher”.' : `No ${status} INB deals.`}</div>
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
                      {pendingTab && <td style={{ padding: '7px 12px' }}><input type="checkbox" checked={sel.has(d.key)} onChange={() => toggle(d.key)} aria-label={`select ${d.linkNo}`} /></td>}
                      <td {...clickable(() => setOpen((o) => (o === d.key ? null : d.key)))} title="Show JV details" style={{ padding: '7px 12px', fontFamily: 'monospace', color: C.blue, cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}>{open === d.key ? '▾ ' : '▸ '}{d.linkNo}</td>
                      <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>{fmtDate(d.date)}</td>
                      <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>{d.from} → {d.to}</td>
                      <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>{d.module}</td>
                      <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 11 }}>{d.saleVno || '—'}</td>
                      <td style={{ padding: '7px 12px', fontFamily: 'monospace', fontSize: 11 }}>{d.purchaseVno || '—'}</td>
                      <td style={{ padding: '7px 12px', ...num }}>{d.sale ? money(d.saleTotal) : '—'}</td>
                      <td style={{ padding: '7px 12px', ...num }}>{d.purchase ? money(d.purTotal) : '—'}</td>
                      <td style={{ padding: '7px 12px', ...num, color: C.green, fontWeight: 700 }}>{money(d.margin)}</td>
                      <td style={{ padding: '7px 12px', ...num, color: C.dim }}>{d.gpPct}%</td>
                      {pendingTab
                        ? <td style={{ padding: '7px 12px', whiteSpace: 'nowrap' }}>
                            {isApprover ? <>
                              {d.sale && <button disabled={busy} onClick={() => setEditId(d.sale.id || d.sale._id)} title="Edit the INB sale leg, then approve" style={{ marginRight: 6, padding: '5px 10px', background: '#fff', color: C.blue, border: `1px solid ${C.blue}`, borderRadius: 5, fontWeight: 700, cursor: 'pointer' }}>✎ Sale</button>}
                              {d.purchase && <button disabled={busy} onClick={() => setEditId(d.purchase.id || d.purchase._id)} title="Edit the airline purchase leg, then approve" style={{ marginRight: 6, padding: '5px 10px', background: '#fff', color: C.blue, border: `1px solid ${C.blue}`, borderRadius: 5, fontWeight: 700, cursor: 'pointer' }}>✎ Pur</button>}
                              <button disabled={busy} onClick={() => doApprove([d])} style={{ marginRight: 6, padding: '5px 10px', background: C.green, color: '#fff', border: 'none', borderRadius: 5, fontWeight: 700, cursor: 'pointer' }}>Approve</button>
                              <button disabled={busy} onClick={() => doReject(d)} style={{ padding: '5px 10px', background: '#fff', color: C.red, border: `1px solid ${C.red}`, borderRadius: 5, fontWeight: 700, cursor: 'pointer' }}>Reject</button>
                            </> : <span style={{ fontSize: 11, color: C.dim }}>Approver only</span>}
                          </td>
                        : <td style={{ padding: '7px 12px', whiteSpace: 'nowrap', color: C.dim }}>{status === 'approved'
                            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
                                <span>{fmtDate(d.approvedAt) || 'Posted'}</span>
                                {isApprover && <button disabled={busy} onClick={() => doRevoke(d)} title="Revoke this INB deal — un-post both legs to Pending (numbers kept)" style={{ padding: '4px 9px', background: '#fff', color: C.gold, border: `1px solid ${C.gold}`, borderRadius: 5, fontWeight: 700, cursor: 'pointer', fontSize: 11 }}>⟲ Revoke</button>}
                              </span>
                            : d.status}</td>}
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
      <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>INB SPG vouchers post as <b>Pending</b> and hit the books only on approval — the INB Sale and its airline Purchase post together under one INB Link No. Click a row for the JV (Dr/Cr) of both legs.</div>

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
    <div style={{ margin: 12 }}>
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
