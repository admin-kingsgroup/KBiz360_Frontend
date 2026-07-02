/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Numbering Series — LIVE, system-controlled (read-only).
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. Live series from useNumberingSeries
   (/api/numbering-series); the STD voucher-type backfill + {TOKEN} format
   resolver are unchanged. Now on PageLayout + DataTable (sort, sticky header,
   Excel export, mobile horizontal scroll). Numbering stays read-only.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { useNumberingSeries } from '../../../core/useReference';
import { BRANCH_CODES } from '../../../core/data';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { Input, Select, StatusPill } from '../../../shell/primitives';

const STD = [['BKG', 'Booking'], ['LK', 'Link No'], ['SF', 'Sales (SO)'], ['PF', 'Purchase (PO)'], ['RV', 'Receipt'], ['PMT', 'Payment'], ['JV', 'Journal'], ['CV', 'Contra'], ['SDN', 'Debit Note'], ['PXP', 'Purchase Expense'], ['RF', 'Refund'], ['RI', 'Reissue']];

export function NumberingSeriesMaster({ branch }) {
  const [filterBranch, setFilterBranch] = useState(branch === 'ALL' ? 'BOM' : branch?.code || 'BOM');
  const [search, setSearch] = useState('');
  const nq = useNumberingSeries();
  const series = nq.data || [];

  const now = new Date(), yy = String(now.getFullYear()).slice(-2), yyyy = String(now.getFullYear()), mm = String(now.getMonth() + 1).padStart(2, '0');
  const resolve = (fmt, prefix, nextNo, br) => String(fmt || '')
    .replace(/\{PREFIX\}/g, prefix || '').replace(/\{BR\}/g, br || '')
    .replace(/\{YYYY\}/g, yyyy).replace(/\{YY\}/g, yy)
    .replace(/\{MMYY\}/g, mm + yy).replace(/\{MM\}/g, mm)
    .replace(/\{#####\}/g, String(nextNo || 1).padStart(5, '0')).replace(/\{####\}/g, String(nextNo || 1).padStart(4, '0'));

  const rows = (() => {
    if (filterBranch === 'ALL') return series;
    const mine = series.filter((s) => s.branch === filterBranch);
    const byT = {}; mine.forEach((s) => { byT[s.voucherType] = s; byT[s.prefix] = s; });
    const seen = new Set(); const out = [];
    STD.forEach(([t, label]) => { const s = byT[t]; if (s) { out.push(s); seen.add(s.id); } else out.push({ _virtual: true, branch: filterBranch, voucherType: t, label, prefix: t, format: '{PREFIX}/{BR}/{YY}/{####}', nextNo: 1, active: true }); });
    mine.forEach((s) => { if (!seen.has(s.id) && !STD.some(([t]) => t === s.voucherType || t === s.prefix)) out.push(s); });
    return out;
  })();
  const filtered = rows.filter((n) => { if (!search) return true; const q = search.toLowerCase(); return (n.voucherType || '').toLowerCase().includes(q) || (n.prefix || '').toLowerCase().includes(q) || (n.format || '').toLowerCase().includes(q); });

  const columns = [
    { key: 'branch', header: 'Branch', render: (r, v) => <span className="rounded bg-[#e6e8f1] px-1.5 py-0.5 text-[10.5px] font-bold text-navy">{v}</span> },
    { key: 'voucherType', header: 'Voucher Type', className: 'font-semibold text-navy', hideable: false, render: (r, v) => <>{v}{r.label ? <span className="font-normal text-ink-subtle"> · {r.label}</span> : null}</> },
    { key: 'prefix', header: 'Prefix', className: 'font-mono font-bold text-navy' },
    { key: 'format', header: 'Format', className: 'font-mono text-ink-muted' },
    { key: 'nextNo', header: 'Next No', num: true, className: 'font-mono font-bold', render: (r, v) => (r._virtual ? '—' : v) },
    { key: 'preview', header: 'Preview (next number)', sortable: false, className: 'font-mono font-semibold text-gold-dark', render: (r) => resolve(r.format, r.prefix, r.nextNo, r.branch) },
    { key: 'status', header: 'Status', align: 'center', sortable: false, render: (r) => <StatusPill tone={r._virtual ? 'info' : r.active ? 'success' : 'danger'} size="sm">🔒 {r._virtual ? 'Auto' : r.active ? 'Active' : 'Inactive'}</StatusPill> },
  ];

  return (
    <PageLayout
      title="Numbering Series Master"
      subtitle="System-controlled · read-only — a series is created on first use; “Next No” is the next number that will be issued."
      filters={
        <>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search type, prefix, format…" className="w-auto min-w-[200px] flex-1" />
          <Select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="w-auto">
            <option value="ALL">All branches</option>
            {BRANCH_CODES.map((b) => <option key={b} value={b}>{b}</option>)}
          </Select>
          <StatusPill tone="info" icon={Lock}>System-controlled</StatusPill>
        </>
      }
    >
      <div className="mb-3 flex items-start gap-2 rounded-brand border border-[#B5D4F4] bg-[#e8f0ff] px-3.5 py-2.5 text-[11px] leading-relaxed text-[#2563eb]">
        <Lock size={14} className="mt-0.5 shrink-0" />
        Numbering is fully automatic and system-controlled — prefix, format and sequence are locked and cannot be edited. Every voucher (manual entry + bulk import) is numbered automatically.
      </div>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowKey={(r, i) => r.id || ('v' + i)}
        loading={nq.isLoading}
        dense
        exportName="numbering-series"
        printTitle="Numbering Series Master"
        emptyMessage="No numbering series."
      />
    </PageLayout>
  );
}

export default NumberingSeriesMaster;
