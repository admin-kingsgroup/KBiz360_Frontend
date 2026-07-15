/* ════════════════════════════════════════════════════════════════════
   masters/shared/partyMaster — shared engine behind the 12-tab Customer &
   Supplier Master screens.
   ════════════════════════════════════════════════════════════════════
   Moved out of mastersParties.jsx (strangler-fig masters reorg): the
   CustomerMasterTabbed / SupplierMasterTabbed screens now live in
   client-master/customerTabbed.jsx and supplier-master/supplierTabbed.jsx
   respectively, but both are built on this one shared party-record engine
   (list + selection + editable form + save), the repeatable-section editor,
   and the tab bodies (Linked Vouchers / Outstanding / History / Custom
   Fields). Logic unchanged; only the import paths moved (one extra `../` —
   this file now lives in masters/shared/, one level under masters/ instead
   of at its root).

   • Record list ........ GET /api/customers · GET /api/suppliers   (useMasterList)
   • Save edits ......... PUT /api/customers/:id · /api/suppliers/:id (useMasterMutations)
   • Linked Vouchers .... GET /api/vouchers?party=NAME
   • Outstanding ........ GET /api/vouchers/open-bills?party=NAME&side=customer|supplier
   • History KPIs/chart . derived from the party's vouchers
   ──────────────────────────────────────────────────────────────────── */

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, X } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useMasterList, useMasterMutations } from '../../../core/useMasters';
import { apiGet, getAuthToken } from '../../../core/api';
import { bc } from '../../../core/styles';
import { localeOf } from '../../../core/format';
import { ADDR_TYPES, CURRENCIES } from '../../../core/partyEnums';
import { openLedgerModal } from '../../../core/LedgerModalHost';
import { useHotkey } from '../../../core/ux/hotkeys';
import { Combobox } from '../../../core/ux/Combobox';
import { toast } from '../../../core/ux/toast';
import { Kbd } from '../../../core/ux/widgets.jsx';
import { PageLayout } from '../../../shell/PageLayout';
import { Button, IconButton, Input, Select, Textarea, FormField, LoadingState, ErrorState, EmptyState, Skeleton } from '../../../shell/primitives';

export const GOLD = '#c2a04a', DARK = '#1a1c22', DIM = '#5b616e', RED = '#dc2626', GREEN = '#16a34a';

// Local panel wrapper (replaces helpers.tabPanel) — design-system spacing.
export const tabPanel = (children) => <div className="min-h-[360px] p-4 tablet:p-5">{children}</div>;

// All party picklists (SUPPLIER_CATS, GST_TREATMENTS, COUNTRIES, IN_STATES, STATE_NAMES,
// MSME_STATUS, TDS_SECTIONS, PAY_TERMS, SETTLE_CYCLES, PAY_METHODS, CURRENCIES, ADDR_TYPES,
// CUST_TYPES, CUST_SOURCES) now live in core/partyEnums so the simple list masters in
// client-master/customers.jsx + supplier-master/suppliers.jsx share the exact same vocabulary.

// Branch-aware full amount: ₹ + Indian grouping for India branches, $ + Western
// grouping for USD branches (NBO/DAR/FBM). `branchCode` defaults to the ₹ home branch.
const curOfBranch = (branchCode) => (bc({ code: branchCode }) || {}).cur || '₹';
export const rupee = (n, branchCode) => { const c = curOfBranch(branchCode); return c + (Number(n) || 0).toLocaleString(localeOf(c)); };
export const numOf = (s) => Number(String(s == null ? '' : s).replace(/[^0-9.-]/g, '')) || 0;

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
    // includeSettled → full bill-wise picture (raised → settled → outstanding) for the
    // party statement, not just open bills. Outstanding total still sums open amounts.
    queryFn: () => apiGet('/api/vouchers/open-bills', { party, side, includeSettled: '1' }),
    enabled: !!getAuthToken() && !!party,
    staleTime: 30_000,
  });
}

