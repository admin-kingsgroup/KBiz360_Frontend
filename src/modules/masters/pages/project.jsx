/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Project / Tour Code Master — project-based costing.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. Budget/actual/utilisation math + filters
   unchanged (PROJECTS_DATA). KPIs → ResponsiveGrid; grid → DataTable
   (sort/sticky/export/mobile scroll). Toolbar buttons stay placeholders.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { Upload, Plus } from 'lucide-react';
import { PROJECTS_DATA } from '../../../core/helpers';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { Input, Select, Button, StatusPill, ResponsiveGrid } from '../../../shell/primitives';

const STATUS_TONE = { Active: 'info', Quoted: 'warning', Booked: 'success', Completed: 'neutral', Cancelled: 'danger' };
const k = (n) => '₹' + (n / 1000).toFixed(0) + 'K';

export function ProjectMaster() {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const filtered = PROJECTS_DATA.filter((p) => {
    if (filterStatus !== 'ALL' && p.status !== filterStatus) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return p.code.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || p.client.toLowerCase().includes(q);
  });
  const totBudget = filtered.reduce((s, p) => s + p.budget, 0);
  const totActual = filtered.reduce((s, p) => s + p.actual, 0);

  const KPIS = [
    { l: 'Active Projects', v: String(PROJECTS_DATA.filter((p) => p.status !== 'Completed' && p.status !== 'Cancelled').length) },
    { l: 'Total Budget', v: `₹${(totBudget / 100000).toFixed(1)} L` },
    { l: 'Total Actual Spend', v: `₹${(totActual / 100000).toFixed(1)} L` },
    { l: 'Utilization', v: `${totBudget > 0 ? Math.round(totActual / totBudget * 100) : 0}%` },
  ];

  const columns = [
    { key: 'code', header: 'Code', className: 'font-mono font-semibold text-navy', hideable: false },
    { key: 'name', header: 'Project / Tour', className: 'font-semibold text-navy' },
    { key: 'client', header: 'Client', className: 'text-navy' },
    { key: 'period', header: 'Period', sortable: false, className: 'text-ink-muted', render: (r) => `${r.startDate} → ${r.endDate}` },
    { key: 'manager', header: 'Manager', className: 'text-navy' },
    { key: 'budget', header: 'Budget', num: true, className: 'font-bold', render: (r, v) => k(v), footer: (rs) => k(rs.reduce((s, r) => s + r.budget, 0)) },
    { key: 'actual', header: 'Actual', num: true, render: (r, v) => <span style={{ color: v > r.budget ? '#A32D2D' : '#0d1326' }} className="font-semibold">{k(v)}</span>, footer: (rs) => k(rs.reduce((s, r) => s + r.actual, 0)) },
    { key: 'util', header: 'Util %', num: true, align: 'center', sortValue: (r) => (r.budget > 0 ? r.actual / r.budget : 0), render: (r) => { const u = r.budget > 0 ? Math.round(r.actual / r.budget * 100) : 0; return <span className="font-bold" style={{ color: u > 100 ? '#A32D2D' : u > 80 ? '#856404' : '#155724' }}>{u}%</span>; } },
    { key: 'status', header: 'Status', align: 'center', render: (r, v) => <StatusPill tone={STATUS_TONE[v] || 'neutral'} size="sm">{v}</StatusPill> },
  ];

  return (
    <PageLayout
      title="Project / Tour Code Master"
      subtitle="Project-based costing — track budget vs actual per tour package or corporate group booking"
      actions={<><Button size="sm" variant="secondary" icon={Upload}>Import</Button><Button size="sm" variant="accent" icon={Plus}>New Project</Button></>}
      filters={
        <>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, project, client…" className="w-auto min-w-[200px] flex-1" />
          <Select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-auto">
            <option value="ALL">All statuses</option>
            {['Active', 'Quoted', 'Booked', 'Completed', 'Cancelled'].map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </>
      }
    >
      <ResponsiveGrid min="220px" gap="md" className="mb-4">
        {KPIS.map((kp, i) => (
          <div key={i} className="rounded-brand border border-surface-border bg-surface px-3.5 py-2.5">
            <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">{kp.l}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-navy">{kp.v}</p>
          </div>
        ))}
      </ResponsiveGrid>

      <DataTable columns={columns} rows={filtered} getRowKey={(r) => r.code} dense exportName="projects" printTitle="Project / Tour Code Master" emptyMessage="No projects match." />
    </PageLayout>
  );
}

export default ProjectMaster;
