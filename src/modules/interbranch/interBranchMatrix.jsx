// ─── Inter-Branch Trade Matrix & Margin ───────────────────────────────────────
// Two read-only analytics over the INB Link registry (GET /api/inter-branch/matrix):
//   • Trade Matrix — seller × buyer grid of inter-branch turnover
//   • Margin       — per seller→buyer pair: SVF income vs discount passed → GP
// Branch-pair driven; no consolidation/elimination (branches stay independent).
import React from 'react';
import { bc } from '../../core/styles';
import { localeOf } from '../../core/format';
import { useInbMatrix } from '../../core/useInterBranchVoucher';

const C = { dark: '#0d1326', gold: '#d4a437', blue: '#185FA5', red: '#A32D2D', green: '#27500A', dim: '#5a6691', border: '#cdd1d8' };
const money = (cur, n) => cur + Math.round(Number(n) || 0).toLocaleString(localeOf(cur));

export function InterBranchMatrix({ branch }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const q = useInbMatrix({});
  const data = q.data || { branches: [], rows: [], totals: {} };
  // A specific top-bar branch scopes the matrix to pairs INVOLVING that branch
  // (its sales + its purchases); unrelated pairs (e.g. BOM↔AMD under NBO) only
  // show in the ALL view.
  const code = branch && branch !== 'ALL' ? (branch.code || branch) : '';
  const rows = (data.rows || []).filter((r) => !code || r.fromBranch === code || r.toBranch === code);
  const branches = code
    ? (data.branches || []).filter((b) => rows.some((r) => r.fromBranch === b || r.toBranch === b))
    : (data.branches || []);
  const sum = (k) => rows.reduce((s, r) => s + (Number(r[k]) || 0), 0);
  const totals = code
    ? { count: sum('count'), total: sum('total'), fares: sum('fares'), svf: sum('svf'), discount: sum('discount'), margin: sum('margin') }
    : (data.totals || {});

  // pivot rows → cell[seller][buyer] = total, + row/col totals
  const cell = {}; const rowTot = {}; const colTot = {};
  for (const r of rows) {
    (cell[r.fromBranch] = cell[r.fromBranch] || {})[r.toBranch] = r.total;
    rowTot[r.fromBranch] = (rowTot[r.fromBranch] || 0) + r.total;
    colTot[r.toBranch] = (colTot[r.toBranch] || 0) + r.total;
  }

  const card = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 9 };
  const th = { padding: '8px 12px', background: C.dark, color: C.gold, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, whiteSpace: 'nowrap' };
  const td = { padding: '8px 12px', borderBottom: '1px solid #dfe2e7', fontSize: 12.5 };
  const rnum = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

  return (
    <div style={{ margin: 12 }}>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: C.dark }}>Inter-Branch Trade Matrix &amp; Margin</div>
        <div style={{ fontSize: 12, color: C.dim }}>Seller → buyer turnover and the margin (SVF income less discount passed) per branch pair · from the INB Link registry</div>
      </div>

      {q.isLoading && <div style={{ ...card, padding: 20, color: C.dim }}>Loading…</div>}
      {!q.isLoading && rows.length === 0 && <div style={{ ...card, padding: 20, color: C.dim }}>No inter-branch trade yet.</div>}

      {rows.length > 0 && (<>
        {/* ── Trade Matrix grid ── */}
        <div style={{ fontSize: 13, fontWeight: 800, color: C.dark, margin: '4px 2px 8px' }}>Trade Matrix <span style={{ fontWeight: 500, color: C.dim, fontSize: 11 }}>· rows sell → columns buy</span></div>
        <div style={{ ...card, overflow: 'auto', marginBottom: 18 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              <th style={{ ...th, textAlign: 'left' }}>Seller \ Buyer</th>
              {branches.map((b) => <th key={b} style={{ ...th, ...rnum }}>{b}</th>)}
              <th style={{ ...th, ...rnum, background: '#1b2440' }}>Total</th>
            </tr></thead>
            <tbody>
              {branches.map((s) => (
                <tr key={s}>
                  <td style={{ ...td, fontWeight: 700, color: C.dark }}>{s}</td>
                  {branches.map((b) => (
                    <td key={b} style={{ ...td, ...rnum, color: cell[s]?.[b] ? C.dark : '#c8cdd6' }}>{cell[s]?.[b] ? money(cur, cell[s][b]) : '·'}</td>
                  ))}
                  <td style={{ ...td, ...rnum, fontWeight: 800, color: C.blue }}>{money(cur, rowTot[s] || 0)}</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...td, fontWeight: 800, color: C.dark, background: '#f6f7fa' }}>Total</td>
                {branches.map((b) => <td key={b} style={{ ...td, ...rnum, fontWeight: 800, background: '#f6f7fa' }}>{colTot[b] ? money(cur, colTot[b]) : '·'}</td>)}
                <td style={{ ...td, ...rnum, fontWeight: 800, color: C.green, background: '#f6f7fa' }}>{money(cur, totals.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* ── Margin table ── */}
        <div style={{ fontSize: 13, fontWeight: 800, color: C.dark, margin: '4px 2px 8px' }}>Margin <span style={{ fontWeight: 500, color: C.dim, fontSize: 11 }}>· SVF income − discount passed = GP, per pair</span></div>
        <div style={{ ...card, overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              {['Seller → Buyer', 'Legs', 'Turnover', 'Fares (pass-through)', 'SVF income', 'Discount passed', 'Margin (GP)'].map((h, i) =>
                <th key={h} style={{ ...th, ...(i === 0 ? { textAlign: 'left' } : rnum) }}>{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`${r.fromBranch}-${r.toBranch}`}>
                  <td style={{ ...td, fontWeight: 700 }}>{r.fromBranch} → {r.toBranch}</td>
                  <td style={{ ...td, ...rnum }}>{r.count}</td>
                  <td style={{ ...td, ...rnum }}>{money(cur, r.total)}</td>
                  <td style={{ ...td, ...rnum, color: C.dim }}>{money(cur, r.fares)}</td>
                  <td style={{ ...td, ...rnum, color: C.green }}>{money(cur, r.svf)}</td>
                  <td style={{ ...td, ...rnum, color: r.discount ? C.red : C.dim }}>{r.discount ? '(' + money(cur, r.discount) + ')' : '—'}</td>
                  <td style={{ ...td, ...rnum, fontWeight: 800, color: C.blue }}>{money(cur, r.margin)}</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...td, fontWeight: 800, background: '#f6f7fa' }}>Total</td>
                <td style={{ ...td, ...rnum, fontWeight: 800, background: '#f6f7fa' }}>{totals.count}</td>
                <td style={{ ...td, ...rnum, fontWeight: 800, background: '#f6f7fa' }}>{money(cur, totals.total)}</td>
                <td style={{ ...td, ...rnum, fontWeight: 800, background: '#f6f7fa', color: C.dim }}>{money(cur, totals.fares)}</td>
                <td style={{ ...td, ...rnum, fontWeight: 800, background: '#f6f7fa', color: C.green }}>{money(cur, totals.svf)}</td>
                <td style={{ ...td, ...rnum, fontWeight: 800, background: '#f6f7fa', color: C.red }}>{totals.discount ? '(' + money(cur, totals.discount) + ')' : '—'}</td>
                <td style={{ ...td, ...rnum, fontWeight: 800, background: '#f6f7fa', color: C.blue }}>{money(cur, totals.margin)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>
          Read-only from the INB Link registry. <b>Margin (GP)</b> = SVF income − discount passed to the buyer; supplier incentives that fund a discount sit on the linked purchase. No consolidation — branches stay independent.
        </div>
      </>)}
    </div>
  );
}
