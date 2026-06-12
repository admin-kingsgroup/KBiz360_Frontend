/* ════════════════════════════════════════════════════════════════════
   MODULES/MASTERS-LIVE.JSX

   Tally accounting masters that were missing from Books, now backed by the ERP
   backend (/api/voucher-types, /api/cost-categories, /api/budgets,
   /api/scenarios). A single generic <MasterCrud> renders the table + add/edit
   modal; each master is just a field config.
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { Plus, Pencil, Trash2, X, Download } from 'lucide-react';
import { card, inp } from '../core/styles';
import { ACTIVE_CURRENCIES, BRANCH_CODES } from '../core/data';
import { useMasterList, useMasterMutations } from '../core/useMasters';
import { branchCode } from '../core/useAccounting';
import { apiPost } from '../core/api';
import { exportToExcel } from '../core/exportExcel';

const DARK = '#0d1326', BLUE = '#0070f2', DIM = '#5a6691', RED = '#A32D2D', GREEN = '#27500A';
const btn = (bg, fg) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: bg, color: fg });

const blankFromFields = (fields) => fields.reduce((o, f) => {
  o[f.key] = f.type === 'bool' ? (f.default ?? false) : f.type === 'tags' ? [] : f.type === 'number' ? (f.default ?? 0) : (f.default ?? '');
  return o;
}, {});

function FieldInput({ field, value, onChange, form }) {
  if (field.type === 'bool') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#334155', cursor: 'pointer' }}>
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
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inp, fontSize: 12.5 }}>
        <option value="">{field.emptyLabel || 'Select…'}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  if (field.type === 'tags') {
    return (
      <input value={Array.isArray(value) ? value.join(', ') : value}
        onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
        placeholder="comma, separated, values" style={{ ...inp, fontSize: 12.5 }} />
    );
  }
  return (
    <input type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
      value={value} onChange={(e) => onChange(field.type === 'number' ? Number(e.target.value) : e.target.value)}
      placeholder={field.placeholder || ''} style={{ ...inp, fontSize: 12.5 }} />
  );
}

function EditModal({ title, fields, record, onClose, onSave, saving, error }) {
  const [form, setForm] = useState(record);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const editable = fields.filter((f) => f.input !== false); // table-only fields (e.g. derived) aren't edited
  const missing = editable.filter((f) => f.required && (form[f.key] === '' || form[f.key] == null));
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.45)', zIndex: 700, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '7vh' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: 460, maxWidth: '94vw', maxHeight: '82vh', overflowY: 'auto', padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', borderBottom: '1px solid #e5e9f0' }}>
          <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: DARK }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM }}><X size={18} /></button>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {editable.map((f) => (
            <div key={f.key}>
              {f.type !== 'bool' && <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: DIM, marginBottom: 4 }}>{f.label}{f.required && <span style={{ color: RED }}> *</span>}</label>}
              <FieldInput field={f} value={form[f.key]} onChange={(v) => set(f.key, v)} form={form} />
            </div>
          ))}
          {error && <div style={{ fontSize: 11.5, color: RED, fontWeight: 600 }}>⚠ {error}</div>}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 16px', borderTop: '1px solid #e5e9f0' }}>
          <button onClick={onClose} style={btn('#eef1f6', DIM)}>Cancel</button>
          <button disabled={saving || missing.length > 0} onClick={() => onSave(form)} style={{ ...btn(BLUE, '#fff'), opacity: missing.length ? 0.5 : 1 }}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MasterCrud({ title, subtitle, resource, fields, params, readOnly = false, lockedRow, note, toolbar, rowFilter }) {
  const list = useMasterList(resource, params);
  const { create, update, remove } = useMasterMutations(resource);
  const [editing, setEditing] = useState(null); // record being edited, or {} for new
  const [err, setErr] = useState('');
  // rowFilter narrows the listing client-side (e.g. show only the 28 system
  // parent groups, not the custom sub-groups that share the same resource).
  const rows = (list.data || []).filter(rowFilter || (() => true));
  const cols = fields.filter((f) => f.table !== false);

  const openNew = () => { setErr(''); setEditing({ __new: true, ...blankFromFields(fields) }); };
  const openEdit = (r) => { setErr(''); setEditing({ ...blankFromFields(fields), ...r }); };

  const save = (form) => {
    setErr('');
    const { __new, id, ...body } = form;
    const onError = (e) => setErr(e.message);
    if (__new) create.mutate(body, { onSuccess: () => setEditing(null), onError });
    else update.mutate({ id, body }, { onSuccess: () => setEditing(null), onError });
  };

  const del = (r) => { if (window.confirm(`Delete "${r.name}"?`)) remove.mutate(r.id); };

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

  const cell = (r, f) => {
    const v = r[f.key];
    if (f.type === 'bool') return v ? <span style={{ color: GREEN, fontWeight: 700 }}>✓</span> : <span style={{ color: '#c2c8d6' }}>—</span>;
    if (f.type === 'tags') return Array.isArray(v) ? v.join(', ') || '—' : (v || '—');
    if (f.type === 'number') return v ? Number(v).toLocaleString('en-IN') : '—';
    return v || '—';
  };

  return (
    <div style={{ padding: '12px 10px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: DARK }}>{title}</h2>
          <p style={{ margin: '2px 0 0', fontSize: 10.5, color: DIM }}>{subtitle} · {rows.length} record{rows.length === 1 ? '' : 's'}</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {toolbar}
          <button onClick={exportSheet} disabled={rows.length === 0} title="Export all records to Excel"
            style={{ ...btn('#fff', DARK), border: '1px solid #d6dbe6', opacity: rows.length === 0 ? 0.5 : 1, cursor: rows.length === 0 ? 'not-allowed' : 'pointer' }}>
            <Download size={14} /> Export Excel
          </button>
          {!readOnly && <button onClick={openNew} style={btn(BLUE, '#fff')}><Plus size={14} /> New</button>}
        </div>
      </div>
      {note && <div style={{ ...card, padding: '9px 13px', marginBottom: 12, fontSize: 11, color: DIM }}>{note}</div>}

      {list.isLoading && <div style={{ ...card, padding: 28, textAlign: 'center', color: DIM, fontSize: 12 }}>Loading…</div>}
      {list.isError && <div style={{ ...card, padding: 16, color: RED, fontSize: 12, fontWeight: 600 }}>⚠ {list.error?.message || 'Failed to load'} — is the ERP backend running and are you logged in?</div>}

      {!list.isLoading && !list.isError && (
        <div className="kb-sticky" style={{ ...card, padding: 0, '--stick-head': '#f3f5f9', maxHeight: 'calc(100vh - 220px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ background: '#f3f5f9' }}>
              {cols.map((f) => <th key={f.key} style={{ textAlign: f.type === 'number' ? 'right' : 'left', padding: '10px 13px', fontSize: 10, fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase', color: DIM, borderBottom: '1px solid #e5e9f0' }}>{f.label}</th>)}
              <th style={{ width: 84, padding: '10px 13px', borderBottom: '1px solid #e5e9f0' }} />
            </tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={cols.length + 1} style={{ padding: 28, textAlign: 'center', color: DIM }}>No records yet — click “New” to add one.</td></tr>}
              {rows.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f1f3f8' }}>
                  {cols.map((f) => <td key={f.key} style={{ padding: '9px 13px', textAlign: f.type === 'number' ? 'right' : 'left', color: '#334155', fontWeight: f.key === 'name' ? 700 : 400 }}>{cell(r, f)}</td>)}
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
    </div>
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
      { key: 'branch', label: 'Branch', type: 'text' },
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
      { key: 'branch', label: 'Branch', type: 'text' },
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
// The 28 seeded Tally groups (parent options for custom groups/sub-groups).
const TALLY_GROUP_NAMES = [
  'Capital Account', 'Loans (Liability)', 'Bank OD Accounts', 'Secured Loans', 'Unsecured Loans',
  'Current Liabilities', 'Duties & Taxes', 'Provisions', 'Sundry Creditors',
  'Fixed Assets', 'Investments', 'Current Assets', 'Bank Accounts', 'Cash-in-Hand',
  'Deposits (Asset)', 'Loans & Advances (Asset)', 'Stock-in-Hand', 'Sundry Debtors',
  'Sales Accounts', 'Direct Income', 'Purchase Accounts', 'Direct Expenses',
  'Indirect Expenses', 'Indirect Income', 'Opening Stock', 'Closing Stock',
  'Misc. Expenses (Asset)', 'Suspense Account',
];

// Groups are the 28 FIXED Tally groups — READ-ONLY (no create / edit / delete).
export const GroupsMaster = () => (
  <MasterCrud title="Parent Groups (28 Tally · Fixed · Read-only)" subtitle="The 28 fixed Tally parent groups — the top of the chart of accounts"
    resource="groups" readOnly rowFilter={(g) => g.system}
    note="🔒 The 28 Tally groups are fixed and cannot be created, edited or deleted. To extend the chart, add Sub-Groups under a group (Masters → Sub-Groups)."
    fields={[
      { key: 'name', label: 'Group Name', type: 'text' },
      { key: 'parent', label: 'Parent Group', type: 'text' },
      { key: 'nature', label: 'Nature', type: 'text' },
      { key: 'statement', label: 'Statement', type: 'text' },
    ]} />
);

// Sub-Groups are the user-managed custom nodes. They nest under any group (or
// another sub-group) to any depth and inherit Nature / Statement from the parent.
export const SubGroupsMaster = () => {
  // Parent options = every group + existing sub-group, live from /api/groups.
  const groupsQ = useMasterList('groups');
  const parentOptions = (groupsQ.data || []).map((g) => g.name);
  return (
    <MasterCrud title="Sub-Groups" subtitle="Custom Chart-of-Accounts sub-groups — nest under any group, to any depth"
      resource="subgroups"
      note="Sub-groups are SHARED across all branches (they are not branch-scoped), so you create them once and every branch's chart uses them. Create a sub-group under one of the 28 fixed groups (or under another sub-group, to any depth). Nature & Statement (BS/PL) are inherited from the parent automatically. For the P&L Fixed/Variable split, just create real 'Fixed Expenses' and 'Variable Expenses' sub-groups under Indirect Expenses and nest your expense sub-groups under them — the P&L rolls up automatically from the hierarchy."
      fields={[
        { key: 'name', label: 'Sub-Group Name', type: 'text', required: true },
        // "Parent Group" always shows the 28-Tally root group. The editable "Nest
        // under" select is the immediate parent (a 28 group OR another sub-group).
        { key: 'rootGroup', label: 'Parent Group (Tally)', type: 'text', input: false },
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

  // Branch view filter: a branch chart = its own ledgers + the org-wide 'ALL'
  // (shared) ledgers; see ledgers.service.getAll.
  const [branchView, setBranchView] = useState(branchCode(branch) || 'ALL'); // default to the current branch
  const branchOptions = ['ALL', ...BRANCH_CODES];

  const toolbar = (
    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, color: DIM }}>
      Branch
      <select value={branchView} onChange={(e) => setBranchView(e.target.value)}
        style={{ ...inp, fontSize: 12, padding: '7px 9px', width: 'auto', minWidth: 120 }}>
        <option value="ALL">All branches</option>
        {BRANCH_CODES.map((b) => <option key={b} value={b}>{b}</option>)}
      </select>
    </label>
  );

  return (
    <>
      <MasterCrud title="Ledgers" subtitle={`Chart of Accounts — ledger accounts (live)${branchView !== 'ALL' ? ` · ${branchView} + shared` : ''}`}
        resource="ledgers"
        params={branchView !== 'ALL' ? { branch: branchView } : {}}
        toolbar={toolbar}
        note="Set Group to the parent Tally group (e.g. Sundry Debtors), then pick a Sub-Group to nest this ledger under it on the Balance Sheet. Create sub-groups first in Masters → Sub-Groups. Shared heads (income / expense / tax) should use Branch = ALL so every branch sees one copy; keep Branch-specific parties under their own branch."
        fields={[
          { key: 'code', label: 'Code', type: 'text', required: true },
          { key: 'name', label: 'Ledger Name', type: 'text', required: true },
          { key: 'group', label: 'Group', type: 'select', options: groupOptions.length ? groupOptions : TALLY_GROUP_NAMES, required: true },
          { key: 'subGroup', label: 'Sub-Group', type: 'select', table: false, emptyLabel: '— None —',
            options: (form) => { const subs = subGroupsUnder(form.group); return form.subGroup && !subs.includes(form.subGroup) ? [form.subGroup, ...subs] : subs; } },
          { key: 'branch', label: 'Branch', type: 'select', options: branchOptions, default: 'ALL' },
          { key: 'currency', label: 'Currency', type: 'select', options: ACTIVE_CURRENCIES, default: 'INR' },
          { key: 'openingBalance', label: 'Opening Balance', type: 'number', default: 0 },
          { key: 'drCr', label: 'Dr/Cr', type: 'select', options: ['Dr', 'Cr'], default: 'Dr' },
          { key: 'active', label: 'Active', type: 'bool', default: true },
        ]} />
    </>
  );
};
