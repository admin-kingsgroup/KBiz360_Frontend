/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Suppliers — Vendors (Sundry Creditors), live from the backend.
   ════════════════════════════════════════════════════════════════════
   Moved out of mastersLive.jsx (strangler-fig masters reorg — grouped under
   supplier-master/ with the other supplier-side masters). Logic unchanged;
   renders through the shared <MasterCrud/> (masters/shared/masterCrud.jsx).
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { BRANCH_CODES } from '../../../core/data';
import {
  SUPPLIER_CATS, GST_TREATMENTS, COUNTRIES, STATE_NAMES, MSME_STATUS, TDS_SECTIONS,
  SETTLE_CYCLES, PAY_METHODS,
} from '../../../core/partyEnums';
import { branchCode } from '../../../core/useAccounting';
import { isVatBranch } from '../../../core/voucherSpecs';
import { usePartyTypes } from '../../../core/useReference';
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

export const SuppliersMaster = ({ branch } = {}) => {
  const brc = branchCode(branch);
  const scope = partyScope(brc);
  // Supplier Categories now come from the Party Type master (Masters ▸ Utilities);
  // fall back to the hardcoded SUPPLIER_CATS while it's empty/loading (no leading '' —
  // a category is always a real value).
  const liveCats = usePartyTypes('supplier').data;
  const supCats = (liveCats && liveCats.length) ? liveCats : SUPPLIER_CATS;
  // Supplier Type filter — narrows the list to one vendor category (Airline / DMC /
  // Hotel / …, the backend-validated SUPPLIER_CATS shown in the Category column) or
  // to the ones not yet categorised. '__blank__' = the Uncategorised bucket so those
  // rows can be found and tagged, not silently hidden by the filter.
  const [catFilter, setCatFilter] = useState('');
  const matchCat = (r) => (!catFilter ? true
    : catFilter === '__blank__' ? !r.category
    : r.category === catFilter);
  const selWrap = 'inline-flex items-center gap-1.5 text-[11px] font-bold text-ink-muted';
  const toolbar = (
    <label className={selWrap}>Category
      <div className="w-48"><Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
        <option value="">All categories</option>
        {supCats.map((c) => <option key={c} value={c}>{c}</option>)}
        <option value="__blank__">Uncategorised</option>
      </Select></div>
    </label>
  );
  return (
  <MasterCrud title="Suppliers" subtitle="Vendors (Sundry Creditors) — live from the backend" resource="suppliers"
    // Scope on the SERVER (?branch → its vendors + Common 'ALL' ones), not just in the
    // browser: fetching every branch's vendors and hiding rows client-side is exactly
    // how one branch's parties leaked into another's view. rowFilter stays as a belt.
    params={brc ? { branch: brc } : {}}
    rowFilter={(r) => scope.rowFilter(r) && matchCat(r)}
    toolbar={toolbar}
    // Vendors are PER-BRANCH (shared/constants/ledgerScope): each branch owns the
    // vendors it buys from, so a branch with none is a legitimate empty — not a fault.
    // Say so, and name where the other branches' vendors are: Chart of Accounts still
    // lists BOM-cloned creditor heads under every branch, so a bare "No records yet"
    // here reads as broken data next to a chart that is visibly full. When the Category
    // filter is what emptied the list, say THAT instead — don't blame the branch.
    emptyMessage={({ total }) => (catFilter
      ? `No ${catFilter === '__blank__' ? 'uncategorised' : catFilter} vendors${brc ? ` in ${brc}` : ''} — choose “All categories” to clear the filter.`
      : brc && total > 0
        ? `No vendors onboarded for ${brc} yet. Vendors are per-branch — the ${total} vendor(s) on file belong to other branches and are never shared. Click “New” to add ${brc}’s first vendor, or switch branch from the top-right selector.`
        : 'No vendors yet — click “New” to add one.')}
    fields={[
      { key: 'name', label: 'Name', type: 'text', required: true },
      // Category is the one picklist the backend validates (VALID_CATS) — a dropdown
      // guarantees a valid value. The rest mirror the 12-tab master via core/partyEnums.
      { key: 'category', label: 'Category', type: 'select', options: supCats },
      // Branch must be a real code, not free-text/blank (a blank branch = unscoped party).
      { key: 'branch', label: 'Branch', type: 'select', options: scope.branchOptions, default: scope.branchDefault, required: true },
      // India (GST) branches capture GSTIN + GST Treatment + TDS Section; a VAT branch
      // (NBO/DAR/FBM) captures the VAT counterparts (VAT Registration No + WHT) instead.
      { key: 'gstin', label: 'GSTIN', type: 'text', table: false, show: (f) => !isVatBranch(f.branch) },
      // TDS is only actually deducted on some suppliers — flag it explicitly instead of
      // inferring from tdsSection, and only then does PAN become mandatory (needed to
      // deduct at the correct rate instead of the higher no-PAN default).
      // India-only: TDS (and the PAN it forces) has no meaning on a VAT branch — Africa
      // withholds via whtSection/whtRate below. Leaving this ungated let a user tick it on a
      // Kenyan vendor and get blocked by a mandatory Indian PAN.
      { key: 'isTdsDeducted', label: 'Is TDS Deducted', type: 'bool', default: false, table: false, show: (f) => !isVatBranch(f.branch) },
      // PAN is mandatory only when India TDS is deducted — never force it on a VAT branch
      // (belt-and-braces: an existing Africa record carrying isTdsDeducted=true can still save).
      { key: 'pan', label: 'PAN', type: 'text', table: false, required: (f) => !!f.isTdsDeducted && !isVatBranch(f.branch) },
      // Address line sits before Country/State (matches the physical order on the form).
      { key: 'addressLine', label: 'Address Line', type: 'text', required: true, table: false },
      // Country '' (the default) is treated as India downstream but does NOT force a state;
      // picking India explicitly does (it decides CGST/SGST vs IGST) — the backend derives
      // the state code from the chosen state name. Picking any other country auto-selects
      // State = 'Others' (a foreign party has no Indian GST state, but State stays mandatory).
      { key: 'country', label: 'Country', type: 'select', options: COUNTRIES, emptyLabel: 'India (default)', table: false, required: true,
        onSet: (v, next) => { next.state = (v && v !== 'India') ? 'Others' : ''; } },
      // State (place of supply) is an Indian GST concept (decides CGST/SGST vs IGST) — hidden and
      // not required on a VAT branch (DAR/NBO/FBM). Mirrors the Customer master; without the gate a
      // VAT-branch supplier import that omits state was hard-rejected by the BE validator.
      { key: 'state', label: 'State (place of supply)', type: 'select', options: STATE_NAMES, table: false, show: (f) => !isVatBranch(f.branch), required: (f) => !isVatBranch(f.branch) },
      { key: 'gstTreatment', label: 'GST Treatment', type: 'select', options: GST_TREATMENTS, table: false, show: (f) => !isVatBranch(f.branch) },
      { key: 'tdsSection', label: 'TDS Section', type: 'select', options: TDS_SECTIONS, table: false, show: (f) => !isVatBranch(f.branch) },
      // VAT-branch tax identity (Africa) — shown only for a VAT branch, hidden for India.
      // vatRegNo = VAT Registration No / TRN; whtSection/whtRate = Withholding Tax.
      { key: 'vatRegNo', label: 'VAT Registration No', type: 'text', table: false, show: (f) => isVatBranch(f.branch) },
      { key: 'whtSection', label: 'WHT Section', type: 'text', table: false, show: (f) => isVatBranch(f.branch) },
      { key: 'whtRate', label: 'WHT Rate (%)', type: 'number', table: false, show: (f) => isVatBranch(f.branch) },
      // MSME is an Indian statute (MSMED Act) — not applicable to an Africa (VAT) party.
      { key: 'msmeStatus', label: 'MSME Status', type: 'select', options: MSME_STATUS, table: false, show: (f) => !isVatBranch(f.branch) },
      { key: 'contact', label: 'Contact', type: 'text', table: false },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'email', label: 'Email', type: 'text', table: false, required: true },
      { key: 'city', label: 'City', type: 'text', table: false },
      { key: 'settlementCycle', label: 'Settlement Cycle', type: 'select', options: SETTLE_CYCLES, table: false, required: true },
      { key: 'paymentMethod', label: 'Payment Method', type: 'select', options: PAY_METHODS, table: false },
      { key: 'creditDays', label: 'Credit Period (Days)', type: 'number', required: true },
      { key: 'creditLimit', label: 'Credit Limit', type: 'number', required: true },
      // Bank details are only collected when the supplier opts in — three flat fields
      // (mirrors the Ledger party's bankName/bankAcNo/bankIfsc), required only when shown.
      { key: 'provideBankDetails', label: 'Provide Bank Details', type: 'bool', default: false, table: false },
      { key: 'bankName', label: 'Bank Name', type: 'text', table: false, show: (f) => !!f.provideBankDetails, required: (f) => !!f.provideBankDetails },
      { key: 'bankAcNo', label: 'Bank A/c No.', type: 'text', table: false, show: (f) => !!f.provideBankDetails, required: (f) => !!f.provideBankDetails },
      { key: 'bankIfsc', label: 'Bank IFSC Code', type: 'text', table: false, show: (f) => !!f.provideBankDetails, required: (f) => !!f.provideBankDetails },
      { key: 'active', label: 'Active', type: 'bool', default: true },
    ]} />
  );
};

export default SuppliersMaster;
