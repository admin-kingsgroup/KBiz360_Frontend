/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Customer Master (12-tab, live) — clients (Sundry Debtors).
   ════════════════════════════════════════════════════════════════════
   Moved out of mastersParties.jsx (strangler-fig masters reorg — grouped
   under client-master/ with the Customers list master). Fully wired to the
   ERP backend; every tab reads and writes real data. Logic unchanged; the
   shared party-record engine (usePartyMaster, PartyShell, ArrayEditor,
   tab bodies, column configs) now lives in masters/shared/partyMaster.jsx.

   Basic / Address / Contact Persons / Bank Details / Tax / Credit / Documents /
   Notes / Custom Fields are all editable and persisted (the backend models carry
   nested addresses[], contacts[], banks[], documents[], notes[], customFields[]).
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { Textarea, FormField } from '../../../shell/primitives';
import { BRANCH_CODES } from '../../../core/data';
import {
  GST_TREATMENTS, COUNTRIES, IN_STATES, STATE_NAMES, MSME_STATUS,
  TDS_SECTIONS, PAY_TERMS, CUST_TYPES, CUST_SOURCES,
} from '../../../core/partyEnums';
import { isIndiaCountry as isIndiaFE, isExplicitIndiaCountry as isExplicitIndiaFE, stateCodeOf, supplyTypeOf } from '../../../core/gstSupply';
import { branchCode } from '../../../core/useAccounting';
import { usePartyTypes } from '../../../core/useReference';
import {
  GOLD, DIM, DARK, GREEN,
  tabPanel, usePartyMaster, numOf, rupee, curOfBranch,
  ArrayEditor, Field, SelectField, CheckField, EmptyHint,
  LinkedVouchersTab, OutstandingTab, HistoryTab, PartyShell, CustomFieldsTab,
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
   1. CUSTOMER MASTER (live)
   ════════════════════════════════════════════════════════════════════ */
const CUST_TABS = [
  { id: 'basic', label: '1. Basic Info' }, { id: 'address', label: '2. Address' },
  { id: 'contact', label: '3. Contact Persons' }, { id: 'bank', label: '4. Bank Details' },
  { id: 'tax', label: '5. Tax Info' }, { id: 'credit', label: '6. Credit Terms' },
  { id: 'docs', label: '7. Documents' }, { id: 'notes', label: '8. Notes' },
  { id: 'history', label: '9. History' }, { id: 'linked', label: '10. Linked Vouchers' },
  { id: 'outstanding', label: '11. Outstanding' }, { id: 'custom', label: '12. Custom Fields' },
];

export function CustomerMasterTabbed({ branch } = {}) {
  const brc = branchCode(branch);
  const m = usePartyMaster('customers', 'customer', brc);
  const [tab, setTab] = useState('basic');
  const f = m.form || {};
  const set = m.setField;
  const branchOpts = brc ? ['', 'ALL', brc] : ['', ...BRANCH_CODES];
  // Client Types from the Party Type master (Masters ▸ Utilities); fall back to the
  // hardcoded CUST_TYPES while it's empty/loading. Lead with '' for the "not set" slot.
  const liveTypes = usePartyTypes('customer').data;
  const custTypes = (liveTypes && liveTypes.length) ? ['', ...liveTypes] : CUST_TYPES;
  const available = Math.max(0, (Number(f.creditLimit) || 0) - numOf(f.out));

  return (
    <PartyShell title="Customer Master" subtitle="Clients (Sundry Debtors) — live" m={m} tabs={CUST_TABS} tab={tab} setTab={setTab}>
      {tab === 'basic' && tabPanel(
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,160px),1fr))', gap: 14 }}>
          <Field label="Legal Name" value={f.name} onChange={(v) => set('name', v)} />
          <Field label="Customer Code" value={f.id} readOnly mono />
          <SelectField label="Customer Type" value={f.customerType} onChange={(v) => set('customerType', v)} options={custTypes} />
          <SelectField label="Branch" value={f.branch} onChange={(v) => set('branch', v)} options={branchOpts} />
          <Field label="Industry" value={f.industry} onChange={(v) => set('industry', v)} />
          <SelectField label="Source" value={f.source} onChange={(v) => set('source', v)} options={CUST_SOURCES} />
          <Field label="Account Manager" value={f.accountManager} onChange={(v) => set('accountManager', v)} />
          <Field label="Phone" value={f.phone} onChange={(v) => set('phone', v)} />
          <Field label="Email" value={f.email} onChange={(v) => set('email', v)} />
          <Field label="Revenue (YTD)" value={f.rev} readOnly />
          <Field label="Outstanding" value={f.out} readOnly />
          <CheckField label="Overdue Flag" checked={!!f.ov} onChange={(v) => set('ov', v)} onText="Marked overdue" offText="In good standing" danger />
        </div>
      )}
      {tab === 'address' && tabPanel(
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap: 14, marginBottom: 18 }}>
            <FormField label="Primary Billing Address (required — used on invoices)">
              <Textarea value={f.address || ''} onChange={(e) => set('address', e.target.value)} rows={3} />
            </FormField>
            <Field label="City" value={f.city} onChange={(v) => set('city', v)} />
          </div>
          {isIndiaFE(f.country) && !String(f.address || '').trim() && (
            <div style={{ padding: '8px 11px', borderRadius: 6, background: '#fdf3e3', color: '#a9690a', fontSize: 11.5, fontWeight: 600, marginBottom: 12 }}>
              ⚠ Address is mandatory for an Indian customer — saving without it will be rejected. State (Tax Info tab) fixes the place of supply.
            </div>
          )}
          <EmptyHint>Additional addresses (shipping, registered office, …)</EmptyHint>
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
        const sup = supplyTypeFE(f, 'customer');
        const setState = (name) => {
          const row = IN_STATES.find(([, n]) => n === name);
          set('state', name);
          set('stateCode', row ? row[0] : '');
        };
        const toneBg = { ok: '#e9f7ef', warn: '#fdf3e3', muted: '#eef0f4' }[sup.tone] || '#eef0f4';
        const toneFg = { ok: '#16794c', warn: '#a9690a', muted: '#5b616e' }[sup.tone] || '#5b616e';
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Place of supply — the customer's state vs the branch's home state decides
                the SALE leg's CGST/SGST (intra) vs IGST (inter); the SO/PO/GP booking
                screen auto-picks its Sale GST mode from exactly this. */}
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
                ⚠ State is mandatory for an Indian customer — it decides the sale's CGST/SGST (intra-state) vs IGST (inter-state). Saving without it will be rejected.
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 14 }}>
              <Field label="GSTIN" value={f.gstin} onChange={(v) => set('gstin', v)} mono />
              <Field label="PAN" value={f.pan} onChange={(v) => set('pan', v)} mono />
              <Field label="TAN" value={f.tan} onChange={(v) => set('tan', v)} mono />
              <Field label="TIN (state)" value={f.tin} onChange={(v) => set('tin', v)} mono />
              <SelectField label="GST Treatment" value={f.gstTreatment} onChange={(v) => set('gstTreatment', v)} options={GST_TREATMENTS} />
              <SelectField label="TDS Section" value={f.tdsSection} onChange={(v) => set('tdsSection', v)} options={TDS_SECTIONS} />
              <SelectField label="MSME Status" value={f.msmeStatus} onChange={(v) => set('msmeStatus', v)} options={MSME_STATUS} />
            </div>
          </div>
        );
      })())}
      {tab === 'credit' && tabPanel(
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 14 }}>
          <div style={{ padding: 14, background: '#fafbfd', borderRadius: 6, border: '1px solid #cdd1d8' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: GOLD, textTransform: 'uppercase' }}>Credit Configuration</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 10, marginTop: 10 }}>
              <Field label={`Credit Limit (${curOfBranch(f.branch)})`} type="number" value={f.creditLimit} onChange={(v) => set('creditLimit', v)} />
              <Field label="Credit Days" type="number" value={f.creditDays} onChange={(v) => set('creditDays', v)} />
              <SelectField label="Payment Terms" value={f.paymentTerms} onChange={(v) => set('paymentTerms', v)} options={PAY_TERMS} />
              <Field label="Late Payment Interest" value={f.interestRate} onChange={(v) => set('interestRate', v)} placeholder="e.g. 18% pa" />
            </div>
          </div>
          <div style={{ padding: 14, background: '#fafbfd', borderRadius: 6, border: '1px solid #cdd1d8' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: GOLD, textTransform: 'uppercase' }}>Current Exposure</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 10, marginTop: 10 }}>
              <div><p style={{ margin: 0, fontSize: 10.5, color: DIM, fontWeight: 700, textTransform: 'uppercase' }}>Outstanding</p><p style={{ margin: '3px 0 0', fontSize: 18, fontWeight: 700, color: DARK }}>{f.out || rupee(0, f.branch)}</p></div>
              <div><p style={{ margin: 0, fontSize: 10.5, color: DIM, fontWeight: 700, textTransform: 'uppercase' }}>Available</p><p style={{ margin: '3px 0 0', fontSize: 18, fontWeight: 700, color: GREEN }}>{rupee(available, f.branch)}</p></div>
            </div>
            {(Number(f.creditLimit) || 0) > 0 && (
              <div style={{ marginTop: 12, height: 6, background: '#f0f2f7', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: Math.min(100, (numOf(f.out) / (Number(f.creditLimit) || 1)) * 100) + '%', background: GOLD }} />
              </div>
            )}
          </div>
        </div>
      )}
      {tab === 'docs' && tabPanel(
        <><EmptyHint>Reference uploaded documents (GST certificate, PAN, agreements, …).</EmptyHint><ArrayEditor rows={f.documents} cols={DOC_COLS} onChange={(v) => set('documents', v)} addLabel="Add Document" /></>
      )}
      {tab === 'notes' && tabPanel(
        <ArrayEditor rows={f.notes} cols={NOTE_COLS} onChange={(v) => set('notes', v)} addLabel="Add Note" />
      )}
      {tab === 'custom' && tabPanel(
        <CustomFieldsTab master="Customer" hint="Custom key/value fields for this customer." rows={f.customFields} onChange={(v) => set('customFields', v)} />
      )}
      {tab === 'history' && <HistoryTab q={m.vouchersQ} branch={m.current?.branch} />}
      {tab === 'linked' && <LinkedVouchersTab q={m.vouchersQ} />}
      {tab === 'outstanding' && <OutstandingTab q={m.openBillsQ} side="customer" branch={m.current?.branch} />}
    </PartyShell>
  );
}

export default CustomerMasterTabbed;
