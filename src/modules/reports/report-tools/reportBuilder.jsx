/* ════════════════════════════════════════════════════════════════════
   Reports ▸ Custom Report Builder — a real query tool over the books.
   ════════════════════════════════════════════════════════════════════
   Pick a source (vouchers / journal postings / GP bills), a bounded period
   (the backend enforces ≤ 366 days + a 5000-row cap for the throttled Atlas
   tier), a branch, an optional group-by and the columns → Run posts to
   /api/report-views/run and renders rows + totals. Results export to CSV and
   the whole query can be persisted as a named Saved Report View
   (/api/report-views), which re-opens here preloaded via builderShared's
   pending-config stash.
   ──────────────────────────────────────────────────────────────────── */

import React, { useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Play, Save, Download, SlidersHorizontal } from 'lucide-react';
import { apiPost } from '../../../core/api';
import { useMasterMutations } from '../../../core/useMasters';
import { exportToExcel } from '../../../core/exportExcel';
import { CUR_MONTH_RANGE } from '../../../core/dates';
import { BRANCH_CODES } from '../../../core/data';
import { branchCode } from '../../../core/useAccounting';
import { toastSuccess, toastError } from '../../../core/ux/toast';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { PageSection, Button, Input, Select, FormField, Checkbox, Switch, Modal, EmptyState } from '../../../shell/primitives';
import {
  RUN_SOURCES, GROUP_OPTIONS, GROUP_LABEL, catalogFor,
  consumeBuilderConfig, currentUserEmail,
} from './builderShared';

const fmtN = (v) => (Number(v) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });

