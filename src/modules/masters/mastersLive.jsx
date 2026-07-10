/* ════════════════════════════════════════════════════════════════════
   MODULES/MASTERS-LIVE.JSX

   Tally accounting masters that were missing from Books, now backed by the ERP
   backend (/api/voucher-types, /api/cost-categories, /api/budgets,
   /api/scenarios). A single generic <MasterCrud> renders the table + add/edit
   modal; each master is just a field config.
   ════════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, Download, Printer, Ban, RotateCcw } from 'lucide-react';
import { ACTIVE_CURRENCIES, BRANCH_CODES, CONSOLIDATED_LABEL } from '../../core/data';
import {
  SUPPLIER_CATS, GST_TREATMENTS, COUNTRIES, STATE_NAMES, MSME_STATUS, TDS_SECTIONS,
  SETTLE_CYCLES, PAY_METHODS, CUST_TYPES, CUST_SOURCES,
} from '../../core/partyEnums';
import { useMasterList, useMasterMutations } from '../../core/useMasters';
import { SourceBadge } from '../../core/LedgerLabel';
import { branchCode } from '../../core/useAccounting';
import { exportToExcel } from '../../core/exportExcel';
import { openPrintPreview } from '../../core/PrintPreview';
import { useFormKeys } from '../../core/ux/forms';
import { usePager, Pager } from '../../core/ux/pager';
import { toast } from '../../core/ux/toast';
import { confirmDialog } from '../../core/ux/confirm';
import { Kbd } from '../../core/ux/widgets.jsx';
import { PageLayout } from '../../shell/PageLayout';
import { Modal, Button, Select, Input, LoadingState, ErrorState } from '../../shell/primitives';

const DARK = '#1a1c22', BLUE = '#2563eb', DIM = '#5b616e', RED = '#dc2626', GREEN = '#16a34a';

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

const blankFromFields = (fields) => fields.reduce((o, f) => {
  o[f.key] = f.type === 'bool' ? (f.default ?? false) : (f.type === 'tags' || f.type === 'multiselect') ? [] : f.type === 'number' ? (f.default ?? 0) : (f.default ?? '');
  return o;
}, {});

// Type-to-search, click-to-add multi-picker over live `options` (array or fn(form)).
// Already-picked values show as removable chips above the search box; the dropdown
// only lists NOT-yet-picked matches, so you can keep typing to add more.
function MultiSelectAutocomplete({ field, value, onChange, form }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const raw = typeof field.options === 'function' ? (field.options(form) || []) : (field.options || []);
  const options = raw.filter((o) => o !== '' && o != null);
  const selected = Array.isArray(value) ? value : [];
  const q = query.trim().toLowerCase();
  const matches = options.filter((o) => !selected.includes(o) && (!q || o.toLowerCase().includes(q)));

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const pick = (name) => { onChange([...selected, name]); setQuery(''); setOpen(false); };
  const remove = (name) => onChange(selected.filter((s) => s !== name));

  return (
    <div ref={boxRef} className="relative">
      {selected.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full bg-surface-alt px-2 py-0.5 text-[11px] font-medium text-ink">
              <span>{s}</span>
              <button type="button" onClick={() => remove(s)} className="text-ink-subtle hover:text-danger" aria-label={`Remove ${s}`}>×</button>
            </span>
          ))}
        </div>
      )}
      <Input value={query} onFocus={() => setOpen(true)} onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        placeholder={field.placeholder || 'Type to search…'} />
      {open && (
        <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-md border border-surface-border bg-surface shadow-md">
          {matches.length === 0 && <p className="px-2.5 py-2 text-[11.5px] text-ink-subtle">{field.emptyLabel || 'No matches.'}</p>}
          {matches.map((o) => (
            <button key={o} type="button" onClick={() => pick(o)}
              className="block w-full px-2.5 py-1.5 text-left text-[12.5px] text-ink hover:bg-surface-alt">
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
    // on the chosen Group). An empty list renders just the placeholder. We always
    // render our own empty placeholder option, so drop any blank entry the source
    // list carries (several partyEnums lists lead with '') to avoid a double-blank.
    const raw = typeof field.options === 'function' ? (field.options(form) || []) : (field.options || []);
    const options = raw.filter((o) => o !== '' && o != null);
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
  // Pick-from-list version of 'tags' — for fields that must reference REAL records
  // (e.g. Drawdown Ledgers → real ledgers) rather than free-typed names that could
  // typo or drift from the actual master. Type to filter, click to add — a separate
  // component so its own local (search text / open) state stays out of FieldInput,
  // which must not call hooks conditionally.
  if (field.type === 'multiselect') {
    return <MultiSelectAutocomplete field={field} value={value} onChange={onChange} form={form} />;
  }
  // System-managed fields (e.g. a ledger's auto-generated code) are shown but not
  // editable — render a greyed, read-only box with a hint when there's no value yet.
  if (field.readOnly) {
    // Use the shared <Input> primitive (carries the design-system base classes) and
    // overlay the greyed read-only look inline. (Was a raw <input style={{...inp}}>
    // referencing an `inp` token that isn't imported here — a ReferenceError that
    // crashed every read-only field, e.g. the auto-generated ledger Code.)
    return (
      <Input type="text" value={value || ''} readOnly disabled
        placeholder={field.placeholder || ''}
        style={{ background: '#f3f4f8', color: '#6b7280', cursor: 'not-allowed' }} />
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
  // Changing a field may invalidate a dependent one (e.g. picking a new Group makes
  // the previously-chosen Sub-Group stale). A field can declare `clears: ['subGroup']`
  // to reset those dependents to blank whenever it changes, or `onSet(v, next)` to
  // derive/overwrite another field's value (e.g. Country → auto-set State to 'Others').
  const set = (k, v) => setForm((f) => {
    const next = { ...f, [k]: v };
    const fld = fields.find((x) => x.key === k);
    if (fld && Array.isArray(fld.clears)) fld.clears.forEach((c) => { next[c] = ''; });
    if (fld && typeof fld.onSet === 'function') fld.onSet(v, next);
    return next;
  });
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

export function MasterCrud({ title, subtitle, resource, fields, params, readOnly = false, lockedRow, note, toolbar, rowFilter, mapRow, sortRows, rowStyle, initialEditKey }) {
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
  // Render one page at a time so a big master (900+ ledgers/parties) doesn't paint
  // every row; export/print below still build over the full `rows`.
  const pg = usePager(rows);
  const cols = fields.filter((f) => f.table !== false);

  const openNew = () => { setErr(''); setEditing({ __new: true, ...blankFromFields(fields) }); };
  const openEdit = (r) => { setErr(''); setEditing({ ...blankFromFields(fields), ...r }); };

  // Deep-link edit: when a caller passes ?edit=<code|id> (e.g. Bank Account Master's
  // row "Edit" → /masters/ledgers?edit=<code>), auto-open that record's editor once
  // the list has loaded. Gated on initialEditKey, so other masters are unaffected.
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoOpened.current || !initialEditKey || !list.data) return;
    const row = (list.data || []).find((r) => String(r.code) === String(initialEditKey) || String(r.id) === String(initialEditKey));
    if (row) { autoOpened.current = true; openEdit(row); }
  }, [initialEditKey, list.data]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = (form) => {
    setErr('');
    const { __new, id, ...body } = form;
    const label = body.name || body.code || 'Record';
    const onError = (e) => { setErr(e.message); toast(`Could not save — ${e.message}`, 'error'); };
    const onSuccess = () => { setEditing(null); toast(`${label} saved`); };
    // "derived:" rows are ledgers the backend surfaces here for visibility (a party
    // that only exists because a voucher referenced it) — they have no real master
    // document to PUT to. Opening one through "Edit" must still CREATE the real
    // record on save, or the backend 404s ("Cannot PUT .../derived:...").
    const isDerived = !id || String(id).startsWith('derived:');
    if (__new || isDerived) create.mutate(body, { onSuccess, onError });
    else update.mutate({ id, body }, { onSuccess, onError });
  };

  const del = async (r) => {
    const { confirmed } = await confirmDialog({ title: `Delete "${r.name}"?`, message: 'This cannot be undone.', danger: true, confirmLabel: 'Delete' });
    if (!confirmed) return;
    remove.mutate(r.id, { onSuccess: () => toast(`${r.name || 'Record'} deleted`), onError: (e) => toast(`Could not delete — ${e.message}`, 'error') });
  };

  // Safe alternative to delete, offered on every master that carries an `active`
  // flag: the record keeps its history/postings but is marked Inactive (and, where
  // the backend filters — ledgers, cost centres — leaves the pickers). Reversible.
  const hasActive = fields.some((f) => f.key === 'active');
  const toggleActive = async (r) => {
    const makeActive = r.active === false;
    if (!makeActive) {
      const { confirmed } = await confirmDialog({
        title: `Deactivate "${r.name}"?`,
        message: 'The record is kept with its full history but stops being offered for new entries. You can reactivate it any time.',
        confirmLabel: 'Deactivate',
      });
      if (!confirmed) return;
    }
    update.mutate({ id: r.id, body: { active: makeActive } }, {
      onSuccess: () => toast(`${r.name || 'Record'} ${makeActive ? 'reactivated' : 'deactivated'}`),
      onError: (e) => toast(`Could not ${makeActive ? 'reactivate' : 'deactivate'} — ${e.message}`, 'error'),
    });
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
    const body = rows.map((r, i) => `<tr style="background:${i % 2 ? '#f7f8fb' : '#fff'}">${cols.map((f) => `<td style="text-align:${f.type === 'number' ? 'right' : 'left'};padding:5px 9px;border-bottom:1px solid #cdd1d8;font-size:9pt;color:#222">${esc(txt(r, f))}</td>`).join('')}</tr>`).join('');
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
    // A wired/system ledger (locked) carries the `~*` marker on its name — ~ = engine-
    // wired, * = non-editable/non-deletable (changed only in the database).
    if (f.key === 'name' && r.locked) return (<>{v || '—'} <span title="Wired ledger — locked; editable only directly in the database" style={{ color: '#dc2626', fontWeight: 800, fontSize: 11 }}>~*</span></>);
    if (f.key === 'name' && r.active === false) return (<>{v || '—'} <span style={{ marginLeft: 6, padding: '1px 7px', borderRadius: 999, background: '#f3f4f8', color: '#5b616e', fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px' }}>Inactive</span></>);
    return v || '—';
  };

  return (
    <PageLayout
      maxWidth="max-w-[1100px] mx-auto"
      title={title}
      subtitle={`${subtitle} · ${rows.length} record${rows.length === 1 ? '' : 's'}`}
      actions={
        <>
          <Button variant="secondary" size="sm" icon={Download} onClick={exportSheet} disabled={rows.length === 0} title="Export all records to Excel">Export Excel</Button>
          <Button variant="secondary" size="sm" icon={Printer} onClick={printList} disabled={rows.length === 0} title="Print the current list">Print</Button>
          {!readOnly && <Button variant="primary" size="sm" icon={Plus} onClick={openNew}>New</Button>}
        </>
      }
      // Toolbar filters (Branch/Group/…) get their own full-width bordered bar —
      // matching the table's card width — instead of being squeezed into the
      // header actions row, where they used to wrap onto a left-aligned line.
      filters={toolbar}
    >
      {note && <div className="mb-3 rounded-brand border border-info/25 bg-info-soft px-3.5 py-2.5 text-[11px] text-ink shadow-card">{note}</div>}

      {list.isLoading && <LoadingState />}
      {list.isError && <ErrorState message={`${list.error?.message || 'Failed to load'} — is the ERP backend running and are you logged in?`} onRetry={list.refetch} />}

      {!list.isLoading && !list.isError && (
        <div className="kb-sticky rounded-brand border border-surface-border bg-surface shadow-card" style={{ '--stick-head': '#f3f5f9', maxHeight: 'calc(100vh - 220px)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead><tr style={{ background: '#f3f5f9' }}>
              {cols.map((f) => <th key={f.key} style={{ textAlign: f.type === 'number' ? 'right' : 'left', padding: '10px 13px', fontSize: 10, fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase', color: DIM, borderBottom: '1px solid #cdd1d8' }}>{f.label}</th>)}
              <th style={{ width: 84, padding: '10px 13px', borderBottom: '1px solid #cdd1d8' }} />
            </tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={cols.length + 1} style={{ padding: 28, textAlign: 'center', color: DIM }}>No records yet — click “New” to add one.</td></tr>}
              {pg.pageRows.map((r) => (
                // rowStyle lets a view emphasize certain rows (e.g. a tinted,
                // bold band on each primary Tally group). Cell weight inherits
                // from the row so a bold rowStyle cascades to the text.
                <tr key={r.id} style={{ borderBottom: '1px solid #dfe2e7', ...(r.active === false ? { opacity: 0.6 } : null), ...(rowStyle ? rowStyle(r) : null) }}>
                  {cols.map((f) => <td key={f.key} style={{ padding: '9px 13px', textAlign: f.type === 'number' ? 'right' : 'left', color: '#334155', fontWeight: f.key === 'name' ? 700 : 'inherit' }}>{cell(r, f)}</td>)}
                  <td style={{ padding: '9px 13px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                    {readOnly || (lockedRow && lockedRow(r))
                      ? <span title="Locked" style={{ color: '#c2c8d6', fontSize: 13 }}>🔒</span>
                      : (<>
                          <button onClick={() => openEdit(r)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: BLUE, padding: 4 }}><Pencil size={14} /></button>
                          {hasActive && (r.active === false
                            ? <button onClick={() => toggleActive(r)} title="Reactivate" style={{ background: 'none', border: 'none', cursor: 'pointer', color: GREEN, padding: 4 }}><RotateCcw size={14} /></button>
                            : <button onClick={() => toggleActive(r)} title="Deactivate — keeps the record and its history; use instead of Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#b45309', padding: 4 }}><Ban size={14} /></button>)}
                          <button onClick={() => del(r)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: RED, padding: 4 }}><Trash2 size={14} /></button>
                        </>)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pager pager={pg} />
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
const PARENT_TYPES = ['Payment', 'Receipt', 'Sales', 'Purchase', 'Journal', 'Contra', 'Debit Note'];

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
      // GSTIN is only mandatory once the customer is GST-registered (Regular/Composition) —
      // an Unregistered/SEZ/Overseas customer may have no GSTIN at all.
      { key: 'gstin', label: 'GSTIN', type: 'text', table: false, required: (f) => /^Registered/.test(f.gstTreatment || '') },
      { key: 'pan', label: 'PAN', type: 'text', table: false },
      { key: 'gstTreatment', label: 'GST Treatment', type: 'select', options: GST_TREATMENTS, table: false },
      { key: 'tdsSection', label: 'TDS Section', type: 'select', options: TDS_SECTIONS, table: false },
      // Some customers deduct TDS on what they pay us — flag it and capture the rate they
      // deduct at (applied per invoice); leave blank/hidden when the customer doesn't deduct.
      { key: 'isTdsDeducted', label: 'Is TDS Deducted (by Customer)', type: 'bool', default: false, table: false },
      { key: 'tdsRate', label: 'TDS Rate (%) per Invoice', type: 'number', table: false, show: (f) => !!f.isTdsDeducted, required: (f) => !!f.isTdsDeducted },
      { key: 'msmeStatus', label: 'MSME Status', type: 'select', options: MSME_STATUS, table: false },
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

export const SuppliersMaster = ({ branch } = {}) => {
  const scope = partyScope(branchCode(branch));
  return (
  <MasterCrud title="Suppliers" subtitle="Vendors (Sundry Creditors) — live from the backend" resource="suppliers"
    rowFilter={scope.rowFilter}
    fields={[
      { key: 'name', label: 'Name', type: 'text', required: true },
      // Category is the one picklist the backend validates (VALID_CATS) — a dropdown
      // guarantees a valid value. The rest mirror the 12-tab master via core/partyEnums.
      { key: 'category', label: 'Category', type: 'select', options: SUPPLIER_CATS },
      // Branch must be a real code, not free-text/blank (a blank branch = unscoped party).
      { key: 'branch', label: 'Branch', type: 'select', options: scope.branchOptions, default: scope.branchDefault, required: true },
      { key: 'gstin', label: 'GSTIN', type: 'text', table: false },
      // TDS is only actually deducted on some suppliers — flag it explicitly instead of
      // inferring from tdsSection, and only then does PAN become mandatory (needed to
      // deduct at the correct rate instead of the higher no-PAN default).
      { key: 'isTdsDeducted', label: 'Is TDS Deducted', type: 'bool', default: false, table: false },
      { key: 'pan', label: 'PAN', type: 'text', table: false, required: (f) => !!f.isTdsDeducted },
      // Address line sits before Country/State (matches the physical order on the form).
      { key: 'addressLine', label: 'Address Line', type: 'text', required: true, table: false },
      // Country '' (the default) is treated as India downstream but does NOT force a state;
      // picking India explicitly does (it decides CGST/SGST vs IGST) — the backend derives
      // the state code from the chosen state name. Picking any other country auto-selects
      // State = 'Others' (a foreign party has no Indian GST state, but State stays mandatory).
      { key: 'country', label: 'Country', type: 'select', options: COUNTRIES, emptyLabel: 'India (default)', table: false, required: true,
        onSet: (v, next) => { next.state = (v && v !== 'India') ? 'Others' : ''; } },
      { key: 'state', label: 'State (place of supply)', type: 'select', options: STATE_NAMES, table: false, required: true },
      { key: 'gstTreatment', label: 'GST Treatment', type: 'select', options: GST_TREATMENTS, table: false },
      { key: 'tdsSection', label: 'TDS Section', type: 'select', options: TDS_SECTIONS, table: false },
      { key: 'msmeStatus', label: 'MSME Status', type: 'select', options: MSME_STATUS, table: false },
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

/* ── Credit Facilities & Limits (live, backend-connected) ────────────────────
   Supplier / BSP / bank credit lines with a sanctioned limit. `drawdownLedgers`
   is the mapping to a supplier — one facility → many ledgers, so a vendor kept
   under several module-split ledgers rolls up under one limit. "Drawn" is never
   entered here; it's read live from those ledgers by /api/credit-facilities/capacity
   and surfaced on the Capital vs Investment dashboard. */
