import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getLimits, proposeLimits } from './api/limits';
import { Button, Input, LoadingState } from '../../shell/primitives';

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
    <form onSubmit={submit} aria-label="Edit thresholds and limits" className="grid max-w-[520px] gap-4">
      {msg ? <div role="status" className="rounded-md bg-warning-soft px-3 py-1.5 text-xs text-warning">{msg}</div> : null}
      {groups.length ? groups.map(([group, gf]) => (
        <section key={group}>
          <h2 className="mb-1 text-xs font-extrabold text-navy">{group}</h2>
          {gf.map((f) => (
            <div key={f.key} className="flex items-center justify-between gap-3 border-b border-surface-border py-1.5">
              <label htmlFor={`lim-${f.key}`} className="text-xs text-ink-muted">{f.label}</label>
              <span className="inline-flex items-center gap-1.5">
                <Input id={`lim-${f.key}`} aria-label={f.label} type="number" step="any" min="0"
                  value={values[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)}
                  className="w-[130px] text-right tabular-nums" />
                <span className="min-w-[26px] text-[11px] text-ink-muted">{f.unit}</span>
              </span>
            </div>
          ))}
        </section>
      )) : <LoadingState label="Loading limits…" />}
      <Button type="submit" variant="success" size="sm" className="justify-self-start">
        Submit changes for Owner approval
      </Button>
    </form>
  );
}
