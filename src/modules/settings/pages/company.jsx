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
import { BRANCH_CODES, ACTIVE_CURRENCIES } from '../../../core/data';
import { toast } from '../../../core/ux/toast';
import { PageLayout } from '../../../shell/PageLayout';
import { PageSection, ResponsiveGrid, Textarea, Modal, Button, FormField, Input, Select } from '../../../shell/primitives';

const Row = ({ l, v, mono }) => (
  <div className="flex items-start gap-2 border-b border-surface-alt py-2 last:border-0">
    <span className="min-w-[160px] shrink-0 pt-px text-[10.5px] text-ink-muted">{l}</span>
    <span className={`text-[11px] font-semibold text-navy ${mono ? 'font-mono tracking-wide' : ''}`}>{v || '—'}</span>
  </div>
);

const ENTITY_TYPES = ['Proprietorship', 'Partnership Firm', 'LLP', 'Private Limited Company', 'Public Limited Company', 'HUF', 'Trust', 'Other'];
// Countries the group actually operates a legal entity in (mirrors the branch → country
// map in core/referenceCache.js: BOM/AMD → India, NBO → Kenya, DAR → Tanzania, FBM → DR Congo).
const COMPANY_COUNTRIES = ['India', 'Kenya', 'Tanzania', 'DR Congo', 'Other'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const TAX_TYPES = ['GST', 'VAT', 'MULTI'];
const GST_RATE_OPTIONS = [0, 5, 12, 18, 28];

// The FY runs 12 months from the chosen start month (e.g. April → "April – March").
const fyRangeLabel = (start) => {
  const i = MONTHS.indexOf(start);
  if (i < 0) return start ? start : 'April – March';
  return `${start} – ${MONTHS[(i + 11) % 12]}`;
};

// A readable tax-regime label from the structured fields, falling back to the old
// free-text `taxRate` for a profile that hasn't been re-saved with the new fields yet.
const gstLabel = (p = {}) => {
  const gstPart = Array.isArray(p.gstRates) && p.gstRates.length ? `GST ${p.gstRates.join('/')}%` : '';
  const vatPart = (p.vatRate ?? '') !== '' ? `VAT ${p.vatRate}%` : '';
  if (p.taxType === 'VAT') return vatPart || 'VAT';
  if (p.taxType === 'MULTI') return [gstPart, vatPart].filter(Boolean).join(' + ') || 'Multi';
  if (p.taxType === 'GST') return gstPart || (p.taxRate ? `GST ${p.taxRate}` : 'GST');
  return p.taxRate ? `GST ${p.taxRate}` : 'GST';
};

// The editable legal/contact fields (a per-branch subset of the full model). Simple
// text fields carry just [key, label]; a picklist adds { type: 'select', options }.
const EDIT_FIELDS = [
  { key: 'entity', label: 'Legal entity name' },
  { key: 'entityType', label: 'Entity type', type: 'select', options: ENTITY_TYPES },
  { key: 'cin', label: 'CIN' },
  { key: 'pan', label: 'PAN' },
  { key: 'gstin', label: 'GSTIN / VAT PIN' },
  { key: 'tan', label: 'TAN' },
  { key: 'country', label: 'Country', type: 'select', options: COMPANY_COUNTRIES },
  { key: 'state', label: 'State' },
  { key: 'stateCode', label: 'State code' },
  { key: 'city', label: 'City' },
  { key: 'pin', label: 'PIN code' },
  { key: 'operAddr', label: 'Operating address', span: 2 },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'website', label: 'Website' },
  { key: 'iataNo', label: 'IATA agent code' },
  { key: 'bspParticipant', label: 'BSP membership' },
  { key: 'fyStart', label: 'Financial year start', type: 'select', options: MONTHS },
  { key: 'currency', label: 'Currency', type: 'select', options: ACTIVE_CURRENCIES },
  { key: 'taxType', label: 'Tax regime', type: 'select', options: TAX_TYPES },
];
const blankProfile = () => ({
  ...EDIT_FIELDS.reduce((o, f) => ({ ...o, [f.key]: '' }), {}),
  code: 'BOM', gstRates: [], vatRate: '',
});
const profileToForm = (p, code) => ({
  ...blankProfile(),
  ...EDIT_FIELDS.reduce((o, f) => ({ ...o, [f.key]: p[f.key] || '' }), {}),
  gstRates: Array.isArray(p.gstRates) ? p.gstRates : [],
  vatRate: p.vatRate ?? '',
  code,
});

