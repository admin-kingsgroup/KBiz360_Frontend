/* ════════════════════════════════════════════════════════════════════════════
   BOOKING LIST / APPROVAL QUEUE
   PendingBookings, ApprovedBookings, DeletedBookings and RejectedBookings are
   NOT referenced anywhere (not even destructured in App.jsx) — retired,
   superseded by BookingApprovals, kept for reference only.

   BUSINESS SUB-MODULE REORG (2026-07-13): SoPoGpVoucherEntry (and its private
   helpers ExtraPurchases/rowsForEdit/inbRowsFromDeal/ALLOWED_LEG_MODULES/
   legToPayload) moved to accounts/daily-entry/soPoGpVoucherEntry.jsx (MENU_ACCOUNTS
   ▸ Daily Entry ▸ Sales & Inter-Branch) — re-exported below so App.jsx's direct
   chunk import of this barrel, and this file's own test suite (which imports
   rowsForEdit/inbRowsFromDeal directly from './legacy'), needed zero changes.

   BUSINESS SUB-MODULE REORG (2026-07-14): BookingApprovals + BookingTable +
   GroupByBar + SopogpRefunds + EditedBookingsList + their shared helpers
   (useBookings, groupBookings, sumT/gpPctOf/gpPctTxt, makeBookingReview(Selected),
   isAdminRole/isApproverRole/canRevokeBooking, makeOnRevoke, RefundAmountCell)
   moved to modules/approvals/bookingApprovals.jsx — BookingApprovals is the
   Approvals nav module's own screen (used by voucherApprovals.jsx's
   UnifiedApprovals dispatcher), not an Accounts screen. Re-exported below so
   this barrel, and every test that mocks/imports '../bookingOrder' directly
   for BookingApprovals, needed zero changes. The retired screens below
   (Pending/Approved/Deleted/RejectedBookings, EditPaxModal) still reference
   some of the moved names — harmless, since none of them are ever called.
   ════════════════════════════════════════════════════════════════════════════ */
