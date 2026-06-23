/* ════════════════════════════════════════════════════════════════════
   MODULES/MASTERS-LIVE.JSX

   Tally accounting masters that were missing from Books, now backed by the ERP
   backend (/api/voucher-types, /api/cost-categories, /api/budgets,
   /api/scenarios). A single generic <MasterCrud> renders the table + add/edit
   modal; each master is just a field config.
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { Plus, Pencil, Trash2, Download, Printer } from 'lucide-react';
import { ACTIVE_CURRENCIES, BRANCH_CODES, CONSOLIDATED_LABEL } from '../core/data';
import { useMasterList, useMasterMutations } from '../core/useMasters';
import { SourceBadge } from '../core/LedgerLabel';
import { branchCode } from '../core/useAccounting';
import { exportToExcel } from '../core/exportExcel';
import { openPrintPreview } from '../core/PrintPreview';
import { useFormKeys } from '../core/ux/forms';
import { toast } from '../core/ux/toast';
import { confirmDialog } from '../core/ux/confirm';
import { Kbd } from '../core/ux/widgets.jsx';
import { PageLayout } from '../shell/PageLayout';
import { Modal, Button, Select, Input, LoadingState, ErrorState } from '../shell/primitives';

const DARK = '#1a1c22', BLUE = '#2563eb', DIM = '#5b616e', RED = '#dc2626', GREEN = '#16a34a';

// Ledger list filter: empty group → all; group set → match the ledger's parent group;
// sub-group set → also match its sub-group. Pure so the Ledgers screen can unit-test it.
export const ledgerMatchesFilter = (r, group, subGroup) =>
  (!group || r.group === group) && (!subGroup || r.subGroup === subGroup);

const blankFromFields = (fields) => fields.reduce((o, f) => {
  o[f.key] = f.type === 'bool' ? (f.default ?? false) : f.type === 'tags' ? [] : f.type === 'number' ? (f.default ?? 0) : (f.default ?? '');
  return o;
}, {});

function FieldInput({ field, value, onChange, form }) {
  if (field.type === 'bool') {
    return (
      <label className="flex cursor-pointer items-center gap-2 text-[12.5px] text-ink">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    );
  }
  if (field.type === 'select') {
    // options may be a static array or a fn(form) → array (e.g. Sub-Group depends
    // on the chosen Group). An empty list renders just the placeholder.
    const options = typeof field.options === 'function' ? (field.options(form) || []) : (field.options || []);
    return (
      <Select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">{field.emptyLabel || 'Select…'}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </Select>
    );
  }
  if (field.type === 'tags') {
    return (
      <Input value={Array.isArray(value) ? value.join(', ') : value}
        onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
        placeholder="comma, separated, values" />
    );
  }
  // System-managed fields (e.g. a ledger's auto-generated code) are shown but not
  // editable — render a greyed, read-only box with a hint when there's no value yet.
  if (field.readOnly) {
    return (
      <input type="text" value={value || ''} readOnly disabled
        placeholder={field.placeholder || ''}
        style={{ ...inp, fontSize: 12.5, background: '#f3f4f8', color: '#6b7280', cursor: 'not-allowed' }} />
    );
  }
  return (
    <Input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      value={value} onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
      placeholder={field.placeholder || ''} />
  );
}

function EditModal({ title, fields, record, onClose, onSave, saving, error }) {
  const [form, setForm] = useState(record);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  // `show` / `required` may be a fn(form) so fields can react to other values (e.g.
  // party-only fields that appear & become mandatory when Group = Sundry Debtors).
  const isShown = (f) => (typeof f.show === 'function' ? f.show(form) : true);
  const isReq = (f) => (typeof f.required === 'function' ? f.required(form) : !!f.required);
  const editable = fields.filter((f) => f.input !== false); // table-only fields (e.g. derived) aren't edited
  const visible = editable.filter(isShown);
  const missing = visible.filter((f) => isReq(f) && (form[f.key] === '' || form[f.key] == null));
  const submit = () => { if (!saving && !missing.length) onSave(form); };
  // Enter advances fields; Enter on the last field (or Ctrl/Cmd+Enter) saves; Esc cancels.
  const formKeys = useFormKeys({ onSubmit: submit, onCancel: onClose });
  return (
    <Modal
      title={title}
      onClose={onClose}
      maxWidth={460}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" disabled={saving || missing.length > 0} loading={saving} onClick={submit} title="Save (Ctrl/Cmd+Enter)">
            {saving ? 'Saving…' : <>Save <Kbd>⌃↵</Kbd></>}
          </Button>
        </>
      }
    >
      <div ref={formKeys.ref} onKeyDown={formKeys.onKeyDown} className="flex flex-col gap-3 p-4">
        {visible.map((f) => (
          <div key={f.key}>
            {f.type !== 'bool' && <label className="mb-1 block text-[11px] font-bold text-ink-muted">{f.label}{isReq(f) && <span className="text-danger"> *</span>}</label>}
            <FieldInput field={f} value={form[f.key]} onChange={(v) => set(f.key, v)} form={form} />
          </div>
        ))}
        {error && <div className="text-[11.5px] font-semibold text-danger">⚠ {error}</div>}
      </div>
    </Modal>
  );
}

export function MasterCrud({ title, subtitle, resource, fields, params, readOnly = false, lockedRow, note, toolbar, rowFilter, mapRow, sortRows, rowStyle }) {
  const list = useMasterList(resource, params);
  const { create, update, remove } = useMasterMutations(resource);
  const [editing, setEditing] = useState(null); // record being edited, or {} for new
  const [err, setErr] = useState('');
  // rowFilter narrows the listing client-side (e.g. show only the 28 system
  // parent groups). mapRow derives extra display columns per row; sortRows
  // orders the final list. All three are optional and view-specific.
  let rows = (list.data || []).filter(rowFilter || (() => true));
  if (mapRow) rows = rows.map(mapRow);
  if (sortRows) rows = [...rows].sort(sortRows);
  const cols = fields.filter((f) => f.table !== false);

  const openNew = () => { setErr(''); setEditing({ __new: true, ...blankFromFields(fields) }); };
  const openEdit = (r) => { setErr(''); setEditing({ ...blankFromFields(fields), ...r }); };

  const save = (form) => {
    setErr('');
    const { __new, id, ...body } = form;
    const label = body.name || body.code || 'Record';
    const onError = (e) => { setErr(e.message); toast(`Could not save — ${e.message}`, 'error'); };
    const onSuccess = () => { setEditing(null); toast(`${label} saved`); };
    if (__new) create.mutate(body, { onSuccess, onError });
    else update.mutate({ id, body }, { onSuccess, onError });
  };

  const del = async (r) => {
    const { confirmed } = await confirmDialog({ title: `Delete "${r.name}"?`, message: 'This cannot be undone.', danger: true, confirmLabel: 'Delete' });
    if (!confirmed) return;
    remove.mutate(r.id, { onSuccess: () => toast(`${r.name || 'Record'} deleted`), onError: (e) => toast(`Could not delete — ${e.message}`, 'error') });
  };

  // Export every record (all fields, not just the table-visible ones) to Excel.
  // bool → Yes/No, tags → comma-joined, so the sheet stays human-readable.
  const exportSheet = () => {
    const expFields = fields.filter((f) => f.export !== false);
    const columns = expFields.map((f) => ({ key: f.key, label: f.label }));
    const data = rows.map((r) => {
      const o = {};
      for (const f of expFields) {
        const v = r[f.key];
        o[f.key] = f.type === 'bool' ? (v ? 'Yes' : 'No')
          : f.type === 'tags' ? (Array.isArray(v) ? v.join(', ') : (v || ''))
          : v ?? '';
      }
      return o;
    });
    exportToExcel(resource, columns, data);
  };

  // Print the CURRENT (filtered) listing through the unified A4 preview. Builds a
  // clean HTML table from the visible columns/rows — bool→Yes/No, number→grouped,
  // tags→comma-joined — so the printout matches what's on screen (incl. any
  // toolbar filters, since `rows` is already filtered). Wide grids default to
  // landscape so columns don't get squeezed.
  const printList = () => {
    const esc = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    const txt = (r, f) => {
      const v = r[f.key];
      if (f.type === 'bool') return v ? 'Yes' : 'No';
      if (f.type === 'tags') return Array.isArray(v) ? v.join(', ') : (v || '');
      if (f.type === 'number') return v ? Number(v).toLocaleString('en-IN') : '0';
      return v ?? '';
    };
    const head = cols.map((f) => `<th style="text-align:${f.type === 'number' ? 'right' : 'left'};padding:6px 9px;border-bottom:2px solid #0d1326;font-size:9pt;text-transform:uppercase;letter-spacing:.4px;color:#0d1326;white-space:nowrap">${esc(f.label)}</th>`).join('');
    const body = rows.map((r, i) => `<tr style="background:${i % 2 ? '#f7f8fb' : '#fff'}">${cols.map((f) => `<td style="text-align:${f.type === 'number' ? 'right' : 'left'};padding:5px 9px;border-bottom:1px solid #e5e9f0;font-size:9pt;color:#222">${esc(txt(r, f))}</td>`).join('')}</tr>`).join('');
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#222">
      <div style="margin-bottom:10px">
        <div style="font-size:16pt;font-weight:800;color:#0d1326">${esc(title)}</div>
        <div style="font-size:9.5pt;color:#5a6691;margin-top:2px">${esc(subtitle || '')} · ${rows.length} record${rows.length === 1 ? '' : 's'}</div>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr>${head}</tr></thead>
        <tbody>${body || `<tr><td style="padding:14px;color:#5a6691;font-size:9.5pt">No records.</td></tr>`}</tbody>
      </table>
    </div>`;
    openPrintPreview({ title, recommend: cols.length > 5 ? 'landscape' : 'portrait', html });
  };

  const cell = (r, f) => {
    const v = r[f.key];
    if (f.type === 'bool') return v ? <span style={{ color: GREEN, fontWeight: 700 }}>✓</span> : <span style={{ color: '#c2c8d6' }}>—</span>;
    if (f.type === 'tags') return Array.isArray(v) ? v.join(', ') || '—' : (v || '—');
    if (f.type === 'number') return v ? Number(v).toLocaleString('en-IN') : '—';
    return v || '—';
  };

  return (
    <PageLayout
      maxWidth="max-w-[1100px] mx-auto"
      title={title}
      subtitle={`${subtitle} · ${rows.length} record${rows.length === 1 ? '' : 's'}`}
      actions={
        <>
          {toolbar}
          <Button variant="secondary" size="sm" icon={Download} onClick={exportSheet} disabled={rows.length === 0} title="Export all records to Excel">Export Excel</Button>
          <Button variant="secondary" size="sm" icon={Printer} onClick={printList} disabled={rows.length === 0} title="Print the current list">Print</Button>
          {!readOnly && <Button variant="primary" size="sm" icon={Plus} onClick={openNew}>New</Button>}
        </>
      }
    >
      {note && <div className="kbiz-card mb-3 px-3.5 py-2.5 text-[11px] text-ink-muted">{note}</div>}

      {list.isLoading && <LoadingState />}
      {list.isError && <ErrorState message={`${list.error?.message || 'Failed to load'} — is the ERP backend running and are you logged in?`} onRetry={list.refetch} />}

      {!list.isLoading && !list.isError && (
        <div className="kb-sticky rounded-brand border border-surface-border bg-surface shadow-card" style={{ '--stick-head': '#f3f5f9', maxHeight: 'calc(100vh - 220px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ background: '#f3f5f9' }}>
              {cols.map((f) => <th key={f.key} style={{ textAlign: f.type === 'number' ? 'right' : 'left', padding: '10px 13px', fontSize: 10, fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase', color: DIM, borderBottom: '1px solid #e6e8ec' }}>{f.label}</th>)}
              <th style={{ width: 84, padding: '10px 13px', borderBottom: '1px solid #e6e8ec' }} />
            </tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={cols.length + 1} style={{ padding: 28, textAlign: 'center', color: DIM }}>No records yet — click “New” to add one.</td></tr>}
              {rows.map((r) => (
                // rowStyle lets a view emphasize certain rows (e.g. a tinted,
                // bold band on each primary Tally group). Cell weight inherits
                // from the row so a bold rowStyle cascades to the text.
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f3f8', ...(rowStyle ? rowStyle(r) : null) }}>
                  {cols.map((f) => <td key={f.key} style={{ padding: '9px 13px', textAlign: f.type === 'number' ? 'right' : 'left', color: '#334155', fontWeight: f.key === 'name' ? 700 : 'inherit' }}>{cell(r, f)}</td>)}
                  <td style={{ padding: '9px 13px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {readOnly || (lockedRow && lockedRow(r))
                      ? <span title="Locked" style={{ color: '#c2c8d6', fontSize: 13 }}>🔒</span>
                      : (<>
                          <button onClick={() => openEdit(r)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: BLUE, padding: 4 }}><Pencil size={14} /></button>
                          <button onClick={() => del(r)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: RED, padding: 4 }}><Trash2 size={14} /></button>
                        </>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditModal
          title={`${editing.__new ? 'New' : 'Edit'} ${title.replace(/s$/, '')}`}
          fields={fields} record={editing}
          saving={create.isPending || update.isPending} error={err}
          onClose={() => setEditing(null)} onSave={save}
        />
      )}
    </PageLayout>
  );
}

/* ── The four masters as field configs ──────────────────────────────────── */
const PARENT_TYPES = ['Payment', 'Receipt', 'Sales', 'Purchase', 'Journal', 'Contra', 'Debit Note', 'Credit Note'];

