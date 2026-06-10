// ─── Voucher Approvals ────────────────────────────────────────────────────────
// Approval queue for the gated voucher types (Payment, Receipt, Contra, Journal,
// Credit Note, Debit Note, Purchase Expense). Manual entries AND bulk uploads land
// here as PENDING and hit the books only when approved (mirrors SO/PO/GP).
// Four views: Entry-wise · Ledger-wise · Sub-group-wise · Group-wise.
import React, { useState } from 'react';
import { fmtINR } from '../core/format';
import { useVoucherApprovals, useApproveVoucher, useRejectVoucher, useApproveAll } from '../core/useAccounting';

const C = { dark: '#0d1326', gold: '#d4a437', blue: '#185FA5', red: '#A32D2D', green: '#27500A', dim: '#5a6691', border: '#e1e3ec', head: '#1d3a6e' };
const VCH = { payment: 'Payment', receipt: 'Receipt', contra: 'Contra', journal: 'Journal', 'credit-note': 'Credit Note', 'debit-note': 'Debit Note', 'purchase-expense': 'Purchase Expense' };
const card = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 8, overflow: 'hidden' };
const th = { padding: '8px 12px', background: C.dark, color: C.gold, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, position: 'sticky', top: 0, textAlign: 'left' };
const td = { padding: '7px 12px', borderBottom: '1px solid #f0f2f7', fontSize: 12.5 };
const num = { textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const branchLabel = (b) => (!b || b === 'ALL' ? 'All branches' : (b.code || b));

export function VoucherApprovals({ branch }) {
  const [status, setStatus] = useState('pending');
  const [view, setView] = useState('entry');
  const [open, setOpen] = useState({});
  const q = useVoucherApprovals(branch, status);
  const d = q.data || {};
  const counts = d.counts || { pending: { n: 0, amount: 0 }, approved: { n: 0, amount: 0 }, rejected: { n: 0, amount: 0 } };
  const entries = d.entries || [];
  const approve = useApproveVoucher();
  const reject = useRejectVoucher();
  const approveAll = useApproveAll();
  const busy = approve.isPending || reject.isPending || approveAll.isPending;

  const doApprove = (id) => approve.mutate({ id, approver: 'admin' });
  const doReject = (id) => { const reason = window.prompt('Reason for rejection?'); if (reason !== null) reject.mutate({ id, by: 'admin', reason }); };
  const doApproveAll = () => { if (window.confirm(`Approve all ${counts.pending.n} pending vouchers for ${branchLabel(branch)}? They will post to the books.`)) approveAll.mutate({ branch, approver: 'admin' }); };

  const tab = (k, label) => (
    <button key={k} onClick={() => setStatus(k)} style={{ padding: '8px 16px', border: 'none', borderBottom: `3px solid ${status === k ? C.gold : 'transparent'}`, background: 'transparent', cursor: 'pointer', fontWeight: 700, fontSize: 13, color: status === k ? C.dark : C.dim }}>
      {label} <span style={{ fontSize: 11, color: C.dim }}>({counts[k]?.n || 0} · {fmtINR(counts[k]?.amount || 0)})</span>
    </button>
  );
  const seg = (k, label) => (
    <button key={k} onClick={() => setView(k)} style={{ padding: '5px 11px', fontSize: 11.5, fontWeight: 700, border: `1px solid ${view === k ? C.dark : '#d6dbe6'}`, background: view === k ? C.dark : '#fff', color: view === k ? C.gold : C.dim, cursor: 'pointer' }}>{label}</button>
  );

  const RollupTable = ({ rows, label, subLabel }) => (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr><th style={th}>{label}</th>{subLabel && <th style={th}>{subLabel}</th>}<th style={{ ...th, ...num }}>Debit</th><th style={{ ...th, ...num }}>Credit</th><th style={{ ...th, ...num }}>Entries</th></tr></thead>
      <tbody>
        {rows.length === 0 && <tr><td style={{ ...td, color: C.dim }} colSpan={5}>No {status} entries.</td></tr>}
        {rows.map((r, i) => (
          <tr key={r.name + i} style={{ background: i % 2 ? '#fafbff' : '#fff' }}>
            <td style={{ ...td, fontWeight: 600, color: C.dark }}>{r.name}</td>
            {subLabel && <td style={{ ...td, color: C.dim }}>{r.sub || '—'}</td>}
            <td style={{ ...td, ...num }}>{r.debit ? fmtINR(r.debit) : ''}</td>
            <td style={{ ...td, ...num }}>{r.credit ? fmtINR(r.credit) : ''}</td>
            <td style={{ ...td, ...num, color: C.dim }}>{r.n}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );

  return (
    <div style={{ margin: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.dark }}>Voucher Approvals</div>
          <div style={{ fontSize: 12, color: C.dim }}>{branchLabel(branch)} · Payment · Receipt · Contra · Journal · Credit/Debit Note · Purchase Expense — manual & bulk post only when approved</div>
        </div>
        {status === 'pending' && counts.pending.n > 0 && (
          <button onClick={doApproveAll} disabled={busy} style={{ marginLeft: 'auto', padding: '8px 16px', background: C.green, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 12.5, cursor: busy ? 'wait' : 'pointer', opacity: busy ? 0.6 : 1 }}>
            ✓ Approve all {counts.pending.n} pending
          </button>
        )}
      </div>

      <div style={{ ...card, marginBottom: 12 }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
          {tab('pending', 'Pending')}{tab('approved', 'Approved')}{tab('rejected', 'Rejected')}
        </div>
        <div style={{ display: 'flex', gap: 6, padding: '8px 12px', background: '#fafbfe', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11.5, color: C.dim, fontWeight: 600, marginRight: 4 }}>View:</span>
          <span style={{ display: 'inline-flex', borderRadius: 6, overflow: 'hidden' }}>{seg('entry', 'Entry-wise')}{seg('ledger', 'Ledger-wise')}{seg('subgroup', 'Sub-group-wise')}{seg('group', 'Group-wise')}</span>
          {q.isFetching && <span style={{ fontSize: 11, color: C.dim }}>updating…</span>}
        </div>
      </div>

      <div style={{ ...card }}>
        {q.isLoading ? <div style={{ padding: 28, textAlign: 'center', color: C.dim }}>Loading…</div> : (
          <div style={{ maxHeight: '68vh', overflow: 'auto' }}>
            {view === 'group' && <RollupTable rows={d.byGroup || []} label="Group" />}
            {view === 'subgroup' && <RollupTable rows={d.bySubGroup || []} label="Sub-group" subLabel="Under group" />}
            {view === 'ledger' && <RollupTable rows={d.byLedger || []} label="Ledger" subLabel="Sub-group" />}
            {view === 'entry' && (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={th}>Date</th><th style={th}>Vch No</th><th style={th}>Type</th><th style={th}>Party</th>
                  <th style={th}>Narration</th><th style={{ ...th, ...num }}>Amount</th><th style={{ ...th, textAlign: 'center' }}>Action</th>
                </tr></thead>
                <tbody>
                  {entries.length === 0 && <tr><td style={{ ...td, color: C.dim }} colSpan={7}>No {status} vouchers.</td></tr>}
                  {entries.map((e) => (
                    <React.Fragment key={e.id}>
                      <tr style={{ cursor: 'pointer' }} onClick={() => setOpen((s) => ({ ...s, [e.id]: !s[e.id] }))}>
                        <td style={{ ...td, whiteSpace: 'nowrap', color: C.dim }}>{e.date}</td>
                        <td style={{ ...td, color: C.blue, fontWeight: 600, whiteSpace: 'nowrap' }}>{open[e.id] ? '▾ ' : '▸ '}{e.vno}</td>
                        <td style={{ ...td }}>{VCH[e.category] || e.type}</td>
                        <td style={{ ...td, fontWeight: 600, color: C.dark }}>{e.party || '—'}</td>
                        <td style={{ ...td, color: C.dim, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.narration}{e.rejectedReason ? ` · ✗ ${e.rejectedReason}` : ''}</td>
                        <td style={{ ...td, ...num, fontWeight: 700 }}>{fmtINR(e.total)}</td>
                        <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }} onClick={(ev) => ev.stopPropagation()}>
                          {status === 'pending' ? (
                            <>
                              <button onClick={() => doApprove(e.id)} disabled={busy} style={{ padding: '4px 10px', background: C.green, color: '#fff', border: 'none', borderRadius: 5, fontWeight: 700, fontSize: 11, cursor: 'pointer', marginRight: 5 }}>Approve</button>
                              <button onClick={() => doReject(e.id)} disabled={busy} style={{ padding: '4px 10px', background: '#fff', color: C.red, border: `1px solid ${C.red}`, borderRadius: 5, fontWeight: 700, fontSize: 11, cursor: 'pointer' }}>Reject</button>
                            </>
                          ) : <span style={{ fontSize: 10.5, fontWeight: 700, color: status === 'approved' ? C.green : C.red }}>{status === 'approved' ? '✓ Approved' : '✗ Rejected'}</span>}
                        </td>
                      </tr>
                      {open[e.id] && (
                        <tr><td colSpan={7} style={{ padding: '4px 12px 10px 28px', background: '#f7f9fc' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                            <thead><tr><th style={{ ...td, color: C.dim, fontWeight: 700 }}>Ledger</th><th style={{ ...td, color: C.dim, fontWeight: 700 }}>Group › Sub-group</th><th style={{ ...td, ...num, color: C.dim, fontWeight: 700 }}>Debit</th><th style={{ ...td, ...num, color: C.dim, fontWeight: 700 }}>Credit</th></tr></thead>
                            <tbody>
                              {(e.postings || []).map((p, i) => (
                                <tr key={i}>
                                  <td style={{ ...td, fontWeight: 600 }}>{p.ledger}</td>
                                  <td style={{ ...td, color: C.dim }}>{p.group}{p.subGroup && p.subGroup !== p.group ? ` › ${p.subGroup}` : ''}</td>
                                  <td style={{ ...td, ...num }}>{p.debit ? fmtINR(p.debit) : ''}</td>
                                  <td style={{ ...td, ...num }}>{p.credit ? fmtINR(p.credit) : ''}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td></tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
      {(approve.isError || reject.isError || approveAll.isError) && <div style={{ marginTop: 8, color: C.red, fontSize: 12 }}>⚠ {(approve.error || reject.error || approveAll.error)?.message}</div>}
    </div>
  );
}
