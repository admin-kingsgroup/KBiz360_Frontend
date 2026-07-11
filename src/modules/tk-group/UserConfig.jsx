import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getRoster, getUserLimits, setUserLimit, proposeUserLimit } from './api/userLimits';
import { isOwner } from './utils/owner';
import { toastSuccess, toastError, toastInfo } from '../../core/ux/toast';
import { resolveUserLimit, hasUserBranchOverride, userDefaultLimit } from './utils/userLimits';
import { LIMIT_BRANCHES } from './utils/branchLimits';

// ─── Control Panel · User Configuration (real roster + per-user ceilings) ────
// The live user list with role / branches / app access, and each user's approval
// ceiling for the selected branch. Above their ceiling, an approver is blocked (a higher
// approver must sign) — enforced by the guard on approval when the branch's guard is on.
// Owner saves live; others propose. Full per-user rules live in the User Control Center.
const AccessDot = ({ on, label }) => (
  <span title={`${label}: ${on ? 'on' : 'off'}`} className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase ${on ? 'bg-success-soft text-success' : 'bg-surface-alt text-ink-subtle'}`}>{label}</span>
);

export function UserConfig({ go, branch = 'default' }) {
  const qc = useQueryClient();
  const owner = isOwner();
  const rosterQ = useQuery({ queryKey: ['tk', 'roster'], queryFn: getRoster, staleTime: 60_000 });
  const limitsQ = useQuery({ queryKey: ['tk', 'userLimits'], queryFn: getUserLimits, staleTime: 30_000 });
  const roster = rosterQ.data || [];
  const store = limitsQ.data?.store || {};
  const meta = LIMIT_BRANCHES.find((b) => b.code === branch) || LIMIT_BRANCHES[0];
  const scoped = branch !== 'default';

  const [vals, setVals] = useState({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  // Seed each user's ceiling input from the store for the selected branch (blank = none).
  useEffect(() => {
    const seed = {};
    roster.forEach((u) => { const v = resolveUserLimit(store, u.email, branch); seed[u.email] = v != null ? String(v) : ''; });
    setVals(seed);
    setMsg('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, limitsQ.dataUpdatedAt, roster.length]);

  const save = async (u) => {
    const raw = vals[u.email];
    if (raw !== '' && (Number.isNaN(Number(raw)) || Number(raw) < 0)) { setMsg(`Enter a valid ceiling (≥ 0) for ${u.name}.`); return; }
    setBusy(u.email); setMsg('');
    const value = raw === '' ? '' : Number(raw);
    try {
      if (owner) {
        const res = await setUserLimit(u.email, branch, value);
        if (res && res.store) qc.setQueryData(['tk', 'userLimits'], { ...limitsQ.data, store: res.store });
        toastSuccess(`${u.name} · ${meta.label} — ceiling saved`);
        setMsg(`${u.name}'s ${meta.label} ceiling saved (live).`);
      } else {
        await proposeUserLimit(u.email, branch, value);
        toastInfo('Submitted for the Owner’s approval.');
        setMsg(`${u.name}'s ceiling change submitted for the Owner’s approval.`);
      }
      qc.invalidateQueries({ queryKey: ['tk', 'userLimits'] });
    } catch (e) { const m = (e && e.message) || 'Could not save.'; toastError(m); setMsg(m); }
    finally { setBusy(''); }
  };

  return (
    <div data-testid="user-config">
      <p className="mb-3 mt-1 max-w-[84ch] text-[13.5px] text-ink-muted">
        Every user, with role · branches · app access, and their <b>approval ceiling</b> for <b>{meta.label}</b>. Above the ceiling an approver is blocked — a higher approver must sign (enforced when that branch’s guard is on). {owner ? 'Saves apply live.' : 'Changes are submitted for the Owner’s approval.'} Full per-user rules (branch/module/2FA/view-only) live in the <button className="underline" onClick={() => go && go('/tk/user-rules')}>User Control Center</button>.
      </p>

      {msg && <div role="status" className="mb-3 rounded-brand bg-warning-soft px-3 py-2 text-xs text-warning">{msg}</div>}

      <div className="overflow-x-auto rounded-brand border border-surface-border bg-surface">
        <table className="w-full min-w-[760px] text-[12px]">
          <thead>
            <tr className="bg-surface-alt text-ink-muted">
              {['User', 'Branches', 'Access', `Approval ceiling (${meta.ccy})`, ''].map((h, i) => (
                <th key={h + i} className={`p-2.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${i === 0 ? 'text-left' : i === 3 ? 'text-center' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rosterQ.isLoading ? (
              <tr><td colSpan={5} className="p-4 text-center text-[12.5px] text-ink-muted">Loading users…</td></tr>
            ) : roster.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-[12.5px] text-ink-muted">No users found.</td></tr>
            ) : roster.map((u) => {
              const isOv = hasUserBranchOverride(store, u.email, branch);
              const inheritDefault = userDefaultLimit(store, u.email);
              return (
                <tr key={u.id || u.email} className="border-t border-surface-border/60 align-top">
                  <td className="p-2.5">
                    <div className="font-semibold text-ink">{u.name}</div>
                    <div className="text-[10.5px] text-ink-muted">{u.role}{u.status && u.status !== 'active' ? ` · ${u.status}` : ''}</div>
                  </td>
                  <td className="p-2.5 text-[11px] text-ink-muted">{(u.branches && u.branches.length) ? u.branches.join(', ') : 'all / —'}</td>
                  <td className="p-2.5">
                    <div className="flex flex-wrap gap-1">
                      <AccessDot on={!!(u.access && u.access.erp)} label="ERP" />
                      <AccessDot on={!!(u.access && u.access.crm)} label="CRM" />
                      <AccessDot on={!!(u.access && u.access.app)} label="App" />
                    </div>
                  </td>
                  <td className="p-2.5 text-center">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-mono text-[11px] text-ink-subtle">{meta.ccy}</span>
                      <input aria-label={`${u.name} approval ceiling`} type="number" step="any" min="0"
                        placeholder={scoped && inheritDefault != null ? `inherits ${inheritDefault}` : 'none'}
                        value={vals[u.email] ?? ''} onChange={(e) => setVals((s) => ({ ...s, [u.email]: e.target.value }))}
                        className="w-[120px] rounded-md border border-surface-border bg-surface px-2.5 py-1.5 text-right font-mono text-[12px] text-ink" />
                      {scoped && isOv && <span className="rounded-full bg-success-soft px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase text-success">override</span>}
                    </span>
                  </td>
                  <td className="p-2.5 text-center">
                    <button type="button" onClick={() => save(u)} disabled={busy === u.email}
                      className={`rounded-md px-2.5 py-1 text-[11px] font-semibold text-white ${busy === u.email ? 'bg-ink-subtle' : 'bg-success hover:bg-success/90'}`}>
                      {busy === u.email ? '…' : owner ? 'Save' : 'Propose'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-[16px] flex items-start gap-2.5 rounded-[9px] border border-warning/40 bg-warning-soft px-[15px] py-3 text-[12.5px] text-warning [&_b]:font-semibold">
        <span>🛡️</span>
        <span>A blank ceiling means <b>no limit</b> for that scope. A branch ceiling overrides the user’s default; clear it to re-inherit. Ceilings enforce on <b>voucher approval</b> once the branch’s Master Switch is on. 2FA &amp; session rules remain Planned.</span>
      </div>
    </div>
  );
}

export default UserConfig;