export function CustomReportBuilder({ branch, setRoute }) {
  // A Saved View can preload this screen (Saved Views ▸ Open) — consume once.
  const preload = useMemo(() => consumeBuilderConfig(), []);
  const pf = (preload && preload.filters) || {};

  const [source, setSource] = useState(preload?.source || 'vouchers');
  const [groupBy, setGroupBy] = useState(preload?.groupBy || '');
  const [from, setFrom] = useState(pf.from || CUR_MONTH_RANGE.startISO);
  const [to, setTo] = useState(pf.to || CUR_MONTH_RANGE.endISO);
  const [brSel, setBrSel] = useState(pf.branch || branchCode(branch) || 'ALL');
  // Column selection: null = all columns of the current catalog.
  const [cols, setCols] = useState(Array.isArray(preload?.columns) && preload.columns.length ? preload.columns : null);
  const [saveModal, setSaveModal] = useState(false);
  const [viewName, setViewName] = useState(preload?.name || '');
  const [viewShared, setViewShared] = useState(false);

  const catalog = catalogFor(source, groupBy);
  const activeCols = cols ? catalog.filter((c) => cols.includes(c.key)).map((c) => c.key) : catalog.map((c) => c.key);
  const toggleCol = (key) => {
    const next = activeCols.includes(key) ? activeCols.filter((k) => k !== key) : [...activeCols, key];
    setCols(next.length === catalog.length ? null : next);
  };

  const config = { source, filters: { branch: brSel, from, to }, groupBy, columns: cols || undefined };

  const run = useMutation({
    mutationFn: (cfg) => apiPost('/api/report-views/run', cfg),
    onError: (e) => toastError(e.message || 'Report run failed'),
  });
  const result = run.data;

  // Opened from a Saved View → run it immediately with the preloaded config.
  useEffect(() => {
    if (preload && preload.source) run.mutate({ ...preload, columns: preload.columns || undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { create } = useMasterMutations('report-views');
  const saveView = () => {
    create.mutate(
      { name: viewName.trim(), report: 'builder', config, shared: viewShared, owner: currentUserEmail() },
      {
        onSuccess: () => { setSaveModal(false); toastSuccess(`Saved “${viewName.trim()}” — find it under Saved Report Views.`); },
        onError: (e) => toastError(e.message || 'Could not save the view'),
      },
    );
  };

  const tableColumns = useMemo(() => (result ? result.columns.map((c, i) => ({
    key: c.key,
    header: c.label,
    num: !!c.num,
    render: c.num ? (r) => fmtN(r[c.key]) : undefined,
    footer: c.num ? () => (result.totals[c.key] == null ? '—' : fmtN(result.totals[c.key])) : (i === 0 ? () => 'Total' : undefined),
  })) : []), [result]);

  const exportCsv = () => result && exportToExcel(
    `custom-report-${source}${groupBy ? `-by-${groupBy}` : ''}`,
    result.columns.map((c) => ({ key: c.key, label: c.label })),
    result.rows,
    { report: 'custom-report-builder', branch: brSel },
  );

  return (
    <PageLayout
      title="Custom Report Builder"
      subtitle="Query the live books: pick a source, period, branch, grouping and columns → Run. Export the result to CSV or save the query as a reusable view."
      actions={
        <>
          <Button variant="secondary" size="sm" icon={Download} disabled={!result || !result.rows.length} onClick={exportCsv}>Export CSV</Button>
          <Button variant="secondary" size="sm" icon={Save} disabled={!result} onClick={() => setSaveModal(true)}>Save as view</Button>
          <Button variant="primary" size="sm" icon={Play} disabled={run.isPending} onClick={() => run.mutate(config)}>{run.isPending ? 'Running…' : 'Run'}</Button>
        </>
      }
    >
      <PageSection title="Query" icon={SlidersHorizontal} className="mb-4">
        <div className="grid grid-cols-2 gap-3 tablet:grid-cols-5">
          <FormField label="Source">
            <Select value={source} onChange={(e) => { setSource(e.target.value); setGroupBy(''); setCols(null); }}>
              {RUN_SOURCES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </Select>
          </FormField>
          <FormField label="Group by">
            <Select value={groupBy} onChange={(e) => { setGroupBy(e.target.value); setCols(null); }}>
              {(GROUP_OPTIONS[source] || ['']).map((g) => <option key={g} value={g}>{GROUP_LABEL[g] || g}</option>)}
            </Select>
          </FormField>
          <FormField label="Branch">
            <Select value={brSel} onChange={(e) => setBrSel(e.target.value)}>
              <option value="ALL">All branches</option>
              {BRANCH_CODES.map((b) => <option key={b} value={b}>{b}</option>)}
            </Select>
          </FormField>
          <FormField label="From" hint="Max range: 366 days">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </FormField>
          <FormField label="To">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </FormField>
        </div>
        <div className="mt-3">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-ink-muted">
            Columns {groupBy ? `(the ${GROUP_LABEL[groupBy] || groupBy} key column is always included)` : ''}
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {catalog.map((c) => (
              <Checkbox key={c.key} checked={activeCols.includes(c.key)} onChange={() => toggleCol(c.key)} label={c.label} />
            ))}
          </div>
        </div>
      </PageSection>

      {result ? (
        <>
          {result.truncated && (
            <p className="mb-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-[12px] font-semibold text-[#854F0B]">
              Row cap hit — showing the first {result.rows.length.toLocaleString('en-IN')} rows (totals cover the shown rows only). Narrow the period or add a grouping.
            </p>
          )}
          {result.crossCurrencyTotals && (
            <p className="mb-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-[12px] font-semibold text-[#854F0B]">
              Money totals hidden — this All-branches result spans branch currencies (₹ India + $ Africa) and cannot be summed into one figure. Group by <b>Branch</b>, or pick a specific branch, for accurate money totals. (Counts are still totalled.)
            </p>
          )}
          <DataTable
            columns={tableColumns}
            rows={result.rows}
            getRowKey={(r, i) => `${r.vno || r.key || r.id || 'row'}-${i}`}
            loading={run.isPending}
            emptyMessage="No rows matched — widen the period or change the source/branch."
            stickyHeader
            showColumnToggle
            maxHeight="62vh"
          />
        </>
      ) : (
        <PageSection>
          <EmptyState
            icon={Play}
            title={run.isPending ? 'Running your query…' : 'Configure a query and press Run'}
            hint="Results come straight from the live double-entry books via /api/report-views/run — nothing is sampled or fabricated."
          />
        </PageSection>
      )}

      {saveModal && (
        <Modal
          title="Save as report view"
          sub="Saved views live under Reports ▸ Saved Report Views and re-open this builder preloaded."
          onClose={() => setSaveModal(false)}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setSaveModal(false)}>Cancel</Button>
              <Button variant="primary" size="sm" write disabled={!viewName.trim() || create.isPending} onClick={saveView}>
                {create.isPending ? 'Saving…' : 'Save view'}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3 p-4">
            <FormField label="View name" required>
              <Input value={viewName} onChange={(e) => setViewName(e.target.value)} placeholder="e.g. Monthly sales by party — BOM" />
            </FormField>
            <Switch checked={viewShared} onChange={setViewShared} label="Shared — visible to the whole team (otherwise only you)" />
          </div>
        </Modal>
      )}
    </PageLayout>
  );
}

export default CustomReportBuilder;
