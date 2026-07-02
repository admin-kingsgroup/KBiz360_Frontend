import React from 'react';
import { Modal } from '../../../../core/ux/Modal';

// ── Dashboard drill-downs (Design 2) ────────────────────────────────────────────
// The AD-Dashboard KPI cards and the pipeline Approved cards no longer render the
// Sales/GP Reconciliation as inline page panels; instead each card opens a small
// popup that PROVES its figure by origin. Every popup is fed by the SAME live data
// the card itself uses (salesRecon / gpRecon / module-PL bridge / ageing / tax /
// liquid trial rows), so it foots to the card to the rupee — no hardcoded numbers.
//
// A drill "config" is a plain object:
//   { title, sub, totalLabel, total, totalColor, rows: [{label, sign, count, value,
//     muted, neg, total, memo}], route }
// The page builds the configs (it owns the data); this module only renders them.

const GREEN = '#16a34a', RED = '#dc2626', DIM = '#5b616e', BORDER = '#dfe2e7', LINE = '#cdd1d8';

function DrillRow({ r }) {
  const style = {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: r.total ? 'none' : `1px solid ${BORDER}`,
    borderTop: r.total ? `2px solid ${LINE}` : 'none',
    marginTop: r.total ? 2 : 0,
    fontWeight: r.total ? 700 : 400,
    fontSize: r.memo ? 11.5 : 12,
    color: r.muted || r.memo ? DIM : '#1f2430',
  };
  const valColor = r.neg ? RED : (r.total ? undefined : (r.muted || r.memo ? DIM : '#1f2430'));
  return (
    <div style={style}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {r.sign ? <span style={{ width: 14, textAlign: 'center', fontWeight: 700, color: r.sign === '−' ? RED : GREEN }}>{r.sign}</span> : null}
        {r.label}
        {r.count != null && r.count !== '' ? <span style={{ color: DIM, fontSize: 11 }}>· {r.count}</span> : null}
      </span>
      <span style={{ fontVariantNumeric: 'tabular-nums', color: valColor }}>{r.value}</span>
    </div>
  );
}

/** The drill popup. `cfg` null ⇒ renders nothing. `onNavigate(route)` opens the full report. */
export function DrilldownModal({ cfg, onClose, onNavigate }) {
  if (!cfg) return null;
  const footer = cfg.route ? (
    <button type="button" onClick={() => { onClose(); onNavigate(cfg.route); }}
      style={{ background: '#0d1326', color: '#fff', border: 'none', borderRadius: 6, padding: '7px 14px', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
      Open full report →
    </button>
  ) : null;
  return (
    <Modal title={cfg.title} sub={cfg.sub} onClose={onClose} footer={footer}>
      <div style={{ padding: '4px 18px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', borderBottom: '2px solid #185FA5', padding: '10px 0 8px' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: '#1f2430' }}>{cfg.totalLabel || cfg.title}</span>
          <span style={{ fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums', color: cfg.totalColor || '#1f2430' }}>{cfg.total}</span>
        </div>
        {(cfg.rows || []).map((r, i) => <DrillRow key={i} r={r} />)}
      </div>
    </Modal>
  );
}

/** Pipeline "Approved" card: headline value + a "✓ matches …" chip + the inline
 *  bucket breakdown; the whole card is a button that opens the full reconciliation. */
export function ApprovedReconCard({ label, value, matchText, color = GREEN, buckets = [], fmt, onClick }) {
  const onKeyDown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e); } };
  return (
    <div onClick={onClick} role="button" tabIndex={0} onKeyDown={onKeyDown} aria-label={`${label}: ${value} — open reconciliation`}
      style={{ position: 'relative', background: '#fff', border: `1px solid ${LINE}`, borderTop: `3px solid ${color}`, borderRadius: 12, padding: '12px 14px', cursor: 'pointer', boxShadow: '0 1px 2px rgba(16,24,40,.04)' }}>
      <span style={{ position: 'absolute', top: 10, right: 12, color: '#2f6fed', fontSize: 12, opacity: 0.55 }}>▸</span>
      <p style={{ margin: 0, fontSize: 10.5, color: DIM, letterSpacing: '0.4px', textTransform: 'uppercase', fontWeight: 700 }}>{label}</p>
      <p style={{ margin: '5px 0 2px', fontSize: 22, fontWeight: 800, color: '#14161a', fontVariantNumeric: 'tabular-nums' }}>{value}</p>
      {matchText ? (
        <span style={{ display: 'inline-block', background: '#eafaf0', border: '1px solid #bfe6cd', color: '#1a7f4b', fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8 }}>{matchText}</span>
      ) : null}
      <div style={{ marginTop: 10, borderTop: `1px dashed ${BORDER}`, paddingTop: 8, fontSize: 11.5, color: DIM, lineHeight: 1.85 }}>
        {buckets.map((b, i) => {
          const neg = b.amount < 0;
          const empty = b.amount === 0 && !b.count;
          return (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', opacity: empty ? 0.6 : 1 }}>
              <span><span style={{ display: 'inline-block', width: 12, fontWeight: 700, color: neg ? RED : GREEN }}>{neg ? '−' : '+'}</span>{b.label}</span>
              <span style={{ fontVariantNumeric: 'tabular-nums', color: empty ? DIM : '#1f2430', fontWeight: empty ? 400 : 600 }}>{fmt(Math.abs(b.amount))}</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 8, fontSize: 10, color: '#2f6fed', fontWeight: 600 }}>▸ Click for full reconciliation (with counts)</div>
    </div>
  );
}
