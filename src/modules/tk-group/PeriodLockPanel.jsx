import React, { useState } from 'react';
import { isValidPeriod, statusLabel } from './utils/periodLocks';

// ─── TK GROUP · FE · period-lock panel (presentational) ──────────────────────
// Lists the current locks and offers a small "propose a lock" form. Submitting
// calls onPropose({branch, period, status, reason}) — the container turns that into
// a Farhan + Owner change-request. A branch of "ALL" is a group-wide lock.
const cell = { padding: '6px 10px', fontSize: 12, borderBottom: '1px solid #eee', textAlign: 'left' };
const inp = { padding: '5px 8px', fontSize: 12, border: '1px solid #cdd1d8', borderRadius: 5 };

export function PeriodLockPanel({ rows = [], branches = [], onPropose }) {
  const [branch, setBranch] = useState('ALL');
  const [period, setPeriod] = useState('');
  const [status, setStatus] = useState('hard');
  const [reason, setReason] = useState('');
  const valid = isValidPeriod(period) && !!branch;

  const submit = (e) => {
    e.preventDefault();
    if (valid && onPropose) onPropose({ branch, period, status, reason });
  };

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14 }}>
        <thead>
          <tr>
            <th style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>Branch</th>
            <th style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>Period</th>
            <th style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>Status</th>
            <th style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>Reason</th>
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((r) => (
            <tr key={`${r.branch}-${r.period}`}>
              <td style={cell}>{r.branch}</td>
              <td style={{ ...cell, fontVariantNumeric: 'tabular-nums' }}>{r.period}</td>
              <td style={cell}>{statusLabel(r.status)}</td>
              <td style={{ ...cell, color: '#777' }}>{r.reason || '—'}</td>
            </tr>
          )) : (
            <tr><td style={{ ...cell, color: '#777' }} colSpan={4}>No period locks.</td></tr>
          )}
        </tbody>
      </table>

      <form onSubmit={submit} aria-label="Propose a period lock" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <select aria-label="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} style={inp}>
          {branches.map((b) => <option key={b} value={b}>{b === 'ALL' ? 'ALL (group-wide)' : b}</option>)}
        </select>
        <input aria-label="Period (YYYY-MM)" placeholder="YYYY-MM" value={period} onChange={(e) => setPeriod(e.target.value)} style={{ ...inp, width: 96 }} />
        <select aria-label="Lock status" value={status} onChange={(e) => setStatus(e.target.value)} style={inp}>
          <option value="hard">Hard (blocked)</option>
          <option value="soft">Soft (warn)</option>
          <option value="open">Open (unlock)</option>
        </select>
        <input aria-label="Reason" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} style={{ ...inp, flex: 1, minWidth: 140 }} />
        <button type="submit" disabled={!valid} style={{ background: valid ? '#1F6E4C' : '#9bb3a7', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, padding: '6px 12px', cursor: valid ? 'pointer' : 'not-allowed' }}>
          Propose lock
        </button>
      </form>
    </div>
  );
}
