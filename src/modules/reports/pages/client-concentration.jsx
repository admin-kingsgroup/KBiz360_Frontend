/* ════════════════════════════════════════════════════════════════════
   Reports ▸ Client Concentration Risk — revenue dependency by client.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. Math unchanged: per-client rev/GP from
   useGpBills, top-1/3/10 shares, Herfindahl index, risk banding. The
   stacked concentration bar stays a custom PageSection panel (bespoke
   visual); the breakdown becomes a DataTable (sort/export/sticky/scroll).
   ──────────────────────────────────────────────────────────────────── */

import React, { useMemo, useState } from 'react';
import { bc } from '../../../core/styles';
import { useGpBills } from '../../../core/useAccounting';
import { ReportDateBar, resolveReportRange } from '../../../core/reportDateBar';
import { DataTable } from '../../../shell/DataTable';
import { PageSection, ResponsiveGrid, StatusPill } from '../../../shell/primitives';
import { RptShell } from '../components/scaffold';

const COLORS = ['#2563eb', '#16a34a', '#d97706', '#3fb7a3', '#dc2626', '#2e323c', '#c2a04a', '#5b616e', '#1a1c22', '#1a2340'];
const RISK_CLR = { HIGH: '#dc2626', MEDIUM: '#d97706', LOW: '#16a34a' };
const RISK_BG = { HIGH: '#fbe9e9', MEDIUM: '#fbeedb', LOW: '#e8f6ed' };
const riskTone = { HIGH: 'danger', MEDIUM: 'warning', LOW: 'success' };
const levelFor = (share) => (share > 0.3 ? 'HIGH' : share > 0.15 ? 'MEDIUM' : 'LOW');

export function ClientConcentration({ branch }) {
  const cur = bc(branch).cur;
  const [range, setRange] = useState(() => ({ mode: 'all', ...resolveReportRange('all') }));
  const q = useGpBills(branch, { from: range.from || undefined, to: range.to || undefined });
  const bills = q.data || [];
  const totalRev = bills.reduce((s, b) => s + b.sell, 0);

  const clients = useMemo(() => {
    const m = {};
    bills.forEach((b) => {
      if (!m[b.client]) m[b.client] = { client: b.client, rev: 0, gp: 0, books: 0, branch: b.branch };
      m[b.client].rev += b.sell; m[b.client].gp += b.sell - b.cost; m[b.client].books++;
    });
    return Object.values(m).sort((a, b) => b.rev - a.rev)
      .map((c, i) => ({ ...c, color: COLORS[i] || '#cbd0db', share: totalRev > 0 ? c.rev / totalRev : 0 }));
  }, [bills, totalRev]);

  const top10Rev = clients.slice(0, 10).reduce((s, c) => s + c.rev, 0);
  const top1Rev = clients[0]?.rev || 0;
  const top3Rev = clients.slice(0, 3).reduce((s, c) => s + c.rev, 0);
  const herfindahl = clients.reduce((s, c) => s + Math.pow(totalRev > 0 ? c.rev / totalRev : 0, 2), 0);
  const f = (n) => cur + Number(Math.round(n)).toLocaleString('en-IN');
  const pct = (n) => (totalRev > 0 ? (n / totalRev * 100).toFixed(1) : 0);
  const risk = top1Rev / totalRev > 0.4 ? 'HIGH' : top3Rev / totalRev > 0.6 ? 'MEDIUM' : 'LOW';

  const columns = [
    { key: 'color', header: '', align: 'center', sortable: false, hideable: false, exportable: false, width: '2.5rem', render: (r) => <span className="inline-block h-3 w-3 rounded-sm" style={{ background: r.color }} /> },
    { key: 'client', header: 'Client', className: 'font-semibold text-navy', hideable: false },
    { key: 'rev', header: 'Revenue', num: true, render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + r.rev, 0)) },
    { key: 'gp', header: 'GP', num: true, className: 'text-[#16a34a]', render: (r, v) => f(v), footer: (rs) => f(rs.reduce((s, r) => s + r.gp, 0)) },
    {
      key: 'share', header: 'Share', num: true, render: (r, v) => (
        <div className="flex flex-col items-end gap-1">
          <span className="font-bold" style={{ color: r.color }}>{(v * 100).toFixed(1)}%</span>
          <div className="h-1 w-12 overflow-hidden rounded-full bg-surface-alt">
            <div className="h-full" style={{ width: `${Math.min(v * 100, 100)}%`, background: r.color }} />
          </div>
        </div>
      ),
    },
    { key: 'risk', header: 'Risk', align: 'center', sortable: false, sortValue: (r) => r.share, render: (r) => <StatusPill tone={riskTone[levelFor(r.share)]} size="sm">{levelFor(r.share)}</StatusPill> },
  ];

  return (
    <RptShell title="Client Concentration Risk" subtitle="Revenue dependency by client — diversification analysis"
      filters={<ReportDateBar value={range} onChange={setRange} branch={branch} />}>
      {/* Risk banner */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-brand px-3.5 py-2.5"
        style={{ background: RISK_BG[risk], border: `1px solid ${RISK_CLR[risk]}40` }}>
        <div>
          <span className="text-[13px] font-extrabold" style={{ color: RISK_CLR[risk] }}>Concentration Risk: {risk}</span>
          <p className="mt-0.5 text-[10.5px]" style={{ color: RISK_CLR[risk] }}>
            Top client: {pct(top1Rev)}% · Top 3: {pct(top3Rev)}% · Top 10: {pct(top10Rev)}% of revenue
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-ink-muted">Herfindahl Index: {herfindahl.toFixed(3)}</p>
          <p className="text-[9.5px] text-ink-muted">{'<0.15 = healthy · 0.15–0.25 = moderate · >0.25 = concentrated'}</p>
        </div>
      </div>

      <ResponsiveGrid cols={2} gap="md">
        <PageSection title={`Revenue Concentration — Top ${Math.min(10, clients.length)} Clients`}>
          {/* Stacked share bar */}
          <div className="mb-3 flex h-7 overflow-hidden rounded-md">
            {clients.slice(0, 10).map((c) => (
              <div key={c.client} style={{ width: `${pct(c.rev)}%`, background: c.color, minWidth: 2 }} title={`${c.client}: ${pct(c.rev)}%`} />
            ))}
            <div className="flex-1 bg-surface-border" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {clients.slice(0, 10).map((c) => (
              <div key={c.client} className="flex items-center gap-1 text-[9.5px] text-role-hr">
                <div className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: c.color }} />
                <span className="max-w-[80px] truncate">{c.client}</span>
                <span className="font-bold" style={{ color: c.color }}>{pct(c.rev)}%</span>
              </div>
            ))}
          </div>
          <div className="mt-2.5 rounded-lg bg-surface-alt px-3 py-2 text-[10px] text-ink-muted">
            Ideal: No single client {'>'}20% · Top 3 {'<'}40% · Spread across {'>'}15 clients
          </div>
        </PageSection>

        <DataTable
          loading={q.isLoading}
          isError={q.isError}
          columns={columns}
          rows={clients}
          getRowKey={(r) => r.client}
          dense
          initialSort={{ key: 'rev', dir: 'desc' }}
          exportName="client-concentration"
          printTitle="Client Concentration"
          maxHeight="60vh"
          emptyMessage="No client revenue in this range."
        />
      </ResponsiveGrid>
    </RptShell>
  );
}

export default ClientConcentration;
