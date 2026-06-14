// Live audit trail for a voucher or SO/PO/GP booking — the full lifecycle timeline
// (created · edited · approved · rejected · deleted · cancelled) with who, when, why,
// the field-by-field change list, and the complete record snapshot at each edit.
// Used inside the Edited tab and the voucher/booking detail views.
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet } from './api';

const C = { dark: '#0d1326', blue: '#185FA5', red: '#A32D2D', green: '#27500A', gold: '#d4a437', dim: '#5a6691', border: '#e1e3ec' };

// Per-action badge styling for the timeline.
const ACTION = {
  create:  { label: 'Created',  bg: '#EAF3DE', fg: '#27500A' },
  edit:    { label: 'Edited',   bg: '#FFF6D6', fg: '#8a6d12' },
  approve: { label: 'Approved', bg: '#E6F0FA', fg: '#185FA5' },
  reject:  { label: 'Rejected', bg: '#FCEBEB', fg: '#A32D2D' },
  delete:  { label: 'Deleted',  bg: '#FCEBEB', fg: '#A32D2D' },
  cancel:  { label: 'Cancelled', bg: '#f0f1f5', fg: '#5a6691' },
};

// Humanise a schema field name for the change table (so/po → SO/PO, taxAmt → Tax Amt…).
const FIELD_LABEL = { so: 'Sales (SO)', po: 'Purchase (PO)', gp: 'Gross Profit', taxAmt: 'GST / Tax', tcsAmt: 'TCS', tdsAmt: 'TDS', vno: 'Voucher No', linkNo: 'Link No', costCenter: 'Cost Centre' };
const labelOf = (f) => FIELD_LABEL[f] || f.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase());

const fmtAt = (s) => {
  if (!s) return '';
  const d = new Date(s);
  if (isNaN(d)) return String(s);
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const isPrimitive = (v) => v == null || typeof v !== 'object';
const short = (v) => {
  if (v == null || v === '') return '—';
  if (isPrimitive(v)) return String(v);
  try { const s = JSON.stringify(v); return s.length > 120 ? s.slice(0, 117) + '…' : s; } catch { return String(v); }
};

// One field's value — primitives inline; objects/arrays as a collapsible JSON block.
function ValueCell({ v, color }) {
  const [open, setOpen] = useState(false);
  if (isPrimitive(v)) return <span style={{ color: color || C.dark, fontWeight: 600 }}>{v == null || v === '' ? '—' : String(v)}</span>;
  return (
    <span>
      <button onClick={() => setOpen((o) => !o)} style={{ background: 'none', border: 'none', color: C.blue, cursor: 'pointer', fontSize: 11, padding: 0, textDecoration: 'underline' }}>
        {open ? 'hide' : 'view'} {Array.isArray(v) ? `[${v.length}]` : '{…}'}
      </button>
      {open && <pre style={{ margin: '4px 0 0', padding: 8, background: '#f7f8fb', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10.5, maxHeight: 200, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(v, null, 2)}</pre>}
    </span>
  );
}

function EventCard({ ev }) {
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
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 11.5 }}>
            <thead><tr>
              {['Field', 'From', 'To'].map((h) => <th key={h} style={{ textAlign: 'left', padding: '4px 8px', color: C.dim, fontSize: 10, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {changes.map((c, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f2f4f8' }}>
                  <td style={{ padding: '4px 8px', fontWeight: 600, color: C.dark, verticalAlign: 'top' }}>{labelOf(c.field)}</td>
                  <td style={{ padding: '4px 8px', verticalAlign: 'top' }}><ValueCell v={c.from} color={C.red} /></td>
                  <td style={{ padding: '4px 8px', verticalAlign: 'top' }}><ValueCell v={c.to} color={C.green} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div style={{ fontSize: 11, color: C.dim, marginTop: 6, fontStyle: 'italic' }}>Change details not captured.</div>
      )}
      {(ev.snapshotAfter || ev.snapshotBefore) && (
        <div style={{ marginTop: 6 }}>
          <button onClick={() => setShowSnap((s) => !s)} style={{ background: 'none', border: 'none', color: C.blue, cursor: 'pointer', fontSize: 11, padding: 0, textDecoration: 'underline' }}>
            {showSnap ? 'Hide' : 'View'} full record at this point
          </button>
          {showSnap && <pre style={{ margin: '6px 0 0', padding: 10, background: '#f7f8fb', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 10.5, maxHeight: 320, overflow: 'auto', whiteSpace: 'pre-wrap' }}>{JSON.stringify(ev.snapshotAfter || ev.snapshotBefore, null, 2)}</pre>}
        </div>
      )}
    </div>
  );
}

/** Live audit timeline. entityType: 'voucher' | 'booking'; entityId: the record _id. */
export function AuditTrail({ entityType, entityId }) {
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
      {data.map((ev) => <EventCard key={ev._id || ev.at} ev={ev} />)}
    </div>
  );
}

export { short as auditShortValue };
