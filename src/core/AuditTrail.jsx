// Live audit trail for a voucher or SO/PO/GP booking — the full lifecycle timeline
// (created · edited · approved · rejected · deleted · cancelled) with who, when, why,
// and — for an edit — a PLAIN-LANGUAGE "what was there → what it changed to" list plus
// a friendly summary of the whole record at that point (raw data behind a toggle).
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from './api';
import { money } from './format';
import { bc } from './styles';

// Currency symbol for a branch code on a snapshot/record (defaults to ₹).
const curOf = (code) => (bc(code ? { code } : 'ALL') || {}).cur || '₹';

const C = { dark: '#0d1326', blue: '#185FA5', red: '#A32D2D', green: '#27500A', gold: '#d4a437', dim: '#5a6691', border: '#cdd1d8' };

const ACTION = {
  create:  { label: 'Created',  bg: '#EAF3DE', fg: '#27500A' },
  edit:    { label: 'Edited',   bg: '#FFF6D6', fg: '#8a6d12' },
  approve: { label: 'Approved', bg: '#E6F0FA', fg: '#185FA5' },
  reject:  { label: 'Rejected', bg: '#FCEBEB', fg: '#A32D2D' },
  delete:  { label: 'Deleted',  bg: '#FCEBEB', fg: '#A32D2D' },
  cancel:  { label: 'Cancelled', bg: '#f0f1f5', fg: '#5a6691' },
};

// Plain-English label for a stored field name.
const FIELD_LABEL = {
  so: 'Sales side', po: 'Purchase side', gp: 'Gross Profit', taxAmt: 'GST / Tax', tcsAmt: 'TCS', tdsAmt: 'TDS',
  vno: 'Voucher No', bookingNo: 'Booking No', linkNo: 'Link No', costCenter: 'Cost Centre', gstMode: 'GST mode',
  party: 'Party', billTo: 'Bill To', partyGroup: 'Party group', customer: 'Customer', supplier: 'Supplier',
  remarks: 'Remarks', date: 'Date', branch: 'Branch', module: 'Module', status: 'Status', total: 'Total',
  subtotal: 'Subtotal', lines: 'Line items', rows: 'Line items', markupPct: 'Service Charge - 2 %', consultant: 'Consultant',
  noSupplier: 'No-supplier deal', packageType: 'Package type', saleVno: 'Sale invoice', purchaseVno: 'Purchase invoice',
  approvedBy: 'Approved by', deletedBy: 'Deleted by', rejectedReason: 'Rejected reason', supplierAmt: 'Supplier amount',
  amount: 'Amount', counterParty: 'Counter-party', consultantName: 'Consultant', headerRef: 'Reference',
};
const labelOf = (f) => FIELD_LABEL[f] || f.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

// Field names that hold money → render with the branch currency + locale grouping.
const MONEY = new Set(['total', 'subtotal', 'taxAmt', 'tcsAmt', 'tdsAmt', 'amount', 'supplierAmt', 'saleTotal', 'purchaseTotal', 'incentiveAmt', 'incentiveGst', 'incentiveTds', 'onAccount']);

