import React, { useCallback, useEffect, useState } from 'react';
import { proposeGovernance, getPendingByType } from './api/governance';
import { TARGET_METRICS, metricLabel, isValidPeriod, isTargetValid } from './utils/governance';
import { waitingRoles } from './utils/changeRequests';

// ─── TK GROUP · FE · Targets & Budgets governance (container) ────────────────
// Propose a branch target / budget for a period; it's filed as a Farhan + Owner
// change-request. Nothing auto-applies — approval is the governance record.
const DEFAULT_BRANCHES = ['ALL', 'BOM', 'AMD', 'BOMMB', 'NBO', 'DAR', 'FBM'];
const cell = { padding: '6px 10px', fontSize: 12, borderBottom: '1px solid #eee', textAlign: 'left' };
const inp = { padding: '6px 8px', fontSize: 12, border: '1px solid #cdd1d8', borderRadius: 5 };
const lbl = { fontSize: 11, fontWeight: 700, color: '#5a6691', display: 'block', marginBottom: 3 };

export function TargetsBudgets({ branches = DEFAULT_BRANCHES }) {
  const [pending, setPending] = useState([]);
  const [msg, setMsg] = useState('');
  const [branch, setBranch] = useState('ALL');
  const [period, setPeriod] = useState('');
  const [metric, setMetric] = useState('sales');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const valid = isTargetValid({ branch, period, metric, amount });

  const load = useCallback(async () => { setPending(await getPendingByType('target_budget')); }, []);
  useEffect(() => { load(); }, [load]);

  const submit = useCallback(async (e) => {
    e.preventDefault();
    if (!valid) return;
    setMsg('');
    try {
      await proposeGovernance('target_budget', branch, { branch, period, metric, amount: Number(amount), note: note.trim() });
      setMsg(`${metricLabel(metric)} target for ${branch} ${period} submitted for Owner approval.`);
      await load();
    } catch (e2) { setMsg((e2 && e2.message) || 'Failed to submit.'); }
  }, [valid, branch, period, metric, amount, note, load]);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section>
        {msg ? <div role="status" style={{ padding: '6px 12px', fontSize: 12, color: '#1F6E4C', background: '#E6F2EC', marginBottom: 10, borderRadius: 5 }}>{msg}</div> : null}
        <form onSubmit={submit} aria-label="Propose a target or budget" style={{ display: 'grid', gap: 10, maxWidth: 460 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><label style={lbl}>Branch</label>
              <select aria-label="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} style={{ ...inp, width: '100%' }}>
                {branches.map((b) => <option key={b} value={b}>{b === 'ALL' ? 'ALL (group)' : b}</option>)}
              </select>
            </div>
            <div style={{ width: 110 }}><label style={lbl}>Period</label>
              <input aria-label="Period (YYYY-MM)" placeholder="YYYY-MM" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ ...inp, width: '100%' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><label style={lbl}>Metric</label>
              <select aria-label="Metric" value={metric} onChange={(e) => setMetric(e.target.value)} style={{ ...inp, width: '100%' }}>
                {TARGET_METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}><label style={lbl}>Amount</label>
              <input aria-label="Amount" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ ...inp, width: '100%', fontVariantNumeric: 'tabular-nums' }} />
            </div>
          </div>
          <div><label style={lbl}>Note (optional)</label>
            <input aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} style={{ ...inp, width: '100%' }} />
          </div>
          <button type="submit" disabled={!valid} style={{ justifySelf: 'start', background: valid ? '#1F6E4C' : '#9bb3a7', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, padding: '7px 14px', cursor: valid ? 'pointer' : 'not-allowed' }}>
            Submit target
          </button>
        </form>
      </section>

      <section>
        <h2 style={{ fontSize: 13, fontWeight: 800, color: '#1f2a44', margin: '0 0 6px' }}>Pending target/budget proposals</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Branch', 'Period', 'Metric', 'Amount', 'Waiting'].map((h) => <th key={h} style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>{h}</th>)}</tr></thead>
          <tbody>
            {pending.length ? pending.map((cr) => {
              const a = (cr.payload && cr.payload.after) || {};
              return (
                <tr key={cr._id}>
                  <td style={cell}>{a.branch || cr.branch || '—'}</td>
                  <td style={{ ...cell, fontVariantNumeric: 'tabular-nums' }}>{a.period || '—'}</td>
                  <td style={cell}>{metricLabel(a.metric)}</td>
                  <td style={{ ...cell, fontVariantNumeric: 'tabular-nums' }}>{a.amount ? Number(a.amount).toLocaleString() : '—'}</td>
                  <td style={cell}>{waitingRoles(cr).join(' → ') || 'ready'}</td>
                </tr>
              );
            }) : <tr><td style={{ ...cell, color: '#777' }} colSpan={5}>No pending proposals.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
