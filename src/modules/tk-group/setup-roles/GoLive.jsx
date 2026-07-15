import React from 'react';
import { useQuery } from '@tanstack/react-query';
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

  return (
    <div className="grid max-w-[640px] gap-4">
      <div className={`rounded-brand border px-4 py-3 ${on ? 'border-success/30 bg-success-soft' : 'border-warning/30 bg-warning-soft'}`}>
        <div className={`text-sm font-extrabold ${on ? 'text-success' : 'text-warning'}`} data-testid="tk-golive-status">
          {on ? 'LIVE — the control guard is engaged' : 'DORMANT — controls are built but not enforcing'}
        </div>
        <div className="mt-0.5 text-xs text-ink-muted">
          {on
            ? 'Enforcement is active. Switch the rules off in the Control Panel to roll back — the always-on defaults still apply.'
            : 'Only the always-on default rules apply. Follow the steps below to go live — it stays fully reversible.'}
        </div>
      </div>

      <ol className="m-0 grid list-none gap-2 p-0">
        {steps.map((s, i) => (
          <li key={s.key}>
            <Card className={`flex items-start gap-2.5 ${s.done ? 'bg-success-soft' : ''}`}>
              <span aria-hidden className="text-sm leading-5">{s.done ? '✅' : `${i + 1}.`}</span>
              <div className="flex-1">
                <div className="text-xs font-bold text-navy">{s.label}</div>
                <div className="mt-px text-[11.5px] text-ink-muted">{s.hint}</div>
              </div>
              {s.href && !s.done ? (
                <Button type="button" variant="primary" size="xs" className="self-center" onClick={() => setRoute && setRoute(s.href)}>
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
