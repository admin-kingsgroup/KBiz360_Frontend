/* ════════════════════════════════════════════════════════════════════
   Reports ▸ Tax Summary (GST / VAT) — LIVE from the double-entry engine.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. Regime-aware (GST vs VAT), all tax math
   unchanged (output/input/withholding/TCS, net payable/refundable). KPIs →
   ResponsiveGrid; the four ledger sections → titled DataTables; CSV export
   preserved. Uses PageLayout for the custom CSV action.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { bc } from '../../../core/styles';
import { useTaxSummary } from '../../../core/useAccounting';
import { CONSOLIDATED_LABEL } from '../../../core/data';
import { exportToCSV } from '../../../core/business-logic';
import { ReportDateBar, resolveReportRange } from '../../../core/reportDateBar';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { ResponsiveGrid, Button, LoadingState, ErrorState } from '../../../shell/primitives';

export function RPT_TaxSummary({ branch }) {
  const [range, setRange] = useState(() => ({ mode: 'all', ...resolveReportRange('all') }));
  const q = useTaxSummary(branch, { from: range.from || undefined, to: range.to || undefined });
  const d = q.data || null;
  const cfg = bc(branch);
  const cur = cfg.cur || '₹';
  const regime = d?.regime || (cfg.taxType === 'VAT' ? 'VAT' : 'GST');
  const isVat = regime === 'VAT';
  const f = (n) => cur + ' ' + Number(Math.round(n || 0)).toLocaleString((cur === '₹' || cur === '₨' || cur === 'Rs') ? 'en-IN' : 'en-US');
  const brLabel = (!branch || branch === 'ALL') ? CONSOLIDATED_LABEL : (branch.code || branch);

  const out = d?.output || { total: 0, lines: [] };
  const input = d?.input || { total: 0, lines: [] };
  const wh = d?.withholding || { payable: 0, receivable: 0, payableLines: [], receivableLines: [] };
  const tcs = d?.tcs || { payable: 0, receivable: 0 };
  const net = d?.netPayable ?? (out.total - input.total);

  const exportRows = [
    ...out.lines.map((l) => ({ section: 'Output Tax', ledger: l.ledger, amount: l.amount })),
    ...input.lines.map((l) => ({ section: 'Input Tax', ledger: l.ledger, amount: l.amount })),
    ...wh.payableLines.map((l) => ({ section: 'Withholding Payable', ledger: l.ledger, amount: l.amount })),
    ...wh.receivableLines.map((l) => ({ section: 'Withholding Receivable', ledger: l.ledger, amount: l.amount })),
  ];

  const kpis = [
    { l: 'Output ' + (isVat ? 'VAT' : 'GST'), v: f(out.total), c: '#2563eb' },
    { l: 'Input ' + (isVat ? 'VAT' : 'GST'), v: f(input.total), c: '#d97706' },
    { l: 'Net ' + (net >= 0 ? 'Payable' : 'Refundable'), v: f(Math.abs(net)), c: net >= 0 ? '#dc2626' : '#16a34a' },
    { l: (isVat ? 'WHT' : 'TDS') + ' Payable', v: f(wh.payable), c: '#2e323c' },
    { l: (isVat ? 'WHT' : 'TDS') + ' Receivable', v: f(wh.receivable), c: '#3fb7a3' },
    ...(!isVat ? [{ l: 'TCS Payable', v: f(tcs.payable), c: '#7F77DD' }] : []),
  ];

  const sectionCols = [
    { key: 'ledger', header: 'Ledger', className: 'text-navy', hideable: false },
    { key: 'amount', header: 'Amount', num: true, render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + (r.amount || 0), 0)) },
  ];
  const Section = ({ title, lines }) => (
    <DataTable title={title} columns={sectionCols} rows={lines || []} loading={q.isLoading} isError={q.isError} getRowKey={(r, i) => i} dense showDensityToggle={false} className="mb-3.5" emptyMessage="No movement in this period." />
  );

  return (
    <PageLayout
      title={`${isVat ? 'VAT Return' : 'GST Summary'} · ${brLabel}`}
      subtitle={`${regime}${d?.vatRate ? ' ' + d.vatRate + '%' : ''} · live from the double-entry engine · ${cur}`}
      actions={<Button size="sm" variant="secondary" icon={Download} disabled={!exportRows.length} onClick={() => exportToCSV(exportRows, ['section', 'ledger', 'amount'], 'tax-summary.csv')}>CSV</Button>}
      filters={<ReportDateBar value={range} onChange={setRange} branch={branch} />}
    >
      {q.isLoading && <LoadingState />}
      {q.isError && <ErrorState message={`${q.error?.message || 'Failed to load'} — is the backend running and are you logged in?`} onRetry={q.refetch} />}

      {!q.isLoading && !q.isError && (
        <>
          <ResponsiveGrid min="150px" gap="md" className="mb-4">
            {kpis.map((k, i) => (
              <div key={i} className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3.5 py-3" style={{ borderTopColor: k.c }}>
                <p className="text-[9px] font-bold uppercase tracking-wide" style={{ color: k.c }}>{k.l}</p>
                <p className="mt-1 text-lg font-extrabold tabular-nums text-navy">{k.v}</p>
              </div>
            ))}
          </ResponsiveGrid>

          <div className="mb-4 rounded-brand border-l-4 px-3.5 py-3" style={{ background: net >= 0 ? '#FBEAEA' : '#e8f6ed', borderLeftColor: net >= 0 ? '#dc2626' : '#16a34a' }}>
            <span className="text-[12.5px] font-bold text-navy">
              Net {isVat ? 'VAT' : 'GST'} {net >= 0 ? 'payable to' : 'refundable from'} the authority: {f(Math.abs(net))}
            </span>
            <span className="ml-2 text-[11px] text-ink-muted">= Output {f(out.total)} − Input {f(input.total)}</span>
          </div>

          <Section title={`Output ${isVat ? 'VAT' : 'GST'} (on sales)`} lines={out.lines} />
          <Section title={`Input ${isVat ? 'VAT' : 'GST'} (on purchases)`} lines={input.lines} />
          <Section title={`${isVat ? 'WHT' : 'TDS'} Payable (we withheld)`} lines={wh.payableLines} />
          <Section title={`${isVat ? 'WHT' : 'TDS'} Receivable (withheld from us)`} lines={wh.receivableLines} />
        </>
      )}
    </PageLayout>
  );
}

export default RPT_TaxSummary;
