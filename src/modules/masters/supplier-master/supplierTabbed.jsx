/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Supplier Master (12-tab, live) — vendors (Sundry Creditors).
   ════════════════════════════════════════════════════════════════════
   Moved out of mastersParties.jsx (strangler-fig masters reorg — grouped
   under supplier-master/ with the other supplier-side masters). Fully wired
   to the ERP backend; every tab reads and writes real data. Logic unchanged;
   the shared party-record engine (usePartyMaster, PartyShell, ArrayEditor,
   tab bodies, column configs) now lives in masters/shared/partyMaster.jsx.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { FormField } from '../../../shell/primitives';
import { BRANCH_CODES } from '../../../core/data';
import {
  SUPPLIER_CATS, GST_TREATMENTS, COUNTRIES, IN_STATES, STATE_NAMES, MSME_STATUS,
  TDS_SECTIONS, SETTLE_CYCLES, PAY_METHODS,
} from '../../../core/partyEnums';
import { isIndiaCountry as isIndiaFE, isExplicitIndiaCountry as isExplicitIndiaFE, stateCodeOf, supplyTypeOf } from '../../../core/gstSupply';
import { branchCode } from '../../../core/useAccounting';
import { usePartyTypes } from '../../../core/useReference';
import {
  GOLD,
  tabPanel, usePartyMaster, PartyShell, curOfBranch,
  ArrayEditor, Field, SelectField, CheckField, EmptyHint,
  LinkedVouchersTab, OutstandingTab, HistoryTab, CustomFieldsTab,
  ADDR_COLS, CONTACT_COLS, BANK_COLS, DOC_COLS, NOTE_COLS,
} from '../shared/partyMaster';

// GST place-of-supply helpers — shared with the SO/PO/GP booking screen (which
// auto-picks each leg's GST mode from these same rules). Mirrors the backend
// src/shared/util/gstSupplyType.js. A party attracts Indian GST/TDS only when it
// is Indian; CGST+SGST (intra) vs IGST (inter) is then decided by the party's
// state vs the branch's home state.
const stateCodeFE = (f) => stateCodeOf(f || {});
// → { type, label, tone } for the read-only Inter/Intra/Foreign indicator.
function supplyTypeFE(f = {}, kind = 'supplier') {
  const type = supplyTypeOf(f, f.branch);
  if (type === 'foreign') {
    return { type, label: kind === 'customer' ? 'Overseas customer — Indian GST NOT applicable' : 'Overseas supplier — Indian GST / TDS NOT applicable', tone: 'muted' };
  }
  if (!type) return { type: '', label: 'Select a State to determine Inter / Intra', tone: 'warn' };
  return type === 'intra'
    ? { type, label: 'Intra-state — CGST + SGST', tone: 'ok' }
    : { type, label: 'Inter-state — IGST', tone: 'ok' };
}

/* ════════════════════════════════════════════════════════════════════
   2. SUPPLIER MASTER (live)
   ════════════════════════════════════════════════════════════════════ */
const SUPP_TABS = [
  { id: 'basic', label: '1. Basic Info' }, { id: 'address', label: '2. Address' },
  { id: 'contact', label: '3. Contact Persons' }, { id: 'bank', label: '4. Bank Details' },
  { id: 'tax', label: '5. Tax Info' }, { id: 'credit', label: '6. Payment Terms' },
  { id: 'docs', label: '7. Documents' }, { id: 'notes', label: '8. Notes' },
  { id: 'history', label: '9. History' }, { id: 'linked', label: '10. Linked Vouchers' },
  { id: 'outstanding', label: '11. Outstanding' }, { id: 'custom', label: '12. Custom Fields' },
];