export const VoucherTypesMaster = () => (
  <MasterCrud title="Voucher Types" subtitle="Tally voucher-type master" resource="voucher-types"
    fields={[
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'parentType', label: 'Type of Voucher', type: 'select', options: PARENT_TYPES, required: true },
      { key: 'abbreviation', label: 'Abbreviation', type: 'text' },
      { key: 'numberingMethod', label: 'Numbering', type: 'select', options: ['Automatic', 'Manual'], default: 'Automatic' },
      { key: 'prefix', label: 'Prefix', type: 'text' },
      { key: 'active', label: 'Active', type: 'bool', default: true },
    ]} />
);

export const CostCategoriesMaster = () => (
  <MasterCrud title="Cost Categories" subtitle="Parallel cost-centre allocation sets" resource="cost-categories"
    fields={[
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'allocateRevenue', label: 'Allocate Revenue Items', type: 'bool', default: true },
      { key: 'allocateNonRevenue', label: 'Allocate Non-Revenue Items', type: 'bool', default: false },
      { key: 'active', label: 'Active', type: 'bool', default: true },
    ]} />
);

export const BudgetsMaster = () => (
  <MasterCrud title="Budgets" subtitle="Budget targets by period" resource="budgets"
    fields={[
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'branch', label: 'Branch', type: 'text', default: 'ALL' },
      { key: 'fromDate', label: 'From', type: 'date' },
      { key: 'toDate', label: 'To', type: 'date' },
      { key: 'amount', label: 'Amount', type: 'number' },
      { key: 'notes', label: 'Notes', type: 'text', table: false },
      { key: 'active', label: 'Active', type: 'bool', default: true },
    ]} />
);

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

