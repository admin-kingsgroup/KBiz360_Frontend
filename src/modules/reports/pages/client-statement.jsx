/* ════════════════════════════════════════════════════════════════════
   Reports ▸ Client Account Statement — LIVE party ledger (Dr/Cr + balance).
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. The statement is the party's real account
   ledger (useLedgerStatement) — every Dr/Cr row a posted voucher line;
   useGpBills only populates the client picker. Ageing + totals math is
   unchanged. KPIs → ResponsiveGrid; ledger → DataTable (sort/export/sticky,
   closing-balance footer, mobile scroll). Uses PageLayout for custom
   WhatsApp + Print actions.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { Printer, MessageCircle } from 'lucide-react';
import { bc } from '../../../core/styles';
import { useGpBills, useLedgerStatement } from '../../../core/useAccounting';
import { ReportSearch, ReportDateBar, resolveReportRange, matchNeedle } from '../../../core/reportDateBar';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { ResponsiveGrid, StatusPill, Button, Select } from '../../../shell/primitives';
import { openPrintPreview } from '../../../core/PrintPreview';

export function ClientStatement({ branch }) {
  const cur = bc(branch).cur;
  // Allow deep-linking a client via ?party= (the "Statement" drill from Collections).
  const [client, setClient] = useState(() => { try { return new URLSearchParams(window.location.search).get('party') || ''; } catch { return ''; } });
  const [range, setRange] = useState(() => ({ mode: 'all', ...resolveReportRange('all') }));
  const [search, setSearch] = useState('');
  const needle = search.trim().toLowerCase();

  const q = useGpBills(branch, {});
  const allBills = q.data || [];
  const clients = [...new Set(allBills.map((b) => b.client).filter(Boolean))].sort();
  const rangeLabel = range.mode === 'all' ? 'All Time' : `${range.from || 'start'} → ${range.to || 'today'}`;

  const stmtQ = useLedgerStatement(client, branch, { from: range.from || undefined, to: range.to || undefined });
  const stmt = stmtQ.data;

  const txnsWithBal = (stmt?.lines || []).map((p) => ({
    date: p.date,
    type: p.debit > 0 ? 'Invoice' : 'Receipt',
    ref: p.vno,
    desc: p.narration || p.entryNarration || (p.particulars && p.particulars[0]?.ledger) || p.category || '—',
    dr: p.debit || 0, cr: p.credit || 0,
    bal: p.balanceSide === 'Cr' ? -(p.balance || 0) : (p.balance || 0),
  }));
  const filteredTxns = txnsWithBal.filter((t) => matchNeedle([t.date, t.type, t.ref, t.desc], needle));
  const totDr = stmt?.totalDebit || 0;
  const totCr = stmt?.totalCredit || 0;
  const outstanding = stmt ? (stmt.closingSide === 'Cr' ? -(stmt.closingBalance || 0) : (stmt.closingBalance || 0)) : 0;

  const today = new Date();
  const ageing = { a0: 0, a30: 0, a60: 0, a90: 0 };
  txnsWithBal.filter((t) => t.dr > 0).forEach((t) => {
    const days = Math.ceil((today - new Date(t.date)) / 86400000);
    if (days <= 30) ageing.a0 += t.dr; else if (days <= 60) ageing.a30 += t.dr; else if (days <= 90) ageing.a60 += t.dr; else ageing.a90 += t.dr;
  });

  const f = (n) => cur + Number(Math.round(n)).toLocaleString('en-IN');
  const balText = (v) => `${f(Math.abs(v))}${v > 0 ? ' Dr' : v < 0 ? ' Cr' : ''}`;

  const KPIS = [
    { l: 'Total Invoiced', v: f(totDr), c: '#185FA5' },
    { l: 'Total Received', v: f(totCr), c: '#27500A' },
    { l: 'Outstanding', v: f(outstanding), c: outstanding > 0 ? '#A32D2D' : '#27500A' },
    { l: '0–30 days', v: f(ageing.a0), c: '#27500A' },
    { l: '31–60 days', v: f(ageing.a30), c: '#854F0B' },
    { l: '61–90 days', v: f(ageing.a60), c: '#A32D2D' },
    { l: '>90 days', v: f(ageing.a90), c: '#7B1F1F' },
  ];

  const columns = [
    { key: 'date', header: 'Date', className: 'whitespace-nowrap text-ink-muted' },
    { key: 'type', header: 'Type', render: (r, v) => <StatusPill tone={v === 'Invoice' ? 'info' : 'success'} size="sm">{v}</StatusPill> },
    { key: 'ref', header: 'Reference', className: 'font-mono text-[10px] text-[#185FA5]' },
    { key: 'desc', header: 'Description', className: 'text-role-hr' },
    { key: 'dr', header: 'Dr', num: true, className: 'text-maroon', render: (r, v) => (v > 0 ? f(v) : '—'), footer: () => f(totDr) },
    { key: 'cr', header: 'Cr', num: true, className: 'text-[#27500A]', render: (r, v) => (v > 0 ? f(v) : '—'), footer: () => f(totCr) },
    { key: 'bal', header: 'Balance', num: true, render: (r, v) => <span className="font-bold" style={{ color: v > 0 ? '#A32D2D' : v < 0 ? '#27500A' : '#5a6691' }}>{balText(v)}</span>, footer: () => balText(outstanding), footerLabel: 'CLOSING' },
  ];

  const waText = `Hi! Your account statement for ${rangeLabel} — Outstanding: ${f(outstanding)}. Please contact us to settle the balance.`;

  return (
    <PageLayout
      title="Client Account Statement"
      subtitle={`${client || 'Select a client'} · ${rangeLabel}`}
      actions={
        <>
          <Button size="sm" variant="success" icon={MessageCircle} onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(waText)}`, '_blank', 'noopener')}>WhatsApp</Button>
          <Button size="sm" variant="secondary" icon={Printer} onClick={() => openPrintPreview({ selector: 'main', title: 'Client Statement', recommend: 'portrait' })}>Print</Button>
        </>
      }
      filters={
        <>
          <ReportSearch value={search} onChange={setSearch} placeholder="Ref / type / description…" />
          <Select value={client} onChange={(e) => setClient(e.target.value)} className="w-auto">
            <option value="">— Select client —</option>
            {clients.map((c) => <option key={c}>{c}</option>)}
          </Select>
          <ReportDateBar value={range} onChange={setRange} branch={branch} />
        </>
      }
    >
      <ResponsiveGrid min="140px" gap="md" className="mb-4">
        {KPIS.map((k, i) => (
          <div key={i} className="rounded-brand border border-t-[3px] border-surface-border bg-surface px-3 py-2.5" style={{ borderTopColor: k.c }}>
            <p className="text-[8.5px] font-bold uppercase tracking-wide" style={{ color: k.c }}>{k.l}</p>
            <p className="mt-1 text-base font-extrabold tabular-nums text-navy tablet:text-lg">{k.v}</p>
          </div>
        ))}
      </ResponsiveGrid>

      <DataTable
        title={`Account Ledger — ${client || '…'}`}
        subtitle={`${filteredTxns.length} transactions`}
        columns={columns}
        rows={filteredTxns}
        getRowKey={(r, i) => i}
        dense
        loading={!!client && stmtQ.isLoading}
        exportName={`client-statement-${client || 'none'}`}
        printTitle={`Client Statement — ${client || ''}`}
        emptyMessage={!client ? 'Select a client to view their live account statement.' : needle ? `No transactions match “${search}”.` : `No posted transactions for ${client} in this period.`}
      />
    </PageLayout>
  );
}

export default ClientStatement;
