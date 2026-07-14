/* ════════════════════════════════════════════════════════════════════
   SUSPENSE / UNSPECIFIED CLEARING  /accounts/suspense
   BUSINESS SUB-MODULE REORG (2026-07-13): moved out of
   accountantWorkspace/accountantWorkspace.jsx (MENU_ACCOUNTS ▸ Period Close ▸
   "Suspense / Unspecified Clearing").
   ════════════════════════════════════════════════════════════════════ */
import { useMemo } from 'react';
import { useBookingOrders, useVoucherApprovals } from '../../../core/useAccounting';
import { C, Shell, th, td, Table, aBtn, brLabel, card } from '../../accountantWorkspace/shared';

// ════════════════════════ 5) SUSPENSE / UNSPECIFIED CLEARING ═══════════════════
export function SuspenseClearing({ branch, setRoute }) {
  const bookings = useBookingOrders(branch, { status: 'pending' }).data || []; // only pending is used here (stuck/suspense/counts)
  // /api/vouchers/approvals returns { counts, entries } — use the entries[] array.
  const pendVouchers = useVoucherApprovals(branch, 'pending').data?.entries || [];
  // Suspense = pending items the books can't accept yet: a booking failing the
  // verification gate (missing ledger / out of balance), or a pending voucher.
  const stuck = useMemo(() => bookings
    .filter((b) => b.status === 'pending' && b.validation?.hasErrors)
    .map((b) => ({ ref: b.bookingNo, branch: b.branch, kind: b.module || 'SO/PO/GP', issue: (b.validation?.errors || []).join(' · ') || 'Verification failed' })), [bookings]);
  return (
    <Shell title="Suspense / Unspecified Clearing" sub={`${brLabel(branch)} · items the books can't post until fixed — clear these before month-end`}
      right={<div style={{ ...card, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: stuck.length ? C.red : C.green }}>{stuck.length} to fix · {pendVouchers.length} pending vouchers</div>}>
      <Table>
        <thead><tr><th style={th}>Reference</th><th style={th}>Branch</th><th style={th}>Type</th><th style={th}>Why it's stuck</th><th style={{ ...th, textAlign: 'center' }}>Action</th></tr></thead>
        <tbody>
          {stuck.length === 0 && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: C.green, padding: 20 }}>✓ No suspense — every pending item passes the verification gate.</td></tr>}
          {stuck.map((s, i) => (
            <tr key={i} style={{ background: i % 2 ? '#fafbff' : '#fff' }}>
              <td style={{ ...td, fontFamily: 'monospace', fontWeight: 700 }}>{s.ref}</td>
              <td style={{ ...td }}>{s.branch}</td>
              <td style={{ ...td }}>{s.kind}</td>
              <td style={{ ...td, color: C.red }}>{s.issue}</td>
              <td style={{ ...td, textAlign: 'center', whiteSpace: 'nowrap' }}>
                <button onClick={() => setRoute && setRoute('/masters/ledgers')} style={{ ...aBtn(C.green), marginRight: 5 }}>Create Ledger</button>
                <button onClick={() => setRoute && setRoute('/transactions/approvals')} style={aBtn(C.blue)}>Open &amp; Fix</button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
      <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>Most fixes: create the missing ledger in Masters, then re-approve. The Unspecified cost-centre bucket must stay empty — tag any untagged sale/purchase to its module.</div>
    </Shell>
  );
}
