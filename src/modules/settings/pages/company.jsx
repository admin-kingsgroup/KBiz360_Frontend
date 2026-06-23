/* ════════════════════════════════════════════════════════════════════
   Settings ▸ Company Profile — legal entity details (live).
   ════════════════════════════════════════════════════════════════════
   Migrated out of legacy.jsx. Entity derivation from useCompanyProfiles is
   unchanged. Detail cards → PageSection in a ResponsiveGrid; the label/value
   rows + invoice-footer textarea are now Tailwind/primitive based.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { useCompanyProfiles } from '../../../core/useReference';
import { PageLayout } from '../../../shell/PageLayout';
import { PageSection, ResponsiveGrid, Textarea } from '../../../shell/primitives';

const Row = ({ l, v, mono }) => (
  <div className="flex items-start gap-2 border-b border-surface-alt py-2 last:border-0">
    <span className="min-w-[160px] shrink-0 pt-px text-[10.5px] text-ink-muted">{l}</span>
    <span className={`text-[11px] font-semibold text-navy ${mono ? 'font-mono tracking-wide' : ''}`}>{v || '—'}</span>
  </div>
);

export function SettingsCompany() {
  const [tab, setTab] = useState('india');
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
    </PageLayout>
  );
}

export default SettingsCompany;
