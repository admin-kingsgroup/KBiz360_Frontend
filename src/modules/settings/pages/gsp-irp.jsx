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

// No live GSP/IRP integration is wired to a backend yet, so stats, failures and config
// start EMPTY rather than showing fabricated e-invoice metrics. Populate from an /api
// e-invoice endpoint once the GSP integration exists.
const STATS = [];
const FAILURES = [];
const CONFIG = [];

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
      actions={<StatusPill tone="neutral" dot>Not configured</StatusPill>}
    >
      {STATS.length === 0 && CONFIG.length === 0 && (
        <div className="mb-4 rounded-brand border border-dashed border-surface-border bg-surface px-4 py-8 text-center text-[11px] text-ink-muted">
          No GSP / IRP integration is connected yet. Once a GST Suvidha Provider is configured, e-invoice stats, configuration and failures appear here.
        </div>
      )}

      {STATS.length > 0 && (
        <ResponsiveGrid cols={4} gap="md" className="mb-4">
          {STATS.map((s, i) => (
            <div key={i} className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3.5 py-3" style={{ borderTopColor: s.c }}>
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">{s.label}</p>
              <p className="mt-1 text-lg font-extrabold tablet:text-xl" style={{ color: s.c }}>{s.value}</p>
              <p className="text-[10px] text-ink-muted">{s.sub}</p>
            </div>
          ))}
        </ResponsiveGrid>
      )}

      {CONFIG.length > 0 && (
        <PageSection title="Configuration" className="mb-4">
          <ResponsiveGrid cols={2} gap="md">
            {CONFIG.map(([l, v]) => (
              <div key={l}><p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">{l}</p><p className={`mt-0.5 text-[13px] font-semibold ${l === 'API Endpoint' ? 'font-mono text-[11px] text-[#185FA5]' : 'text-navy'}`}>{v}</p></div>
            ))}
          </ResponsiveGrid>
        </PageSection>
      )}

      {FAILURES.length > 0 && (
        <DataTable title="Recent Failures — Review & Retry" columns={columns} rows={FAILURES} getRowKey={(r) => r.invoice} dense exportName="gsp-failures" emptyMessage="No recent failures." />
      )}
    </PageLayout>
  );
}

export default GspIrpSettings;
