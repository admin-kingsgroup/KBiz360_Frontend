import React, { useCallback, useEffect, useState } from 'react';
import { proposeGovernance, getPendingByType } from './api/governance';
import { MASTER_KINDS, masterKindLabel, isMasterValid } from './utils/governance';
import { waitingRoles } from './utils/changeRequests';

// ─── TK GROUP · FE · Master / CoA control (container) ────────────────────────
// Raise a master / chart-of-accounts change (add / rename / deactivate a head, etc.).
// It's filed as a Farhan + Owner change-request; applying it to the master stays a
// deliberate step after approval (nothing auto-posts).
const cell = { padding: '6px 10px', fontSize: 12, borderBottom: '1px solid #eee', textAlign: 'left' };
const inp = { padding: '6px 8px', fontSize: 12, border: '1px solid #cdd1d8', borderRadius: 5 };
const lbl = { fontSize: 11, fontWeight: 700, color: '#5a6691', display: 'block', marginBottom: 3 };

export function MasterControl() {
  const [pending, setPending] = useState([]);
  const [msg, setMsg] = useState('');
  const [kind, setKind] = useState('add_head');
  const [target, setTarget] = useState('');
  const [detail, setDetail] = useState('');
  const valid = isMasterValid({ kind, target });

  const load = useCallback(async () => { setPending(await getPendingByType('master')); }, []);
  useEffect(() => { load(); }, [load]);

  const submit = useCallback(async (e) => {
    e.preventDefault();
    if (!valid) return;
    setMsg('');
    try {
      await proposeGovernance('master', null, { kind, target: target.trim(), detail: detail.trim() });
      setMsg(`Master change "${masterKindLabel(kind)}: ${target.trim()}" submitted for Farhan + Owner approval.`);
      await load();
    } catch (e2) { setMsg((e2 && e2.message) || 'Failed to submit.'); }
  }, [valid, kind, target, detail, load]);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section>
        {msg ? <div role="status" style={{ padding: '6px 12px', fontSize: 12, color: '#1F6E4C', background: '#E6F2EC', marginBottom: 10, borderRadius: 5 }}>{msg}</div> : null}
        <form onSubmit={submit} aria-label="Raise a master change" style={{ display: 'grid', gap: 10, maxWidth: 460 }}>
          <div><label style={lbl}>Change kind</label>
            <select aria-label="Change kind" value={kind} onChange={(e) => setKind(e.target.value)} style={{ ...inp, width: '100%' }}>
              {MASTER_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Head / target</label>
            <input aria-label="Head or target" placeholder="e.g. ledger name or code" value={target} onChange={(e) => setTarget(e.target.value)} style={{ ...inp, width: '100%' }} />
          </div>
          <div><label style={lbl}>Detail (optional)</label>
            <textarea aria-label="Detail" rows={2} value={detail} onChange={(e) => setDetail(e.target.value)} style={{ ...inp, width: '100%', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <button type="submit" disabled={!valid} style={{ justifySelf: 'start', background: valid ? '#1F6E4C' : '#9bb3a7', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, padding: '7px 14px', cursor: valid ? 'pointer' : 'not-allowed' }}>
            Submit master change
          </button>
        </form>
      </section>

      <section>
        <h2 style={{ fontSize: 13, fontWeight: 800, color: '#1f2a44', margin: '0 0 6px' }}>Pending master changes</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Kind', 'Target', 'Detail', 'Waiting'].map((h) => <th key={h} style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>{h}</th>)}</tr></thead>
          <tbody>
            {pending.length ? pending.map((cr) => {
              const a = (cr.payload && cr.payload.after) || {};
              return (
                <tr key={cr._id}>
                  <td style={cell}>{masterKindLabel(a.kind)}</td>
                  <td style={cell}>{a.target || '—'}</td>
                  <td style={{ ...cell, color: '#777' }}>{a.detail || '—'}</td>
                  <td style={cell}>{waitingRoles(cr).join(' → ') || 'ready'}</td>
                </tr>
              );
            }) : <tr><td style={{ ...cell, color: '#777' }} colSpan={4}>No pending master changes.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
