// ─── Voucher Approvals ────────────────────────────────────────────────────────
// Approval queue for the gated voucher types (Payment, Receipt, Contra, Journal,
// Credit Note, Debit Note, Purchase Expense). Manual entries AND bulk uploads land
// here as PENDING and hit the books only when approved.
// Single nested sheet: Group › Sub-group › Ledger › Entry (collapsible).
import React, { useMemo, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '../core/api';
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
import { useVoucherApprovals, useApproveVoucher, useRejectVoucher, useDeleteVoucher, useApproveMany, useApproveAll, branchCode } from '../core/useAccounting';
import { VoucherEditor } from './accountingLive';
import { BookingApprovals } from './bookingOrder';
import { bc } from '../core/styles';
import { PeriodBar, periodRange } from '../core/period';
import { CONSOLIDATED_LABEL } from '../core/data';
import { SkeletonTable } from '../shell/primitives';

// Full rupee amount with Indian grouping — NO Cr/L abbreviation.
const money = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');

const C = { dark: '#1a1c22', gold: '#c2a04a', blue: '#2563eb', red: '#dc2626', green: '#16a34a', dim: '#5b616e', border: '#cdd1d8' };
const VCH = { payment: 'Payment', receipt: 'Receipt', contra: 'Contra', journal: 'Journal', 'credit-note': 'Credit Note', 'debit-note': 'Debit Note', 'purchase-expense': 'Purchase Expense', refund: 'Refund', reissue: 'Reissue', adm: 'ADM', acm: 'ACM' };
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

export function VoucherApprovals({ branch, currentUser }) {
  // Deleting a voucher is admin-only (Super Admin / Director). A Branch Accountant
  // can EDIT (which returns it to Pending for re-approval) but never delete — so the
  // Delete button is hidden for non-admins (the backend also 403s the delete).
  const isAdmin = /super.?admin|director/i.test(currentUser?.role || '');
  const [status, setStatus] = useState('pending');
  const [open, setOpen] = useState({});
  const [sel, setSel] = useState(() => new Set()); // selected voucher ids (multi-approve)
  const [editId, setEditId] = useState(null);      // voucher being edited (fix → approve)
  const [viewId, setViewId] = useState(null);      // voucher being viewed (read-only formatted view)
  const viewRef = useRef(null);
  const [view, setView] = useState('tree');        // entry | voucher | tree (Group-Subgroup-Ledger)
  useModalEsc(() => setViewId(null), !!viewId);     // Esc closes the view modal
  useModalEsc(() => setEditId(null), !!editId);     // Esc closes the edit modal
  const cur = (bc(branch) || {}).cur || '₹';
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
  const q = useVoucherApprovals(branch, status, { from: effRange.from, to: effRange.to });
  const d = q.data || {};
  // Vouchers edited ≥ once (cross-cuts status) — its own source for the Edited tab.
  // Uses the SAME branch resolution as every other voucher query (branchCode →
  // undefined for "ALL", which apiGet omits → all branches).
  const brCode = branchCode(branch);
  const editedQ = useQuery({ queryKey: ['voucher-edited', brCode || 'all'], queryFn: () => apiGet('/api/vouchers/edited', brCode ? { branch: brCode } : {}) });
  const editedRows = editedQ.data || [];
  const counts = {
    ...(d.counts || { pending: { n: 0, amount: 0 }, approved: { n: 0, amount: 0 }, rejected: { n: 0, amount: 0 }, deleted: { n: 0, amount: 0 } }),
    edited: { n: editedRows.length, amount: editedRows.reduce((s, r) => s + (r.total || 0), 0) },
  };
  const entries = d.entries || [];
  const approve = useApproveVoucher();
  const reject = useRejectVoucher();
  const del = useDeleteVoucher();
  const approveMany = useApproveMany();
  const approveAll = useApproveAll();
  const busy = approve.isPending || reject.isPending || del.isPending || approveMany.isPending || approveAll.isPending;

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

  const allIds = useMemo(() => [...new Set(entries.map((e) => e.id))], [entries]);
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
    if (confirmed) approveAll.mutate({ branch, approver: 'admin' }, {
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
    entries.forEach((e) => {
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
          return { ...l, entries: l.entries.sort((x, y) => String(x.date).localeCompare(String(y.date))) };
        });
        return { ...s, ledgers };
      });
      return { ...g, subs };
    });
    return { tree: out, allKeys };
  }, [entries]);

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
  const flatEntries = useMemo(() => [...entries].sort((a, b) => String(a.date).localeCompare(String(b.date))), [entries]);
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
        <button onClick={() => setEditId(e.id)} disabled={busy} title="Edit — un-posts this voucher and returns it to Pending for re-approval" style={ABTN(C.blue)}>Edit</button>
        {isAdmin && <button onClick={() => doDelete(e.id)} disabled={busy} title="Reverse out of the books → view-only (number not reusable)" style={ABTN(C.red)}>Delete</button>}
      </>
    ) : status === 'deleted' ? (
      <span title={e.deletedReason || ''} style={{ fontSize: 10, fontWeight: 700, color: C.dim }}>🗑 {e.deletedBy || 'deleted'}</span>
    ) : <span style={{ fontSize: 10, fontWeight: 700, color: C.red }}>✗ rejected</span>
  );
  const vnoCell = (e, show = true) => <td {...(show ? clickable(() => setViewId(e.id)) : {})} title={show ? 'View full voucher' : ''} style={{ ...flatTd, color: C.blue, fontWeight: 700, cursor: show ? 'pointer' : 'default', textDecoration: show ? 'underline' : 'none', background: flagged.has(e.vno) ? '#FFF6D6' : undefined }}>{show ? e.vno : ''}</td>;

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
  const TYPE_ORDER = ['receipt', 'payment', 'contra', 'journal', 'credit-note', 'debit-note', 'purchase-expense'];
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
  const shortHead = (h) => String(h).replace(/\s*\[(BOM|AMD|NBO|DAR|FBM|TKHO)\]/gi, '').trim();
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
          <div className="kbiz-page-title">Voucher Approvals</div>
          <div style={{ fontSize: 12, color: C.dim }}>{branchLabel(branch)} · Payment · Receipt · Contra · Journal · Credit/Debit Note · Purchase Expense — manual & bulk post only when approved</div>
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
        {status !== 'edited' && <div style={{ display: 'flex', gap: 6, padding: '8px 12px', background: '#fafbfe', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'inline-flex', border: '1px solid #cdd1d8', borderRadius: 7, overflow: 'hidden' }}>
            {[['entry', 'Entry wise'], ['columnar', 'Columnar (all heads)'], ['voucher', 'Voucher Type wise'], ['tree', 'Group-Subgroup-Ledger-Entry']].map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '5px 11px', fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', background: view === v ? C.blue : '#fff', color: view === v ? '#fff' : C.dim }}>{l}</button>
            ))}
          </div>
          <span style={{ fontSize: 11, color: C.dim, fontWeight: 700 }} title="Total Debit = Total Credit = the tab total. A purchase with TDS credits the supplier net; the TDS sits in Duties & Taxes.">Σ Dr {money(totDr)} = Cr {money(totCr)}</span>
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6 }}>
            {status === 'pending' && allIds.length > 0 && (
              <button onClick={toggleAllSel} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${C.blue}`, borderRadius: 5, background: sel.size === allIds.length ? C.blue : '#fff', color: sel.size === allIds.length ? '#fff' : C.blue, cursor: 'pointer' }}>{sel.size === allIds.length ? '☑ Clear' : `☐ Select all (${allIds.length})`}</button>
            )}
            {(view === 'tree' || view === 'voucher') && <>
              <button onClick={() => setMany(view === 'tree' ? allKeys : typeKeys, true)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${C.dark}`, borderRadius: 5, background: '#fff', color: C.dark, cursor: 'pointer' }}>⊞ Expand all</button>
              <button onClick={() => setMany(view === 'tree' ? allKeys : typeKeys, false)} style={{ padding: '4px 10px', fontSize: 11, fontWeight: 700, border: `1px solid ${C.dark}`, borderRadius: 5, background: '#fff', color: C.dark, cursor: 'pointer' }}>⊟ Collapse all</button>
            </>}
          </span>
          {q.isFetching && <span style={{ fontSize: 11, color: C.dim }}>updating…</span>}
        </div>}
      </div>

      {status === 'edited' ? (
        <EditedVouchersList rows={editedRows} isLoading={editedQ.isLoading} open={open} setOpen={setOpen} setViewId={setViewId} />
      ) : (
      <div style={{ ...card }}>
        {q.isLoading ? <div style={{ padding: 12 }}><SkeletonTable rows={8} cols={5} /></div> : (
          <div style={{ maxHeight: '72vh', overflow: 'auto', fontSize: 12.5 }}>
            {flatEntries.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: C.dim }}>No {status} vouchers.</div>}
            {flatEntries.length > 0 && view === 'voucher' && voucherTypeWise()}
            {flatEntries.length > 0 && view === 'entry' && entryWise()}
            {flatEntries.length > 0 && view === 'columnar' && columnarWise()}
            {view === 'tree' && tree.map((g) => {
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
                                              <button onClick={() => setEditId(e.id)} disabled={busy} title="Edit — un-posts this voucher and returns it to Pending for re-approval" style={{ padding: '3px 9px', background: '#fff', color: C.blue, border: `1px solid ${C.blue}`, borderRadius: 5, fontWeight: 700, fontSize: 10.5, cursor: 'pointer', marginRight: 5 }}>Edit</button>
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
              <AuditTrail entityType="voucher" entityId={viewId} />
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
function EditedVouchersList({ rows, isLoading, open, setOpen, setViewId }) {
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
                    <AuditTrail entityType="voucher" entityId={r.id} />
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

// ─── Unified Approvals ────────────────────────────────────────────────────────
// One screen for ALL approvals: a top toggle switches between SO/PO/GP bookings
// and Vouchers; each shows Pending · Approved · Rejected · Deleted · Edited.
export function UnifiedApprovals({ branch, setRoute, currentUser, initialDomain = 'sopogp' }) {
  // Opened from an Alert deep-link targeting a voucher → start on the Vouchers tab.
  const navFocus = useNavFocusStore((s) => s.focus);
  const focusVoucher = navFocus && navFocus.params && navFocus.params.kind === 'voucher';
  const [domain, setDomain] = useState(focusVoucher ? 'vouchers' : initialDomain);
  const seg = (k, label) => (
    <button key={k} onClick={() => setDomain(k)} style={{ padding: '8px 18px', fontSize: 13, fontWeight: 800, border: `1px solid ${domain === k ? C.dark : '#d6dbe6'}`, background: domain === k ? C.dark : '#fff', color: domain === k ? C.gold : C.dim, cursor: 'pointer' }}>{label}</button>
  );
  return (
    <div style={{ margin: 12 }}>
      <FocusBanner />
      <div style={{ display: 'inline-flex', borderRadius: 8, overflow: 'hidden', marginBottom: 4 }}>
        {seg('sopogp', 'SO / PO / GP')}{seg('vouchers', 'Vouchers')}
      </div>
      {domain === 'sopogp'
        ? <BookingApprovals branch={branch} setRoute={setRoute} currentUser={currentUser} />
        : <VoucherApprovals branch={branch} currentUser={currentUser} />}
    </div>
  );
}
