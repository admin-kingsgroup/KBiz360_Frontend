/* ════════════════════════════════════════════════════════════════════
   Settings ▸ Audit Log — user activity trail.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx onto PageLayout + DataTable (sort/sticky/export/
   mobile scroll). Filter logic unchanged; the live audit feed is sourced
   elsewhere, so this renders an empty/filtered state cleanly.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { BRANCH_CODES } from '../../../core/data';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { Input, Select } from '../../../shell/primitives';

const ACTION_CLR = { CREATE: '#27500A', SAVE: '#185FA5', EDIT: '#854F0B', LOGIN: '#384677', LOGOUT: '#5a6691', PRINT: '#1D9E75', DELETE: '#A32D2D' };
const ACTION_BG = { CREATE: '#EAF3DE', SAVE: '#E6F1FB', EDIT: '#FAEEDA', LOGIN: '#f3f4f8', LOGOUT: '#f3f4f8', PRINT: '#EAF3DE', DELETE: '#FCEBEB' };
const TYPES = ['All', 'CREATE', 'EDIT', 'SAVE', 'PRINT', 'LOGIN', 'LOGOUT', 'DELETE'];

export function SettingsAudit() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [brFilter, setBrFilter] = useState('All');

  const LOGS = [];
  const filtered = LOGS.filter((l) => (
    (typeFilter === 'All' || l.action === typeFilter) &&
    (brFilter === 'All' || l.branch === brFilter) &&
    (!search || l.user.toLowerCase().includes(search.toLowerCase()) || l.desc.toLowerCase().includes(search.toLowerCase()) || l.module.toLowerCase().includes(search.toLowerCase()))
  ));

  const columns = [
    { key: 'ts', header: 'Timestamp', className: 'font-mono text-[10.5px] text-ink-muted', hideable: false },
    { key: 'user', header: 'User', className: 'font-semibold text-navy' },
    { key: 'branch', header: 'Branch', render: (r, v) => <span className="rounded-full bg-[#E6F1FB] px-1.5 py-0.5 text-[10px] font-bold text-[#185FA5]">{v}</span> },
    { key: 'action', header: 'Action', render: (r, v) => <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: ACTION_BG[v] || '#f3f4f8', color: ACTION_CLR[v] || '#384677' }}>{v}</span> },
    { key: 'module', header: 'Module', className: 'text-role-hr' },
    { key: 'desc', header: 'Description', className: 'text-ink-muted' },
    { key: 'ip', header: 'IP', className: 'font-mono text-[10px] text-ink-subtle' },
  ];

  return (
    <PageLayout
      title="Audit Log"
      subtitle="All user activity"
      filters={
        <>
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-auto">{TYPES.map((t) => <option key={t}>{t}</option>)}</Select>
          <Select value={brFilter} onChange={(e) => setBrFilter(e.target.value)} className="w-auto">{['All', ...BRANCH_CODES].map((b) => <option key={b}>{b}</option>)}</Select>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search user, module, action…" className="w-auto min-w-[200px] flex-1" />
        </>
      }
    >
      <DataTable columns={columns} rows={filtered} getRowKey={(r, i) => r.id || i} dense exportName="audit-log" printTitle="Audit Log" emptyMessage="No log entries match your filter." />
    </PageLayout>
  );
}

export default SettingsAudit;
