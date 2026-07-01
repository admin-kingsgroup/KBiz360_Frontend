// Tax Reconciliation — one screen, four modes. The books side is computed live
// from the ledgers (server-side taxSummary); the filed/external side is entered
// here and persisted. Each head shows books vs filed and flags the difference.
import React, { useMemo, useState } from 'react';
import { useTaxReco, useUpsertTaxFigure } from '../../core/useTaxReco';
import { bc } from '../../core/styles';

const C = { dark: '#0d1326', gold: '#d4a437', blue: '#185FA5', red: '#A32D2D', green: '#27500A', dim: '#5a6691', border: '#cdd1d8' };
const money = (cur, n) => cur + Math.round(Number(n) || 0).toLocaleString((cur === '₹' || cur === '₨' || cur === 'Rs') ? 'en-IN' : 'en-US');
const thisYM = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };

// India branches see the GST/TDS modes; Africa (VAT) branches see VAT vs books.
const GST_MODES = [
  { key: 'gstr3b-books', label: 'GSTR-3B vs Books' },
  { key: 'gstr1-3b', label: 'GSTR-1 vs GSTR-3B' },
  { key: 'tds-26as', label: 'TDS vs Form 26AS' },
];
const VAT_MODES = [{ key: 'vat-books', label: 'VAT Return vs Books' }];
const isIndiaBranch = (b) => b?.code && ['BOMMB', 'BOM', 'AMD'].includes(b.code);

export function TaxReco({ branch }) {
  const cur = (bc(branch) || {}).cur || '₹';
  const india = branch === 'ALL' || isIndiaBranch(branch);
  const modes = india ? [...GST_MODES, ...VAT_MODES] : VAT_MODES;
  const [mode, setMode] = useState(modes[0].key);
  const [period, setPeriod] = useState(thisYM());

  const q = useTaxReco(branch, period, mode);
  const data = q.data || { rows: [], totals: {}, leftLabel: 'Per Books', rightLabel: 'Filed', rightSource: '' };
  const upsert = useUpsertTaxFigure();

  // local edit buffer for the filed-figure inputs (head → string)
  const [edits, setEdits] = useState({});
  const valFor = (r) => (edits[r.head] !== undefined ? edits[r.head] : (r.rightEntered ? String(r.right) : ''));
  const saveFigure = (r) => {
    const raw = edits[r.head];
    if (raw === undefined) return;
    upsert.mutate(
      { branch: branch?.code || branch, period, mode, source: data.rightSource, head: r.head, amount: Number(raw) || 0 },
      { onSuccess: () => setEdits((e) => { const n = { ...e }; delete n[r.head]; return n; }) },
    );
  };

  const card = { background: '#fff', border: `1px solid ${C.border}`, borderRadius: 9 };
  const th = { padding: '8px 12px', background: C.dark, color: C.gold, fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, textAlign: 'left', whiteSpace: 'nowrap' };
  const td = { padding: '8px 12px', borderBottom: '1px solid #dfe2e7', fontSize: 12.5 };
  const rnum = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
  const inp = { padding: '5px 8px', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12 };

  return (
    <div style={{ margin: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: C.dark }}>Tax Reconciliation</div>
          <div style={{ fontSize: 12, color: C.dim }}>{branch === 'ALL' ? 'All Branches' : (branch?.name || branch?.code || branch)} · books vs filed return figures</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ ...inp, fontWeight: 700 }}>
            {modes.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} style={inp} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ ...card, padding: '10px 14px', minWidth: 150 }}><div style={{ fontSize: 11, color: C.dim, fontWeight: 700 }}>HEADS</div><div style={{ fontSize: 18, fontWeight: 800 }}>{data.totals?.heads || 0}</div></div>
        <div style={{ ...card, padding: '10px 14px', minWidth: 150 }}><div style={{ fontSize: 11, color: C.green, fontWeight: 700 }}>MATCHED</div><div style={{ fontSize: 18, fontWeight: 800, color: C.green }}>{data.totals?.matched || 0}</div></div>
        <div style={{ ...card, padding: '10px 14px', minWidth: 150 }}><div style={{ fontSize: 11, color: C.red, fontWeight: 700 }}>MISMATCHED</div><div style={{ fontSize: 18, fontWeight: 800, color: C.red }}>{data.totals?.mismatched || 0}</div></div>
        <div style={{ ...card, padding: '10px 14px', minWidth: 170 }}><div style={{ fontSize: 11, color: C.gold, fontWeight: 700 }}>TOTAL DIFFERENCE</div><div style={{ fontSize: 18, fontWeight: 800, color: C.gold }}>{money(cur, data.totals?.totalDifference)}</div></div>
      </div>

      <div style={{ ...card, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>
            <th style={th}>Head</th>
            <th style={{ ...th, ...rnum }}>{data.leftLabel}</th>
            <th style={{ ...th, ...rnum }}>{data.rightLabel}</th>
            <th style={{ ...th, ...rnum }}>Difference</th>
            <th style={{ ...th, textAlign: 'center' }}>Status</th>
          </tr></thead>
          <tbody>
            {q.isLoading && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: C.dim, padding: 20 }}>Loading…</td></tr>}
            {!q.isLoading && data.rows.length === 0 && <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: C.dim, padding: 20 }}>Pick a period and mode.</td></tr>}
            {data.rows.map((r) => (
              <tr key={r.head} style={{ background: r.matched ? '#f4fbf4' : '#fdf6f4' }}>
                <td style={{ ...td, fontWeight: 700 }}>{r.label}</td>
                <td style={{ ...td, ...rnum }}>{money(cur, r.left)}</td>
                <td style={{ ...td, ...rnum }}>
                  <input value={valFor(r)} onChange={(e) => setEdits((s) => ({ ...s, [r.head]: e.target.value }))}
                    onBlur={() => saveFigure(r)} type="number" placeholder="enter filed"
                    style={{ ...inp, width: 130, textAlign: 'right' }} />
                </td>
                <td style={{ ...td, ...rnum, fontWeight: 700, color: r.matched ? C.dim : C.red }}>{money(cur, Math.abs(r.difference))}</td>
                <td style={{ ...td, textAlign: 'center' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 10, color: '#fff', background: r.matched ? C.green : C.red }}>{r.matched ? 'matched' : 'mismatch'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11, color: C.dim, marginTop: 8 }}>
        The <b>{data.leftLabel}</b> column is computed live from your ledgers. Enter the <b>{data.rightLabel}</b> figure for each head (saved on blur). Any non-zero difference is a reconciling item to investigate before filing.
      </div>
    </div>
  );
}