// One hook drives both masters: list + selection + editable form + save.
// `brc` (a specific top-bar branch code) narrows the record list to that
// branch's parties + the Common ('ALL') ones — never another branch's.
export function usePartyMaster(resource, side, brc) {
  const list = useMasterList(resource);
  const { update, create } = useMasterMutations(resource);
  const rows = (list.data || []).filter((r) => !brc || !r.branch || r.branch === 'ALL' || r.branch === brc);

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

  const saving = update.isPending || create.isPending;

  const save = () => {
    if (!form) return;
    setErr('');
    const { id, ...body } = form;
    const onSuccess = (data) => {
      const rec = data || form;
      setForm({ ...rec });
      setBaseline(JSON.stringify(rec));
      // A create (promoted from a "derived:" row) comes back with a real id, different
      // from the synthetic one it was selected under — re-point the selection so the
      // refetch below doesn't strand it (falling back to rows[0]).
      if (rec.id && rec.id !== id) setSelectedId(rec.id);
      setSavedAt(Date.now());
      list.refetch();
      toast(`${rec.name || 'Record'} saved`);
    };
    const onError = (e) => { setErr(e.message || 'Save failed'); toast(`Could not save — ${e.message || 'failed'}`, 'error'); };
    // "derived:" rows are ledgers the backend surfaces here for visibility (a party
    // that only exists because a voucher referenced it) — they have no real master
    // document to PUT to. Saving one must CREATE the real record instead, or the
    // backend 404s ("Cannot PUT .../derived:...") since there's nothing to update.
    if (!id || String(id).startsWith('derived:')) create.mutate(body, { onSuccess, onError });
    else update.mutate({ id, body }, { onSuccess, onError });
  };

  // Ctrl/Cmd+Enter saves from anywhere on the (multi-tab) party form, when dirty.
  const liveRef = useRef(null);
  liveRef.current = { save, dirty, saving };
  useHotkey('mod+enter', () => { const s = liveRef.current; if (s && s.dirty && !s.saving) s.save(); }, []);

  return {
    list, rows, current, form, setField, setSelectedId, save,
    saving, err, savedAt, dirty, vouchersQ, openBillsQ,
  };
}

/* ── Generic editable repeatable section (contacts, banks, addresses, …) ───── */
export function ArrayEditor({ rows, cols, onChange, addLabel }) {
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
export function Field({ label, value, onChange, readOnly, mono, type = 'text', placeholder }) {
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

export function SelectField({ label, value, onChange, options }) {
  return (
    <FormField label={label}>
      <Select value={value == null ? '' : value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => <option key={o} value={o}>{o === '' ? '— Select —' : o}</option>)}
      </Select>
    </FormField>
  );
}

export function CheckField({ label, checked, onChange, onText, offText, danger }) {
  return (
    <FormField label={label}>
      <label className="flex cursor-pointer items-center gap-1.5 pt-1.5">
        <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="text-xs font-semibold" style={{ color: checked ? (danger ? RED : GREEN) : DIM }}>{checked ? onText : offText}</span>
      </label>
    </FormField>
  );
}

export function EmptyHint({ children }) {
  return <p className="mb-3 text-[11.5px] text-ink-muted">{children}</p>;
}

// Linked Vouchers — live table of every voucher whose party = this record.
export function LinkedVouchersTab({ q }) {
  if (q.isLoading) return tabPanel(
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" style={{ opacity: 0.75 }} />
      <Skeleton className="h-9 w-full" style={{ opacity: 0.55 }} />
    </div>
  );
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
          <tr key={r.id} style={{ borderBottom: '1px solid #dfe2e7' }}>
            <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{r.vno || '—'}</td>
            <td style={{ padding: '9px 12px', color: DIM }}>{r.date || '—'}</td>
            <td style={{ padding: '9px 12px' }}>{r.type || r.category || '—'}</td>
            <td style={{ padding: '9px 12px' }}><span style={{ padding: '2px 6px', background: '#e6e8f1', borderRadius: 3, fontSize: 10, fontWeight: 700 }}>{r.branch || '—'}</span></td>
            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700 }}>{rupee(r.total, r.branch)}</td>
            <td style={{ padding: '9px 12px', textAlign: 'center' }}><span style={{ padding: '2px 8px', background: paid ? '#e8f6ed' : '#fbeedb', color: paid ? '#16a34a' : '#d97706', borderRadius: 3, fontSize: 10, fontWeight: 700 }}>{r.status || '—'}</span></td>
          </tr>
        );
      })}</tbody>
    </table>
  );
}

