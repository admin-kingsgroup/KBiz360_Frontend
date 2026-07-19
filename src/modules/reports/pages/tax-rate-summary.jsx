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

   Consolidated (ALL) scope renders each branch SEPARATELY in its own currency and
   its own regime (India GST vs Africa VAT), from the `byBranch` split — tax is
   NEVER summed across branch currencies.
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
const EMPTY_CTRL = { reportOutput: 0, ledgerOutput: 0, outputDelta: 0, reportInput: 0, ledgerInput: 0, inputDelta: 0, tallies: true };

const rateLabelOf = (r) => (r.rate == null ? 'Unspecified' : `${r.rate}%`);
// The Tally per-rate ledger(s) each row lines up against (for the migration tie-out).
const tallyMapOf = (r, section, isVat) => {
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

export function RPT_TaxRateSummary({ branch }) {
  const [range, setRange] = useState(() => ({ mode: 'all', ...resolveReportRange('all') }));
  const q = useTaxRateSummary(branch, { from: range.from || undefined, to: range.to || undefined });
  const d = q.data || null;
  const isAll = !branch || branch === 'ALL';
  const brLabel = isAll ? CONSOLIDATED_LABEL : (branch.code || branch);
  const topRegime = d?.regime || (bc(branch).taxType === 'VAT' ? 'VAT' : 'GST');
  const topIsVat = topRegime === 'VAT';

  // One branch's (or the single-branch) rate-wise report, rendered in THAT branch's own
  // currency + regime. `slice` is a d.byBranch entry in ALL, or the merged `d` single-branch.
  const RateReport = ({ slice, cur, regime, heading }) => {
    const isVat = regime === 'VAT';
    const f = (n) => cur + ' ' + Number(Math.round(n || 0)).toLocaleString((cur === '₹' || cur === '₨' || cur === 'Rs') ? 'en-IN' : 'en-US');
    const money = (n) => (n == null ? '—' : f(n));
    const output = slice?.sections?.output || EMPTY_SECTION;
    const input = slice?.sections?.input || EMPTY_SECTION;
    const svc2 = slice?.sections?.svc2 || EMPTY_SECTION;
    const ctrl = slice?.control || EMPTY_CTRL;
    const net = ctrl.reportOutput - ctrl.reportInput;

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
        { key: 'rate', header: 'Rate', className: 'text-navy font-semibold', hideable: false, render: (r) => rateLabelOf(r), footerLabel: 'Total' },
        { key: 'taxable', header: 'Taxable Value', num: true, render: (r, v) => money(v), footer: (rs) => f(rs.reduce((s, r) => s + (r.taxable || 0), 0)) },
        ...taxCols,
        ...otherCol,
        { key: 'total', header: 'Total ' + (isVat ? 'VAT' : 'GST'), num: true, className: 'font-semibold', render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + (r.total || 0), 0)) },
        { key: 'voucherCount', header: '#Vch', num: true },
        { key: 'tally', header: 'Maps to (Tally ledger)', className: 'text-ink-muted text-[11px]', render: (r) => tallyMapOf(r, section, isVat) },
      ];
    };

    const Section = ({ title, sec, section }) => (
      <DataTable title={title} columns={cols(section, sec)} rows={sec.rows || []}
        getRowKey={(r) => (r.rate == null ? 'na' : r.rate)} dense showDensityToggle={false} className="mb-3.5"
        emptyMessage={`No ${isVat ? 'VAT' : 'GST'} movement in this period.`} />
    );

    const kpis = [
      { l: 'Output ' + (isVat ? 'VAT' : 'GST'), v: f(ctrl.reportOutput), c: '#2563eb' },
      { l: 'Input ' + (isVat ? 'VAT' : 'GST'), v: f(ctrl.reportInput), c: '#d97706' },
      { l: 'Net ' + (net >= 0 ? 'Payable' : 'Refundable'), v: f(Math.abs(net)), c: net >= 0 ? '#dc2626' : '#16a34a' },
      ...(svc2.total.total ? [{ l: 'SVC2 Margin ' + (isVat ? 'VAT' : 'GST'), v: f(svc2.total.total), c: '#7F77DD' }] : []),
    ];

    return (
      <div style={{ marginBottom: heading ? 22 : 0 }}>
        {heading && (
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '2px 2px 12px', borderBottom: '2px solid #d4a437', paddingBottom: 4 }}>
            <span style={{ fontWeight: 800, fontSize: 14, color: '#0d1326' }}>{heading}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#9A9A9A' }}>· {cur} · {regime}</span>
          </div>
        )}
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
      </div>
    );
  };

  // Flat CSV across every section (branch-prefixed in ALL scope so ₹ and $ never mix in one column).
  const csvRow = (sec, r, brc, isVat) => ({ branch: brc || '', section: sec, rate: rateLabelOf(r), taxable: r.taxable ?? '', cgst: r.cgst, sgst: r.sgst, igst: r.igst, vat: r.vat, other: r.other, total: r.total, tally: tallyMapOf(r, sec.toLowerCase(), isVat) });
  const rowsOf = (slice, brc) => {
    const isVat = (slice?.regime || topRegime) === 'VAT';
    return [
      ...((slice?.sections?.output?.rows) || []).map((r) => csvRow('Output', r, brc, isVat)),
      ...((slice?.sections?.input?.rows) || []).map((r) => csvRow('Input', r, brc, isVat)),
      ...((slice?.sections?.svc2?.rows) || []).map((r) => csvRow('SVC2', r, brc, isVat)),
    ];
  };
  const exportRows = (isAll && Array.isArray(d?.byBranch))
    ? d.byBranch.flatMap((b) => rowsOf(b, b.branch))
    : rowsOf(d, isAll ? '' : brLabel);
  const csvHeaders = ['branch', 'section', 'rate', 'taxable', 'cgst', 'sgst', 'igst', 'vat', 'other', 'total', 'tally'];

  return (
    <PageLayout
      title={`${topIsVat ? 'VAT' : 'GST'} Rate-Wise · ${brLabel}`}
      subtitle={isAll
        ? `each branch in its own currency & regime · maps to Tally per-rate ledgers · no cross-currency total`
        : `${topRegime}${d?.vatRate ? ' ' + d.vatRate + '%' : ''} · per-rate ${topIsVat ? 'VAT' : 'CGST/SGST/IGST'} · maps to Tally per-rate ledgers · ${bc(branch).cur || '₹'}`}
      actions={<Button size="sm" variant="secondary" icon={Download} disabled={!exportRows.length} onClick={() => exportToCSV(exportRows, csvHeaders, `${topIsVat ? 'vat' : 'gst'}-rate-wise.csv`)}>CSV</Button>}
      filters={<ReportDateBar value={range} onChange={setRange} branch={branch} />}
    >
      {q.isLoading && <LoadingState />}
      {q.isError && <ErrorState message={`${q.error?.message || 'Failed to load'} — is the backend running and are you logged in?`} onRetry={q.refetch} />}

      {!q.isLoading && !q.isError && (
        (isAll && Array.isArray(d?.byBranch))
          ? (d.byBranch.length === 0
              ? <div className="rounded-brand border border-surface-border bg-surface px-4 py-6 text-center text-ink-muted">No {topIsVat ? 'VAT' : 'GST'} movement in any branch for this period.</div>
              : d.byBranch.map((b) => (b._error
                  ? <div key={b.branch} className="mb-4 rounded-brand border-l-4 border-danger bg-[#FBEAEA] px-3.5 py-3 text-[12px] text-danger">⚠ Couldn't load {b.branch || 'this branch'} — {b._error}</div>
                  : <RateReport key={b.branch} slice={b} cur={bc({ code: b.branch }).cur} regime={b.regime || 'GST'} heading={b.branch} />)))
          : <>
              <RateReport slice={d} cur={bc(branch).cur || '₹'} regime={topRegime} heading={null} />
              <p className="mt-2 text-[11px] leading-relaxed text-ink-muted">
                {topIsVat
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
