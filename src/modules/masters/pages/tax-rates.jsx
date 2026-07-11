/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Tax / HSN-SAC Codes — India GST (live CRUD) · TDS/TCS · VAT.
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. India GST HSN/SAC is a live, editable master
   (useMasterList/useMasterMutations on 'hsn-codes') — create/update/delete
   logic is unchanged; built-in defaults show until the master is seeded.
   Each tab is a DataTable (sort/sticky/export/mobile scroll); the editor is
   the shared Modal with FormField inputs.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Ban, RotateCcw } from 'lucide-react';
import { confirmDialog } from '../../../core/ux/confirm';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { PageLayout } from '../../../shell/PageLayout';
import { DataTable } from '../../../shell/DataTable';
import { Modal, Button, Input, Select, FormField, StatusPill } from '../../../shell/primitives';

const MODULE_OPTS = ['Flight', 'Holiday', 'Hotel', 'Car', 'Visa', 'Insurance', 'Misc'];
const ITC_OPTS = ['Yes', 'No', 'Varies'];
const rateColor = { 0: '#5b616e', 5: '#16a34a', 12: '#d97706', 18: '#dc2626' };
const rateBg = { 0: '#f3f4f8', 5: '#e8f6ed', 12: '#fbeedb', 18: '#fbe9e9' };
const blankHsn = { code: '', service: '', module: 'Flight', basis: '', rate: 0, itc: 'Yes', tcs: 'No', active: true };

const GST_DEFAULTS = [
  { id: 1, sac: '996421', service: 'Flight Tickets — Domestic', module: 'Flight', basis: 'Service charge only', rate: 18, itc: 'Yes', tcs: 'No' },
  { id: 2, sac: '996422', service: 'Flight Tickets — International', module: 'Flight', basis: 'Service charge only', rate: 18, itc: 'Yes', tcs: 'No' },
  { id: 3, sac: '998555', service: 'Holiday Package — Tour Operator', module: 'Holiday', basis: 'Full package value', rate: 5, itc: 'No', tcs: '5% overseas >7L' },
  { id: 4, sac: '998555', service: 'Holiday Package — Agent Scheme', module: 'Holiday', basis: 'Service charge', rate: 18, itc: 'Yes', tcs: '5% overseas >7L' },
  { id: 5, sac: '996311', service: 'Hotel — Tariff < ₹1,000/night', module: 'Hotel', basis: 'Room charge', rate: 0, itc: 'No', tcs: 'No' },
  { id: 6, sac: '996311', service: 'Hotel — ₹1,000–₹7,500/night', module: 'Hotel', basis: 'Room charge', rate: 12, itc: 'Yes', tcs: 'No' },
  { id: 7, sac: '996311', service: 'Hotel — Above ₹7,500/night', module: 'Hotel', basis: 'Room charge', rate: 18, itc: 'Yes', tcs: 'No' },
  { id: 8, sac: '996601', service: 'Car Rental — With Driver', module: 'Car', basis: 'Hire charges', rate: 5, itc: 'No', tcs: 'No' },
  { id: 9, sac: '996601', service: 'Car Rental — B2B Aggregator', module: 'Car', basis: 'Hire charges', rate: 12, itc: 'Yes', tcs: 'No' },
  { id: 10, sac: '998212', service: 'Visa Processing Service Charge', module: 'Visa', basis: 'Service fee only', rate: 18, itc: 'Yes', tcs: 'No' },
  { id: 11, sac: '997131', service: 'Travel Insurance Premium', module: 'Insurance', basis: 'Full premium', rate: 18, itc: 'No', tcs: 'No' },
  { id: 12, sac: 'Various', service: 'Miscellaneous Services', module: 'Misc', basis: 'Per item', rate: 0, itc: 'Varies', tcs: 'No' },
];
const VAT_BRANCH_OPTS = ['NBO', 'DAR', 'FBM'];
const INPUT_OPTS = ['Yes', 'No', 'Varies'];
const blankVat = { branch: 'NBO', rate: 16, authority: '', tin: '', deadline: '', input: 'Yes', wht: '2%', currency: 'USD', active: true };
// Built-in defaults shown until the VAT master is seeded (rates mirror taxRegime).
const VAT_DEFAULTS = [
  { branch: 'NBO', rate: 16, authority: 'Kenya Revenue Authority (KRA)', tin: '', deadline: '20th of following month', input: 'Yes', wht: '2%' },
  { branch: 'DAR', rate: 18, authority: 'Tanzania Revenue Authority (TRA)', tin: '', deadline: '20th of following month', input: 'Yes', wht: '2%' },
  { branch: 'FBM', rate: 16, authority: 'DGI (DR Congo)', tin: '', deadline: '15th of following month', input: 'Yes', wht: '2%' },
];
const TCS_TDS = [
  { section: '206C(1G)', nature: 'TCS', rate: '5%', threshold: 'Rs.7L/buyer/year', applicability: 'Overseas tour package collection from buyer' },
  { section: '194C', nature: 'TDS', rate: '1%/2%', threshold: 'Rs.30K/txn or Rs.1L/year', applicability: 'Car hire payments: 1% individual, 2% company' },
  { section: '194H', nature: 'TDS', rate: '2%', threshold: 'Rs.15K/year', applicability: 'Commission paid to airlines/sub-agents' },
  { section: '194J', nature: 'TDS', rate: '10%', threshold: 'Rs.30K/year', applicability: 'Professional fees (CA, lawyer, consultant)' },
  { section: '194D', nature: 'TDS', rate: '5%', threshold: 'Rs.15K/year', applicability: 'Commission received from insurance company' },
  { section: '194I', nature: 'TDS', rate: '10%', threshold: 'Rs.2.4L/year', applicability: 'Office/premises rent payments' },
];

