/* ════════════════════════════════════════════════════════════════════
   Settings ▸ GSP / IRP E-Invoice Integration.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. Stats + config + recent failures preserved;
   KPIs → ResponsiveGrid, config → PageSection, failures → DataTable.
   ──────────────────────────────────────────────────────────────────── */

import React from 'react';
import { fmt } from '../../../core/format';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { ResponsiveGrid, PageSection, StatusPill, Button } from '../../../shell/primitives';

const STATS = [
  { label: 'E-Invoices Generated (May 2026)', value: '1,847', sub: 'Out of 1,924 eligible', c: '#185FA5' },
  { label: 'Success Rate', value: '96.0%', sub: '77 failures · review needed', c: '#27500A' },
  { label: 'Avg Generation Time', value: '1.8 sec', sub: 'GSP latency', c: '#854F0B' },
  { label: 'IRN Cancellations', value: '12', sub: 'Within 24 hours · valid', c: '#A32D2D' },
];
const FAILURES = [
  { invoice: 'INV-BOM-2026-1842', date: '2026-05-18', amount: 285000, error: 'Recipient GSTIN inactive', action: 'Update GSTIN' },
  { invoice: 'INV-BOM-2026-1856', date: '2026-05-18', amount: 48000, error: 'HSN code 998551 needs 6-digit', action: 'Edit & retry' },
  { invoice: 'INV-AMD-2026-0498', date: '2026-05-19', amount: 18500, error: 'Place of supply mismatch', action: 'Correct POS' },
  { invoice: 'INV-BOM-2026-1898', date: '2026-05-19', amount: 125000, error: 'Item rate exceeds 2 decimal', action: 'Round to 2dp' },
];
const CONFIG = [
  ['GSP Provider', 'TaxClue Tax Solutions'], ['API Endpoint', 'https://api.taxclue.in/v1.03/invoice'],
  ['Auto-Generate', '✓ On invoice save (B2B & Export)'], ['Threshold', 'All B2B invoices (turnover > ₹5 cr)'],
];

export function GspIrpSettings() {
  const columns = [
    { key: 'invoice', header: 'Invoice', className: 'font-mono text-[10px] text-[#185FA5]', hideable: false },
    { key: 'date', header: 'Date', align: 'center', className: 'text-ink-muted' },
    { key: 'amount', header: 'Amount', num: true, render: (r, v) => `₹${fmt(v)}` },
    { key: 'error', header: 'Error', className: 'font-semibold text-maroon' },
    { key: 'action', header: 'Action Required', className: 'text-[#854F0B]' },
    { key: '__retry', header: 'Retry', align: 'center', sortable: false, exportable: false, render: () => <Button size="xs" variant="accent">Retry</Button> },
  ];

  return (
    <PageLayout
      title="GSP / IRP Direct E-Invoice Integration"
      subtitle="NIC IRP via GST Suvidha Provider · Bulk e-invoice generation · Auto-IRN & QR"
      actions={<StatusPill tone="success" dot>Connected — TaxClue GSP</StatusPill>}
    >
      <ResponsiveGrid cols={4} gap="md" className="mb-4">
        {STATS.map((s, i) => (
          <div key={i} className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3.5 py-3" style={{ borderTopColor: s.c }}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">{s.label}</p>
            <p className="mt-1 text-lg font-extrabold tablet:text-xl" style={{ color: s.c }}>{s.value}</p>
            <p className="text-[10px] text-ink-muted">{s.sub}</p>
          </div>
        ))}
      </ResponsiveGrid>

      <PageSection title="Configuration" className="mb-4">
        <ResponsiveGrid cols={2} gap="md">
          {CONFIG.map(([l, v]) => (
            <div key={l}><p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">{l}</p><p className={`mt-0.5 text-[13px] font-semibold ${l === 'API Endpoint' ? 'font-mono text-[11px] text-[#185FA5]' : 'text-navy'}`}>{v}</p></div>
          ))}
        </ResponsiveGrid>
      </PageSection>

      <DataTable title="Recent Failures — Review & Retry" columns={columns} rows={FAILURES} getRowKey={(r) => r.invoice} dense exportName="gsp-failures" emptyMessage="No recent failures." />
    </PageLayout>
  );
}

export default GspIrpSettings;
