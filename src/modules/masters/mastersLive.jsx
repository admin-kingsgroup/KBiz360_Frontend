/* ════════════════════════════════════════════════════════════════════
   MODULES/MASTERS-LIVE.JSX

   Tally accounting masters that were missing from Books, now backed by the ERP
   backend (/api/voucher-types, /api/cost-categories, /api/budgets,
   /api/scenarios). A single generic <MasterCrud> renders the table + add/edit
   modal; each master is just a field config.

   STRANGLER-FIG MASTERS REORG: VoucherTypesMaster, CustomersMaster,
   SuppliersMaster and CreditFacilitiesMaster (and the shared <MasterCrud/>
   itself) have moved to their business sub-module folders (voucher-master/,
   client-master/, supplier-master/, masters/shared/) to match the nav menu's
   MENU_MASTERS groups. They're re-exported below UNCHANGED so App.jsx (which
   dynamically imports this exact file as its own code-split chunk) and the
   existing tests keep working with zero further changes. CostCategoriesMaster,
   BudgetsMaster, ScenariosMaster, GroupsMaster, LedgersMaster (Chart of
   Accounts / Cost Accounting — Reports/Settings territory, out of scope for
   this pass) stay here.
   ════════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect } from 'react';
import { ACTIVE_CURRENCIES, BRANCH_CODES, CONSOLIDATED_LABEL, branchMainCurrency } from '../../core/data';
import { useMasterList } from '../../core/useMasters';
import { SourceBadge } from '../../core/LedgerLabel';
import { branchCode } from '../../core/useAccounting';
import { Select } from '../../shell/primitives';
import { MasterCrud } from './shared/masterCrud';

// Re-exported for backward compatibility — App.jsx and existing tests import
// these directly from this file's path (a distinct lazy-loaded chunk, not the
// masters/index.js barrel). See the header comment: they now live under
// voucher-master/, client-master/, supplier-master/ and masters/shared/.
export { MasterCrud } from './shared/masterCrud';
export { VoucherTypesMaster } from './voucher-master/voucherTypes';
export { CustomersMaster } from './client-master/customers';
export { SuppliersMaster } from './supplier-master/suppliers';
export { CreditFacilitiesMaster } from './supplier-master/creditFacilities';

// Ledger list filter: empty group → all; group set → match the ledger's parent group;
// sub-group set → also match its sub-group. Pure so the Ledgers screen can unit-test it.
export const ledgerMatchesFilter = (r, group, subGroup) =>
  (!group || r.group === group) && (!subGroup || r.subGroup === subGroup);

// Valid parents to offer when creating a group / sub-group. The chart is a strict
// 3 tiers — Primary Group (the 28 fixed) ▸ Group ▸ Sub-Group — and the backend
// rejects nesting under a Tier-3 sub-group (a custom group already nested under
// another custom group). So we offer every group EXCEPT those Tier-3 nodes; the
// user then only ever picks a parent the backend will accept. A→Z, numeric-aware.
export const validParentGroups = (groups = []) => {
  // Parent Group (level 0) + Group (level 1) are the MANDATORY chart backbone —
  // fixed in every branch, never created/edited/deleted. So the ONLY valid parent
  // for a NEW node is a GROUP (level 1): nesting under it creates a Sub-Group
  // (level 2). Parent Groups (would create a Group) and Sub-Groups (a 4th tier) are
  // excluded — a Group is one whose parent is a top-level Parent Group.
  const byName = new Map(groups.map((g) => [g.name, g]));
  const isGroupTier = (g) => {
    if (!g.parent) return false;                   // level 0 Parent Group
    const p = byName.get(g.parent);
    return !!(p && !p.parent);                     // parent has no parent → g is a Group (level 1)
  };
  return groups.filter(isGroupTier).map((g) => g.name)
    .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base', numeric: true }));
};

export const CostCategoriesMaster = () => (
  <MasterCrud title="Cost Categories" subtitle="Parallel cost-centre allocation sets" resource="cost-categories"
    fields={[
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'allocateRevenue', label: 'Allocate Revenue Items', type: 'bool', default: true },
      { key: 'allocateNonRevenue', label: 'Allocate Non-Revenue Items', type: 'bool', default: false },
      { key: 'active', label: 'Active', type: 'bool', default: true },
    ]} />
);

export const BudgetsMaster = ({ branch } = {}) => {
  const brc = branchCode(branch);
  return (
  <MasterCrud title="Budgets" subtitle="Budget targets by period" resource="budgets"
    rowFilter={(r) => !brc || !r.branch || r.branch === 'ALL' || r.branch === brc}
    fields={[
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'branch', label: 'Branch', type: 'text', default: brc || 'ALL' },
      { key: 'fromDate', label: 'From', type: 'date' },
      { key: 'toDate', label: 'To', type: 'date' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'text', table: false },
      { key: 'active', label: 'Active', type: 'bool', default: true },
    ]} />
  );
};

export const ScenariosMaster = () => (
  <MasterCrud title="Scenarios" subtitle="What-if views (actuals + provisional vouchers)" resource="scenarios"
    fields={[
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'includeActuals', label: 'Include Actuals', type: 'bool', default: true },
      { key: 'voucherTypes', label: 'Include Voucher Types', type: 'tags' },
      { key: 'exclude', label: 'Exclude Voucher Types', type: 'tags' },
      { key: 'notes', label: 'Notes', type: 'text', table: false },
      { key: 'active', label: 'Active', type: 'bool', default: true },
    ]} />
);

/* ── Chart of Accounts: Groups & Ledgers (live, backend-connected) ───────── */
// The 28 fixed backbone groups are LOCKED & non-editable (system:true → the
// backend rejects any edit/delete with 423, and /api/groups is read-only). They
// are presented in two tiers:
//   • Primary Group     — a system group with no parent          (16)
//   • Primary Sub Group — a system group nested under a primary   (12)
// Everything below (ERP Group / ERP Sub Group / Ledger) is the user's editable
// custom chart. These helpers are the single source of truth for tier + lock.
export const isPrimaryLocked = (g) => !!(g && g.system);
export const primaryTier = (g) =>
  isPrimaryLocked(g) ? (g.parent ? 'Primary Sub Group' : 'Primary Group') : '';

