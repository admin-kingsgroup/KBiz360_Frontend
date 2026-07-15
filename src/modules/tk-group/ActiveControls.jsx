import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFlagState } from './api/flags';
import { LIMIT_BRANCHES } from './utils/branchLimits';
import { activeControls } from './utils/controlPanel';
import { Badge, SkeletonTable } from '../../shell/primitives';

// ─── Control Panel · Active Controls ─────────────────────────────────────────
// One read-only place that answers "what is actually engaged, and where?" — every control
// flag currently ON, globally or per branch. State is otherwise scattered across 17 screens;
// this is the go-live confidence board.
export function ActiveControls() {
  const fl = useQuery({ queryKey: ['tk', 'flags'], queryFn: getFlagState, staleTime: 30_000 });
  const flags = fl.data || { flags: {} };
  const realBranches = LIMIT_BRANCHES.filter((b) => b.code !== 'default');
  const codes = realBranches.map((b) => b.code);
  const labelOf = (c) => (realBranches.find((x) => x.code === c) || {}).label || c;

  const active = activeControls(flags, codes);
  // Enforcement is engaged for the group once ANY control is on (there is no master switch).
  const anyOn = active.length > 0;

  // Where a control is on: "All branches" when global (unless a branch turned it off), else
  // the specific branches it's overridden ON for.
  const whereOn = (a) => {
    if (a.globalOn) {
      const off = codes.filter((c) => !a.branchesOn.includes(c));
      return off.length ? `All except ${off.map(labelOf).join(', ')}` : 'All branches';
    }
    return a.branchesOn.map(labelOf).join(', ') || '—';
  };

  return (
    <div data-testid="active-controls">
      <p className="mb-4 mt-1 max-w-[82ch] text-[13.5px] text-ink-muted">
        Everything that is <b>engaged right now</b>, and where — pulled live from the control flags. Use it as the go-live board: nothing enforces until it appears here.
      </p>

      <div className={`mb-4 flex flex-wrap items-center gap-3 rounded-brand border px-4 py-2.5 ${anyOn ? 'border-success/40 bg-success-soft' : 'border-warning/40 bg-warning-soft'}`}>
        <Badge tone={anyOn ? 'success' : 'warning'}>{anyOn ? 'Enforcement engaged' : 'All dormant'}</Badge>
        <span className={`text-[12px] ${anyOn ? 'text-success' : 'text-warning'}`}>
          {active.length === 0 ? 'Nothing is engaged — every control is off.' : `${active.length} control${active.length > 1 ? 's' : ''} engaged.`}
        </span>
      </div>

      {fl.isLoading ? (
        <SkeletonTable rows={5} cols={3} />
      ) : active.length === 0 ? (
        <div className="rounded-brand border border-surface-border bg-surface p-6 text-center text-[13px] text-ink-muted">Everything is dormant — no control is switched on. Engage controls one at a time from the screens on the left.</div>
      ) : (
        <div className="overflow-x-auto rounded-brand border border-surface-border bg-surface">
          <table className="w-full min-w-[640px] text-[12px]">
            <thead>
              <tr className="bg-surface-alt text-ink-muted">
                {['Control', 'Scope', 'Engaged where'].map((h, i) => (
                  <th key={h} className={`p-2.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${i === 0 ? 'text-left' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {active.map((a) => (
                <tr key={a.key} className="border-t border-surface-border/60">
                  <td className="p-2.5"><div className="font-semibold text-ink">{a.label}</div><div className="font-mono text-[9.5px] text-ink-subtle">{a.key}</div></td>
                  <td className="p-2.5 text-ink-muted">{a.scope}</td>
                  <td className="p-2.5"><span className="rounded-full bg-success-soft px-2 py-0.5 font-mono text-[10px] font-semibold text-success">{whereOn(a)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ActiveControls;
