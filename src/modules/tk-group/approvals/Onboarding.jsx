import React, { useCallback, useEffect, useState } from 'react';
import { submitDecision, getMyDecisions } from '../api/decisions';
import { typeLabel } from '../utils/inbox';
import { statusLabel } from '../utils/decisions';
import { PageSection, Badge, Button, FormField, Input, Select } from '../../../shell/primitives';
import { DataTable } from '../../../shell/DataTable';

// ─── TK GROUP CENTRAL · Onboarding (container) ───────────────────────────────
// Central onboarding of a new Client or Supplier, with the requested credit terms.
// It is filed as a counterparty decision (Farhan + Owner) — party masters are fully
// central, so a new party is never created ad-hoc in a branch. Nothing auto-creates
// the master; approval is the governance record and the master is set up after.
const statusTone = (s) => (s === 'rejected' ? 'danger' : s === 'pending' ? 'warning' : 'success');

const COLS = [
  { key: 'party', header: 'Party', render: (cr) => ((cr.payload && cr.payload.after) || {}).party || '—' },
  { key: 'note', header: 'Details', className: 'text-ink-muted', render: (cr) => ((cr.payload && cr.payload.after) || {}).note || typeLabel(cr.type) },
  { key: 'status', header: 'Status', render: (cr) => <Badge tone={statusTone(cr.status)} size="sm">{statusLabel(cr.status)}</Badge> },
];

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
    <div className="grid gap-4">
      <PageSection title="Onboard a party">
        {msg ? <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-1.5 text-xs text-success">{msg}</div> : null}
        <form onSubmit={submit} aria-label="Onboard a party" className="grid max-w-[480px] gap-2.5">
          <div className="flex gap-2.5">
            <FormField label="Party type" className="w-[130px]">
              <Select aria-label="Party type" value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="client">Client</option>
                <option value="supplier">Supplier</option>
              </Select>
            </FormField>
            <FormField label="Name" className="flex-1">
              <Input aria-label="Party name" value={name} onChange={(e) => setName(e.target.value)} />
            </FormField>
          </div>
          <div className="flex gap-2.5">
            <FormField label="GSTIN / Tax / Reg no. (optional)" className="flex-1">
              <Input aria-label="Tax id" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
            </FormField>
            <FormField label="Credit limit (optional)" className="w-[150px]">
              <Input aria-label="Credit limit" type="number" min="0" value={credit} onChange={(e) => setCredit(e.target.value)} className="tabular-nums" />
            </FormField>
          </div>
          <FormField label="Terms / note (optional)">
            <Input aria-label="Terms" value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="e.g. 30-day credit, PDC, advance" />
          </FormField>
          <Button type="submit" variant="primary" size="sm" disabled={!valid} className="justify-self-start">
            Submit onboarding
          </Button>
        </form>
      </PageSection>

      <DataTable
        title="My onboarding requests"
        columns={COLS}
        rows={items}
        getRowKey={(cr, i) => cr._id || `${i}`}
        emptyMessage="No onboarding requests yet."
        searchable={false}
        showDensityToggle={false}
        zebra
      />
    </div>
  );
}
