/* ════════════════════════════════════════════════════════════════════
   masters/shared/masterCrud — generic CRUD component for simple list masters
   ════════════════════════════════════════════════════════════════════
   Moved out of mastersLive.jsx (strangler-fig masters reorg). Renders the
   table + add/edit modal for a master given just a field config — used by
   Voucher Types, Customers, Suppliers, Credit Facilities, Cost Categories,
   Budgets, Scenarios, Groups and Ledgers. Logic unchanged; only the import
   paths moved (one extra `../` — this file now lives in masters/shared/,
   one level under masters/ instead of at its root).
   ──────────────────────────────────────────────────────────────────── */

import React, { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2, Download, Printer, Ban, RotateCcw } from 'lucide-react';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { exportToExcel } from '../../../core/exportExcel';
import { openPrintPreview } from '../../../core/PrintPreview';
import { useFormKeys } from '../../../core/ux/forms';
import { useNavGuard } from '../../../core/ux/navGuard';
import { usePager, Pager } from '../../../core/ux/pager';
import { toast } from '../../../core/ux/toast';
import { confirmDialog } from '../../../core/ux/confirm';
import { Kbd } from '../../../core/ux/widgets.jsx';
import { PageLayout } from '../../../shell/PageLayout';
import { Modal, Button, Select, Input, LoadingState, ErrorState } from '../../../shell/primitives';
import { isViewOnly, VIEW_ONLY_REASON, currentRole } from '../../../core/api';

const DARK = '#1a1c22', BLUE = '#2563eb', DIM = '#5b616e', RED = '#dc2626', GREEN = '#16a34a';