export function MastersTaxRates() {
  const [tab, setTab] = useState('gst');
  const [search, setSearch] = useState('');
  const gstQ = useMasterList('hsn-codes');
  const gstMut = useMasterMutations('hsn-codes');
  const vatQ = useMasterList('vat-rates');
  const vatMut = useMasterMutations('vat-rates');
  const [editing, setEditing] = useState(null);
  const [formErr, setFormErr] = useState('');
  const [editVat, setEditVat] = useState(null);
  const [vatErr, setVatErr] = useState('');

  const openNewHsn = () => { setFormErr(''); setEditing({ __new: true, ...blankHsn }); };
  const openEditHsn = (r) => { setFormErr(''); setEditing({ ...blankHsn, ...r }); };
  const setF = (k, v) => setEditing((f) => ({ ...f, [k]: v }));
  const saveHsn = () => {
    if (!editing.code || !editing.service) { setFormErr('HSN/SAC code and Service are required'); return; }
    setFormErr('');
    const { __new, id, ...body } = editing;
    const onError = (e) => setFormErr(e.message || 'Save failed');
    if (__new) gstMut.create.mutate(body, { onSuccess: () => setEditing(null), onError });
    else gstMut.update.mutate({ id, body }, { onSuccess: () => setEditing(null), onError });
  };
  const delHsn = async (r) => { const { confirmed } = await confirmDialog({ title: `Delete HSN/SAC "${r.code} — ${r.service}"?`, danger: true, confirmLabel: 'Delete' }); if (confirmed) gstMut.remove.mutate(r.id); };
  const savingHsn = gstMut.create.isPending || gstMut.update.isPending;
  // Deactivate = safe alternative to delete: the code stays on record (and on old
  // invoices) but is flagged Inactive; the toggle reverses it any time.
  const toggleRow = async (mut, r, label) => {
    const makeActive = r.active === false;
    if (!makeActive) {
      const { confirmed } = await confirmDialog({ title: `Deactivate ${label}?`, message: 'The record is kept with its history but flagged Inactive. You can reactivate it any time.', confirmLabel: 'Deactivate' });
      if (!confirmed) return;
    }
    mut.update.mutate({ id: r.id, body: { active: makeActive } });
  };
  const inactivePill = <span className="ml-1.5 rounded-full bg-[#f3f4f8] px-2 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-[#5b616e]">Inactive</span>;

  // ── Africa VAT (live CRUD, mirrors the GST tab; VAT is one rate per branch) ──
  const openNewVat = () => { setVatErr(''); setEditVat({ __new: true, ...blankVat }); };
  const openEditVat = (r) => { setVatErr(''); setEditVat({ ...blankVat, ...r }); };
  const setV = (k, v) => setEditVat((f) => ({ ...f, [k]: v }));
  const saveVat = () => {
    if (!editVat.branch) { setVatErr('Branch is required'); return; }
    if (!(Number(editVat.rate) >= 0)) { setVatErr('VAT rate must be a number'); return; }
    setVatErr('');
    const { __new, id, ...body } = editVat;
    body.rate = Number(body.rate);
    const onError = (e) => setVatErr(e.message || 'Save failed');
    if (__new) vatMut.create.mutate(body, { onSuccess: () => setEditVat(null), onError });
    else vatMut.update.mutate({ id, body }, { onSuccess: () => setEditVat(null), onError });
  };
  const delVat = async (r) => { const { confirmed } = await confirmDialog({ title: `Delete VAT rate for "${r.branch}"?`, danger: true, confirmLabel: 'Delete' }); if (confirmed) vatMut.remove.mutate(r.id); };
  const savingVat = vatMut.create.isPending || vatMut.update.isPending;

  const liveVat = vatQ.data;
  const vatRows = (liveVat && liveVat.length) ? liveVat : VAT_DEFAULTS;

  const liveHsn = gstQ.data;
  const gstRows = (liveHsn && liveHsn.length) ? liveHsn : GST_DEFAULTS.map((r) => ({ ...r, code: r.sac }));
  const filt_g = gstRows.filter((r) => !search || (r.service || '').toLowerCase().includes(search.toLowerCase()) || (r.code || '').includes(search) || (r.module || '').toLowerCase().includes(search.toLowerCase()));

  const gstColumns = [
    { key: 'code', header: 'HSN / SAC Code', className: 'font-mono font-bold text-[#2563eb]', hideable: false },
    { key: 'service', header: 'Service', className: 'text-navy', render: (r, v) => <>{v}{r.active === false && inactivePill}</> },
    { key: 'module', header: 'Module', render: (r, v) => (v ? <StatusPill tone="info" size="sm">{v}</StatusPill> : null) },
    { key: 'basis', header: 'Taxable Basis', className: 'text-ink-muted' },
    { key: 'rate', header: 'GST %', num: true, align: 'center', render: (r, v) => <span className="rounded-full px-2 py-0.5 text-[11px] font-extrabold" style={{ background: rateBg[v] || '#f3f4f8', color: rateColor[v] || '#5b616e' }}>{v}%</span> },
    { key: 'itc', header: 'ITC', align: 'center', render: (r, v) => <span className="text-[10px] font-bold" style={{ color: v === 'Yes' ? '#16a34a' : v === 'No' ? '#dc2626' : '#d97706' }}>{v}</span> },
    { key: 'tcs', header: 'TCS', align: 'center', className: 'text-[10px]', render: (r, v) => <span style={{ color: v !== 'No' ? '#d97706' : '#cbd0db' }}>{v}</span> },
    { key: '__act', header: '', align: 'right', sortable: false, exportable: false, hideable: false, render: (r) => (r.id ? (
      <span className="inline-flex gap-1">
        <button onClick={() => openEditHsn(r)} title="Edit" className="p-1 text-[#2563eb] hover:text-[#134d85]"><Pencil size={14} /></button>
        {r.active === false
          ? <button onClick={() => toggleRow(gstMut, r, `HSN/SAC "${r.code}"`)} title="Reactivate" className="p-1 text-[#16a34a] hover:opacity-80"><RotateCcw size={14} /></button>
          : <button onClick={() => toggleRow(gstMut, r, `HSN/SAC "${r.code}"`)} title="Deactivate — keeps the record and its history; use instead of Delete" className="p-1 text-[#b45309] hover:opacity-80"><Ban size={14} /></button>}
        <button onClick={() => delHsn(r)} title="Delete" className="p-1 text-maroon hover:opacity-80"><Trash2 size={14} /></button>
      </span>
    ) : <span title="Built-in default — seed the HSN/SAC master to edit (npm run seed:hsn)" className="text-ink-subtle">🔒</span>) },
  ];
  const tcsColumns = [
    { key: 'section', header: 'Section', className: 'font-mono font-extrabold text-[#2563eb]', hideable: false },
    { key: 'nature', header: 'Nature', render: (r, v) => <StatusPill tone={v === 'TCS' ? 'warning' : 'info'} size="sm">{v}</StatusPill> },
    { key: 'rate', header: 'Rate', className: 'font-bold text-navy' },
    { key: 'threshold', header: 'Threshold', className: 'text-ink-muted' },
    { key: 'applicability', header: 'When it applies', className: 'text-role-hr' },
  ];
  const vatColumns = [
    { key: 'branch', header: 'Branch', className: 'font-bold text-navy', hideable: false, render: (r, v) => <>{v}{r.active === false && inactivePill}</> },
    { key: 'rate', header: 'VAT %', num: true, align: 'center', render: (r, v) => <span className="rounded-full bg-[#e8f6ed] px-2 py-0.5 text-[11px] font-extrabold text-[#16a34a]">{v}%</span> },
    { key: 'authority', header: 'Authority' }, { key: 'tin', header: 'VAT Reg No', className: 'font-mono' },
    { key: 'deadline', header: 'Return Deadline' }, { key: 'input', header: 'Input Credit', align: 'center' }, { key: 'wht', header: 'WHT — Services', align: 'center' },
    { key: '__act', header: '', align: 'right', sortable: false, exportable: false, hideable: false, render: (r) => (r.id ? (
      <span className="inline-flex gap-1">
        <button onClick={() => openEditVat(r)} title="Edit" className="p-1 text-[#2563eb] hover:text-[#134d85]"><Pencil size={14} /></button>
        {r.active === false
          ? <button onClick={() => toggleRow(vatMut, r, `the ${r.branch} VAT rate`)} title="Reactivate" className="p-1 text-[#16a34a] hover:opacity-80"><RotateCcw size={14} /></button>
          : <button onClick={() => toggleRow(vatMut, r, `the ${r.branch} VAT rate`)} title="Deactivate — keeps the record and its history; use instead of Delete" className="p-1 text-[#b45309] hover:opacity-80"><Ban size={14} /></button>}
        <button onClick={() => delVat(r)} title="Delete" className="p-1 text-maroon hover:opacity-80"><Trash2 size={14} /></button>
      </span>
    ) : <span title="Built-in default — seed the VAT master to edit (npm run seed:vat-rates or add a branch)" className="text-ink-subtle">🔒</span>) },
  ];

  const tabs = [['gst', 'India GST'], ['tcstds', 'TDS/TCS'], ['vat', 'Africa VAT']];

  return (
    <PageLayout
      title="Tax / HSN-SAC Codes"
      actions={tab === 'gst' ? <Button size="sm" variant="primary" icon={Plus} onClick={openNewHsn}>HSN/SAC Code</Button>
        : tab === 'vat' ? <Button size="sm" variant="primary" icon={Plus} onClick={openNewVat}>VAT Branch</Button> : undefined}
      filters={
        <>
          <div className="inline-flex overflow-hidden rounded-md border border-surface-border">
            {tabs.map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className={`px-3.5 py-1.5 text-xs font-semibold transition ${tab === k ? 'bg-navy text-gold' : 'bg-surface text-ink-muted hover:bg-surface-alt'}`}>{l}</button>
            ))}
          </div>
          {tab === 'gst' && <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search HSN/SAC, module…" className="flex-1 min-w-[180px]" />}
        </>
      }
    >
      {tab === 'gst' && (
        <DataTable columns={gstColumns} rows={filt_g} getRowKey={(r) => r.id || (r.code + r.service)} dense loading={gstQ.isLoading} isError={gstQ.isError} error={gstQ.error} onRetry={gstQ.refetch} exportName="hsn-sac-codes" printTitle="HSN / SAC Codes" emptyMessage="No HSN/SAC codes yet — click “+ HSN/SAC Code” to add one." />
      )}
      {tab === 'tcstds' && <DataTable columns={tcsColumns} rows={TCS_TDS} getRowKey={(r, i) => i} dense exportName="tds-tcs-rates" printTitle="TDS / TCS Rates" />}
      {tab === 'vat' && <DataTable columns={vatColumns} rows={vatRows} getRowKey={(r) => r.id || r.branch} dense loading={vatQ.isLoading} isError={vatQ.isError} error={vatQ.error} onRetry={vatQ.refetch} exportName="africa-vat" printTitle="Africa VAT Rates" emptyMessage="No Africa VAT branches yet — click “+ VAT Branch” to add one." />}

      {editing && (
        <Modal
          title={editing.__new ? 'New HSN / SAC Code' : 'Edit HSN / SAC Code'}
          onClose={() => setEditing(null)}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="primary" size="sm" loading={savingHsn} disabled={savingHsn} onClick={saveHsn}>{savingHsn ? 'Saving…' : 'Save'}</Button>
            </>
          }
        >
          <div className="grid gap-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="HSN / SAC Code" required><Input value={editing.code} onChange={(e) => setF('code', e.target.value)} /></FormField>
              <FormField label="Module"><Select value={editing.module} onChange={(e) => setF('module', e.target.value)}>{MODULE_OPTS.map((m) => <option key={m} value={m}>{m}</option>)}</Select></FormField>
            </div>
            <FormField label="Service" required><Input value={editing.service} onChange={(e) => setF('service', e.target.value)} /></FormField>
            <FormField label="Taxable Basis"><Input value={editing.basis} onChange={(e) => setF('basis', e.target.value)} /></FormField>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="GST %"><Input type="number" value={editing.rate} onChange={(e) => setF('rate', Number(e.target.value))} /></FormField>
              <FormField label="ITC"><Select value={editing.itc} onChange={(e) => setF('itc', e.target.value)}>{ITC_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}</Select></FormField>
              <FormField label="TCS"><Input value={editing.tcs} onChange={(e) => setF('tcs', e.target.value)} /></FormField>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-navy">
              <input type="checkbox" checked={editing.active !== false} onChange={(e) => setF('active', e.target.checked)} /> Active
            </label>
            {formErr && <div className="text-[11.5px] font-semibold text-maroon">⚠ {formErr}</div>}
          </div>
        </Modal>
      )}

      {editVat && (
        <Modal
          title={editVat.__new ? 'New Africa VAT Branch' : `Edit VAT — ${editVat.branch}`}
          onClose={() => setEditVat(null)}
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setEditVat(null)}>Cancel</Button>
              <Button variant="primary" size="sm" loading={savingVat} disabled={savingVat} onClick={saveVat}>{savingVat ? 'Saving…' : 'Save'}</Button>
            </>
          }
        >
          <div className="grid gap-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Branch" required><Select value={editVat.branch} onChange={(e) => setV('branch', e.target.value)} disabled={!editVat.__new}>{VAT_BRANCH_OPTS.map((b) => <option key={b} value={b}>{b}</option>)}</Select></FormField>
              <FormField label="VAT %" required><Input type="number" value={editVat.rate} onChange={(e) => setV('rate', Number(e.target.value))} /></FormField>
            </div>
            <FormField label="Revenue Authority"><Input value={editVat.authority} onChange={(e) => setV('authority', e.target.value)} /></FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="VAT Reg No"><Input value={editVat.tin} onChange={(e) => setV('tin', e.target.value)} /></FormField>
              <FormField label="Return Deadline"><Input value={editVat.deadline} onChange={(e) => setV('deadline', e.target.value)} /></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Input Credit"><Select value={editVat.input} onChange={(e) => setV('input', e.target.value)}>{INPUT_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}</Select></FormField>
              <FormField label="WHT — Services"><Input value={editVat.wht} onChange={(e) => setV('wht', e.target.value)} /></FormField>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-navy">
              <input type="checkbox" checked={editVat.active !== false} onChange={(e) => setV('active', e.target.checked)} /> Active
            </label>
            {vatErr && <div className="text-[11.5px] font-semibold text-maroon">⚠ {vatErr}</div>}
          </div>
        </Modal>
      )}
    </PageLayout>
  );
}

export default MastersTaxRates;
