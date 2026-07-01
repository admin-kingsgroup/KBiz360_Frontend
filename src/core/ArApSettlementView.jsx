import React, { useState } from 'react';

/* ─────────────────── AR / AP — Ageing & Settlement (tabbed) ───────────────────
 * One reusable view, rendered twice on the AD (Owner) Dashboard (Receivable card +
 * Payable card) and again as the tabbed panel inside the Accounts Receivable /
 * Payable ageing reports. Settlement as six metric tabs and, below, the per-ledger
 * ageing of Unsettled Bills GROUPED BY LEDGER SUB-GROUP (B2B · B2E · B2C Reference ·
 * Inter Branch · Supplier B2B · Supplier Interbranch · Foreign Suppliers · …), each
 * group with a Subtotal and everything folding into a grand Final Total.
 *
 * Per ledger: Unsettled Bills = Σ its ageing buckets ; Final = Unsettled Bills −
 * Unsettled Receipt (on-account). The footer Final Total reconciles THREE columns to
 * the tabs above — Unsettled Bills, Unsettled Receipt/Payment, Final — with a silent
 * guard that warns only if the books ever drift.
 *
 * Metric tabs:
 *   Total Bills             = billed        · Settled Bills   = billed − open
 *   Settled Receipt/Payment = settled − on-account            · Unsettled Bills = open
 *   Unsettled Receipt/Pay.  = on-account    · Final Rec/Pay.  = net = open − on-account */

// Fine ageing buckets, in display order. Keys match the backend ageing() emit.
export const FINE_BUCKETS = [
  ['a7', '0<7'], ['a15', '8<15'], ['a30', '16<30'], ['a45', '31<45'], ['a60', '46<60'], ['a61', '61+'],
];
const r2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const OTHERS = 'Direct / Others';
// A ledger sitting directly under the primary head (or with no master) has no custom
// sub-group — fold it into "Direct / Others" so nothing is lost and totals still tie.
const PRIMARY = new Set(['', 'sundry debtors', 'sundry creditors', 'sundry debtor', 'sundry creditor']);
const groupLabel = (sg) => { const s = String(sg || '').trim(); return PRIMARY.has(s.toLowerCase()) ? OTHERS : s; };
const blankSub = () => ({ a7: 0, a15: 0, a30: 0, a45: 0, a60: 0, a61: 0, unsettled: 0, receipt: 0, final: 0 });
const addInto = (s, r) => { FINE_BUCKETS.forEach(([k]) => { s[k] = r2(s[k] + r[k]); }); s.unsettled = r2(s.unsettled + r.unsettled); s.receipt = r2(s.receipt + r.receipt); s.final = r2(s.final + r.final); return s; };

// Pure — derive the six settlement metrics + the sub-group-grouped ageing of Unsettled
// Bills from an ageing() side payload ({ totals, rows }). Import-free / unit-testable.
// `side` = 'receivable' | 'payable' (…s / plural tolerated).
export function buildSettlement(side, totals = {}, rows = []) {
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

  // Per-ledger rows — keep any ledger with open bills OR money on account (mirrors the
  // backend row-keep rule), so the three footer columns reconcile to their tabs.
  const keptRows = (rows || [])
    .filter((r) => r2(r.total) > 0.01 || r2(r.onAccount) > 0.01)
    .map((r) => {
      const unsettled = r2(r.total);
      const receipt = r2(r.onAccount);
      return {
        party: r.party || '—', subGroup: r.subGroup || '',
        a7: r2(r.a7), a15: r2(r.a15), a30: r2(r.a30), a45: r2(r.a45), a60: r2(r.a60), a61: r2(r.a61),
        unsettled, receipt, final: r.net != null ? r2(r.net) : r2(unsettled - receipt),
      };
    });

  // Bucket ledgers by sub-group; each group carries its ledgers (sorted by open) + a subtotal.
  const byGroup = new Map();
  keptRows.forEach((r) => { const g = groupLabel(r.subGroup); if (!byGroup.has(g)) byGroup.set(g, []); byGroup.get(g).push(r); });
  const groups = [...byGroup.entries()].map(([group, ledgers]) => {
    ledgers.sort((a, b) => b.unsettled - a.unsettled);
    const subtotal = ledgers.reduce((s, r) => addInto(s, r), blankSub());
    return { group, ledgers, subtotal, count: ledgers.length };
  });
  // Biggest exposure first; "Direct / Others" always sinks to the bottom.
  groups.sort((a, b) => (a.group === OTHERS ? 1 : 0) - (b.group === OTHERS ? 1 : 0) || b.subtotal.unsettled - a.subtotal.unsettled);

  const footer = groups.reduce((f, g) => addInto(f, g.subtotal), blankSub());
  // Scale-aware tolerance: at least ₹1, growing with the total so accumulated per-ledger
  // rounding (paise on hundreds of ledgers) never trips a false "gap" at crore scale,
  // while still catching a genuine missing bill (orders of magnitude larger).
  const within = (a, b) => Math.abs(a - b) <= Math.max(1, Math.abs(b) * 0.00001);
  const reconciled = within(footer.unsettled, open) && within(footer.receipt, onAccount) && within(footer.final, net);
  return { isRec, metrics, groups, footer, open, onAccount, net, reconciled };
}