const fmtAt = (s) => {
  if (!s) return '';
  const d = new Date(s);
  return isNaN(d) ? String(s) : d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

// Short one-line summary of a money side ({ total, gst, tcs }) for so/po.
const sideSummary = (v, cur = '₹') => {
  if (!v || typeof v !== 'object') return '—';
  const parts = [money(v.total, cur)];
  if (Number(v.gst)) parts.push(`incl GST ${money(v.gst, cur)}`);
  if (Number(v.tcs)) parts.push(`TCS ${money(v.tcs, cur)}`);
  return parts.join(' · ');
};

// Render one value (old or new) in plain language for the change table.
function ValueView({ field, value, cur = '₹' }) {
  const [raw, setRaw] = useState(false);
  if (value == null || value === '') return <span style={{ color: C.dim }}>—</span>;

  // Money + plain scalars.
  if (typeof value !== 'object') {
    if (MONEY.has(field)) return <span style={{ fontWeight: 700 }}>{money(value, cur)}</span>;
    if (typeof value === 'boolean') return <span>{value ? 'Yes' : 'No'}</span>;
    return <span style={{ fontWeight: 600 }}>{String(value)}</span>;
  }

  // Known nested shapes → friendly one-liners.
  if (field === 'customer' || field === 'supplier') {
    const name = value.name || '—';
    const led = value.ledgerName && value.ledgerName !== value.name ? ` · ledger: ${value.ledgerName}` : '';
    return <span style={{ fontWeight: 600 }}>{name}{led}</span>;
  }
  if (field === 'so' || field === 'po') return <span style={{ fontWeight: 600 }}>{sideSummary(value, cur)}</span>;
  if (field === 'gp') return <span style={{ fontWeight: 600 }}>{money(value.total, cur)} {value.pct != null ? `(${value.pct}%)` : ''}</span>;

  // Arrays of line items → a readable mini list.
  if (Array.isArray(value)) {
    if (!value.length) return <span style={{ color: C.dim }}>none</span>;
    return (
      <div>
        <span style={{ fontWeight: 600 }}>{value.length} item{value.length === 1 ? '' : 's'}</span>
        <ul style={{ margin: '3px 0 0', paddingLeft: 16 }}>
          {value.slice(0, 12).map((l, i) => {
            const name = l.ledger || l.desc || l.fn || l.name || `Item ${i + 1}`;
            const amt = l.amt != null ? l.amt : (l.total != null ? l.total : l.finalSales);
            const dc = l.drCr ? ` (${l.drCr})` : '';
            return <li key={i} style={{ fontSize: 11 }}>{name}{dc}{amt != null ? ` — ${money(amt, cur)}` : ''}</li>;
          })}
          {value.length > 12 && <li style={{ fontSize: 11, color: C.dim }}>…and {value.length - 12} more</li>}
        </ul>
      </div>
    );
  }

  // Any other object → a compact key list, with a raw toggle for the curious.
  return (
    <span>
      <button onClick={() => setRaw((r) => !r)} style={{ background: 'none', border: 'none', color: C.blue, cursor: 'pointer', fontSize: 11, padding: 0, textDecoration: 'underline' }}>
        {raw ? 'hide details' : 'view details'}
      </button>
      {raw && <pre style={{ margin: '4px 0 0', padding: 8, background: '#f7f8fb', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10.5, maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(value, null, 2)}</pre>}
    </span>
  );
}

// A friendly read-only summary of a whole record snapshot (booking or voucher).
function RecordSummary({ record }) {
  if (!record) return null;
  // The snapshot carries its own branch → format its money in that branch's currency.
  const cur = curOf(record.branch);
  const isBooking = !!(record.bookingNo || record.so || record.po);
  const rows = isBooking
    ? [
      ['Booking No', record.bookingNo], ['Link No', record.linkNo], ['Branch', record.branch],
      ['Module', record.module], ['Date', record.date], ['Status', record.status],
      ['Customer', record.customer?.name], ['Supplier', record.noSupplier ? '— (no supplier)' : record.supplier?.name],
      ['Sales', record.so ? sideSummary(record.so, cur) : null], ['Purchase', record.po ? sideSummary(record.po, cur) : null],
      ['Gross Profit', record.gp ? `${money(record.gp.total, cur)} (${record.gp.pct ?? 0}%)` : null],
      ['Remarks', record.remarks],
    ]
    : [
      ['Voucher No', record.vno], ['Type', record.type], ['Category', record.category], ['Branch', record.branch],
      ['Date', record.date], ['Status', record.status], ['Party', record.party || record.billTo],
      ['Total', money(record.total, cur)], ['SVF GST', Number(record.taxAmt) ? money(record.taxAmt, cur) : null], ['SVC2 GST', Number(record.otherTaxesGst) ? money(record.otherTaxesGst, cur) : null],
      ['TCS', Number(record.tcsAmt) ? money(record.tcsAmt, cur) : null], ['TDS', Number(record.tdsAmt) ? money(record.tdsAmt, cur) : null],
      ['Remarks', record.remarks],
    ];
  const shown = rows.filter(([, v]) => v != null && v !== '');
  return (
    <div style={{ marginTop: 6 }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 11.5 }}>
        <tbody>
          {shown.map(([k, v]) => (
            <tr key={k}>
              <td style={{ padding: '2px 12px 2px 0', color: C.dim, whiteSpace: 'nowrap', verticalAlign: 'top' }}>{k}</td>
              <td style={{ padding: '2px 0', color: C.dark, fontWeight: 600 }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {Array.isArray(record.lines) && record.lines.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ color: C.dim, fontSize: 11 }}>Line items</div>
          <ul style={{ margin: '3px 0 0', paddingLeft: 16 }}>
            {record.lines.map((l, i) => (
              <li key={i} style={{ fontSize: 11 }}>{l.ledger || l.desc || `Item ${i + 1}`}{l.drCr ? ` (${l.drCr})` : ''}{l.amt != null ? ` — ${money(l.amt, cur)}` : ''}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function EventCard({ ev, cur = '₹' }) {
  const [showSnap, setShowSnap] = useState(false);
  const a = ACTION[ev.action] || { label: ev.action, bg: '#f0f1f5', fg: C.dim };
  const changes = ev.changes || [];
  return (
    <div style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 12px', marginBottom: 8, background: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10.5, fontWeight: 800, padding: '2px 9px', borderRadius: 20, background: a.bg, color: a.fg }}>{a.label}</span>
        {ev.source === 'pre-audit' && <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: '#f0f1f5', color: C.dim }} title="Edited before the audit log existed — change details & reason were not captured">pre-audit</span>}
        <span style={{ fontSize: 11.5, color: C.dark, fontWeight: 700 }}>{ev.by || 'unknown'}</span>
        <span style={{ fontSize: 11, color: C.dim }}>{fmtAt(ev.at || ev.createdAt)}</span>
      </div>
      {ev.reason && <div style={{ fontSize: 11.5, color: C.dark, marginTop: 6 }}><b style={{ color: C.dim }}>Why:</b> {ev.reason}</div>}
      {ev.action === 'edit' && (
        changes.length ? (
          <div style={{ marginTop: 8 }}>
            <div style={{ fontSize: 11, color: C.dim, marginBottom: 4 }}>What changed</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
              <thead><tr>
                {['Field', 'Was', 'Changed to'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '4px 8px', color: C.dim, fontSize: 10, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {changes.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #dfe2e7' }}>
                    <td style={{ padding: '5px 8px', fontWeight: 600, color: C.dark, verticalAlign: 'top', whiteSpace: 'nowrap' }}>{labelOf(c.field)}</td>
                    <td style={{ padding: '5px 8px', verticalAlign: 'top', color: C.red }}><ValueView field={c.field} value={c.from} cur={cur} /></td>
                    <td style={{ padding: '5px 8px', verticalAlign: 'top', color: C.green }}><ValueView field={c.field} value={c.to} cur={cur} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <div style={{ fontSize: 11, color: C.dim, marginTop: 6, fontStyle: 'italic' }}>Change details not captured (this edit predates the audit log).</div>
      )}
      {(ev.snapshotAfter || ev.snapshotBefore) && (
        <div style={{ marginTop: 8 }}>
          <button onClick={() => setShowSnap((s) => !s)} style={{ background: 'none', border: 'none', color: C.blue, cursor: 'pointer', fontSize: 11, padding: 0, textDecoration: 'underline' }}>
            {showSnap ? 'Hide full details' : 'View full details at this point'}
          </button>
          {showSnap && <RecordSummary record={ev.snapshotAfter || ev.snapshotBefore} />}
        </div>
      )}
    </div>
  );
}

/** Live audit timeline. entityType: 'voucher' | 'booking'; entityId: the record _id.
 *  `cur` is the branch currency for the change-diff amounts (record snapshots self-derive
 *  their own currency from the snapshot's branch). */
export function AuditTrail({ entityType, entityId, cur = '₹' }) {
  const base = entityType === 'booking' ? '/api/booking-orders' : '/api/vouchers';
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['audit', entityType, entityId],
    queryFn: () => apiGet(`${base}/${entityId}/audit`),
    enabled: !!entityId,
  });
  if (!entityId) return null;
  if (isLoading) return <div style={{ padding: 12, fontSize: 12, color: C.dim }}>Loading history…</div>;
  if (error) return <div style={{ padding: 12, fontSize: 12, color: C.red }}>Could not load audit history: {error.message}</div>;
  if (!data.length) return <div style={{ padding: 12, fontSize: 12, color: C.dim }}>No audit history recorded for this record yet.</div>;
  return (
    <div>
      <div style={{ fontSize: 11.5, color: C.dim, marginBottom: 8 }}>{data.length} event{data.length === 1 ? '' : 's'} · newest first</div>
      {data.map((ev) => <EventCard key={ev._id || ev.at} ev={ev} cur={cur} />)}
    </div>
  );
}
