/* ════════════════════════════════════════════════════════════════════
   MODULES/MASTERS-PARTIES.JSX

   LIVE Customer Master & Supplier Master (12-tab layout), fully wired to the
   ERP backend. Every tab now reads and writes real data:

   • Record list ........ GET /api/customers · GET /api/suppliers   (useMasterList)
   • Save edits ......... PUT /api/customers/:id · /api/suppliers/:id (useMasterMutations)
   • Linked Vouchers .... GET /api/vouchers?party=NAME
   • Outstanding ........ GET /api/vouchers/open-bills?party=NAME&side=customer|supplier
   • History KPIs/chart . derived from the party's vouchers

   Basic / Address / Contact Persons / Bank Details / Tax / Credit / Documents /
   Notes / Custom Fields are all editable and persisted (the backend models carry
   nested addresses[], contacts[], banks[], documents[], notes[], customFields[]).
   ════════════════════════════════════════════════════════════════════ */

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMasterList, useMasterMutations } from '../core/useMasters';
import { apiGet, getAuthToken } from '../core/api';
import { BRANCH_CODES } from '../core/data';
import { openLedgerModal } from '../core/LedgerModalHost';
import { useHotkey } from '../core/ux/hotkeys';
import { toast } from '../core/ux/toast';
import { Kbd } from '../core/ux/widgets.jsx';
import { PageLayout } from '../shell/PageLayout';
import { Button, IconButton, Input, Select, Textarea, FormField, LoadingState, ErrorState, EmptyState } from '../shell/primitives';

const GOLD = '#c2a04a', DARK = '#1a1c22', DIM = '#5b616e', RED = '#dc2626', GREEN = '#16a34a';

// Local panel wrapper (replaces helpers.tabPanel) — design-system spacing.
const tabPanel = (children) => <div className="min-h-[360px] p-4 tablet:p-5">{children}</div>;
const SUPPLIER_CATS = ['Airline', 'DMC', 'Hotel', 'Visa', 'Insurance', 'Car', 'Misc'];
const GST_TREATMENTS = ['', 'Registered — Regular', 'Registered — Composition', 'Unregistered', 'SEZ', 'Overseas'];
const MSME_STATUS = ['', 'Not Registered', 'Micro', 'Small', 'Medium'];
const TDS_SECTIONS = ['', '194C @ 2%', '194J @ 10%', '194I @ 10%', '194H @ 5%', '194O @ 0.1%', 'None'];
const PAY_TERMS = ['', 'Advance', 'Net 15', 'Net 30', 'Net 45', 'Net 60', 'Net 90'];
const SETTLE_CYCLES = ['', 'Weekly', 'Bi-Monthly (BSP)', 'Monthly', 'On Invoice'];
const PAY_METHODS = ['', 'Bank Transfer', 'BSP NEFT', 'NEFT/RTGS', 'Cheque', 'UPI', 'Cash'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];
const ADDR_TYPES = ['Billing', 'Shipping', 'Registered Office', 'Head Office', 'Branch', 'Other'];

const rupee = (n) => '₹' + (Number(n) || 0).toLocaleString('en-IN');
const numOf = (s) => Number(String(s == null ? '' : s).replace(/[^0-9.-]/g, '')) || 0;

/* ── Live data hooks (party-scoped, only fire once a record is chosen) ─────── */
function usePartyVouchers(party) {
  return useQuery({
    queryKey: ['party-vouchers', party],
    queryFn: () => apiGet('/api/vouchers', { party }),
    enabled: !!getAuthToken() && !!party,
    staleTime: 30_000,
  });
}
function useOpenBills(party, side) {
  return useQuery({
    queryKey: ['party-openbills', party, side],
    queryFn: () => apiGet('/api/vouchers/open-bills', { party, side }),
    enabled: !!getAuthToken() && !!party,
    staleTime: 30_000,
  });
}

