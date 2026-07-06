import React, { useCallback, useEffect, useState } from 'react';
import { proposeGovernance, getPendingByType } from './api/governance';
import { HR_KINDS, hrKindLabel, isHrValid } from './utils/hr';
import { waitingRoles } from './utils/changeRequests';

// ─── TK GROUP CENTRAL · HR Control (container) ───────────────────────────────
// Raise an HR governance item (new hire / salary revision / payroll release) centrally.
// Filed as a Farhan + Owner change-request; nothing is actioned in HR until approved
// (the approval is the governance record). Mirrors Master Control.
const cell = { padding: '6px 10px', fontSize: 12, borderBottom: '1px solid #eee', textAlign: 'left' };
const inp = { padding: '6px 8px', fontSize: 12, border: '1px solid #cdd1d8', borderRadius: 5 };
const lbl = { fontSize: 11, fontWeight: 700, color: '#5a6691', display: 'block', marginBottom: 3 };
const DEFAULT_BRANCHES = ['', 'BOM', 'AMD', 'BOMMB', 'NBO', 'DAR', 'FBM'];

export function HRControl({ branches = DEFAULT_BRANCHES }) {
  const [pending, setPending] = useState([]);
  const [msg, setMsg] = useState('');
  const [kind, setKind] = useState('new_hire');
  const [subject, setSubject] = useState('');
  const [branch, setBranch] = useState('');
  const [detail, setDetail] = useState('');
  const valid = isHrValid({ kind, subject });

  const load = useCallback(async () => { setPending(await getPendingByType('hr')); }, []);
  useEffect(() => { load(); }, [load]);

  const submit = useCallback(async (e) => {
    e.preventDefault();
    if (!valid) return;
    setMsg('');
    try {
      await proposeGovernance('hr', branch || null, { kind, subject: subject.trim(), branch: branch || null, detail: detail.trim() });
      setMsg(`HR request "${hrKindLabel(kind)}: ${subject.trim()}" submitted for Owner approval.`);
      setSubject(''); setDetail('');
      await load();
    } catch (e2) { setMsg((e2 && e2.message) || 'Failed to submit.'); }
  }, [valid, kind, subject, branch, detail, load]);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section>
        {msg ? <div role="status" style={{ padding: '6px 12px', fontSize: 12, color: '#1F6E4C', background: '#E6F2EC', marginBottom: 10, borderRadius: 5 }}>{msg}</div> : null}
        <form onSubmit={submit} aria-label="Raise an HR request" style={{ display: 'grid', gap: 10, maxWidth: 480 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><label style={lbl}>HR item</label>
              <select aria-label="HR item" value={kind} onChange={(e) => setKind(e.target.value)} style={{ ...inp, width: '100%' }}>
                {HR_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
              </select>
            </div>
            <div style={{ width: 130 }}><label style={lbl}>Branch (optional)</label>
              <select aria-label="Branch" value={branch} onChange={(e) => setBranch(e.target.value)} style={{ ...inp, width: '100%' }}>
                {branches.map((b) => <option key={b || 'none'} value={b}>{b || '—'}</option>)}
              </select>
            </div>
          </div>
          <div><label style={lbl}>Employee / role</label>
            <input aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Ravi Kumar — Accountant" style={{ ...inp, width: '100%' }} />
          </div>
          <div><label style={lbl}>Detail (optional)</label>
            <textarea aria-label="Detail" rows={2} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="e.g. CTC, effective date, payroll month" style={{ ...inp, width: '100%', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <button type="submit" disabled={!valid} style={{ justifySelf: 'start', background: valid ? '#1F6E4C' : '#9bb3a7', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, padding: '7px 14px', cursor: valid ? 'pointer' : 'not-allowed' }}>
            Submit HR request
          </button>
        </form>
      </section>

      <section>
        <h2 style={{ fontSize: 13, fontWeight: 800, color: '#1f2a44', margin: '0 0 6px' }}>Pending HR requests</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Item', 'Employee / role', 'Branch', 'Waiting'].map((h) => <th key={h} style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>{h}</th>)}</tr></thead>
          <tbody>
            {pending.length ? pending.map((cr) => {
              const a = (cr.payload && cr.payload.after) || {};
              return (
                <tr key={cr._id}>
                  <td style={cell}>{hrKindLabel(a.kind)}</td>
                  <td style={cell}>{a.subject || '—'}</td>
                  <td style={cell}>{a.branch || cr.branch || '—'}</td>
                  <td style={cell}>{waitingRoles(cr).join(' → ') || 'ready'}</td>
                </tr>
              );
            }) : <tr><td style={{ ...cell, color: '#777' }} colSpan={4}>No pending HR requests.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
