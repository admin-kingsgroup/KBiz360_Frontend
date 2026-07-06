import React, { useState } from 'react';
import { DECISION_TYPES, decisionTypeDef, approverHint, isDecisionValid } from './utils/decisions';
import { Button, FormField, Input, Select, Textarea } from '../../shell/primitives';

// ─── TK GROUP · FE · raise-a-decision form (presentational) ───────────────────
// A branch raises a credit / funds / counterparty decision. Calls onSubmit({type,
// party, amount, note}); the container files it. Shows who will need to sign so the
// proposer knows when the Owner gets pulled in.
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
    <form onSubmit={submit} aria-label="Raise a decision" className="grid max-w-[460px] gap-2.5">
      <FormField label="Decision type" htmlFor="tk-dec-type">
        <Select id="tk-dec-type" aria-label="Decision type" value={type} onChange={(e) => setType(e.target.value)}>
          {DECISION_TYPES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
        </Select>
      </FormField>
      <FormField label={def ? def.partyLabel : 'Party'} htmlFor="tk-dec-party">
        <Input id="tk-dec-party" aria-label="Party" value={party} onChange={(e) => setParty(e.target.value)} />
      </FormField>
      {def && def.amount ? (
        <FormField label={def.amountLabel} htmlFor="tk-dec-amount">
          <Input id="tk-dec-amount" aria-label="Amount" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular-nums" />
        </FormField>
      ) : null}
      <FormField label="Note (optional)" htmlFor="tk-dec-note">
        <Textarea id="tk-dec-note" aria-label="Note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </FormField>
      <div className="flex items-center gap-2.5">
        <Button type="submit" variant="primary" size="sm" disabled={!valid}>
          Submit decision
        </Button>
        <span className="text-[11px] text-ink-muted" data-testid="tk-approver-hint">Needs: {approverHint(type, amount)}</span>
      </div>
    </form>
  );
}
