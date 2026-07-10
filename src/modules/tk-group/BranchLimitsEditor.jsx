import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getLimits, setBranchLimits, proposeBranchLimits } from './api/limits';
import { isOwner } from './utils/owner';
import { toastSuccess, toastError, toastInfo } from '../../core/ux/toast';
import { LIMIT_BRANCHES, symbolFor, effectiveValue, overrideValue, hasOverride, overrideCount, cleanLimitValues } from './utils/branchLimits';

// ─── Control Panel · Limits & Thresholds → BRANCH-WISE editor ────────────────
// Pick a branch, edit its thresholds. The Owner saves live (self-approved); everyone
// else proposes for the Owner. A blank field inherits the Group default; the guard
// enforces each branch's own effective values.
export function BranchLimitsEditor({ go }) {
  const qc = useQueryClient();
  const owner = isOwner();
  const q = useQuery({ queryKey: ['tk', 'limits'], queryFn: () => getLimits(), staleTime: 30_000 });
  const store = q.data?.store || { default: {}, branches: {} };
  const fields = q.data?.fields || [];
  const defaults = q.data?.defaults || {};

  const [branch, setBranch] = useState('default');
  const [vals, setVals] = useState({});
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  // Seed the editable fields from the branch's raw overrides on branch-change / reload
  // (blank = inherit). q.dataUpdatedAt reseeds after a save so the UI reflects the store.
  useEffect(() => {
    const seed = {};
    fields.forEach((f) => { seed[f.key] = overrideValue(store, branch, f.key); });
    setVals(seed);
    setMsg('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branch, q.dataUpdatedAt]);

  const meta = LIMIT_BRANCHES.find((b) => b.code === branch) || LIMIT_BRANCHES[0];
  const groups = useMemo(() => {
    const m = new Map();
    fields.forEach((f) => { if (!m.has(f.group)) m.set(f.group, []); m.get(f.group).push(f); });
    return [...m.entries()];
  }, [fields]);

  const save = async () => {
    const { clean, bad } = cleanLimitValues(fields, vals);
    if (bad.length) { setMsg(`Enter a valid number (≥ 0) for: ${bad.join(', ')}.`); return; }
    setSaving(true); setMsg('');
    try {
      if (owner) {
        const next = await setBranchLimits(branch, clean);
        qc.setQueryData(['tk', 'limits'], next);
        toastSuccess(`${meta.label} thresholds saved`);
        setMsg(`Saved — ${meta.label} thresholds are live.`);
      } else {
        await proposeBranchLimits(branch, clean);
        toastInfo('Submitted for the Owner’s approval.');
        setMsg(`Submitted ${meta.label} threshold changes for the Owner’s approval.`);
      }
      qc.invalidateQueries({ queryKey: ['tk', 'limits'] });
    } catch (e) {
      const m = (e && e.message) || 'Could not save the change.';
      toastError(m); setMsg(m);
    } finally { setSaving(false); }
  };

  return (
    <div data-testid="branch-limits-editor">
      <p className="mb-3 mt-1 max-w-[80ch] text-[13.5px] text-ink-muted">
        The numbers that bound each power — <b>set per branch</b>. Pick a branch, edit its limits, and {owner ? 'save (applies live).' : 'submit for the Owner’s approval.'} A field left blank <b>inherits the Group default</b>; the guard enforces each branch’s own values.
      </p>

      {/* branch selector */}
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Branch">
        {LIMIT_BRANCHES.map((b) => {
          const n = overrideCount(store, b.code);
          const active = branch === b.code;
          return (
            <button key={b.code} type="button" role="tab" aria-selected={active} onClick={() => setBranch(b.code)}
              className={`rounded-brand border px-3 py-1.5 text-left text-[12px] transition-colors ${active ? 'border-navy bg-navy/5 font-semibold text-navy' : 'border-surface-border text-ink-muted hover:bg-navy/5'}`}>
              <span>{b.label}</span>
              {b.code !== 'default' && <span className="ml-1 font-mono text-[10px] text-ink-subtle">{b.ccy}</span>}
              {n > 0 && b.code !== 'default' && <span className="ml-1.5 rounded-full bg-success-soft px-1.5 py-0.5 font-mono text-[8.5px] font-bold text-success">{n} set</span>}
            </button>
          );
        })}
      </div>

      {msg && <div role="status" className="mb-3 rounded-brand bg-warning-soft px-3 py-2 text-xs text-warning">{msg}</div>}

      {q.isLoading ? (
        <div className="rounded-brand border border-surface-border bg-surface p-4 text-[12.5px] text-ink-muted">Loading limits…</div>
      ) : (
        <div className="grid gap-3 tablet:grid-cols-2">
          {groups.map(([group, gf]) => (
            <div key={group} className="rounded-brand border border-surface-border bg-surface p-3.5">
              <div className="mb-2 font-mono text-[9.5px] font-semibold uppercase tracking-wide text-ink-subtle">{group}</div>
              <div className="grid gap-2.5">
                {gf.map((f) => {
                  const inherited = effectiveValue(store, defaults, branch, f.key);
                  const isOv = hasOverride(store, branch, f.key);
                  return (
                    <div key={f.key} className="flex items-center justify-between gap-2">
                      <label htmlFor={`bl-${f.key}`} className="text-[12px] text-ink">
                        {f.label}
                        {isOv && <span className="ml-1.5 rounded-full bg-success-soft px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase text-success">override</span>}
                      </label>
                      <span className="inline-flex shrink-0 items-center gap-1.5">
                        <span className="min-w-[12px] font-mono text-[11px] text-ink-subtle">{symbolFor(f.key, f.unit, meta.ccy)}</span>
                        <input id={`bl-${f.key}`} aria-label={f.label} type="number" step="any" min="0"
                          value={vals[f.key] ?? ''} onChange={(e) => setVals((s) => ({ ...s, [f.key]: e.target.value }))}
                          placeholder={branch === 'default' ? String(inherited ?? '') : `inherits ${inherited ?? ''}`}
                          className="w-[120px] rounded-md border border-surface-border bg-surface px-2.5 py-1.5 text-right font-mono text-[12px] text-ink" />
                        {branch !== 'default' && isOv && (
                          <button type="button" onClick={() => setVals((s) => ({ ...s, [f.key]: '' }))} title="Clear override (inherit Group default)" className="text-[12px] leading-none text-ink-subtle hover:text-danger">✕</button>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" onClick={save} disabled={saving || q.isLoading}
          className={`rounded-brand px-4 py-2 text-[13px] font-semibold text-white transition-colors ${saving || q.isLoading ? 'cursor-not-allowed bg-ink-subtle' : 'bg-success hover:bg-success/90'}`}>
          {saving ? 'Saving…' : owner ? `Save ${meta.label} thresholds` : `Submit ${meta.label} for approval`}
        </button>
        {go && <button type="button" onClick={() => go('/tk/limits')} className="text-[12px] text-ink-muted underline">Open full editor</button>}
      </div>
    </div>
  );
}

export default BranchLimitsEditor;
