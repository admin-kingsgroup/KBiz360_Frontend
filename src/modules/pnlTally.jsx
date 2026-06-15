// ─── Profit & Loss — Tally view (drill chain) ─────────────────────────────────
// Mirrors TallyPrime's P&L exactly: a horizontal Trading account (Dr | Cr →
// Gross Profit), then the P&L account (Dr | Cr → Nett Profit/Loss), then the full
// drill: P&L → Group Summary → Group Summary → Ledger Vouchers → Voucher.
//   View 1  /api/accounting/pl-tally          (group → sub-group → ledger tree)
//   View 2-3 client-side from that tree        (Group Summary, Closing Dr|Cr)
//   View 4  /api/accounting/ledger/:name       (Ledger Vouchers)
//   View 5  /api/vouchers/:id                  (Accounting Voucher)
import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft, X } from 'lucide-react';
import { apiGet } from '../core/api';
import { openLedgerModal } from '../core/LedgerModalHost';
import { useLedgerMeta, SourceBadge } from '../core/LedgerLabel';
import { bc } from '../core/styles.jsx';
import { PeriodBar } from '../core/period';
import { LedgerActions } from '../core/ledgerActions';

const DARK = '#0d1326', DIM = '#5a6691', LINE = '#e1e3ec', HEAD = '#1c3a5e';
const money = (n) => (n == null || n === '' ? '' : Number(Math.round((+n || 0) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const brCodeOf = (b) => (b === 'ALL' ? 'ALL' : (b?.code || 'BOM'));
// Open by default (inception → today): the books may have no postings in the
// current FY yet, so an FY-bound default would render an empty statement. The
// PeriodBar (defaultPreset="all") refines `from` to the real inception on mount.
const openDefault = () => ({ from: '2000-01-01', to: new Date().toISOString().slice(0, 10) });
const dmy = (s) => { const d = new Date(s); return Number.isNaN(d.getTime()) ? s : `${d.getDate()}-${d.toLocaleString('en', { month: 'short' })}-${String(d.getFullYear()).slice(-2)}`; };

const th = { padding: '7px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: '#cfd8e8', whiteSpace: 'nowrap' };
const tdName = { padding: '5px 12px', fontSize: 12, color: DARK };
const tdNum = { padding: '5px 12px', fontSize: 12, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };

/* ── One column of a section (Debit OR Credit) with inner (item) + outer (group) amounts ── */
export function PLSide({ lines, total, periodLabel, onPick, title = 'Particulars', branch, from, to }) {
  return (
    <div style={{ flex: 1, minWidth: 360 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: HEAD }}>
          <th style={{ ...th, width: '52%' }}>{title}</th>
          <th style={{ ...th, textAlign: 'right' }}></th>
          <th style={{ ...th, textAlign: 'right' }}>{periodLabel}</th>
        </tr></thead>
        <tbody>
          {(lines || []).map((l, i) => <PLLines key={i} line={l} onPick={onPick} branch={branch} from={from} to={to} />)}
        </tbody>
        <tfoot><tr style={{ borderTop: '2px solid ' + DARK, background: '#f3f4f8' }}>
          <td style={{ ...tdName, fontWeight: 800 }}>Total</td>
          <td />
          <td style={{ ...tdNum, fontWeight: 800, color: DARK }}>{money(total)}</td>
        </tr></tfoot>
      </table>
    </div>
  );
}

/* Captured fare/charge components for ONE ledger, rendered inline (indented) in
   the 3-column P&L layout. On-demand fetch of the same /ledger-components feed the
   drill uses, so an expanded ledger shows Base Fare / K3 / Taxes … without leaving
   the page. Falls back to a note when a ledger carries no component meta. */
function LedgerComponentsInline({ name, branch, from, to }) {
  const { data, isLoading } = useQuery({
    queryKey: ['ledger-components', name, brCodeOf(branch), from, to],
    queryFn: () => apiGet('/api/accounting/ledger-components/' + encodeURIComponent(name), { branch: brCodeOf(branch) === 'ALL' ? '' : brCodeOf(branch), from, to }),
  });
  const note = (txt) => (<tr><td colSpan={3} style={{ ...tdName, paddingLeft: 54, color: DIM, fontSize: 11, fontStyle: 'italic' }}>{txt}</td></tr>);
  if (isLoading) return note('Loading components…');
  const rows = (data && data.rows) || [];
  if (!rows.length) return note('No captured fare components.');
  return (
    <>
      {rows.map((r, i) => (
        <tr key={i} style={{ background: '#fafbff' }}>
          <td style={{ ...tdName, paddingLeft: 54, color: DIM, fontSize: 11.5, fontStyle: 'italic' }}>{r.label}</td>
          <td style={{ ...tdNum, color: DIM, fontSize: 11.5 }}>{money(r.amount)}</td>
          <td />
        </tr>
      ))}
    </>
  );
}

/* A group header row (outer total + bold, clickable) followed by its indented items.
   A caret on the group reveals its ledgers INLINE (default collapsed, so the Tally
   look is unchanged until you ask for it); each ledger in turn expands to the fare
   components captured on the entry. Clicking a name still drills the stack. */
function PLLines({ line, onPick, branch, from, to }) {
  const [openLedgers, setOpenLedgers] = useState(false);
  const [openComp, setOpenComp] = useState({});
  const metaOf = useLedgerMeta();
  const badge = (nm) => { const m = metaOf(nm); return m ? <>{m.locked && <span title="Locked — super-admin only" style={{ marginLeft: 4 }}>🔒</span>}<SourceBadge source={m.source} compact /></> : null; };
  const drillable = line.isGroup || line.ledger || (!line.isGroup && !!line.name);
  if (line.isCarry || line.isResult) {
    return (
      <tr><td style={{ ...tdName, fontStyle: 'italic', fontWeight: 700, color: line.isResult ? '#9B2C2C' : DARK }}>{line.name}</td>
        <td /><td style={{ ...tdNum, fontWeight: 700, fontStyle: 'italic' }}>{money(line.amount)}</td></tr>
    );
  }
  const items = line.items || [];
  const subGroups = items.filter((it) => it.isGroup);
  const ledgers = items.filter((it) => !it.isGroup && (it.ledger || it.name));
  const canExpand = line.isGroup && ledgers.length > 0;
  return (
    <>
      <tr onClick={() => drillable && onPick(line)} style={{ cursor: drillable ? 'pointer' : 'default', background: line.isGroup ? '#fcfdff' : '#fff' }}
        onMouseEnter={(e) => drillable && (e.currentTarget.style.background = '#eef4ff')}
        onMouseLeave={(e) => (e.currentTarget.style.background = line.isGroup ? '#fcfdff' : '#fff')}>
        <td style={{ ...tdName, fontWeight: line.isGroup ? 700 : 400, color: line.isGroup ? DARK : '#1f3a8a', paddingLeft: line.isGroup ? 12 : 26 }}>
          {canExpand && (
            <span onClick={(e) => { e.stopPropagation(); setOpenLedgers((o) => !o); }}
              style={{ cursor: 'pointer', color: '#9aa6c4', fontWeight: 700, marginRight: 5, display: 'inline-block', width: 10 }}
              title={openLedgers ? 'Hide ledgers' : 'Show ledgers → captured fares'}>{openLedgers ? '▾' : '▸'}</span>
          )}
          {line.name}{line.isGroup && <ChevronRight size={11} style={{ verticalAlign: 'middle', marginLeft: 4, color: '#9aa6c4' }} />}
        </td>
        <td style={tdNum}>{line.isGroup ? '' : money(line.amount)}</td>
        <td style={{ ...tdNum, fontWeight: 700 }}>{line.isGroup ? money(line.amount) : ''}</td>
      </tr>
      {/* Sub-group breakup stays inline (drills on click), exactly as Tally does. */}
      {line.isGroup && subGroups.map((it, j) => (
        <tr key={'g' + j} onClick={() => onPick(it)} style={{ cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#eef4ff')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
          <td style={{ ...tdName, paddingLeft: 30, color: DARK, fontWeight: 600 }}>
            {it.name}<ChevronRight size={10} style={{ verticalAlign: 'middle', marginLeft: 3, color: '#b6c0da' }} />
          </td>
          <td style={tdNum}>{money(it.amount)}</td>
          <td />
        </tr>
      ))}
      {/* NEW: ledger leaves inline (caret-revealed) → each expands to its fare components. */}
      {openLedgers && ledgers.map((it, j) => {
        const led = it.ledger || it.name;
        const co = !!openComp[led];
        return (
          <React.Fragment key={'l' + j}>
            <tr style={{ background: '#fff' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#eef4ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}>
              <td style={{ ...tdName, paddingLeft: 38, color: '#1f3a8a' }}>
                <span onClick={(e) => { e.stopPropagation(); setOpenComp((s) => ({ ...s, [led]: !s[led] })); }}
                  style={{ cursor: 'pointer', color: '#9aa6c4', fontWeight: 700, marginRight: 5, display: 'inline-block', width: 10 }}
                  title={co ? 'Hide components' : 'Show captured fares'}>{co ? '▾' : '▸'}</span>
                <span onClick={() => openLedgerModal(led)} style={{ cursor: 'pointer' }} title="Open ledger account">{it.name}</span>
                {badge(it.name)}
              </td>
              <td style={tdNum}>{money(it.amount)}</td>
              <td />
            </tr>
            {co && <LedgerComponentsInline name={led} branch={branch} from={from} to={to} />}
          </React.Fragment>
        );
      })}
    </>
  );
}

/* ── View 2/3: Group Summary (a node's children, Closing Dr | Cr) ── */
export function GroupSummary({ frame, onPick }) {
  const items = frame.items || [];
  const metaOf = useLedgerMeta();
  const grand = items.reduce((s, i) => s + (i.side === 'Cr' ? i.amount : -i.amount), 0);
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr style={{ background: HEAD }}>
        <th style={th}>Particulars</th>
        <th style={{ ...th, textAlign: 'right', width: 160 }}>Debit</th>
        <th style={{ ...th, textAlign: 'right', width: 160 }}>Credit</th>
      </tr></thead>
      <tbody>
        {items.map((it, i) => {
          const drillable = it.isGroup || it.ledger || !!it.name;
          return (
            <tr key={i} onClick={() => drillable && onPick(it)} style={{ cursor: drillable ? 'pointer' : 'default', borderBottom: '1px solid #f0f2f7' }}
              onMouseEnter={(e) => drillable && (e.currentTarget.style.background = '#eef4ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              <td style={{ ...tdName, fontWeight: it.isGroup ? 700 : 400, color: it.isGroup ? DARK : '#1f3a8a' }}>
                {it.name}{it.isGroup && <ChevronRight size={11} style={{ verticalAlign: 'middle', marginLeft: 4, color: '#9aa6c4' }} />}
                {!it.isGroup && (() => { const m = metaOf(it.name); return m ? <>{m.locked && <span title="Locked — super-admin only" style={{ marginLeft: 4 }}>🔒</span>}<SourceBadge source={m.source} compact /></> : null; })()}
              </td>
              <td style={tdNum}>{it.side === 'Dr' ? money(it.amount) : ''}</td>
              <td style={tdNum}>{it.side === 'Cr' ? money(it.amount) : ''}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot><tr style={{ borderTop: '2px solid ' + DARK, background: '#f3f4f8' }}>
        <td style={{ ...tdName, fontWeight: 800 }}>Grand Total</td>
        <td style={{ ...tdNum, fontWeight: 800 }}>{grand < 0 ? money(-grand) : ''}</td>
        <td style={{ ...tdNum, fontWeight: 800 }}>{grand >= 0 ? money(grand) : ''}</td>
      </tr></tfoot>
    </table>
  );
}

/* ── Fare/charge component breakdown (DT-Base Fare, DT-Taxes …) — the Tally
   sub-ledger level. Falls back to the vouchers when a ledger has no breakup. ── */
function LedgerComponents({ name, costCenter, branch, from, to, onPick }) {
  const { data, isLoading } = useQuery({
    queryKey: ['ledger-components', name, costCenter || '', brCodeOf(branch), from, to],
    queryFn: () => apiGet('/api/accounting/ledger-components/' + encodeURIComponent(name), { branch: brCodeOf(branch) === 'ALL' ? '' : brCodeOf(branch), from, to, ...(costCenter ? { costCenter } : {}) }),
  });
  if (isLoading) return <div style={{ padding: 20, color: DIM, fontSize: 12 }}>Loading…</div>;
  const rows = (data && data.rows) || [];
  if (!rows.length) return <LedgerVouchers name={name} costCenter={costCenter} branch={branch} from={from} to={to} onPick={onPick} />;
  const grand = rows.reduce((s, r) => s + (r.side === 'Cr' ? r.amount : -r.amount), 0);
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr style={{ background: HEAD }}>
        <th style={th}>Particulars</th>
        <th style={{ ...th, textAlign: 'right', width: 160 }}>Debit</th>
        <th style={{ ...th, textAlign: 'right', width: 160 }}>Credit</th>
      </tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} onClick={() => onPick({ kind: 'vouchers', name, costCenter, title: r.label })}
            style={{ cursor: 'pointer', borderBottom: '1px solid #f0f2f7' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#eef4ff')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
            <td style={{ ...tdName, fontWeight: 600, color: '#1f3a8a' }}>{r.label}<ChevronRight size={11} style={{ verticalAlign: 'middle', marginLeft: 4, color: '#9aa6c4' }} /></td>
            <td style={tdNum}>{r.side === 'Dr' ? money(r.amount) : ''}</td>
            <td style={tdNum}>{r.side === 'Cr' ? money(r.amount) : ''}</td>
          </tr>
        ))}
      </tbody>
      <tfoot><tr style={{ borderTop: '2px solid ' + DARK, background: '#f3f4f8' }}>
        <td style={{ ...tdName, fontWeight: 800 }}>Grand Total</td>
        <td style={{ ...tdNum, fontWeight: 800 }}>{grand < 0 ? money(-grand) : ''}</td>
        <td style={{ ...tdNum, fontWeight: 800 }}>{grand >= 0 ? money(grand) : ''}</td>
      </tr></tfoot>
    </table>
  );
}

/* ── Domestic / International (cost-centre) split — Tally sub-level for Flights &
   Holidays. Drills straight to the component breakdown when there is no split. ── */
function LedgerDrill({ name, branch, from, to, onPick }) {
  const { data, isLoading } = useQuery({
    queryKey: ['ledger-split', name, brCodeOf(branch), from, to],
    queryFn: () => apiGet('/api/accounting/ledger-split/' + encodeURIComponent(name), { branch: brCodeOf(branch) === 'ALL' ? '' : brCodeOf(branch), from, to }),
  });
  if (isLoading) return <div style={{ padding: 20, color: DIM, fontSize: 12 }}>Loading…</div>;
  const rows = data || [];
  // No Domestic/International split → go straight to the fare-component breakdown.
  if (rows.length <= 1) return <LedgerComponents name={name} branch={branch} from={from} to={to} onPick={onPick} />;
  const grand = rows.reduce((s, r) => s + (r.side === 'Cr' ? r.amount : -r.amount), 0);
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr style={{ background: HEAD }}>
        <th style={th}>Particulars</th>
        <th style={{ ...th, textAlign: 'right', width: 160 }}>Debit</th>
        <th style={{ ...th, textAlign: 'right', width: 160 }}>Credit</th>
      </tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} onClick={() => onPick({ kind: 'ledger', name, costCenter: r.costCenter, title: r.label })}
            style={{ cursor: 'pointer', borderBottom: '1px solid #f0f2f7' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#eef4ff')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
            <td style={{ ...tdName, fontWeight: 700, color: DARK }}>{r.label}<ChevronRight size={11} style={{ verticalAlign: 'middle', marginLeft: 4, color: '#9aa6c4' }} /></td>
            <td style={tdNum}>{r.side === 'Dr' ? money(r.amount) : ''}</td>
            <td style={tdNum}>{r.side === 'Cr' ? money(r.amount) : ''}</td>
          </tr>
        ))}
      </tbody>
      <tfoot><tr style={{ borderTop: '2px solid ' + DARK, background: '#f3f4f8' }}>
        <td style={{ ...tdName, fontWeight: 800 }}>Grand Total</td>
        <td style={{ ...tdNum, fontWeight: 800 }}>{grand < 0 ? money(-grand) : ''}</td>
        <td style={{ ...tdNum, fontWeight: 800 }}>{grand >= 0 ? money(grand) : ''}</td>
      </tr></tfoot>
    </table>
  );
}

/* ── View 4: Ledger Vouchers — Tally "Display → Ledger" with its own period, a
   narration toggle, a running-balance column, and (for party ledgers) a Bill-wise
   tab. Particulars shows the contra ledger(s), as Tally does. Optionally filtered
   to one cost-centre when drilled from the Domestic/International split. ── */
const lightInp = { padding: '4px 8px', borderRadius: 6, border: '1px solid ' + LINE, fontSize: 11, color: DARK, background: '#fff' };
const tabBtn = (active) => ({ padding: '4px 12px', borderRadius: 6, border: '1px solid ' + (active ? DARK : LINE), background: active ? DARK : '#fff', color: active ? '#fff' : DARK, fontSize: 11, fontWeight: 600, cursor: 'pointer' });
const addDaysStr = (s, n) => { const d = new Date(s); if (Number.isNaN(d.getTime())) return s; d.setDate(d.getDate() + (Number(n) || 0)); return d.toISOString().slice(0, 10); };
const ageColor = (n) => (n <= 7 ? '#27500A' : n <= 30 ? '#8a6d00' : '#9B2C2C');
// Tally's "Particulars" is the contra leg of the voucher (every other ledger).
const contraLabel = (ln) => {
  const ps = ln.particulars || [];
  if (!ps.length) return ln.party || '—';
  return ps.length === 1 ? ps[0].ledger : `${ps[0].ledger} (+${ps.length - 1} more)`;
};

export function LedgerVouchers({ name, branch, from, to, costCenter, onPick }) {
  const [range, setRange] = useState({ from, to });
  const [showNarration, setShowNarration] = useState(false);
  const [tab, setTab] = useState('ledger'); // 'ledger' | 'billwise'

  const { data, isLoading } = useQuery({
    queryKey: ['acc-ledger', name, brCodeOf(branch), range.from, range.to, costCenter || ''],
    queryFn: () => apiGet('/api/accounting/ledger/' + encodeURIComponent(name), { branch: brCodeOf(branch) === 'ALL' ? '' : brCodeOf(branch), from: range.from, to: range.to, ...(costCenter ? { costCenter } : {}) }),
  });
  const d = data || {};
  const grp = String(d.group || '');
  // Bill-wise only applies to party ledgers (Sundry Debtors / Creditors) and not
  // to a cost-centre-filtered drill (which has no opening / bill concept).
  const partySide = /debtor|customer/i.test(grp) ? 'customer' : /creditor|supplier|vendor/i.test(grp) ? 'supplier' : '';
  const billwiseAvailable = !!partySide && !costCenter;
  const showBillwise = billwiseAvailable && tab === 'billwise';

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', padding: '8px 12px', borderBottom: '1px solid ' + LINE, background: '#fafbfe' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: DIM }}>
          <span>From</span>
          <input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} style={lightInp} />
          <span>To</span>
          <input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} style={lightInp} />
        </div>
        {!showBillwise && (
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: DIM, cursor: 'pointer', userSelect: 'none' }}>
            <input type="checkbox" checked={showNarration} onChange={(e) => setShowNarration(e.target.checked)} /> Show narration
          </label>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {billwiseAvailable && (
            <div style={{ display: 'flex', gap: 6 }}>
              <button style={tabBtn(tab === 'ledger')} onClick={() => setTab('ledger')}>Ledger</button>
              <button style={tabBtn(tab === 'billwise')} onClick={() => setTab('billwise')}>Bill-wise</button>
            </div>
          )}
          {!showBillwise && <LedgerActions d={d} cur={bc(branch).cur} branchLabel={brCodeOf(branch)} from={range.from} to={range.to} particulars={contraLabel} />}
        </div>
      </div>

      {isLoading && <div style={{ padding: 20, color: DIM, fontSize: 12 }}>Loading ledger…</div>}

      {!isLoading && showBillwise && <LedgerBillwise name={name} branch={branch} side={partySide} />}

      {!isLoading && !showBillwise && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr style={{ background: HEAD }}>
            {['Date', 'Particulars', 'Vch Type', 'Vch No.', 'Debit', 'Credit', 'Balance'].map((h, i) => (
              <th key={i} style={{ ...th, textAlign: i >= 4 ? 'right' : 'left' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            <tr style={{ background: '#f7f8fb' }}>
              <td style={tdName} colSpan={4}><b>Opening Balance</b></td>
              <td style={tdNum}>{d.openingSide === 'Dr' ? money(d.openingBalance) : ''}</td>
              <td style={tdNum}>{d.openingSide === 'Cr' ? money(d.openingBalance) : ''}</td>
              <td style={{ ...tdNum, fontWeight: 700 }}>{money(d.openingBalance)} {d.openingSide}</td>
            </tr>
            {(d.lines || []).map((ln, i) => (
              <React.Fragment key={i}>
                <tr onClick={() => ln.voucherId && onPick({ kind: 'voucher', id: ln.voucherId, vno: ln.vno })}
                  style={{ cursor: ln.voucherId ? 'pointer' : 'default', borderBottom: showNarration ? 'none' : '1px solid #f0f2f7' }}
                  onMouseEnter={(e) => ln.voucherId && (e.currentTarget.style.background = '#eef4ff')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ ...tdName, color: DIM, whiteSpace: 'nowrap' }}>{dmy(ln.date)}</td>
                  <td style={{ ...tdName, fontWeight: 600 }}>{contraLabel(ln)}</td>
                  <td style={{ ...tdName, textTransform: 'capitalize' }}>{ln.category || ''}</td>
                  <td style={{ ...tdName, fontFamily: 'monospace', fontSize: 11 }}>{ln.vno}</td>
                  <td style={tdNum}>{ln.debit ? money(ln.debit) : ''}</td>
                  <td style={tdNum}>{ln.credit ? money(ln.credit) : ''}</td>
                  <td style={{ ...tdNum, color: DIM }}>{money(Math.abs(ln.balance))} {ln.balanceSide}</td>
                </tr>
                {showNarration && (ln.narration || ln.entryNarration) && (
                  <tr style={{ borderBottom: '1px solid #f0f2f7' }}>
                    <td />
                    <td colSpan={6} style={{ ...tdName, color: DIM, fontStyle: 'italic', fontSize: 11, paddingTop: 0 }}>{ln.narration || ln.entryNarration}</td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot><tr style={{ borderTop: '2px solid ' + DARK, background: '#f3f4f8' }}>
            <td style={{ ...tdName, fontWeight: 800 }} colSpan={4}>Current Total / Closing</td>
            <td style={{ ...tdNum, fontWeight: 800 }}>{money(d.totalDebit)}</td>
            <td style={{ ...tdNum, fontWeight: 800 }}>{money(d.totalCredit)}</td>
            <td style={{ ...tdNum, fontWeight: 800 }}>{money(d.closingBalance)} {d.closingSide}</td>
          </tr></tfoot>
        </table>
      )}
    </div>
  );
}

/* ── Bill-wise outstanding for a party ledger (Tally "Bill-wise details").
   Reuses the existing receipt/payment allocation sub-ledger via /open-bills. ── */
function LedgerBillwise({ name, branch, side }) {
  const { data, isLoading } = useQuery({
    queryKey: ['ledger-billwise', name, brCodeOf(branch), side],
    queryFn: () => apiGet('/api/vouchers/open-bills', { party: name, branch: brCodeOf(branch) === 'ALL' ? '' : brCodeOf(branch), side }),
  });
  if (isLoading) return <div style={{ padding: 20, color: DIM, fontSize: 12 }}>Loading bills…</div>;
  const bills = (data && data.bills) || [];
  const advances = (data && data.advances) || 0;
  if (!bills.length && advances <= 0.01) return <div style={{ padding: 24, textAlign: 'center', color: DIM, fontSize: 12 }}>No open bills for this ledger.</div>;
  const totalOut = bills.reduce((s, b) => s + (b.outstanding || 0), 0);
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead><tr style={{ background: HEAD }}>
        {['Date', 'Ref No.', 'Due Date', 'Bill Amount', 'Settled', 'Outstanding', 'Age'].map((h, i) => (
          <th key={i} style={{ ...th, textAlign: i >= 3 && i <= 5 ? 'right' : 'left' }}>{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {bills.map((b, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #f0f2f7' }}>
            <td style={{ ...tdName, color: DIM, whiteSpace: 'nowrap' }}>{dmy(b.date)}</td>
            <td style={{ ...tdName, fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}>{b.billVno}</td>
            <td style={{ ...tdName, color: DIM, whiteSpace: 'nowrap' }}>{b.creditDays ? dmy(addDaysStr(b.date, b.creditDays)) : '—'}</td>
            <td style={tdNum}>{money(b.total)}</td>
            <td style={{ ...tdNum, color: DIM }}>{b.allocated ? money(b.allocated) : ''}</td>
            <td style={{ ...tdNum, fontWeight: 700 }}>{money(b.outstanding)}</td>
            <td style={{ ...tdName, fontWeight: 600, color: ageColor(b.ageDays) }}>{b.ageDays}d</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr style={{ borderTop: '2px solid ' + DARK, background: '#f3f4f8' }}>
          <td style={{ ...tdName, fontWeight: 800 }} colSpan={5}>Total Outstanding</td>
          <td style={{ ...tdNum, fontWeight: 800 }}>{money(totalOut)}</td>
          <td />
        </tr>
        {advances > 0.01 && (
          <tr style={{ background: '#fff' }}>
            <td style={{ ...tdName, color: DIM, fontStyle: 'italic' }} colSpan={5}>On-Account (advance, unallocated)</td>
            <td style={{ ...tdNum, color: DIM, fontStyle: 'italic' }}>{money(advances)}</td>
            <td />
          </tr>
        )}
      </tfoot>
    </table>
  );
}

/* ── View 5: Accounting Voucher — Tally voucher layout ──────────────────────────
   The fare breakup lives on line.meta. We render each component + GST as its own
   Particulars row (DT-/IT- prefixed for Domestic/International), summing to the
   total, then the flight detail block (Pax / Ticket / Sector / Airline …). ── */
const VNUM = (v) => { const n = Number(String(v == null ? '' : v).replace(/[, ]/g, '')); return Number.isFinite(n) ? n : 0; };
const IS_NUMERIC = (v) => { const s = String(v == null ? '' : v).trim(); return s !== '' && /^-?[\d,]+(\.\d+)?$/.test(s); };
const GST_RE = /cgst|sgst|igst|\bgst\b|\bvat\b|\btcs\b|\btds\b/i;
const SKIP_NUM_RE = /total|grand|\bnet\b|\bqty\b|\brate\b|^no\.?$|number|^year$|^month$/i;
const HDR_DUP_RE = /^(vch ?no|vch ?date|voucher|branch|link ?no|client ?name|date)/i;
const ACRONYM_RE = /^(CGST|SGST|IGST|GST|VAT|TCS|TDS|PNR|K3|IATA|HSN|SAC|B2B|B2C|B2E|XO|CR|VFS|ID)$/i;
const titleC = (k) => String(k).trim().split(/\s+/)
  .map((w) => (ACRONYM_RE.test(w) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
  .join(' ');

function voucherPrefix(v) {
  const vno = String(v.vno || ''); const t = String(v.type || '');
  if (t === 'SF' || t === 'PF') { if (/^IS/i.test(vno)) return 'IT-'; if (/^DS/i.test(vno)) return 'DT-'; }
  if (t === 'SH' || t === 'PH') { if (/int/i.test(vno)) return 'IH-'; if (/dom/i.test(vno)) return 'DH-'; }
  return '';
}

export function VoucherView({ id, cur }) {
  const { data, isLoading } = useQuery({ queryKey: ['voucher', id], queryFn: () => apiGet('/api/vouchers/' + id) });
  if (isLoading) return <div style={{ padding: 20, color: DIM, fontSize: 12 }}>Loading voucher…</div>;
  const v = data || {};
  const prefix = voucherPrefix(v);

  // Classify every line's meta into fare components, GST lines and detail fields.
  const particulars = []; const detail = [];
  for (const ln of (v.lines || [])) {
    const meta = (ln.meta && typeof ln.meta === 'object' && !Array.isArray(ln.meta)) ? ln.meta : null;
    const entries = meta ? Object.entries(meta) : [];
    const hasFare = entries.some(([k, val]) => IS_NUMERIC(val) && !GST_RE.test(k) && !SKIP_NUM_RE.test(k));
    if (!meta || !hasFare) { particulars.push({ label: ln.ledger || 'Line', amount: VNUM(ln.amt) }); continue; }
    for (const [k, val] of entries) {
      if (val == null || String(val).trim() === '') continue;
      if (GST_RE.test(k)) { const n = VNUM(val); if (Math.abs(n) > 0.005) particulars.push({ label: titleC(k), amount: n, tax: true }); continue; }
      if (IS_NUMERIC(val)) {
        const n = VNUM(val);
        if (SKIP_NUM_RE.test(k)) { if (!HDR_DUP_RE.test(k)) detail.push([titleC(k), val]); continue; }
        if (Math.abs(n) > 0.005) particulars.push({ label: prefix + titleC(k), amount: n });
      } else if (!HDR_DUP_RE.test(k)) {
        detail.push([titleC(k), String(val)]);
      }
    }
  }
  // Multi-line vouchers (e.g. asset purchases) keep GST on taxAmt, not in meta —
  // add the CGST/SGST (or IGST) + TCS rows so the voucher foots to its total.
  if (!particulars.some((p) => p.tax) && VNUM(v.taxAmt) > 0.005) {
    const t = VNUM(v.taxAmt);
    if (v.gstMode === 'inter') particulars.push({ label: 'IGST', amount: t, tax: true });
    else { const half = Math.round((t / 2) * 100) / 100; particulars.push({ label: 'CGST', amount: half, tax: true }); particulars.push({ label: 'SGST', amount: Math.round((t - half) * 100) / 100, tax: true }); }
  }
  if (VNUM(v.tcsAmt) > 0.005) particulars.push({ label: 'TCS', amount: VNUM(v.tcsAmt), tax: true });
  const partTotal = particulars.reduce((s, p) => s + p.amount, 0);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid ' + LINE }}>
        {[['Voucher', v.vno], ['Date', dmy(v.date)], [v.category === 'purchase' ? 'Supplier' : 'Party', v.party], ['Type', `${v.type} · ${v.category}`], ['Link No', v.linkNo], ['Total', cur + ' ' + money(v.total)]].map(([k, val]) => (
          <div key={k}><div style={{ fontSize: 9, color: DIM, fontWeight: 700, textTransform: 'uppercase' }}>{k}</div><div style={{ fontSize: 12.5, fontWeight: 600, color: DARK }}>{val || '—'}</div></div>
        ))}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: HEAD }}><th style={th}>Particulars</th><th style={{ ...th, textAlign: 'right' }}>Amount</th></tr></thead>
        <tbody>{particulars.map((p, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #f0f2f7' }}>
            <td style={{ ...tdName, fontWeight: 700, color: p.tax ? '#854F0B' : DARK }}>{p.label}</td>
            <td style={{ ...tdNum, fontWeight: 600 }}>{money(p.amount)}</td>
          </tr>
        ))}</tbody>
        <tfoot><tr style={{ borderTop: '2px solid ' + DARK, background: '#f3f4f8' }}>
          <td style={{ ...tdName, fontWeight: 800 }}>Total</td>
          <td style={{ ...tdNum, fontWeight: 800 }}>{money(partTotal)}</td>
        </tr></tfoot>
      </table>

      {detail.length > 0 && (
        <div style={{ marginTop: 14, padding: '12px 14px', background: '#f7f8fb', borderRadius: 8, border: '1px solid ' + LINE }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '6px 18px' }}>
            {detail.map(([k, val], i) => (
              <div key={i} style={{ fontSize: 11.5 }}><span style={{ color: DIM, fontWeight: 600 }}>{k}: </span><span style={{ color: DARK, fontWeight: 600 }}>{val}</span></div>
            ))}
          </div>
          {v.remarks && <div style={{ marginTop: 8, fontSize: 11.5, color: DIM }}>Narration: <b style={{ color: DARK }}>{v.remarks}</b></div>}
        </div>
      )}
    </div>
  );
}

/* ── Main: drill-stack container ── */
export function PnLTallyLive({ branch }) {
  const cur = bc(branch).cur;
  const [range, setRange] = useState(openDefault);
  const [showZero, setShowZero] = useState(false);
  const [stack, setStack] = useState([{ kind: 'pl' }]);
  const top = stack[stack.length - 1];
  const periodLabel = `${dmy(range.from)} to ${dmy(range.to)}`;

  const { data: pl, isLoading, error } = useQuery({
    queryKey: ['pl-tally', brCodeOf(branch), range.from, range.to, showZero],
    queryFn: () => apiGet('/api/accounting/pl-tally', { branch: brCodeOf(branch) === 'ALL' ? '' : brCodeOf(branch), from: range.from, to: range.to, ...(showZero ? { includeZero: 1 } : {}) }),
  });

  const pick = (line) => {
    // Leaf ledger → the ONE unified ledger modal (Statement · Bill-wise · Cost-Centre
    // (DOM/INT) · Components). Groups still drill in-place to reveal their ledgers.
    if (line.ledger || (!line.isGroup && !line.items?.length)) openLedgerModal(line.ledger || line.name);
    else if (line.isGroup) setStack((s) => [...s, { kind: 'group', title: line.name, items: line.items || [] }]);
  };
  const pickFrame = (f) => setStack((s) => [...s, f.kind ? f : null].filter(Boolean));
  const goto = (i) => setStack((s) => s.slice(0, i + 1));

  const crumb = (label, i) => (
    <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
      {i > 0 && <ChevronRight size={12} style={{ color: '#9aa6c4', margin: '0 2px' }} />}
      <button onClick={() => goto(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: i === stack.length - 1 ? DARK : '#1f6fc4', fontWeight: i === stack.length - 1 ? 700 : 600, fontSize: 12, padding: '2px 4px' }}>{label}</button>
    </span>
  );

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '12px 10px 40px' }}>
      {/* Header / date bar */}
      <div style={{ background: DARK, borderRadius: '10px 10px 0 0', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>Profit &amp; Loss A/c <span style={{ color: '#d4a437', fontSize: 11, fontWeight: 600 }}>· Tally view</span></p>
          <p style={{ margin: 0, fontSize: 10.5, color: '#8b94b3' }}>{brCodeOf(branch)} (Branch) · {periodLabel}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#cfd6ea', fontSize: 11, cursor: 'pointer', userSelect: 'none' }} title="Show every ledger in the chart, including those with a zero balance / no entries">
            <input type="checkbox" checked={showZero} onChange={(e) => setShowZero(e.target.checked)} /> Show zero-balance accounts
          </label>
          <PeriodBar branch={branch} compact defaultPreset="all" onChange={(r) => setRange({ from: r.from, to: r.to })} />
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={{ background: '#f3f4f8', borderLeft: '1px solid ' + LINE, borderRight: '1px solid ' + LINE, padding: '7px 14px', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
        {stack.length > 1 && <button onClick={() => setStack((s) => s.slice(0, -1))} style={{ ...backBtn }}><ChevronLeft size={13} /> Back</button>}
        <div style={{ marginLeft: stack.length > 1 ? 10 : 0 }}>
          {crumb('Profit & Loss A/c', 0)}
          {stack.slice(1).map((f, i) => crumb(f.title || (f.kind === 'voucher' ? f.vno : f.name), i + 1))}
        </div>
      </div>

      {/* Body */}
      <div style={{ border: '1px solid ' + LINE, borderTop: 'none', borderRadius: '0 0 10px 10px', background: '#fff', overflow: 'hidden' }}>
        {isLoading && <div style={{ padding: 30, textAlign: 'center', color: DIM }}>Loading P&amp;L…</div>}
        {error && <div style={{ padding: 20, color: '#A32D2D', fontSize: 12.5 }}>Couldn’t load P&amp;L: {String(error.message || error)}</div>}

        {!isLoading && !error && top.kind === 'pl' && pl && (
          <div style={{ overflowX: 'auto' }}>
            {/* Trading account */}
            <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid ' + DARK }}>
              <PLSide lines={pl.trading.debit} total={pl.trading.total} periodLabel={periodLabel} onPick={pick} branch={branch} from={range.from} to={range.to} />
              <div style={{ width: 1, background: LINE }} />
              <PLSide lines={pl.trading.credit} total={pl.trading.total} periodLabel={periodLabel} onPick={pick} branch={branch} from={range.from} to={range.to} />
            </div>
            {/* P&L account */}
            <div style={{ display: 'flex', gap: 0 }}>
              <PLSide lines={pl.pl.debit} total={pl.pl.total} periodLabel={periodLabel} onPick={pick} branch={branch} from={range.from} to={range.to} />
              <div style={{ width: 1, background: LINE }} />
              <PLSide lines={pl.pl.credit} total={pl.pl.total} periodLabel={periodLabel} onPick={pick} branch={branch} from={range.from} to={range.to} />
            </div>
            <div style={{ padding: '8px 16px', background: '#f7f8fb', fontSize: 11.5, color: DIM, borderTop: '1px solid ' + LINE }}>
              {pl.grossResult}: <b style={{ color: DARK }}>{cur} {money(pl.grossProfit)}</b> &nbsp;·&nbsp; {pl.result}: <b style={{ color: pl.netProfit >= 0 ? '#27500A' : '#9B2C2C' }}>{cur} {money(Math.abs(pl.netProfit))}</b> &nbsp;· tap ▸ to reveal a group’s ledgers → captured fares inline, or click any name to drill down.
            </div>
          </div>
        )}

        {top.kind === 'group' && (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 700, color: DARK, background: '#fcfdff', borderBottom: '1px solid ' + LINE }}>{top.title} <span style={{ color: DIM, fontWeight: 400 }}>· {brCodeOf(branch)} (Branch) · Closing Balance</span></div>
            <GroupSummary frame={top} onPick={pick} />
          </div>
        )}

        {top.kind === 'ledger' && (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 700, color: DARK, background: '#fcfdff', borderBottom: '1px solid ' + LINE }}>
              {top.costCenter ? top.title : 'Ledger: ' + (top.title || top.name)}<span style={{ color: DIM, fontWeight: 400 }}> · {brCodeOf(branch)} (Branch) · Closing Balance</span>
            </div>
            {top.costCenter
              ? <LedgerComponents name={top.name} costCenter={top.costCenter} branch={branch} from={range.from} to={range.to} onPick={pickFrame} />
              : <LedgerDrill name={top.name} branch={branch} from={range.from} to={range.to} onPick={pickFrame} />}
          </div>
        )}

        {top.kind === 'vouchers' && (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 700, color: DARK, background: '#fcfdff', borderBottom: '1px solid ' + LINE }}>
              Ledger: {top.name}{top.title ? <span style={{ color: DIM, fontWeight: 400 }}> · {top.title}</span> : ''}<span style={{ color: DIM, fontWeight: 400 }}> · {brCodeOf(branch)} (Branch)</span>
            </div>
            <LedgerVouchers name={top.name} costCenter={top.costCenter} branch={branch} from={range.from} to={range.to} onPick={pickFrame} />
          </div>
        )}

        {top.kind === 'voucher' && <VoucherView id={top.id} cur={cur} />}
      </div>
    </div>
  );
}

const dateInp = { padding: '5px 8px', borderRadius: 6, border: '1px solid #2a3450', background: '#1a2238', color: '#cfd8e8', fontSize: 11 };
const backBtn = { display: 'inline-flex', alignItems: 'center', gap: 3, background: '#fff', border: '1px solid ' + LINE, borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 600, color: DARK, cursor: 'pointer' };