// One hook drives both masters: list + selection + editable form + save.
function usePartyMaster(resource, side) {
  const list = useMasterList(resource);
  const { update } = useMasterMutations(resource);
  const rows = list.data || [];

  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(null);
  const [baseline, setBaseline] = useState('');
  const [err, setErr] = useState('');
  const [savedAt, setSavedAt] = useState(0);

  // current record = explicit pick, else the first record in the list
  const current = rows.find((r) => r.id === selectedId) || rows[0] || null;

  // load the selected record into the editable form whenever the selection changes
  useEffect(() => {
    setForm(current ? { ...current } : null);
    setBaseline(current ? JSON.stringify(current) : '');
    setErr('');
  }, [current && current.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const party = (current && current.name) || '';
  const vouchersQ = usePartyVouchers(party);
  const openBillsQ = useOpenBills(party, side);

  const dirty = !!form && JSON.stringify(form) !== baseline;

  const save = () => {
    if (!form) return;
    setErr('');
    const { id, ...body } = form;
    update.mutate({ id, body }, {
      onSuccess: (data) => {
        const rec = data || form;
        setForm({ ...rec });
        setBaseline(JSON.stringify(rec));
        setSavedAt(Date.now());
        list.refetch();
        toast(`${rec.name || 'Record'} saved`);
      },
      onError: (e) => { setErr(e.message || 'Save failed'); toast(`Could not save — ${e.message || 'failed'}`, 'error'); },
    });
  };

  // Ctrl/Cmd+Enter saves from anywhere on the (multi-tab) party form, when dirty.
  const liveRef = useRef(null);
  liveRef.current = { save, dirty, saving: update.isPending };
  useHotkey('mod+enter', () => { const s = liveRef.current; if (s && s.dirty && !s.saving) s.save(); }, []);

  return {
    list, rows, current, form, setField, setSelectedId, save,
    saving: update.isPending, err, savedAt, dirty, vouchersQ, openBillsQ,
  };
}

/* ── Generic editable repeatable section (contacts, banks, addresses, …) ───── */
function ArrayEditor({ rows, cols, onChange, addLabel }) {
  const list = Array.isArray(rows) ? rows : [];
  const blank = cols.reduce((o, c) => { o[c.key] = (c.type === 'bool' || c.type === 'primary') ? false : ''; return o; }, {});
  const setCell = (i, k, v) => onChange(list.map((r, idx) => (idx === i ? { ...r, [k]: v } : r)));
  const setPrimary = (i, k) => onChange(list.map((r, idx) => ({ ...r, [k]: idx === i })));
  const add = () => onChange([...list, { ...blank }]);
  const del = (i) => onChange(list.filter((_, idx) => idx !== i));

  const renderCell = (c, r, i) => {
    const v = r[c.key];
    if (c.type === 'bool') return <input type="checkbox" checked={!!v} onChange={(e) => setCell(i, c.key, e.target.checked)} />;
    if (c.type === 'primary') return <input type="radio" checked={!!v} onChange={() => setPrimary(i, c.key)} title="Set primary" />;
    if (c.type === 'select') return (
      <Select value={v == null ? '' : v} onChange={(e) => setCell(i, c.key, e.target.value)}>
        {(c.options || []).map((o) => <option key={o} value={o}>{o || '—'}</option>)}
      </Select>
    );
    if (c.type === 'textarea') return <Textarea value={v || ''} rows={2} onChange={(e) => setCell(i, c.key, e.target.value)} />;
    return <Input type={c.type === 'number' ? 'number' : c.type === 'date' ? 'date' : c.type === 'email' ? 'email' : 'text'} value={v == null ? '' : v} onChange={(e) => setCell(i, c.key, e.target.value)} className={c.mono ? 'font-mono' : ''} />;
  };

  return (
    <div>
      <table className="w-full border-collapse text-[11.5px]">
        <thead className="bg-surface-alt"><tr>
          {cols.map((c) => <th key={c.key} className={`px-2.5 py-2 text-[10px] font-bold uppercase text-ink-muted ${c.type === 'primary' || c.type === 'bool' ? 'text-center' : 'text-left'}`}>{c.label}</th>)}
          <th className="w-10" />
        </tr></thead>
        <tbody>
          {list.length === 0 && <tr><td colSpan={cols.length + 1} className="p-4 text-center text-ink-muted">None yet — click “{addLabel}” below.</td></tr>}
          {list.map((r, i) => (
            <tr key={i} className="border-b border-surface-border align-top">
              {cols.map((c) => <td key={c.key} className={`px-2 py-1.5 ${c.type === 'primary' || c.type === 'bool' ? 'text-center' : 'text-left'}`} style={{ width: c.w }}>{renderCell(c, r, i)}</td>)}
              <td className="text-center"><IconButton icon={X} label="Remove" size="sm" onClick={() => del(i)} className="text-danger hover:bg-danger-soft hover:text-danger" /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button variant="secondary" size="sm" icon={Plus} onClick={add} className="mt-2 border-dashed border-gold text-gold-dark hover:bg-gold-light/30">{addLabel}</Button>
    </div>
  );
}

/* ── Small shared presentational pieces ───────────────────────────────────── */
function Field({ label, value, onChange, readOnly, mono, type = 'text', placeholder }) {
  return (
    <FormField label={label}>
      <Input
        type={type} value={value == null ? '' : value} readOnly={readOnly} placeholder={placeholder || ''}
        className={`${mono ? 'font-mono ' : ''}${readOnly ? 'bg-surface-alt text-ink-muted' : ''}`}
        onChange={onChange ? (e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value) : undefined}
      />
    </FormField>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <FormField label={label}>
      <Select value={value == null ? '' : value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o === '' ? '— Select —' : o}</option>)}
      </Select>
    </FormField>
  );
}

function CheckField({ label, checked, onChange, onText, offText, danger }) {
  return (
    <FormField label={label}>
      <label className="flex cursor-pointer items-center gap-1.5 pt-1.5">
        <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="text-xs font-semibold" style={{ color: checked ? (danger ? RED : GREEN) : DIM }}>{checked ? onText : offText}</span>
      </label>
    </FormField>
  );
}

function EmptyHint({ children }) {
  return <p className="mb-3 text-[11.5px] text-ink-muted">{children}</p>;
}

// Linked Vouchers — live table of every voucher whose party = this record.
function LinkedVouchersTab({ q }) {
  if (q.isLoading) return tabPanel(<p style={{ color: DIM, fontSize: 12 }}>Loading vouchers…</p>);
  if (q.isError) return tabPanel(<p style={{ color: RED, fontSize: 12 }}>⚠ {q.error?.message || 'Failed to load vouchers'}</p>);
  const rows = (q.data || []).slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (!rows.length) return tabPanel(<p style={{ color: DIM, fontSize: 12 }}>No posted or pending vouchers reference this party yet.</p>);
  return tabPanel(
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
      <thead style={{ background: '#f7f8fb' }}><tr>{['Voucher', 'Date', 'Type', 'Branch', 'Amount', 'Status'].map((h, i) => (
        <th key={h} style={{ padding: '9px 12px', textAlign: i === 4 ? 'right' : i === 5 ? 'center' : 'left', fontSize: 10.5, color: DIM, fontWeight: 700, textTransform: 'uppercase' }}>{h}</th>
      ))}</tr></thead>
      <tbody>{rows.map((r) => {
        const paid = /clear|paid|approv|post/i.test(r.status || '');
        return (
          <tr key={r.id} style={{ borderBottom: '1px solid #f0f2f7' }}>
            <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{r.vno || '—'}</td>
            <td style={{ padding: '9px 12px', color: DIM }}>{r.date || '—'}</td>
            <td style={{ padding: '9px 12px' }}>{r.type || r.category || '—'}</td>
            <td style={{ padding: '9px 12px' }}><span style={{ padding: '2px 6px', background: '#e6e8f1', borderRadius: 3, fontSize: 10, fontWeight: 700 }}>{r.branch || '—'}</span></td>
            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>{rupee(r.total)}</td>
            <td style={{ padding: '9px 12px', textAlign: 'center' }}><span style={{ padding: '2px 8px', background: paid ? '#e8f6ed' : '#fbeedb', color: paid ? '#16a34a' : '#d97706', borderRadius: 3, fontSize: 10, fontWeight: 700 }}>{r.status || '—'}</span></td>
          </tr>
        );
      })}</tbody>
    </table>
  );
}

// Outstanding — live open bills (unsettled) for the party.
function OutstandingTab({ q, side }) {
  if (q.isLoading) return tabPanel(<p style={{ color: DIM, fontSize: 12 }}>Loading open bills…</p>);
  if (q.isError) return tabPanel(<p style={{ color: RED, fontSize: 12 }}>⚠ {q.error?.message || 'Failed to load open bills'}</p>);
  const data = q.data || { bills: [], advances: 0 };
  const bills = data.bills || [];
  const total = bills.reduce((s, b) => s + (Number(b.outstanding) || 0), 0);
  if (!bills.length && !data.advances) return tabPanel(<p style={{ color: DIM, fontSize: 12 }}>{side === 'supplier' ? 'No unpaid bills to this supplier.' : 'No unpaid invoices from this customer.'}</p>);
  return tabPanel(
    <div className="kbiz-card">
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 10 }}>{side === 'supplier' ? 'Open bills (we owe)' : 'Open invoices (owed to us)'}</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
        <thead style={{ background: '#f7f8fb' }}><tr>{['Bill', 'Date', 'Bill Amt', 'Outstanding', 'Age', 'Status'].map((h, i) => (
          <th key={h} style={{ padding: '8px 12px', textAlign: i === 2 || i === 3 ? 'right' : i >= 4 ? 'center' : 'left', fontSize: 10, color: DIM, fontWeight: 700 }}>{h}</th>
        ))}</tr></thead>
        <tbody>{bills.map((b) => {
          const overdue = b.creditDays != null && b.ageDays > b.creditDays;
          return (
            <tr key={b.billId} style={{ borderBottom: '1px solid #f0f2f7' }}>
              <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{b.billVno}</td>
              <td style={{ padding: '8px 12px', color: DIM }}>{b.date}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{rupee(b.total)}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700 }}>{rupee(b.outstanding)}</td>
              <td style={{ padding: '8px 12px', textAlign: 'center', color: overdue ? RED : GREEN, fontWeight: 700 }}>{b.ageDays}d</td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}><span style={{ padding: '2px 8px', background: b.status === 'partial' ? '#fbeedb' : '#e6e8f1', borderRadius: 3, fontSize: 10, fontWeight: 700 }}>{b.status}</span></td>
            </tr>
          );
        })}</tbody>
      </table>
      {data.advances > 0 && <p style={{ margin: '10px 0 0', fontSize: 11.5, color: DIM }}>On-account / advances: <b style={{ color: DARK }}>{rupee(data.advances)}</b></p>}
      <div style={{ marginTop: 12, padding: 10, background: DARK, borderRadius: 5, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: GOLD, fontSize: 11.5, fontWeight: 700 }}>{side === 'supplier' ? 'TOTAL PAYABLE' : 'TOTAL RECEIVABLE'}</span>
        <span style={{ color: '#fff', fontSize: 14, fontWeight: 700, fontFamily: 'monospace' }}>{rupee(total)}</span>
      </div>
    </div>
  );
}

