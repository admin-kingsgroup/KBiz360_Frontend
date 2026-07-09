import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getGstr2bList, importGstr2b, setGstr2bStatus } from './api';
import { BRANCHES, defaultPeriod, itcOf, statusTone, summarize } from './utils';
import { PageSection, ResponsiveGrid, Badge, Button, Input, Select, Textarea, FormField } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { DataTable } from '../../shell/DataTable';

// ─── GSTR-2B — import & ITC matching ─────────────────────────────────────────
// Import the GST-portal GSTR-2B (paste its JSON, or a flat array) per branch + month,
// then mark each invoice Matched / Mismatch against the purchase it belongs to. The
// Control Tower's "GSTR-2B / ITC matched" gate reads this — warns until imported, fails
// while any line is unmatched, passes when input credit ties out.
const fmt = (n) => new Intl.NumberFormat('en-IN').format(Math.round(Number(n) || 0));

export function Gstr2bPage() {
  const qc = useQueryClient();
  const [branch, setBranch] = useState('BOM');
  const [period, setPeriod] = useState(defaultPeriod());
  const [payload, setPayload] = useState('');

  const key = ['gstr2b', branch, period];
  const { data: rows = [], isLoading, isError } = useQuery({ queryKey: key, queryFn: () => getGstr2bList({ branch, period }) });
  const invalidate = () => qc.invalidateQueries({ queryKey: key });
  const imp = useMutation({ mutationFn: importGstr2b, onSuccess: () => { setPayload(''); invalidate(); } });
  const mark = useMutation({ mutationFn: ({ id, status }) => setGstr2bStatus(id, status), onSuccess: invalidate });

  const s = summarize(rows);
  const doImport = () => { if (payload.trim()) imp.mutate({ branch, period, payload: payload.trim(), fileName: 'pasted' }); };

  const columns = [
    { key: 'supplierName', header: 'Supplier', render: (r) => (
      <div><div className="font-medium text-ink">{r.supplierName || '—'}</div><div className="text-[11px] text-ink-subtle tabular-nums">{r.gstin}</div></div>
    ) },
    { key: 'invoiceNo', header: 'Invoice', render: (r) => <span className="tabular-nums">{r.invoiceNo}<span className="text-ink-subtle"> · {r.invoiceDate}</span></span> },
    { key: 'taxableValue', header: 'Taxable', align: 'right', num: true, render: (r) => <span className="tabular-nums">{fmt(r.taxableValue)}</span> },
    { key: 'itc', header: 'ITC', align: 'right', num: true, render: (r) => <span className="tabular-nums font-semibold">{fmt(itcOf(r))}</span> },
    { key: 'status', header: 'Status', align: 'center', render: (r) => <Badge tone={statusTone(r.status)} size="sm">{r.status}</Badge> },
    { key: 'act', header: '', align: 'right', render: (r) => (
      <span className="flex justify-end gap-1.5">
        <Button size="sm" variant={r.status === 'matched' ? 'ghost' : 'primary'} onClick={() => mark.mutate({ id: r._id, status: r.status === 'matched' ? 'unmatched' : 'matched' })}>
          {r.status === 'matched' ? 'Unmatch' : 'Match'}
        </Button>
        {r.status !== 'mismatch' && <Button size="sm" variant="ghost" onClick={() => mark.mutate({ id: r._id, status: 'mismatch' })}>Mismatch</Button>}
      </span>
    ) },
  ];

  return (
    <div className="grid gap-4">
      <p className="max-w-3xl text-sm text-ink-muted">
        Import the month's <b>GSTR-2B</b> from the GST portal and match each invoice to the purchase it belongs to.
        The <b>Control Tower</b> gates the close on unmatched input credit, so what you claim ties out to what suppliers filed.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <FormField label="Branch"><Select value={branch} onChange={(e) => setBranch(e.target.value)}>{BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}</Select></FormField>
        <FormField label="Period"><Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} /></FormField>
      </div>

      <ResponsiveGrid min="140px" gap="md">
        <KpiTile label="Invoices" value={`${s.total}`} sub={`${branch} · ${period}`} color="#1a1c22" />
        <KpiTile label="Matched" value={`${s.matched}`} sub="tied to a purchase" color="#1a7a4c" />
        <KpiTile label="Unmatched" value={`${s.unmatched + s.mismatch}`} sub="to reconcile" color={s.unmatched + s.mismatch ? '#b23b3b' : '#1a7a4c'} />
        <KpiTile label="Input credit" value={`₹${fmt(s.itc)}`} sub="total ITC in 2B" color="#1a1c22" />
      </ResponsiveGrid>

      <PageSection title="Import GSTR-2B (paste the portal JSON or a flat array)">
        <div className="grid gap-2">
          <Textarea rows={4} value={payload} placeholder='{"data":{"docdata":{"b2b":[…]}}}  — or  [{"gstin":"…","invoiceNo":"…","txval":…,"igst":…}]'
            onChange={(e) => setPayload(e.target.value)} />
          <div className="flex items-center gap-3">
            <Button onClick={doImport} disabled={!payload.trim() || imp.isPending} loading={imp.isPending}>Import</Button>
            {imp.data && <span className="text-xs text-ink-muted">Imported {imp.data.imported} line(s).</span>}
            {imp.isError && <span className="text-xs text-danger">Import failed — check the JSON.</span>}
          </div>
        </div>
      </PageSection>

      <DataTable
        title={`GSTR-2B — ${branch} · ${period}`}
        columns={columns}
        rows={rows}
        getRowKey={(r) => r._id || `${r.gstin}:${r.invoiceNo}`}
        loading={isLoading}
        isError={isError}
        emptyMessage="Nothing imported yet — paste the GSTR-2B above."
        searchable
        showDensityToggle={false}
        zebra
      />
    </div>
  );
}
