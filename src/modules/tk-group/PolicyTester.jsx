import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVoucherPolicy } from './api/voucherPolicy';
import { getFlagState } from './api/flags';
import { LIMIT_BRANCHES } from './utils/branchLimits';
import { ROLE_SWITCHES, policyTest } from './utils/controlPanel';

// ─── Control Panel · Policy Tester ───────────────────────────────────────────
// "For a voucher of THIS type / amount / branch, entered by THIS role — would it post
// straight to the books, or route through Check → Verify → Approve, and WHY." Read-only:
// it mirrors the live create() guard (Enforcement Matrix + per-role switches + owner co-sign
// + branch-entry chain) so you can see the effect of a control BEFORE relying on it, and
// answer "why is this voucher stuck in Pending?" without reading code.
const SEL = 'rounded-md border border-surface-border bg-surface px-2.5 py-1.5 text-[12.5px] text-ink';

export function PolicyTester({ branch = 'default' }) {
  const vp = useQuery({ queryKey: ['tk', 'voucherPolicy'], queryFn: () => getVoucherPolicy(), staleTime: 30_000 });
  const fl = useQuery({ queryKey: ['tk', 'flags'], queryFn: getFlagState, staleTime: 30_000 });
  const store = vp.data?.store || { default: {}, branches: {} };
  const rows = vp.data?.categories || [];        // Matrix rows [{key,label}]
  const flags = fl.data || { flags: {} };

  const branches = LIMIT_BRANCHES.filter((b) => b.code !== 'default');
  const [b, setB] = useState(branch !== 'default' ? branch : (branches[0]?.code || 'default'));
  const [rowKey, setRowKey] = useState('booking');
  const [amount, setAmount] = useState('100000');
  const [role, setRole] = useState('branch_accountant');

  const result = policyTest({ store, flags, branch: b, rowKey, amount, role });
  const rowLabel = (rows.find((r) => r.key === rowKey) || {}).label || rowKey;
  const roleLabel = (ROLE_SWITCHES.find((r) => r.key === role) || {}).name || role;

  return (
    <div data-testid="policy-tester">
      <p className="mb-4 mt-1 max-w-[82ch] text-[13.5px] text-ink-muted">
        Try a hypothetical voucher against the <b>live</b> controls — it shows whether that voucher would post directly or walk <b>Check → Verify → Approve</b>, and exactly which rule decides. Nothing is saved; this is a read-only what-if.
      </p>

      <div className="flex flex-wrap items-end gap-3 rounded-brand border border-surface-border bg-surface-alt p-4">
        <label className="flex flex-col gap-1"><span className="font-mono text-[9px] font-semibold uppercase tracking-wide text-ink-subtle">Branch</span>
          <select className={SEL} value={b} onChange={(e) => setB(e.target.value)} aria-label="Branch">
            {branches.map((x) => <option key={x.code} value={x.code}>{x.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1"><span className="font-mono text-[9px] font-semibold uppercase tracking-wide text-ink-subtle">Voucher type</span>
          <select className={SEL} value={rowKey} onChange={(e) => setRowKey(e.target.value)} aria-label="Voucher type">
            {rows.map((r) => <option key={r.key} value={r.key}>{r.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1"><span className="font-mono text-[9px] font-semibold uppercase tracking-wide text-ink-subtle">Amount</span>
          <input type="number" min="0" step="any" className={`${SEL} w-[130px] text-right font-mono`} value={amount} onChange={(e) => setAmount(e.target.value)} aria-label="Amount" />
        </label>
        <label className="flex flex-col gap-1"><span className="font-mono text-[9px] font-semibold uppercase tracking-wide text-ink-subtle">Entered by (role)</span>
          <select className={SEL} value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role">
            {ROLE_SWITCHES.map((r) => <option key={r.key} value={r.key}>{r.role}</option>)}
          </select>
        </label>
      </div>

      {/* verdict */}
      <div className={`mt-4 rounded-brand border border-l-4 p-4 shadow-sm ${result.routed ? 'border-danger/50 bg-danger-soft/50' : 'border-success/50 bg-success-soft/50'}`}
        style={{ borderLeftColor: result.routed ? '#dc2626' : '#16a34a' }} role="status" data-testid="policy-verdict">
        <div className={`text-[15px] font-semibold ${result.routed ? 'text-danger' : 'text-success'}`}>
          {result.routed
            ? `Routes through Check → Verify → Approve`
            : `Posts directly — single-step approve`}
        </div>
        <div className="mt-0.5 text-[12px] text-ink-muted">
          A <b>{rowLabel}</b> of <b>{Number(amount) || 0}</b> in <b>{(branches.find((x) => x.code === b) || {}).label || b}</b>, entered by a <b>{roleLabel}</b>.
        </div>
        {result.routed ? (
          <ul className="mt-2 space-y-1">
            {result.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[12px] text-ink"><span className="text-danger">▸</span><span><b>{r.rule}</b> — {r.detail}</span></li>
            ))}
          </ul>
        ) : (
          <div className="mt-2 text-[12px] text-ink-muted">No control routes this voucher — it posts on approval the single-step way (the maker can clear it, unless SoD applies).</div>
        )}
        {result.masterOn && (
          <div className="mt-2 rounded-md bg-warning-soft px-2.5 py-1.5 text-[11px] text-warning">🛡️ The master guard is engaged for this branch — segregation-of-duties, cash caps and back-date limits also apply on top of the above.</div>
        )}
      </div>

      <div className="mt-[16px] flex items-start gap-2.5 rounded-[9px] border border-surface-border bg-surface-alt px-[15px] py-3 text-[12px] text-ink-muted">
        <span>ℹ️</span>
        <span>This mirrors the live entry guard: the <b>Enforcement Matrix</b> row for the type, the per-<b>role</b> switch, <b>Owner co-sign</b> on refund/reissue, and the branch-entry chain. A booking-folder or INB deal keeps its own approval flow regardless.</span>
      </div>
    </div>
  );
}

export default PolicyTester;
