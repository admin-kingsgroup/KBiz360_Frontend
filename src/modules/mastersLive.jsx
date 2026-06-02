/* ════════════════════════════════════════════════════════════════════
   MODULES/MASTERS-LIVE.JSX

   Tally accounting masters that were missing from Books, now backed by the ERP
   backend (/api/voucher-types, /api/cost-categories, /api/budgets,
   /api/scenarios). A single generic <MasterCrud> renders the table + add/edit
   modal; each master is just a field config.
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { Plus, Pencil, Trash2, X } from 'lucide-react';
import { card, inp } from '../core/styles';
import { useMasterList, useMasterMutations } from '../core/useMasters';

const DARK = '#0d1326', BLUE = '#0070f2', DIM = '#5a6691', RED = '#A32D2D', GREEN = '#27500A';
const btn = (bg, fg) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: bg, color: fg });

const blankFromFields = (fields) => fields.reduce((o, f) => {
  o[f.key] = f.type === 'bool' ? (f.default ?? false) : f.type === 'tags' ? [] : f.type === 'number' ? (f.default ?? 0) : (f.default ?? '');
  return o;
}, {});

function FieldInput({ field, value, onChange }) {
  if (field.type === 'bool') {
    return (
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: '#334155', cursor: 'pointer' }}>
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
        {field.label}
      </label>
    );
  }
  if (field.type === 'select') {
    return (
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inp, fontSize: 12.5 }}>
        <option value="">Select…</option>
        {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
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
  const missing = fields.filter((f) => f.required && (form[f.key] === '' || form[f.key] == null));
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(13,19,38,0.45)', zIndex: 700, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '7vh' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...card, width: 460, maxWidth: '94vw', maxHeight: '82vh', overflowY: 'auto', padding: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 16px', borderBottom: '1px solid #e5e9f0' }}>
          <h3 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: DARK }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: DIM }}><X size={18} /></button>
        </div>
        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {fields.map((f) => (
            <div key={f.key}>
              {f.type !== 'bool' && <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: DIM, marginBottom: 4 }}>{f.label}{f.required && <span style={{ color: RED }}> *</span>}</label>}
              <FieldInput field={f} value={form[f.key]} onChange={(v) => set(f.key, v)} />
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

export function MasterCrud({ title, subtitle, resource, fields, params }) {
  const list = useMasterList(resource, params);
  const { create, update, remove } = useMasterMutations(resource);
  const [editing, setEditing] = useState(null); // record being edited, or {} for new
  const [err, setErr] = useState('');
  const rows = list.data || [];
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
        <button onClick={openNew} style={btn(BLUE, '#fff')}><Plus size={14} /> New</button>
      </div>

      {list.isLoading && <div style={{ ...card, padding: 28, textAlign: 'center', color: DIM, fontSize: 12 }}>Loading…</div>}
      {list.isError && <div style={{ ...card, padding: 16, color: RED, fontSize: 12, fontWeight: 600 }}>⚠ {list.error?.message || 'Failed to load'} — is the ERP backend running and are you logged in?</div>}

      {!list.isLoading && !list.isError && (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
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
                    <button onClick={() => openEdit(r)} title="Edit" style={{ background: 'none', border: 'none', cursor: 'pointer', color: BLUE, padding: 4 }}><Pencil size={14} /></button>
                    <button onClick={() => del(r)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', color: RED, padding: 4 }}><Trash2 size={14} /></button>
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
