import React from 'react';
import { useAlerts, useVoucherApprovals, useBookingOrders } from '../../../../core/useAccounting';

// ② Needs-Action strip — one glanceable row of what needs THIS branch's attention
// right now: scrutiny alerts (critical / warning), vouchers awaiting approval (with
// the ₹ at stake) and SO/PO/GP bookings still in the approval queue. Each chip drills
// into the relevant screen. Self-contained: owns its own queries + loading, so a slow
// feed never blocks the dashboard. Not period-scoped — these are live, current-state.
const TONE = {
  red:   { color: '#b91c1c', background: '#fef2f2', border: '1px solid #fecaca' },
  amber: { color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a' },
  blue:  { color: '#1d4ed8', background: '#eff6ff', border: '1px solid #bfdbfe' },
};

export function NeedsActionStrip({ branch, navigate, formatMoney = (n) => n }) {
  const alertsQ = useVoucherApprovals(branch, 'pending');
  const alerts = useAlerts(branch).data?.alerts || [];
  const critical = alerts.filter((a) => a.severity === 'error').length;
  const warn = alerts.filter((a) => a.severity === 'warn').length;
  const appr = alertsQ.data?.counts?.pending || { n: 0, amount: 0 };
  const pendBookings = (useBookingOrders(branch, { status: 'pending' }).data || []).length;

  const chips = [];
  if (critical) chips.push({ tone: 'red', icon: '🔴', label: `${critical} critical alert${critical === 1 ? '' : 's'}`, route: '/dashboard/alerts' });
  if (warn) chips.push({ tone: 'amber', icon: '🟠', label: `${warn} warning${warn === 1 ? '' : 's'}`, route: '/dashboard/alerts' });
  if (appr.n) chips.push({ tone: 'blue', icon: '🧾', label: `${appr.n} approval${appr.n === 1 ? '' : 's'} pending · ${formatMoney(appr.amount || 0)}`, route: '/transactions/voucher-approvals' });
  if (pendBookings) chips.push({ tone: 'blue', icon: '✈', label: `${pendBookings} SO/PO/GP pending`, route: '/transactions/approvals' });

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-brand border border-surface-border bg-surface px-3 py-2.5 shadow-card">
      <span className="text-xs font-bold text-ink">Needs action</span>
      {chips.length === 0 ? (
        <span className="text-[11px] text-ink-muted">All clear — nothing awaiting you in this branch.</span>
      ) : (
        chips.map((c, i) => (
          <button
            key={i}
            onClick={() => c.route && navigate?.(c.route)}
            style={TONE[c.tone]}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-bold"
          >
            <span aria-hidden>{c.icon}</span>
            {c.label}
            <span className="opacity-60">→</span>
          </button>
        ))
      )}
    </div>
  );
}