/* ─────────────────────────────── presentation ─────────────────────────────── */
const C = { ink: '#14161a', muted: '#5b616e', line: '#cdd1d8', divider: '#dfe2e7', strong: '#bcc1cb', brand: '#2563eb', brandSoft: '#eef3ff', ageTint: '#f6f8fc', red: '#c0392b', amber: '#b45309', green: '#1a7f4b', subBg: '#0f2444', subFg: '#ffffff', subNeg: '#ff8a80' };
const toneColor = { green: C.green, amber: C.amber, red: C.red, '': C.ink };
const num = { textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

export function ArApSettlementView({ side, totals = {}, rows = [], formatMoney = (n) => n, collapsed = false }) {
  const model = buildSettlement(side, totals, rows);
  const [active, setActive] = useState('unsettledBills');
  // Group expansion: default follows `collapsed` (dashboard collapses to subtotals);
  // an explicit toggle overrides it, and late-arriving groups follow the default.
  const [ov, setOv] = useState({});
  const isOpen = (g) => (g in ov ? ov[g] : !collapsed);
  const toggle = (g) => setOv((p) => ({ ...p, [g]: !(g in p ? p[g] : !collapsed) }));
  const fm = (n) => formatMoney(n);
  const unsettledLbl = model.isRec ? 'Unsettled Receivables' : 'Unsettled Payables';
  const receiptLbl = model.isRec ? 'Unsettled Receipt' : 'Unsettled Payment';
  const finalLbl = model.isRec ? 'Final Receivables' : 'Final Payables';
  const COLS = FINE_BUCKETS.length + 4;

  const cell = (v, extra) => <td style={{ ...tdc, ...extra }}>{fm(v)}</td>;

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

      {/* per-ledger settlement grid, grouped by sub-group */}
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.03em', textTransform: 'uppercase', color: '#374151', margin: '4px 0 8px' }}>
        Ageing Summary — Unsettled Bills · by Sub-Group
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
            <tr>{FINE_BUCKETS.map(([k, lbl]) => <th key={k} scope="col" style={{ ...thc, background: C.ageTint }}>{lbl}</th>)}</tr>
          </thead>
          <tbody>
            {model.groups.map((g) => {
              const open = isOpen(g.group);
              const st = g.subtotal;
              return (
                <React.Fragment key={g.group}>
                  {/* navy subtotal / group-anchor row (click or Enter/Space to expand ledgers) */}
                  <tr role="button" tabIndex={0} aria-expanded={open}
                    onClick={() => toggle(g.group)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(g.group); } }}
                    style={{ background: C.subBg, color: C.subFg, cursor: 'pointer', fontWeight: 700 }}>
                    <td style={{ ...tdc, textAlign: 'left' }}>
                      <span style={{ display: 'inline-block', width: 12, color: '#9fb2d6', transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform .12s' }}>▾</span>
                      {g.group} Subtotal <span style={{ color: '#9fb2d6', fontWeight: 600, fontSize: 11, marginLeft: 6 }}>{g.count} ledger{g.count > 1 ? 's' : ''}</span>
                    </td>
                    <td style={tdSub}>{fm(st.unsettled)}</td>
                    {FINE_BUCKETS.map(([k]) => <td key={k} style={tdSub}>{fm(st[k])}</td>)}
                    <td style={tdSub}>{fm(st.receipt)}</td>
                    <td style={{ ...tdSub, color: st.final < 0 ? C.subNeg : C.subFg }}>{fm(st.final)}</td>
                  </tr>
                  {/* ledger detail rows */}
                  {open && g.ledgers.map((r, i) => (
                    <tr key={`${g.group}|${r.party}|${i}`} style={{ borderBottom: `1px solid ${C.divider}` }}>
                      <td style={{ ...tdc, textAlign: 'left', fontWeight: 600, paddingLeft: 26 }}>{r.party}</td>
                      <td style={{ ...tdc, fontWeight: 700 }}>{fm(r.unsettled)}</td>
                      {FINE_BUCKETS.map(([k]) => <td key={k} style={{ ...tdc, background: C.ageTint, color: k === 'a61' && r[k] ? C.red : C.ink, fontWeight: k === 'a61' && r[k] ? 600 : 400 }}>{fm(r[k])}</td>)}
                      <td style={tdc}>{fm(r.receipt)}</td>
                      <td style={{ ...tdc, fontWeight: 700, color: r.final < 0 ? C.red : C.ink }}>{fm(r.final)}</td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
            {!model.groups.length && (
              <tr><td colSpan={COLS} style={{ ...tdc, textAlign: 'center', color: C.muted, padding: 16 }}>No unsettled bills.</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr style={{ background: '#eef3fb', borderTop: `2px solid ${C.brand}`, fontWeight: 800 }}>
              <td style={{ ...tdc, textAlign: 'left' }}>Final Total (all groups)</td>
              {cell(model.footer.unsettled)}
              {FINE_BUCKETS.map(([k]) => <td key={k} style={{ ...tdc, color: k === 'a61' && model.footer[k] ? C.red : C.ink }}>{fm(model.footer[k])}</td>)}
              {cell(model.footer.receipt)}
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
const tdSub = { padding: '8px 10px', ...num, color: C.subFg };