// The 28 fixed Primary Groups + Primary Sub Groups (parent options for custom
// groups/sub-groups; fallback list until /api/groups loads).
const TALLY_GROUP_NAMES = [
  'Capital Account', 'Loans (Liability)', 'Bank OD Accounts', 'Secured Loans', 'Unsecured Loans',
  'Current Liabilities', 'Duties & Taxes', 'Provisions', 'Sundry Creditors',
  'Fixed Assets', 'Investments', 'Current Assets', 'Bank Accounts', 'Cash-in-Hand',
  'Deposits (Asset)', 'Loans & Advances (Asset)', 'Stock-in-Hand', 'Sundry Debtors',
  'Sales Accounts', 'Direct Income', 'Purchase Accounts', 'Direct Expenses',
  'Indirect Expenses', 'Indirect Income', 'Opening Stock', 'Closing Stock',
  'Misc. Expenses (Asset)', 'Suspense Account',
];

// Party groups are OWNED by the Supplier / Customer (Client) master pipeline —
// creating the party there auto-provisions its ledger. The Ledger Master therefore
// must NOT let you file a NEW ledger under these (the backend rejects it with 422);
// they stay pickable only when EDITING a ledger that's already one.
const PARTY_GROUPS = ['Sundry Creditors', 'Sundry Debtors'];

