import React, { useCallback, useEffect, useState } from 'react';
import { submitDecision, getMyDecisions } from './api/decisions';
import { typeLabel } from './utils/inbox';
import { statusLabel } from './utils/decisions';

// ─── TK GROUP CENTRAL · Onboarding (container) ───────────────────────────────
// Central onboarding of a new Client or Supplier, with the requested credit terms.
// It is filed as a counterparty decision (Farhan + Owner) — party masters are fully
// central, so a new party is never created ad-hoc in a branch. Nothing auto-creates
// the master; approval is the governance record and the master is set up after.
const cell = { padding: '6px 10px', fontSize: 12, borderBottom: '1px solid #eee', textAlign: 'left' };
const inp = { padding: '6px 8px', fontSize: 12, border: '1px solid #cdd1d8', borderRadius: 5 };
const lbl = { fontSize: 11, fontWeight: 700, color: '#5a6691', display: 'block', marginBottom: 3 };
const chip = (s) => ({ fontSize: 10.5, fontWeight: 700, padding: '1px 7px', borderRadius: 20, background: s === 'rejected' ? '#F6E4E4' : (s === 'pending' ? '#FBF6E9' : '#E6F2EC'), color: s === 'rejected' ? '#A32F2F' : (s === 'pending' ? '#6E5518' : '#1F6E4C') });

export function Onboarding() {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState('');
  const [kind, setKind] = useState('client');
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [credit, setCredit] = useState('');
  const [terms, setTerms] = useState('');
  const valid = !!name.trim();

  const load = useCallback(async () => {
    try {
      const rows = (await getMyDecisions()).items || [];
      setItems(rows.filter((r) => r.type === 'counterparty'));
    } catch { setItems([]); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = useCallback(async (e) => {
    e.preventDefault();
    if (!valid) return;
    setMsg('');
    const kindLabel = kind === 'client' ? 'Client' : 'Supplier';
    const note = [`${kindLabel} onboarding`, taxId && `Tax/Reg: ${taxId.trim()}`, terms && `Terms: ${terms.trim()}`, credit && `Credit: ${credit}`].filter(Boolean).join(' · ');
    try {
      await submitDecision({ type: 'counterparty', party: name.trim(), amount: Number(credit) || 0, note });
      setMsg(`${kindLabel} "${name.trim()}" submitted for Farhan + Owner approval.`);
      setName(''); setTaxId(''); setCredit(''); setTerms('');
      await load();
    } catch (e2) { setMsg((e2 && e2.message) || 'Failed to submit onboarding.'); }
  }, [valid, kind, name, taxId, credit, terms, load]);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section>
        {msg ? <div role="status" style={{ padding: '6px 12px', fontSize: 12, color: '#1F6E4C', background: '#E6F2EC', marginBottom: 10, borderRadius: 5 }}>{msg}</div> : null}
        <form onSubmit={submit} aria-label="Onboard a party" style={{ display: 'grid', gap: 10, maxWidth: 480 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ width: 130 }}><label style={lbl}>Party type</label>
              <select aria-label="Party type" value={kind} onChange={(e) => setKind(e.target.value)} style={{ ...inp, width: '100%' }}>
                <option value="client">Client</option>
                <option value="supplier">Supplier</option>
              </select>
            </div>
            <div style={{ flex: 1 }}><label style={lbl}>Name</label>
              <input aria-label="Party name" value={name} onChange={(e) => setName(e.target.value)} style={{ ...inp, width: '100%' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}><label style={lbl}>GSTIN / Tax / Reg no. (optional)</label>
              <input aria-label="Tax id" value={taxId} onChange={(e) => setTaxId(e.target.value)} style={{ ...inp, width: '100%' }} />
            </div>
            <div style={{ width: 150 }}><label style={lbl}>Credit limit (optional)</label>
              <input aria-label="Credit limit" type="number" min="0" value={credit} onChange={(e) => setCredit(e.target.value)} style={{ ...inp, width: '100%', fontVariantNumeric: 'tabular-nums' }} />
            </div>
          </div>
          <div><label style={lbl}>Terms / note (optional)</label>
            <input aria-label="Terms" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="e.g. 30-day credit, PDC, advance" style={{ ...inp, width: '100%' }} />
          </div>
          <button type="submit" disabled={!valid} style={{ justifySelf: 'start', background: valid ? '#1F6E4C' : '#9bb3a7', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, padding: '7px 14px', cursor: valid ? 'pointer' : 'not-allowed' }}>
            Submit onboarding
          </button>
        </form>
      </section>

      <section>
        <h2 style={{ fontSize: 13, fontWeight: 800, color: '#1f2a44', margin: '0 0 6px' }}>My onboarding requests</h2>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Party', 'Details', 'Status'].map((h) => <th key={h} style={{ ...cell, color: '#5a6691', fontWeight: 700 }}>{h}</th>)}</tr></thead>
          <tbody>
            {items.length ? items.map((cr) => {
              const a = (cr.payload && cr.payload.after) || {};
              return (
                <tr key={cr._id}>
                  <td style={cell}>{a.party || '—'}</td>
                  <td style={{ ...cell, color: '#777' }}>{a.note || typeLabel(cr.type)}</td>
                  <td style={cell}><span style={chip(cr.status)}>{statusLabel(cr.status)}</span></td>
                </tr>
              );
            }) : <tr><td style={{ ...cell, color: '#777' }} colSpan={3}>No onboarding requests yet.</td></tr>}
          </tbody>
        </table>
      </section>
    </div>
  );
}
