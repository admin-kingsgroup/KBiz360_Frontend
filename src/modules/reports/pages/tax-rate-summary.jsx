/* ════════════════════════════════════════════════════════════════════
   Reports ▸ GST Rate-Wise — LIVE from the double-entry engine.
   ════════════════════════════════════════════════════════════════════
   Tally keeps GST as PER-RATE ledgers ("Output CGST 9%", "Output SGST 9%",
   "GST 5%"…). This ERP keeps ONE set of CGST/SGST/IGST Output/Input heads per
   branch and stores the rate on the voucher (gstPct). This report re-splits the
   posted tax BY RATE (5/12/18…) so each row maps 1:1 to a Tally per-rate ledger:
   for an 18% supply → Tally "Output CGST 9%" / "Output SGST 9%" (CGST & SGST
   carry HALF the slab), or "Output IGST 18%" (inter-state, full rate).

   Amounts come straight from the posted journal (GET /accounting/tax-rate-summary),
   so every rate row foots to the tax-ledger balance — and the tie-out strip
   re-checks the Output/Input totals against the Tax Summary (Trial-Balance) path.
   Regime-aware: VAT (Africa) branches show a single VAT column.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { bc } from '../../../core/styles';
import { useTaxRateSummary } from '../../../core/useAccounting';
import { CONSOLIDATED_LABEL } from '../../../core/data';
import { exportToCSV } from '../../../core/business-logic';
import { ReportDateBar, resolveReportRange } from '../../../core/reportDateBar';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { ResponsiveGrid, Button, Badge, LoadingState, ErrorState } from '../../../shell/primitives';

const EMPTY_SECTION = { rows: [], total: { cgst: 0, sgst: 0, igst: 0, vat: 0, other: 0, taxable: 0, total: 0 } };

export function RPT_TaxRateSummary({ branch }) {
  const [range, setRange] = useState(() => ({ mode: 'all', ...resolveReportRange('all') }));
  const q = useTaxRateSummary(branch, { from: range.from || undefined, to: range.to || undefined });
  const d = q.data || null;
  const cfg = bc(branch);
  const cur = cfg.cur || '₹';
  const regime = d?.regime || (cfg.taxType === 'VAT' ? 'VAT' : 'GST');
  const isVat = regime === 'VAT';
  const brLabel = (!branch || branch === 'ALL') ? CONSOLIDATED_LABEL : (branch.code || branch);
  // Money (₹0 shows as a figure); em-dash only for a genuinely absent value (null).
  const f = (n) => cur + ' ' + Number(Math.round(n || 0)).toLocaleString((cur === '₹' || cur === '₨' || cur === 'Rs') ? 'en-IN' : 'en-US');
  const money = (n) => (n == null ? '—' : f(n));

  const output = d?.sections?.output || EMPTY_SECTION;
  const input = d?.sections?.input || EMPTY_SECTION;
  const svc2 = d?.sections?.svc2 || EMPTY_SECTION;
  const ctrl = d?.control || { reportOutput: 0, ledgerOutput: 0, outputDelta: 0, reportInput: 0, ledgerInput: 0, inputDelta: 0, tallies: true };
  const net = ctrl.reportOutput - ctrl.reportInput;

  const rateLabel = (r) => (r.rate == null ? 'Unspecified' : `${r.rate}%`);
  // The Tally per-rate ledger(s) each row lines up against (for the migration tie-out).
  const tallyMap = (r, section) => {
    if (r.rate == null) return '—';
    const dir = section === 'input' ? 'Input' : 'Output';
    const pre = section === 'svc2' ? 'SVC2 ' : '';
    const parts = [];
    if (isVat) { if (r.vat) parts.push(`${pre}VAT ${r.rate}%`); return parts.join(' · ') || '—'; }
    if (r.cgst) parts.push(`${pre}${dir} CGST ${r.halfRate}%`);
    if (r.sgst) parts.push(`${pre}${dir} SGST ${r.halfRate}%`);
    if (r.igst) parts.push(`${pre}${dir} IGST ${r.rate}%`);
    return parts.join(' · ') || '—';
  };

  // Columns: GST branches split CGST/SGST/IGST; VAT branches show a single VAT column.
  // An "Other" column (Output GST on Commission — near-always 0, only on migrated Tally
  // heads) is shown ONLY when a row carries it, so CGST+SGST+IGST always foot to Total.
  const cols = (section, sec) => {
    const taxCols = isVat
      ? [{ key: 'vat', header: 'VAT', num: true, render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + (r.vat || 0), 0)) }]
      : [
          { key: 'cgst', header: 'CGST', num: true, render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + (r.cgst || 0), 0)) },
          { key: 'sgst', header: 'SGST', num: true, render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + (r.sgst || 0), 0)) },
          { key: 'igst', header: 'IGST', num: true, render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + (r.igst || 0), 0)) },
        ];
    const otherCol = (sec.rows || []).some((r) => r.other)
      ? [{ key: 'other', header: 'Other', num: true, render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + (r.other || 0), 0)) }]
      : [];
    return [
      { key: 'rate', header: 'Rate', className: 'text-navy font-semibold', hideable: false, render: (r) => rateLabel(r), footerLabel: 'Total' },
      { key: 'taxable', header: 'Taxable Value', num: true, render: (r, v) => money(v), footer: (rs) => f(rs.reduce((s, r) => s + (r.taxable || 0), 0)) },
      ...taxCols,
      ...otherCol,
      { key: 'total', header: 'Total ' + (isVat ? 'VAT' : 'GST'), num: true, className: 'font-semibold', render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + (r.total || 0), 0)) },
      { key: 'voucherCount', header: '#Vch', num: true },
      { key: 'tally', header: 'Maps to (Tally ledger)', className: 'text-ink-muted text-[11px]', render: (r) => tallyMap(r, section) },
    ];
  };

  const Section = ({ title, sec, section }) => (
    <DataTable title={title} columns={cols(section, sec)} rows={sec.rows || []} loading={q.isLoading} isError={q.isError}
      getRowKey={(r) => (r.rate == null ? 'na' : r.rate)} dense showDensityToggle={false} className="mb-3.5"
      emptyMessage="No GST movement in this period." />
  );

  const kpis = [
    { l: 'Output ' + (isVat ? 'VAT' : 'GST'), v: f(ctrl.reportOutput), c: '#2563eb' },
    { l: 'Input ' + (isVat ? 'VAT' : 'GST'), v: f(ctrl.reportInput), c: '#d97706' },
    { l: 'Net ' + (net >= 0 ? 'Payable' : 'Refundable'), v: f(Math.abs(net)), c: net >= 0 ? '#dc2626' : '#16a34a' },
    ...(svc2.total.total ? [{ l: 'SVC2 Margin ' + (isVat ? 'VAT' : 'GST'), v: f(svc2.total.total), c: '#7F77DD' }] : []),
  ];

  // Flat CSV across every section (rate rows + Other/vat + the Tally-ledger mapping).
  const csvRow = (sec, r) => ({ section: sec, rate: rateLabel(r), taxable: r.taxable ?? '', cgst: r.cgst, sgst: r.sgst, igst: r.igst, vat: r.vat, other: r.other, total: r.total, tally: tallyMap(r, sec.toLowerCase()) });
  const exportRows = [
    ...output.rows.map((r) => csvRow('Output', r)),
    ...input.rows.map((r) => csvRow('Input', r)),
    ...svc2.rows.map((r) => csvRow('SVC2', r)),
  ];
  const csvHeaders = ['section', 'rate', 'taxable', 'cgst', 'sgst', 'igst', 'vat', 'other', 'total', 'tally'];

  return (
    <PageLayout
      title={`${isVat ? 'VAT' : 'GST'} Rate-Wise · ${brLabel}`}
      subtitle={`${regime}${d?.vatRate ? ' ' + d.vatRate + '%' : ''} · per-rate ${isVat ? 'VAT' : 'CGST/SGST/IGST'} · maps to Tally per-rate ledgers · ${cur}`}
      actions={<Button size="sm" variant="secondary" icon={Download} disabled={!exportRows.length} onClick={() => exportToCSV(exportRows, csvHeaders, `${isVat ? 'vat' : 'gst'}-rate-wise.csv`)}>CSV</Button>}
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

          {/* Tie-out strip — does the rate-wise breakdown foot to the tax-ledger balances? */}
          <div className="mb-4 flex flex-wrap items-center gap-2 rounded-brand border-l-4 px-3.5 py-3"
            style={{ background: ctrl.tallies ? '#e8f6ed' : '#FBEAEA', borderLeftColor: ctrl.tallies ? '#16a34a' : '#dc2626' }}>
            <Badge tone={ctrl.tallies ? 'success' : 'danger'} dot>{ctrl.tallies ? 'Ties to ledger' : 'Variance'}</Badge>
            <span className="text-[12px] text-navy">
              {ctrl.tallies
                ? `Every rate row foots to the ${isVat ? 'VAT' : 'CGST/SGST/IGST'} ledger balances.`
                : `Output Δ ${f(ctrl.outputDelta)} · Input Δ ${f(ctrl.inputDelta)} — a tax posting carries no rate or a head is unclassified.`}
            </span>
            <span className="ml-auto text-[11px] text-ink-muted">Ledger: Output {f(ctrl.ledgerOutput)} · Input {f(ctrl.ledgerInput)}</span>
          </div>

          <Section title={`Output ${isVat ? 'VAT' : 'GST'} by rate (on sales)`} sec={output} section="output" />
          <Section title={`Input ${isVat ? 'VAT' : 'GST'} by rate (on purchases)`} sec={input} section="input" />
          {svc2.rows.length > 0 && (
            <Section title={`SVC2 margin ${isVat ? 'VAT' : 'GST'} by rate (agency service-charge income)`} sec={svc2} section="svc2" />
          )}

          <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
            {isVat
              ? <>Each rate maps to the branch <b>VAT Output</b> / <b>VAT Input</b> ledger. </>
              : <>CGST &amp; SGST each carry half the slab, so an 18% supply maps to Tally's <b>Output CGST 9%</b> / <b>Output SGST 9%</b>; inter-state posts a single <b>IGST 18%</b> leg. </>}
            Taxable Value is derived from the tax and the rate (for travel this is the service-charge / margin base the tax was charged on, not the full invoice value).
            {' '}Postings with no rate on the voucher (e.g. some migrated data) appear under <b>Unspecified</b>.
          </p>
        </>
      )}
    </PageLayout>
  );
}

export default RPT_TaxRateSummary;
