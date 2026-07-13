import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getOverview, getIntegrity } from './api/monitor';
import { getInbox } from './api/inbox';
import { digestSummary } from './utils/controlPanel';
import { Badge } from '../../shell/primitives';

// ─── Control Panel · Daily Digest ────────────────────────────────────────────
// The Owner/Director's one-glance morning summary — pending approvals, exceptions
// (failing integrity gates), and close readiness — pulled live from the same monitor
// endpoints the Control Tower uses. In-app (no email); read-only.
const Tile = ({ label, value, tone = 'ink', hint }) => (
  <div className="min-w-[150px] flex-1 rounded-brand border border-surface-border bg-surface p-4">
    <div className="font-mono text-[9.5px] uppercase tracking-wide text-ink-subtle">{label}</div>
    <div className={`mt-1 text-3xl font-black tabular-nums ${tone === 'danger' ? 'text-danger' : tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-ink'}`}>{value}</div>
    {hint ? <div className="mt-0.5 text-[11px] text-ink-muted">{hint}</div> : null}
  </div>
);

export function DailyDigest({ go }) {
  const ov = useQuery({ queryKey: ['tk', 'monitor', 'overview'], queryFn: getOverview, staleTime: 30_000, refetchInterval: 60_000 });
  const iq = useQuery({ queryKey: ['tk', 'monitor', 'integrity'], queryFn: getIntegrity, staleTime: 60_000 });
  const bq = useQuery({ queryKey: ['tk', 'inbox'], queryFn: getInbox, staleTime: 30_000 });

  const loading = ov.isLoading || iq.isLoading;
  const d = digestSummary({ overview: ov.data || {}, integrity: iq.data || {}, inbox: bq.data || {} });
  const today = new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div data-testid="daily-digest">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="max-w-[70ch] text-[13.5px] text-ink-muted">Your one-glance oversight summary — pending work, exceptions and close readiness, live.</p>
        <span className="font-mono text-[11px] text-ink-subtle">{today}</span>
      </div>

      {loading ? (
        <div className="p-4 text-center text-[12.5px] text-ink-muted">Loading digest…</div>
      ) : (ov.isError || iq.isError) ? (
        <div className="rounded-brand border border-danger/40 bg-danger-soft px-3 py-2 text-[12.5px] text-danger">Couldn’t load the digest right now — the monitoring feed is unavailable.</div>
      ) : (
        <>
          <div className="flex flex-wrap gap-3">
            <Tile label="Pending approvals" value={d.pending} tone={d.pending > 0 ? 'warning' : 'success'} hint={d.oldestDays > 0 ? `oldest ${d.oldestDays} day${d.oldestDays > 1 ? 's' : ''}` : 'nothing waiting'} />
            <Tile label="Waiting on you" value={d.mine} tone={d.mine > 0 ? 'danger' : 'success'} hint={d.mine > 0 ? 'in your inbox' : 'you’re clear'} />
            <Tile label="Exceptions" value={d.exceptions} tone={d.exceptions > 0 ? 'danger' : 'success'} hint={d.exceptions > 0 ? 'integrity gates failing' : 'all gates pass'} />
            <Tile label="Close readiness" value={d.closeReady ? 'Ready' : d.notCloseReady.length || '—'} tone={d.closeReady ? 'success' : 'danger'} hint={d.closeReady ? 'all branches close-ready' : `${d.notCloseReady.length} branch(es) not ready`} />
          </div>

          {/* pending split */}
          <div className="mt-4 grid gap-3 tablet:grid-cols-2">
            <div className="rounded-brand border border-surface-border bg-surface p-4">
              <div className="mb-2 text-[13px] font-semibold text-ink">Pending, by stream</div>
              <div className="flex items-center justify-between border-b border-surface-border/60 py-1.5 text-[12.5px]"><span className="text-ink-muted">Governance (config / flags / locks)</span><span className="font-mono font-semibold text-ink">{d.governance}</span></div>
              <div className="flex items-center justify-between py-1.5 text-[12.5px]"><span className="text-ink-muted">Decisions (credit / funds / onboarding)</span><span className="font-mono font-semibold text-ink">{d.decision}</span></div>
              <button type="button" onClick={() => go && go('/tk/approvals')} className="mt-2 text-[11.5px] font-semibold text-info hover:underline">Open Approvals Inbox →</button>
            </div>

            <div className="rounded-brand border border-surface-border bg-surface p-4">
              <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-ink">Exceptions & close {d.exceptions > 0 ? <Badge tone="danger" size="sm">{d.exceptions} failing</Badge> : <Badge tone="success" size="sm">clear</Badge>}</div>
              {d.notCloseReady.length > 0 ? (
                <div className="text-[12.5px] text-ink-muted">Not close-ready: <b className="text-danger">{d.notCloseReady.join(', ')}</b>. Clear the failing gates on the Control Tower.</div>
              ) : (
                <div className="text-[12.5px] text-ink-muted">Every branch is close-ready — no integrity gate is failing.</div>
              )}
              <div className="mt-1.5 text-[12px] text-ink-muted">Locked periods: <span className="font-mono font-semibold text-ink">{d.lockedPeriods}</span></div>
              <button type="button" onClick={() => go && go('/tk/control-tower')} className="mt-2 text-[11.5px] font-semibold text-info hover:underline">Open Control Tower →</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DailyDigest;
