import React, { useState } from 'react';
import { isValidPeriod, statusLabel } from './utils/periodLocks';
import { Button, FormField, Input, Select } from '../../shell/primitives';
import { DataTable } from '../../shell/DataTable';

// ─── TK GROUP · FE · period-lock panel (presentational) ──────────────────────
// Lists the current locks and offers a small "propose a lock" form. Submitting
// calls onPropose({branch, period, status, reason}) — the container turns that into
// a Farhan + Owner change-request. A branch of "ALL" is a group-wide lock.
const LOCK_COLS = [
  { key: 'branch', header: 'Branch' },
  { key: 'period', header: 'Period', className: 'tabular-nums' },
  { key: 'status', header: 'Status', render: (r) => statusLabel(r.status) },
  { key: 'reason', header: 'Reason', render: (r) => r.reason || '—' },
];

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
    <div className="grid gap-3.5">
      <DataTable
        columns={LOCK_COLS}
        rows={rows}
        getRowKey={(r) => `${r.branch}-${r.period}`}
        emptyMessage="No period locks."
        searchable={false}
        showDensityToggle={false}
        zebra
      />

      <form onSubmit={submit} aria-label="Propose a period lock" className="flex flex-wrap items-end gap-2">
        <FormField label="Branch" htmlFor="pl-branch">
          <Select id="pl-branch" aria-label="Branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
            {branches.map((b) => <option key={b} value={b}>{b === 'ALL' ? 'ALL (group-wide)' : b}</option>)}
          </Select>
        </FormField>
        <FormField label="Period (YYYY-MM)" htmlFor="pl-period" className="w-[110px]">
          <Input id="pl-period" aria-label="Period (YYYY-MM)" placeholder="YYYY-MM" value={period} onChange={(e) => setPeriod(e.target.value)} />
        </FormField>
        <FormField label="Lock status" htmlFor="pl-status">
          <Select id="pl-status" aria-label="Lock status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="hard">Hard (blocked)</option>
            <option value="soft">Soft (warn)</option>
            <option value="open">Open (unlock)</option>
          </Select>
        </FormField>
        <FormField label="Reason" htmlFor="pl-reason" className="flex-1 min-w-[140px]">
          <Input id="pl-reason" aria-label="Reason" placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormField>
        <Button type="submit" variant="success" size="sm" disabled={!valid}>
          Propose lock
        </Button>
      </form>
    </div>
  );
}
