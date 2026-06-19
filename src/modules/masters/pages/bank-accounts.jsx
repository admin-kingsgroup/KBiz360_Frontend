/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Bank Account Master — accounts per branch / currency.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. Filters + per-currency totals unchanged
   (BANK_ACCOUNTS_DATA). Per-currency summary → ResponsiveGrid; grid →
   DataTable (sort/sticky/export/mobile scroll). Import / Add-account
   navigation preserved via setRoute.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { Upload, Plus } from 'lucide-react';
import { BANK_ACCOUNTS_DATA } from '../../../core/helpers';
import { BRANCH_CODES } from '../../../core/data';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { Input, Select, Button, StatusPill, ResponsiveGrid } from '../../../shell/primitives';

export function BankAccountMaster({ branch, setRoute }) {
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState(branch === 'ALL' ? 'ALL' : branch?.code || 'ALL');
  const filtered = BANK_ACCOUNTS_DATA.filter((b) => {
    if (filterBranch !== 'ALL' && b.branch !== filterBranch) return false;
    const q = search.toLowerCase();
    if (q && !(b.bank.toLowerCase().includes(q) || b.accountNo.toLowerCase().includes(q) || b.ifsc.toLowerCase().includes(q))) return false;
    return true;
  });
  const totalByCurrency = filtered.reduce((acc, b) => { acc[b.currency] = (acc[b.currency] || 0) + b.openingBal; return acc; }, {});

  const columns = [
    { key: 'branch', header: 'Branch', render: (r, v) => <span className="rounded bg-[#e6e8f1] px-1.5 py-0.5 text-[10.5px] font-bold text-navy">{v}</span> },
    { key: 'bank', header: 'Bank · Branch', className: 'font-semibold text-navy', hideable: false, render: (r, v) => <div>{v}<div className="text-[10.5px] font-normal text-ink-muted">{r.branchAddr}</div></div> },
    { key: 'accountNo', header: 'Account No.', className: 'font-mono text-navy' },
    { key: 'ifsc', header: 'IFSC / SWIFT', className: 'font-mono text-ink-muted' },
    { key: 'type', header: 'Type', className: 'text-ink-muted', render: (r, v) => `${v} · ${r.currency}` },
    { key: 'openingBal', header: 'Opening Bal', num: true, className: 'font-bold', render: (r, v) => `${r.currency} ${v.toLocaleString('en-IN')}` },
    { key: 'limit', header: 'Limit', num: true, className: 'text-ink-muted', render: (r, v) => `${r.currency} ${v.toLocaleString('en-IN')}` },
    { key: 'status', header: 'Status', align: 'center', render: (r, v) => <StatusPill tone={v === 'Active' ? 'success' : 'danger'} size="sm">{v}</StatusPill> },
    { key: '__act', header: 'Action', align: 'center', sortable: false, exportable: false, hideable: false, render: () => <Button variant="secondary" size="xs">Edit</Button> },
  ];

  return (
    <PageLayout
      title="Bank Account Master"
      subtitle="All bank accounts where Travkings holds money — per branch, per currency"
      actions={
        <>
          <Button size="sm" variant="secondary" icon={Upload} onClick={() => setRoute && setRoute('/import')}>Import</Button>
          <Button size="sm" variant="accent" icon={Plus} onClick={() => setRoute && setRoute('/masters/ledgers')} title="Bank accounts are ledgers under the “Bank Accounts” group">Add Bank Account</Button>
        </>
      }
      filters={
        <>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bank / account / IFSC…" className="w-auto min-w-[220px] flex-1" />
          <Select value={filterBranch} onChange={(e) => setFilterBranch(e.target.value)} className="w-auto">
            <option value="ALL">All branches</option>
            {BRANCH_CODES.map((b) => <option key={b} value={b}>{b}</option>)}
          </Select>
        </>
      }
    >
      {Object.keys(totalByCurrency).length > 0 && (
        <ResponsiveGrid min="180px" gap="md" className="mb-4">
          {Object.entries(totalByCurrency).map(([ccy, amt]) => (
            <div key={ccy} className="rounded-brand border border-surface-border bg-surface px-3.5 py-2.5">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">Cash + Bank — {ccy}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-navy">{ccy} {amt.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</p>
            </div>
          ))}
        </ResponsiveGrid>
      )}

      <DataTable columns={columns} rows={filtered} getRowKey={(r) => r.id} dense exportName="bank-accounts" printTitle="Bank Account Master" emptyMessage="No bank accounts match the filter." />
    </PageLayout>
  );
}

export default BankAccountMaster;
