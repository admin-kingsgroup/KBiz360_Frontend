import React, { useCallback, useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { proposeGovernance, getPendingByType } from '../api/governance';
import { HR_KINDS, hrKindLabel, isHrValid } from '../utils/hr';
import { waitingRoles } from '../utils/changeRequests';
import { PageSection, Button, FormField, Input, Select, Textarea } from '../../../shell/primitives';
import { DataTable } from '../../../shell/DataTable';

// ─── TK GROUP CENTRAL · HR Control (container) ───────────────────────────────
// Raise an HR governance item (new hire / salary revision / payroll release) centrally.
// Filed as a Farhan + Owner change-request; nothing is actioned in HR until approved
// (the approval is the governance record). Mirrors Master Control.
const DEFAULT_BRANCHES = ['', 'BOM', 'AMD', 'MHUB', 'NBO', 'DAR', 'FBM'];

const COLS = [
  { key: 'kind', header: 'Item', render: (cr) => hrKindLabel(((cr.payload && cr.payload.after) || {}).kind) },
  { key: 'subject', header: 'Employee / role', render: (cr) => ((cr.payload && cr.payload.after) || {}).subject || '—' },
  { key: 'branch', header: 'Branch', render: (cr) => ((cr.payload && cr.payload.after) || {}).branch || cr.branch || '—' },
  { key: 'waiting', header: 'Waiting', render: (cr) => waitingRoles(cr).join(' → ') || 'ready' },
];

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
    <div className="grid gap-4">
      <PageSection
        title="Raise an HR request"
        subtitle="Filed as a Farhan + Owner change-request — nothing is actioned until approved."
        icon={UserPlus}
        className="max-w-2xl"
        bodyClassName="bg-surface-alt/60"
      >
        {msg ? <div role="status" className="mb-3 rounded-md bg-success-soft px-3 py-1.5 text-xs text-success">{msg}</div> : null}
        <form onSubmit={submit} aria-label="Raise an HR request" className="grid gap-3">
          <div className="flex gap-3">
            <FormField label="HR item" className="flex-1">
              <Select aria-label="HR item" value={kind} onChange={(e) => setKind(e.target.value)}>
                {HR_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
              </Select>
            </FormField>
            <FormField label="Branch (optional)" className="w-[130px]">
              <Select aria-label="Branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
                {branches.map((b) => <option key={b || 'none'} value={b}>{b || '—'}</option>)}
              </Select>
            </FormField>
          </div>
          <FormField label="Employee / role">
            <Input aria-label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Ravi Kumar — Accountant" />
          </FormField>
          <FormField label="Detail (optional)">
            <Textarea aria-label="Detail" rows={2} value={detail} onChange={(e) => setDetail(e.target.value)} placeholder="e.g. CTC, effective date, payroll month" />
          </FormField>
          <Button type="submit" variant="primary" size="sm" disabled={!valid} className="justify-self-start">
            Submit HR request
          </Button>
        </form>
      </PageSection>

      <DataTable
        title="Pending HR requests"
        columns={COLS}
        rows={pending}
        getRowKey={(cr, i) => cr._id || `${i}`}
        emptyMessage="No pending HR requests."
        searchable={false}
        showDensityToggle={false}
        zebra
      />
    </div>
  );
}
