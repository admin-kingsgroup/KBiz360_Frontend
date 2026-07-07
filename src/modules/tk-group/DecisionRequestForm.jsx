import React, { useState } from 'react';
import { Scale, CreditCard, Wallet, UserPlus, TrendingUp, ChevronDown } from 'lucide-react';
import { DECISION_TYPES, decisionTypeDef, approverHint, isDecisionValid } from './utils/decisions';
import { Button, FormField, Input, Select, Textarea, PageSection, cn } from '../../shell/primitives';

// ─── TK GROUP · FE · raise-a-decision form (presentational) ───────────────────
// A branch raises a credit / funds / counterparty decision. Calls onSubmit({type,
// party, amount, note}); the container files it. Shows who will need to sign so the
// proposer knows when the Owner gets pulled in.
const TYPE_ICON = { credit_limit: CreditCard, funds_release: Wallet, counterparty: UserPlus, investment: TrendingUp };
export function DecisionRequestForm({ onSubmit }) {
  const [type, setType] = useState('credit_limit');
  const [party, setParty] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const def = decisionTypeDef(type);
  const valid = isDecisionValid({ type, party, amount });
  const hint = approverHint(type, amount);
  const hasAmount = !!(def && def.amount);
  const TypeIcon = TYPE_ICON[type] || CreditCard;

  const submit = (e) => {
    e.preventDefault();
    if (valid && onSubmit) onSubmit({ type, party: party.trim(), amount: Number(amount) || 0, note: note.trim() });
  };

  return (
    <PageSection title="Raise a decision" subtitle="Credit limit, funds release or counterparty onboarding" icon={Scale} className="max-w-[720px]">
      <form onSubmit={submit} aria-label="Raise a decision" className="grid gap-3">
        <div className="grid gap-3 tablet:grid-cols-2">
          <FormField label="Decision type" htmlFor="tk-dec-type">
            <div className="relative">
              <TypeIcon size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-gold-dark" />
              <Select
                id="tk-dec-type"
                aria-label="Decision type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="appearance-none pl-8 pr-8 font-semibold"
              >
                {DECISION_TYPES.map((d) => <option key={d.key} value={d.key}>{d.label}</option>)}
              </Select>
              <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
            </div>
          </FormField>
          <FormField label={def ? def.partyLabel : 'Party'} htmlFor="tk-dec-party">
            <Input id="tk-dec-party" aria-label="Party" value={party} onChange={(e) => setParty(e.target.value)} />
          </FormField>
        </div>
        <div className="grid gap-3 tablet:grid-cols-2">
          {hasAmount && (
            <FormField label={def.amountLabel} htmlFor="tk-dec-amount">
              <Input id="tk-dec-amount" aria-label="Amount" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular-nums" />
            </FormField>
          )}
          <FormField label="Note (optional)" htmlFor="tk-dec-note" className={cn(!hasAmount && 'tablet:col-span-2')}>
            <Textarea id="tk-dec-note" aria-label="Note" rows={hasAmount ? 1 : 2} value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-surface-border bg-surface-alt px-3 py-2.5">
          <span
            data-testid="tk-approver-hint"
            className={cn('inline-flex items-center gap-1.5 text-xs font-semibold', hint === 'Farhan + Owner' ? 'text-warning' : 'text-info')}
          >
            Needs: {hint}
          </span>
          <Button type="submit" variant="accent" size="sm" disabled={!valid}>
            Submit decision
          </Button>
        </div>
      </form>
    </PageSection>
  );
}
