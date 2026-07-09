/* ════════════════════════════════════════════════════════════════════
   Settings ▸ Company Profile — legal entity details (live).
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. Entity derivation from useCompanyProfiles is
   unchanged. Detail cards → PageSection in a ResponsiveGrid; the label/value
   rows + invoice-footer textarea are now Tailwind/primitive based.
   "Edit legal profile" persists per-branch to /api/company-profile (create or
   update by branch code) — previously this screen had no write path at all, so
   the Control Tower's "Legal profile complete" milestone could never be fed.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useCompanyProfiles } from '../../../core/useReference';
import { useMasterMutations } from '../../../core/useMasters';
import { BRANCH_CODES } from '../../../core/data';
import { toast } from '../../../core/ux/toast';
import { PageLayout } from '../../../shell/PageLayout';
import { PageSection, ResponsiveGrid, Textarea, Modal, Button, FormField, Input, Select } from '../../../shell/primitives';

const Row = ({ l, v, mono }) => (
  <div className="flex items-start gap-2 border-b border-surface-alt py-2 last:border-0">
    <span className="min-w-[160px] shrink-0 pt-px text-[10.5px] text-ink-muted">{l}</span>
    <span className={`text-[11px] font-semibold text-navy ${mono ? 'font-mono tracking-wide' : ''}`}>{v || '—'}</span>
  </div>
);

// The editable legal/contact fields (a per-branch subset of the full model —
// currency/tax config stays seed-managed via seed:branches).
const EDIT_FIELDS = [
  ['entity', 'Legal entity name'], ['pan', 'PAN'], ['gstin', 'GSTIN / VAT PIN'], ['tan', 'TAN'],
  ['state', 'State'], ['stateCode', 'State code'], ['city', 'City'], ['pin', 'PIN code'],
  ['operAddr', 'Operating address'], ['phone', 'Phone'], ['email', 'Email'], ['website', 'Website'],
  ['iataNo', 'IATA agent code'], ['bspParticipant', 'BSP membership'],
];
const blankProfile = () => EDIT_FIELDS.reduce((o, [k]) => ({ ...o, [k]: '' }), { code: 'BOM' });

function EditProfileModal({ profiles, onClose }) {
  const qc = useQueryClient();
  const { create, update } = useMasterMutations('company-profile');
  const [form, setForm] = useState(() => {
    const p = profiles.find((x) => x.code === 'BOM') || {};
    return { ...blankProfile(), ...EDIT_FIELDS.reduce((o, [k]) => ({ ...o, [k]: p[k] || '' }), {}), code: 'BOM' };
  });
  const pick = (code) => {
    const p = profiles.find((x) => x.code === code) || {};
    setForm({ ...blankProfile(), ...EDIT_FIELDS.reduce((o, [k]) => ({ ...o, [k]: p[k] || '' }), {}), code });
  };
  const save = async () => {
    if (!form.entity.trim()) { toast('Legal entity name is required', 'error'); return; }
    const existing = profiles.find((x) => x.code === form.code);
    try {
      if (existing && existing.id) await update.mutateAsync({ id: existing.id, body: form });
      else await create.mutateAsync(form);
      qc.invalidateQueries({ queryKey: ['ref', 'company-profile'] });
      toast(`Profile saved — ${form.code}`);
      onClose();
    } catch (e) { toast('Could not save — ' + (e?.message || 'unknown error'), 'error'); }
  };
  return (
    <Modal title="Edit legal profile" sub="One profile per branch — saved to the live company-profile master" onClose={onClose} maxWidth={620}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="accent" size="sm" disabled={create.isPending || update.isPending} onClick={save}>💾 Save Profile</Button>
        </>
      }>
      <div className="grid gap-3 p-4">
        <FormField label="Branch">
          <Select value={form.code} onChange={(e) => pick(e.target.value)}>
            {BRANCH_CODES.map((b) => <option key={b}>{b}</option>)}
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          {EDIT_FIELDS.map(([k, label]) => (
            <FormField key={k} label={label} className={k === 'operAddr' ? 'col-span-2' : ''}>
              <Input value={form[k]} onChange={(e) => setForm((s) => ({ ...s, [k]: e.target.value }))} />
            </FormField>
          ))}
        </div>
      </div>
    </Modal>
  );
}

export function SettingsCompany() {
  const [tab, setTab] = useState('india');
  const [editing, setEditing] = useState(false);
  const profiles = useCompanyProfiles().data || [];

  const bom = profiles.find((p) => p.code === 'BOM') || {};
  const amd = profiles.find((p) => p.code === 'AMD') || {};
  const companies = [{
    key: 'india', flag: '🇮🇳', label: 'India Entity',
    name: bom.entity || 'Travkings Tours & Travels', type: 'Partnership Firm', pan: bom.pan,
    gstin1: bom.gstin, gstState1: bom.state ? `${bom.state} (${bom.stateCode || ''})`.trim() : '',
    gstin2: amd.gstin, gstState2: amd.state ? `${amd.state} (${amd.stateCode || ''})`.trim() : '',
    tan: bom.tan, addr1: bom.operAddr,
    addr2: [bom.city && `${bom.city} – ${bom.pin || ''}`.trim(), bom.state, bom.country].filter(Boolean).join(', '),
    phone: bom.phone, email: bom.email, web: bom.website, iata: bom.iataNo, bsp: bom.bspParticipant,
    fy: bom.fyStart ? `${bom.fyStart} – March` : 'April – March',
    currency: [bom.currency, bom.cur_sym].filter(Boolean).join(' '),
    gst: bom.taxRate ? `GST ${bom.taxRate}` : 'GST',
  }];
  const co = companies.find((c) => c.key === tab) || companies[0];
  const isIndia = tab === 'india';

  return (
    <PageLayout
      title="Company Profile"
      subtitle="Travkings Tours & Travels · 4 legal entities · 1 HO + 5 branches"
      actions={<Button variant="accent" size="sm" onClick={() => setEditing(true)}>✎ Edit legal profile</Button>}
      filters={companies.map((c2) => (
        <button key={c2.key} onClick={() => setTab(c2.key)} className={`rounded-lg border px-4 py-1.5 text-[11px] font-semibold transition ${tab === c2.key ? 'border-navy bg-navy text-gold' : 'border-surface-border bg-surface text-ink-muted hover:bg-surface-alt'}`}>{c2.flag} {c2.label}</button>
      ))}
    >
      <ResponsiveGrid cols={2} gap="md">
        <PageSection title="🏢 Legal Details">
          <Row l="Company name" v={co.name} />
          <Row l="Entity type" v={co.type} />
          {isIndia ? (
            <>
              <Row l="PAN" v={co.pan} mono />
              <Row l="GSTIN — BOM (MH)" v={co.gstin1} mono />
              <Row l="GST State — BOM" v={co.gstState1} />
              <Row l="GSTIN — AMD (GJ)" v={co.gstin2} mono />
              <Row l="GST State — AMD" v={co.gstState2} />
              <Row l="TAN" v={co.tan} mono />
            </>
          ) : (
            <>
              <Row l={tab === 'kenya' ? 'VAT PIN' : tab === 'tanzania' ? 'TPIN' : 'NIF'} v={co.gstin1} mono />
              <Row l="Tax Authority" v={co.gstState1} />
            </>
          )}
          <Row l="Financial Year" v={co.fy} />
          <Row l="Currency" v={co.currency} />
          <Row l="Tax regime" v={co.gst} />
        </PageSection>

        <div className="flex flex-col gap-3.5">
          <PageSection title="📍 Address & Contact">
            <Row l="Address line 1" v={co.addr1} />
            <Row l="Address line 2" v={co.addr2} />
            <Row l="Phone" v={co.phone} />
            <Row l="Email" v={co.email} />
            {co.web && <Row l="Website" v={co.web} />}
          </PageSection>
          {(co.iata || co.bsp) && (
            <PageSection title="✈ IATA & BSP">
              {co.iata && <Row l="IATA Agent Code" v={co.iata} mono />}
              {co.bsp && <Row l="BSP Membership" v={co.bsp} />}
            </PageSection>
          )}
          <PageSection title="Invoice footer note" className="border border-[#B5D4F4] bg-[#E6F1FB]">
            <Textarea rows={3} readOnly value={`${co.name} | ${co.addr1}, ${co.addr2} | ${co.phone}`} className="text-[10.5px]" />
            <p className="mt-1.5 text-[9.5px] text-ink-muted">Derived from this entity&apos;s live profile — appears on the footer of all printed invoices.</p>
          </PageSection>
        </div>
      </ResponsiveGrid>

      {editing && <EditProfileModal profiles={profiles} onClose={() => setEditing(false)} />}
    </PageLayout>
  );
}

export default SettingsCompany;
