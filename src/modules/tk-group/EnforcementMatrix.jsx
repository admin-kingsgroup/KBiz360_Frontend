import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getVoucherPolicy, setVoucherPolicy, proposeVoucherPolicy } from './api/voucherPolicy';
import { isOwner } from './utils/owner';
import { toastSuccess, toastError, toastInfo } from '../../core/ux/toast';
import { resolveCell, hasCellOverride } from './utils/voucherPolicy';
import { LIMIT_BRANCHES } from './utils/branchLimits';

// ─── Control Panel · Enforcement Matrix (per voucher type × branch) ──────────
// For the panel-selected branch: turn on approval enforcement per voucher type, above a
// threshold, from an effective date. When Enforce is ON, a voucher of that type walks the
// Check → Verify → Approve chain (per the branch's Approval config). Owner saves live;
// others propose. Blank threshold = enforce at any amount; blank date = effective now.
export function EnforcementMatrix({ go, branch = 'default' }) {
  const qc = useQueryClient();
  const owner = isOwner();
  const q = useQuery({ queryKey: ['tk', 'voucherPolicy'], queryFn: () => getVoucherPolicy(), staleTime: 30_000 });
  const store = q.data?.store || { default: {}, branches: {} };
  const categories = q.data?.categories || [];
  const meta = LIMIT_BRANCHES.find((b) => b.code === branch) || LIMIT_BRANCHES[0];

  const [rows, setRows] = useState({});
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState('');

  // Seed each row from the effective policy for the selected branch on branch / reload.
  useEffect(() => {
    const seed = {};
    categories.forEach((c) => {
      const cell = resolveCell(store, branch, c.key);
      seed[c.key] = { enforce: cell.enforce === true, threshold: cell.threshold ? String(cell.threshold) : '', effectiveDate: cell.effectiveDate || '' };
    });
    setRows(seed);
    setMsg('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, q.dataUpdatedAt, categories.length]);

  const patch = (key) => { const r = rows[key] || {}; const t = r.threshold; return { enforce: r.enforce === true, threshold: t === '' ? 0 : Number(t), effectiveDate: r.effectiveDate || '' }; };

  const persist = async (key, body, label) => {
    setBusy(key); setMsg('');
    try {
      if (owner) {
        const res = await setVoucherPolicy(branch, key, body);
        if (res && res.store) qc.setQueryData(['tk', 'voucherPolicy'], { ...q.data, store: res.store });
        toastSuccess(`${label} · ${meta.label} — saved`);
        setMsg(`${label} for ${meta.label} saved (live).`);
      } else {
        await proposeVoucherPolicy(branch, key, body);
        toastInfo('Submitted for the Owner’s approval.');
        setMsg(`${label} for ${meta.label} submitted for the Owner’s approval.`);
      }
      qc.invalidateQueries({ queryKey: ['tk', 'voucherPolicy'] });
    } catch (e) { const m = (e && e.message) || 'Could not save.'; toastError(m); setMsg(m); }
    finally { setBusy(''); }
  };

  const applyRow = (c) => {
    const r = rows[c.key] || {};
    if (r.threshold !== '' && (Number.isNaN(Number(r.threshold)) || Number(r.threshold) < 0)) { setMsg(`Enter a valid amount (≥ 0) for ${c.label}.`); return; }
    persist(c.key, patch(c.key), c.label);
  };
  // Branch scope only: clear the override so the row re-inherits the Group default.
  const inheritRow = (c) => persist(c.key, { enforce: '', threshold: '', effectiveDate: '' }, `${c.label} (inherit)`);

  const scoped = branch !== 'default';

  return (
    <div data-testid="enforcement-matrix">
      <p className="mb-3 mt-1 max-w-[82ch] text-[13.5px] text-ink-muted">
        Turn approval enforcement on <b>one voucher type at a time</b>, for <b>{meta.label}</b>. Set a threshold (only enforce at/above the amount) and an effective date (schedule it). When ON, that type walks <b>Check → Verify → Approve</b> per the branch’s <button className="underline" onClick={() => go && go('/tk/control-panel')}>Approval</button> config. {owner ? 'Saves apply live.' : 'Changes are submitted for the Owner’s approval.'}
      </p>

      {msg && <div role="status" className="mb-3 rounded-brand bg-warning-soft px-3 py-2 text-xs text-warning">{msg}</div>}

      <div className="overflow-x-auto rounded-brand border border-surface-border bg-surface">
        <table className="w-full min-w-[720px] text-[12px]">
          <thead>
            <tr className="bg-surface-alt text-ink-muted">
              {['Voucher type', 'Enforce', `Above (${meta.ccy})`, 'Effective from', ''].map((h, i) => (
                <th key={h + i} className={`p-2.5 font-mono text-[9px] font-semibold uppercase tracking-wide ${i === 0 ? 'text-left' : 'text-center'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {q.isLoading ? (
              <tr><td colSpan={5} className="p-4 text-center text-[12.5px] text-ink-muted">Loading matrix…</td></tr>
            ) : categories.map((c) => {
              const r = rows[c.key] || { enforce: false, threshold: '', effectiveDate: '' };
              const isOv = hasCellOverride(store, branch, c.key);
              const live = resolveCell(store, branch, c.key);
              return (
                <tr key={c.key} className="border-t border-surface-border/60">
                  <td className="p-2.5 font-semibold text-ink">
                    {c.label}
                    {scoped && isOv && <span className="ml-1.5 rounded-full bg-success-soft px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase text-success">override</span>}
                    {live.enforce && <span className="ml-1.5 rounded-full bg-danger-soft px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase text-danger">enforced</span>}
                  </td>
                  <td className="p-2.5 text-center">
                    <button type="button" role="switch" aria-checked={r.enforce} aria-label={`Enforce ${c.label}`}
                      onClick={() => setRows((s) => ({ ...s, [c.key]: { ...r, enforce: !r.enforce } }))}
                      className={`relative h-[22px] w-[40px] rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/50 ${r.enforce ? 'bg-danger' : 'bg-surface-border'}`}>
                      <span className="absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-all" style={{ left: r.enforce ? 20 : 2 }} />
                    </button>
                  </td>
                  <td className="p-2.5 text-center">
                    <input aria-label={`${c.label} threshold`} type="number" step="any" min="0" placeholder="0 = any"
                      value={r.threshold} onChange={(e) => setRows((s) => ({ ...s, [c.key]: { ...r, threshold: e.target.value } }))}
                      className="w-[110px] rounded-md border border-surface-border bg-surface px-2 py-1 text-right font-mono text-[12px] text-ink" />
                  </td>
                  <td className="p-2.5 text-center">
                    <input aria-label={`${c.label} effective date`} type="date"
                      value={r.effectiveDate} onChange={(e) => setRows((s) => ({ ...s, [c.key]: { ...r, effectiveDate: e.target.value } }))}
                      className="rounded-md border border-surface-border bg-surface px-2 py-1 font-mono text-[11px] text-ink" />
                  </td>
                  <td className="p-2.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button type="button" onClick={() => applyRow(c)} disabled={busy === c.key}
                        className={`rounded-md px-2.5 py-1 text-[11px] font-semibold text-white ${busy === c.key ? 'bg-ink-subtle' : 'bg-success hover:bg-success/90'}`}>
                        {busy === c.key ? '…' : owner ? 'Apply' : 'Propose'}
                      </button>
                      {scoped && isOv && (
                        <button type="button" onClick={() => inheritRow(c)} title="Clear override (inherit Group default)" className="text-[11px] text-ink-subtle hover:text-danger">↺</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-[16px] flex items-start gap-2.5 rounded-[9px] border border-warning/40 bg-warning-soft px-[15px] py-3 text-[12.5px] text-warning [&_b]:font-semibold">
        <span>▶</span>
        <span>Turning <b>Enforce</b> on routes that voucher type through the approval chain directly — it does <b>not</b> require the Master Switch. A blank threshold enforces at any amount; a future effective date schedules the rule. Each branch inherits the <b>Group default</b> row unless it sets its own. <b>Booking (SO/PO/GP)</b> governs a booking’s sale and purchase legs together; <b>Inter-Branch (INB)</b> is controlled separately.</span>
      </div>
    </div>
  );
}

export default EnforcementMatrix;