/* ── Parties (live, backend-connected) ──────────────────────────────────── */
export const CustomersMaster = () => (
  <MasterCrud title="Customers" subtitle="Clients (Sundry Debtors) — live from the backend" resource="customers"
    fields={[
      { key: 'name', label: 'Name', type: 'text', required: true },
      // Branch must be a real code (not a free-text/blank field) — a blank branch creates
      // an unscoped party. Default 'ALL' matches how auto-created party ledgers are scoped.
      { key: 'branch', label: 'Branch', type: 'select', options: ['ALL', ...BRANCH_CODES], default: 'ALL', required: true },
      { key: 'gstin', label: 'GSTIN', type: 'text', table: false },
      { key: 'address', label: 'Address', type: 'text', table: false },
      { key: 'city', label: 'City', type: 'text', table: false },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'contact', label: 'Contact', type: 'text', table: false },
      { key: 'email', label: 'Email', type: 'text', table: false },
      { key: 'creditLimit', label: 'Credit Limit', type: 'number' },
      { key: 'creditDays', label: 'Credit Days', type: 'number' },
    ]} />
);

export const SuppliersMaster = () => (
  <MasterCrud title="Suppliers" subtitle="Vendors (Sundry Creditors) — live from the backend" resource="suppliers"
    fields={[
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'category', label: 'Category', type: 'text' },
      { key: 'type', label: 'Type', type: 'text' },
      // Branch must be a real code, not free-text/blank (a blank branch = unscoped party).
      { key: 'branch', label: 'Branch', type: 'select', options: ['ALL', ...BRANCH_CODES], default: 'ALL', required: true },
      { key: 'gstin', label: 'GSTIN', type: 'text', table: false },
      { key: 'pan', label: 'PAN', type: 'text', table: false },
      { key: 'contact', label: 'Contact', type: 'text', table: false },
      { key: 'phone', label: 'Phone', type: 'text' },
      { key: 'email', label: 'Email', type: 'text', table: false },
      { key: 'city', label: 'City', type: 'text', table: false },
      { key: 'country', label: 'Country', type: 'text', table: false },
      { key: 'creditDays', label: 'Credit Days', type: 'number' },
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

// Chart-of-Accounts matrix. Flattens the whole hierarchy into one sorted grid:
//   Tally Parent Group ▸ Tally Sub Parent Group ▸ ERP Group ▸ ERP Sub Group ▸ ERP Ledger
// The two Tally columns are the fixed 28-group skeleton (read-only, 🔒). The
// three ERP columns are the user's custom chart — each editable in place via a
// pencil that opens the existing Sub-Group / Ledger editor (reuses the live
// CRUD). Sorted by the full path, so each level nests under the one before it.
export const GroupsMaster = ({ branch }) => {
  const groupsQ = useMasterList('groups');
  const [branchView, setBranchView] = useState(branchCode(branch) || 'ALL');
  // Fetch every branch's ledgers once and scope client-side, so we can tell a
  // globally-empty (shared/common) group apart from one used only by another
  // branch. Groups are org-wide (not branch-scoped).
  const ledgersQ = useMasterList('ledgers', {});
  const subMut = useMasterMutations('subgroups');
  const ledMut = useMasterMutations('ledgers');
  const [editing, setEditing] = useState(null);
  const [err, setErr] = useState('');

  const groups = groupsQ.data || [];
  const allLedgers = ledgersQ.data || [];
  // A branch view shows its OWN ledgers + the shared Common ('ALL') ledgers;
  // the consolidated (ALL) view shows every branch's ledgers.
  const inScope = (l) => branchView === 'ALL' || !l.branch || l.branch === 'ALL' || l.branch === branchView;
  const ledgers = allLedgers.filter(inScope);
  const byName = new Map(groups.map((g) => [g.name, g]));

  // Walk a group up to its primary root, classifying each level of the chain:
  //   system + no parent → Tally Parent (primary) · system + parent → Tally Sub
  //   custom (system:false) → ERP Group (first) then ERP Sub Group (deeper).
  const resolvePath = (startName) => {
    const chain = []; let cur = byName.get(startName), guard = 0;
    while (cur && guard++ < 25) { chain.unshift(cur); cur = cur.parent ? byName.get(cur.parent) : null; }
    const primary = chain.find((n) => n.system && !n.parent);
    const tallySub = chain.find((n) => n.system && n.parent);
    const customs = chain.filter((n) => !n.system);
    return {
      tallyParent: primary ? primary.name : (chain[0] ? chain[0].name : ''),
      tallySub: tallySub ? tallySub.name : '',
      erpGroup: customs[0] ? customs[0].name : '',
      erpSub: customs.length > 1 ? customs.slice(1).map((n) => n.name).join(' ▸ ') : '',
      groupNode: customs[0] || null,                                   // editable ERP Group node
      subGroupNode: customs.length > 1 ? customs[customs.length - 1] : null, // deepest ERP sub-group
    };
  };

  // One row per ledger (full ancestry path), plus one per EMPTY leaf group (no
  // child groups and no ledgers) so the structure stays fully visible/editable.
  const attachOf = (l) => ((l.subGroup && byName.has(l.subGroup)) ? l.subGroup : l.group);
  const hasChild = new Set(groups.filter((g) => g.parent).map((g) => g.parent));
  // A group used by SOME branch (any ledger, across all branches) but with no
  // in-scope ledger belongs only to other branches → hidden in a branch view.
  // A globally-empty group is part of the shared/common skeleton → shown in
  // every view, even with no entry.
  const groupsWithAnyLedger = new Set(allLedgers.map(attachOf));
  const rows = [];
  ledgers.forEach((l) => rows.push({ ...resolvePath(attachOf(l)), ledgerName: l.name, ledgerNode: l, branchTag: l.branch || 'ALL', key: 'L' + l.id }));
  groups.forEach((g) => {
    if (!hasChild.has(g.name) && !groupsWithAnyLedger.has(g.name)) rows.push({ ...resolvePath(g.name), ledgerName: '', ledgerNode: null, branchTag: '', key: 'G' + g.id });
  });

  // Sort by the cascade: Tally Parent ▸ Tally Sub ▸ ERP Group ▸ ERP Sub ▸ Ledger
  // (A→Z, case-insensitive & numeric-aware; blanks sort first within a level).
  const lc = (x, y) => String(x).localeCompare(String(y), 'en', { sensitivity: 'base', numeric: true });
  const ef = (x, y) => (x === '' ? (y === '' ? 0 : -1) : (y === '' ? 1 : lc(x, y)));
  rows.sort((a, b) => ef(a.tallyParent, b.tallyParent) || ef(a.tallySub, b.tallySub)
    || ef(a.erpGroup, b.erpGroup) || ef(a.erpSub, b.erpSub) || ef(a.ledgerName, b.ledgerName));

  // ── Edit wiring — reuse the Sub-Group / Ledger field configs & live CRUD ──
  const parentOptions = groups.map((g) => g.name);
  const parentOf = new Map(groups.map((g) => [g.name, g.parent || '']));
  const subGroupsUnder = (groupName) => {
    if (!groupName) return [];
    const out = [];
    for (const g of groups) { if (g.system) continue; let p = g.parent, gd = 0; while (p && gd++ < 20) { if (p === groupName) { out.push(g.name); break; } p = parentOf.get(p) || ''; } }
    return out.sort();
  };
  const SUB_FIELDS = [
    { key: 'name', label: 'Sub-Group Name', type: 'text', required: true },
    { key: 'parent', label: 'Nest under (parent group / sub-group)', type: 'select', options: parentOptions, required: true },
    { key: 'active', label: 'Active', type: 'bool', default: true },
  ];
  // Tax accounts are governed (super-admin-only) and manual creation is blocked server-side
  // for everyone — so don't offer them in the create form (picking one just yields a raw 403).
  const TAX_GROUP_NAMES = new Set(['Duties & Taxes', 'Input GST', 'Output GST', 'Reverse Charge (RCM)', 'GST Control / Reconciliation', 'TDS & TCS', 'VAT']);
  const ledgerGroupOptions = parentOptions.filter((g) => !TAX_GROUP_NAMES.has(g));
  const LED_FIELDS = [
    // Code is allocated by the server (<BRANCH>-MN-NNNN) — read-only, never typed.
    { key: 'code', label: 'Code (auto-generated)', type: 'text', readOnly: true, placeholder: 'Assigned automatically on save' },
    { key: 'name', label: 'Ledger Name', type: 'text', required: true },
    { key: 'group', label: 'Group', type: 'select', options: ledgerGroupOptions, required: true },
    { key: 'subGroup', label: 'Sub-Group', type: 'select', emptyLabel: '— None —',
      options: (form) => { const subs = subGroupsUnder(form.group); return form.subGroup && !subs.includes(form.subGroup) ? [form.subGroup, ...subs] : subs; } },
    { key: 'branch', label: 'Branch', type: 'select', options: ['ALL', ...BRANCH_CODES], default: 'ALL' },
    { key: 'currency', label: 'Currency', type: 'select', options: ACTIVE_CURRENCIES, default: 'INR' },
    { key: 'openingBalance', label: 'Opening Balance', type: 'number', default: 0 },
    { key: 'drCr', label: 'Dr/Cr', type: 'select', options: ['Dr', 'Cr'], default: 'Dr' },
    { key: 'active', label: 'Active', type: 'bool', default: true },
  ];
  // Create-mode field sets. An ERP Group nests under a Tally (system) group; an
  // ERP Sub Group nests under an existing custom sub-group. Both are subgroups.
  const GROUP_NEW_FIELDS = [
    { key: 'name', label: 'ERP Group Name', type: 'text', required: true },
    { key: 'parent', label: 'Under (Primary Group / Primary Sub Group)', type: 'select', options: groups.filter((g) => g.system).map((g) => g.name), required: true },
    { key: 'active', label: 'Active', type: 'bool', default: true },
  ];
  const SUBGROUP_NEW_FIELDS = [
    { key: 'name', label: 'ERP Sub Group Name', type: 'text', required: true },
    { key: 'parent', label: 'Under (ERP group / sub-group)', type: 'select', options: groups.filter((g) => !g.system).map((g) => g.name), required: true },
    { key: 'active', label: 'Active', type: 'bool', default: true },
  ];

  // Never open a locked Primary Group / Primary Sub Group for edit (defence in
  // depth — the locked columns render no pencil, and the backend rejects with 423).
  const openEdit = (kind, node) => { if (!node || isPrimaryLocked(node)) return; setErr(''); setEditing({ kind, fields: kind === 'ledger' ? LED_FIELDS : SUB_FIELDS, record: { ...node }, label: kind === 'ledger' ? 'Ledger' : 'Sub-Group' }); };
  const openNew = (what) => {
    setErr('');
    const fields = what === 'ledger' ? LED_FIELDS : what === 'group' ? GROUP_NEW_FIELDS : SUBGROUP_NEW_FIELDS;
    setEditing({
      kind: what === 'ledger' ? 'ledger' : 'subgroup',
      fields, record: { __new: true, ...blankFromFields(fields) },
      label: what === 'ledger' ? 'ERP Ledger' : what === 'group' ? 'ERP Group' : 'ERP Sub Group',
    });
  };
  const saveEdit = (form) => {
    setErr('');
    const { id, __new, ...body } = form;
    const m = editing.kind === 'ledger' ? ledMut : subMut;
    const opts = { onSuccess: () => setEditing(null), onError: (e) => setErr(e.message) };
    if (__new) m.create.mutate(body, opts);
    else m.update.mutate({ id, body }, opts);
  };
  const saving = editing && (editing.kind === 'ledger'
    ? (ledMut.update.isPending || ledMut.create.isPending)
    : (subMut.update.isPending || subMut.create.isPending));

  // ── Render — columns: 2 locked Tally + 3 editable ERP ──
  const COLS = [
    { key: 'tallyParent', label: 'Primary Group', lock: true },
    { key: 'tallySub', label: 'Primary Sub Group', lock: true },
    { key: 'erpGroup', label: 'ERP Group', kind: 'subgroup', node: 'groupNode' },
    { key: 'erpSub', label: 'ERP Sub Group', kind: 'subgroup', node: 'subGroupNode' },
    { key: 'ledgerName', label: 'ERP Ledger', kind: 'ledger', node: 'ledgerNode' },
  ];
  const doExport = () => exportToExcel('chart-of-accounts', COLS.map((c) => ({ key: c.key, label: c.label })),
    rows.map((r) => ({ tallyParent: r.tallyParent, tallySub: r.tallySub, erpGroup: r.erpGroup, erpSub: r.erpSub, ledgerName: r.ledgerName })));
  const subGroupCount = groups.filter((g) => !g.system).length;
  const loading = groupsQ.isLoading || ledgersQ.isLoading;
  const th = { textAlign: 'left', padding: '10px 12px', fontSize: 10, fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase', color: DIM, borderBottom: '1px solid #e6e8ec', whiteSpace: 'nowrap' };
  const pencilBtn = { background: 'none', border: 'none', cursor: 'pointer', color: BLUE, padding: 2, marginLeft: 6, verticalAlign: 'middle' };

  return (
    <PageLayout
      maxWidth="max-w-[1280px] mx-auto"
      title="Chart of Accounts"
      subtitle={`Primary Group ▸ Primary Sub Group ▸ ERP Group ▸ ERP Sub Group ▸ ERP Ledger · ${rows.length} rows · ${subGroupCount} sub-groups · ${ledgers.length} ledgers${branchView !== 'ALL' ? ` (${branchView} + Common)` : ''}`}
      actions={
        <>
          <label className="inline-flex items-center gap-1.5 text-[11px] font-bold text-ink-muted">
            Branch
            <div className="w-36"><Select value={branchView} onChange={(e) => setBranchView(e.target.value)}>
              <option value="ALL">{CONSOLIDATED_LABEL}</option>
              {BRANCH_CODES.map((b) => <option key={b} value={b}>{b} + Common</option>)}
            </Select></div>
          </label>
          <Button variant="secondary" size="sm" icon={Download} onClick={doExport} disabled={!rows.length}>Export Excel</Button>
        </>
      }
    >
      {/* Create row — one button per ERP level (Tally groups are fixed, so none here). */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="mr-0.5 text-[11px] font-bold text-ink-muted">New:</span>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => openNew('group')}>ERP Group</Button>
        <Button variant="primary" size="sm" icon={Plus} onClick={() => openNew('subgroup')} className="bg-[#1a3a6e] hover:bg-[#15315c]">ERP Sub Group</Button>
        <Button variant="success" size="sm" icon={Plus} onClick={() => openNew('ledger')}>ERP Ledger</Button>
      </div>
      <div className="kbiz-card mb-3 px-3.5 py-2.5 text-[11px] text-ink-muted">
        🔒 <b>Primary Group</b> (16) &amp; <b>Primary Sub Group</b> (12) are the fixed 28-group backbone — <b>locked &amp; non-editable</b>. The <b>ERP Group / Sub Group / Ledger</b> columns are your custom chart — click the <Pencil size={11} style={{ verticalAlign: 'middle', color: BLUE }} /> in a cell to edit that node. To add new ones, use Masters → Sub-Groups / Ledgers.
      </div>

      {loading && <LoadingState label="Loading chart…" />}
      {(groupsQ.isError || ledgersQ.isError) && <ErrorState message="Failed to load — is the ERP backend running and are you logged in?" />}

      {!loading && !groupsQ.isError && (
        <div className="kb-sticky rounded-brand border border-surface-border bg-surface shadow-card" style={{ '--stick-head': '#f3f5f9', maxHeight: 'calc(100vh - 240px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ background: '#f3f5f9' }}>
              {COLS.map((c) => <th key={c.key} style={th}>{c.lock ? '🔒 ' : ''}{c.label}</th>)}
            </tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={COLS.length} style={{ padding: 28, textAlign: 'center', color: DIM }}>No accounts yet.</td></tr>}
              {rows.map((r) => (
                <tr key={r.key} style={{ borderBottom: '1px solid #f1f3f8' }}>
                  {COLS.map((c) => {
                    const v = r[c.key];
                    const node = c.node ? r[c.node] : null;
                    const isLedger = c.key === 'ledgerName';
                    return (
                      <td key={c.key} style={{ padding: '8px 12px', color: c.lock ? '#64748b' : '#1f2a44', fontWeight: c.key === 'tallyParent' ? 700 : 400, whiteSpace: 'nowrap' }}>
                        <span style={{ color: v ? undefined : '#c2c8d6' }}>{v || '—'}</span>
                        {isLedger && v && (branchView === 'ALL' || r.branchTag === 'ALL') && (
                          <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, marginLeft: 6, background: r.branchTag === 'ALL' ? '#eef1f6' : '#e7f0fb', color: r.branchTag === 'ALL' ? DIM : BLUE }}>{r.branchTag === 'ALL' ? 'Common' : r.branchTag}</span>
                        )}
                        {isLedger && v && r.ledgerNode && r.ledgerNode.locked && <span title="Locked — super-admin only" style={{ marginLeft: 4, fontSize: 10 }}>🔒</span>}
                        {isLedger && v && r.ledgerNode && r.ledgerNode.source && <SourceBadge source={r.ledgerNode.source} />}
                        {!c.lock && node && (
                          <button onClick={() => openEdit(c.kind, node)} title={`Edit ${c.label}`} style={pencilBtn}><Pencil size={13} /></button>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <EditModal title={`${editing.record?.__new ? 'New' : 'Edit'} ${editing.label}`} fields={editing.fields} record={editing.record}
          saving={saving} error={err} onClose={() => setEditing(null)} onSave={saveEdit} />
      )}
    </PageLayout>
  );
};

// Sub-Groups are the user-managed custom nodes. They nest under any group (or
// another sub-group) to any depth and inherit Nature / Statement from the parent.
export const SubGroupsMaster = () => {
  // Parent options = every group + existing sub-group, live from /api/groups.
  const groupsQ = useMasterList('groups');
  const parentOptions = (groupsQ.data || []).map((g) => g.name);
  return (
    <MasterCrud title="Sub-Groups" subtitle="Custom Chart-of-Accounts sub-groups — nest under any group, to any depth"
      resource="subgroups"
      note="Sub-groups are SHARED across all branches (they are not branch-scoped), so you create them once and every branch's chart uses them. Create a sub-group under one of the 28 fixed Primary Groups / Primary Sub Groups (or under another sub-group, to any depth). Nature & Statement (BS/PL) are inherited from the parent automatically. For the P&L Fixed/Variable split, just create real 'Fixed Expenses' and 'Variable Expenses' sub-groups under Indirect Expenses and nest your expense sub-groups under them — the P&L rolls up automatically from the hierarchy."
      fields={[
        { key: 'name', label: 'Sub-Group Name', type: 'text', required: true },
        // "Primary Group" always shows the fixed top-level root group. The editable
        // "Nest under" select is the immediate parent (a fixed group OR another sub-group).
        { key: 'rootGroup', label: 'Primary Group', type: 'text', input: false },
        { key: 'nestedUnder', label: 'Sub-group of', type: 'text', input: false },
        { key: 'parent', label: 'Nest under (parent group / sub-group)', type: 'select', options: parentOptions.length ? parentOptions : TALLY_GROUP_NAMES, required: true, table: false },
        { key: 'nature', label: 'Nature', type: 'text', input: false },
        { key: 'statement', label: 'Statement', type: 'text', input: false },
        { key: 'active', label: 'Active', type: 'bool', default: true },
      ]} />
  );
};


export const LedgersMaster = ({ branch }) => {
  // Suggest group names in a dropdown — live from /api/groups (28 Tally + custom),
  // falling back to the 28 Tally names until the list loads.
  const groupsQ = useMasterList('groups');
  const groups = groupsQ.data || [];
  const groupOptions = groups.map((g) => g.name);
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

  // Branch view filter. Single-branch (BOM) operation: the whole chart is owned by
  // BOM, so default to BOM (the selected branch when one is picked; BOM when the top
  // bar is on "All branches"/unset) rather than the org-wide "All branches" view.
  const [branchView, setBranchView] = useState(() => {
    const c = branchCode(branch);
    return (!c || c === 'ALL') ? 'BOM' : c;
  });
  const branchOptions = ['ALL', ...BRANCH_CODES];

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
      <label className={selWrap}>Branch
        <div className="w-28"><Select value={branchView} onChange={(e) => setBranchView(e.target.value)}>
          <option value="ALL">All branches</option>
          {BRANCH_CODES.map((b) => <option key={b} value={b}>{b}</option>)}
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
    </>
  );

  return (
    <>
      <MasterCrud title="Ledgers" subtitle={`Chart of Accounts — ledger accounts (live)${branchView !== 'ALL' ? ` · ${branchView} + shared` : ''}`}
        resource="ledgers"
        params={branchView !== 'ALL' ? { branch: branchView, includeInactive: 'true' } : { includeInactive: 'true' }}
        toolbar={toolbar}
        rowFilter={ledgerRowFilter}
        note="Set Group to the Primary Group / Primary Sub Group (e.g. Sundry Debtors), then pick a Sub-Group to nest this ledger under it on the Balance Sheet. Create sub-groups first in Masters → Sub-Groups. All ledgers are owned by the BOM branch."
        fields={[
          { key: 'code', label: 'Code', type: 'text', required: true },
          { key: 'name', label: 'Ledger Name', type: 'text', required: true },
          { key: 'group', label: 'Group', type: 'select', options: groupOptions.length ? groupOptions : TALLY_GROUP_NAMES, required: true },
          { key: 'subGroup', label: 'Sub-Group', type: 'select', table: false, emptyLabel: '— None —',
            options: (form) => { const subs = subGroupsUnder(form.group); return form.subGroup && !subs.includes(form.subGroup) ? [form.subGroup, ...subs] : subs; } },
          { key: 'branch', label: 'Branch', type: 'select', options: branchOptions, default: 'BOM' },
          { key: 'currency', label: 'Currency', type: 'select', options: ACTIVE_CURRENCIES, default: 'INR' },
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