// The "Groups" door (Tally: Groups → Create / Alter / Display). Groups and
// sub-groups are ONE collection (a 3-tier tree), so a single screen manages both:
// you create a Group under one of the 28 fixed Primary Groups, or a Sub-Group under
// an existing Group. The 28 fixed backbone is read-only (managed by the system) and
// shown in full in the Chart of Accounts tree view — this door is for the custom
// chart. Nature / Statement (BS/PL) are inherited from the parent automatically.
export const GroupsMaster = () => {
  const groupsQ = useMasterList('groups');
  const groups = groupsQ.data || [];
  // Only offer parents the backend will accept: everything except a Tier-3 sub-group
  // (nesting under one would create a 4th tier, which is rejected). This turns the
  // 3-tier rule into a guardrail — the user never sees a "chart is 3 tiers" error.
  const parentOptions = validParentGroups(groups);
  return (
    <MasterCrud title="Groups" subtitle="Chart-of-Accounts groups & sub-groups (Parent Group ▸ Group ▸ Sub-Group)"
      resource="subgroups"
      readOnly
      note="The Chart of Accounts STRUCTURE is fixed — Parent Groups, Groups and Sub-Groups cannot be created, edited or deleted (all shown 🔒, shared by every branch). Only LEDGERS are user-managed; new groups are added by a super-admin. Module-wired sub-groups (trading / inter-branch / tax heads) show ~* in the tree. To see the full tree, open Chart of Accounts (Tree view)."
      fields={[
        { key: 'name', label: 'Sub-Group Name', type: 'text', required: true },
        // Display-only columns: the fixed primary root + the immediate parent.
        { key: 'rootGroup', label: 'Parent Group', type: 'text', input: false },
        { key: 'nestedUnder', label: 'Group', type: 'text', input: false },
        { key: 'parent', label: 'Nest under a Group', type: 'select', options: parentOptions, required: true, table: false },
        { key: 'nature', label: 'Nature', type: 'text', input: false },
        { key: 'statement', label: 'Statement', type: 'text', input: false },
        { key: 'active', label: 'Active', type: 'bool', default: true },
      ]} />
  );
};

