/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Bank Account Master — accounts per branch / currency.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. Filters + per-currency totals unchanged
   (BANK_ACCOUNTS_DATA). Per-currency summary → ResponsiveGrid; grid →
   DataTable (sort/sticky/export/mobile scroll). Import / Add-account
   navigation preserved via setRoute.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState, useEffect, useMemo } from 'react';
import { Upload, Plus } from 'lucide-react';
import { useMasterList } from '../../../core/useMasters';
import { BRANCH_CODES, isBankLedgerGroup, isBankODGroup } from '../../../core/data';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { Input, Select, Button, StatusPill, ResponsiveGrid } from '../../../shell/primitives';

// Each bank account is grouped in ITS OWN currency's locale (Indian lakh/crore for
// INR, Western thousands for USD/EUR/etc.) — a cosmetic grouping choice, not a value
// or rate change. Row/summary carry an ISO currency code, so map the code → locale.
const localeOfCcy = (ccy) => (String(ccy || '').toUpperCase() === 'INR' ? 'en-IN' : 'en-US');

export function BankAccountMaster({ branch, setRoute }) {
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState(branch === 'ALL' ? 'ALL' : branch?.code || 'ALL');
  // Follow the top-bar branch switch live (the in-page filter still overrides after).
  useEffect(() => { setFilterBranch(branch === 'ALL' ? 'ALL' : branch?.code || 'ALL'); }, [branch]);
  // Bank accounts ARE ledgers under the Bank Accounts / Cash-in-Hand groups — fetch
  // them live and map the ledger's bank fields onto the register's columns.
  // Banks are branch-owned: fetch only the filtered branch's chart (+ 'ALL' heads)
  // instead of pulling every branch's bank ledgers and hiding rows in the browser.
  const { data: ledgers = [], isLoading, isError, error, refetch } = useMasterList('ledgers', filterBranch !== 'ALL' ? { branch: filterBranch } : {});
  const bankRows = useMemo(() => (ledgers || [])
    .filter((l) => isBankLedgerGroup(l.group) || l.group === 'Cash-in-Hand')
    .map((l) => ({
      id: l._id || l.code,
      code: l.code || l._id || '',   // stable key for the deep-link edit (?edit=<code>)
      branch: l.branch || '',
      bank: l.bankName || l.name,
      branchAddr: l.subGroup || '',
      accountNo: l.bankAcNo || '',
      ifsc: l.bankIfsc || '',
      type: l.group === 'Cash-in-Hand' ? 'Cash' : isBankODGroup(l.group) ? 'OD' : 'Bank',
      currency: l.currency || 'INR',
      openingBal: Number(l.openingBalance) || 0,
      limit: Number(l.creditLimit) || 0,
      status: l.active === false ? 'Inactive' : 'Active',
      locked: !!l.locked,   // wired/system ledger — editable only in the DB (register Edit → 🔒)
    })), [ledgers]);
  const filtered = bankRows.filter((b) => {
    if (filterBranch !== 'ALL' && b.branch !== filterBranch) return false;
    const q = search.toLowerCase();
    if (q && !(b.bank.toLowerCase().includes(q) || b.accountNo.toLowerCase().includes(q) || b.ifsc.toLowerCase().includes(q))) return false;
    return true;
  });
  // "Cash + Bank" is money HELD, so exclude OD/overdraft rows — they're liabilities
  // (money owed), and folding their balance into the cash-position tile would overstate
  // it. OD facilities still appear in the grid below (with their limit), just not in this
  // asset total.
  const totalByCurrency = filtered.filter((b) => b.type !== 'OD').reduce((acc, b) => { acc[b.currency] = (acc[b.currency] || 0) + b.openingBal; return acc; }, {});

  const columns = [
    { key: 'branch', header: 'Branch', render: (r, v) => <span className="rounded bg-[#e6e8f1] px-1.5 py-0.5 text-[10.5px] font-bold text-navy">{v}</span> },
    { key: 'bank', header: 'Bank · Branch', className: 'font-semibold text-navy', hideable: false, render: (r, v) => <div>{v}<div className="text-[10.5px] font-normal text-ink-muted">{r.branchAddr}</div></div> },
    { key: 'accountNo', header: 'Account No.', className: 'font-mono text-navy' },
    { key: 'ifsc', header: 'IFSC / SWIFT', className: 'font-mono text-ink-muted' },
    { key: 'type', header: 'Type', className: 'text-ink-muted', render: (r, v) => `${v} · ${r.currency}` },
    { key: 'openingBal', header: 'Opening Bal', num: true, className: 'font-bold', render: (r, v) => `${r.currency} ${v.toLocaleString(localeOfCcy(r.currency))}` },
    { key: 'limit', header: 'Limit', num: true, className: 'text-ink-muted', render: (r, v) => `${r.currency} ${v.toLocaleString(localeOfCcy(r.currency))}` },
    { key: 'status', header: 'Status', align: 'center', render: (r, v) => <StatusPill tone={v === 'Active' ? 'success' : 'danger'} size="sm">{v}</StatusPill> },
    { key: '__act', header: 'Action', align: 'center', sortable: false, exportable: false, hideable: false, render: (r) => r.locked
        ? <span title="Wired / locked ledger — editable only directly in the database" className="text-ink-subtle" style={{ fontSize: 13 }}>🔒</span>
        : <Button variant="secondary" size="xs" onClick={() => setRoute && setRoute(`/masters/ledgers?edit=${encodeURIComponent(r.code)}`)} title="Edit this account (a ledger under Bank Accounts)" disabled={!r.code}>Edit</Button> },
  ];

  return (
    <PageLayout
      title="Bank Account Master"
      subtitle="All bank accounts & overdraft facilities — per branch, per currency"
      actions={
        <>
          <Button size="sm" variant="secondary" icon={Upload} onClick={() => setRoute && setRoute('/import')}>Import</Button>
          <Button size="sm" variant="accent" icon={Plus} onClick={() => setRoute && setRoute('/masters/ledgers')} title="Bank accounts are ledgers under the “Bank Accounts” group">Add Bank Account</Button>
        </>
      }
      filters={
        <div className="flex w-full items-center justify-between gap-2">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search bank / account / IFSC…" className="w-auto min-w-[220px]" />
          {/* A specific top-bar branch pins the filter — no cross-branch override. */}
          <Select value={filterBranch} disabled={branch !== 'ALL' && !!branch?.code} title={branch !== 'ALL' && branch?.code ? 'Scoped by the top-bar branch — switch it there' : undefined} onChange={(e) => setFilterBranch(e.target.value)} className="w-auto">
            {(branch === 'ALL' || !branch?.code) && <option value="ALL">All branches</option>}
            {((branch === 'ALL' || !branch?.code) ? BRANCH_CODES : [branch.code]).map((b) => <option key={b} value={b}>{b}</option>)}
          </Select>
        </div>
      }
    >
      {filtered.some((b) => b.type === 'OD') && (
        <div className="mb-3 rounded-brand border border-info/25 bg-info-soft px-3.5 py-2.5 text-[11px] text-ink">
          <b>OD / overdraft rows</b> show each account’s own sanctioned limit and are <b>excluded from the “Cash + Bank” totals</b> above (they’re liabilities). A full OD / credit facility with drawdown tracking across supplier ledgers is managed in <b>Masters ▸ Supplier ▸ Credit Facilities &amp; Limits</b>.
        </div>
      )}
      {Object.keys(totalByCurrency).length > 0 && (
        <ResponsiveGrid min="180px" gap="md" className="mb-4">
          {Object.entries(totalByCurrency).map(([ccy, amt]) => (
            <div key={ccy} className="rounded-brand border border-surface-border bg-surface px-3.5 py-2.5">
              <p className="text-[10.5px] font-bold uppercase tracking-wide text-ink-muted">Cash + Bank — {ccy}</p>
              <p className="mt-1 text-lg font-bold tabular-nums text-navy">{ccy} {amt.toLocaleString(localeOfCcy(ccy), { maximumFractionDigits: 0 })}</p>
            </div>
          ))}
        </ResponsiveGrid>
      )}

      <DataTable columns={columns} rows={filtered} getRowKey={(r) => r.id} dense loading={isLoading} isError={isError} error={error} onRetry={refetch} exportName="bank-accounts" printTitle="Bank Account Master" emptyMessage="No bank accounts match the filter." />
    </PageLayout>
  );
}

export default BankAccountMaster;
