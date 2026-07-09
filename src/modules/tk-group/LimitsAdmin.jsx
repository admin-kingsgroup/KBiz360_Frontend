import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getLimits, proposeLimits } from './api/limits';
import { Button, Input, LoadingState, PageSection } from '../../shell/primitives';

// ─── TK GROUP CENTRAL · Thresholds & Limits (Owner-editable) ─────────────────
// The control-model numbers in one editable place — decision escalation ceilings,
// voucher tiers, cash limits, investment "fix-first" thresholds. Editing files an
// Owner change-request (never a raw write); applied only on Owner approval.

export function LimitsAdmin() {
  const [fields, setFields] = useState([]);
  const [values, setValues] = useState({});
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    const d = await getLimits();
    setFields(d.fields || []);
    setValues(d.limits || {});
  }, []);
  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const m = new Map();
    (fields || []).forEach((f) => { if (!m.has(f.group)) m.set(f.group, []); m.get(f.group).push(f); });
    return [...m.entries()];
  }, [fields]);

  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }));

  const submit = useCallback(async (e) => {
    e.preventDefault();
    setMsg('');
    // Send the FULL canonical set (every field), never a partial — the BE merges the
    // proposed config over DEFAULTS, so an omitted key would silently reset to default.
    // And block a blank/invalid field: an empty box coerces to 0, which would disable a
    // control (e.g. a 0 escalation ceiling escalates every voucher). Force a real number.
    const clean = {};
    const bad = [];
    (fields || []).forEach((f) => {
      const raw = values[f.key];
      const n = Number(raw);
      if (raw === '' || raw == null || Number.isNaN(n)) { bad.push(f.label); return; }
      clean[f.key] = n;
    });
    if (bad.length) { setMsg(`Enter a valid number for: ${bad.join(', ')}.`); return; }
    try {
      await proposeLimits(clean);
      setMsg('Threshold changes submitted for Owner approval — they apply once the Owner approves.');
    } catch (e2) { setMsg((e2 && e2.message) || 'Failed to submit.'); }
  }, [fields, values]);

  return (
    <div className="mx-auto max-w-[560px]">
      <form onSubmit={submit} aria-label="Edit thresholds and limits">
        <PageSection padded={false} className="overflow-hidden">
          {msg && (
            <div role="status" className="border-b border-surface-border bg-warning-soft px-4 py-2 text-xs text-warning">
              {msg}
            </div>
          )}
          {groups.length ? (
            <div className="divide-y divide-surface-border">
              {groups.map(([group, gf]) => (
                <section key={group} className="px-4 py-3">
                  <h2 className="mb-2 text-[11px] font-extrabold uppercase tracking-wide text-ink-muted">{group}</h2>
                  <div className="grid gap-2.5">
                    {gf.map((f) => (
                      <div key={f.key} className="flex items-center justify-between gap-3">
                        <label htmlFor={`lim-${f.key}`} className="text-xs text-navy">{f.label}</label>
                        <span className="inline-flex shrink-0 items-center gap-1.5">
                          <Input id={`lim-${f.key}`} aria-label={f.label} type="number" step="any" min="0"
                            value={values[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}
                            className="w-[130px] text-right tabular-nums" />
                          <span className="min-w-[26px] text-[11px] text-ink-muted">{f.unit}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="p-4"><LoadingState label="Loading limits…" /></div>
          )}
          <div className="flex justify-center border-t border-surface-border bg-surface-alt px-4 py-3">
            <Button type="submit" variant="success" size="sm">
              Submit changes for Owner approval
            </Button>
          </div>
        </PageSection>
      </form>
    </div>
  );
}
