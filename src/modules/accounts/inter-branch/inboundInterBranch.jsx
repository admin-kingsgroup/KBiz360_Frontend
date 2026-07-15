// ─── Inbound Inter-Branch — the BUYER branch's INSO/INPO/INGP worklist ────────────
// Deals another branch pushed TO us. "Pending Conversion" = we still have to convert
// (open the seeded SO/PO/GP and fill the onward client sale); "Converted" = the sale is
// filled. The purchase cost is the SELLING branch's frozen figure — shown here in OUR
// book currency with the seller's ₹ breakdown for reference. Read-only; the actual
// convert/complete happens on the pending SO/PO/GP booking.
import React, { useState } from 'react';
import { useInbInbound } from '../../../core/useInterBranchVoucher';
import { localeOf } from '../../../core/format';

const C = { dark: '#0d1326', blue: '#185FA5', dim: '#5a6691', border: '#cdd1d8', green: '#27500A', amber: '#8a6d00', bg: '#f7f9fc' };
const CCY_SYM = { INR: '₹', USD: '$' };
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const num = (x) => { const n = Number(x); return Number.isFinite(n) ? n : 0; };
// Translate a seller-currency amount into the buyer's book currency at the deal's frozen
// rate (base USD, quote INR): USD→INR ×rate, INR→USD ÷rate. Same-currency = pass-through.
const toBuyer = (amt, fx) => {
  if (!fx || !(Number(fx.rate) > 0) || fx.fromCcy === fx.toCcy) return r2(amt);
  if (fx.fromCcy === 'USD' && fx.toCcy === 'INR') return r2(num(amt) * Number(fx.rate));
  if (fx.fromCcy === 'INR' && fx.toCcy === 'USD') return r2(num(amt) / Number(fx.rate));
  return r2(amt);
};

export function InboundInterBranch({ branch, setRoute }) {
  const q = useInbInbound(branch);
  const data = q.data || { rows: [], totals: { pending: 0, converted: 0 } };
  const rows = Array.isArray(data.rows) ? data.rows : [];
  const [tab, setTab] = useState('pending');
  const shown = rows.filter((r) => r.state === tab);

  const card = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 9, padding: 0, overflow: 'hidden' };
  const th = { padding: '8px 12px', fontSize: 10.5, fontWeight: 800, letterSpacing: '.04em', textTransform: 'uppercase', color: C.dim, textAlign: 'left', background: C.bg, borderBottom: `1px solid ${C.border}` };
  const td = { padding: '9px 12px', fontSize: 12.5, borderBottom: `1px solid ${C.border}`, verticalAlign: 'top' };
  const tabBtn = (key, label, n) => (
    <button type="button" onClick={() => setTab(key)}
      style={{ padding: '7px 15px', fontSize: 12.5, fontWeight: 700, border: 'none', borderRadius: 7, cursor: 'pointer',
        background: tab === key ? C.blue : 'transparent', color: tab === key ? '#fff' : C.dim }}>
      {label} <span style={{ opacity: 0.85, fontVariantNumeric: 'tabular-nums' }}>({n})</span>
    </button>
  );

  return (
    <div style={{ margin: 12, maxWidth: 1200 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.dark }}>Inbound Inter-Branch · INSO / INPO / INGP</div>
        <div style={{ fontSize: 12, color: C.dim }}>
          Deals pushed to <b>{typeof branch === 'string' ? branch : (branch?.code || '—')}</b> · convert each to a SO/PO/GP (fill the client sale). The purchase from the selling branch is locked.
        </div>
      </div>

      <div style={{ display: 'inline-flex', gap: 4, padding: 4, borderRadius: 9, background: '#eef1f5', border: `1px solid ${C.border}`, marginBottom: 12 }}>
        {tabBtn('pending', 'Pending Conversion', data.totals.pending || 0)}
        {tabBtn('converted', 'Converted', data.totals.converted || 0)}
      </div>

      <div style={card}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={th}>INB Link No</th><th style={th}>From</th><th style={th}>Date</th><th style={th}>Passenger</th>
            <th style={{ ...th, textAlign: 'right' }}>Purchase cost</th><th style={th}>Reference</th>
            <th style={th}>{tab === 'pending' ? 'Action' : 'SO/PO/GP'}</th>
          </tr></thead>
          <tbody>
            {q.isLoading ? (
              <tr><td style={td} colSpan={7}>Loading…</td></tr>
            ) : shown.length === 0 ? (
              <tr><td style={{ ...td, color: C.dim }} colSpan={7}>{tab === 'pending' ? 'Nothing awaiting conversion.' : 'No converted deals yet.'}</td></tr>
            ) : shown.map((rw) => {
              const fx = rw.fx && Number(rw.fx.rate) > 0 && rw.fx.fromCcy !== rw.fx.toCcy ? rw.fx : null;
              const sSym = fx ? (CCY_SYM[fx.fromCcy] || '₹') : '₹';
              const bSym = fx ? (CCY_SYM[fx.toCcy] || sSym) : sSym;
              const buyerCost = toBuyer(rw.total, fx);
              return (
                <tr key={rw.inbLinkNo}>
                  <td style={{ ...td, fontFamily: 'monospace', color: C.blue }}>{rw.inbLinkNo}</td>
                  <td style={td}>{rw.fromBranch}</td>
                  <td style={td}>{rw.date}</td>
                  <td style={td}>{rw.passenger || '—'}</td>
                  <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                    {bSym}{buyerCost.toLocaleString(localeOf(bSym), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td style={{ ...td, fontSize: 11, color: C.dim }}>
                    {sSym}{r2(rw.total).toLocaleString(localeOf(sSym))}
                    {fx && <> @ 1 USD = ₹{Number(fx.rate).toLocaleString(localeOf('₹'))}</>}
                    <div style={{ fontSize: 10.5, color: '#8a94a3' }}>
                      fares {sSym}{r2(rw.fares).toLocaleString(localeOf(sSym))} · fee {sSym}{r2(rw.serviceFee).toLocaleString(localeOf(sSym))}{num(rw.taxAmt) > 0 ? ` · IGST ${sSym}${r2(rw.taxAmt).toLocaleString(localeOf(sSym))}` : ''}
                    </div>
                  </td>
                  <td style={td}>
                    {tab === 'pending'
                      ? <button type="button" onClick={() => setRoute && setRoute('/bookings/pending')}
                          style={{ padding: '6px 12px', fontSize: 12, fontWeight: 700, border: 'none', borderRadius: 6, cursor: 'pointer', color: '#fff', background: C.green }}>Convert →</button>
                      : <span style={{ fontFamily: 'monospace', color: C.dark }}>{rw.buyerBookingNo || '—'}<div style={{ fontSize: 10.5, color: C.dim }}>{rw.buyerStatus || ''}</div></span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>
        Cost shown in your book currency at the deal's frozen rate; the seller's figures are reference only. To fix a wrong cost, revoke the converted SO/PO/GP so the deal can be corrected at source and re-pushed.
      </div>
    </div>
  );
}
