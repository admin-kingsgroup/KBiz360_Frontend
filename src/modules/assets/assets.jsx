/* ════════════════════════════════════════════════════════════════════
   MODULES/ASSETS.JSX
   Fixed-asset screens.
   BUSINESS SUB-MODULE REORG (2026-07-13): AcmRegister (airline credit memo
   register) moved to modules/accounts/bsp-airline/acmRegister.jsx (matching
   the nav menu's MENU_ACCOUNTS ▸ BSP & Airline group) — this file keeps only
   the Admin ▸ Assets screens (fixed asset register, depreciation, disposal,
   block of assets), which are a separate business module.

   UI: shared responsive primitives (PageLayout, DataTable, Modal, Button,
   StatusPill, ResponsiveGrid, FormField/Input/Select). All business
   logic, hooks, depreciation/IT-block computations and mutations unchanged.
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { Plus, TrendingDown, Landmark, ChevronDown } from 'lucide-react';
import { fmt } from '../../core/format';
import { useQueryClient } from '@tanstack/react-query';
import { useAssetCategories } from '../../core/useReference';
import { useMasterList, useMasterMutations } from '../../core/useMasters';
import { toast } from '../../core/ux/toast';
import { Menu as StatusMenu } from '../../core/ux/Menu';
import { BRANCH_CODES } from '../../core/data';
import { bc } from '../../core/styles';
import { PageLayout } from '../../shell/PageLayout';
import { DataTable } from '../../shell/DataTable';
import { Modal, Button, StatusPill, ResponsiveGrid, FormField, Input, Select } from '../../shell/primitives';

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

  // Add Asset — persists to /api/fixed-assets (the button used to discard its own
  // state, so nothing could ever be registered from this screen). A category can be
  // created inline because there is no separate asset-category master screen.
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const { create: createAsset } = useMasterMutations('fixed-assets');
  const { create: createCategory } = useMasterMutations('asset-categories');
  const NEW_CAT = '__new__';
  const blankAsset = { name: '', code: '', purchaseDate: '', cost: 0, method: 'WDV', branch: brCode || '', newCatCode: '', newCatName: '', newCatRate: 15 };
  const [af, setAf] = useState(blankAsset);

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

      {showAdd && (
        <Modal title="Add Asset" onClose={() => setShowAdd(false)} maxWidth={540}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setShowAdd(false)}>Cancel</Button>
              <Button variant="accent" size="sm" write disabled={createAsset.isPending || createCategory.isPending} onClick={async () => {
                if (!af.name.trim()) { toast('Asset description is required', 'error'); return; }
                if (!af.code) { toast('Pick or create an asset category', 'error'); return; }
                if (!(+af.cost > 0)) { toast('Cost must be greater than 0', 'error'); return; }
                let code = af.code;
                try {
                  if (code === NEW_CAT) {
                    if (!af.newCatCode.trim() || !af.newCatName.trim()) { toast('New category needs a code and a name', 'error'); return; }
                    code = af.newCatCode.trim().toUpperCase();
                    await createCategory.mutateAsync({ code, name: af.newCatName.trim(), itRate: +af.newCatRate || 0, coRate: +af.newCatRate || 0, active: true });
                    qc.invalidateQueries({ queryKey: ['ref', 'asset-categories'] });
                  }
                  const n = FIXED_ASSETS_DATA.filter((a) => a.branch === af.branch).length + 1;
                  await createAsset.mutateAsync({
                    assetId: `FA-${af.branch}-${String(n).padStart(3, '0')}`,
                    name: af.name.trim(), code, branch: af.branch,
                    purchaseDate: af.purchaseDate, cost: +af.cost, method: af.method,
                    wdv: +af.cost, salvage: 0, status: 'Active',
                  });
                  toast('Asset registered');
                  setShowAdd(false); setAf(blankAsset);
                } catch (e) { toast('Could not save — ' + (e?.message || 'unknown error'), 'error'); }
              }}>💾 Save Asset</Button>
            </>
          }>
          <div className="grid gap-3 p-4">
            <FormField label="Description"><Input value={af.name} onChange={(e) => setAf((s) => ({ ...s, name: e.target.value }))} placeholder="e.g. Office laptop — Dell Latitude" /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Category (IT block)">
                <Select value={af.code} onChange={(e) => setAf((s) => ({ ...s, code: e.target.value }))}>
                  <option value="">Select…</option>
                  {ASSET_CATEGORIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                  <option value={NEW_CAT}>+ New category…</option>
                </Select>
              </FormField>
              <FormField label="Branch">
                <Select value={af.branch} onChange={(e) => setAf((s) => ({ ...s, branch: e.target.value }))}>
                  {BRANCH_CODES.map((b) => <option key={b}>{b}</option>)}
                </Select>
              </FormField>
            </div>
            {af.code === NEW_CAT && (
              <div className="grid grid-cols-3 gap-3 rounded-md border border-surface-border bg-surface-alt/50 p-2.5">
                <FormField label="New code"><Input value={af.newCatCode} onChange={(e) => setAf((s) => ({ ...s, newCatCode: e.target.value }))} placeholder="e.g. COMP" /></FormField>
                <FormField label="New category name"><Input value={af.newCatName} onChange={(e) => setAf((s) => ({ ...s, newCatName: e.target.value }))} placeholder="e.g. Computers" /></FormField>
                <FormField label="Dep. rate %"><Input type="number" value={af.newCatRate} onChange={(e) => setAf((s) => ({ ...s, newCatRate: e.target.value }))} /></FormField>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Purchase date"><Input type="date" value={af.purchaseDate} onChange={(e) => setAf((s) => ({ ...s, purchaseDate: e.target.value }))} /></FormField>
              <FormField label={`Cost (${cur})`}><Input type="number" value={af.cost} onChange={(e) => setAf((s) => ({ ...s, cost: e.target.value }))} /></FormField>
              <FormField label="Method">
                <Select value={af.method} onChange={(e) => setAf((s) => ({ ...s, method: e.target.value }))}>
                  <option>WDV</option><option>SLM</option>
                </Select>
              </FormField>
            </div>
          </div>
        </Modal>
      )}
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
