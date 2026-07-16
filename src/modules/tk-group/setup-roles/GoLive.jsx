import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, ShieldAlert, CheckCircle2, ArrowRight } from 'lucide-react';
import { getFlagState } from '../api/flags';
import { getPendingByType } from '../api/governance';
import { goLiveSteps, enforcementEngaged } from '../utils/goLive';
import { Button, Card } from '../../../shell/primitives';

// ─── TK GROUP · FE · Go-Live checklist (container) ───────────────────────────
// A guided view of exactly where go-live stands: is the control catalogue ready, are the
// foundation rules enforcing, and have the configurable rules been engaged. There is no
// master switch — enforcement goes live rule-by-rule in the Control Panel (reversible).

export function GoLive({ setRoute }) {
  const fq = useQuery({ queryKey: ['tk', 'flags'], queryFn: getFlagState, staleTime: 15_000 });
  const pq = useQuery({ queryKey: ['tk', 'pending', 'flag'], queryFn: () => getPendingByType('flag'), staleTime: 15_000 });
  const flagState = fq.data || { flags: {} };
  const pendingFlagCount = (pq.data || []).length;
  const on = enforcementEngaged(flagState);
  const steps = goLiveSteps(flagState, pendingFlagCount);
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <div className="grid gap-4">
      <div className={`rounded-brand border px-5 py-4 ${on ? 'border-success/30 bg-success-soft' : 'border-warning/30 bg-warning-soft'}`}>
        <div className="flex items-start gap-3">
          {on
            ? <ShieldCheck className="mt-0.5 h-6 w-6 shrink-0 text-success" aria-hidden />
            : <ShieldAlert className="mt-0.5 h-6 w-6 shrink-0 text-warning" aria-hidden />}
          <div>
            <div className={`text-sm font-extrabold ${on ? 'text-success' : 'text-warning'}`} data-testid="tk-golive-status">
              {on ? 'LIVE — the control guard is engaged' : 'DORMANT — controls are built but not enforcing'}
            </div>
            <div className="mt-0.5 text-xs text-ink-muted">
              {on
                ? 'Enforcement is active. Switch the rules off in the Control Panel to roll back — the always-on defaults still apply.'
                : 'Only the always-on default rules apply. Follow the steps below to go live — it stays fully reversible.'}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-alt">
          <div className="h-full rounded-full bg-success transition-all duration-med ease-premium" style={{ width: `${(doneCount / steps.length) * 100}%` }} />
        </div>
        <span className="shrink-0 text-[11.5px] font-bold tabular-nums text-ink-muted">{doneCount}/{steps.length} steps</span>
      </div>

      <ol className="m-0 grid list-none gap-3 p-0 tablet:grid-cols-2 wide:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.key}>
            <Card className="flex h-full items-start gap-3">
              {s.done
                ? <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-soft text-success"><CheckCircle2 className="h-4 w-4" aria-hidden /></span>
                : <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-alt text-xs font-bold text-ink-muted">{i + 1}</span>}
              <div className="flex-1">
                <div className="text-xs font-bold text-navy">{s.label}</div>
                <div className="mt-px text-[11.5px] text-ink-muted">{s.hint}</div>
              </div>
              {s.href && !s.done ? (
                <Button type="button" variant="primary" size="xs" iconRight={ArrowRight} className="shrink-0 self-center" onClick={() => setRoute && setRoute(s.href)}>
                  Open
                </Button>
              ) : null}
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