import { useState } from 'react';
import {
  Plus, Trash2, Save, RefreshCw, Clock, CheckCircle2, XCircle, FileCheck2, Pencil,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { inp, card, btnG, btnGh, bc } from '../../core/styles.jsx';
import { useModalEsc } from '../../core/ux/useModalEsc';
import { PeriodBar, periodRange } from '../../core/period';
import { apiPost } from '../../core/api';
import { toast } from '../../core/ux/toast';
import { confirmDialog } from '../../core/ux/confirm';
import { SmartDateInput } from '../../core/ux/SmartDateInput';
import { VSPECS } from '../../core/voucherSpecs.js';
import { invalidateBooks } from '../../core/useAccounting';
import {
  rowsForEdit, inbRowsFromDeal, ALLOWED_LEG_MODULES, legToPayload, SoPoGpVoucherEntry,
} from '../accounts/daily-entry/soPoGpVoucherEntry';

export { rowsForEdit, inbRowsFromDeal, ALLOWED_LEG_MODULES, legToPayload, SoPoGpVoucherEntry };
export { BookingApprovals } from '../approvals/bookingApprovals';

export function PendingBookings({ branch, setRoute }) {
  const brCode = brCodeOf(branch) || 'ALL';
  const cur = bc(branch).cur;
  const qc = useQueryClient();
  const { data = [], isLoading } = useBookings(brCode);
  const [open, setOpen] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState('');
  const [editing, setEditing] = useState(null); useModalEsc(() => setEditing(null), !!editing);
  const [groupBy, setGroupBy] = useState('none');
  const [sel, setSel] = useState(() => new Set());
  const [range, setRange] = useState(() => periodRange('all', { branch })); // default All so Pending shows everything
  const inRange = (dt) => (!range.from || dt >= range.from) && (!range.to || dt <= range.to);

  const rows = data.filter((b) => b.status === 'pending' && inRange(b.date || ''));
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
      invalidateBooks(qc); // posting spawns Sale+Purchase journals → refresh every books cache
    } catch (e) { setMsg('⚠ ' + (e.message || 'Approve failed')); }
    finally { setBusyId(null); }
  };
  const onCancel = async (b) => {
    const { confirmed, reason } = await confirmDialog({ title: `Reject voucher ${b.bookingNo}?`, message: 'It will be marked Rejected (no books impact).', danger: true, reasonRequired: true, reasonLabel: 'Reason for rejection', confirmLabel: 'Reject' });
    if (!confirmed) return;
    setBusyId(b.id);
    try { await apiPost('/api/booking-orders/' + b.id + '/reject', { reason }); qc.invalidateQueries({ queryKey: ['booking-orders'] }); setOpen(null); setMsg(`✓ Rejected ${b.bookingNo}.`); }
    catch (e) { setMsg('⚠ ' + (e.message || 'Reject failed')); }
    finally { setBusyId(null); }
  };
  const onApproveSelected = async () => {
    if (!sel.size) return;
    const { confirmed } = await confirmDialog({ title: `Approve ${sel.size} selected voucher(s)?`, message: 'Each posts its linked Sales + Purchase.', confirmLabel: 'Approve' });
    if (!confirmed) return;
    setBusyId('bulk'); setMsg(`⏳ Approving ${sel.size} voucher(s)… please wait.`);
    try {
      const res = await apiPost('/api/booking-orders/approve-many', { ids: [...sel] });
      setMsg(`✓ Approved ${res.approved} of ${res.total}${res.failed ? ` · ${res.failed} failed${res.errors?.[0] ? ` — ${res.errors[0]}` : ''}` : ''}.`);
      setSel(new Set()); qc.invalidateQueries({ queryKey: ['booking-orders'] });
      invalidateBooks(qc); // each posting spawns Sale+Purchase journals → refresh every books cache
    } catch (e) { setMsg('⚠ ' + (e.message || 'Bulk approve failed')); }
    finally { setBusyId(null); }
  };
  const onReview = makeBookingReview(qc, setBusyId, setMsg);
  const onReviewSelected = makeBookingReviewSelected(qc, setBusyId, setMsg, sel, setSel);

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={18} style={{ color: GOLD }} /> Pending Approval</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5b616e' }}>These have <b>no books impact</b> yet. Expand a row to review the full JV, then <b>Approve &amp; Post</b> to generate the linked Sales &amp; Purchase invoices.</p>
        </div>
        <button onClick={() => setRoute && setRoute('/bookings/new')} className="max-tablet:min-h-[44px]" style={btnG}><Plus size={14} /> New voucher</button>
      </div>
      {msg && <div style={{ ...card, marginBottom: 12, fontSize: 12, color: msg.startsWith('⚠') ? '#dc2626' : '#16a34a', background: msg.startsWith('⚠') ? '#fbe9e9' : '#e8f6ed', border: '1px solid ' + (msg.startsWith('⚠') ? '#f3c9c9' : '#cde3b6') }}>{msg}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
        <PeriodBar branch={branch} compact defaultPreset="all" onChange={setRange} />
        <GroupByBar value={groupBy} onChange={setGroupBy} />
        {rows.length > 0 && (
          <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8, alignItems: 'center' }}>
            <button onClick={toggleAllSel} style={{ ...btnGh, padding: '5px 11px', fontSize: 11, color: BLUE, borderColor: '#bcd4ee' }}>{sel.size === allIds.length ? '☑ Clear' : `☐ Select all (${allIds.length})`}</button>
            {sel.size > 0 && <button disabled={busyId === 'bulk'} onClick={() => onReviewSelected('check')} style={{ ...btnGh, padding: '5px 11px', fontSize: 11, color: BLUE, borderColor: '#bcd4ee' }}>Check selected ({sel.size})</button>}
            {sel.size > 0 && <button disabled={busyId === 'bulk'} onClick={() => onReviewSelected('verify')} style={{ ...btnGh, padding: '5px 11px', fontSize: 11, color: GOLD, borderColor: '#e3cd97' }}>Verify selected ({sel.size})</button>}
            {sel.size > 0 && <button disabled={busyId === 'bulk'} onClick={onApproveSelected} style={{ ...btnG, padding: '5px 13px', fontSize: 11.5, background: DR }}>{busyId === 'bulk' ? <RefreshCw size={12} className="spin" /> : <CheckCircle2 size={12} />} {busyId === 'bulk' ? 'Approving…' : `Approve selected (${sel.size})`}</button>}
          </span>
        )}
      </div>
      <BookingTable rows={rows} isLoading={isLoading} cur={cur} open={open} setOpen={setOpen} mode="pending" groupBy={groupBy} onApprove={onApprove} onReview={onReview} onCancel={onCancel} onEdit={setEditing} busyId={busyId} sel={sel} onToggleSel={toggleSel} />
    </div>
  );
}

