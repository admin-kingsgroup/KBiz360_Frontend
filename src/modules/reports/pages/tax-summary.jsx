/* ════════════════════════════════════════════════════════════════════
   Reports ▸ Tax Summary (GST / VAT) — LIVE from the double-entry engine.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. Regime-aware (GST vs VAT), all tax math
   unchanged (output/input/withholding/TCS, net payable/refundable). KPIs →
   ResponsiveGrid; the four ledger sections → titled DataTables; CSV export
   preserved. Uses PageLayout for the custom CSV action.

   CONSOLIDATED (branch='ALL'): each branch renders as its OWN section in its
   OWN currency (GST ₹ vs VAT $) — never a blended cross-currency ₹ total. The
   report body is extracted into `renderBody(model)` and the per-scope numbers
   into `buildModel(slice, branch)`; single-branch builds one model from `d`
   (byte-for-byte the previous render), consolidated loops the BE `d.byBranch`
   slice ([{ branch, ...taxSummaryForThatBranch }]) and renders one section per
   branch in that branch's own currency. Falls through to the single render when
   `d.byBranch` is absent (guarded with Array.isArray).
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { bc } from '../../../core/styles';
import { useTaxSummary } from '../../../core/useAccounting';
import { CONSOLIDATED_LABEL, BRANCHES } from '../../../core/data';
import { exportToCSV } from '../../../core/business-logic';
import { ReportDateBar, resolveReportRange } from '../../../core/reportDateBar';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { ResponsiveGrid, Button, LoadingState, ErrorState } from '../../../shell/primitives';
import { openLedgerModal } from '../../../core/LedgerModalHost';

export function RPT_TaxSummary({ branch }) {
  const [range, setRange] = useState(() => ({ mode: 'all', ...resolveReportRange('all') }));
  const q = useTaxSummary(branch, { from: range.from || undefined, to: range.to || undefined });
  const d = q.data || null;

  // Consolidated = all-branches scope: render each branch as its own tax section in its
  // OWN currency (GST ₹ vs VAT $), never a blended single-currency total. Driven by the
  // BE `d.byBranch` slice ([{ branch, ...taxSummaryForThatBranch }]); a failed branch
  // arrives as { branch, _error }. Falls back to the single render when it's absent.
  const isAll = !branch || branch === 'ALL' || branch?.code === 'ALL';
  const byBranch = isAll && Array.isArray(d?.byBranch) ? d.byBranch : null;
  const showPerBranch = !!byBranch;
  // A byBranch slice carries a bare branch CODE; `bc` resolves on `.code`, so wrap it into
  // { code } to get that branch's OWN currency/regime (a bare string falls back to BOM/₹).
  const curOf = (code) => bc({ code }).cur || '₹';
  const branchLabel = (code) => { const b = BRANCHES.find((x) => x.code === code); return b ? `${b.code}${b.city ? ' ' + b.city : ''}` : (code || '—'); };

  // Each tax line is a real ledger → drill into its statement (→ voucher) via the
  // global ledger modal. Shared by every scope's section table.
  const drillLedger = (r) => r && r.ledger && openLedgerModal(r.ledger, { from: range.from || undefined, to: range.to || undefined });

  // ── Derive one scope's tax model (currency, regime, KPIs, sections) from its own slice
  //    `dd` and branch `br`. Money NEVER crosses scopes: f() formats in that scope's own
  //    currency (en-IN only for ₹, else en-US) and every total sums only its own lines.
  const buildModel = (dd, br) => {
    const cfg = bc(br);
    const cur = cfg.cur || '₹';
    const regime = dd?.regime || (cfg.taxType === 'VAT' ? 'VAT' : 'GST');
    const isVat = regime === 'VAT';
    const f = (n) => cur + ' ' + Number(Math.round(n || 0)).toLocaleString((cur === '₹' || cur === '₨' || cur === 'Rs') ? 'en-IN' : 'en-US');
    const out = dd?.output || { total: 0, lines: [] };
    const input = dd?.input || { total: 0, lines: [] };
    const wh = dd?.withholding || { payable: 0, receivable: 0, payableLines: [], receivableLines: [] };
    const tcs = dd?.tcs || { payable: 0, receivable: 0 };
    const net = dd?.netPayable ?? (out.total - input.total);
    const kpis = [
      { l: 'Output ' + (isVat ? 'VAT' : 'GST'), v: f(out.total), c: '#2563eb' },
      { l: 'Input ' + (isVat ? 'VAT' : 'GST'), v: f(input.total), c: '#d97706' },
      { l: 'Net ' + (net >= 0 ? 'Payable' : 'Refundable'), v: f(Math.abs(net)), c: net >= 0 ? '#dc2626' : '#16a34a' },
      { l: (isVat ? 'WHT' : 'TDS') + ' Payable', v: f(wh.payable), c: '#2e323c' },
      { l: (isVat ? 'WHT' : 'TDS') + ' Receivable', v: f(wh.receivable), c: '#3fb7a3' },
      ...(!isVat ? [{ l: 'TCS Payable', v: f(tcs.payable), c: '#7F77DD' }] : []),
    ];
    return { cfg, cur, regime, isVat, f, out, input, wh, tcs, net, kpis };
  };

  // ── One scope's KPIs + net banner + four ledger sections, in its own currency. Reused
  //    verbatim by the single-branch render and every consolidated per-branch section, so
  //    the card/row markup is identical across scopes; only the model (numbers + currency)
  //    changes. `q.isLoading`/`q.isError` are false here (rendered past the guard).
  const renderBody = (m) => {
    const { f, isVat, out, input, wh, net, kpis } = m;
    const sectionCols = [
      { key: 'ledger', header: 'Ledger', className: 'text-navy', hideable: false },
      { key: 'amount', header: 'Amount', num: true, render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + (r.amount || 0), 0)) },
    ];
    const Section = ({ title, lines }) => (
      <DataTable title={title} columns={sectionCols} rows={lines || []} loading={q.isLoading} isError={q.isError} getRowKey={(r, i) => i} onRowClick={drillLedger} dense showDensityToggle={false} className="mb-3.5" emptyMessage="No movement in this period." />
    );
    return (
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
    );
  };

  // Single-branch / fallback model (also the ALL-mode fallback when the BE omits byBranch:
  // preserves the previous blended render exactly). Header + CSV read from this model.
  const model = buildModel(d, branch);
  const brLabel = (!branch || branch === 'ALL') ? CONSOLIDATED_LABEL : (branch.code || branch);

  // CSV export rows for one slice. Consolidated concatenates every branch's lines with the
  // branch code in the section label — the CSV never sums across branches or currencies.
  const buildExportRows = (dd) => {
    const out = dd?.output || { lines: [] };
    const input = dd?.input || { lines: [] };
    const wh = dd?.withholding || { payableLines: [], receivableLines: [] };
    return [
      ...(out.lines || []).map((l) => ({ section: 'Output Tax', ledger: l.ledger, amount: l.amount })),
      ...(input.lines || []).map((l) => ({ section: 'Input Tax', ledger: l.ledger, amount: l.amount })),
      ...(wh.payableLines || []).map((l) => ({ section: 'Withholding Payable', ledger: l.ledger, amount: l.amount })),
      ...(wh.receivableLines || []).map((l) => ({ section: 'Withholding Receivable', ledger: l.ledger, amount: l.amount })),
    ];
  };
  const exportRows = showPerBranch
    ? byBranch.flatMap((b) => (b._error ? [] : buildExportRows(b).map((r) => ({ ...r, section: `${b.branch} · ${r.section}` }))))
    : buildExportRows(d);

  return (
    <PageLayout
      title={showPerBranch ? `Tax Summary · ${CONSOLIDATED_LABEL}` : `${model.isVat ? 'VAT Return' : 'GST Summary'} · ${brLabel}`}
      subtitle={showPerBranch
        ? 'Consolidated — each branch in its own currency · no cross-currency total'
        : `${model.regime}${d?.vatRate ? ' ' + d.vatRate + '%' : ''} · live from the double-entry engine · ${model.cur}`}
      actions={<Button size="sm" variant="secondary" icon={Download} disabled={!exportRows.length} onClick={() => exportToCSV(exportRows, ['section', 'ledger', 'amount'], 'tax-summary.csv')}>CSV</Button>}
      filters={<ReportDateBar value={range} onChange={setRange} branch={branch} />}
    >
      {q.isLoading && <LoadingState />}
      {q.isError && <ErrorState message={`${q.error?.message || 'Failed to load'} — is the backend running and are you logged in?`} onRetry={q.refetch} />}

      {/* CONSOLIDATED: each branch its own section, in its own currency — never merged. */}
      {!q.isLoading && !q.isError && showPerBranch && (
        byBranch.length === 0
          ? <div className="rounded-brand border-l-4 border-[#d97706] bg-[#fbeedb] px-3.5 py-3 text-[12.5px] font-semibold text-navy">No branch returned tax data for the selected period.</div>
          : (
            <>
              <div className="mb-4 rounded-brand border-l-4 border-navy bg-surface-alt px-3.5 py-2.5 text-[12px] font-semibold text-navy">
                Consolidated — each branch in its own currency. No cross-currency total is shown.
              </div>
              {byBranch.map((b) => (
                <div key={b.branch} className="mb-7">
                  <div className="mb-2.5 flex items-baseline gap-2 border-b-2 border-navy pb-1">
                    <span className="text-[15px] font-extrabold text-navy">{branchLabel(b.branch)}</span>
                    <span className="text-[12px] font-bold text-ink-muted">· {curOf(b.branch)}</span>
                  </div>
                  {b._error
                    ? <div className="rounded-brand border-l-4 border-[#dc2626] bg-[#FBEAEA] px-3.5 py-3 text-[12px] font-semibold text-maroon">Could not load tax summary for {branchLabel(b.branch)} — {b._error}</div>
                    : renderBody(buildModel(b, { code: b.branch }))}
                </div>
              ))}
            </>
          )
      )}

      {/* SINGLE BRANCH (and the ALL-mode fallback when byBranch is absent): unchanged. */}
      {!q.isLoading && !q.isError && !showPerBranch && renderBody(model)}
    </PageLayout>
  );
}

export default RPT_TaxSummary;