// Outstanding — live open bills (unsettled) for the party.
export function OutstandingTab({ q, side, branch }) {
  const fmt = (n) => rupee(n, branch);
  if (q.isLoading) return tabPanel(
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" style={{ opacity: 0.75 }} />
      <Skeleton className="h-9 w-full" style={{ opacity: 0.55 }} />
    </div>
  );
  if (q.isError) return tabPanel(<p style={{ color: RED, fontSize: 12 }}>⚠ {q.error?.message || 'Failed to load open bills'}</p>);
  const data = q.data || { bills: [], advances: 0 };
  const bills = data.bills || [];
  const total = bills.reduce((s, b) => s + (Number(b.outstanding) || 0), 0);
  const settledTotal = bills.reduce((s, b) => s + (Number(b.allocated) || 0), 0);
  if (!bills.length && !data.advances) return tabPanel(<p style={{ color: DIM, fontSize: 12 }}>{side === 'supplier' ? 'No bills recorded for this supplier.' : 'No invoices recorded for this customer.'}</p>);
  const STATUS_BG = { settled: '#e3f0e3', partial: '#fbeedb', pending: '#e6e8f1', overpaid: '#fff1e0' };
  return tabPanel(
    <div className="kbiz-card">
      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 10 }}>{side === 'supplier' ? 'Bill-wise — billed, settled & payable' : 'Bill-wise — invoiced, settled & receivable'}</p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
        <thead style={{ background: '#f7f8fb' }}><tr>{['Bill', 'Date', 'Bill Amt', 'Settled', 'Outstanding', 'Age', 'Status'].map((h, i) => (
          <th key={h} style={{ padding: '8px 12px', textAlign: (i === 2 || i === 3 || i === 4) ? 'right' : i >= 5 ? 'center' : 'left', fontSize: 10, color: DIM, fontWeight: 700 }}>{h}</th>
        ))}</tr></thead>
        <tbody>{bills.map((b) => {
          const settled = (Number(b.outstanding) || 0) <= 0.01;
          const overdue = !settled && b.creditDays != null && b.ageDays > b.creditDays;
          return (
            <tr key={b.billId} style={{ borderBottom: '1px solid #dfe2e7' }}>
              <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600 }}>{b.billVno}</td>
              <td style={{ padding: '8px 12px', color: DIM }}>{b.date}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{fmt(b.total)}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', color: b.allocated ? GREEN : DIM, fontWeight: b.allocated ? 700 : 400 }}>{b.allocated ? fmt(b.allocated) : '—'}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: settled ? DIM : undefined }}>{settled ? '—' : fmt(b.outstanding)}</td>
              <td style={{ padding: '8px 12px', textAlign: 'center', color: settled ? DIM : overdue ? RED : GREEN, fontWeight: 700 }}>{settled ? '—' : `${b.ageDays}d`}</td>
              <td style={{ padding: '8px 12px', textAlign: 'center' }}><span style={{ padding: '2px 8px', background: STATUS_BG[b.status] || '#e6e8f1', borderRadius: 3, fontSize: 10, fontWeight: 700 }}>{b.status}</span></td>
            </tr>
          );
        })}</tbody>
      </table>
      {data.advances > 0 && <p style={{ margin: '10px 0 0', fontSize: 11.5, color: DIM }}>On-account / advances: <b style={{ color: DARK }}>{fmt(data.advances)}</b></p>}
      <div style={{ marginTop: 12, padding: 10, background: DARK, borderRadius: 5, display: 'flex', justifyContent: 'space-between', gap: 16 }}>
        <span style={{ color: GREEN, fontSize: 11.5, fontWeight: 700 }}>SETTLED <b style={{ color: '#fff', fontFamily: 'monospace', marginLeft: 6 }}>{fmt(settledTotal)}</b></span>
        <span style={{ color: GOLD, fontSize: 11.5, fontWeight: 700 }}>{side === 'supplier' ? 'TOTAL PAYABLE' : 'TOTAL RECEIVABLE'} <b style={{ color: '#fff', fontFamily: 'monospace', marginLeft: 6 }}>{fmt(total)}</b></span>
      </div>
    </div>
  );
}

