import React, { useCallback, useEffect, useState } from 'react';
import { submitDecision, getMyDecisions } from './api/decisions';
import { DecisionRequestForm } from './DecisionRequestForm';
import { typeLabel } from './utils/inbox';
import { statusLabel } from './utils/decisions';

// ─── TK GROUP · FE · decisions board (container) ─────────────────────────────
// A branch raises a decision and tracks their own requests + status. Farhan (and the
// Owner for large ones) act on them from the Approvals Inbox. Nothing auto-applies —
// approval is the governance record; updating the master stays a manual step.
const cell = { padding: '6px 10px', fontSize: 12, borderBottom: '1px solid #eee', textAlign: 'left' };
const chip = (s) => ({
  fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 20,
  background: s === 'rejected' ? '#F6E4E4' : (s === 'pending' ? '#FBF6E9' : '#E6F2EC'),
  color: s === 'rejected' ? '#A32F2F' : (s === 'pending' ? '#6E5518' : '#1F6E4C'),
});

export function DecisionsBoard() {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try { setItems((await getMyDecisions()).items || []); }
    catch { setItems([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSubmit = useCallback(async (form) => {
    setMsg('');
    try {
      await submitDecision(form);
      setMsg(`${typeLabel(form.type)} request for "${form.party}" submitted for approval.`);
      await load();
    } catch (e) {
      setMsg((e && e.message) || 'Failed to submit the decision.');
    }
  }, [load]);

  return (
    <div className="tk-decisions" style={{ display: 'grid', gap: 18 }}>
      <section>
        {msg ? <div role="status" style={{ padding: '6px 12px', fontSize: 12, color: '#1F6E4C', background: '#E6F2EC', marginBottom: 10, borderRadius: 5 }}>{msg}</div> : null}
        <DecisionRequestForm onSubmit={onSubmit} />
      </section>

      <section>
        <h2 style={{ fontSize: 13, fontWeight: 800, color: '#1f2a44', margin: '0 0 6px' }}>My decision requests</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Type', 'Party', 'Amount', 'Status'].map((h) => (
                <th key={h} style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length ? items.map((cr) => {
              const after = (cr.payload && cr.payload.after) || {};
              return (
                <tr key={cr._id}>
                  <td style={cell}>{typeLabel(cr.type)}</td>
                  <td style={cell}>{after.party || '—'}</td>
                  <td style={{ ...cell, fontVariantNumeric: 'tabular-nums' }}>{after.amount ? Number(after.amount).toLocaleString() : '—'}</td>
                  <td style={cell}><span style={chip(cr.status)}>{statusLabel(cr.status)}</span></td>
                </tr>
              );
            }) : (
              <tr><td style={{ ...cell, color: '#777' }} colSpan={4}>No decision requests yet.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