// History — KPIs + monthly bar chart derived from the party's vouchers.
function HistoryTab({ q }) {
  if (q.isLoading) return tabPanel(<p style={{ color: DIM, fontSize: 12 }}>Loading history…</p>);
  const rows = q.data || [];
  if (!rows.length) return tabPanel(<p style={{ color: DIM, fontSize: 12 }}>Once vouchers are posted for this party, monthly totals appear here.</p>);
  const total = rows.reduce((s, v) => s + (Number(v.total) || 0), 0);
  const byMonth = {};
  rows.forEach((v) => { const m = String(v.date || '').slice(0, 7); if (m) byMonth[m] = (byMonth[m] || 0) + (Number(v.total) || 0); });
  const chart = Object.keys(byMonth).sort().slice(-12).map((m) => ({ m, r: Math.round(byMonth[m]) }));
  const kpis = [
    { l: 'Vouchers', v: rows.length, c: DARK },
    { l: 'Total Value', v: rupee(total), c: RED },
    { l: 'Avg / Voucher', v: rupee(total / rows.length), c: GOLD },
    { l: 'Active Months', v: Object.keys(byMonth).length, c: GREEN },
  ];
  return tabPanel(
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,150px),1fr))', gap: 10, marginBottom: 14 }}>
        {kpis.map((k) => (
          <div key={k.l} style={{ padding: 12, background: '#fafbfd', borderRadius: 6, border: '1px solid #e6e8ec', borderTop: '3px solid ' + k.c }}>
            <p style={{ margin: 0, fontSize: 10, color: DIM, fontWeight: 700, textTransform: 'uppercase' }}>{k.l}</p>
            <p style={{ margin: '3px 0 0', fontSize: 20, fontWeight: 700, color: DARK }}>{k.v}</p>
          </div>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chart}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f2f7" />
          <XAxis dataKey="m" tick={{ fontSize: 10, fill: DIM }} />
          <YAxis tick={{ fontSize: 10, fill: DIM }} tickFormatter={(v) => (v >= 100000 ? (v / 100000).toFixed(0) + 'L' : v)} />
          <Tooltip formatter={(v) => rupee(v)} />
          <Bar dataKey="r" fill={GOLD} />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

// Shared header: record selector + save controls + load/empty states.
function PartyShell({ title, subtitle, m, tabs, tab, setTab, children }) {
  const { list, rows, current, save, saving, err, savedAt, dirty } = m;

  const selector = (
    <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
      <label className="text-[11px] font-bold text-ink-muted">Record</label>
      <div className="min-w-[280px]">
        <Select value={(current && current.id) || ''} onChange={(e) => m.setSelectedId(e.target.value)} className="font-semibold">
          {rows.length === 0 && <option value="">— no records —</option>}
          {rows.map((r) => <option key={r.id} value={r.id}>{r.name}{r.branch ? ` · ${r.branch}` : ''}</option>)}
        </Select>
      </div>
      <span className="text-[11px] text-ink-muted">{rows.length} record{rows.length === 1 ? '' : 's'}</span>
      {current && current.name && (
        <Button variant="secondary" size="sm" onClick={() => openLedgerModal(current.name)} title="Open this party's ledger account (current branch)">Open Ledger</Button>
      )}
      <div className="flex-1" />
      {err && <span className="text-[11.5px] font-semibold text-danger">⚠ {err}</span>}
      {!err && savedAt > 0 && !dirty && <span className="text-[11.5px] font-semibold text-success">✓ Saved</span>}
      <Button variant="accent" onClick={save} disabled={!current || saving || !dirty} loading={saving} title="Save (Ctrl/Cmd+Enter)">
        {saving ? 'Saving…' : <>Save changes <Kbd>⌃↵</Kbd></>}
      </Button>
    </div>
  );

  let body;
  if (list.isLoading) body = <LoadingState label="Loading records…" />;
  else if (list.isError) body = <ErrorState message={`${list.error?.message || 'Failed to load'} — is the ERP backend running and are you logged in?`} onRetry={list.refetch} />;
  else if (!current) body = <EmptyState title="No records yet" hint={`Add one from the ${title.replace(' Master', '')}s list master.`} />;
  else body = (
    <div className="overflow-hidden rounded-brand border border-surface-border bg-surface">
      <div className="flex overflow-x-auto border-b border-surface-border bg-surface-alt [scrollbar-width:thin]">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`whitespace-nowrap border-b-2 px-4 py-2.5 text-[12.5px] transition ${tab === t.id ? 'border-gold font-bold text-ink' : 'border-transparent font-medium text-ink-muted hover:text-ink'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {children}
    </div>
  );

  return (
    <PageLayout maxWidth="max-w-[1400px] mx-auto" title={title} subtitle={`${subtitle}${current ? ` · ${current.name}` : ''}`}>
      {selector}
      {body}
    </PageLayout>
  );
}

/* Shared column configs for the repeatable sections. */
const ADDR_COLS = [
  { key: 'type', label: 'Type', type: 'select', options: ADDR_TYPES, w: 150 },
  { key: 'line', label: 'Address', type: 'textarea' },
  { key: 'primary', label: 'Primary', type: 'primary', w: 60 },
];
const CONTACT_COLS = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'role', label: 'Role', type: 'text' },
  { key: 'email', label: 'Email', type: 'email', mono: true },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'primary', label: 'Primary', type: 'primary', w: 60 },
];
const BANK_COLS = [
  { key: 'bank', label: 'Bank', type: 'text' },
  { key: 'account', label: 'Account', type: 'text', mono: true },
  { key: 'ifsc', label: 'IFSC / SWIFT', type: 'text', mono: true },
  { key: 'currency', label: 'Currency', type: 'select', options: CURRENCIES, w: 90 },
  { key: 'beneficiary', label: 'Beneficiary', type: 'text' },
  { key: 'primary', label: 'Primary', type: 'primary', w: 60 },
];
const DOC_COLS = [
  { key: 'name', label: 'Document', type: 'text' },
  { key: 'url', label: 'Link / Reference', type: 'text', mono: true },
  { key: 'uploadedAt', label: 'Date', type: 'date', w: 150 },
];
const NOTE_COLS = [
  { key: 'text', label: 'Note', type: 'textarea' },
  { key: 'user', label: 'By', type: 'text', w: 130 },
  { key: 'ts', label: 'Date', type: 'date', w: 150 },
  { key: 'pinned', label: 'Pin', type: 'bool', w: 50 },
];
const CUSTOM_COLS = [
  { key: 'label', label: 'Field', type: 'text' },
  { key: 'value', label: 'Value', type: 'text' },
];

/* ════════════════════════════════════════════════════════════════════
   1. CUSTOMER MASTER (live)
   ════════════════════════════════════════════════════════════════════ */
const CUST_TABS = [
  { id: 'basic', label: '1. Basic Info' }, { id: 'address', label: '2. Address' },
  { id: 'contact', label: '3. Contact Persons' }, { id: 'bank', label: '4. Bank Details' },
  { id: 'tax', label: '5. Tax Info' }, { id: 'credit', label: '6. Credit Terms' },
  { id: 'docs', label: '7. Documents' }, { id: 'notes', label: '8. Notes' },
  { id: 'history', label: '9. History' }, { id: 'linked', label: '10. Linked Vouchers' },
  { id: 'outstanding', label: '11. Outstanding' }, { id: 'custom', label: '12. Custom Fields' },
];
const CUST_TYPES = ['', 'Corporate · Premium', 'Corporate · Standard', 'Individual', 'Travel Agent', 'Government'];
const CUST_SOURCES = ['', 'Direct Referral', 'Cold Outreach', 'Digital Marketing', 'Walk-in', 'Existing Client'];

export function CustomerMasterTabbed() {
  const m = usePartyMaster('customers', 'customer');
  const [tab, setTab] = useState('basic');
  const f = m.form || {};
  const set = m.setField;
  const branchOpts = ['', ...BRANCH_CODES];
  const available = Math.max(0, (Number(f.creditLimit) || 0) - numOf(f.out));

  return (
    <PartyShell title="Customer Master" subtitle="Clients (Sundry Debtors) — live" m={m} tabs={CUST_TABS} tab={tab} setTab={setTab}>
      {tab === 'basic' && tabPanel(
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,160px),1fr))', gap: 14 }}>
          <Field label="Legal Name" value={f.name} onChange={(v) => set('name', v)} />
          <Field label="Customer Code" value={f.id} readOnly mono />
          <SelectField label="Customer Type" value={f.customerType} onChange={(v) => set('customerType', v)} options={CUST_TYPES} />
          <SelectField label="Branch" value={f.branch} onChange={(v) => set('branch', v)} options={branchOpts} />
          <Field label="Industry" value={f.industry} onChange={(v) => set('industry', v)} />
          <SelectField label="Source" value={f.source} onChange={(v) => set('source', v)} options={CUST_SOURCES} />
          <Field label="Account Manager" value={f.accountManager} onChange={(v) => set('accountManager', v)} />
          <Field label="Phone" value={f.phone} onChange={(v) => set('phone', v)} />
          <Field label="Email" value={f.email} onChange={(v) => set('email', v)} />
          <Field label="Revenue (YTD)" value={f.rev} readOnly />
          <Field label="Outstanding" value={f.out} readOnly />
          <CheckField label="Overdue Flag" checked={!!f.ov} onChange={(v) => set('ov', v)} onText="Marked overdue" offText="In good standing" danger />
        </div>
      )}
      {tab === 'address' && tabPanel(
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,200px),1fr))', gap: 14, marginBottom: 18 }}>
            <FormField label="Primary Billing Address (used on invoices)">
              <Textarea value={f.address || ''} onChange={(e) => set('address', e.target.value)} rows={3} />
            </FormField>
            <Field label="City" value={f.city} onChange={(v) => set('city', v)} />
          </div>
          <EmptyHint>Additional addresses (shipping, registered office, …)</EmptyHint>
          <ArrayEditor rows={f.addresses} cols={ADDR_COLS} onChange={(v) => set('addresses', v)} addLabel="Add address" />
        </>
      )}
      {tab === 'contact' && tabPanel(
        <ArrayEditor rows={f.contacts} cols={CONTACT_COLS} onChange={(v) => set('contacts', v)} addLabel="Add Contact Person" />
      )}
      {tab === 'bank' && tabPanel(
        <ArrayEditor rows={f.banks} cols={BANK_COLS} onChange={(v) => set('banks', v)} addLabel="Add Bank Account" />
      )}
      {tab === 'tax' && tabPanel(
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 14 }}>
          <Field label="GSTIN" value={f.gstin} onChange={(v) => set('gstin', v)} mono />
          <Field label="PAN" value={f.pan} onChange={(v) => set('pan', v)} mono />
          <Field label="TAN" value={f.tan} onChange={(v) => set('tan', v)} mono />
          <Field label="TIN (state)" value={f.tin} onChange={(v) => set('tin', v)} mono />
          <Field label="State Code" value={f.stateCode} onChange={(v) => set('stateCode', v)} />
          <SelectField label="GST Treatment" value={f.gstTreatment} onChange={(v) => set('gstTreatment', v)} options={GST_TREATMENTS} />
          <SelectField label="TDS Section" value={f.tdsSection} onChange={(v) => set('tdsSection', v)} options={TDS_SECTIONS} />
          <SelectField label="MSME Status" value={f.msmeStatus} onChange={(v) => set('msmeStatus', v)} options={MSME_STATUS} />
        </div>
      )}
      {tab === 'credit' && tabPanel(
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 14 }}>
          <div style={{ padding: 14, background: '#fafbfd', borderRadius: 6, border: '1px solid #e6e8ec' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: GOLD, textTransform: 'uppercase' }}>Credit Configuration</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 10, marginTop: 10 }}>
              <Field label="Credit Limit (₹)" type="number" value={f.creditLimit} onChange={(v) => set('creditLimit', v)} />
              <Field label="Credit Days" type="number" value={f.creditDays} onChange={(v) => set('creditDays', v)} />
              <SelectField label="Payment Terms" value={f.paymentTerms} onChange={(v) => set('paymentTerms', v)} options={PAY_TERMS} />
              <Field label="Late Payment Interest" value={f.interestRate} onChange={(v) => set('interestRate', v)} placeholder="e.g. 18% pa" />
            </div>
          </div>
          <div style={{ padding: 14, background: '#fafbfd', borderRadius: 6, border: '1px solid #e6e8ec' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: GOLD, textTransform: 'uppercase' }}>Current Exposure</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 10, marginTop: 10 }}>
              <div><p style={{ margin: 0, fontSize: 10.5, color: DIM, fontWeight: 700, textTransform: 'uppercase' }}>Outstanding</p><p style={{ margin: '3px 0 0', fontSize: 18, fontWeight: 700, color: DARK }}>{f.out || rupee(0)}</p></div>
              <div><p style={{ margin: 0, fontSize: 10.5, color: DIM, fontWeight: 700, textTransform: 'uppercase' }}>Available</p><p style={{ margin: '3px 0 0', fontSize: 18, fontWeight: 700, color: GREEN }}>{rupee(available)}</p></div>
            </div>
            {(Number(f.creditLimit) || 0) > 0 && (
              <div style={{ marginTop: 12, height: 6, background: '#f0f2f7', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: Math.min(100, (numOf(f.out) / (Number(f.creditLimit) || 1)) * 100) + '%', background: GOLD }} />
              </div>
            )}
          </div>
        </div>
      )}
      {tab === 'docs' && tabPanel(
        <><EmptyHint>Reference uploaded documents (GST certificate, PAN, agreements, …).</EmptyHint><ArrayEditor rows={f.documents} cols={DOC_COLS} onChange={(v) => set('documents', v)} addLabel="Add Document" /></>
      )}
      {tab === 'notes' && tabPanel(
        <ArrayEditor rows={f.notes} cols={NOTE_COLS} onChange={(v) => set('notes', v)} addLabel="Add Note" />
      )}
      {tab === 'custom' && tabPanel(
        <><EmptyHint>Custom key/value fields for this customer.</EmptyHint><ArrayEditor rows={f.customFields} cols={CUSTOM_COLS} onChange={(v) => set('customFields', v)} addLabel="Add Field" /></>
      )}
      {tab === 'history' && <HistoryTab q={m.vouchersQ} />}
      {tab === 'linked' && <LinkedVouchersTab q={m.vouchersQ} />}
      {tab === 'outstanding' && <OutstandingTab q={m.openBillsQ} side="customer" />}
    </PartyShell>
  );
}

/* ════════════════════════════════════════════════════════════════════
   2. SUPPLIER MASTER (live)
   ════════════════════════════════════════════════════════════════════ */
const SUPP_TABS = [
  { id: 'basic', label: '1. Basic Info' }, { id: 'address', label: '2. Address' },
  { id: 'contact', label: '3. Contact Persons' }, { id: 'bank', label: '4. Bank Details' },
  { id: 'tax', label: '5. Tax Info' }, { id: 'credit', label: '6. Payment Terms' },
  { id: 'docs', label: '7. Documents' }, { id: 'notes', label: '8. Notes' },
  { id: 'history', label: '9. History' }, { id: 'linked', label: '10. Linked Vouchers' },
  { id: 'outstanding', label: '11. Outstanding' }, { id: 'custom', label: '12. Custom Fields' },
];

export function SupplierMasterTabbed() {
  const m = usePartyMaster('suppliers', 'supplier');
  const [tab, setTab] = useState('basic');
  const f = m.form || {};
  const set = m.setField;
  const branchOpts = ['ALL', ...BRANCH_CODES];

  return (
    <PartyShell title="Supplier Master" subtitle="Vendors (Sundry Creditors) — live" m={m} tabs={SUPP_TABS} tab={tab} setTab={setTab}>
      {tab === 'basic' && tabPanel(
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,160px),1fr))', gap: 14 }}>
          <Field label="Legal Name" value={f.name} onChange={(v) => set('name', v)} />
          <Field label="Supplier Code" value={f.id} readOnly mono />
          <SelectField label="Category" value={f.category} onChange={(v) => set('category', v)} options={SUPPLIER_CATS} />
          <Field label="Type" value={f.type} onChange={(v) => set('type', v)} />
          <SelectField label="Branch" value={f.branch} onChange={(v) => set('branch', v)} options={branchOpts} />
          <Field label="Country" value={f.country} onChange={(v) => set('country', v)} />
          <Field label="Vendor Manager" value={f.vendorManager} onChange={(v) => set('vendorManager', v)} />
          <Field label="Phone" value={f.phone} onChange={(v) => set('phone', v)} />
          <Field label="Email" value={f.email} onChange={(v) => set('email', v)} />
          <CheckField label="Status" checked={f.active !== false} onChange={(v) => set('active', v)} onText="Active" offText="Inactive" />
          <CheckField label="Preferred" checked={!!f.preferred} onChange={(v) => set('preferred', v)} onText="Tier-A Vendor" offText="Standard" />
        </div>
      )}
      {tab === 'address' && tabPanel(
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 14, marginBottom: 18 }}>
            <Field label="City" value={f.city} onChange={(v) => set('city', v)} />
            <Field label="Country" value={f.country} onChange={(v) => set('country', v)} />
          </div>
          <EmptyHint>Office / branch addresses</EmptyHint>
          <ArrayEditor rows={f.addresses} cols={ADDR_COLS} onChange={(v) => set('addresses', v)} addLabel="Add address" />
        </>
      )}
      {tab === 'contact' && tabPanel(
        <ArrayEditor rows={f.contacts} cols={CONTACT_COLS} onChange={(v) => set('contacts', v)} addLabel="Add Contact Person" />
      )}
      {tab === 'bank' && tabPanel(
        <ArrayEditor rows={f.banks} cols={BANK_COLS} onChange={(v) => set('banks', v)} addLabel="Add Bank Account" />
      )}
      {tab === 'tax' && tabPanel(
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 14 }}>
          <Field label="GSTIN" value={f.gstin} onChange={(v) => set('gstin', v)} mono />
          <Field label="PAN" value={f.pan} onChange={(v) => set('pan', v)} mono />
          <Field label="TAN" value={f.tan} onChange={(v) => set('tan', v)} mono />
          <Field label="IATA Code" value={f.iataCode} onChange={(v) => set('iataCode', v)} mono />
          <Field label="BSP Code" value={f.bspCode} onChange={(v) => set('bspCode', v)} mono />
          <SelectField label="GST Treatment" value={f.gstTreatment} onChange={(v) => set('gstTreatment', v)} options={GST_TREATMENTS} />
          <SelectField label="TDS Section" value={f.tdsSection} onChange={(v) => set('tdsSection', v)} options={TDS_SECTIONS} />
          <SelectField label="MSME Status" value={f.msmeStatus} onChange={(v) => set('msmeStatus', v)} options={MSME_STATUS} />
        </div>
      )}
      {tab === 'credit' && tabPanel(
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 14 }}>
          <div style={{ padding: 14, background: '#fafbfd', borderRadius: 6, border: '1px solid #e6e8ec' }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: GOLD, textTransform: 'uppercase' }}>Payment Configuration</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 10, marginTop: 10 }}>
              <SelectField label="Settlement Cycle" value={f.settlementCycle} onChange={(v) => set('settlementCycle', v)} options={SETTLE_CYCLES} />
              <Field label="Credit Days" type="number" value={f.creditDays} onChange={(v) => set('creditDays', v)} />
              <SelectField label="Payment Method" value={f.paymentMethod} onChange={(v) => set('paymentMethod', v)} options={PAY_METHODS} />
              <Field label="Credit Limit (₹)" type="number" value={f.creditLimit} onChange={(v) => set('creditLimit', v)} />
            </div>
          </div>
        </div>
      )}
      {tab === 'docs' && tabPanel(
        <><EmptyHint>Reference uploaded documents (GSA agreement, BSP mandate, GST, …).</EmptyHint><ArrayEditor rows={f.documents} cols={DOC_COLS} onChange={(v) => set('documents', v)} addLabel="Add Document" /></>
      )}
      {tab === 'notes' && tabPanel(
        <ArrayEditor rows={f.notes} cols={NOTE_COLS} onChange={(v) => set('notes', v)} addLabel="Add Note" />
      )}
      {tab === 'custom' && tabPanel(
        <><EmptyHint>Custom key/value fields for this supplier.</EmptyHint><ArrayEditor rows={f.customFields} cols={CUSTOM_COLS} onChange={(v) => set('customFields', v)} addLabel="Add Field" /></>
      )}
      {tab === 'history' && <HistoryTab q={m.vouchersQ} />}
      {tab === 'linked' && <LinkedVouchersTab q={m.vouchersQ} />}
      {tab === 'outstanding' && <OutstandingTab q={m.openBillsQ} side="supplier" />}
    </PartyShell>
  );
}
