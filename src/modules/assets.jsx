/* ════════════════════════════════════════════════════════════════════
   MODULES/ASSETS.JSX
   Fixed-asset & airline-credit-memo screens.

   UI: shared responsive primitives (PageLayout, DataTable, Modal, Button,
   StatusPill, ResponsiveGrid, FormField/Input/Select/Textarea). All business
   logic, hooks, depreciation/IT-block computations and mutations unchanged.
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { Plus, TrendingDown, Landmark, Search, ChevronDown } from 'lucide-react';
import { fmt, localeOf } from '../core/format';
import { ACM_REASON_CODES } from '../core/helpers';
import { useAssetCategories } from '../core/useReference';
import { useMasterList } from '../core/useMasters';
import { useAdmMemos, useCreateAdmMemo, useAcceptAdmMemo, useRejectAdmMemo, useDisputeAdmMemo } from '../core/useAdmMemos';
import { toast } from '../core/ux/toast';
import { Menu as StatusMenu } from '../core/ux/Menu';
import { BRANCH_CODES, branchCurrencies, branchMainCurrency } from '../core/data';
import { bc } from '../core/styles';
import { PageLayout } from '../shell/PageLayout';
import { DataTable } from '../shell/DataTable';
import { Modal, Button, StatusPill, ResponsiveGrid, FormField, Input, Select, Textarea } from '../shell/primitives';

/* Small KPI tile shared by every asset screen. */
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
  const acms = (memosQ.data || []).map((m) => ({ ...m, id: m.memoNo, iataNum: m.iataNum || '', bspCreditDate: m.bspDebitDate || '' }));

  const [modal, setModal] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ airline: 'Air India', airlineCode: 'AI', ticketNo: '', reasonCode: 'RC', amount: 0, currency: 'INR', branch: brCode || 'BOM', remarks: '' });

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
  const acceptAcm = (m) => acceptM.mutate({ id: m.id }, {
    onSuccess: (r) => toast(`ACM accepted — voucher ${(r && (r.voucherVno || (r.voucher && r.voucher.vno))) || ''} created (pending approval)`),
    onError: (e) => toast('Could not accept — ' + e.message, 'error'),
  });
  const rejectAcm = (m) => rejectM.mutate({ id: m.id }, { onSuccess: () => toast('ACM rejected'), onError: (e) => toast(e.message, 'error') });

  const columns = [
    { key: 'id', header: 'ACM Number', className: 'font-mono text-[10px]', render: (a) => <><p className="m-0 font-bold text-[#27500A]">{a.id}</p><p className="m-0 text-[8.5px] text-ink-muted">{a.date}</p></> },
    { key: 'airline', header: 'Airline', render: (a) => <><p className="m-0 font-bold text-ink">{a.airline}</p><p className="m-0 text-[9px] text-ink-muted">IATA {a.iataNum}</p></> },
    { key: 'ticketNo', header: 'Ticket / Reference', className: 'font-mono text-[10px] text-[#185FA5]', render: (a) => a.ticketNo || a.passenger || '—' },
    { key: 'reasonCode', header: 'Reason', render: (a) => { const rc = ACM_REASON_CODES[a.reasonCode] || { label: a.reasonCode }; return <><p className="m-0 text-[10px] font-bold text-[#1D9E75]">{rc.code} — {rc.label}</p><p className="m-0 max-w-[180px] truncate text-[8.5px] text-ink-muted" title={a.remarks}>{a.remarks}</p></>; } },
    { key: 'amount', header: 'Amount', num: true, className: 'font-extrabold text-[13px] text-[#27500A]', render: (a) => `+${a.currency}${Number(a.amount).toLocaleString()}`, footer: (rows) => `+${cur}${Number(rows.reduce((s, a) => s + (a.amount || 0), 0)).toLocaleString()}` },
    { key: 'bspCreditDate', header: 'BSP Credit Date', className: 'text-[10.5px] text-ink-muted' },
    { key: 'status', header: 'Status', align: 'center', render: (a) => <StatusPill tone={ACM_TONE[a.status] || 'neutral'} size="sm">{a.status}</StatusPill> },
    {
      key: '__act', header: 'Actions', sortable: false, hideable: false,
      footer: (rows) => `TOTAL — ${rows.length} ACMs`,
      render: (a) => (
        <div className="flex flex-wrap gap-1">
          {['Received', 'Disputed'].includes(a.status) && <Button variant="success" size="xs" disabled={acceptM.isPending} onClick={() => acceptAcm(a)} title="Accept → create a pending ACM voucher">Accept → Voucher</Button>}
          {a.status === 'Received' && <Button variant="secondary" size="xs" onClick={() => disputeM.mutate({ id: a.id, note: 'Query raised on credit' }, { onSuccess: () => toast('Query raised') })}>Query</Button>}
          {a.status === 'Disputed' && <Button variant="secondary" size="xs" onClick={() => rejectAcm(a)}>Reject</Button>}
          {a.status === 'Accepted' && a.voucherVno && <span className="text-[9px] font-bold text-[#27500A]">→ {a.voucherVno}</span>}
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
              <Button variant="success" size="sm" loading={createM.isPending} onClick={addAcm}>{createM.isPending ? 'Saving…' : 'Record ACM'}</Button>
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
              <FormField label="Branch"><Select value={form.branch} onChange={(e) => setForm((s) => ({ ...s, branch: e.target.value, currency: branchMainCurrency(e.target.value) }))}>{BRANCH_CODES.map((b) => <option key={b}>{b}</option>)}</Select></FormField>
            </div>
            <FormField label="Remarks"><Textarea rows={2} value={form.remarks} onChange={(e) => setForm((s) => ({ ...s, remarks: e.target.value }))} /></FormField>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
}

/* ════════════════════════════════════════════════════════════════
   FIXED ASSET REGISTER  /assets
   ════════════════════════════════════════════════════════════════ */
export function FixedAssetRegister({ branch, setRoute }) {
  const ASSET_CATEGORIES = useAssetCategories().data || [];   // DB-backed (/api/asset-categories)
  const cfg = bc(branch);
  const cur = cfg.cur;
  const brCode = branch === 'ALL' ? null : branch?.code;
  const [catFilter, setCatFilter] = useState('ALL');
  const [statusFilter] = useState('Active');
  const [, setShowAdd] = useState(false);

  const FIXED_ASSETS_DATA = (useMasterList('fixed-assets').data || []).map((a) => ({ ...a, id: a.assetId || a.id })); // live /api/fixed-assets
  const visible = FIXED_ASSETS_DATA.filter((a) => (!brCode || a.branch === brCode) && (catFilter === 'ALL' || a.code === catFilter) && (statusFilter === 'ALL' || a.status === statusFilter));

  const totCost = visible.reduce((s, a) => s + a.cost, 0);
  const totWdv = visible.reduce((s, a) => s + a.wdv, 0);
  const totDepYtd = totCost - totWdv;
  const catCount = new Set(visible.map((a) => a.code)).size;

  const columns = [
    { key: 'id', header: 'Asset ID', className: 'font-mono text-[10px] text-[#185FA5]' },
    { key: 'name', header: 'Description', className: 'font-semibold text-ink' },
    { key: 'code', header: 'Category', className: 'text-ink-muted', render: (a) => (ASSET_CATEGORIES.find((c) => c.code === a.code) || {}).name || a.code },
    { key: 'branch', header: 'Branch', align: 'center', className: 'text-ink-muted' },
    { key: 'purchaseDate', header: 'Purchase', align: 'center', className: 'text-[10px] text-ink-muted' },
    { key: 'cost', header: 'Cost', num: true, className: 'font-semibold', render: (a) => cur + fmt(a.cost), footer: () => cur + fmt(totCost) },
    { key: 'method', header: 'Method', align: 'center', render: (a) => <span className={`text-[10px] font-semibold ${a.method === 'WDV' ? 'text-[#854F0B]' : 'text-[#185FA5]'}`}>{a.method}</span> },
    { key: 'wdv', header: 'WDV', num: true, className: 'font-semibold text-[#27500A]', render: (a) => cur + fmt(a.wdv), footer: () => cur + fmt(totWdv) },
    { key: 'status', header: 'Status', align: 'center', render: (a) => <StatusPill tone={a.status === 'Active' ? 'success' : 'danger'} size="sm">{a.status}</StatusPill> },
  ];

  return (
    <PageLayout
      maxWidth="max-w-[1400px] mx-auto"
      title="Fixed Asset Register"
      subtitle="Asset master · Auto-depreciation · Disposal · IT Act block reporting"
      actions={
        <>
          <Button variant="secondary" size="sm" icon={TrendingDown} onClick={() => setRoute && setRoute('/assets/depreciation')}>Depreciation Schedule</Button>
          <Button variant="secondary" size="sm" icon={Landmark} onClick={() => setRoute && setRoute('/assets/blocks')}>Block of Assets</Button>
          <Button variant="accent" size="sm" icon={Plus} onClick={() => setShowAdd(true)}>Add Asset</Button>
        </>
      }
    >
      <ResponsiveGrid cols={4} gap="md" className="mb-3.5">
        <KpiCard label="Gross Block" value={cur + fmt(totCost)} color="#185FA5" sub={`${visible.length} assets`} />
        <KpiCard label="Net Block (WDV)" value={cur + fmt(totWdv)} color="#27500A" valueColor="#27500A" sub="After depreciation" />
        <KpiCard label="Accumulated Dep." value={cur + fmt(totDepYtd)} color="#A32D2D" valueColor="#A32D2D" sub={`${((totDepYtd / totCost) * 100 || 0).toFixed(1)}% of gross`} />
        <KpiCard label="Categories" value={String(catCount)} color="#854F0B" valueColor="#854F0B" sub={`of ${ASSET_CATEGORIES.length} blocks`} />
      </ResponsiveGrid>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] text-ink-muted">Category:</span>
        {['ALL', ...ASSET_CATEGORIES.map((c) => c.code)].map((c) => (
          <button key={c} onClick={() => setCatFilter(c)}
            className={`rounded-full border px-2.5 py-1 text-[10.5px] font-semibold transition ${catFilter === c ? 'border-navy bg-navy text-gold' : 'border-surface-border bg-surface text-ink-muted hover:bg-surface-alt'}`}>
            {c === 'ALL' ? 'All' : c}
          </button>
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={visible}
        getRowKey={(a) => a.id}
        emptyMessage="No assets for this filter."
        stickyHeader
        minWidth="56rem"
        maxHeight="62vh"
      />

      <p className="mt-3.5 text-[10.5px] italic text-ink-muted">
        💡 SLM = Straight Line Method · WDV = Written Down Value · IT Act block rates apply for tax depreciation. Companies Act rates for book depreciation.
      </p>
    </PageLayout>
  );
}

/* ════════════════════════════════════════════════════════════════
   DEPRECIATION SCHEDULE  /assets/depreciation
   ════════════════════════════════════════════════════════════════ */
export function AssetDepreciation({ branch }) {
  const ASSET_CATEGORIES = useAssetCategories().data || [];   // DB-backed (/api/asset-categories)
  const cfg = bc(branch);
  const cur = cfg.cur;
  const brCode = branch === 'ALL' ? null : branch?.code;
  const [period, setPeriod] = useState('2026-05');

  const FIXED_ASSETS_DATA = (useMasterList('fixed-assets').data || []).map((a) => ({ ...a, id: a.assetId || a.id })); // live /api/fixed-assets
  const assets = FIXED_ASSETS_DATA.filter((a) => (!brCode || a.branch === brCode) && a.status === 'Active');

  // compute monthly depreciation per asset
  const schedule = assets.map((a) => {
    const cat = ASSET_CATEGORIES.find((c) => c.code === a.code) || {};
    const rate = cat.coRate || 10;
    const monthlyDep = a.method === 'SLM' ? ((a.cost - a.salvage) * (rate / 100)) / 12 : (a.wdv * (rate / 100)) / 12;
    return { ...a, rate, monthlyDep, annualDep: monthlyDep * 12, catName: cat.name || a.code };
  });

  const totMonthly = schedule.reduce((s, a) => s + a.monthlyDep, 0);
  const totAnnual = schedule.reduce((s, a) => s + a.annualDep, 0);
  const totCost = assets.reduce((s, a) => s + a.cost, 0);
  const totWdv = assets.reduce((s, a) => s + a.wdv, 0);

  const columns = [
    { key: 'name', header: 'Asset', className: 'font-semibold text-ink', render: (a) => <>{a.name}<div className="text-[9.5px] font-normal text-ink-muted">{a.id} · {a.branch}</div></>, footer: () => 'TOTAL' },
    { key: 'method', header: 'Method', align: 'center', render: (a) => <span className={`text-[10px] font-semibold ${a.method === 'WDV' ? 'text-[#854F0B]' : 'text-[#185FA5]'}`}>{a.method}</span> },
    { key: 'rate', header: 'Rate %', align: 'center', render: (a) => `${a.rate.toFixed(2)}%` },
    { key: 'wdv', header: 'Opening WDV', num: true, render: (a) => cur + fmt(a.wdv) },
    { key: 'monthlyDep', header: 'Monthly Dep.', num: true, className: 'font-semibold text-[#A32D2D]', render: (a) => cur + fmt(Math.round(a.monthlyDep)), footer: () => cur + fmt(Math.round(totMonthly)) },
    { key: 'annualDep', header: 'Annual Dep.', num: true, className: 'font-semibold', render: (a) => cur + fmt(Math.round(a.annualDep)), footer: () => cur + fmt(Math.round(totAnnual)) },
    { key: 'closing', header: 'Closing WDV', num: true, className: 'font-semibold text-[#27500A]', sortable: false, render: (a) => cur + fmt(Math.round(a.wdv - a.monthlyDep)), footer: () => cur + fmt(Math.round(totWdv - totMonthly)) },
  ];

  return (
    <PageLayout
      maxWidth="max-w-[1400px] mx-auto"
      title="Depreciation Schedule"
      subtitle="Monthly & annual depreciation · Companies Act rates · Auto-posts JV at month-end"
      actions={
        <>
          <div className="w-30">
            <StatusMenu
              ariaLabel="Period"
              menuRole="listbox"
              width={140}
              items={[
                { key: '2026-05', label: 'May 2026', selected: period === '2026-05', onSelect: () => setPeriod('2026-05') },
                { key: '2026-04', label: 'Apr 2026', selected: period === '2026-04', onSelect: () => setPeriod('2026-04') },
                { key: '2026-03', label: 'Mar 2026', selected: period === '2026-03', onSelect: () => setPeriod('2026-03') },
              ]}
              renderTrigger={({ ref, toggle, triggerProps }) => (
                <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                  className="flex h-9 w-full items-center justify-between gap-1.5 rounded-md border border-surface-border bg-surface px-3 text-[13px] font-medium text-ink hover:bg-surface-alt">
                  {{ '2026-05': 'May 2026', '2026-04': 'Apr 2026', '2026-03': 'Mar 2026' }[period]}
                  <ChevronDown size={13} className="text-ink-subtle" />
                </button>
              )}
            />
          </div>
          <Button variant="accent" size="sm">Post Depreciation JV</Button>
        </>
      }
    >
      <ResponsiveGrid cols={4} gap="md" className="mb-3.5">
        <KpiCard label="Monthly Dep." value={cur + fmt(Math.round(totMonthly))} color="#185FA5" valueColor="#185FA5" />
        <KpiCard label="Annual Dep." value={cur + fmt(Math.round(totAnnual))} color="#A32D2D" valueColor="#A32D2D" />
        <KpiCard label="Total WDV" value={cur + fmt(totWdv)} color="#27500A" valueColor="#27500A" />
        <KpiCard label="Gross Block" value={cur + fmt(totCost)} color="#854F0B" valueColor="#854F0B" />
      </ResponsiveGrid>

      <DataTable
        columns={columns}
        rows={schedule}
        getRowKey={(a) => a.id}
        emptyMessage="No active assets to depreciate."
        stickyHeader
        minWidth="52rem"
        maxHeight="62vh"
      />
    </PageLayout>
  );
}

/* ════════════════════════════════════════════════════════════════
   ASSET DISPOSAL & TRANSFER  /assets/disposal
   ════════════════════════════════════════════════════════════════ */
const DISPOSAL_TONE = { Sold: 'success', Transferred: 'info' };
export function AssetDisposal({ branch }) {
  const cfg = bc(branch);
  const cur = cfg.cur;

  // No live asset-disposal register exists yet (the fixed-assets master tracks assets,
  // not disposals). Previously this held 3 fabricated rows whose gains fed the
  // Capital-Gain-YTD / Net-P&L KPIs as if real — emptied so the KPIs read an honest ₹0
  // until a disposal source is wired. (Other screens in this file are already live.)
  const DISPOSALS = [];

  const totGain = DISPOSALS.reduce((s, d) => s + (d.gain > 0 ? d.gain : 0), 0);
  const totLoss = DISPOSALS.reduce((s, d) => s + (d.gain < 0 ? Math.abs(d.gain) : 0), 0);

  const columns = [
    { key: 'id', header: 'Disposal ID', className: 'font-mono text-[10px] text-[#185FA5]' },
    { key: 'name', header: 'Asset', className: 'font-semibold', render: (d) => <>{d.name}<div className="text-[9.5px] text-ink-muted">{d.assetId}</div></> },
    { key: 'disposalDate', header: 'Date', align: 'center', className: 'text-[10px]' },
    { key: 'method', header: 'Type', align: 'center', render: (d) => <StatusPill tone={DISPOSAL_TONE[d.method] || 'warning'} size="sm">{d.method}</StatusPill> },
    { key: 'bookValue', header: 'Book Value', num: true, render: (d) => cur + fmt(d.bookValue) },
    { key: 'saleValue', header: 'Sale Value', num: true, render: (d) => cur + fmt(d.saleValue) },
    { key: 'gain', header: 'Gain/(Loss)', num: true, render: (d) => <span className="font-bold" style={{ color: d.gain > 0 ? '#27500A' : d.gain < 0 ? '#A32D2D' : '#5a6691' }}>{d.gain > 0 ? '+' : ''}{cur + fmt(d.gain)}</span> },
    { key: 'buyer', header: 'Buyer/Notes', className: 'text-[10px] text-ink-muted' },
  ];

  return (
    <PageLayout
      maxWidth="max-w-[1400px] mx-auto"
      title="Asset Disposal & Transfer"
      subtitle="Sale · Scrap · Inter-branch transfer · Auto capital gain/loss calc"
    >
      <ResponsiveGrid cols={4} gap="md" className="mb-3.5">
        <KpiCard label="Capital Gain YTD" value={cur + fmt(totGain)} color="#27500A" valueColor="#27500A" />
        <KpiCard label="Capital Loss YTD" value={cur + fmt(totLoss)} color="#A32D2D" valueColor="#A32D2D" />
        <KpiCard label="Disposals" value={String(DISPOSALS.length)} color="#185FA5" valueColor="#185FA5" />
        <KpiCard label="Net P&L" value={cur + fmt(totGain - totLoss)} color="#854F0B" valueColor={totGain - totLoss >= 0 ? '#27500A' : '#A32D2D'} />
      </ResponsiveGrid>

      <DataTable
        columns={columns}
        rows={DISPOSALS}
        getRowKey={(d) => d.id}
        emptyMessage="No disposals recorded."
        stickyHeader
        minWidth="52rem"
        maxHeight="62vh"
      />
    </PageLayout>
  );
}

/* ════════════════════════════════════════════════════════════════
   BLOCK OF ASSETS — INCOME TAX ACT  /assets/blocks
   ════════════════════════════════════════════════════════════════ */
export function BlockOfAssets({ branch }) {
  const ASSET_CATEGORIES = useAssetCategories().data || [];   // DB-backed (/api/asset-categories)
  const FIXED_ASSETS_DATA = (useMasterList('fixed-assets').data || []).map((a) => ({ ...a, id: a.assetId || a.id })); // live /api/fixed-assets
  const cfg = bc(branch);
  const cur = cfg.cur;
  const brCode = branch === 'ALL' ? null : branch?.code;

  const assets = FIXED_ASSETS_DATA.filter((a) => !brCode || a.branch === brCode);

  // group by IT Act block
  const blocks = ASSET_CATEGORIES.map((cat) => {
    const blkAssets = assets.filter((a) => a.code === cat.code);
    const opening = blkAssets.reduce((s, a) => s + a.cost, 0);
    const wdv = blkAssets.reduce((s, a) => s + a.wdv, 0);
    const itDep = opening * (cat.itRate / 100);
    return { ...cat, assets: blkAssets.length, opening, wdv, itDep, closing: Math.max(0, wdv - itDep) };
  }).filter((b) => b.assets > 0);

  const totOpening = blocks.reduce((s, b) => s + b.opening, 0);
  const totItDep = blocks.reduce((s, b) => s + b.itDep, 0);

  const columns = [
    { key: 'block', header: 'IT Block', className: 'font-semibold', render: (b) => <>{b.block}<div className="text-[9.5px] font-normal text-ink-muted">{b.name}</div></>, footer: () => 'TOTAL' },
    { key: 'itRate', header: 'IT Rate', align: 'center', className: 'font-bold text-[#854F0B]', render: (b) => `${b.itRate}%` },
    { key: 'assets', header: 'Assets', align: 'center' },
    { key: 'opening', header: 'Opening WDV', num: true, render: (b) => cur + fmt(b.opening), footer: () => cur + fmt(totOpening) },
    { key: 'additions', header: 'Additions', num: true, sortable: false, className: 'text-[#27500A]', render: () => '—' },
    { key: 'deletions', header: 'Deletions', num: true, sortable: false, className: 'text-[#A32D2D]', render: () => '—' },
    { key: 'itDep', header: 'IT Depreciation', num: true, className: 'font-semibold text-[#A32D2D]', render: (b) => cur + fmt(Math.round(b.itDep)), footer: () => cur + fmt(Math.round(totItDep)) },
    { key: 'closing', header: 'Closing WDV', num: true, className: 'font-semibold text-[#27500A]', render: (b) => cur + fmt(Math.round(b.closing)), footer: () => cur + fmt(Math.round(totOpening - totItDep)) },
  ];

  return (
    <PageLayout
      maxWidth="max-w-[1400px] mx-auto"
      title="Block of Assets — Income Tax Act"
      subtitle="Section 32 block-wise depreciation for tax computation · Different from Companies Act rates"
    >
      <ResponsiveGrid cols={4} gap="md" className="mb-3.5">
        <KpiCard label="IT Act Dep." value={cur + fmt(Math.round(totItDep))} color="#854F0B" valueColor="#854F0B" sub="FY 2025-26 · WDV method" />
        <KpiCard label="Blocks Active" value={String(blocks.length)} color="#185FA5" valueColor="#185FA5" />
        <KpiCard label="Gross Block" value={cur + fmt(totOpening)} color="#27500A" valueColor="#27500A" />
        <KpiCard label="Tax vs Book Diff" value={cur + fmt(Math.round(totItDep * 0.2))} color="#A32D2D" valueColor="#A32D2D" sub="Deferred tax impact" />
      </ResponsiveGrid>

      <DataTable
        columns={columns}
        rows={blocks}
        getRowKey={(b) => b.code}
        emptyMessage="No active blocks."
        stickyHeader
        minWidth="56rem"
        maxHeight="62vh"
      />
    </PageLayout>
  );
}
