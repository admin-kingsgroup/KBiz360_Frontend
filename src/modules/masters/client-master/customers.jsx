/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Customers — Clients (Sundry Debtors), live from the backend.
   ════════════════════════════════════════════════════════════════════
   Moved out of mastersLive.jsx (strangler-fig masters reorg — grouped under
   client-master/ with the Customer Master 12-tab screen). Logic unchanged;
   renders through the shared <MasterCrud/> (masters/shared/masterCrud.jsx).
   ──────────────────────────────────────────────────────────────────── */

import React from 'react';
import { BRANCH_CODES } from '../../../core/data';
import {
  GST_TREATMENTS, COUNTRIES, MSME_STATUS, TDS_SECTIONS,
  CUST_TYPES, CUST_SOURCES, PAY_TERMS,
} from '../../../core/partyEnums';
import { branchCode } from '../../../core/useAccounting';
import { isVatBranch } from '../../../core/voucherSpecs';
import { MasterCrud } from '../shared/masterCrud';

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
  const scope = partyScope(branchCode(branch));
  return (
  <MasterCrud title="Customers" subtitle="Clients (Sundry Debtors) — live from the backend" resource="customers"
    rowFilter={scope.rowFilter}
    fields={[
      { key: 'name', label: 'Name', type: 'text', required: true },
      // Dropdowns are fed from core/partyEnums (the same picklists the 12-tab master uses),
      // so values stay consistent with the rest of the ERP instead of free-typed text.
      { key: 'customerType', label: 'Customer Type', type: 'select', options: CUST_TYPES, table: false },
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
        onSet: (v, next) => { next.gstTreatment = (v && v !== 'India') ? 'Overseas' : (next.gstTreatment === 'Overseas' ? '' : next.gstTreatment); } },
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