// ── Edit passenger details on an APPROVED booking ────────────────────────────
// Identity-only fix — names, document refs (Ticket/PNR, Hotel/Conf, Passport…)
// and Flight sectors — saved in place via POST /:id/passengers. The server applies
// ONLY these identity columns, so amounts/ledgers can't change: the booking stays
// approved and its posted Sales/Purchase stay posted. No Revoke → Edit → re-Approve
// cycle for a name typo.
function EditPaxModal({ booking, onClose, onSaved }) {
  const spec = VSPECS[booking.module];
  const [rows, setRows] = useState(() => (Array.isArray(booking.rows) ? booking.rows : []).map((r) => JSON.parse(JSON.stringify(r || {}))));
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  useModalEsc(onClose, true);
  if (!spec) return null;
  const setId = (i, key, val) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, [key]: val } : r)));
  const setSector = (i, si, key, val) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, sectors: (r.sectors || []).map((s, sx) => (sx === si ? { ...s, [key]: val } : s)) } : r)));
  const addSector = (i) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, sectors: [...(r.sectors || []), Object.fromEntries(spec.sectorCols.map((c) => [c.key, '']))] } : r)));
  const delSector = (i, si) => setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, sectors: (r.sectors || []).filter((_, sx) => sx !== si) } : r)));
  const save = async () => {
    setSaving(true); setErr('');
    try {
      await apiPost('/api/booking-orders/' + booking.id + '/passengers', { rows, editReason: reason });
      toast('Passenger details saved — booking stays approved & posted');
      onSaved();
    } catch (e) { setErr(e.message || 'Save failed'); setSaving(false); }
  };
  const smallInp = { ...inp, height: 30, fontSize: 12, padding: '4px 8px' };
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(13,19,38,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 10, width: 'min(860px, 96vw)', maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 18px 50px rgba(13,19,38,.28)', padding: '18px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 15, color: DARK, display: 'flex', alignItems: 'center', gap: 7 }}><Pencil size={15} style={{ color: BLUE }} /> Edit passenger details · {booking.bookingNo}</h3>
            <p style={{ margin: '3px 0 0', fontSize: 11.5, color: '#5b616e' }}>
              {spec.icon} {spec.name} · Link <b style={{ fontFamily: 'monospace' }}>{booking.linkNo}</b> · saved in place — <b>amounts are untouched and the booking stays approved</b> (no revoke needed).
            </p>
          </div>
          <button onClick={onClose} style={{ ...btnGh, padding: '4px 10px' }}>✕</button>
        </div>
        {err && <div style={{ margin: '10px 0', padding: '8px 12px', borderRadius: 8, background: '#fbe9e9', border: '1px solid #f3c9c9', color: '#dc2626', fontSize: 11.5, fontWeight: 700 }}>{err}</div>}
        {!rows.length && <div style={{ padding: 18, fontSize: 12, color: '#9197a3' }}>This booking has no passenger grid to edit (legacy import). Use Revoke → Edit for changes.</div>}
        {rows.map((l, i) => (
          <div key={i} style={{ border: '1px solid #e3e6ee', borderRadius: 8, padding: '10px 12px', marginTop: 10, background: '#fbfaf7' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#9197a3', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>Passenger {i + 1}</div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${spec.idCols.length}, minmax(140px, 1fr))`, gap: 8 }}>
              {spec.idCols.map((c) => (
                <label key={c.key} style={{ fontSize: 10.5, color: '#5b616e', fontWeight: 600 }}>{c.label}
                  <input value={l[c.key] ?? ''} onChange={(e) => setId(i, c.key, e.target.value)} style={{ ...smallInp, marginTop: 3, width: '100%' }} />
                </label>
              ))}
            </div>
            {spec.sectors && (
              <div style={{ marginTop: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: '#9197a3', textTransform: 'uppercase', letterSpacing: '.5px' }}>Sectors / Tickets</span>
                  <button onClick={() => addSector(i)} style={{ ...btnGh, padding: '2px 8px', fontSize: 10 }}><Plus size={11} /> Sector</button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 640 }}>
                    <thead><tr>{spec.sectorCols.map((c) => <th key={c.key} style={{ padding: '3px 6px', fontSize: 9.5, fontWeight: 700, color: '#5b616e', textTransform: 'uppercase', textAlign: 'left' }}>{c.label}</th>)}<th /></tr></thead>
                    <tbody>
                      {(l.sectors || []).map((s, si) => (
                        <tr key={si}>
                          {spec.sectorCols.map((c) => (
                            <td key={c.key} style={{ padding: 2 }}>
                              {c.type === 'date'
                                ? <SmartDateInput value={s[c.key] ?? ''} onChange={(v) => setSector(i, si, c.key, v)} style={{ ...smallInp, width: '100%' }} />
                                : <input value={s[c.key] ?? ''} onChange={(e) => setSector(i, si, c.key, e.target.value)} style={{ ...smallInp, width: '100%' }} />}
                            </td>
                          ))}
                          <td style={{ padding: 2 }}><button onClick={() => delSector(i, si)} title="Remove sector" style={{ ...btnGh, padding: '4px 7px', color: '#dc2626', borderColor: '#f3c9c9' }}><Trash2 size={11} /></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
        {rows.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <label style={{ flex: 1, minWidth: 260, fontSize: 10.5, color: '#5b616e', fontWeight: 600 }}>Reason (audit trail — optional)
              <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Name spelling corrected per passport" style={{ ...smallInp, marginTop: 3, width: '100%' }} />
            </label>
            <button onClick={onClose} disabled={saving} style={btnGh}>Cancel</button>
            <button onClick={save} disabled={saving} style={btnG}>{saving ? <RefreshCw size={13} className="spin" /> : <Save size={13} />} Save passenger details</button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ApprovedBookings({ branch, setRoute, currentUser }) {
  const brCode = brCodeOf(branch) || 'ALL';
  const cur = bc(branch).cur;
  const qc = useQueryClient();
  const { data = [], isLoading } = useBookings(brCode);
  const [open, setOpen] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [groupBy, setGroupBy] = useState('none');
  const [paxEdit, setPaxEdit] = useState(null); // booking whose passenger details are being edited in place
  const canDelete = isAdminRole(currentUser);
  const canRevoke = canRevokeBooking(currentUser);
  const onRevoke = makeOnRevoke({ qc, setBusyId, setOpen, toastFn: toast });

  const rows = data.filter((b) => b.status === 'approved' || b.status === 'posted');

  // Admin-only delete: reverses the posted Sales/Purchase out of the books (no
  // accounting effect) and keeps a view-only record under Deleted; the numbers are
  // never reused.
  const onDelete = async (b) => {
    if (!canDelete) return;
    const { confirmed, reason } = await confirmDialog({ title: `Delete approved booking ${b.bookingNo}?`, message: `Its Sales (${b.saleVno}) & Purchase (${b.purchaseVno}) invoices will be reversed out of the books. The record stays view-only under Deleted and its numbers can never be reused.`, danger: true, reasonRequired: true, reasonLabel: 'Reason for deletion', confirmLabel: 'Delete' });
    if (!confirmed) return;
    setBusyId(b.id);
    try { await apiPost('/api/booking-orders/' + b.id + '/delete', { reason }); qc.invalidateQueries({ queryKey: ['booking-orders'] }); invalidateBooks(qc); setOpen(null); toast(`Deleted ${b.bookingNo} & reversed out of the books`); }
    catch (e) { toast(e.message || 'Delete failed', 'error'); }
    finally { setBusyId(null); }
  };

  return (
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}><FileCheck2 size={18} style={{ color: DR }} /> Approved &amp; Posted</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5b616e' }}>Posted to the books as linked Sales + Purchase invoices. Expand to see the JV &amp; ledger posting. The <b>Link No</b> tracks invoice-wise GP everywhere.{canDelete ? ' Admins can Delete a booking — it reverses out of the books and is kept view-only under Deleted.' : ''}</p>
        </div>
        <button onClick={() => setRoute && setRoute('/bookings/pending')} style={btnGh}><Clock size={14} /> View pending</button>
      </div>
      <div style={{ marginBottom: 12 }}><GroupByBar value={groupBy} onChange={setGroupBy} extra={[['recent', 'Recently Approved']]} /></div>
      <BookingTable rows={rows} isLoading={isLoading} cur={cur} open={open} setOpen={setOpen} mode="approved" groupBy={groupBy} onDelete={onDelete} canDelete={canDelete} onRevoke={onRevoke} canRevoke={canRevoke} onEditPax={setPaxEdit} busyId={busyId} />
      {paxEdit && <EditPaxModal booking={paxEdit} onClose={() => setPaxEdit(null)}
        onSaved={() => { setPaxEdit(null); qc.invalidateQueries({ queryKey: ['booking-orders'] }); invalidateBooks(qc); /* voucher meta.detail changed → refresh voucher views */ }} />}
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
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}><Trash2 size={18} style={{ color: '#dc2626' }} /> Deleted</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5b616e' }}>Approved bookings an admin deleted. They were <b>reversed out of the books</b> (no accounting effect). This is a <b>view-only</b> audit trail — the Booking No, Link No and Sale/Purchase invoice numbers shown here are <b>permanently retired and can never be reused</b>.</p>
        </div>
        <button onClick={() => setRoute && setRoute('/bookings/approved')} style={btnGh}><FileCheck2 size={14} /> View approved</button>
      </div>
      <BookingTable rows={rows} isLoading={isLoading} cur={cur} open={open} setOpen={setOpen} mode="deleted" busyId={null} />
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
    <div style={{ maxWidth: 1600, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}><XCircle size={18} style={{ color: '#dc2626' }} /> Rejected</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5b616e' }}>Declined SO/PO/GP vouchers. They <b>never touched the books</b> (no Sales/Purchase invoices posted). Expand a row to review what was entered.</p>
        </div>
        <button onClick={() => setRoute && setRoute('/bookings/pending')} style={btnGh}><Clock size={14} /> View pending</button>
      </div>
      <div style={{ marginBottom: 12 }}><GroupByBar value={groupBy} onChange={setGroupBy} /></div>
      <BookingTable rows={rows} isLoading={isLoading} cur={cur} open={open} setOpen={setOpen} mode="rejected" groupBy={groupBy} busyId={null} />
    </div>
  );
}
