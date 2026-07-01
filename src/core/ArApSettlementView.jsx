import React, { useState } from 'react';

/* ─────────────────── AR / AP — Ageing & Settlement (tabbed) ───────────────────
 * One reusable view, rendered twice on the AD (Owner) Dashboard (Receivable card +
 * Payable card) and again as the tabbed panel inside the Accounts Receivable /
 * Payable ageing reports. Settlement as six metric tabs and, below, a per-ledger
 * settlement grid:
 *
 *   Ledger | Unsettled Bills | 0<7 · 8<15 · 16<30 · 31<45 · 46<60 · 61+ | Unsettled Receipt | Final
 *
 * Per ledger: Unsettled Bills = Σ its ageing buckets ; Final = Unsettled Bills −
 * Unsettled Receipt (on-account). The footer Final Total reconciles THREE columns to
 * the tabs above — Unsettled Bills → Unsettled Bills tab, Unsettled Receipt → its tab,
 * Final → Final tab — with a silent guard that warns only if the books ever drift.
 *
 * Metric tabs:
 *   Total Bills             = billed (gross invoiced)
 *   Settled Bills           = billed − open            (bills knocked off)
 *   Settled Receipt/Payment = settled − on-account     (receipts applied to bills)
 *   Unsettled Bills         = total (open bills)
 *   Unsettled Receipt/Pay.  = on-account               (unapplied advances)
 *   Final Receivable/Pay.   = net = open − on-account                              */

// Fine ageing buckets, in display order. Keys match the backend ageing() emit.
export const FINE_BUCKETS = [
  ['a7', '0<7'], ['a15', '8<15'], ['a30', '16<30'], ['a45', '31<45'], ['a60', '46<60'], ['a61', '61+'],
];
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Pure — derive the six settlement metrics + the per-ledger settlement grid from an
// ageing() side payload ({ totals, rows }). Import-free so it is unit-testable.
// `side` = 'receivable' | 'payable' (…s / plural tolerated).
export function buildSettlement(side, totals = {}, rows = [], { maxRows } = {}) {
  const isRec = /^rec/i.test(side || '');
  const billed = r2(totals.billed);
  const settled = r2(totals.settled);
  const open = r2(totals.total);                 // Unsettled Bills
  const onAccount = r2(totals.onAccount);        // Unsettled Receipt / Payment (on-account)
  const net = totals.net != null ? r2(totals.net) : r2(open - onAccount); // Final

  const metrics = [
    { key: 'totalBills',     label: 'Total Bills',                                    value: billed,                  tone: '' },
    { key: 'settledBills',   label: 'Settled Bills',                                  value: r2(billed - open),       tone: 'green' },
    { key: 'settledRcpt',    label: isRec ? 'Settled Receipt' : 'Settled Payment',    value: r2(settled - onAccount), tone: 'green' },
    { key: 'unsettledBills', label: 'Unsettled Bills',                                value: open,                    tone: 'red' },
    { key: 'unsettledRcpt',  label: isRec ? 'Unsettled Receipt' : 'Unsettled Payment', value: onAccount,              tone: 'amber' },
    { key: 'final',          label: isRec ? 'Final Receivables' : 'Final Payables',   value: net,                     tone: '' },
  ];

  // Per-ledger settlement rows — keep any ledger that has open bills OR money sitting
  // on account (mirrors the backend row-keep rule), so the three footer columns
  // reconcile to their tabs. Unsettled = Σ buckets; receipt = on-account; final = net.
  const keptRows = (rows || [])
    .filter((r) => r2(r.total) > 0.01 || r2(r.onAccount) > 0.01)
    .map((r) => {
      const unsettled = r2(r.total);
      const receipt = r2(r.onAccount);
      return {
        party: r.party || '—',
        a7: r2(r.a7), a15: r2(r.a15), a30: r2(r.a30), a45: r2(r.a45), a60: r2(r.a60), a61: r2(r.a61),
        unsettled, receipt, final: r.net != null ? r2(r.net) : r2(unsettled - receipt),
      };
    })
    .sort((a, b) => b.unsettled - a.unsettled);

  // Optionally cap the visible ledgers (dashboard) — the remainder rolls into an
  // "Others (N ledgers)" line so every footer column still reconciles.
  let ageRows = keptRows;
  if (maxRows && keptRows.length > maxRows) {
    const head = keptRows.slice(0, maxRows);
    const rest = keptRows.slice(maxRows);
    const others = rest.reduce((o, r) => {
      FINE_BUCKETS.forEach(([k]) => { o[k] = r2(o[k] + r[k]); });
      o.unsettled = r2(o.unsettled + r.unsettled); o.receipt = r2(o.receipt + r.receipt); o.final = r2(o.final + r.final);
      return o;
    }, { party: `Others (${rest.length} ledgers)`, a7: 0, a15: 0, a30: 0, a45: 0, a60: 0, a61: 0, unsettled: 0, receipt: 0, final: 0 });
    ageRows = [...head, others];
  }

  const footer = FINE_BUCKETS.reduce((f, [k]) => { f[k] = r2(ageRows.reduce((s, r) => s + r[k], 0)); return f; }, {});
  footer.unsettled = r2(ageRows.reduce((s, r) => s + r.unsettled, 0));
  footer.receipt = r2(ageRows.reduce((s, r) => s + r.receipt, 0));
  footer.final = r2(ageRows.reduce((s, r) => s + r.final, 0));

  const reconciled = Math.abs(footer.unsettled - open) <= 0.5
    && Math.abs(footer.receipt - onAccount) <= 0.5
    && Math.abs(footer.final - net) <= 0.5;
  return { isRec, metrics, ageRows, footer, open, onAccount, net, reconciled };
}

