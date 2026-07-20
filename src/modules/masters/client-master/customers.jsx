/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Customers — Clients (Sundry Debtors), live from the backend.
   ════════════════════════════════════════════════════════════════════
   Moved out of mastersLive.jsx (strangler-fig masters reorg — grouped under
   client-master/ with the Customer Master 12-tab screen). Logic unchanged;
   renders through the shared <MasterCrud/> (masters/shared/masterCrud.jsx).
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { BRANCH_CODES } from '../../../core/data';
import {
  GST_TREATMENTS, COUNTRIES, STATE_NAMES, MSME_STATUS, TDS_SECTIONS,
  CUST_TYPES, CUST_SOURCES, PAY_TERMS,
} from '../../../core/partyEnums';
import { branchCode } from '../../../core/useAccounting';
import { isVatBranch } from '../../../core/voucherSpecs';
import { MasterCrud } from '../shared/masterCrud';
import { Select } from '../../../shell/primitives';

/* ── Parties (live, backend-connected) ──────────────────────────────────── */
// Party lists follow the TOP-BAR branch: a specific branch shows ITS parties plus
// the Common ('ALL') ones — never another branch's — and new records default to
// that branch (Common stays offered; other branches only under the ALL view).
const partyScope = (brc) => ({
  rowFilter: (r) => !brc || !r.branch || r.branch === 'ALL' || r.branch === brc,
  branchOptions: brc ? ['ALL', brc] : ['ALL', ...BRANCH_CODES],
  branchDefault: brc || 'ALL',
});

