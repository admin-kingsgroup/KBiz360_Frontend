/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Tour Code / Package Master — reusable holiday package templates.
   ════════════════════════════════════════════════════════════════════
   A card grid (not a table). Live via /api/tour-codes: the list reads from the
   master, Create persists through the create mutation and Archive/Restore through
   the update mutation. Cards → ResponsiveGrid; the create dialog → shared Modal.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { Plus, Download, ClipboardList, Pencil } from 'lucide-react';
import { exportToExcel } from '../../../core/exportExcel';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { PageLayout } from '../../../shell/PageLayout';
import { Modal, Button, Input, Select, FormField, ResponsiveGrid, StatusPill } from '../../../shell/primitives';

const PAX_TYPE = { FIT: '#185FA5', GIT: '#854F0B', MICE: '#A32D2D' };
const PAX_BG = { FIT: '#E6F1FB', GIT: '#FAEEDA', MICE: '#FCEBEB' };
const MOD_ICONS = { Flight: '✈', Hotel: '🏨', Transfers: '🚐', Visa: '🛂', Insurance: '🛡', Guide: '🧭', Cruise: '🚢', Meals: '🍽' };
const blankForm = { id: '', name: '', dest: '', nights: 4, days: 5, pax: 'FIT', base: 0, peak: 0, off: 0, gp: 12, active: true, tags: [], mods: ['Flight', 'Hotel'] };

