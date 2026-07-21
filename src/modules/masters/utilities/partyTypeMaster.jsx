/* ════════════════════════════════════════════════════════════════════
   Masters ▸ Utilities — Party Type Master (Client Types + Supplier Categories)
   ════════════════════════════════════════════════════════════════════
   The maintainable source of truth for the party classifications that used to be
   hardcoded (core/partyEnums CUST_TYPES / SUPPLIER_CATS, BE suppliers VALID_CATS).
   One collection split by `kind`; the Customer/Supplier masters read the ACTIVE
   rows for their kind via usePartyTypes(kind) (falling back to the hardcoded lists
   while this is empty). Renders through the shared <MasterCrud/>.
   ──────────────────────────────────────────────────────────────────── */

import React, { useState } from 'react';
import { MasterCrud } from '../shared/masterCrud';
import { Select } from '../../../shell/primitives';

// Backend enum on partyTypes.model — the two vocabularies this master governs.
const KINDS = ['customer', 'supplier'];
const KIND_LABEL = { customer: 'Client Type', supplier: 'Supplier Category' };

export const PartyTypeMaster = () => {
  // Kind filter — narrow to Client Types or Supplier Categories (both share one list).
  const [kindFilter, setKindFilter] = useState('');
  const matchKind = (r) => (!kindFilter ? true : r.kind === kindFilter);
  const selWrap = 'inline-flex items-center gap-1.5 text-[11px] font-bold text-ink-muted';
  const toolbar = (
    <label className={selWrap}>Show
      <div className="w-56"><Select value={kindFilter} onChange={(e) => setKindFilter(e.target.value)}>
        <option value="">All party types</option>
        {KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}s</option>)}
      </Select></div>
    </label>
  );

  return (
    <MasterCrud
      title="Party Type Master"
      subtitle="Client Types & Supplier Categories — the maintainable list the party masters use"
      resource="party-types"
      rowFilter={matchKind}
      toolbar={toolbar}
      // Friendly Kind column ("Client Type" / "Supplier Category") without touching the
      // edit form, which needs the raw 'customer'/'supplier' enum. kindLabel is a
      // display-only derived column (input:false); the raw `kind` field is hidden from
      // the table (table:false) but still editable in the modal.
      mapRow={(r) => ({ ...r, kindLabel: KIND_LABEL[r.kind] || r.kind })}
      // Read the list in the order end users see it: grouped by kind, then the same
      // sortOrder the dropdowns use, then name — not raw creation order.
      sortRows={(a, b) => String(a.kind).localeCompare(String(b.kind)) || (a.sortOrder || 0) - (b.sortOrder || 0) || String(a.name).localeCompare(String(b.name))}
      emptyMessage={({ total, hidden }) => (hidden > 0
        ? `No party types match the current filter — ${hidden} of ${total} hidden. Choose “All party types” to clear it.`
        : 'No party types yet — click “New” to add one (or run scripts/seed-party-types.js to load the defaults).')}
      note="Prefer Deactivate over Delete: deactivating keeps existing parties untouched (their value stays — it just stops being offered in new dropdowns), while Delete removes it from the picklist entirely. Renaming a type does NOT rename it on existing customers/suppliers — they keep the old value (shown as “… (current)”) until edited. A type name must be unique within its kind."
      fields={[
        // Real kind — edited in the modal as a select; hidden from the table (the friendly
        // kindLabel column shows it instead). Stored lowercase to match the backend enum.
        { key: 'kind', label: 'Kind', type: 'select', options: KINDS, required: true, table: false },
        // Display-only friendly label (derived via mapRow) — a table column, never edited.
        { key: 'kindLabel', label: 'Kind', input: false },
        { key: 'name', label: 'Type Name', type: 'text', required: true },
        // Lower sortOrder shows first in the dropdown; blank/equal falls back to name order.
        { key: 'sortOrder', label: 'Sort Order', type: 'number', default: 100 },
        { key: 'active', label: 'Active', type: 'bool', default: true },
      ]}
    />
  );
};

export default PartyTypeMaster;
