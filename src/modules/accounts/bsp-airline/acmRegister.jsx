/* ════════════════════════════════════════════════════════════════════
   ACM REGISTER  /purchase/acm
   Agent Credit Memos — airline credits to the agency via BSP.

   UI: shared responsive primitives (PageLayout, DataTable, Modal, Button,
   StatusPill, ResponsiveGrid, FormField/Input/Select/Textarea). All business
   logic, hooks and mutations unchanged.
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { Plus, Search, ChevronDown } from 'lucide-react';
import { localeOf } from '../../../core/format';
import { ACM_REASON_CODES } from '../../../core/helpers';
import { useAdmMemos, useCreateAdmMemo, useAcceptAdmMemo, useRejectAdmMemo, useDisputeAdmMemo, useReverseAdmMemo } from '../../../core/useAdmMemos';
import { toast } from '../../../core/ux/toast';
import { confirmDialog } from '../../../core/ux/confirm';
import { Menu as StatusMenu } from '../../../core/ux/Menu';
import { BRANCH_CODES, branchCurrencies, branchMainCurrency } from '../../../core/data';
import { bc } from '../../../core/styles';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { Modal, Button, StatusPill, ResponsiveGrid, FormField, Input, Select, Textarea } from '../../../shell/primitives';

/* Small KPI tile — shared shape with the other asset screens (each keeps its own copy). */
function KpiCard({ label, value, color, bg, sub, valueColor }) {
  return (
    <div className="rounded-brand border border-t-[3px] border-surface-border p-3 shadow-sm" style={{ borderTopColor: color, background: bg || '#fff' }}>
      <p className="text-[10px] font-bold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-1 text-xl font-extrabold tabular-nums tablet:text-[21px]" style={{ color: valueColor || '#0d1326' }}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-ink-muted">{sub}</p>}
    </div>
  );
}

const ACM_TONE = { Received: 'info', Disputed: 'danger', Accepted: 'success', Rejected: 'neutral' };