export function TourCodeMaster({ setRoute }) {
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(blankForm);
  const setF = (f) => setForm((p) => ({ ...p, ...f }));
  // Live tour-code master (/api/tour-codes). `code` is the package id; keep the mongo
  // id (_mongoId) for the archive/restore toggle. Create persists via the mutation.
  const { data = [] } = useMasterList('tour-codes');
  const { create, update } = useMasterMutations('tour-codes');
  const codes = (data || []).map((c) => ({ ...c, id: c.code, _mongoId: c.id }));

  const filtered = codes.filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.dest || '').toLowerCase().includes(search.toLowerCase()) || (c.id || '').toLowerCase().includes(search.toLowerCase()));

  const exportCodes = () => exportToExcel('tour-codes',
    [{ key: 'id', label: 'Package ID' }, { key: 'name', label: 'Package Name' }, { key: 'dest', label: 'Destination' }, { key: 'nights', label: 'Nights' }, { key: 'days', label: 'Days' }, { key: 'pax', label: 'Pax Type' }, { key: 'base', label: 'Base Price' }, { key: 'off', label: 'Off-peak Price' }, { key: 'peak', label: 'Peak Price' }, { key: 'gp', label: 'GP %' }],
    filtered);

  const createPackage = () => {
    const body = { code: form.id, name: form.name, dest: form.dest, nights: form.nights, days: form.days, pax: form.pax, base: form.base, peak: form.peak, off: form.off, gp: form.gp, mods: ['Flight', 'Hotel', 'Transfers'], tags: [], active: true };
    create.mutate(body, { onSuccess: () => { setModal(false); setForm(blankForm); } });
  };
  const toggleArchive = (c) => update.mutate({ id: c._mongoId, body: { active: !c.active } });

  return (
    <PageLayout
      title="Tour Code / Package Master"
      subtitle={`${filtered.length} packages · Reusable templates for holiday invoices`}
      actions={
        <>
          <Button size="sm" variant="secondary" icon={Download} disabled={!filtered.length} onClick={exportCodes}>Export</Button>
          <Button size="sm" variant="primary" icon={Plus} onClick={() => { setForm(blankForm); setModal(true); }}>New Package</Button>
        </>
      }
      filters={<Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search packages…" className="w-auto min-w-[220px] flex-1" />}
    >
      <ResponsiveGrid min="320px" gap="md">
        {filtered.map((c) => (
          <div key={c.id} className={`overflow-hidden rounded-brand border border-surface-border bg-surface shadow-sm ${c.active ? '' : 'opacity-60'}`}>
            <div className="flex items-start justify-between border-b border-surface-border px-3.5 py-3" style={{ background: PAX_BG[c.pax] || '#E6F1FB' }}>
              <div>
                <div className="mb-0.5 flex items-center gap-2">
                  <span className="rounded bg-navy px-1.5 py-0.5 font-mono text-[9.5px] font-bold text-gold">{c.id}</span>
                  <StatusPill size="sm" tone="neutral"><span style={{ color: PAX_TYPE[c.pax] }}>{c.pax}</span></StatusPill>
                </div>
                <p className="text-[13px] font-bold text-navy">{c.name}</p>
                <p className="mt-px text-[10px] text-ink-muted">📍 {c.dest} · {c.nights}N/{c.days}D</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-extrabold text-navy">₹{(c.base / 1000).toFixed(0)}K</p>
                <p className="mt-px text-[9.5px] text-ink-muted">per pax base</p>
              </div>
            </div>
            <div className="px-3.5 py-2.5">
              <div className="mb-2.5 grid grid-cols-3 gap-2 text-[11px]">
                <div className="flex justify-between"><span className="text-[#27500A]">Off-peak</span><span className="font-semibold">{c.off}</span></div>
                <div className="flex justify-between"><span className="text-[#185FA5]">Base</span><span className="font-semibold">{c.base}</span></div>
                <div className="flex justify-between"><span className="text-[#A32D2D]">Peak</span><span className="font-semibold">{c.peak}</span></div>
              </div>
              <div className="mb-2 flex flex-wrap gap-1">
                {c.mods.map((m) => <span key={m} className="rounded-full bg-surface-alt px-2 py-0.5 text-[9.5px] font-semibold text-role-hr">{MOD_ICONS[m] || '•'} {m}</span>)}
              </div>
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-1">{c.tags.map((t) => <span key={t} className="rounded-full bg-[#E6F1FB] px-1.5 py-px text-[8.5px] text-[#185FA5]">{t}</span>)}</div>
                <span className="text-[10.5px] font-extrabold text-[#27500A]">GP {c.gp}%</span>
              </div>
              <div className="mt-2.5 flex gap-1.5">
                <Button size="xs" variant="primary" icon={ClipboardList} className="flex-1" onClick={() => setRoute && setRoute('/sales/holiday')}>Use in Sale</Button>
                <Button size="xs" variant="secondary" icon={Pencil}>Edit</Button>
                <Button size="xs" variant="secondary" className={c.active ? 'text-maroon' : 'text-[#27500A]'} onClick={() => toggleArchive(c)}>{c.active ? 'Archive' : 'Restore'}</Button>
              </div>
            </div>
          </div>
        ))}
      </ResponsiveGrid>

      {modal && (
        <Modal title="New Tour Code" onClose={() => setModal(false)}
          footer={<><Button variant="secondary" size="sm" onClick={() => setModal(false)}>Cancel</Button><Button variant="primary" size="sm" disabled={!form.id || !form.name || create.isPending} onClick={createPackage}>{create.isPending ? 'Creating…' : 'Create Package'}</Button></>}>
          <div className="flex flex-col gap-3 p-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Tour code (unique ID)"><Input value={form.id} onChange={(e) => setF({ id: e.target.value.toUpperCase() })} className="font-mono" placeholder="DXB-4N-2P" /></FormField>
              <FormField label="Package name"><Input value={form.name} onChange={(e) => setF({ name: e.target.value })} /></FormField>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <FormField label="Destination"><Input value={form.dest} onChange={(e) => setF({ dest: e.target.value })} /></FormField>
              <FormField label="Nights"><Input type="number" value={form.nights} onChange={(e) => setF({ nights: +e.target.value, days: +e.target.value + 1 })} /></FormField>
              <FormField label="Pax type"><Select value={form.pax} onChange={(e) => setF({ pax: e.target.value })}><option>FIT</option><option>GIT</option><option>MICE</option></Select></FormField>
            </div>
            <div className="grid grid-cols-2 gap-3 tablet:grid-cols-4">
              <FormField label="Off-peak ₹/pax"><Input type="number" value={form.off} onChange={(e) => setF({ off: +e.target.value })} /></FormField>
              <FormField label="Base ₹/pax"><Input type="number" value={form.base} onChange={(e) => setF({ base: +e.target.value })} /></FormField>
              <FormField label="Peak ₹/pax"><Input type="number" value={form.peak} onChange={(e) => setF({ peak: +e.target.value })} /></FormField>
              <FormField label="Min GP%"><Input type="number" value={form.gp} onChange={(e) => setF({ gp: +e.target.value })} /></FormField>
            </div>
          </div>
        </Modal>
      )}
    </PageLayout>
  );
}

export default TourCodeMaster;