export const LedgersMaster = ({ branch }) => {
  // Deep-link target for Bank Account Master's row "Edit" (and any ?edit=<code> link):
  // read once on mount; MasterCrud opens that ledger's editor when the list loads.
  const [editKey] = useState(() => { try { return new URLSearchParams(window.location.search).get('edit') || ''; } catch { return ''; } });
  // Suggest group names in a dropdown — live from /api/groups (28 Tally + custom),
  // falling back to the 28 Tally names until the list loads.
  const groupsQ = useMasterList('groups');
  const groups = groupsQ.data || [];
  const groupOptions = groups.map((g) => g.name);
  // Group NAMES that ARE — or nest under — a party group (Sundry Creditors/Debtors).
  // Hidden from the ledger "Group" picker so a NEW party ledger can't be filed here
  // (parties belong to the Supplier/Customer master, which auto-creates the ledger —
  // the backend also rejects it with 422). Uses each group's resolved rootGroup, so
  // custom sub-groups like "Supplier B2B" / "B2C Reference" are caught too — not just
  // the two literal names. The current value is still kept when EDITING a party ledger.
  const partyGroupNames = new Set([
    ...PARTY_GROUPS,
    ...groups.filter((g) => PARTY_GROUPS.includes(g.name) || PARTY_GROUPS.includes(g.rootGroup)).map((g) => g.name),
  ]);
  // Custom sub-groups whose parent chain reaches `groupName` — used to offer a
  // Sub-Group dropdown scoped to the chosen Group (e.g. picking "Sundry Debtors"
  // lists only the sub-groups created under it). Keep Group = the parent Tally
  // group + a Sub-Group so the ledger nests correctly on the Balance Sheet.
  const parentOf = new Map(groups.map((g) => [g.name, g.parent || '']));
  const subGroupsUnder = (groupName) => {
    if (!groupName) return [];
    const out = [];
    for (const g of groups) {
      if (g.system) continue;                 // only user-created sub-groups
      let p = g.parent, guard = 0;
      while (p && guard++ < 20) { if (p === groupName) { out.push(g.name); break; } p = parentOf.get(p) || ''; }
    }
    return out.sort();
  };

  // Branch view filter — MIRRORS the top-bar branch. Each branch owns its own copy
  // of the chart; which ledgers are visible in which branch is configured on the
  // Accounts Tree ▸ TK Group Central Table (branch pills / hide / lock). Switching
  // the top bar re-scopes this list live; the in-page picker still overrides until
  // the next top-bar switch. "All branches" → the consolidated org-wide view.
  const topBarView = (!branchCode(branch) || branchCode(branch) === 'ALL') ? 'ALL' : branchCode(branch);
  // A specific top-bar branch LOCKS this list to it — no in-page override to other
  // branches / consolidated (deep-link edits stay findable: drills are branch-scoped too).
  const shellLocked = topBarView !== 'ALL';
  const [branchView, setBranchView] = useState(() => (editKey && !shellLocked ? 'ALL' : topBarView));   // deep-link edit (?edit=): all branches so the target is in the list
  useEffect(() => { if (!editKey || shellLocked) setBranchView(topBarView); }, [topBarView]); // eslint-disable-line react-hooks/exhaustive-deps
  // Hidden / deactivated ledgers stay OUT by default, so this list shows exactly the
  // branch's visible chart — the same set every picker offers. The toggle reveals
  // them (flagged in a Visibility column) for management; a deep-link edit fetches
  // the full list too, so its target is always findable.
  const [showHidden, setShowHidden] = useState(() => !!editKey);
  const branchOptions = shellLocked ? ['ALL', topBarView] : ['ALL', ...BRANCH_CODES];

  // A party ledger = one whose Group (or Sub-Group) is Sundry Debtors / Creditors.
  // The GSTIN / credit-terms / contact / bank fields apply only to these.
  const isParty = (form) => /sundry\s+(debtors|creditors)/i.test(`${form?.group || ''} ${form?.subGroup || ''}`);

  // Group + cascading Sub-Group LIST filters (default = show all). Pick a main group
  // (e.g. Sundry Debtors) → the list narrows to ledgers under it; a Sub-Group dropdown
  // then appears (its custom sub-groups) to narrow further. Main groups = the system
  // Tally parents; the ledger's own `group` is that parent, `subGroup` the custom one.
  const [groupFilter, setGroupFilter] = useState('');
  const [subGroupFilter, setSubGroupFilter] = useState('');
  const sysGroups = groups.filter((g) => g.system).map((g) => g.name);
  const mainGroupOptions = sysGroups.length ? sysGroups : TALLY_GROUP_NAMES;
  const subFilterOptions = groupFilter ? subGroupsUnder(groupFilter) : [];
  const ledgerRowFilter = (r) => ledgerMatchesFilter(r, groupFilter, subGroupFilter);

  const selWrap = 'inline-flex items-center gap-1.5 text-[11px] font-bold text-ink-muted';
  const toolbar = (
    <>
      <label className={selWrap} title={shellLocked ? 'Scoped by the top-bar branch — switch it there' : undefined}>Branch
        <div className="w-28"><Select value={branchView} disabled={shellLocked} onChange={(e) => setBranchView(e.target.value)}>
          {!shellLocked && <option value="ALL">All branches</option>}
          {(shellLocked ? [topBarView] : BRANCH_CODES).map((b) => <option key={b} value={b}>{b}</option>)}
        </Select></div>
      </label>
      <label className={selWrap}>Group
        <div className="w-44"><Select value={groupFilter} onChange={(e) => { setGroupFilter(e.target.value); setSubGroupFilter(''); }}>
          <option value="">All groups</option>
          {mainGroupOptions.map((g) => <option key={g} value={g}>{g}</option>)}
        </Select></div>
      </label>
      {groupFilter && (
        <label className={selWrap}>Sub-Group
          <div className="w-44"><Select value={subGroupFilter} onChange={(e) => setSubGroupFilter(e.target.value)}>
            <option value="">All sub-groups</option>
            {subFilterOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select></div>
        </label>
      )}
      <label className={`${selWrap} cursor-pointer`} title="Also list ledgers hidden in this branch (Accounts Tree branch pills) and deactivated ones — flagged in a Visibility column">
        <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} />
        Show hidden &amp; inactive
      </label>
    </>
  );

  return (
    <>
      <MasterCrud title="Ledgers" subtitle={`Chart of Accounts — ledger accounts (live)${branchView !== 'ALL' ? ` · ${branchView} + shared` : ''}`}
        resource="ledgers"
        initialEditKey={editKey}
        // No includeInactive by default: the backend then drops hidden + deactivated
        // ledgers, so the list is exactly the branch's visible chart (as configured
        // on the Accounts Tree ▸ TK Group Central Table). The toggle opts back in.
        params={{ ...(branchView !== 'ALL' ? { branch: branchView } : {}), ...(showHidden ? { includeInactive: 'true' } : {}) }}
        toolbar={toolbar}
        rowFilter={ledgerRowFilter}
        lockedRow={(r) => r.locked}
        mapRow={showHidden ? (r) => ({ ...r, visibility: r.active === false ? 'Inactive' : r.hidden === true ? 'Hidden' : '' }) : undefined}
        note="Suppliers (Sundry Creditors) and Customers (Sundry Debtors) are NOT created here — add them in the Supplier / Customer (Client) master and their ledger appears in the Chart of Accounts automatically. That keeps one party pipeline (a duplicate ledger would split the balance). Set Group to the Primary Group / Primary Sub Group, then pick a Sub-Group to nest this ledger under it on the Balance Sheet. Create sub-groups first in Masters → Sub-Groups. Each branch owns its own copy of the chart — which ledgers are visible in which branch is set on Chart of Accounts (Tree view) ▸ TK Group Central Table (tap a count, then the branch pills). Hidden and deactivated ledgers leave this list and every picker for that branch unless “Show hidden & inactive” is on. Ledgers marked ~* are WIRED to the posting/tax/inter-branch engine — locked (🔒) in every branch: they cannot be created, edited, deleted or deactivated from the app and change only directly in the database."
        fields={[
          // Code is server-allocated (<BRANCH>-MN-NNNN) — read-only, never typed
          // (matches the Chart-of-Accounts ledger editor). Was editable + required,
          // which forced the accountant to invent a code and disagreed with the CoA editor.
          { key: 'code', label: 'Code (auto-generated)', type: 'text', readOnly: true, placeholder: 'Assigned automatically on save' },
          { key: 'name', label: 'Ledger Name', type: 'text', required: true },
          // Changing the Group resets Sub-Group (its old value belongs to a different
          // group and would no longer be valid) — see EditModal's `clears` support.
          // Sundry Creditors/Debtors (and any sub-group under them) are hidden here — a
          // party ledger is created from the Supplier / Customer (Client) master, which
          // auto-provisions it. The current value is kept when editing an existing party ledger.
          { key: 'group', label: 'Group', type: 'select', required: true, clears: ['subGroup'],
            options: (form) => (groupOptions.length ? groupOptions : TALLY_GROUP_NAMES)
              .filter((g) => !partyGroupNames.has(g) || g === form?.group) },
          { key: 'subGroup', label: 'Sub-Group', type: 'select', table: false, emptyLabel: '— None —',
            options: (form) => { const subs = subGroupsUnder(form.group); return form.subGroup && !subs.includes(form.subGroup) ? [form.subGroup, ...subs] : subs; } },
          // Changing Branch re-defaults Currency to that branch's main currency
          // (INR for India, USD elsewhere) — matches what a fresh form already
          // defaults to below, so switching branch mid-form stays consistent.
          { key: 'branch', label: 'Branch', type: 'select', options: branchOptions, default: shellLocked ? topBarView : 'BOM',
            onSet: (v, next) => { next.currency = branchMainCurrency(v); } },
          // Display-only flag column, shown only when hidden/inactive rows are in the
          // list — Hidden = presence-toggled off for its branch, Inactive = deactivated.
          ...(showHidden ? [{ key: 'visibility', label: 'Visibility', type: 'text', input: false, export: false }] : []),
          { key: 'currency', label: 'Currency', type: 'select', options: ACTIVE_CURRENCIES, default: branchMainCurrency(shellLocked ? topBarView : 'BOM') },
          { key: 'openingBalance', label: 'Opening Balance', type: 'number', default: 0 },
          { key: 'drCr', label: 'Dr/Cr', type: 'select', options: ['Dr', 'Cr'], default: 'Dr' },
          { key: 'active', label: 'Active', type: 'bool', default: true },
          // Party (Sundry Debtors / Creditors) details — only shown & validated when
          // the ledger's Group is a party group. Credit days & limit are mandatory.
          { key: 'gstin', label: 'GSTIN', type: 'text', table: false, show: isParty, placeholder: '27AAMCT1096J1ZU' },
          { key: 'creditDays', label: 'Credit Days', type: 'number', table: false, show: isParty, required: isParty, default: '' },
          { key: 'creditLimit', label: 'Credit Limit', type: 'number', table: false, show: isParty, required: isParty, default: '' },
          { key: 'contactName', label: 'Contact Name', type: 'text', table: false, show: isParty },
          { key: 'contactNumber', label: 'Contact Number', type: 'text', table: false, show: isParty },
          { key: 'email', label: 'Email', type: 'text', table: false, show: isParty, placeholder: 'name@example.com' },
          { key: 'bankName', label: 'Bank Name', type: 'text', table: false, show: isParty },
          { key: 'bankAcNo', label: 'Bank A/c No.', type: 'text', table: false, show: isParty },
          { key: 'bankIfsc', label: 'Bank IFSC', type: 'text', table: false, show: isParty },
        ]} />
    </>
  );
};
