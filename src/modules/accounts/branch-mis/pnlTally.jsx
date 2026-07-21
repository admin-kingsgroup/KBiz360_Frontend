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
import { apiGet } from '../../../core/api';
import { openLedgerModal } from '../../../core/LedgerModalHost';
import { openBookingFolder } from '../../../core/BookingFolderHost';
import { isBookingLegRow } from '../../../core/ledgerUI';
import { useLedgerMeta, SourceBadge } from '../../../core/LedgerLabel';
import { bc } from '../../../core/styles.jsx';
import { localeOf } from '../../../core/format';
import { CONSOLIDATED_LABEL } from '../../../core/data';
import { PeriodBar } from '../../../core/period';
import { LedgerActions } from '../../../core/ledgerActions';
import { PageLayout } from '../../../shell/PageLayout';
import { SkeletonTable, Skeleton } from '../../../shell/primitives';
import { toastInfo } from '../../../core/ux/toast';
import { clickable } from '../../../core/ux/clickable';
import { JvBlock } from '../../../core/voucher/JvBlock';
import { isVatBranch } from '../../../core/voucherSpecs.js';

const DARK = '#1a1c22', DIM = '#5b616e', LINE = '#e6e8ec', HEAD = '#2e323c';
// Branch-statement number. Grouping locale follows the branch currency symbol
// (Indian lakh/crore for ₹, Western thousands for USD branches); the currency symbol
// itself is rendered separately by the caller. Defaulting cur to ₹ keeps every
// consolidated/ALL view (bc → ₹) and any un-threaded caller on en-IN, unchanged.
const money = (n, cur = '₹') => (n == null || n === '' ? '' : Number(Math.round((+n || 0) * 100) / 100).toLocaleString(localeOf(cur), { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
// A blank/unresolved branch defaults to CONSOLIDATED ('ALL' → '' param), never 'BOM' —
// this value feeds both the query key and the API branch param, so a 'BOM' default would
// silently load Mumbai's books into the report. Matches useAccounting.branchCode() (blank⇒all).
const brCodeOf = (b) => (b === 'ALL' ? 'ALL' : (b?.code || 'ALL'));
// Per-branch currency + label for the consolidated (ALL) breakdown. A byBranch slice
// carries a bare branch CODE (string); bc() expects an object with `.code`, so wrap it.
const brObj = (code) => ({ code: String(code || 'ALL') });
const curOf = (code) => bc(brObj(code)).cur;
const branchLabel = (b) => (!b || b === 'ALL' ? CONSOLIDATED_LABEL : (b.code || b));
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
  const cur = bc(branch).cur;
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
        <tfoot><tr style={{ borderTop: '2px solid ' + DARK, background: '#f4f5f7' }}>
          <td style={{ ...tdName, fontWeight: 800 }}>Total</td>
          <td />
          <td style={{ ...tdNum, fontWeight: 800, color: DARK }}>{money(total, cur)}</td>
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
  const cur = bc(branch).cur;
  const { data, isLoading } = useQuery({
    queryKey: ['ledger-components', name, brCodeOf(branch), from, to],
    queryFn: () => apiGet('/api/accounting/ledger-components/' + encodeURIComponent(name), { branch: brCodeOf(branch) === 'ALL' ? '' : brCodeOf(branch), from, to }),
  });
  const note = (txt) => (<tr><td colSpan={3} style={{ ...tdName, paddingLeft: 54, color: DIM, fontSize: 11, fontStyle: 'italic' }}>{txt}</td></tr>);
  if (isLoading) return note(<Skeleton style={{ height: 11, width: 120 }} />);
  const rows = (data && data.rows) || [];
  if (!rows.length) return note('No captured fare components.');
  return (
    <>
      {rows.map((r, i) => (
        <tr key={i} style={{ background: '#fafbff' }}>
          <td style={{ ...tdName, paddingLeft: 54, color: DIM, fontSize: 11.5, fontStyle: 'italic' }}>{r.label}</td>
          <td style={{ ...tdNum, color: DIM, fontSize: 11.5 }}>{money(r.amount, cur)}</td>
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
  const cur = bc(branch).cur;
  const [openLedgers, setOpenLedgers] = useState(false);
  const [openComp, setOpenComp] = useState({});
  const metaOf = useLedgerMeta();
  const badge = (nm) => { const m = metaOf(nm); return m ? <>{m.locked && <span title="Locked — super-admin only" style={{ marginLeft: 4 }}>🔒</span>}<SourceBadge source={m.source} compact /></> : null; };
  const drillable = line.isGroup || line.ledger || (!line.isGroup && !!line.name);
  if (line.isCarry || line.isResult) {
    return (
      <tr><td style={{ ...tdName, fontStyle: 'italic', fontWeight: 700, color: line.isResult ? '#dc2626' : DARK }}>{line.name}</td>
        <td /><td style={{ ...tdNum, fontWeight: 700, fontStyle: 'italic' }}>{money(line.amount, cur)}</td></tr>
    );
  }
  const items = line.items || [];
  const subGroups = items.filter((it) => it.isGroup);
  const ledgers = items.filter((it) => !it.isGroup && (it.ledger || it.name));
  const canExpand = line.isGroup && ledgers.length > 0;
  return (
    <>
      <tr {...clickable(() => drillable && onPick(line))} style={{ cursor: drillable ? 'pointer' : 'default', background: line.isGroup ? '#fcfdff' : '#fff' }}
        onMouseEnter={(e) => drillable && (e.currentTarget.style.background = '#eef4ff')}
        onMouseLeave={(e) => (e.currentTarget.style.background = line.isGroup ? '#fcfdff' : '#fff')}>
        <td style={{ ...tdName, fontWeight: line.isGroup ? 700 : 400, color: line.isGroup ? DARK : '#2563eb', paddingLeft: line.isGroup ? 12 : 26 }}>
          {canExpand && (
            <span {...clickable((e) => { e.stopPropagation(); setOpenLedgers((o) => !o); })}
              style={{ cursor: 'pointer', color: '#9197a3', fontWeight: 700, marginRight: 5, display: 'inline-block', width: 10 }}
              title={openLedgers ? 'Hide ledgers' : 'Show ledgers → captured fares'}>{openLedgers ? '▾' : '▸'}</span>
          )}
          {line.name}{line.isGroup && <ChevronRight size={11} style={{ verticalAlign: 'middle', marginLeft: 4, color: '#9197a3' }} />}
        </td>
        <td style={tdNum}>{line.isGroup ? '' : money(line.amount, cur)}</td>
        <td style={{ ...tdNum, fontWeight: 700 }}>{line.isGroup ? money(line.amount, cur) : ''}</td>
      </tr>
      {/* Sub-group breakup stays inline (drills on click), exactly as Tally does. */}
      {line.isGroup && subGroups.map((it, j) => (
        <tr key={'g' + j} {...clickable(() => onPick(it))} style={{ cursor: 'pointer' }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#eef4ff')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
          <td style={{ ...tdName, paddingLeft: 30, color: DARK, fontWeight: 600 }}>
            {it.name}<ChevronRight size={10} style={{ verticalAlign: 'middle', marginLeft: 3, color: '#9197a3' }} />
          </td>
          <td style={tdNum}>{money(it.amount, cur)}</td>
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
              <td style={{ ...tdName, paddingLeft: 38, color: '#2563eb' }}>
                <span {...clickable((e) => { e.stopPropagation(); setOpenComp((s) => ({ ...s, [led]: !s[led] })); })}
                  style={{ cursor: 'pointer', color: '#9197a3', fontWeight: 700, marginRight: 5, display: 'inline-block', width: 10 }}
                  title={co ? 'Hide components' : 'Show captured fares'}>{co ? '▾' : '▸'}</span>
                <span {...clickable(() => openLedgerModal(led))} style={{ cursor: 'pointer' }} title="Open ledger account">{it.name}</span>
                {badge(it.name)}
              </td>
              <td style={tdNum}>{money(it.amount, cur)}</td>
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
export function GroupSummary({ frame, onPick, cur = '₹' }) {
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
            <tr key={i} {...clickable(() => drillable && onPick(it))} style={{ cursor: drillable ? 'pointer' : 'default', borderBottom: '1px solid #dfe2e7' }}
              onMouseEnter={(e) => drillable && (e.currentTarget.style.background = '#eef4ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
              <td style={{ ...tdName, fontWeight: it.isGroup ? 700 : 400, color: it.isGroup ? DARK : '#2563eb' }}>
                {it.name}{it.isGroup && <ChevronRight size={11} style={{ verticalAlign: 'middle', marginLeft: 4, color: '#9197a3' }} />}
                {!it.isGroup && (() => { const m = metaOf(it.name); return m ? <>{m.locked && <span title="Locked — super-admin only" style={{ marginLeft: 4 }}>🔒</span>}<SourceBadge source={m.source} compact /></> : null; })()}
              </td>
              <td style={tdNum}>{it.side === 'Dr' ? money(it.amount, cur) : ''}</td>
              <td style={tdNum}>{it.side === 'Cr' ? money(it.amount, cur) : ''}</td>
            </tr>
          );
        })}
      </tbody>
      <tfoot><tr style={{ borderTop: '2px solid ' + DARK, background: '#f4f5f7' }}>
        <td style={{ ...tdName, fontWeight: 800 }}>Grand Total</td>
        <td style={{ ...tdNum, fontWeight: 800 }}>{grand < 0 ? money(-grand, cur) : ''}</td>
        <td style={{ ...tdNum, fontWeight: 800 }}>{grand >= 0 ? money(grand, cur) : ''}</td>
      </tr></tfoot>
    </table>
  );
}

/* ── Fare/charge component breakdown (DT-Base Fare, DT-Taxes …) — the Tally
   sub-ledger level. Falls back to the vouchers when a ledger has no breakup. ── */
function LedgerComponents({ name, costCenter, branch, from, to, onPick }) {
  const cur = bc(branch).cur;
  const { data, isLoading } = useQuery({
    queryKey: ['ledger-components', name, costCenter || '', brCodeOf(branch), from, to],
    queryFn: () => apiGet('/api/accounting/ledger-components/' + encodeURIComponent(name), { branch: brCodeOf(branch) === 'ALL' ? '' : brCodeOf(branch), from, to, ...(costCenter ? { costCenter } : {}) }),
  });
  if (isLoading) return <SkeletonTable rows={6} cols={3} />;
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
          <tr key={i} {...clickable(() => onPick({ kind: 'vouchers', name, costCenter, title: r.label }))}
            style={{ cursor: 'pointer', borderBottom: '1px solid #dfe2e7' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#eef4ff')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
            <td style={{ ...tdName, fontWeight: 600, color: '#2563eb' }}>{r.label}<ChevronRight size={11} style={{ verticalAlign: 'middle', marginLeft: 4, color: '#9197a3' }} /></td>
            <td style={tdNum}>{r.side === 'Dr' ? money(r.amount, cur) : ''}</td>
            <td style={tdNum}>{r.side === 'Cr' ? money(r.amount, cur) : ''}</td>
          </tr>
        ))}
      </tbody>
      <tfoot><tr style={{ borderTop: '2px solid ' + DARK, background: '#f4f5f7' }}>
        <td style={{ ...tdName, fontWeight: 800 }}>Grand Total</td>
        <td style={{ ...tdNum, fontWeight: 800 }}>{grand < 0 ? money(-grand, cur) : ''}</td>
        <td style={{ ...tdNum, fontWeight: 800 }}>{grand >= 0 ? money(grand, cur) : ''}</td>
      </tr></tfoot>
    </table>
  );
}

/* ── Domestic / International (cost-centre) split — Tally sub-level for Flights &
   Holidays. Drills straight to the component breakdown when there is no split. ── */
function LedgerDrill({ name, branch, from, to, onPick }) {
  const cur = bc(branch).cur;
  const { data, isLoading } = useQuery({
    queryKey: ['ledger-split', name, brCodeOf(branch), from, to],
    queryFn: () => apiGet('/api/accounting/ledger-split/' + encodeURIComponent(name), { branch: brCodeOf(branch) === 'ALL' ? '' : brCodeOf(branch), from, to }),
  });
  if (isLoading) return <SkeletonTable rows={6} cols={3} />;
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
          <tr key={i} {...clickable(() => onPick({ kind: 'ledger', name, costCenter: r.costCenter, title: r.label }))}
            style={{ cursor: 'pointer', borderBottom: '1px solid #dfe2e7' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#eef4ff')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
            <td style={{ ...tdName, fontWeight: 700, color: DARK }}>{r.label}<ChevronRight size={11} style={{ verticalAlign: 'middle', marginLeft: 4, color: '#9197a3' }} /></td>
            <td style={tdNum}>{r.side === 'Dr' ? money(r.amount, cur) : ''}</td>
            <td style={tdNum}>{r.side === 'Cr' ? money(r.amount, cur) : ''}</td>
          </tr>
        ))}
      </tbody>
      <tfoot><tr style={{ borderTop: '2px solid ' + DARK, background: '#f4f5f7' }}>
        <td style={{ ...tdName, fontWeight: 800 }}>Grand Total</td>
        <td style={{ ...tdNum, fontWeight: 800 }}>{grand < 0 ? money(-grand, cur) : ''}</td>
        <td style={{ ...tdNum, fontWeight: 800 }}>{grand >= 0 ? money(grand, cur) : ''}</td>
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
const ageColor = (n) => (n <= 7 ? '#16a34a' : n <= 30 ? '#d97706' : '#dc2626');
// Tally's "Particulars" is the contra leg of the voucher (every other ledger).
const contraLabel = (ln) => {
  const ps = ln.particulars || [];
  if (!ps.length) return ln.party || '—';
  return ps.length === 1 ? ps[0].ledger : `${ps[0].ledger} (+${ps.length - 1} more)`;
};

export function LedgerVouchers({ name, branch, from, to, costCenter, onPick }) {
  const cur = bc(branch).cur;
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
          {!showBillwise && <LedgerActions d={d} cur={cur} branchLabel={brCodeOf(branch)} from={range.from} to={range.to} particulars={contraLabel} />}
        </div>
      </div>

      {isLoading && <SkeletonTable rows={6} cols={7} />}

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
              <td style={tdNum}>{d.openingSide === 'Dr' ? money(d.openingBalance, cur) : ''}</td>
              <td style={tdNum}>{d.openingSide === 'Cr' ? money(d.openingBalance, cur) : ''}</td>
              <td style={{ ...tdNum, fontWeight: 700 }}>{money(d.openingBalance, cur)} {d.openingSide}</td>
            </tr>
            {(d.lines || []).map((ln, i) => (
              <React.Fragment key={i}>
                <tr {...clickable(() => ln.voucherId && onPick({ kind: 'voucher', id: ln.voucherId, vno: ln.vno, category: ln.category, type: ln.type }))}
                  style={{ cursor: ln.voucherId ? 'pointer' : 'default', borderBottom: showNarration ? 'none' : '1px solid #dfe2e7' }}
                  onMouseEnter={(e) => ln.voucherId && (e.currentTarget.style.background = '#eef4ff')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ ...tdName, color: DIM, whiteSpace: 'nowrap' }}>{dmy(ln.date)}</td>
                  <td style={{ ...tdName, fontWeight: 600 }}>{contraLabel(ln)}</td>
                  <td style={{ ...tdName, textTransform: 'capitalize' }}>{ln.category || ''}</td>
                  <td style={{ ...tdName, fontFamily: 'monospace', fontSize: 11 }}>{ln.vno}</td>
                  <td style={tdNum}>{ln.debit ? money(ln.debit, cur) : ''}</td>
                  <td style={tdNum}>{ln.credit ? money(ln.credit, cur) : ''}</td>
                  <td style={{ ...tdNum, color: DIM }}>{money(Math.abs(ln.balance), cur)} {ln.balanceSide}</td>
                </tr>
                {showNarration && (ln.narration || ln.entryNarration) && (
                  <tr style={{ borderBottom: '1px solid #dfe2e7' }}>
                    <td />
                    <td colSpan={6} style={{ ...tdName, color: DIM, fontStyle: 'italic', fontSize: 11, paddingTop: 0 }}>{ln.narration || ln.entryNarration}</td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
          <tfoot><tr style={{ borderTop: '2px solid ' + DARK, background: '#f4f5f7' }}>
            <td style={{ ...tdName, fontWeight: 800 }} colSpan={4}>Current Total / Closing</td>
            <td style={{ ...tdNum, fontWeight: 800 }}>{money(d.totalDebit, cur)}</td>
            <td style={{ ...tdNum, fontWeight: 800 }}>{money(d.totalCredit, cur)}</td>
            <td style={{ ...tdNum, fontWeight: 800 }}>{money(d.closingBalance, cur)} {d.closingSide}</td>
          </tr></tfoot>
        </table>
      )}
    </div>
  );
}

/* ── Bill-wise outstanding for a party ledger (Tally "Bill-wise details").
   Reuses the existing receipt/payment allocation sub-ledger via /open-bills. ── */
function LedgerBillwise({ name, branch, side }) {
  const cur = bc(branch).cur;
  const { data, isLoading } = useQuery({
    queryKey: ['ledger-billwise', name, brCodeOf(branch), side],
    // includeSettled → full bill-wise picture (raised → settled → outstanding), not open-only.
    queryFn: () => apiGet('/api/vouchers/open-bills', { party: name, branch: brCodeOf(branch) === 'ALL' ? '' : brCodeOf(branch), side, includeSettled: '1' }),
  });
  if (isLoading) return <SkeletonTable rows={5} cols={7} />;
  const bills = (data && data.bills) || [];
  const advances = (data && data.advances) || 0;
  if (!bills.length && advances <= 0.01) return <div style={{ padding: 24, textAlign: 'center', color: DIM, fontSize: 12 }}>No bills for this ledger.</div>;
  const totalBill = bills.reduce((s, b) => s + (b.total || 0), 0);
  const totalSettled = bills.reduce((s, b) => s + (b.allocated || 0), 0);
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
          <tr key={i} style={{ borderBottom: '1px solid #dfe2e7' }}>
            <td style={{ ...tdName, color: DIM, whiteSpace: 'nowrap' }}>{dmy(b.date)}</td>
            <td style={{ ...tdName, fontWeight: 600, fontFamily: 'monospace', fontSize: 11 }}><span {...clickable(() => openBookingFolder(b.billVno, { branch, vno: b.billVno }))} title="Open the whole SO / PO / GP deal" style={{ cursor: 'pointer', color: '#185FA5', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>{b.billVno}</span></td>
            <td style={{ ...tdName, color: DIM, whiteSpace: 'nowrap' }}>{b.creditDays ? dmy(addDaysStr(b.date, b.creditDays)) : '—'}</td>
            <td style={tdNum}>{money(b.total, cur)}</td>
            <td style={{ ...tdNum, color: b.allocated ? '#27500A' : DIM, fontWeight: b.allocated ? 700 : 400 }}>{b.allocated ? money(b.allocated, cur) : ''}</td>
            <td style={{ ...tdNum, fontWeight: 700, color: b.outstanding > 0.01 ? undefined : DIM }}>{b.outstanding > 0.01 ? money(b.outstanding, cur) : '—'}</td>
            <td style={{ ...tdName, fontWeight: 600, color: b.outstanding > 0.01 ? ageColor(b.ageDays) : DIM }}>{b.outstanding > 0.01 ? `${b.ageDays}d` : 'settled'}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr style={{ borderTop: '2px solid ' + DARK, background: '#f4f5f7' }}>
          <td style={{ ...tdName, fontWeight: 800 }} colSpan={3}>Total</td>
          <td style={{ ...tdNum, fontWeight: 800 }}>{money(totalBill, cur)}</td>
          <td style={{ ...tdNum, fontWeight: 800, color: '#27500A' }}>{money(totalSettled, cur)}</td>
          <td style={{ ...tdNum, fontWeight: 800 }}>{money(totalOut, cur)}</td>
          <td style={{ ...tdName, fontSize: 10, color: DIM, fontWeight: 700 }}>outstanding</td>
        </tr>
        {advances > 0.01 && (
          <tr style={{ background: '#fff' }}>
            <td style={{ ...tdName, color: DIM, fontStyle: 'italic' }} colSpan={5}>On-Account (advance, unallocated)</td>
            <td style={{ ...tdNum, color: DIM, fontStyle: 'italic' }}>{money(advances, cur)}</td>
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
  // JV ledger postings — which ledgers this voucher debits/credits (actual journal
  // once posted, else the would-be entry). Shown for every status so an approver
  // sees the full accounting impact when opening a voucher from the Approval queue.
  const { data: jv } = useQuery({ queryKey: ['voucher-journal', id], queryFn: () => apiGet('/api/vouchers/' + id + '/journal'), enabled: !!id });
  if (isLoading) return (
    <div style={{ padding: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 14 }}>
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} style={{ height: 30, width: 90 }} />)}
      </div>
      <SkeletonTable rows={5} cols={2} />
    </div>
  );
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
    // Mirror posting.builder.taxPostings EXACTLY: the BRANCH's regime decides first, and only an
    // India branch splits by gstMode. An Africa/VAT branch posts a single VAT leg regardless of
    // gstMode — and an INB sale stores gstMode:'inter' for ANY taxable seller (buildInbVoucher),
    // so testing gstMode first labelled an FBM voucher "IGST" while the journal beside it credits
    // "VAT Output [FBM]" — the drawer contradicting the postings it sits next to.
    if (isVatBranch(v.branch)) particulars.push({ label: 'VAT', amount: t, tax: true });
    else if (v.gstMode === 'inter') particulars.push({ label: 'IGST', amount: t, tax: true });
    else { const half = Math.round((t / 2) * 100) / 100; particulars.push({ label: 'CGST', amount: half, tax: true }); particulars.push({ label: 'SGST', amount: Math.round((t - half) * 100) / 100, tax: true }); }
  }
  if (VNUM(v.tcsAmt) > 0.005) particulars.push({ label: 'TCS', amount: VNUM(v.tcsAmt), tax: true });
  const partTotal = particulars.reduce((s, p) => s + p.amount, 0);

  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid ' + LINE }}>
        {[['Voucher', v.vno], ['Tally Ref', v.sourceRef], ['Date', dmy(v.date)], [v.category === 'purchase' ? 'Supplier' : 'Party', v.party], ['Type', `${v.type} · ${v.category}`], ['Link No', v.linkNo], ['Total', cur + ' ' + money(v.total, cur)]].map(([k, val]) => (
          <div key={k}><div style={{ fontSize: 9, color: DIM, fontWeight: 700, textTransform: 'uppercase' }}>{k}</div>
            {/* On a forward SO/PO/GP booking leg, the Link No opens the whole deal (folder). */}
            {k === 'Link No' && isBookingLegRow(v) && v.linkNo
              ? <button type="button" onClick={() => openBookingFolder(v.linkNo, { branch: v.branch ? { code: v.branch } : undefined, voucherId: id, vno: v.vno })} title="Open the whole SO / PO / GP deal" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#185FA5', fontSize: 12.5, fontWeight: 600, fontFamily: 'inherit', textDecoration: 'underline', textDecorationStyle: 'dotted' }}>{v.linkNo} ↗</button>
              : <div style={{ fontSize: 12.5, fontWeight: 600, color: DARK }}>{val || '—'}</div>}
          </div>
        ))}
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: HEAD }}><th style={th}>Particulars</th><th style={{ ...th, textAlign: 'right' }}>Amount</th></tr></thead>
        <tbody>{particulars.map((p, i) => (
          <tr key={i} style={{ borderBottom: '1px solid #dfe2e7' }}>
            <td style={{ ...tdName, fontWeight: 700, color: p.tax ? '#d97706' : DARK }}>{p.label}</td>
            <td style={{ ...tdNum, fontWeight: 600 }}>{p.tax ? money(p.amount) : money(p.amount, cur)}</td>
          </tr>
        ))}</tbody>
        <tfoot><tr style={{ borderTop: '2px solid ' + DARK, background: '#f4f5f7' }}>
          <td style={{ ...tdName, fontWeight: 800 }}>Total</td>
          <td style={{ ...tdNum, fontWeight: 800 }}>{money(partTotal, cur)}</td>
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

      <JVPostings jv={jv} />
    </div>
  );
}

/* ── Journal Entry (JV) — the ledger postings (Dr/Cr) behind a voucher ──────────
   Tally accounting-voucher format: debit ledgers first, then credit ledgers ("To
   …"). Shows the ACTUAL posted journal when the voucher is approved, else the
   would-be entry — so an approver opening any voucher (pending / approved /
   rejected / deleted / edited) sees exactly which ledgers it affects. */
function JVPostings({ jv }) {
  const rows = jv && Array.isArray(jv.postings) ? jv.postings : [];
  // Debits first, then credits — the conventional Tally voucher reading order.
  const ordered = [...rows].sort((a, b) => ((b.debit || 0) > 0 ? 1 : 0) - ((a.debit || 0) > 0 ? 1 : 0));
  const DR = '#1A7A42', CR = '#C0392B';
  const badge = jv && jv.posted
    ? { t: '● Posted to books', bg: '#E7F3E7', c: '#1A7A42' }
    : jv && jv.status === 'deleted'
      ? { t: '⟲ Reversed out of books (view-only)', bg: '#FBEAEA', c: '#C0392B' }
      : jv && jv.status === 'rejected'
        ? { t: '✗ Not posted (rejected)', bg: '#FBEAEA', c: '#C0392B' }
        : { t: '○ Would-be entry — posts on approval', bg: '#FFF6D6', c: '#d97706' };
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: DARK }}>Journal Entry · Ledger Postings</div>
        {jv && <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: badge.bg, color: badge.c }}>{badge.t}</span>}
      </div>
      {!jv ? (
        <div style={{ padding: 12, fontSize: 11.5, color: DIM, background: '#f7f8fb', borderRadius: 8, border: '1px solid ' + LINE }}><Skeleton style={{ height: 11.5, width: 160 }} /></div>
      ) : ordered.length === 0 ? (
        <div style={{ padding: 12, fontSize: 11.5, color: DIM, background: '#f7f8fb', borderRadius: 8, border: '1px solid ' + LINE }}>
          No ledger postings could be built for this voucher.{jv.error ? ` — ${jv.error}` : ''}
        </div>
      ) : (
        <>
          <JvBlock postings={ordered} />
          {!jv.balanced && <div style={{ marginTop: 6, fontSize: 11, color: '#d97706' }}>⚠ This entry does not balance (Debit ≠ Credit){jv.error ? ` — ${jv.error}` : ''}.</div>}
        </>
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
  // Consolidated = all-branches scope: render EACH branch as its own P&L section in its
  // OWN currency — never a merged cross-currency total. Driven by the BE `byBranch` slice
  // that carries the same shape (trading / pl / grossProfit / netProfit …) as the merged top.
  const isAll = !branch || branch === 'ALL' || branch?.code === 'ALL';

  const { data: pl, isLoading, error, refetch } = useQuery({
    queryKey: ['pl-tally', brCodeOf(branch), range.from, range.to, showZero],
    queryFn: () => apiGet('/api/accounting/pl-tally', { branch: brCodeOf(branch) === 'ALL' ? '' : brCodeOf(branch), from: range.from, to: range.to, ...(showZero ? { includeZero: 1 } : {}) }),
  });

  const pick = (line) => {
    // Leaf ledger → the ONE unified ledger modal (Statement · Bill-wise · Cost-Centre
    // (DOM/INT) · Components). Groups still drill in-place to reveal their ledgers.
    if (line.ledger || (!line.isGroup && !line.items?.length)) openLedgerModal(line.ledger || line.name);
    else if (line.isGroup) setStack((s) => [...s, { kind: 'group', title: line.name, items: line.items || [] }]);
  };
  const pickFrame = (f) => {
    // A forward SO/PO/GP booking leg opens the whole deal (folder) rather than pushing a
    // single-voucher frame; refund/reissue + non-booking legs keep the VoucherView frame.
    if (f && f.kind === 'voucher' && isBookingLegRow(f)) { openBookingFolder(f.vno, { branch, voucherId: f.id, vno: f.vno }); return; }
    setStack((s) => [...s, f.kind ? f : null].filter(Boolean));
  };
  const goto = (i) => setStack((s) => s.slice(0, i + 1));

  const crumb = (label, i) => (
    <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
      {i > 0 && <ChevronRight size={12} style={{ color: '#9197a3', margin: '0 2px' }} />}
      <button onClick={() => goto(i)} className="inline-flex items-center max-tablet:min-h-[44px]" style={{ background: 'none', border: 'none', cursor: 'pointer', color: i === stack.length - 1 ? DARK : '#2563eb', fontWeight: i === stack.length - 1 ? 700 : 600, fontSize: 12, padding: '2px 4px' }}>{label}</button>
    </span>
  );

  // One branch's P&L body (Trading a/c + P&L a/c + footer) in its OWN currency. `sd` is a
  // byBranch slice; `sBranch` is the branch object (so PLSide formats in its currency) and
  // `sCur` its currency. Totals only ITS OWN figures — never summed across branches.
  const renderPL = (sd, sBranch, sCur) => (
    <div style={{ overflowX: 'auto' }}>
      {/* Trading account */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid ' + DARK }}>
        <PLSide lines={sd.trading.debit} total={sd.trading.total} periodLabel={periodLabel} onPick={pick} branch={sBranch} from={range.from} to={range.to} />
        <div style={{ width: 1, background: LINE }} />
        <PLSide lines={sd.trading.credit} total={sd.trading.total} periodLabel={periodLabel} onPick={pick} branch={sBranch} from={range.from} to={range.to} />
      </div>
      {/* P&L account */}
      <div style={{ display: 'flex', gap: 0 }}>
        <PLSide lines={sd.pl.debit} total={sd.pl.total} periodLabel={periodLabel} onPick={pick} branch={sBranch} from={range.from} to={range.to} />
        <div style={{ width: 1, background: LINE }} />
        <PLSide lines={sd.pl.credit} total={sd.pl.total} periodLabel={periodLabel} onPick={pick} branch={sBranch} from={range.from} to={range.to} />
      </div>
      <div style={{ padding: '8px 16px', background: '#f7f8fb', fontSize: 11.5, color: DIM, borderTop: '1px solid ' + LINE }}>
        {sd.grossResult}: <b style={{ color: DARK }}>{sCur} {money(sd.grossProfit, sCur)}</b> &nbsp;·&nbsp; {sd.result}: <b style={{ color: sd.netProfit >= 0 ? '#16a34a' : '#dc2626' }}>{sCur} {money(Math.abs(sd.netProfit), sCur)}</b> &nbsp;· tap ▸ to reveal a group’s ledgers → captured fares inline, or click any name to drill down.
      </div>
    </div>
  );

  return (
    <PageLayout maxWidth="mx-auto max-w-[1280px] pb-10">
      {/* Header / date bar */}
      <div style={{ background: DARK, borderRadius: '10px 10px 0 0', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>Profit &amp; Loss A/c <span style={{ color: '#c2a04a', fontSize: 11, fontWeight: 600 }}>· Tally view</span></p>
          <p style={{ margin: 0, fontSize: 10.5, color: '#9197a3' }}>{brCodeOf(branch)} (Branch) · {periodLabel}</p>
        </div>
        <div className="max-tablet:w-full" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="max-tablet:min-h-[44px]" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#c9ccd2', fontSize: 11, cursor: 'pointer', userSelect: 'none' }} title="Show every ledger in the chart, including those with a zero balance / no entries">
            <input type="checkbox" checked={showZero} onChange={(e) => setShowZero(e.target.checked)} /> Show zero-balance accounts
          </label>
          <PeriodBar branch={branch} compact defaultPreset="all" onChange={(r) => setRange({ from: r.from, to: r.to })} />
        </div>
      </div>

      {/* Breadcrumb */}
      <div style={{ background: '#f4f5f7', borderLeft: '1px solid ' + LINE, borderRight: '1px solid ' + LINE, padding: '7px 14px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
        {stack.length > 1 && <button onClick={() => setStack((s) => s.slice(0, -1))} className="max-tablet:min-h-[44px]" style={{ ...backBtn }}><ChevronLeft size={13} /> Back</button>}
        <div style={{ marginLeft: stack.length > 1 ? 10 : 0 }}>
          {crumb('Profit & Loss A/c', 0)}
          {stack.slice(1).map((f, i) => crumb(f.title || (f.kind === 'voucher' ? f.vno : f.name), i + 1))}
        </div>
      </div>

      {/* Body */}
      <div style={{ borderLeft: '1px solid ' + LINE, borderRight: '1px solid ' + LINE, borderBottom: '1px solid ' + LINE, borderRadius: '0 0 10px 10px', background: '#fff', overflow: 'hidden' }}>
        {isLoading && <div style={{ padding: 16 }}><SkeletonTable rows={8} cols={3} /></div>}
        {error && (
          <div style={{ padding: 20 }}>
            <div style={{ color: '#dc2626', fontSize: 12.5, marginBottom: 10 }}>Couldn’t load P&amp;L: {String(error.message || error)}</div>
            <button onClick={() => { toastInfo('Retrying…'); refetch(); }} className="max-tablet:min-h-[44px]" style={{ ...backBtn }}>Retry</button>
          </div>
        )}

        {/* Consolidated (ALL): one P&L section PER branch, each in its OWN currency —
            never a merged cross-currency total. Single-branch path unchanged. */}
        {!isLoading && !error && top.kind === 'pl' && pl && isAll && Array.isArray(pl.byBranch) ? (
          pl.byBranch.length === 0
            ? <div style={{ padding: 24, textAlign: 'center', color: DIM, fontSize: 12.5 }}>No P&amp;L activity in any branch.</div>
            : pl.byBranch.map((b) => (
              <div key={b.branch} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, padding: '10px 16px 6px', borderBottom: '2px solid ' + DARK }}>
                  <span style={{ fontWeight: 800, fontSize: 13.5, color: DARK }}>{branchLabel(b.branch)}</span>
                  <span style={{ fontSize: 11.5, fontWeight: 700, color: DIM }}>· {curOf(b.branch)}</span>
                </div>
                {renderPL(b, brObj(b.branch), curOf(b.branch))}
              </div>
            ))
        ) : (!isLoading && !error && top.kind === 'pl' && pl && (
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
              {pl.grossResult}: <b style={{ color: DARK }}>{cur} {money(pl.grossProfit, cur)}</b> &nbsp;·&nbsp; {pl.result}: <b style={{ color: pl.netProfit >= 0 ? '#16a34a' : '#dc2626' }}>{cur} {money(Math.abs(pl.netProfit), cur)}</b> &nbsp;· tap ▸ to reveal a group’s ledgers → captured fares inline, or click any name to drill down.
            </div>
          </div>
        ))}

        {top.kind === 'group' && (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 700, color: DARK, background: '#fcfdff', borderBottom: '1px solid ' + LINE }}>{top.title} <span style={{ color: DIM, fontWeight: 400 }}>· {brCodeOf(branch)} (Branch) · Closing Balance</span></div>
            <GroupSummary frame={top} onPick={pick} cur={cur} />
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
    </PageLayout>
  );
}

const backBtn = { display: 'inline-flex', alignItems: 'center', gap: 3, background: '#fff', border: '1px solid ' + LINE, borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 600, color: DARK, cursor: 'pointer' };