function EditProfileModal({ profiles, onClose }) {
  const qc = useQueryClient();
  const { create, update } = useMasterMutations('company-profile');
  const [form, setForm] = useState(() => profileToForm(profiles.find((x) => x.code === 'BOM') || {}, 'BOM'));
  const pick = (code) => setForm(profileToForm(profiles.find((x) => x.code === code) || {}, code));
  const toggleGstRate = (r) => setForm((s) => ({
    ...s,
    gstRates: s.gstRates.includes(r) ? s.gstRates.filter((x) => x !== r) : [...s.gstRates, r].sort((a, b) => a - b),
  }));
  const save = async () => {
    if (!form.entity.trim()) { toast('Legal entity name is required', 'error'); return; }
    const existing = profiles.find((x) => x.code === form.code);
    const body = { ...form, vatRate: form.vatRate === '' ? null : Number(form.vatRate) };
    try {
      if (existing && existing.id) await update.mutateAsync({ id: existing.id, body });
      else await create.mutateAsync(body);
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
          {EDIT_FIELDS.map((f) => (
            <FormField key={f.key} label={f.label} className={f.span === 2 ? 'col-span-2' : ''}>
              {f.type === 'select' ? (
                <Select value={form[f.key]} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}>
                  <option value="">Select…</option>
                  {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              ) : (
                <Input value={form[f.key]} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} />
              )}
            </FormField>
          ))}
          {/* Rate selection reacts to the chosen Tax regime — GST slabs are picked from
              the standard set; VAT is a single flat rate; Multi shows both. */}
          {(form.taxType === 'GST' || form.taxType === 'MULTI') && (
            <FormField label="GST rate(s)" className="col-span-2">
              <div className="flex flex-wrap gap-3">
                {GST_RATE_OPTIONS.map((r) => (
                  <label key={r} className="flex items-center gap-1.5 text-[11.5px] text-ink">
                    <input type="checkbox" checked={form.gstRates.includes(r)} onChange={() => toggleGstRate(r)} />
                    {r}%
                  </label>
                ))}
              </div>
            </FormField>
          )}
          {(form.taxType === 'VAT' || form.taxType === 'MULTI') && (
            <FormField label="VAT rate (%)" className="col-span-2">
              <Input type="number" value={form.vatRate} onChange={(e) => setForm((s) => ({ ...s, vatRate: e.target.value }))} />
            </FormField>
          )}
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
  const india = {
    key: 'india', flag: '🇮🇳', label: 'India Entity',
    name: bom.entity || 'Travkings Tours & Travels', type: bom.entityType || 'Partnership Firm', cin: bom.cin,
    country: bom.country || 'India', pan: bom.pan,
    gstin1: bom.gstin, gstState1: bom.state ? `${bom.state} (${bom.stateCode || ''})`.trim() : '',
    gstin2: amd.gstin, gstState2: amd.state ? `${amd.state} (${amd.stateCode || ''})`.trim() : '',
    tan: bom.tan, addr1: bom.operAddr,
    addr2: [bom.city && `${bom.city} – ${bom.pin || ''}`.trim(), bom.state, bom.country].filter(Boolean).join(', '),
    phone: bom.phone, email: bom.email, web: bom.website, iata: bom.iataNo, bsp: bom.bspParticipant,
    fy: fyRangeLabel(bom.fyStart),
    currency: [bom.currency, bom.cur_sym].filter(Boolean).join(' '),
    gst: gstLabel(bom),
  };
  // Africa (VAT) legal entities — one per branch (Kenya/Tanzania/DR Congo). Each renders
  // its own VAT-registration row (VAT PIN / TPIN / NIF), which was previously dead code
  // because only the India entity was built. Tax authority shows in place of GST state.
  const africaEntity = (key, flag, label, code, fallbackCountry) => {
    const p = profiles.find((x) => x.code === code) || {};
    return {
      key, flag, label, code,
      name: p.entity || 'Travkings Tours & Travels', type: p.entityType || '', cin: p.cin,
      country: p.country || fallbackCountry, pan: p.pan,
      gstin1: p.gstin, gstState1: p.state ? `${p.state} (${p.stateCode || ''})`.trim() : '',
      tan: p.tan, addr1: p.operAddr,
      addr2: [p.city && `${p.city} – ${p.pin || ''}`.trim(), p.state, p.country].filter(Boolean).join(', '),
      phone: p.phone, email: p.email, web: p.website, iata: p.iataNo, bsp: p.bspParticipant,
      fy: fyRangeLabel(p.fyStart),
      currency: [p.currency, p.cur_sym].filter(Boolean).join(' '),
      gst: gstLabel(p),
    };
  };
  const companies = [
    india,
    africaEntity('kenya', '🇰🇪', 'Kenya Entity', 'NBO', 'Kenya'),
    africaEntity('tanzania', '🇹🇿', 'Tanzania Entity', 'DAR', 'Tanzania'),
    africaEntity('congo', '🇨🇩', 'DR Congo Entity', 'FBM', 'DR Congo'),
  ];
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
          <Row l="CIN" v={co.cin} mono />
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
            <Row l="Country" v={co.country} />
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
