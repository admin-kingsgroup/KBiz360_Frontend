// ─── Purchase Expense Voucher — approval lists (approval-gated, mirrors SO/PO/GP) ─
// A Purchase Expense voucher (supplier expense / asset purchase, GST + TDS) is
// SAVED as a PENDING order — NO books impact. It appears here under Pending; an
// approver reviews the full JV (which ledger, which group, Dr/Cr) and Approves &
// Posts → that spawns ONE linked LOCKED PXP voucher (and its double-entry), and it
// moves to Approved. Reject never posts; an admin can Delete an approved order
// (reverses the voucher out of the books) and it lands under Deleted, view-only.
import React, { useState } from 'react';
import {
  Plus, Trash2, RefreshCw, Clock, CheckCircle2, XCircle, ChevronDown, ChevronRight,
  FileCheck2,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { card, btnG, btnGh, bc } from '../core/styles.jsx';
import { apiGet, apiPost } from '../core/api';

const GOLD = '#A07828', DARK = '#0d1326', DR = '#1B6B4C', CR = '#9B2C2C', BLUE = '#185FA5';
const brCodeOf = (branch) => (branch === 'ALL' ? null : (branch?.code || 'BOM'));
const fmt = (n) => Number(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ════════════════════════════════════════════════════════════════════════════
   JV / posting-detail preview (single PXP voucher)
   ════════════════════════════════════════════════════════════════════════════ */
function PostingTable({ side, accent, title }) {
  if (!side) return null;
  const balanced = Math.abs((side.totalDr || 0) - (side.totalCr || 0)) < 0.01;
  return (
    <div style={{ border: '1px solid #e1e3ec', borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: accent + '12', borderBottom: '1px solid #e1e3ec' }}>
        <span style={{ fontSize: 11.5, fontWeight: 800, color: accent }}>{title}</span>
        <span style={{ fontSize: 10.5, fontFamily: 'monospace', color: '#5a6691' }}>{side.vno} · {side.type}</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: '#f7f8fb' }}>
          {['Ledger', 'Group', 'Debit', 'Credit'].map((h, i) => <th key={h} style={{ padding: '6px 10px', fontSize: 9.5, fontWeight: 700, color: '#5a6691', textTransform: 'uppercase', textAlign: i >= 2 ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {(side.postings || []).map((p, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f0f2f7' }}>
              <td style={{ padding: '5px 10px', fontSize: 11.5, fontWeight: 600, color: DARK, paddingLeft: p.credit > 0 ? 22 : 10 }}>{p.ledger}</td>
              <td style={{ padding: '5px 10px', fontSize: 10.5, color: '#8b94b3' }}>{p.group}</td>
              <td style={{ padding: '5px 10px', fontSize: 11.5, textAlign: 'right', color: DR, fontVariantNumeric: 'tabular-nums' }}>{p.debit > 0 ? fmt(p.debit) : ''}</td>
              <td style={{ padding: '5px 10px', fontSize: 11.5, textAlign: 'right', color: CR, fontVariantNumeric: 'tabular-nums' }}>{p.credit > 0 ? fmt(p.credit) : ''}</td>
            </tr>
          ))}
        </tbody>
        <tfoot><tr style={{ borderTop: '1.5px solid ' + DARK, background: '#f7f8fb' }}>
          <td style={{ padding: '6px 10px', fontSize: 11, fontWeight: 800 }} colSpan={2}>{balanced ? '✓ Balanced' : '⚠ Unbalanced'}</td>
          <td style={{ padding: '6px 10px', fontSize: 11.5, fontWeight: 800, textAlign: 'right', color: DR }}>{fmt(side.totalDr)}</td>
          <td style={{ padding: '6px 10px', fontSize: 11.5, fontWeight: 800, textAlign: 'right', color: CR }}>{fmt(side.totalCr)}</td>
        </tr></tfoot>
      </table>
    </div>
  );
}

function ExpenseJournalView({ id, cur }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['expense-order-journal', id],
    queryFn: () => apiGet('/api/purchase-expense-orders/' + id + '/journal'),
  });
  if (isLoading) return <div style={{ padding: 14, fontSize: 12, color: '#8b94b3' }}>Building JV…</div>;
  if (error) return <div style={{ padding: 14, fontSize: 12, color: '#A32D2D' }}>{error.message || 'Failed to build JV'}</div>;
  if (!data) return null;
  const approved = data.status === 'approved' || data.status === 'posted';
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 10, fontSize: 11.5, color: '#5a6691' }}>
        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: GOLD }}>{data.expenseNo}</span>
        <span>Supplier: <b style={{ color: DARK }}>{data.party || '—'}</b></span>
        <span style={{ fontStyle: 'italic', color: '#9A9A9A' }}>journal entries that {approved ? 'were posted' : 'will post on approval'}</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 12 }}>
        <PostingTable side={data.purchase} accent={CR} title="Purchase Expense (Dr expense + input GST · Cr supplier)" />
      </div>
      <div style={{ marginTop: 14, border: '1px dashed #cdbb8e', borderRadius: 8, background: '#FDFAF4', padding: '12px 14px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: GOLD, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
          {approved ? '✓ Where this is posted' : 'Where this will post on approval'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: '6px 18px' }}>
          {[
            ['Day Book / Ledgers', 'the voucher appears in the Day Book and each ledger statement (the expense/asset head, input GST, the supplier creditor, TDS Payable).'],
            ['Trial Balance', 'every Dr/Cr leg lands in the Trial Balance under its group.'],
            ['Profit & Loss / Balance Sheet', 'an expense head hits the P&L; an asset head sits on the Balance Sheet — alongside the supplier (Sundry Creditors) and input GST / TDS Payable (Duties & Taxes).'],
            ['Purchase Register & Payables', 'it shows as a supplier bill in the Purchase Register and adds to the supplier outstanding / ageing.'],
            ['GST report', 'input GST flows into the GST credit; TDS into the TDS return.'],
          ].map(([k, v]) => (
            <div key={k} style={{ fontSize: 11, color: '#3A3A3A', lineHeight: 1.45 }}><b style={{ color: DARK }}>{k}</b> — {v}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════════
   List table
   ════════════════════════════════════════════════════════════════════════════ */
function ExpenseTable({ rows, isLoading, cur, open, setOpen, mode, onApprove, onReject, onDelete, canDelete, busyId }) {
  const cols = mode === 'approved'
    ? ['', 'Expense No', 'PXP Voucher', 'Supplier', 'Taxable', 'GST', 'Total', 'Approved', 'Actions']
    : mode === 'rejected'
      ? ['', 'Expense No', 'Bill No', 'Supplier', 'Taxable', 'GST', 'Total', 'Date', 'Reason']
      : mode === 'deleted'
        ? ['', 'Expense No', 'PXP Voucher', 'Supplier', 'Taxable', 'GST', 'Total', 'Deleted', 'By']
        : ['', 'Expense No', 'Bill No', 'Supplier', 'Taxable', 'GST', 'Total', 'Date', 'Actions'];
  const numCols = [4, 5, 6];
  return (
    <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: '#f3f4f8' }}>
          {cols.map((h, i) => <th key={i} style={{ padding: '9px 12px', fontSize: 10, fontWeight: 700, color: '#5a6691', textTransform: 'uppercase', textAlign: numCols.includes(i) ? 'right' : 'left', whiteSpace: 'nowrap' }}>{h}</th>)}
        </tr></thead>
        <tbody>
          {isLoading && <tr><td colSpan={cols.length} style={{ padding: 20, textAlign: 'center', color: '#8b94b3', fontSize: 12 }}>Loading…</td></tr>}
          {!isLoading && rows.length === 0 && <tr><td colSpan={cols.length} style={{ padding: 22, textAlign: 'center', color: '#8b94b3', fontSize: 12 }}>{mode === 'pending' ? 'No pending vouchers. Create one under “Purchase Expense Voucher”.' : mode === 'rejected' ? 'No rejected vouchers.' : mode === 'deleted' ? 'No deleted vouchers.' : 'No approved vouchers yet.'}</td></tr>}
          {rows.map((o) => {
            const isOpen = open === o.id;
            return (
              <React.Fragment key={o.id}>
                <tr onClick={() => setOpen(isOpen ? null : o.id)} style={{ borderBottom: '1px solid #f0f2f7', cursor: 'pointer', background: isOpen ? '#faf7ef' : '#fff' }}>
                  <td style={{ padding: '8px 12px' }}>{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</td>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, fontSize: 11.5 }}>{o.expenseNo}</td>
                  {mode === 'approved' || mode === 'deleted'
                    ? <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: BLUE, fontSize: 11 }}>{o.voucherVno || '—'}</td>
                    : <td style={{ padding: '8px 12px', fontSize: 12 }}>{o.billNo || '—'}</td>}
                  <td style={{ padding: '8px 12px', fontSize: 12 }}>{o.party || '—'}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{fmt(o.subtotal)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{fmt(o.taxAmt)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: DARK, fontSize: 11.5, fontVariantNumeric: 'tabular-nums' }}>{fmt(o.total)}</td>
                  <td style={{ padding: '8px 12px', fontSize: 11, color: '#5a6691' }}>{mode === 'approved' ? (o.approvedAt ? String(o.approvedAt).slice(0, 10) : '—') : mode === 'deleted' ? (o.deletedAt ? String(o.deletedAt).slice(0, 10) : '—') : o.date}</td>
                  <td style={{ padding: '8px 12px' }} onClick={(e) => e.stopPropagation()}>
                    {mode === 'pending' ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button disabled={busyId === o.id} onClick={() => onApprove(o)} style={{ ...btnG, padding: '4px 10px', fontSize: 10.5, background: DR }}>
                          {busyId === o.id ? <RefreshCw size={12} className="spin" /> : <CheckCircle2 size={12} />} Approve
                        </button>
                        <button disabled={busyId === o.id} onClick={() => onReject(o)} style={{ ...btnGh, padding: '4px 9px', fontSize: 10.5, color: '#A32D2D', borderColor: '#F7C1C1' }}><XCircle size={12} /> Reject</button>
                      </div>
                    ) : mode === 'approved' ? (
                      canDelete
                        ? <button disabled={busyId === o.id} onClick={() => onDelete(o)} style={{ ...btnGh, padding: '4px 9px', fontSize: 10.5, color: '#A32D2D', borderColor: '#F7C1C1' }}><Trash2 size={12} /> Delete</button>
                        : <span style={{ fontSize: 10.5, color: '#b0b7cc' }}>admin only</span>
                    ) : mode === 'deleted' ? (
                      <span style={{ fontSize: 11, color: '#8b94b3' }} title={o.deletedReason || ''}>{o.deletedBy || '—'}{o.deletedReason ? ` · ${o.deletedReason}` : ''}</span>
                    ) : (
                      <span style={{ fontSize: 11, color: '#8b94b3' }}>{o.rejectedReason || '—'}</span>
                    )}
                  </td>
                </tr>
                {isOpen && (
                  <tr><td colSpan={cols.length} style={{ padding: '12px 16px', background: '#faf9f5', borderBottom: '1px solid #eee3cf' }}>
                    <ExpenseJournalView id={o.id} cur={cur} />
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

function useExpenseOrders(brCode) {
  return useQuery({
    queryKey: ['purchase-expense-orders', brCode],
    queryFn: () => apiGet('/api/purchase-expense-orders', { branch: brCode === 'ALL' ? '' : brCode }),
  });
}

const isAdminRole = (u) => ['Super Admin', 'Director'].includes(u?.role);

/* ════════════════════════════════════════════════════════════════════════════
   Pages
   ════════════════════════════════════════════════════════════════════════════ */
export function PendingExpenseOrders({ branch, setRoute }) {
  const brCode = brCodeOf(branch) || 'ALL';
  const cur = bc(branch).cur;
  const qc = useQueryClient();
  const { data = [], isLoading } = useExpenseOrders(brCode);
  const [open, setOpen] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [msg, setMsg] = useState('');
  const rows = data.filter((o) => o.status === 'pending');

  const onApprove = async (o) => {
    setBusyId(o.id); setMsg('');
    try {
      const res = await apiPost('/api/purchase-expense-orders/' + o.id + '/approve');
      setMsg(`✓ Approved ${o.expenseNo}. Posted PXP voucher ${res.voucherVno}.`);
      qc.invalidateQueries({ queryKey: ['purchase-expense-orders'] });
      qc.invalidateQueries({ queryKey: ['accounting'] });
      qc.invalidateQueries({ queryKey: ['vouchers'] });
    } catch (e) { setMsg('⚠ ' + (e.message || 'Approve failed')); }
    finally { setBusyId(null); }
  };
  const onReject = async (o) => {
    const reason = window.prompt(`Reject voucher ${o.expenseNo}? It will be marked Rejected (no books impact). Optional reason:`, '');
    if (reason === null) return;
    setBusyId(o.id);
    try { await apiPost('/api/purchase-expense-orders/' + o.id + '/reject', { reason }); qc.invalidateQueries({ queryKey: ['purchase-expense-orders'] }); setOpen(null); setMsg(`✓ Rejected ${o.expenseNo}.`); }
    catch (e) { setMsg('⚠ ' + (e.message || 'Reject failed')); }
    finally { setBusyId(null); }
  };

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={18} style={{ color: GOLD }} /> Pending Approval — Purchase Expense</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5a6691' }}>These have <b>no books impact</b> yet. Expand a row to review the full JV, then <b>Approve &amp; Post</b> to generate the linked PXP voucher.</p>
        </div>
        <button onClick={() => setRoute && setRoute('/purchase-expense')} style={btnG}><Plus size={14} /> New voucher</button>
      </div>
      {msg && <div style={{ ...card, marginBottom: 12, fontSize: 12, color: msg.startsWith('⚠') ? '#A32D2D' : '#27500A', background: msg.startsWith('⚠') ? '#FCEBEB' : '#EAF3DE', border: '1px solid ' + (msg.startsWith('⚠') ? '#F7C1C1' : '#cde3b6') }}>{msg}</div>}
      <ExpenseTable rows={rows} isLoading={isLoading} cur={cur} open={open} setOpen={setOpen} mode="pending" onApprove={onApprove} onReject={onReject} busyId={busyId} />
    </div>
  );
}

export function ApprovedExpenseOrders({ branch, setRoute, currentUser }) {
  const brCode = brCodeOf(branch) || 'ALL';
  const cur = bc(branch).cur;
  const qc = useQueryClient();
  const { data = [], isLoading } = useExpenseOrders(brCode);
  const [open, setOpen] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const canDelete = isAdminRole(currentUser);
  const rows = data.filter((o) => o.status === 'approved' || o.status === 'posted');

  const onDelete = async (o) => {
    if (!canDelete) return;
    const reason = window.prompt(`Delete approved voucher ${o.expenseNo}?\n\nIts PXP voucher (${o.voucherVno}) will be reversed out of the books. The record stays view-only under Deleted and its numbers can never be reused.\n\nOptional reason:`, '');
    if (reason === null) return;
    setBusyId(o.id);
    try { await apiPost('/api/purchase-expense-orders/' + o.id + '/delete', { reason }); qc.invalidateQueries({ queryKey: ['purchase-expense-orders'] }); qc.invalidateQueries({ queryKey: ['accounting'] }); qc.invalidateQueries({ queryKey: ['vouchers'] }); setOpen(null); }
    catch (e) { window.alert(e.message || 'Delete failed'); }
    finally { setBusyId(null); }
  };

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}><FileCheck2 size={18} style={{ color: DR }} /> Approved &amp; Posted — Purchase Expense</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5a6691' }}>Posted to the books as a PXP voucher. Expand to see the JV &amp; ledger posting.{canDelete ? ' Admins can Delete a voucher — it reverses out of the books and is kept view-only under Deleted.' : ''}</p>
        </div>
        <button onClick={() => setRoute && setRoute('/purchase-expense/pending')} style={btnGh}><Clock size={14} /> View pending</button>
      </div>
      <ExpenseTable rows={rows} isLoading={isLoading} cur={cur} open={open} setOpen={setOpen} mode="approved" onDelete={onDelete} canDelete={canDelete} busyId={busyId} />
    </div>
  );
}

export function RejectedExpenseOrders({ branch, setRoute }) {
  const brCode = brCodeOf(branch) || 'ALL';
  const cur = bc(branch).cur;
  const { data = [], isLoading } = useExpenseOrders(brCode);
  const [open, setOpen] = useState(null);
  const rows = data.filter((o) => o.status === 'rejected');

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}><XCircle size={18} style={{ color: '#A32D2D' }} /> Rejected — Purchase Expense</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5a6691' }}>Declined Purchase Expense vouchers. They <b>never touched the books</b>. Expand a row to review what was entered.</p>
        </div>
        <button onClick={() => setRoute && setRoute('/purchase-expense/pending')} style={btnGh}><Clock size={14} /> View pending</button>
      </div>
      <ExpenseTable rows={rows} isLoading={isLoading} cur={cur} open={open} setOpen={setOpen} mode="rejected" busyId={null} />
    </div>
  );
}

export function DeletedExpenseOrders({ branch, setRoute }) {
  const brCode = brCodeOf(branch) || 'ALL';
  const cur = bc(branch).cur;
  const { data = [], isLoading } = useExpenseOrders(brCode);
  const [open, setOpen] = useState(null);
  const rows = data.filter((o) => o.status === 'deleted');

  return (
    <div style={{ maxWidth: 1180, margin: '0 auto', padding: '12px 10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: DARK, display: 'flex', alignItems: 'center', gap: 8 }}><Trash2 size={18} style={{ color: '#A32D2D' }} /> Deleted — Purchase Expense</h2>
          <p style={{ margin: 0, fontSize: 11.5, color: '#5a6691' }}>Approved vouchers an admin deleted. They were <b>reversed out of the books</b>. This is a <b>view-only</b> audit trail — the Expense No and PXP voucher number shown here are <b>permanently retired and can never be reused</b>.</p>
        </div>
        <button onClick={() => setRoute && setRoute('/purchase-expense/approved')} style={btnGh}><FileCheck2 size={14} /> View approved</button>
      </div>
      <ExpenseTable rows={rows} isLoading={isLoading} cur={cur} open={open} setOpen={setOpen} mode="deleted" busyId={null} />
    </div>
  );
}