const FACILITY_TYPES = ['Supplier Trade Credit', 'BSP-BG', 'Bank Card', 'Bank OD'];
export const CreditFacilitiesMaster = ({ branch } = {}) => {
  const scope = partyScope(branchCode(branch));
  // Drawdown Ledgers must pick from REAL Sundry Creditors (supplier) ledgers, not
  // free-typed names — a facility can only ever roll up ledgers that actually exist,
  // so a typo can't silently leave a ledger's drawn balance out of the limit check.
  const ledgersQ = useMasterList('ledgers');
  const supplierLedgerNames = (ledgersQ.data || [])
    .filter((l) => /sundry\s+creditors/i.test(l.group || '') && scope.rowFilter(l))
    .map((l) => l.name)
    .sort((a, b) => a.localeCompare(b, 'en', { sensitivity: 'base' }));
  return (
  <MasterCrud title="Credit Facilities & Limits" subtitle="Supplier / BSP / card credit lines — drawn is read live from the ledgers" resource="credit-facilities"
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
        note="Set Group to the Primary Group / Primary Sub Group (e.g. Sundry Debtors), then pick a Sub-Group to nest this ledger under it on the Balance Sheet. Create sub-groups first in Masters → Sub-Groups. Each branch owns its own copy of the chart — which ledgers are visible in which branch is set on Chart of Accounts (Tree view) ▸ TK Group Central Table (tap a count, then the branch pills). Hidden and deactivated ledgers leave this list and every picker for that branch unless “Show hidden & inactive” is on. Ledgers marked ~* are WIRED to the posting/tax/inter-branch engine — locked (🔒) in every branch: they cannot be created, edited, deleted or deactivated from the app and change only directly in the database."
        fields={[
          // Code is server-allocated (<BRANCH>-MN-NNNN) — read-only, never typed
          // (matches the Chart-of-Accounts ledger editor). Was editable + required,
          // which forced the accountant to invent a code and disagreed with the CoA editor.
          { key: 'code', label: 'Code (auto-generated)', type: 'text', readOnly: true, placeholder: 'Assigned automatically on save' },
          { key: 'name', label: 'Ledger Name', type: 'text', required: true },
          // Changing the Group resets Sub-Group (its old value belongs to a different
          // group and would no longer be valid) — see EditModal's `clears` support.
          { key: 'group', label: 'Group', type: 'select', options: groupOptions.length ? groupOptions : TALLY_GROUP_NAMES, required: true, clears: ['subGroup'] },
          { key: 'subGroup', label: 'Sub-Group', type: 'select', table: false, emptyLabel: '— None —',
            options: (form) => { const subs = subGroupsUnder(form.group); return form.subGroup && !subs.includes(form.subGroup) ? [form.subGroup, ...subs] : subs; } },
          { key: 'branch', label: 'Branch', type: 'select', options: branchOptions, default: shellLocked ? topBarView : 'BOM' },
          // Display-only flag column, shown only when hidden/inactive rows are in the
          // list — Hidden = presence-toggled off for its branch, Inactive = deactivated.
          ...(showHidden ? [{ key: 'visibility', label: 'Visibility', type: 'text', input: false, export: false }] : []),
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
