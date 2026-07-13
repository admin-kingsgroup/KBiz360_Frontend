import React, { useCallback, useEffect, useState } from 'react';
import { submitDecision, getMyDecisions } from '../api/decisions';
import { DecisionRequestForm } from '../DecisionRequestForm';
import { typeLabel } from '../utils/inbox';
import { statusLabel } from '../utils/decisions';
import { PageSection, Badge } from '../../../shell/primitives';
import { DataTable } from '../../../shell/DataTable';

// ─── TK GROUP · FE · decisions board (container) ─────────────────────────────
// A branch raises a decision and tracks their own requests + status. Farhan (and the
// Owner for large ones) act on them from the Approvals Inbox. Nothing auto-applies —
// approval is the governance record; updating the master stays a manual step.
const statusTone = (s) => (s === 'rejected' ? 'danger' : s === 'pending' ? 'warning' : 'success');

const COLS = [
  { key: 'type', header: 'Type', width: '25%', render: (cr) => typeLabel(cr.type) },
  { key: 'party', header: 'Party', width: '25%', render: (cr) => ((cr.payload && cr.payload.after) || {}).party || '—' },
  { key: 'amount', header: 'Amount', num: true, width: '25%', render: (cr) => { const a = ((cr.payload && cr.payload.after) || {}).amount; return a ? Number(a).toLocaleString() : '—'; } },
  { key: 'status', header: 'Status', width: '25%', render: (cr) => <Badge tone={statusTone(cr.status)} size="sm">{statusLabel(cr.status)}</Badge> },
];

export function DecisionsBoard() {
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try { setItems((await getMyDecisions()).items || []); }
    catch { setItems([]); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onSubmit = useCallback(async (form) => {
    setMsg('');
    try {
      await submitDecision(form);
      setMsg(`${typeLabel(form.type)} request for "${form.party}" submitted for approval.`);
      await load();
    } catch (e) {
      setMsg((e && e.message) || 'Failed to submit the decision.');
    }
  }, [load]);

  return (
    <div className="tk-decisions grid gap-4">
      {msg ? <div role="status" className="rounded-md bg-success-soft px-3 py-1.5 text-xs text-success">{msg}</div> : null}
      <DecisionRequestForm onSubmit={onSubmit} />

      <DataTable
        title="My decision requests"
        columns={COLS}
        rows={items}
        getRowKey={(cr, i) => cr._id || `${i}`}
        emptyMessage="No decision requests yet."
        searchable={false}
        showDensityToggle={false}
        zebra
      />
    </div>
  );
}
