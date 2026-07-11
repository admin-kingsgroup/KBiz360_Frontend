import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getBreakglass, invokeBreakglass, endBreakglass } from './api/breakglass';
import { confirmDialog } from '../../core/ux/confirm';
import { toastSuccess, toastError } from '../../core/ux/toast';
import { LIMIT_BRANCHES } from './utils/branchLimits';

// ─── Control Panel · Break-Glass — emergency elevated access ─────────────────
// A user self-invokes emergency Verify+Approve authority for a SHORT window with a
// mandatory reason. Fully audited (it lands on the Change Log immediately — the Owner's
// real-time signal) and AUTO-EXPIRES on its timer. Use only when normal approval can't run.
const MAX_MINUTES = 120;
const when = (ts) => (ts ? String(ts).slice(0, 19).replace('T', ' ') : '—');

export function BreakGlass() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['tk', 'breakglass'], queryFn: getBreakglass, staleTime: 15_000, refetchInterval: 30_000 });
  const items = q.data?.items || [];

  const [reason, setReason] = useState('');
  const [minutes, setMinutes] = useState('30');
  const [branch, setBranch] = useState('ALL');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const invoke = async () => {
    if (reason.trim().length < 5) { setMsg('A clear reason (≥ 5 characters) is required.'); return; }
    const m = Math.min(MAX_MINUTES, Math.max(1, Math.round(Number(minutes) || 0)));
    const { confirmed } = await confirmDialog({
      title: 'Invoke break-glass access?',
      message: `This grants you emergency Verify + Approve authority for ${m} minute${m > 1 ? 's' : ''}${branch === 'ALL' ? ' (all branches)' : ` on ${branch}`}. It is logged immediately, the Owner is notified, and it auto-expires. Use only when normal approval can't run.`,
      danger: true, confirmLabel: 'Invoke break-glass',
    });
    if (!confirmed) return;
    setBusy(true); setMsg('');
    try {
      await invokeBreakglass({ reason: reason.trim(), minutes: m, branch: branch === 'ALL' ? null : branch });
      toastSuccess(`Break-glass active for ${m} min`);
      setReason('');
      qc.invalidateQueries({ queryKey: ['tk', 'breakglass'] });
    } catch (e) { const em = (e && e.message) || 'Could not invoke break-glass.'; toastError(em); setMsg(em); }
    finally { setBusy(false); }
  };

  const end = async (id) => {
    try { await endBreakglass(id); toastSuccess('Break-glass ended'); qc.invalidateQueries({ queryKey: ['tk', 'breakglass'] }); }
    catch (e) { toastError((e && e.message) || 'Could not end the session.'); }
  };

  const inp = 'rounded-md border border-surface-border bg-surface px-2.5 py-1.5 text-[12px] text-ink';

  return (
    <div data-testid="breakglass">
      <p className="mb-3 mt-1 max-w-[82ch] text-[13.5px] text-ink-muted">
        Emergency elevated access — granted for a short window with a mandatory reason, fully audited, auto-expiring. It grants <b>Verify + Approve</b> authority (enforced by the approval chain) and lands on the <b>Change Log</b> immediately. Use only when normal approval can’t run.
      </p>

      <div className="mb-4 rounded-brand border border-warning/40 bg-warning-soft/40 p-3.5">
        <div className="mb-2 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-warning">Invoke emergency access</div>
        <div className="grid gap-2.5 tablet:grid-cols-[1fr_auto_auto]">
          <label className="flex flex-col gap-1 text-[11px] text-ink-muted">Reason (required)
            <input aria-label="Reason" className={inp} placeholder="Why is emergency access needed?" value={reason} onChange={(e) => setReason(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-ink-muted">Minutes (≤ {MAX_MINUTES})
            <input aria-label="Minutes" type="number" min="1" max={MAX_MINUTES} className={`${inp} w-[90px]`} value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-[11px] text-ink-muted">Branch
            <select aria-label="Branch" className={inp} value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="ALL">All branches</option>
              {LIMIT_BRANCHES.filter((b) => b.code !== 'default').map((b) => <option key={b.code} value={b.code}>{b.label}</option>)}
            </select>
          </label>
        </div>
        {msg && <div role="status" className="mt-2 rounded-brand bg-warning-soft px-3 py-2 text-xs text-warning">{msg}</div>}
        <div className="mt-3">
          <button type="button" onClick={invoke} disabled={busy}
            className={`rounded-brand px-4 py-2 text-[13px] font-semibold text-white ${busy ? 'bg-ink-subtle' : 'bg-danger hover:bg-danger/90'}`}>
            {busy ? 'Invoking…' : '🔓 Invoke break-glass'}
          </button>
        </div>
      </div>

      {q.isLoading ? (
        <div className="rounded-brand border border-surface-border bg-surface p-4 text-[12.5px] text-ink-muted">Loading sessions…</div>
      ) : items.length === 0 ? (
        <div className="rounded-brand border border-surface-border bg-surface p-6 text-center text-[12.5px] text-ink-muted">No break-glass session active or recorded. When invoked, it demands a reason, notifies the Owner, and expires on a timer.</div>
      ) : (
        <div className="overflow-x-auto rounded-brand border border-surface-border bg-surface">
          <table className="w-full min-w-[720px] text-[12px]">
            <thead><tr className="bg-surface-alt text-ink-muted">{['User', 'Reason', 'Branch', 'Started', 'Expires', 'Status', ''].map((h) => <th key={h} className="p-2.5 text-left font-mono text-[9px] font-semibold uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody>
              {items.map((s) => (
                <tr key={s.id} className="border-t border-surface-border/60">
                  <td className="p-2.5 font-semibold text-ink">{s.email}</td>
                  <td className="p-2.5 text-[11px] text-ink-muted">{s.reason}</td>
                  <td className="p-2.5 text-ink-muted">{s.branch || 'All'}</td>
                  <td className="whitespace-nowrap p-2.5 font-mono text-[11px] text-ink-muted">{when(s.startedAt)}</td>
                  <td className="whitespace-nowrap p-2.5 font-mono text-[11px] text-ink-muted">{when(s.expiresAt)}</td>
                  <td className="p-2.5">{s.endedAt ? <span className="rounded-full bg-surface-alt px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase text-ink-subtle">ended</span> : s.active ? <span className="rounded-full bg-danger-soft px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase text-danger">active</span> : <span className="rounded-full bg-surface-alt px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase text-ink-subtle">expired</span>}</td>
                  <td className="p-2.5">{!s.endedAt && s.active ? <button type="button" onClick={() => end(s.id)} className="text-[11px] text-ink-subtle underline hover:text-danger">End now</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default BreakGlass;
