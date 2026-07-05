import React, { useState } from 'react';
import { DECISION_TYPES, decisionTypeDef, approverHint, isDecisionValid } from './utils/decisions';

// ─── TK GROUP · FE · raise-a-decision form (presentational) ───────────────────
// A branch raises a credit / funds / counterparty decision. Calls onSubmit({type,
// party, amount, note}); the container files it. Shows who will need to sign so the
// proposer knows when the Owner gets pulled in.
const inp = { padding: '6px 8px', fontSize: 12, border: '1px solid #cdd1d8', borderRadius: 5 };
const lbl = { fontSize: 11, fontWeight: 700, color: '#5a6691', display: 'block', marginBottom: 3 };

export function DecisionRequestForm({ onSubmit }) {
  const [type, setType] = useState('credit_limit');
  const [party, setParty] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const def = decisionTypeDef(type);
  const valid = isDecisionValid({ type, party, amount });

  const submit = (e) => {
    e.preventDefault();
    if (valid && onSubmit) onSubmit({ type, party: party.trim(), amount: Number(amount) || 0, note: note.trim() });
  };

  return (
    <form onSubmit={submit} aria-label="Raise a decision" style={{ display: 'grid', gap: 10, maxWidth: 460 }}>
      <div>
        <label style={lbl} htmlFor="tk-dec-type">Decision type</label>
        <select id="tk-dec-type" aria-label="Decision type" value={type} onChange={(e) => setType(e.target.value)} style={{ ...inp, width: '100%' }}>
          {DECISION_TYPES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
        </select>
      </div>
      <div>
        <label style={lbl} htmlFor="tk-dec-party">{def ? def.partyLabel : 'Party'}</label>
        <input id="tk-dec-party" aria-label="Party" value={party} onChange={(e) => setParty(e.target.value)} style={{ ...inp, width: '100%' }} />
      </div>
      {def && def.amount ? (
        <div>
          <label style={lbl} htmlFor="tk-dec-amount">{def.amountLabel}</label>
          <input id="tk-dec-amount" aria-label="Amount" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ ...inp, width: '100%', fontVariantNumeric: 'tabular-nums' }} />
        </div>
      ) : null}
      <div>
        <label style={lbl} htmlFor="tk-dec-note">Note (optional)</label>
        <textarea id="tk-dec-note" aria-label="Note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} style={{ ...inp, width: '100%', resize: 'vertical', fontFamily: 'inherit' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button type="submit" disabled={!valid} style={{ background: valid ? '#1F6E4C' : '#9bb3a7', color: '#fff', border: 'none', borderRadius: 5, fontSize: 12, fontWeight: 600, padding: '7px 14px', cursor: valid ? 'pointer' : 'not-allowed' }}>
          Submit decision
        </button>
        <span style={{ fontSize: 11, color: '#777' }} data-testid="tk-approver-hint">Needs: {approverHint(type, amount)}</span>
      </div>
    </form>
  );
}
