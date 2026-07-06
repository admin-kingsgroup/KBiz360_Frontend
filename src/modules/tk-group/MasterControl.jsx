import React, { useCallback, useEffect, useState } from 'react';
import { proposeGovernance, getPendingByType } from './api/governance';
import { MASTER_KINDS, masterKindLabel, isMasterValid } from './utils/governance';
import { waitingRoles } from './utils/changeRequests';
import { PageSection, Button, FormField, Input, Select, Textarea } from '../../shell/primitives';
import { DataTable } from '../../shell/DataTable';

// ─── TK GROUP · FE · Master / CoA control (container) ────────────────────────
// Raise a master / chart-of-accounts change (add / rename / deactivate a head, etc.).
// It's filed as a Farhan + Owner change-request; applying it to the master stays a
// deliberate step after approval (nothing auto-posts).
const COLS = [
  { key: 'kind', header: 'Kind', render: (cr) => masterKindLabel(((cr.payload && cr.payload.after) || {}).kind) },
  { key: 'target', header: 'Target', render: (cr) => ((cr.payload && cr.payload.after) || {}).target || '—' },
  { key: 'detail', header: 'Detail', className: 'text-ink-muted', render: (cr) => ((cr.payload && cr.payload.after) || {}).detail || '—' },
  { key: 'waiting', header: 'Waiting', render: (cr) => waitingRoles(cr).join(' → ') || 'ready' },
];

export function MasterControl() {
  const [pending, setPending] = useState([]);
  const [msg, setMsg] = useState('');
  const [kind, setKind] = useState('add_head');
  const [target, setTarget] = useState('');
  const [detail, setDetail] = useState('');
  const valid = isMasterValid({ kind, target });

  const load = useCallback(async () => { setPending(await getPendingByType('master')); }, []);
  useEffect(() => { load(); }, [load]);

  const submit = useCallback(async (e) => {
    e.preventDefault();
    if (!valid) return;
    setMsg('');
    try {
      await proposeGovernance('master', null, { kind, target: target.trim(), detail: detail.trim() });
      setMsg(`Master change "${masterKindLabel(kind)}: ${target.trim()}" submitted for Owner approval.`);
      await load();
    } catch (e2) { setMsg((e2 && e2.message) || 'Failed to submit.'); }
  }, [valid, kind, target, detail, load]);

  return (
    <div className="grid gap-4">
      <PageSection title="Raise a master change">
        {msg ? <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-1.5 text-xs text-success">{msg}</div> : null}
        <form onSubmit={submit} aria-label="Raise a master change" className="grid max-w-[460px] gap-2.5">
          <FormField label="Change kind">
            <Select aria-label="Change kind" value={kind} onChange={(e) => setKind(e.target.value)}>
              {MASTER_KINDS.map((k) => <option key={k.key} value={k.key}>{k.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Head / target">
            <Input aria-label="Head or target" placeholder="e.g. ledger name or code" value={target} onChange={(e) => setTarget(e.target.value)} />
          </FormField>
          <FormField label="Detail (optional)">
            <Textarea aria-label="Detail" rows={2} value={detail} onChange={(e) => setDetail(e.target.value)} />
          </FormField>
          <Button type="submit" variant="primary" size="sm" disabled={!valid} className="justify-self-start">
            Submit master change
          </Button>
        </form>
      </PageSection>

      <DataTable
        title="Pending master changes"
        columns={COLS}
        rows={pending}
        getRowKey={(cr, i) => cr._id || `${i}`}
        emptyMessage="No pending master changes."
        searchable={false}
        showDensityToggle={false}
        zebra
      />
    </div>
  );
}
