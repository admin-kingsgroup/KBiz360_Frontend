import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAudit } from '../api/monitor';
import { useCockpitFocus } from '../../../store/cockpitFocus';
import { isFocused } from '../utils/cockpitFocus';
import { actorName } from '../utils/monitor';
import { Button, FormField, Input } from '../../../shell/primitives';
import { DataTable } from '../../../shell/DataTable';

// ─── TK GROUP · FE · Audit Trail Explorer (container) ────────────────────────
// The append-only control_events log, filterable by branch / action / date — the
// "prove what happened" view. Read-only.
const AUDIT_COLS = [
  { key: 'ts', header: 'When', className: 'whitespace-nowrap', render: (e) => (e.ts ? String(e.ts).slice(0, 19).replace('T', ' ') : '—') },
  { key: 'action', header: 'Action' },
  { key: 'actor', header: 'By', render: (e) => actorName(e.actor) },
  { key: 'branch', header: 'Branch', render: (e) => e.branch || '—' },
  { key: 'reason', header: 'Reason', className: 'text-ink-muted', render: (e) => e.reason || '—' },
];

export function AuditTrail() {
  // Focus spotlight → the log is pre-filtered (and pinned) to that branch; the
  // free-text branch filter is only editable in the ALL view.
  const focus = useCockpitFocus();
  const focused = isFocused(focus) ? focus : null;
  const [branch, setBranch] = useState(focused || '');
  const [action, setAction] = useState('');
  const [applied, setApplied] = useState(() => (focused ? { branch: focused } : {}));
  useEffect(() => {
    setBranch(focused || '');
    setApplied((a) => { const { branch: _b, ...rest } = a; return focused ? { ...rest, branch: focused } : rest; });
  }, [focused]);
  const q = useQuery({ queryKey: ['tk', 'monitor', 'audit', applied], queryFn: () => getAudit(applied), staleTime: 15_000 });
  const rows = (q.data && q.data.items) || [];

  const apply = (e) => { e.preventDefault(); setApplied({ ...((focused || branch) ? { branch: focused || branch } : {}), ...(action ? { action } : {}) }); };

  return (
    <div className="grid gap-3">
      <form onSubmit={apply} aria-label="Filter audit trail" className="flex flex-wrap items-end gap-2">
        <FormField label="Branch" htmlFor="au-branch" className="w-[150px]">
          <Input id="au-branch" aria-label="Branch" placeholder="Branch (e.g. BOM)" value={branch} disabled={!!focused}
            title={focused ? 'Pinned to the spotlighted branch — clear the Focus to search all branches' : undefined}
            onChange={(e) => setBranch(e.target.value)} />
        </FormField>
        <FormField label="Action" htmlFor="au-action" className="w-[220px]">
          <Input id="au-action" aria-label="Action" placeholder="Action (e.g. approval.approve)" value={action} onChange={(e) => setAction(e.target.value)} />
        </FormField>
        <Button type="submit" variant="primary" size="sm">Filter</Button>
      </form>

      <div data-testid="tk-audit">
        <DataTable
          columns={AUDIT_COLS}
          rows={rows}
          getRowKey={(e, i) => e._id || i}
          loading={q.isLoading}
          isError={q.isError}
          emptyMessage="No control events match."
          searchable={false}
          showDensityToggle={false}
          zebra
        />
      </div>
    </div>
  );
}
