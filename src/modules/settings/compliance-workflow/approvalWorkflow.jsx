/* ════════════════════════════════════════════════════════════════════
   Settings ▸ Approval Workflow — maker–checker rules (live).
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. Live rules from useApprovalRules; KPIs →
   ResponsiveGrid; rules → DataTable (sort/sticky/export/mobile scroll).
   "Add Rule" persists to /api/approval-rules — the screen was read-only
   before, so the approval matrix could never be configured from the app.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus } from 'lucide-react';
import { useApprovalRules } from '../../../core/useReference';
import { useMasterMutations } from '../../../core/useMasters';
import { toast } from '../../../core/ux/toast';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { ResponsiveGrid, StatusPill, Button, Modal, FormField, Input, Select } from '../../../shell/primitives';

const VOUCHER_TYPES = ['Payment', 'Receipt', 'Journal', 'Contra', 'Sales', 'Purchase', 'Purchase-Expense', 'Debit Note', 'Refund', 'Reissue'];
const BLANK_RULE = { voucherType: 'Payment', condition: '', approver: '', backup: '', sla: '24h' };

export function ApprovalWorkflow({ setRoute }) {
  const rulesQ = useApprovalRules();
  const RULES = rulesQ.data || [];
  const qc = useQueryClient();
  const { create } = useMasterMutations('approval-rules');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(BLANK_RULE);
  const saveRule = () => {
    if (create.isPending) return;
    if (!form.approver.trim()) { toast('Primary approver is required', 'error'); return; }
    const n = RULES.length + 1;
    create.mutate({ ...form, ruleId: `AR-${String(n).padStart(3, '0')}`, active: true }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: ['ref', 'approval-rules'] }); toast('Approval rule added'); setModal(false); setForm(BLANK_RULE); },
      onError: (e) => toast('Could not save — ' + (e?.message || 'unknown error'), 'error'),
    });
  };
  const active = RULES.filter((r) => r.active).length;
  const KPIS = [
    { l: 'Active Rules', v: active, c: '#27500A' },
    { l: 'Voucher Types', v: new Set(RULES.map((r) => r.voucherType)).size, c: '#185FA5' },
    { l: 'Approvers', v: new Set(RULES.map((r) => r.approver)).size, c: '#854F0B' },
    { l: 'Avg SLA', v: RULES.length ? `${Math.round(RULES.reduce((s, r) => s + (parseInt(r.sla, 10) || 0), 0) / RULES.length)}h` : '—', c: '#A32D2D' },
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
      actions={
        <>
          <Button size="sm" variant="secondary" icon={ClipboardList} onClick={() => setRoute && setRoute('/approvals')}>Pending Approvals Queue</Button>
          <Button size="sm" variant="accent" icon={Plus} onClick={() => setModal(true)}>Add Rule</Button>
        </>
      }
    >
      <ResponsiveGrid cols={4} gap="md" className="mb-4">
        {KPIS.map((k, i) => (
          <div key={i} className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3.5 py-3" style={{ borderTopColor: k.c }}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">{k.l}</p>
            <p className="mt-1 text-lg font-extrabold tabular-nums tablet:text-xl" style={{ color: k.c }}>{k.v}</p>
          </div>
        ))}
      </ResponsiveGrid>
      <DataTable columns={columns} rows={RULES} loading={rulesQ.isLoading} isError={rulesQ.isError} getRowKey={(r) => r.id} dense exportName="approval-rules" printTitle="Approval Workflow" emptyMessage="No approval rules configured." />

      {modal && (
        <Modal title="Add Approval Rule" onClose={() => setModal(false)} maxWidth={520}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setModal(false)}>Cancel</Button>
              <Button variant="accent" size="sm" disabled={create.isPending} onClick={saveRule}>💾 Save Rule</Button>
            </>
          }>
          <div className="grid gap-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Voucher type">
                <Select value={form.voucherType} onChange={(e) => setForm((s) => ({ ...s, voucherType: e.target.value }))}>
                  {VOUCHER_TYPES.map((t) => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="SLA"><Input value={form.sla} onChange={(e) => setForm((s) => ({ ...s, sla: e.target.value }))} placeholder="e.g. 24h" /></FormField>
            </div>
            <FormField label="Condition / trigger"><Input value={form.condition} onChange={(e) => setForm((s) => ({ ...s, condition: e.target.value }))} placeholder="e.g. Amount > ₹50,000" /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Primary approver" required><Input value={form.approver} onChange={(e) => setForm((s) => ({ ...s, approver: e.target.value }))} placeholder="Role or person" /></FormField>
              <FormField label="Backup"><Input value={form.backup} onChange={(e) => setForm((s) => ({ ...s, backup: e.target.value }))} /></FormField>
            </div>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
}

export default ApprovalWorkflow;
