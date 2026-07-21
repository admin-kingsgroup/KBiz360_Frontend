/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Credit Facilities & Limits — supplier / BSP / bank credit lines.
   ════════════════════════════════════════════════════════════════════
   Moved out of mastersLive.jsx (strangler-fig masters reorg — grouped under
   supplier-master/). `drawdownLedgers` is the mapping to a supplier — one
   facility → many ledgers, so a vendor kept under several module-split
   ledgers rolls up under one limit. "Drawn" is never entered here; it's read
   live from those ledgers by /api/credit-facilities/capacity and surfaced on
   the Capital vs Investment dashboard. Logic unchanged; renders through the
   shared <MasterCrud/> (masters/shared/masterCrud.jsx).
   ──────────────────────────────────────────────────────────────────── */

import React from 'react';
import { BRANCH_CODES } from '../../../core/data';
import { useMasterList } from '../../../core/useMasters';
import { branchCode } from '../../../core/useAccounting';
import { MasterCrud, ADMIN_WRITE_ROLES } from '../shared/masterCrud';

/* ── Parties (live, backend-connected) ──────────────────────────────────── */
// Party lists follow the TOP-BAR branch: a specific branch shows ITS parties plus
// the Common ('ALL') ones — never another branch's — and new records default to
// that branch (Common stays offered; other branches only under the ALL view).
const partyScope = (brc) => ({
  rowFilter: (r) => !brc || !r.branch || r.branch === 'ALL' || r.branch === brc,
  branchOptions: brc ? ['ALL', brc] : ['ALL', ...BRANCH_CODES],
  branchDefault: brc || 'ALL',
});

const FACILITY_TYPES = ['Supplier Trade Credit', 'BSP-BG', 'Bank Card', 'Bank OD'];
export const CreditFacilitiesMaster = ({ branch } = {}) => {
  const brc = branchCode(branch);
  const scope = partyScope(brc);
  // Drawdown Ledgers must pick from REAL Sundry Creditors (supplier) ledgers, not
  // free-typed names — a facility can only ever roll up ledgers that actually exist,
  // so a typo can't silently leave a ledger's drawn balance out of the limit check.
  // Branch-scoped on the server: vendors are per-branch, so the picker must offer
  // THIS branch's creditor ledgers (+ 'ALL'), never another branch's.
  const ledgersQ = useMasterList('ledgers', brc ? { branch: brc } : {});
  const supplierLedgerNames = (ledgersQ.data || [])
    .filter((l) => /sundry\s+creditors/i.test(l.group || '') && scope.rowFilter(l))
    .map((l) => l.name)
    .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  return (
  <MasterCrud title="Credit Facilities & Limits" subtitle="Supplier / BSP / card credit lines — drawn is read live from the ledgers" resource="credit-facilities" writeRoles={ADMIN_WRITE_ROLES}
    rowFilter={scope.rowFilter}
    fields={[
      // Free text, no supplier master lookup — the facility is just a descriptive
      // label (e.g. "Akbar Travels — Trade Credit"); the actual link to a supplier
      // is the Drawdown Ledgers picker below (a real ledger picker, not this field).
      { key: 'name', label: 'Facility', type: 'text', required: true, placeholder: 'e.g. Akbar Travels — Trade Credit' },
      { key: 'counterparty', label: 'Counterparty', type: 'text', placeholder: 'e.g. Akbar Travels' },
      { key: 'type', label: 'Type', type: 'select', options: FACILITY_TYPES, default: 'Supplier Trade Credit' },
      { key: 'branch', label: 'Branch', type: 'select', options: scope.branchOptions, default: scope.branchDefault, required: true },
      { key: 'currency', label: 'Currency', type: 'select', options: ['INR', 'USD'], default: 'INR', table: false },
      { key: 'limit', label: 'Limit', type: 'number' },
      // Maps the facility to a supplier's ledger(s): one facility → many drawdown
      // ledgers. Picked from the live Sundry Creditors ledger list (any supplier),
      // never free-typed.
      { key: 'drawdownLedgers', label: 'Drawdown Ledgers', type: 'multiselect', options: supplierLedgerNames, emptyLabel: 'No supplier ledgers found for this branch.' },
      // Security is a Post-Dated Cheque, not an FD/BG — one Yes/No + one amount
      // (was Secured/Security Ledger/Security-BG-Amount: three fields effectively
      // asking for the security amount twice).
      { key: 'pdcGiven', label: 'PDC Cheque Given?', type: 'bool', default: false, table: false },
      { key: 'pdcAmount', label: 'PDC Amount', type: 'number', table: false, show: (f) => !!f.pdcGiven, required: (f) => !!f.pdcGiven },
      { key: 'reviewDate', label: 'Review Date', type: 'date', table: false },
      { key: 'active', label: 'Active', type: 'bool', default: true },
    ]} />
  );
};

export default CreditFacilitiesMaster;
