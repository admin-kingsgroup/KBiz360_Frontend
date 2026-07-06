import React, { useCallback, useEffect, useState } from 'react';
import { proposeGovernance, getPendingByType } from './api/governance';
import { TARGET_METRICS, metricLabel, isValidPeriod, isTargetValid } from './utils/governance';
import { waitingRoles } from './utils/changeRequests';
import { PageSection, Button, FormField, Input, Select } from '../../shell/primitives';
import { DataTable } from '../../shell/DataTable';

// ─── TK GROUP · FE · Targets & Budgets governance (container) ────────────────
// Propose a branch target / budget for a period; it's filed as a Farhan + Owner
// change-request. Nothing auto-applies — approval is the governance record.
const DEFAULT_BRANCHES = ['ALL', 'BOM', 'AMD', 'BOMMB', 'NBO', 'DAR', 'FBM'];

const COLS = [
  { key: 'branch', header: 'Branch', render: (cr) => ((cr.payload && cr.payload.after) || {}).branch || cr.branch || '—' },
  { key: 'period', header: 'Period', num: true, render: (cr) => ((cr.payload && cr.payload.after) || {}).period || '—' },
  { key: 'metric', header: 'Metric', render: (cr) => metricLabel(((cr.payload && cr.payload.after) || {}).metric) },
  { key: 'amount', header: 'Amount', num: true, render: (cr) => { const a = ((cr.payload && cr.payload.after) || {}).amount; return a ? Number(a).toLocaleString() : '—'; } },
  { key: 'waiting', header: 'Waiting', render: (cr) => waitingRoles(cr).join(' → ') || 'ready' },
];

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
    <div className="grid gap-4">
      <PageSection title="Propose a target or budget">
        {msg ? <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-1.5 text-xs text-success">{msg}</div> : null}
        <form onSubmit={submit} aria-label="Propose a target or budget" className="grid max-w-[460px] gap-2.5">
          <div className="flex gap-2.5">
            <FormField label="Branch" className="flex-1">
              <Select aria-label="Branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
                {branches.map((b) => <option key={b} value={b}>{b === 'ALL' ? 'ALL (group)' : b}</option>)}
              </Select>
            </FormField>
            <FormField label="Period" className="w-[110px]">
              <Input aria-label="Period (YYYY-MM)" placeholder="YYYY-MM" value={period} onChange={(e) => setPeriod(e.target.value)} />
            </FormField>
          </div>
          <div className="flex gap-2.5">
            <FormField label="Metric" className="flex-1">
              <Select aria-label="Metric" value={metric} onChange={(e) => setMetric(e.target.value)}>
                {TARGET_METRICS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </Select>
            </FormField>
            <FormField label="Amount" className="flex-1">
              <Input aria-label="Amount" type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular-nums" />
            </FormField>
          </div>
          <FormField label="Note (optional)">
            <Input aria-label="Note" value={note} onChange={(e) => setNote(e.target.value)} />
          </FormField>
          <Button type="submit" variant="primary" size="sm" disabled={!valid} className="justify-self-start">
            Submit target
          </Button>
        </form>
      </PageSection>

      <DataTable
        title="Pending target/budget proposals"
        columns={COLS}
        rows={pending}
        getRowKey={(cr, i) => cr._id || `${i}`}
        emptyMessage="No pending proposals."
        searchable={false}
        showDensityToggle={false}
        zebra
      />
    </div>
  );
}
