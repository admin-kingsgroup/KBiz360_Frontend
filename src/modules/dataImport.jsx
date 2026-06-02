/* ════════════════════════════════════════════════════════════════════
   MODULES/DATA-IMPORT.JSX

   Super-admin Tally → Books migration centre. For every data type you can
   download a CSV template (correct headers + one example row), fill it from
   your Tally export, and upload it — rows are pushed straight into the ERP
   backend (/api/import/:entity). Vouchers post their double-entry journals on
   import, so books/registers/reports populate immediately.
   ════════════════════════════════════════════════════════════════════ */

import React, { useState } from 'react';
import { Download, Upload, CheckCircle2, AlertTriangle, FileSpreadsheet, ShieldAlert } from 'lucide-react';
import { card } from '../core/styles';
import { apiPost } from '../core/api';

const DARK = '#0d1326', BLUE = '#0070f2', DIM = '#5a6691', RED = '#A32D2D', GREEN = '#27500A';

// entity = the backend /api/import/:entity bucket. columns = template headers.
const SPECS = [
  // ── Masters ──────────────────────────────────────────────────────────────
  { group: 'Masters', entity: 'ledgers', label: 'Ledgers (Chart of Accounts)',
    desc: 'Opening balances + groups. Import these first.',
    columns: ['code', 'name', 'group', 'subGroup', 'branch', 'currency', 'openingBalance', 'drCr', 'active'],
    example: ['1001', 'Cash in Hand — BOM', 'Cash-in-Hand', '', 'BOM', 'INR', '50000', 'Dr', 'true'] },
  { group: 'Masters', entity: 'voucher-types', label: 'Voucher Types',
    desc: 'Parent type must be one of the 8 Tally types.',
    columns: ['name', 'parentType', 'abbreviation', 'numberingMethod', 'prefix', 'active'],
    example: ['Sales', 'Sales', 'Sale', 'Automatic', 'SF', 'true'] },
  { group: 'Masters', entity: 'cost-categories', label: 'Cost Categories',
    desc: 'Parallel cost-centre allocation sets.',
    columns: ['name', 'allocateRevenue', 'allocateNonRevenue', 'active'],
    example: ['Branch', 'true', 'false', 'true'] },
  { group: 'Masters', entity: 'budgets', label: 'Budgets',
    desc: 'Budget header (lines can be added in-app).',
    columns: ['name', 'branch', 'fromDate', 'toDate', 'amount', 'notes', 'active'],
    example: ['FY 2026 Operating', 'ALL', '2025-04-01', '2026-03-31', '8000000', 'Annual', 'true'] },
  { group: 'Masters', entity: 'scenarios', label: 'Scenarios',
    desc: 'Use “;” to separate multiple voucher types.',
    columns: ['name', 'includeActuals', 'voucherTypes', 'exclude', 'notes', 'active'],
    example: ['Provisional', 'true', 'Journal;Contra', '', 'Actuals + provisional', 'true'] },
  // ── Parties ──────────────────────────────────────────────────────────────
  { group: 'Parties', entity: 'customers', label: 'Customers (Clients)',
    desc: 'Sundry debtors.',
    columns: ['name', 'branch', 'phone', 'email'],
    example: ['Acme Travels', 'BOM', '+91 98200 00000', 'accounts@acme.com'] },
  { group: 'Parties', entity: 'suppliers', label: 'Suppliers',
    desc: 'Sundry creditors / vendors.',
    columns: ['name', 'category', 'type', 'branch', 'gstin', 'pan', 'contact', 'phone', 'email', 'city', 'country', 'creditDays', 'active'],
    example: ['Emirates GSA', 'Air', 'GSA', 'BOM', '27AABCE1234M1Z5', 'AABCE1234M', 'Mr. Khan', '+91 98201 00000', 'gsa@emirates.com', 'Mumbai', 'India', '7', 'true'] },
  // ── Vouchers (post double-entry on import) ─────────────────────────────────
  { group: 'Vouchers', entity: 'sales', label: 'Sales',
    desc: 'Dr customer · Cr sales + GST. Use the same Link No as its purchase.',
    columns: ['vno', 'date', 'branch', 'party', 'ledger', 'subtotal', 'taxAmt', 'total', 'linkNo', 'remarks'],
    example: ['SF/26/0001', '2025-06-01', 'BOM', 'Acme Travels', 'Sales — Air Tickets', '10000', '1800', '11800', 'TKB-0001', 'DEL-DXB'] },
  { group: 'Vouchers', entity: 'purchase', label: 'Purchase',
    desc: 'Dr purchase + GST · Cr supplier. Use the same Link No as its sale.',
    columns: ['vno', 'date', 'branch', 'party', 'ledger', 'subtotal', 'taxAmt', 'total', 'linkNo', 'remarks'],
    example: ['PF/26/0001', '2025-06-01', 'BOM', 'Emirates GSA', 'Purchase — Air Tickets', '8000', '1440', '9440', 'TKB-0001', 'DEL-DXB'] },
  { group: 'Vouchers', entity: 'receipt', label: 'Receipts',
    desc: 'Dr bank/cash · Cr customer.',
    columns: ['vno', 'date', 'branch', 'party', 'total', 'paymentMode', 'remarks'],
    example: ['RV/26/0001', '2025-06-02', 'BOM', 'Acme Travels', '11800', 'HDFC Bank', 'Against SF/26/0001'] },
  { group: 'Vouchers', entity: 'payment', label: 'Payments',
    desc: 'Dr supplier · Cr bank/cash.',
    columns: ['vno', 'date', 'branch', 'party', 'total', 'paymentMode', 'remarks'],
    example: ['PMT/26/0001', '2025-06-03', 'BOM', 'Emirates GSA', '9440', 'HDFC Bank', 'Against PF/26/0001'] },
  { group: 'Vouchers', entity: 'journal', label: 'Journal',
    desc: 'Dr one ledger · Cr another, same amount.',
    columns: ['vno', 'date', 'branch', 'debitLedger', 'creditLedger', 'amount', 'remarks'],
    example: ['JV/26/0001', '2025-06-30', 'BOM', 'Rent & Utilities', 'Accounts Payable', '25000', 'June rent'] },
  { group: 'Vouchers', entity: 'contra', label: 'Contra',
    desc: 'Bank ↔ cash transfer (from → to).',
    columns: ['vno', 'date', 'branch', 'fromAccount', 'toAccount', 'total', 'remarks'],
    example: ['CV/26/0001', '2025-06-04', 'BOM', 'HDFC Bank', 'Cash in Hand — BOM', '50000', 'Cash withdrawal'] },
  { group: 'Vouchers', entity: 'credit-note', label: 'Credit Notes (Sales Return)',
    desc: 'Dr sales + GST · Cr customer. Link No ties it to the original file.',
    columns: ['vno', 'date', 'branch', 'party', 'ledger', 'subtotal', 'taxAmt', 'total', 'linkNo', 'remarks'],
    example: ['SCN/26/0001', '2025-06-05', 'BOM', 'Acme Travels', 'Sales — Air Tickets', '2000', '360', '2360', 'TKB-0001', 'Partial refund'] },
  { group: 'Vouchers', entity: 'debit-note', label: 'Debit Notes (Purchase Return)',
    desc: 'Dr supplier · Cr purchase + GST. Link No ties it to the original file.',
    columns: ['vno', 'date', 'branch', 'party', 'ledger', 'subtotal', 'taxAmt', 'total', 'linkNo', 'remarks'],
    example: ['DB/26/0001', '2025-06-05', 'BOM', 'Emirates GSA', 'Purchase — Air Tickets', '1000', '180', '1180', 'TKB-0001', 'Ticket void'] },
];