export function AcmRegister({ branch }) {
  const cfg = bc(branch);
  const cur = cfg.cur;
  const brCode = branch === 'ALL' ? null : branch?.code;

  // Live DB-backed register (/api/adm-memos?kind=acm). Accept spawns a PENDING
  // gated ACM voucher into the approval queue (source: 'acm-register').
  const memosQ = useAdmMemos('acm', branch);
  const createM = useCreateAdmMemo();
  const acceptM = useAcceptAdmMemo();
  const rejectM = useRejectAdmMemo();
  const disputeM = useDisputeAdmMemo();
  const reverseM = useReverseAdmMemo();
  // Keep the DB _id as `rid` for id-addressed actions (/api/adm-memos/:id validates an
  // ObjectId); `id` stays the memoNo for display/search.
  const acms = (memosQ.data || []).map((m) => ({ ...m, rid: m.id, id: m.memoNo, iataNum: m.iataNum || '', bspCreditDate: m.bspDebitDate || '' }));

  const [modal, setModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  // New-ACM currency defaults to the BRANCH's main currency (NBO/DAR/FBM → USD), not a
  // hardcoded INR — else an NBO ACM is saved as INR and drops out of the currency-matched
  // BSP summary. Mirrors the ADM register fix.
  const [form, setForm] = useState({ airline: 'Air India', airlineCode: 'AI', ticketNo: '', reasonCode: 'RC', amount: 0, currency: (brCode && branchMainCurrency(brCode)) || 'INR', branch: brCode || '', remarks: '' });

  const filtered = acms.filter((a) => (
    (statusFilter === 'All' || a.status === statusFilter)
    && (!search || (a.id || '').toLowerCase().includes(search.toLowerCase()) || (a.airline || '').toLowerCase().includes(search.toLowerCase()))
  ));

  // Backend lifecycle: Received → Disputed → Accepted (spawns voucher) / Rejected.
  const STATUSES = ['All', 'Received', 'Disputed', 'Accepted', 'Rejected'];

  const totPending = filtered.filter((a) => !['Accepted', 'Rejected'].includes(a.status)).reduce((s, a) => s + (a.amount || 0), 0);
  const totAccepted = filtered.filter((a) => a.status === 'Accepted').reduce((s, a) => s + (a.amount || 0), 0);
  const f = (n) => cur + Number(Math.round(n)).toLocaleString(localeOf(cur));

  const addAcm = () => {
    createM.mutate({ kind: 'acm', ...form, branch: form.branch }, {
      onSuccess: () => { setModal(false); toast('ACM recorded'); },
      onError: (e) => toast('Could not record — ' + e.message, 'error'),
    });
  };
  const acceptAcm = (m) => acceptM.mutate({ id: m.rid }, {
    onSuccess: (r) => toast(`ACM accepted — voucher ${(r && (r.voucherVno || (r.voucher && r.voucher.vno))) || ''} created (pending approval)`),
    onError: (e) => toast('Could not accept — ' + e.message, 'error'),
  });
  const rejectAcm = (m) => rejectM.mutate({ id: m.rid }, { onSuccess: () => toast('ACM rejected'), onError: (e) => toast(e.message, 'error') });
  // Reverse (un-accept): the memo drives the reverse-out of its locked voucher (viaMaster) →
  // back to Received. Requires a reason (it un-posts real books).
  const reverseAcm = async (m) => {
    const { confirmed, reason } = await confirmDialog({ title: `Reverse ${m.id}?`, message: `This un-accepts the memo and reverses its voucher ${m.voucherVno || ''} out of the books (memo returns to Received; the voucher number is retired).`, danger: true, reasonRequired: true, reasonLabel: 'Reason for reversal', confirmLabel: 'Reverse' });
    if (!confirmed) return;
    reverseM.mutate({ id: m.rid, reason }, { onSuccess: () => toast(`ACM ${m.id} reversed — voucher un-posted`), onError: (e) => toast('Could not reverse — ' + e.message, 'error') });
  };

  const columns = [
    { key: 'id', header: 'ACM Number', className: 'font-mono text-[10px]', render: (a) => <><p className="m-0 font-bold text-[#27500A]">{a.id}</p><p className="m-0 text-[8.5px] text-ink-muted">{a.date}</p></> },
    { key: 'airline', header: 'Airline', render: (a) => <><p className="m-0 font-bold text-ink">{a.airline}</p><p className="m-0 text-[9px] text-ink-muted">IATA {a.iataNum}</p></> },
    { key: 'ticketNo', header: 'Ticket / Reference', className: 'font-mono text-[10px] text-[#185FA5]', render: (a) => a.ticketNo || a.passenger || '—' },
    { key: 'reasonCode', header: 'Reason', render: (a) => { const rc = ACM_REASON_CODES[a.reasonCode] || { label: a.reasonCode }; return <><p className="m-0 text-[10px] font-bold text-[#1D9E75]">{rc.code} — {rc.label}</p><p className="m-0 max-w-[180px] truncate text-[8.5px] text-ink-muted" title={a.remarks}>{a.remarks}</p></>; } },
    { key: 'amount', header: 'Amount', num: true, className: 'font-extrabold text-[13px] text-[#27500A]', render: (a) => `+${cur}${Number(a.amount).toLocaleString(localeOf(cur))}`, footer: (rows) => `+${cur}${Number(rows.reduce((s, a) => s + (a.amount || 0), 0)).toLocaleString(localeOf(cur))}` },
    { key: 'bspCreditDate', header: 'BSP Credit Date', className: 'text-[10.5px] text-ink-muted' },
    { key: 'status', header: 'Status', align: 'center', render: (a) => <StatusPill tone={ACM_TONE[a.status] || 'neutral'} size="sm">{a.status}</StatusPill> },
    {
      key: '__act', header: 'Actions', sortable: false, hideable: false,
      footer: (rows) => `TOTAL — ${rows.length} ACMs`,
      render: (a) => (
        <div className="flex flex-wrap gap-1">
          {['Received', 'Disputed'].includes(a.status) && <Button variant="success" size="xs" write disabled={acceptM.isPending} onClick={() => acceptAcm(a)} title="Accept → create a pending ACM voucher">Accept → Voucher</Button>}
          {a.status === 'Received' && <Button variant="secondary" size="xs" write onClick={() => disputeM.mutate({ id: a.rid, note: 'Query raised on credit' }, { onSuccess: () => toast('Query raised'), onError: (e) => toast(e.message, 'error') })}>Query</Button>}
          {a.status === 'Disputed' && <Button variant="secondary" size="xs" write onClick={() => rejectAcm(a)}>Reject</Button>}
          {a.status === 'Accepted' && a.voucherVno && <span className="text-[9px] font-bold text-[#27500A]">→ {a.voucherVno}</span>}
          {a.status === 'Accepted' && <Button variant="danger" size="xs" write disabled={reverseM.isPending} onClick={() => reverseAcm(a)} title="Reverse (un-accept) → un-post the voucher, memo back to Received">↺ Reverse</Button>}
        </div>
      ),
    },
  ];

  return (
    <PageLayout
      maxWidth="max-w-[1300px] mx-auto"
      title="ACM Register"
      subtitle="Agent Credit Memos · Airline credits to the agency via BSP · Refunds, incentives, ADM reversals"
      actions={
        <>
          <div className="relative">
            <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-subtle" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="ACM no / airline…"
              className={`w-[200px] pl-8 ${search ? 'pr-7' : ''}`} />
            {search && (
              <button type="button" onClick={() => setSearch('')} aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink">×</button>
            )}
          </div>
          <StatusMenu
            ariaLabel="Filter by status"
            menuRole="listbox"
            width={140}
            items={STATUSES.map((s) => ({ key: s, label: s, selected: s === statusFilter, onSelect: () => setStatusFilter(s) }))}
            renderTrigger={({ ref, toggle, triggerProps }) => (
              <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                className="flex h-9 items-center gap-1.5 rounded-md border border-surface-border bg-surface px-3 text-[13px] font-medium text-ink hover:bg-surface-alt">
                {statusFilter}
                <ChevronDown size={13} className="text-ink-subtle" />
              </button>
            )}
          />
          <Button variant="success" size="sm" icon={Plus} onClick={() => setModal(true)}>Record ACM</Button>
        </>
      }
    >
      <ResponsiveGrid min="140px" gap="md" className="mb-3.5">
        <KpiCard label="Total ACMs" value={String(filtered.length)} color="#185FA5" bg="#E6F1FB" />
        <KpiCard label="Pending Credit" value={f(totPending)} color="#854F0B" bg="#FAEEDA" />
        <KpiCard label="Accepted (posted)" value={f(totAccepted)} color="#27500A" bg="#EAF3DE" />
        <KpiCard label="ADM Reversals" value={String(acms.filter((a) => a.reasonCode === 'AR').length)} color="#1D9E75" bg="#EAF3DE" />
        <KpiCard label="Incentive Credits" value={String(acms.filter((a) => ['IC', 'CA'].includes(a.reasonCode)).length)} color="#185FA5" bg="#E6F1FB" />
      </ResponsiveGrid>

      <DataTable
        columns={columns}
        rows={filtered}
        getRowKey={(a) => a.id}
        loading={memosQ.isLoading}
        emptyMessage="No ACMs found"
        stickyHeader
        minWidth="60rem"
        maxHeight="64vh"
      />

      <div className="mt-3 rounded-brand border border-[#C0DD97] bg-[#EAF3DE] px-3.5 py-2.5 text-[10px] text-[#27500A]">
        <b>ACM Types:</b> RC (Refund Credit) — ticket refund processed via BSP ·
        IC (Incentive Credit) — PLACI/volume bonus ·
        CA (Commission Adjustment) — retroactive commission ·
        AR (ADM Reversal) — disputed ADM upheld in agency favour ·
        TC (Tax Credit) — excess tax recovered.
        All ACMs are credited to your next BSP settlement — no action required to receive credit.
      </div>

      {modal && (
        <Modal
          title="Record New ACM"
          onClose={() => setModal(false)}
          maxWidth={500}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setModal(false)}>Cancel</Button>
              <Button variant="success" size="sm" write disabled={!form.branch} title={!form.branch ? 'Select a branch first' : undefined} loading={createM.isPending} onClick={addAcm}>{createM.isPending ? 'Saving…' : 'Record ACM'}</Button>
            </>
          }
        >
          <div className="flex flex-col gap-3 p-4">
            <div className="grid grid-cols-2 gap-2.5">
              <FormField label="Airline"><Input value={form.airline} onChange={(e) => setForm((s) => ({ ...s, airline: e.target.value }))} /></FormField>
              <FormField label="Airline code"><Input className="font-mono" maxLength={2} value={form.airlineCode} onChange={(e) => setForm((s) => ({ ...s, airlineCode: e.target.value.toUpperCase() }))} /></FormField>
            </div>
            <FormField label="Ticket number / Reference"><Input className="font-mono" placeholder="Leave blank for incentive ACMs" value={form.ticketNo} onChange={(e) => setForm((s) => ({ ...s, ticketNo: e.target.value }))} /></FormField>
            <FormField label="Reason code">
              <Select value={form.reasonCode} onChange={(e) => setForm((s) => ({ ...s, reasonCode: e.target.value }))}>
                {Object.values(ACM_REASON_CODES).map((r) => <option key={r.code} value={r.code}>{r.code} — {r.label}</option>)}
              </Select>
            </FormField>
            <div className="rounded-md bg-success-soft px-2.5 py-1.5 text-[9.5px] text-success">{ACM_REASON_CODES[form.reasonCode]?.desc}</div>
            <div className="grid grid-cols-3 gap-2.5">
              <FormField label="Credit amount"><Input type="number" value={form.amount} onChange={(e) => setForm((s) => ({ ...s, amount: +e.target.value }))} /></FormField>
              <FormField label="Currency"><Select value={form.currency} onChange={(e) => setForm((s) => ({ ...s, currency: e.target.value }))}>{branchCurrencies(form.branch).map((c) => <option key={c}>{c}</option>)}</Select></FormField>
              {/* Lock to the selected branch (an ACM belongs to one branch/currency); only the
                  consolidated ALL view offers a picker, and it must force an explicit choice. */}
              <FormField label="Branch">{brCode
                ? <Input value={form.branch} readOnly disabled title="Locked to the selected branch" />
                : <Select value={form.branch} onChange={(e) => setForm((s) => ({ ...s, branch: e.target.value, currency: branchMainCurrency(e.target.value) }))}>
                    <option value="">Select branch…</option>
                    {BRANCH_CODES.map((b) => <option key={b}>{b}</option>)}
                  </Select>}</FormField>
            </div>
            <FormField label="Remarks"><Textarea rows={2} value={form.remarks} onChange={(e) => setForm((s) => ({ ...s, remarks: e.target.value }))} /></FormField>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
}