/* ─────────────────────────────── presentation ─────────────────────────────── */
const C = { ink: '#14161a', muted: '#5b616e', line: '#cdd1d8', divider: '#dfe2e7', strong: '#bcc1cb', brand: '#2563eb', brandSoft: '#eef3ff', ageTint: '#f6f8fc', red: '#c0392b', amber: '#b45309', green: '#1a7f4b' };
const toneColor = { green: C.green, amber: C.amber, red: C.red, '': C.ink };
const num = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

export function ArApSettlementView({ side, totals = {}, rows = [], formatMoney = (n) => n, maxRows }) {
  const model = buildSettlement(side, totals, rows, { maxRows });
  // Tabs are KPI tiles; the grid below always breaks down Unsettled Bills. Selecting a
  // tile just highlights it (the footer already reconciles the key columns to the tabs).
  const [active, setActive] = useState('unsettledBills');
  const fm = (n) => formatMoney(n);
  const unsettledLbl = model.isRec ? 'Unsettled Receivables' : 'Unsettled Payables';
  const receiptLbl = model.isRec ? 'Unsettled Receipt' : 'Unsettled Payment';
  const finalLbl = model.isRec ? 'Final Receivables' : 'Final Payables';

  return (
    <div>
      {/* metric tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {model.metrics.map((m) => {
          const on = active === m.key;
          return (
            <button key={m.key} type="button" onClick={() => setActive(m.key)} aria-pressed={on}
              style={{ flex: '1 1 140px', minWidth: 132, textAlign: 'left', cursor: 'pointer',
                border: `1px solid ${on ? C.brand : C.line}`, borderRadius: 10, padding: '9px 12px',
                background: on ? C.brandSoft : '#fff', boxShadow: on ? `inset 0 0 0 1px ${C.brand}` : 'none' }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.03em', textTransform: 'uppercase', color: on ? C.brand : C.muted }}>{m.label}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 4, color: toneColor[m.tone] }}>{fm(m.value)}</div>
            </button>
          );
        })}
      </div>

      {/* per-ledger settlement grid */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.03em', textTransform: 'uppercase', color: '#374151', margin: '4px 0 8px' }}>
        Ageing Summary — Unsettled Bills
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, minWidth: 900 }}>
          <thead>
            <tr>
              <th scope="col" rowSpan={2} style={{ ...thc, textAlign: 'left' }}>{model.isRec ? 'Debtor Ledger' : 'Creditor Ledger'}</th>
              <th scope="col" rowSpan={2} style={thc}>{unsettledLbl}</th>
              <th scope="col" colSpan={FINE_BUCKETS.length} style={{ ...thc, textAlign: 'center', background: C.ageTint, color: C.brand, borderBottom: '1px solid #cfe0ff' }}>Ageing of Unsettled Bills (days)</th>
              <th scope="col" rowSpan={2} style={thc}>{receiptLbl}</th>
              <th scope="col" rowSpan={2} style={thc}>{finalLbl}</th>
            </tr>
            <tr>
              {FINE_BUCKETS.map(([k, lbl]) => <th key={k} scope="col" style={{ ...thc, background: C.ageTint }}>{lbl}</th>)}
            </tr>
          </thead>
          <tbody>
            {model.ageRows.map((r, i) => (
              <tr key={r.party + i} style={{ borderBottom: `1px solid ${C.divider}` }}>
                <td style={{ ...tdc, textAlign: 'left', fontWeight: 600 }}>{r.party}</td>
                <td style={{ ...tdc, fontWeight: 700 }}>{fm(r.unsettled)}</td>
                {FINE_BUCKETS.map(([k]) => <td key={k} style={{ ...tdc, background: C.ageTint, color: k === 'a61' && r[k] ? C.red : C.ink, fontWeight: k === 'a61' && r[k] ? 600 : 400 }}>{fm(r[k])}</td>)}
                <td style={tdc}>{fm(r.receipt)}</td>
                <td style={{ ...tdc, fontWeight: 700, color: r.final < 0 ? C.red : C.ink }}>{fm(r.final)}</td>
              </tr>
            ))}
            {!model.ageRows.length && (
              <tr><td colSpan={FINE_BUCKETS.length + 4} style={{ ...tdc, textAlign: 'center', color: C.muted, padding: 16 }}>No unsettled bills.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{ background: '#f7f8fa', borderTop: `2px solid ${C.strong}`, fontWeight: 800 }}>
              <td style={{ ...tdc, textAlign: 'left' }}>Final Total</td>
              <td style={tdc}>{fm(model.footer.unsettled)}</td>
              {FINE_BUCKETS.map(([k]) => <td key={k} style={{ ...tdc, background: '#eef3fb', color: k === 'a61' && model.footer[k] ? C.red : C.ink }}>{fm(model.footer[k])}</td>)}
              <td style={tdc}>{fm(model.footer.receipt)}</td>
              <td style={{ ...tdc, color: model.footer.final < 0 ? C.red : C.ink }}>{fm(model.footer.final)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Silent reconciliation guard — visible ONLY if a footer column stops tying to its tab. */}
      {!model.reconciled && (
        <div style={{ fontSize: 11.5, color: C.red, marginTop: 8 }}>
          ✕ Ledger totals don't tie to the tabs — Unsettled {fm(model.footer.unsettled)}/{fm(model.open)} ·
          On-Account {fm(model.footer.receipt)}/{fm(model.onAccount)} · Final {fm(model.footer.final)}/{fm(model.net)}. Check settlement data.
        </div>
      )}
    </div>
  );
}

const thc = { padding: '8px 10px', textAlign: 'right', fontSize: 10.5, fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '.02em', borderBottom: `1px solid ${C.strong}`, whiteSpace: 'nowrap', background: '#f7f8fa' };
const tdc = { padding: '7px 10px', ...num };