export const CustomersMaster = ({ branch } = {}) => {
  const brc = branchCode(branch);
  const scope = partyScope(brc);
  // Client Type filter — narrows the list to one customer kind (B2B / B2C
  // Reference / …) or to the ones not yet classified. The type is stored on every
  // customer (customerType) but was hidden from the list; it's now a column too so
  // you can see what you're filtering on. '__blank__' = the Unclassified bucket
  // (historic rows imported without a type) so they can be found and tagged, not
  // silently swallowed by the filter.
  const [typeFilter, setTypeFilter] = useState('');
  const matchType = (r) => (!typeFilter ? true
    : typeFilter === '__blank__' ? !r.customerType
    : r.customerType === typeFilter);
  const selWrap = 'inline-flex items-center gap-1.5 text-[11px] font-bold text-ink-muted';
  const toolbar = (
    <label className={selWrap}>Type
      <div className="w-48"><Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
        <option value="">All types</option>
        {CUST_TYPES.filter(Boolean).map((t) => <option key={t} value={t}>{t}</option>)}
        <option value="__blank__">Unclassified</option>
      </Select></div>
    </label>
  );
  return (
  <MasterCrud title="Customers" subtitle="Clients (Sundry Debtors) — live from the backend" resource="customers"
    // Scope on the SERVER (?branch → its customers + Common 'ALL' ones), not just in
    // the browser: fetching every branch's customers and hiding rows client-side is
    // exactly how one branch's parties leaked into another's view. rowFilter = belt.
    params={brc ? { branch: brc } : {}}
    rowFilter={(r) => scope.rowFilter(r) && matchType(r)}
    toolbar={toolbar}
    // When the Type/Branch filter hides every row, say WHY — the records exist,
    // they're just filtered out; a bare "No customers" would read as missing data.
    emptyMessage={({ total, hidden }) => (hidden > 0
      ? `No customers match the current filter — ${hidden} of ${total} hidden. Choose “All types” (or switch branch) to clear it.`
      : 'No customers yet — click “New” to add one.')}
    fields={[
      { key: 'name', label: 'Name', type: 'text', required: true },
      // Dropdowns are fed from core/partyEnums (the same picklists the 12-tab master uses),
      // so values stay consistent with the rest of the ERP instead of free-typed text.
      // Shown as a column (table: default) AND filterable via the Type toolbar above.
      { key: 'customerType', label: 'Customer Type', type: 'select', options: CUST_TYPES },
      { key: 'source', label: 'Source', type: 'select', options: CUST_SOURCES, table: false },
      // Already stored on the model (used by the 12-tab master) but wasn't exposed here.
      { key: 'accountManager', label: 'Key Account Manager', type: 'text', table: false },
      // Branch must be a real code (not a free-text/blank field) — a blank branch creates
      // an unscoped party. Scoped to the top-bar branch when one is selected.
      { key: 'branch', label: 'Branch', type: 'select', options: scope.branchOptions, default: scope.branchDefault, required: true },
      // India (GST) branches capture GSTIN + GST Treatment + TDS Section; a VAT branch
      // (NBO/DAR/FBM) captures the VAT counterparts (VAT Registration No + WHT) instead.
      // GSTIN is only mandatory once the customer is GST-registered (Regular/Composition) —
      // an Unregistered/SEZ/Overseas customer may have no GSTIN at all.
      { key: 'gstin', label: 'GSTIN', type: 'text', table: false, show: (f) => !isVatBranch(f.branch), required: (f) => !isVatBranch(f.branch) && /^Registered/.test(f.gstTreatment || '') },
      { key: 'pan', label: 'PAN', type: 'text', table: false },
      { key: 'gstTreatment', label: 'GST Treatment', type: 'select', options: GST_TREATMENTS, table: false, show: (f) => !isVatBranch(f.branch) },
      { key: 'tdsSection', label: 'TDS Section', type: 'select', options: TDS_SECTIONS, table: false, show: (f) => !isVatBranch(f.branch) },
      // VAT-branch tax identity (Africa) — shown only for a VAT branch, hidden for India.
      // vatRegNo = VAT Registration No / TRN; whtSection/whtRate = Withholding Tax.
      { key: 'vatRegNo', label: 'VAT Registration No', type: 'text', table: false, show: (f) => isVatBranch(f.branch) },
      { key: 'whtSection', label: 'WHT Section', type: 'text', table: false, show: (f) => isVatBranch(f.branch) },
      { key: 'whtRate', label: 'WHT Rate (%)', type: 'number', table: false, show: (f) => isVatBranch(f.branch) },
      // Some customers deduct TDS on what they pay us — flag it and capture the rate they
      // deduct at (applied per invoice); leave blank/hidden when the customer doesn't deduct.
      // India-only: a customer withholding TDS is a GST-regime concept — an Africa (VAT)
      // client withholds WHT, captured by whtSection/whtRate above. MSME is an Indian statute.
      { key: 'isTdsDeducted', label: 'Is TDS Deducted (by Customer)', type: 'bool', default: false, table: false, show: (f) => !isVatBranch(f.branch) },
      { key: 'tdsRate', label: 'TDS Rate (%) per Invoice', type: 'number', table: false, show: (f) => !!f.isTdsDeducted && !isVatBranch(f.branch), required: (f) => !!f.isTdsDeducted && !isVatBranch(f.branch) },
      { key: 'msmeStatus', label: 'MSME Status', type: 'select', options: MSME_STATUS, table: false, show: (f) => !isVatBranch(f.branch) },
      { key: 'address', label: 'Address', type: 'text', table: false },
      // Country sits right below Address. Anything other than India → the customer is
      // treated as overseas (GST Treatment auto-set to 'Overseas'), same country-driven
      // logic as the Supplier master.
      { key: 'country', label: 'Country', type: 'select', options: COUNTRIES, emptyLabel: 'India (default)', table: false,
        onSet: (v, next) => {
          next.gstTreatment = (v && v !== 'India') ? 'Overseas' : (next.gstTreatment === 'Overseas' ? '' : next.gstTreatment);
          next.state = (v && v !== 'India') ? 'Others' : '';   // India → pick a real state; else foreign 'Others'
        } },
      // State (place of supply) — REQUIRED for an India customer: the BE defaults a blank country
      // to 'India' and then demands a state (it decides CGST/SGST vs IGST). Without this field an
      // India B2C / no-GSTIN customer could not be created (hard 400). Hidden on VAT branches (no
      // Indian place-of-supply). Mirrors the Supplier master.
      { key: 'state', label: 'State (place of supply)', type: 'select', options: STATE_NAMES, table: false, show: (f) => !isVatBranch(f.branch), required: (f) => !isVatBranch(f.branch) },
      { key: 'city', label: 'City', type: 'text', table: false },
      { key: 'phone', label: 'Phone', type: 'text', required: true },
      { key: 'contact', label: 'Contact', type: 'text', table: false },
      { key: 'email', label: 'Email', type: 'text', table: false, required: true },
      { key: 'paymentTerms', label: 'Payment Terms', type: 'select', options: PAY_TERMS, table: false },
      { key: 'creditLimit', label: 'Credit Limit', type: 'number', required: true },
      { key: 'creditDays', label: 'Credit Time (Days)', type: 'number', required: true },
      { key: 'active', label: 'Active', type: 'bool', default: true },
    ]} />
  );
};

export default CustomersMaster;