// Roles allowed to mutate the control-plane Tally masters (Voucher Types, Cost
// Categories, Budgets, Scenarios, Credit Facilities). Mirrors the backend
// ADMIN_WRITE_ROLES (crudFactory.js) EXACTLY — same strings the server's requireRole
// checks — so a master that opts in with `writeRoles={ADMIN_WRITE_ROLES}` pre-disables
// its write controls for exactly the roles the server would 403.
export const ADMIN_WRITE_ROLES = ['Super Admin', 'Senior Finance Manager', 'super_admin'];

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
    // Keep the CURRENT value selectable even when it's no longer in the source list —
    // e.g. a party whose customerType/category was later renamed or deactivated in its
    // master. Without this the <select> renders blank (no matching <option>) and a
    // re-save could silently drop the value. Show it flagged so it reads as stale.
    const cur = value == null ? '' : value;
    const hasCur = cur === '' || options.some((o) => String(o) === String(cur));
    return (
      <Select value={cur} onChange={(e) => onChange(e.target.value)}>
        <option value="">{field.emptyLabel || 'Select…'}</option>
        {!hasCur && <option value={cur}>{`${cur} (current)`}</option>}
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
  // Unsaved-changes guard: while this master editor is open with edits, App.jsx's
  // navigate() confirms before leaving (a menu click / drill-out) so a half-typed
  // ledger/party/group isn't silently discarded. `record` is the pristine seed;
  // a serialized snapshot compare covers every master uniformly. Never throws.
  const pristineRef = useRef(JSON.stringify(record));
  const dirty = () => { try { return JSON.stringify(form) !== pristineRef.current; } catch { return false; } };
  useNavGuard(dirty);
  // Accidental dismissals (backdrop click / ✕ / Esc → the Modal's onClose) confirm
  // before discarding unsaved edits; the explicit Cancel button still closes at once
  // (a deliberate discard). `closingRef` dedupes the double-Esc (form key + modal) so
  // only one prompt surfaces.
  const closingRef = useRef(false);
  const requestClose = async () => {
    if (closingRef.current) return;
    if (dirty()) {
      closingRef.current = true;
      const { confirmed } = await confirmDialog({ title: 'Discard changes?', message: 'You have unsaved changes that will be lost.', confirmLabel: 'Discard', cancelLabel: 'Keep editing', danger: true });
      closingRef.current = false;
      if (!confirmed) return;
    }
    onClose();
  };
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
  // Enter advances fields; Enter on the last field (or Ctrl/Cmd+Enter) saves; Esc cancels
  // (guarded — confirms if the form is dirty).
  const formKeys = useFormKeys({ onSubmit: submit, onCancel: requestClose });
  return (
    <Modal
      title={title}
      onClose={requestClose}
      maxWidth={460}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose}>Cancel</Button>
          <Button write variant="primary" size="sm" disabled={saving || missing.length > 0} loading={saving} onClick={submit} title="Save (Ctrl/Cmd+Enter)">
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

export function MasterCrud({ title, subtitle, resource, fields, params, readOnly = false, lockedRow, note, toolbar, rowFilter, mapRow, sortRows, rowStyle, initialEditKey, emptyMessage, writeRoles }) {
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
  const isDerivedRow = (r) => !r.id || String(r.id).startsWith('derived:');
  // View-only accounts see the row write actions (Edit / Deactivate / Delete) DISABLED
  // with a reason instead of live buttons that only 403 on the server.
  const vo = isViewOnly();
  // Opt-in ROLE gate: a master whose backend restricts writes to certain roles
  // (writeRoles) pre-disables its write controls for other roles — a disabled button
  // with a reason, never a live button that only 403s on save. Mirrors the backend
  // requireRole EXACTLY (same role strings). A blank/unknown role (dev / AUTH_OPTIONAL
  // open mode) is NOT blocked, so open mode stays writable; masters that pass no
  // writeRoles are unchanged (any authenticated user may write, matching their backend).
  const role = typeof currentRole === 'function' ? currentRole() : ''; // guard: partial core/api test mocks
  const roleBlocked = Array.isArray(writeRoles) && writeRoles.length > 0 && !!role && !writeRoles.includes(role);
  const roleReason = `Only ${(writeRoles || []).filter((r) => r !== 'super_admin').join(' or ')} can change this master.`;
  const blocked = vo || roleBlocked;
  const blockReason = vo ? VIEW_ONLY_REASON : roleReason;
  // An empty list must say WHY it is empty, not just that it is. "No records yet" is a
  // lie when rowFilter hid every row — the records exist, they're just out of scope
  // (e.g. a per-branch master viewed from a branch that owns none). `emptyMessage` may
  // be a string, or a fn given { total, hidden } so the view can name the real reason.
  const total = (list.data || []).length;
  const emptyText = (typeof emptyMessage === 'function'
    ? emptyMessage({ total, hidden: total - rows.length })
    : emptyMessage) || 'No records yet — click “New” to add one.';

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
    // "derived:" rows are ledgers the backend surfaces here for visibility (a party
    // that only exists because a voucher referenced it) — there is no master
    // document to delete (the backend 404s "Cannot DELETE .../derived:..."), and its
    // real record — the ledger — usually can't be deleted either once it has posted
    // vouchers. Delete is disabled for these in the UI; Deactivate is the real option.
    if (isDerivedRow(r)) return;
    const { confirmed } = await confirmDialog({ title: `Delete "${r.name}"?`, message: 'This cannot be undone.', danger: true, confirmLabel: 'Delete' });
    if (!confirmed) return;
    remove.mutate(r.id, { onSuccess: () => toast(`${r.name || 'Record'} deleted`), onError: (e) => toast(`Could not delete — ${e.message}`, 'error') });
  };

  // Safe alternative to delete, offered on every master that carries an `active`
  // flag: the record keeps its history/postings but is marked Inactive — reversible,
  // so a mistaken Deactivate isn't a dead end (Reactivate flips it back). A derived
  // row has no master document yet, so deactivating it PROMOTES it to a real one
  // (same rule Save uses) rather than PUTting to an id that doesn't exist.
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
    const onSuccess = () => toast(`${r.name || 'Record'} ${makeActive ? 'reactivated' : 'deactivated'}`);
    const onError = (e) => toast(`Could not ${makeActive ? 'reactivate' : 'deactivate'} — ${e.message}`, 'error');
    if (isDerivedRow(r)) {
      const { id, ...body } = { ...blankFromFields(fields), ...r, active: makeActive };
      create.mutate(body, { onSuccess, onError });
    } else {
      const { id, ...body } = { ...r, active: makeActive };
      update.mutate({ id, body }, { onSuccess, onError });
    }
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
    // A derived row has no master document — it's synthesized because past vouchers
    // still reference this name (deleting/never-creating the real record doesn't erase
    // history). Flag it so it doesn't look identical to a live record: without this, a
    // Delete that removes the real master document but leaves this placeholder behind
    // (the name still shows up here) reads as "delete silently failed".
    if (f.key === 'name' && isDerivedRow(r)) return (<>{v || '—'} <span title="No master record — this name only appears because past transactions reference it. Edit to create a real record, or leave as-is." style={{ color: DIM, fontWeight: 700, fontSize: 11 }}>(historic)</span></>);
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
          {!readOnly && <Button write disabled={roleBlocked} title={roleBlocked ? roleReason : undefined} variant="primary" size="sm" icon={Plus} onClick={openNew}>New</Button>}
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
              {rows.length === 0 && <tr><td colSpan={cols.length + 1} style={{ padding: 28, textAlign: 'center', color: DIM }}>{emptyText}</td></tr>}
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
                          <button onClick={() => openEdit(r)} disabled={blocked} title={blocked ? blockReason : 'Edit'} style={{ background: 'none', border: 'none', cursor: blocked ? 'not-allowed' : 'pointer', color: blocked ? '#c2c8d6' : BLUE, padding: 4 }}><Pencil size={14} /></button>
                          {hasActive && (r.active === false
                            ? <button onClick={() => toggleActive(r)} disabled={blocked} title={blocked ? blockReason : 'Reactivate'} style={{ background: 'none', border: 'none', cursor: blocked ? 'not-allowed' : 'pointer', color: blocked ? '#c2c8d6' : GREEN, padding: 4 }}><RotateCcw size={14} /></button>
                            : <button onClick={() => toggleActive(r)} disabled={blocked} title={blocked ? blockReason : 'Deactivate — keeps the record and its history; use instead of Delete'} style={{ background: 'none', border: 'none', cursor: blocked ? 'not-allowed' : 'pointer', color: blocked ? '#c2c8d6' : '#b45309', padding: 4 }}><Ban size={14} /></button>)}
                          <button onClick={() => del(r)} disabled={isDerivedRow(r) || blocked}
                            title={blocked ? blockReason : (isDerivedRow(r) ? "Can't delete — no master record exists yet (past transactions still reference this name). Edit to create one, or Deactivate." : 'Delete')}
                            style={{ background: 'none', border: 'none', padding: 4, cursor: (isDerivedRow(r) || blocked) ? 'not-allowed' : 'pointer', color: (isDerivedRow(r) || blocked) ? '#c2c8d6' : RED }}>
                            <Trash2 size={14} />
                          </button>
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