export function SupplierMasterTabbed({ branch } = {}) {
  const brc = branchCode(branch);
  const m = usePartyMaster('suppliers', 'supplier', brc);
  const [tab, setTab] = useState('basic');
  const f = m.form || {};
  const set = m.setField;
  const branchOpts = brc ? ['ALL', brc] : ['ALL', ...BRANCH_CODES];
  // Supplier Categories from the Party Type master (Masters ▸ Utilities); fall back to
  // the hardcoded SUPPLIER_CATS while it's empty/loading.
  const liveCats = usePartyTypes('supplier').data;
  const supCats = (liveCats && liveCats.length) ? liveCats : SUPPLIER_CATS;

  return (
    <PartyShell title="Supplier Master" subtitle="Vendors (Sundry Creditors) — live" m={m} tabs={SUPP_TABS} tab={tab} setTab={setTab}>
      {tab === 'basic' && tabPanel(
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,160px),1fr))', gap: 14 }}>
          <Field label="Legal Name" value={f.name} onChange={(v) => set('name', v)} />
          <Field label="Supplier Code" value={f.id} readOnly mono />
          <SelectField label="Category" value={f.category} onChange={(v) => set('category', v)} options={supCats} />
          <Field label="Type" value={f.type} onChange={(v) => set('type', v)} />
          <SelectField label="Branch" value={f.branch} onChange={(v) => set('branch', v)} options={branchOpts} />
          <SelectField label="Country" value={f.country || 'India'} onChange={(v) => set('country', v)} options={COUNTRIES} />
          <Field label="Vendor Manager" value={f.vendorManager} onChange={(v) => set('vendorManager', v)} />
          <Field label="Phone" value={f.phone} onChange={(v) => set('phone', v)} />
          <Field label="Email" value={f.email} onChange={(v) => set('email', v)} />
          <CheckField label="Status" checked={f.active !== false} onChange={(v) => set('active', v)} onText="Active" offText="Inactive" />
          <CheckField label="Preferred" checked={!!f.preferred} onChange={(v) => set('preferred', v)} onText="Tier-A Vendor" offText="Standard" />
        </div>
      )}
      {tab === 'address' && tabPanel(
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 14, marginBottom: 18 }}>
            <Field label="City" value={f.city} onChange={(v) => set('city', v)} />
            <SelectField label="Country" value={f.country || 'India'} onChange={(v) => set('country', v)} options={COUNTRIES} />
          </div>
          <EmptyHint>Office / branch addresses · GST place-of-supply is set on the Tax tab.</EmptyHint>
          <ArrayEditor rows={f.addresses} cols={ADDR_COLS} onChange={(v) => set('addresses', v)} addLabel="Add address" />
        </>
      )}
      {tab === 'contact' && tabPanel(
        <ArrayEditor rows={f.contacts} cols={CONTACT_COLS} onChange={(v) => set('contacts', v)} addLabel="Add Contact Person" />
      )}
      {tab === 'bank' && tabPanel(
        <ArrayEditor rows={f.banks} cols={BANK_COLS} onChange={(v) => set('banks', v)} addLabel="Add Bank Account" />
      )}
      {tab === 'tax' && tabPanel((() => {
        const india = isIndiaFE(f.country);
        const sup = supplyTypeFE(f);
        const setState = (name) => {
          const row = IN_STATES.find(([, n]) => n === name);
          set('state', name);
          set('stateCode', row ? row[0] : '');
        };
        const toneBg = { ok: '#e9f7ef', warn: '#fdf3e3', muted: '#eef0f4' }[sup.tone] || '#eef0f4';
        const toneFg = { ok: '#16794c', warn: '#a9690a', muted: '#5b616e' }[sup.tone] || '#5b616e';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Place of supply — drives whether Indian GST/TDS apply and inter vs intra. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 14 }}>
              <SelectField label="Country" value={f.country || 'India'} onChange={(v) => set('country', v)} options={COUNTRIES} />
              {india && (
                <SelectField label="State (required for India)" value={f.state || ''} onChange={setState} options={STATE_NAMES} />
              )}
              <FormField label="GST Supply Type (auto)">
                <div style={{ padding: '7px 10px', borderRadius: 6, background: toneBg, color: toneFg, fontSize: 12, fontWeight: 700, border: '1px solid #cdd1d8' }}>
                  {sup.type === 'intra' ? '🟢 ' : sup.type === 'inter' ? '🔵 ' : sup.type === 'foreign' ? '🌐 ' : '⚠ '}{sup.label}
                </div>
              </FormField>
            </div>
            {isExplicitIndiaFE(f.country) && !stateCodeFE(f) && (
              <div style={{ padding: '8px 11px', borderRadius: 6, background: '#fdf3e3', color: '#a9690a', fontSize: 11.5, fontWeight: 600 }}>
                ⚠ State is mandatory for an Indian supplier — it decides CGST/SGST (intra-state) vs IGST (inter-state). Saving without it will be rejected.
              </div>
            )}
            {/* GST / TDS identifiers — only meaningful for an Indian supplier. */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 14 }}>
              {india ? (
                <>
                  <Field label="GSTIN" value={f.gstin} onChange={(v) => set('gstin', v)} mono />
                  <Field label="PAN" value={f.pan} onChange={(v) => set('pan', v)} mono />
                  <Field label="TAN" value={f.tan} onChange={(v) => set('tan', v)} mono />
                  <SelectField label="GST Treatment" value={f.gstTreatment} onChange={(v) => set('gstTreatment', v)} options={GST_TREATMENTS} />
                  <SelectField label="TDS Section" value={f.tdsSection} onChange={(v) => set('tdsSection', v)} options={TDS_SECTIONS} />
                  <SelectField label="MSME Status" value={f.msmeStatus} onChange={(v) => set('msmeStatus', v)} options={MSME_STATUS} />
                </>
              ) : (
                <div style={{ gridColumn: '1/-1', padding: 12, borderRadius: 6, background: '#f6f8fb', border: '1px solid #cdd1d8', fontSize: 12, color: '#5b616e' }}>
                  🌐 <b>Overseas supplier</b> — Indian GSTIN / GST Treatment / TDS Section are not applicable. Purchases from this vendor must be booked <b>without</b> CGST/SGST/IGST or TDS (import of service; reverse-charge handled separately if opted).
                </div>
              )}
              <Field label="IATA Code" value={f.iataCode} onChange={(v) => set('iataCode', v)} mono />
              <Field label="BSP Code" value={f.bspCode} onChange={(v) => set('bspCode', v)} mono />
            </div>
          </div>
        );
      })())}
      {tab === 'credit' && tabPanel(
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 14 }}>
          <div style={{ padding: 14, background: '#fafbfd', borderRadius: 6, border: '1px solid #cdd1d8' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: GOLD, textTransform: 'uppercase' }}>Payment Configuration</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 10, marginTop: 10 }}>
              <SelectField label="Settlement Cycle" value={f.settlementCycle} onChange={(v) => set('settlementCycle', v)} options={SETTLE_CYCLES} />
              <Field label="Credit Days" type="number" value={f.creditDays} onChange={(v) => set('creditDays', v)} />
              <SelectField label="Payment Method" value={f.paymentMethod} onChange={(v) => set('paymentMethod', v)} options={PAY_METHODS} />
              <Field label={`Credit Limit (${curOfBranch(f.branch)})`} type="number" value={f.creditLimit} onChange={(v) => set('creditLimit', v)} />
            </div>
          </div>
        </div>
      )}
      {tab === 'docs' && tabPanel(
        <><EmptyHint>Reference uploaded documents (GSA agreement, BSP mandate, GST, …).</EmptyHint><ArrayEditor rows={f.documents} cols={DOC_COLS} onChange={(v) => set('documents', v)} addLabel="Add Document" /></>
      )}
      {tab === 'notes' && tabPanel(
        <ArrayEditor rows={f.notes} cols={NOTE_COLS} onChange={(v) => set('notes', v)} addLabel="Add Note" />
      )}
      {tab === 'custom' && tabPanel(
        <CustomFieldsTab master="Supplier" hint="Custom key/value fields for this supplier." rows={f.customFields} onChange={(v) => set('customFields', v)} />
      )}
      {tab === 'history' && <HistoryTab q={m.vouchersQ} branch={m.current?.branch} />}
      {tab === 'linked' && <LinkedVouchersTab q={m.vouchersQ} />}
      {tab === 'outstanding' && <OutstandingTab q={m.openBillsQ} side="supplier" branch={m.current?.branch} />}
    </PartyShell>
  );
}

export default SupplierMasterTabbed;
