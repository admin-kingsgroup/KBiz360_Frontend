import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getLimits, proposeLimits } from './api/limits';

// ─── TK GROUP CENTRAL · Thresholds & Limits (Owner-editable) ─────────────────
// The control-model numbers in one editable place — decision escalation ceilings,
// voucher tiers, cash limits, investment "fix-first" thresholds. Editing files an
// Owner change-request (never a raw write); applied only on Owner approval.
const inp = { padding: '5px 8px', fontSize: 12, border: '1px solid #cdd1d8', borderRadius: 5, width: 130, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };
const row = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '6px 0', borderBottom: '1px solid #dfe2e7' };

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
    <form onSubmit={submit} aria-label="Edit thresholds and limits" style={{ display: 'grid', gap: 16, maxWidth: 520 }}>
      {msg ? <div role="status" style={{ padding: '6px 12px', fontSize: 12, color: '#6E5518', background: '#FBF6E9', borderRadius: 5 }}>{msg}</div> : null}
      {groups.length ? groups.map(([group, gf]) => (
        <section key={group}>
          <h2 style={{ fontSize: 12.5, fontWeight: 800, color: '#1f2a44', margin: '0 0 4px' }}>{group}</h2>
          {gf.map((f) => (
            <div key={f.key} style={row}>
              <label htmlFor={`lim-${f.key}`} style={{ fontSize: 12, color: '#555' }}>{f.label}</label>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <input id={`lim-${f.key}`} aria-label={f.label} type="number" step="any" min="0"
                  value={values[f.key] ?? ''} onChange={(e) => set(f.key, e.target.value)} style={inp} />
                <span style={{ fontSize: 11, color: '#8892a4', minWidth: 26 }}>{f.unit}</span>
              </span>
            </div>
          ))}
        </section>
      )) : <div style={{ fontSize: 12, color: '#777' }}>Loading limits…</div>}
      <button type="submit" style={{ justifySelf: 'start', background: '#1F6E4C', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, padding: '7px 14px', cursor: 'pointer' }}>
        Submit changes for Owner approval
      </button>
    </form>
  );
}
