import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDelegations, createDelegation, revokeDelegation } from './api/delegation';
import { getRoster } from './api/userLimits';
import { isOwner } from './utils/owner';
import { toastSuccess, toastError } from '../../core/ux/toast';
import { LIMIT_BRANCHES } from './utils/branchLimits';
import { SkeletonTable } from '../../shell/primitives';

// ─── Control Panel · Delegation — temporary hand-over of approval authority ───
// The Owner hands one user's Verify/Approve authority to another for a date window; it
// auto-reverts at the end date. During the window the delegate can genuinely approve
// (enforced by the approval chain). Owner grants/revokes; central roles see the list.
const SCOPES = [{ v: 'approve', l: 'Approve' }, { v: 'verify', l: 'Verify' }, { v: 'both', l: 'Verify + Approve' }];

export function Delegation() {
  const qc = useQueryClient();
  const owner = isOwner();
  const q = useQuery({ queryKey: ['tk', 'delegations'], queryFn: getDelegations, staleTime: 20_000 });
  const rosterQ = useQuery({ queryKey: ['tk', 'roster'], queryFn: getRoster, staleTime: 60_000 });
  const items = q.data?.items || [];
  const roster = rosterQ.data || [];

  const [f, setF] = useState({ toEmail: '', fromEmail: '', scope: 'approve', branch: 'ALL', from: '', to: '', reason: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const submit = async () => {
    if (!f.toEmail) { setMsg('Pick who receives the authority (the delegate).'); return; }
    if (!f.from || !f.to) { setMsg('Set a start and end date.'); return; }
    if (f.to < f.from) { setMsg('The end date cannot be before the start date.'); return; }
    setBusy(true); setMsg('');
    try {
      await createDelegation({ ...f, branch: f.branch === 'ALL' ? null : f.branch });
      toastSuccess('Delegation granted');
      setF({ toEmail: '', fromEmail: '', scope: 'approve', branch: 'ALL', from: '', to: '', reason: '' });
      qc.invalidateQueries({ queryKey: ['tk', 'delegations'] });
    } catch (e) { const m = (e && e.message) || 'Could not grant the delegation.'; toastError(m); setMsg(m); }
    finally { setBusy(false); }
  };

  const revoke = async (id) => {
    try { await revokeDelegation(id); toastSuccess('Delegation revoked'); qc.invalidateQueries({ queryKey: ['tk', 'delegations'] }); }
    catch (e) { toastError((e && e.message) || 'Could not revoke.'); }
  };

  const nm = (email) => { const u = roster.find((r) => String(r.email).toLowerCase() === String(email).toLowerCase()); return u ? u.name : (email || '—'); };
  const inp = 'rounded-md border border-surface-border bg-surface px-2.5 py-1.5 text-[12px] text-ink';

  return (
    <div data-testid="delegation">
      <p className="mb-3 mt-1 max-w-[82ch] text-[13.5px] text-ink-muted">
        Temporary hand-over during leave — one user’s Verify/Approve authority passes to another for a date window, then <b>auto-reverts</b>. During the window the delegate can genuinely approve (enforced by the approval chain). {owner ? 'You grant and revoke here.' : 'Only the Owner grants delegations.'}
      </p>

      {owner && (
        <div className="mb-4 rounded-brand border border-surface-border bg-surface-alt p-3.5">
          <div className="mb-2 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-ink-subtle">Grant a delegation</div>
          <div className="grid gap-2.5 tablet:grid-cols-2 desktop:grid-cols-3">
            <label className="flex flex-col gap-1 text-[11px] text-ink-muted">Delegate (receives authority)
              <select aria-label="Delegate" className={inp} value={f.toEmail} onChange={(e) => set('toEmail', e.target.value)}>
                <option value="">— pick a user —</option>
                {roster.map((u) => <option key={u.email} value={u.email}>{u.name} · {u.role}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-ink-muted">In place of (optional)
              <select aria-label="In place of" className={inp} value={f.fromEmail} onChange={(e) => set('fromEmail', e.target.value)}>
                <option value="">— any / not specified —</option>
                {roster.map((u) => <option key={u.email} value={u.email}>{u.name} · {u.role}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-ink-muted">Authority
              <select aria-label="Scope" className={inp} value={f.scope} onChange={(e) => set('scope', e.target.value)}>
                {SCOPES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-ink-muted">Branch
              <select aria-label="Branch" className={inp} value={f.branch} onChange={(e) => set('branch', e.target.value)}>
                <option value="ALL">All branches</option>
                {LIMIT_BRANCHES.filter((b) => b.code !== 'default').map((b) => <option key={b.code} value={b.code}>{b.label}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-ink-muted">From
              <input aria-label="From date" type="date" className={inp} value={f.from} onChange={(e) => set('from', e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-ink-muted">To
              <input aria-label="To date" type="date" className={inp} value={f.to} onChange={(e) => set('to', e.target.value)} />
            </label>
            <label className="flex flex-col gap-1 text-[11px] text-ink-muted tablet:col-span-2 desktop:col-span-3">Reason (optional)
              <input aria-label="Reason" className={inp} placeholder="e.g. Faiz on leave 10–15 Jul" value={f.reason} onChange={(e) => set('reason', e.target.value)} />
            </label>
          </div>
          {msg && <div role="status" className="mt-2 rounded-brand bg-warning-soft px-3 py-2 text-xs text-warning">{msg}</div>}
          <div className="mt-3">
            <button type="button" onClick={submit} disabled={busy}
              className={`rounded-brand px-4 py-2 text-[13px] font-semibold text-white ${busy ? 'bg-ink-subtle' : 'bg-success hover:bg-success/90'}`}>
              {busy ? 'Granting…' : 'Grant delegation'}
            </button>
          </div>
        </div>
      )}

      {q.isLoading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : items.length === 0 ? (
        <div className="rounded-brand border border-surface-border bg-surface p-6 text-center text-[12.5px] text-ink-muted">No delegations. Example: <b className="text-ink">Faiz away 10–15 Jul → Sughra approves in his place</b>, reverting automatically.</div>
      ) : (
        <div className="overflow-x-auto rounded-brand border border-surface-border bg-surface">
          <table className="w-full min-w-[720px] text-[12px]">
            <thead><tr className="bg-surface-alt text-ink-muted">{['Delegate', 'Authority', 'Branch', 'Window', 'Status', ''].map((h) => <th key={h} className="p-2.5 text-left font-mono text-[9px] font-semibold uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-t border-surface-border/60">
                  <td className="p-2.5"><div className="font-semibold text-ink">{nm(d.toEmail)}</div>{d.fromEmail ? <div className="text-[10px] text-ink-subtle">in place of {nm(d.fromEmail)}</div> : null}</td>
                  <td className="p-2.5 text-ink-muted">{(SCOPES.find((s) => s.v === d.scope) || {}).l || d.scope}</td>
                  <td className="p-2.5 text-ink-muted">{d.branch || 'All'}</td>
                  <td className="p-2.5 font-mono text-[11px] text-ink-muted">{d.from} → {d.to}</td>
                  <td className="p-2.5">{d.revokedAt ? <span className="rounded-full bg-surface-alt px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase text-ink-subtle">revoked</span> : d.active ? <span className="rounded-full bg-success-soft px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase text-success">active</span> : <span className="rounded-full bg-surface-alt px-1.5 py-0.5 font-mono text-[8.5px] font-bold uppercase text-ink-subtle">scheduled/ended</span>}</td>
                  <td className="p-2.5">{owner && !d.revokedAt ? <button type="button" onClick={() => revoke(d.id)} className="text-[11px] text-ink-subtle underline hover:text-danger">Revoke</button> : null}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Delegation;
