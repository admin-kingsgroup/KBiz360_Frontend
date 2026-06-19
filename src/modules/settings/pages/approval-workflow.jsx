/* ════════════════════════════════════════════════════════════════════
   Settings ▸ Approval Workflow — maker–checker rules (live).
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. Live rules from useApprovalRules; KPIs →
   ResponsiveGrid; rules → DataTable (sort/sticky/export/mobile scroll).
   ──────────────────────────────────────────────────────────────────── */

import React from 'react';
import { ClipboardList } from 'lucide-react';
import { useApprovalRules } from '../../../core/useReference';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { ResponsiveGrid, StatusPill, Button } from '../../../shell/primitives';

export function ApprovalWorkflow({ setRoute }) {
  const RULES = useApprovalRules().data || [];
  const active = RULES.filter((r) => r.active).length;
  const KPIS = [
    { l: 'Active Rules', v: active, c: '#27500A' },
    { l: 'Voucher Types', v: new Set(RULES.map((r) => r.voucherType)).size, c: '#185FA5' },
    { l: 'Approvers', v: new Set(RULES.map((r) => r.approver)).size, c: '#854F0B' },
    { l: 'Avg SLA', v: '16h', c: '#A32D2D' },
  ];
  const columns = [
    { key: 'id', header: 'Rule ID', className: 'font-mono text-[10px] text-[#185FA5]', hideable: false },
    { key: 'voucherType', header: 'Voucher Type', className: 'font-semibold text-navy' },
    { key: 'condition', header: 'Condition / Trigger', className: 'text-role-hr' },
    { key: 'approver', header: 'Primary Approver', className: 'font-semibold text-[#185FA5]' },
    { key: 'backup', header: 'Backup', className: 'text-ink-muted' },
    { key: 'sla', header: 'SLA', align: 'center', className: 'font-semibold text-[#854F0B]' },
    { key: 'active', header: 'Status', align: 'center', render: (r, v) => <StatusPill tone={v ? 'success' : 'neutral'} size="sm">{v ? 'Active' : 'Inactive'}</StatusPill> },
  ];

  return (
    <PageLayout
      title="Approval Workflow Configuration"
      subtitle="Maker–Checker rules · Threshold-based approval routing · Segregation of duties"
      actions={<Button size="sm" variant="secondary" icon={ClipboardList} onClick={() => setRoute && setRoute('/approvals')}>Pending Approvals Queue</Button>}
    >
      <ResponsiveGrid cols={4} gap="md" className="mb-4">
        {KPIS.map((k, i) => (
          <div key={i} className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3.5 py-3" style={{ borderTopColor: k.c }}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">{k.l}</p>
            <p className="mt-1 text-lg font-extrabold tabular-nums tablet:text-xl" style={{ color: k.c }}>{k.v}</p>
          </div>
        ))}
      </ResponsiveGrid>
      <DataTable columns={columns} rows={RULES} getRowKey={(r) => r.id} dense exportName="approval-rules" printTitle="Approval Workflow" emptyMessage="No approval rules configured." />
    </PageLayout>
  );
}

export default ApprovalWorkflow;