const GROUPS = ['Masters', 'Parties', 'Vouchers'];

/* ── CSV helpers ─────────────────────────────────────────────────────────── */
const csvCell = (v) => {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function downloadTemplate(spec) {
  const csv = spec.columns.join(',') + '\n' + spec.example.map(csvCell).join(',') + '\n';
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `${spec.entity}-template.csv`;
  document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const out = [];
  let field = '', row = [], inQ = false;
  const t = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQ) {
      if (c === '"') { if (t[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
      else field += c;
    } else if (c === '"') inQ = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); out.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field !== '' || row.length) { row.push(field); out.push(row); }
  return out.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

function rowsFromCSV(text, columns) {
  const grid = parseCSV(text);
  if (!grid.length) return [];
  const headers = grid[0].map((h) => h.trim());
  return grid.slice(1).map((cells) => {
    const o = {};
    headers.forEach((h, i) => { if (columns.includes(h)) o[h] = (cells[i] ?? '').trim(); });
    return o;
  });
}

/* ── UI ──────────────────────────────────────────────────────────────────── */
const btn = (bg, fg, outline) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 11px', borderRadius: 7, cursor: 'pointer', fontSize: 11.5, fontWeight: 700, background: bg, color: fg, border: outline ? `1px solid ${fg}33` : 'none' });

function EntityCard({ spec, onUpload, state }) {
  const inputId = `imp-${spec.entity}`;
  return (
    <div style={{ ...card, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: '#eef4ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <FileSpreadsheet size={17} style={{ color: BLUE }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{spec.label}</div>
          <div style={{ fontSize: 10.5, color: DIM, marginTop: 2 }}>{spec.desc}</div>
        </div>
      </div>
      <div style={{ fontSize: 9.5, color: '#9aa2c0', fontFamily: 'monospace', wordBreak: 'break-word' }}>{spec.columns.join(', ')}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => downloadTemplate(spec)} style={btn('#fff', BLUE, true)}><Download size={13} /> Template</button>
        <label htmlFor={inputId} style={btn(BLUE, '#fff')}>
          <Upload size={13} /> {state?.busy ? 'Uploading…' : 'Upload CSV'}
        </label>
        <input id={inputId} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(spec, f); e.target.value = ''; }} />
      </div>
      {state?.result && (
        <div style={{ fontSize: 11, padding: '8px 10px', borderRadius: 6, background: state.result.failed?.length ? '#fff7ed' : '#ecfdf3', border: `1px solid ${state.result.failed?.length ? '#fed7aa' : '#bbf7d0'}` }}>
          <div style={{ fontWeight: 700, color: state.result.failed?.length ? '#854F0B' : GREEN, display: 'flex', alignItems: 'center', gap: 6 }}>
            {state.result.failed?.length ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />}
            {state.result.inserted}/{state.result.total} imported{state.result.failed?.length ? `, ${state.result.failed.length} failed` : ''}
          </div>
          {state.result.failed?.slice(0, 5).map((f, i) => (
            <div key={i} style={{ color: RED, marginTop: 3 }}>Row {f.row}: {f.error}</div>
          ))}
          {state.result.failed?.length > 5 && <div style={{ color: DIM, marginTop: 3 }}>…and {state.result.failed.length - 5} more</div>}
        </div>
      )}
      {state?.error && <div style={{ fontSize: 11, color: RED, fontWeight: 600 }}>⚠ {state.error}</div>}
    </div>
  );
}

export function DataImportPage({ currentUser }) {
  const [states, setStates] = useState({}); // entity → { busy, result, error }

  if (currentUser && currentUser.role !== 'Super Admin') {
    return (
      <div style={{ padding: 40, maxWidth: 560, margin: '0 auto', textAlign: 'center', color: DIM }}>
        <ShieldAlert size={30} style={{ color: '#854F0B', marginBottom: 10 }} />
        <h2 style={{ margin: 0, fontSize: 16, color: DARK }}>Restricted</h2>
        <p style={{ fontSize: 12.5 }}>Data migration is available to the Super Admin only.</p>
      </div>
    );
  }

  const setState = (entity, patch) => setStates((s) => ({ ...s, [entity]: { ...s[entity], ...patch } }));

  const onUpload = async (spec, file) => {
    setState(spec.entity, { busy: true, error: '', result: null });
    try {
      const text = await file.text();
      const rows = rowsFromCSV(text, spec.columns);
      if (!rows.length) throw new Error('No data rows found in the file');
      const result = await apiPost(`/api/import/${spec.entity}`, { rows });
      setState(spec.entity, { busy: false, result });
    } catch (e) {
      setState(spec.entity, { busy: false, error: e.message });
    }
  };

  return (
    <div style={{ padding: '12px 14px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: DARK }}>Data Import — Tally Migration</h2>
        <p style={{ margin: '3px 0 0', fontSize: 11.5, color: DIM }}>
          Download a template, fill it from your Tally export, and upload. Recommended order:
          <strong> Ledgers → Customers/Suppliers → Vouchers</strong>. Voucher imports auto-post double-entry to the books.
          {' '}On Sales & Purchase, put the <strong>same Link No</strong> on a sale and its related purchase(s) to tie them for invoice-wise profit.
        </p>
      </div>
      {GROUPS.map((g) => (
        <div key={g} style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase', color: BLUE, marginBottom: 8 }}>{g}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {SPECS.filter((s) => s.group === g).map((s) => (
              <EntityCard key={s.entity} spec={s} state={states[s.entity]} onUpload={onUpload} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
