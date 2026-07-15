import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAudit } from './api/monitor';
import { Badge, SkeletonTable } from '../../shell/primitives';

// ─── Control Panel · Change Log / Audit ──────────────────────────────────────
// The real, immutable control-plane trail — every flag / limit / matrix / user-ceiling
// change, plus proposals, approvals and guard blocks. Reads /api/tk/monitor/audit (the
// same store every set writes to). High-volume guard 'allow' events are filtered out so
// this stays a log of CHANGES and enforcement, not every checkpoint.
const ACTION = {
  'flag.set': { label: 'Control flag', tone: 'info' },
  'limits.set': { label: 'Threshold', tone: 'info' },
  'voucherPolicy.set': { label: 'Enforcement matrix', tone: 'info' },
  'userLimit.set': { label: 'User ceiling', tone: 'info' },
  'changeRequest.create': { label: 'Change proposed', tone: 'warning' },
  'changeRequest.applied': { label: 'Change applied', tone: 'success' },
  'approval.approve': { label: 'Approved', tone: 'success' },
  'approval.reject': { label: 'Rejected', tone: 'danger' },
  'guard.block': { label: 'Blocked by guard', tone: 'danger' },
  'guard.stage_pending': { label: 'Staged for approval', tone: 'warning' },
};
const HIDE = new Set(['guard.allow']);

const when = (ts) => (ts ? String(ts).slice(0, 19).replace('T', ' ') : '—');
const who = (a) => (a && (a.name || a.userId || a.role)) || 'system';
const short = (v) => {
  if (v == null) return '';
  if (typeof v === 'object') { try { return Object.entries(v).map(([k, x]) => `${k}: ${x}`).join(', '); } catch { return ''; } }
  return String(v);
};

export function ChangeLog({ go }) {
  const q = useQuery({ queryKey: ['tk', 'monitor', 'audit', 'control-panel'], queryFn: () => getAudit({}), staleTime: 15_000 });
  const items = ((q.data && q.data.items) || []).filter((e) => !HIDE.has(e.action));

  return (
    <div data-testid="control-change-log">
      <p className="mb-3 mt-1 max-w-[80ch] text-[13.5px] text-ink-muted">
        Every power change — who, when, from → to, why. Immutable. Fed live from the control-plane audit trail. {go && <>Full explorer on the <button className="underline" onClick={() => go('/tk/audit')}>Audit Trail</button>.</>}
      </p>

      {q.isLoading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : items.length === 0 ? (
        <div className="rounded-brand border border-surface-border bg-surface p-6 text-center text-[12.5px] text-ink-muted">No control changes recorded yet — this fills as you engage controls, propose, approve, and the guard enforces.</div>
      ) : (
        <div className="overflow-x-auto rounded-brand border border-surface-border bg-surface">
          <table className="w-full min-w-[720px] text-[12px]">
            <thead>
              <tr className="bg-surface-alt text-ink-muted">
                {['When', 'By', 'What', 'Target', 'Change / reason'].map((h) => (
                  <th key={h} className="p-2.5 text-left font-mono text-[9px] font-semibold uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((e, i) => {
                const meta = ACTION[e.action] || { label: e.action, tone: 'neutral' };
                const change = (e.before != null || e.after != null)
                  ? `${short(e.before)}${(e.before != null && e.after != null) ? ' → ' : ''}${short(e.after)}`
                  : (e.reason || '');
                return (
                  <tr key={e._id || i} className="border-t border-surface-border/60 align-top">
                    <td className="whitespace-nowrap p-2.5 font-mono text-[11px] text-ink-muted">{when(e.ts)}</td>
                    <td className="p-2.5 text-ink">{who(e.actor)}{e.actor && e.actor.role ? <span className="text-[10px] text-ink-subtle"> · {e.actor.role}</span> : null}</td>
                    <td className="p-2.5"><Badge tone={meta.tone} size="sm">{meta.label}</Badge></td>
                    <td className="p-2.5 text-[11px] text-ink-muted">{(e.entity && (e.entity.id || e.entity.kind)) || '—'}{e.branch ? <span className="ml-1 font-mono text-[10px] text-ink-subtle">[{e.branch}]</span> : null}</td>
                    <td className="p-2.5 text-[11px] text-ink-muted">{change || (e.reason || '—')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ChangeLog;