// History — KPIs + monthly bar chart derived from the party's vouchers.
export function HistoryTab({ q, branch }) {
  const fmt = (n) => rupee(n, branch);
  if (q.isLoading) return tabPanel(
    <div className="flex flex-col gap-2">
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-9 w-full" style={{ opacity: 0.75 }} />
      <Skeleton className="h-9 w-full" style={{ opacity: 0.55 }} />
    </div>
  );
  const rows = q.data || [];
  if (!rows.length) return tabPanel(<p style={{ color: DIM, fontSize: 12 }}>Once vouchers are posted for this party, monthly totals appear here.</p>);
  const total = rows.reduce((s, v) => s + (Number(v.total) || 0), 0);
  const byMonth = {};
  rows.forEach((v) => { const m = String(v.date || '').slice(0, 7); if (m) byMonth[m] = (byMonth[m] || 0) + (Number(v.total) || 0); });
  const chart = Object.keys(byMonth).sort().slice(-12).map((m) => ({ m, r: Math.round(byMonth[m]) }));
  const kpis = [
    { l: 'Vouchers', v: rows.length, c: DARK },
    { l: 'Total Value', v: fmt(total), c: RED },
    { l: 'Avg / Voucher', v: fmt(total / rows.length), c: GOLD },
    { l: 'Active Months', v: Object.keys(byMonth).length, c: GREEN },
  ];
  return tabPanel(
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,150px),1fr))', gap: 10, marginBottom: 14 }}>
        {kpis.map((k) => (
          <div key={k.l} style={{ padding: 12, background: '#fafbfd', borderRadius: 6, border: '1px solid #cdd1d8', borderTop: '3px solid ' + k.c }}>
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
          <Tooltip formatter={(v) => fmt(v)} />
          <Bar dataKey="r" fill={GOLD} />
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

// Shared header: record selector + save controls + load/empty states.
export function PartyShell({ title, subtitle, m, tabs, tab, setTab, children }) {
  const { list, rows, current, save, saving, err, savedAt, dirty } = m;

  const selector = (
    <div className="mb-3.5 flex flex-wrap items-center gap-2.5">
      <label className="text-[11px] font-bold text-ink-muted" htmlFor="party-record-select">Record</label>
      {/* Searchable picker — type-ahead over potentially long customer/supplier lists. */}
      <div className="min-w-[280px]">
        <Combobox
          id="party-record-select"
          ariaLabel="Record"
          value={(current && current.id) || ''}
          options={[...rows].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })).map((r) => ({ value: r.id, label: r.name, sublabel: r.branch ? `· ${r.branch}` : '' }))}
          onChange={(id) => m.setSelectedId(id)}
          placeholder={rows.length === 0 ? '— no records —' : 'Search records…'}
        />
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
export const ADDR_COLS = [
  { key: 'type', label: 'Type', type: 'select', options: ADDR_TYPES, w: 150 },
  { key: 'line', label: 'Address', type: 'textarea' },
  { key: 'primary', label: 'Primary', type: 'primary', w: 60 },
];
export const CONTACT_COLS = [
  { key: 'name', label: 'Name', type: 'text' },
  { key: 'role', label: 'Role', type: 'text' },
  { key: 'email', label: 'Email', type: 'email', mono: true },
  { key: 'phone', label: 'Phone', type: 'text' },
  { key: 'primary', label: 'Primary', type: 'primary', w: 60 },
];
export const BANK_COLS = [
  { key: 'bank', label: 'Bank', type: 'text' },
  { key: 'account', label: 'Account', type: 'text', mono: true },
  { key: 'ifsc', label: 'IFSC / SWIFT', type: 'text', mono: true },
  { key: 'currency', label: 'Currency', type: 'select', options: CURRENCIES, w: 90 },
  { key: 'beneficiary', label: 'Beneficiary', type: 'text' },
  { key: 'primary', label: 'Primary', type: 'primary', w: 60 },
];
export const DOC_COLS = [
  { key: 'name', label: 'Document', type: 'text' },
  { key: 'url', label: 'Link / Reference', type: 'text', mono: true },
  { key: 'uploadedAt', label: 'Date', type: 'date', w: 150 },
];
export const NOTE_COLS = [
  { key: 'text', label: 'Note', type: 'textarea' },
  { key: 'user', label: 'By', type: 'text', w: 130 },
  { key: 'ts', label: 'Date', type: 'date', w: 150 },
  { key: 'pinned', label: 'Pin', type: 'bool', w: 50 },
];
export const CUSTOM_COLS = [
  { key: 'label', label: 'Field', type: 'text' },
  { key: 'value', label: 'Value', type: 'text' },
];

/* Admin-DEFINED custom fields (Settings ▸ Custom Fields, /api/custom-fields) —
   the consumer that makes that master real: every active definition for this
   master renders its typed input (Text/Number/Date/Dropdown, required badge)
   and binds by label into the same customFields[] the doc persists. Free-form
   rows keep working below for anything not admin-defined. */
function DefinedCustomFields({ master, rows = [], onChange }) {
  const { data: defs = [] } = useMasterList('custom-fields', { master, active: true });
  if (!defs.length) return null;
  const valOf = (label) => (rows.find((r) => r.label === label) || {}).value ?? '';
  const setVal = (label, value) => onChange([...rows.filter((r) => r.label !== label), { label, value }]);
  const input = (d) => {
    const common = { value: valOf(d.label), onChange: (e) => setVal(d.label, e.target.value), style: { width: '100%', padding: '7px 10px', border: '1px solid #cdd1d8', borderRadius: 5, fontSize: 12 } };
    if (/dropdown/i.test(d.type)) {
      const opts = String(d.options || '').split(',').map((o) => o.trim()).filter(Boolean);
      return <select {...common}><option value="">—</option>{opts.map((o) => <option key={o} value={o}>{o}</option>)}</select>;
    }
    if (/date/i.test(d.type)) return <input type="date" {...common} />;
    if (/number/i.test(d.type)) return <input type="number" {...common} />;
    return <input type="text" {...common} />;
  };
  return (
    <div style={{ marginBottom: 14, padding: 12, background: '#fafbfd', border: '1px solid #cdd1d8', borderRadius: 6 }}>
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#5b616e', textTransform: 'uppercase' }}>Defined fields (Settings ▸ Custom Fields)</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))', gap: 10 }}>
        {defs.map((d) => (
          <div key={d.cfId || d.id}>
            <label style={{ display: 'block', fontSize: 10.5, color: '#5b616e', fontWeight: 700, marginBottom: 3 }}>
              {d.label}{d.required && <span style={{ color: '#dc2626' }}> *</span>}
            </label>
            {input(d)}
            {d.required && !String(valOf(d.label)).trim() && <p style={{ margin: '3px 0 0', fontSize: 9.5, color: '#dc2626' }}>required</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* The whole Custom tab: admin-defined typed fields on top, free-form key/value
   rows below (free-form hides labels an admin definition already covers). */
export function CustomFieldsTab({ master, hint, rows = [], onChange }) {
  const { data: defs = [] } = useMasterList('custom-fields', { master, active: true });
  const defined = new Set(defs.map((d) => d.label));
  const freeRows = rows.filter((r) => !defined.has(r.label));
  const definedRows = rows.filter((r) => defined.has(r.label));
  return (
    <>
      <DefinedCustomFields master={master} rows={rows} onChange={onChange} />
      <EmptyHint>{hint}</EmptyHint>
      <ArrayEditor rows={freeRows} cols={CUSTOM_COLS} onChange={(v) => onChange([...definedRows, ...v])} addLabel="Add Field" />
    </>
  );
}
