import React from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { apiGet } from '../../core/api';
import { BRANCHES } from '../../core/referenceCache';
import { money } from '../../core/format';
import { useCockpitFocus } from '../../store/cockpitFocus';
import { focusedBranches, isFocused } from './utils/cockpitFocus';
import { stagePipeline } from './utils/approvalPipeline';
import { getLimits } from './api/limits';

// ─── TK GROUP CENTRAL · Approval stage pipeline ──────────────────────────────
// Where every pending voucher is waiting NOW, across the five people-stages:
//   Branch → AE · Sughra → FM · Faiz → Director · Farhan → Owner · Afshin.
// Real per-voucher stage (reviewStage) + amount-tier escalation. Sits above the full
// approval screen (UnifiedApprovals) so the funnel and the JV detail share one page.
// Counts are currency-neutral (safe to pool); the ₹ value is shown ONLY when a single
// branch is focused — never blended across currencies branchwise.
const oldestTone = (d) => (d >= 4 ? 'text-danger' : d >= 2 ? 'text-warning' : 'text-success');
// Resolve a branch code → its currency SYMBOL (not the 'INR'/'USD' code, which money()
// would print literally as "INR50,000"). Mirrors FocusSwitcher's curSym.
const CUR_SYM = { INR: '₹', USD: '$', KES: '$', TZS: '$', CDF: '$' };
const curOf = (code) => { const b = BRANCHES.find((x) => x.code === code); return (b && CUR_SYM[b.currency]) || '₹'; };

export function StagePipeline() {
  const focus = useCockpitFocus();
  const view = focusedBranches(focus, BRANCHES);
  const focused = isFocused(focus);
  const q = useQueries({
    queries: view.map((b) => ({
      queryKey: ['tk', 'appr-stage', b.code],
      queryFn: () => apiGet('/api/vouchers/approvals', { branch: b.code, status: 'pending' }),
      staleTime: 30_000,
    })),
  });
  const lq = useQuery({ queryKey: ['tk', 'limits'], queryFn: getLimits, staleTime: 5 * 60_000 });
  const limits = (lq.data && lq.data.limits) || {};
  const entries = view.flatMap((b, i) => ((q[i] && q[i].data && q[i].data.entries) || []));
  const stages = stagePipeline(entries, limits);
  const total = stages.reduce((s, x) => s + x.n, 0);
  const cur = focused ? curOf(focus) : null; // amount shown only for a single-currency (focused) view

  return (
    <div className="grid gap-2" data-testid="tk-stage-pipeline">
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-subtle">
        Pending by stage — where each entry is waiting now · {focused ? <b className="text-ink-muted">{focus}</b> : <b className="text-ink-muted">branchwise</b>} · {total} pending
      </p>
      <div className="grid grid-cols-2 gap-2 tablet:grid-cols-5">
        {stages.map((s, i) => (
          <div key={s.key} className={`relative rounded-brand border p-3 ${s.gate ? 'border-gold/50 bg-gold/[0.06]' : 'border-surface-border bg-surface'}`}>
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wide text-ink-subtle">{s.role}</div>
                <div className="text-[13px] font-bold text-ink">{s.name}</div>
              </div>
              <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-extrabold ${s.gate ? 'bg-gold text-navy' : 'bg-surface-alt text-ink-subtle'}`}>{i + 1}</span>
            </div>
            <div className="mt-2 font-serif text-[28px] font-bold leading-none tabular-nums text-ink">{s.n}</div>
            <div className="mt-1 text-[11px] text-ink-muted">
              {s.wait}{cur ? <> · <b className="text-ink tabular-nums">{money(s.amount, cur)}</b></> : null}
            </div>
            {s.n > 0 && <div className={`mt-1.5 inline-block rounded-full px-1.5 text-[10px] font-bold ${oldestTone(s.oldest)}`}>oldest {s.oldest}d</div>}
            {s.gate && <div className="mt-1 text-[9px] font-bold uppercase tracking-wide text-gold">posts to books</div>}
          </div>
        ))}
      </div>
      <p className="text-[11px] text-ink-subtle">
        Counts are who holds it now. Most vouchers finish at <b>FM · Faiz</b> (that stage posts to the books); large / over-ceiling entries carry on to <b>Director</b> and <b>Owner</b>. The full JV detail and Approve / Reject are in the queue below.
      </p>
    </div>
  );
}

export default StagePipeline;
