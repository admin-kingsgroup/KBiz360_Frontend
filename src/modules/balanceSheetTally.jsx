// ─── Balance Sheet — Tally view (drill chain) ─────────────────────────────────
// Mirrors TallyPrime's Balance Sheet: Liabilities | Assets (with the Profit & Loss
// A/c showing Opening Balance + Current Period), then the full drill:
//   BS → Group Summary → Group Summary → Ledger Vouchers → Voucher
//   View 1  /api/accounting/bs-tally            (group → sub-group → ledger tree)
//   View 2-3 client-side from that tree          (Group Summary, Closing Dr|Cr)
//   View 4  /api/accounting/ledger/:name         (Ledger Vouchers)
//   View 5  /api/vouchers/:id                    (Accounting Voucher)
// Reuses the P&L view's drill components (PLSide / GroupSummary / LedgerVouchers /
// VoucherView) so the two statements behave identically.
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { apiGet } from '../core/api';
import { bc } from '../core/styles.jsx';
import { PeriodBar } from '../core/period';
import { PLSide, GroupSummary, LedgerVouchers, VoucherView } from './pnlTally.jsx';
import { openLedgerModal } from '../core/LedgerModalHost';
import { PageLayout } from '../shell/PageLayout';
import { SkeletonTable } from '../shell/primitives';
import { toastInfo } from '../core/ux/toast';

const DARK = '#1a1c22', DIM = '#5b616e', LINE = '#e6e8ec';
const money = (n) => (n == null || n === '' ? '' : Number(Math.round((+n || 0) * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const brCodeOf = (b) => (b === 'ALL' ? 'ALL' : (b?.code || 'BOM'));
// Open by default (inception → today): a Balance Sheet must accumulate every
// posting up to the as-at date, so an FY-bound `from` would drop prior-year
// movement. The PeriodBar (defaultPreset="all") refines `from` to inception.
const openDefault = () => ({ from: '2000-01-01', to: new Date().toISOString().slice(0, 10) });
const dmy = (s) => { const d = new Date(s); return Number.isNaN(d.getTime()) ? s : `${d.getDate()}-${d.toLocaleString('en', { month: 'short' })}-${String(d.getFullYear()).slice(-2)}`; };
const backBtn = { display: 'inline-flex', alignItems: 'center', gap: 3, background: '#fff', border: '1px solid ' + LINE, borderRadius: 6, padding: '3px 9px', fontSize: 11, fontWeight: 600, color: DARK, cursor: 'pointer' };

export function BalanceSheetTallyLive({ branch }) {
  const cur = bc(branch).cur;
  const [range, setRange] = useState(openDefault);
  const [showZero, setShowZero] = useState(false);
  const [stack, setStack] = useState([{ kind: 'bs' }]);
  const top = stack[stack.length - 1];
  const asAt = `as at ${dmy(range.to)}`;

  const { data: bs, isLoading, error, refetch } = useQuery({
    queryKey: ['bs-tally', brCodeOf(branch), range.from, range.to, showZero],
    queryFn: () => apiGet('/api/accounting/bs-tally', { branch: brCodeOf(branch) === 'ALL' ? '' : brCodeOf(branch), from: range.from, to: range.to, ...(showZero ? { includeZero: 1 } : {}) }),
  });

  // Clicking a group → its Group Summary; a ledger → its Ledger Vouchers.
  const pick = (line) => {
    // Leaf ledger → the ONE unified ledger modal; groups still drill in-place.
    if (line.ledger || (!line.isGroup && !line.items?.length)) openLedgerModal(line.ledger || line.name);
    else if (line.isGroup) setStack((s) => [...s, { kind: 'group', title: line.name, items: line.items || [] }]);
  };
  const pickFrame = (f) => setStack((s) => (f && f.kind ? [...s, f] : s));
  const goto = (i) => setStack((s) => s.slice(0, i + 1));

  const crumb = (label, i) => (
    <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>
      {i > 0 && <ChevronRight size={12} style={{ color: '#9197a3', margin: '0 2px' }} />}
      <button onClick={() => goto(i)} className="inline-flex items-center max-tablet:min-h-[44px]" style={{ background: 'none', border: 'none', cursor: 'pointer', color: i === stack.length - 1 ? DARK : '#2563eb', fontWeight: i === stack.length - 1 ? 700 : 600, fontSize: 12, padding: '2px 4px' }}>{label}</button>
    </span>
  );

  return (
    <PageLayout maxWidth="mx-auto max-w-[1280px] pb-10">
      <div style={{ background: DARK, borderRadius: '10px 10px 0 0', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#fff' }}>Balance Sheet <span style={{ color: '#c2a04a', fontSize: 11, fontWeight: 600 }}>· Tally view</span></p>
          <p style={{ margin: 0, fontSize: 10.5, color: '#9197a3' }}>{brCodeOf(branch)} (Branch) · {asAt}</p>
        </div>
        <div className="max-tablet:w-full" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <label className="max-tablet:min-h-[44px]" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#c9ccd2', fontSize: 11, cursor: 'pointer', userSelect: 'none' }} title="Show every ledger in the chart, including those with a zero balance / no entries">
            <input type="checkbox" checked={showZero} onChange={(e) => setShowZero(e.target.checked)} /> Show zero-balance accounts
          </label>
          <PeriodBar branch={branch} compact defaultPreset="all" onChange={(r) => setRange({ from: r.from, to: r.to })} />
        </div>
      </div>

      <div style={{ background: '#f4f5f7', borderLeft: '1px solid ' + LINE, borderRight: '1px solid ' + LINE, padding: '7px 14px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4 }}>
        {stack.length > 1 && <button onClick={() => setStack((s) => s.slice(0, -1))} className="max-tablet:min-h-[44px]" style={backBtn}><ChevronLeft size={13} /> Back</button>}
        <div style={{ marginLeft: stack.length > 1 ? 10 : 0 }}>
          {crumb('Balance Sheet', 0)}
          {stack.slice(1).map((f, i) => crumb(f.title || (f.kind === 'voucher' ? f.vno : f.name), i + 1))}
        </div>
      </div>

      <div style={{ borderLeft: '1px solid ' + LINE, borderRight: '1px solid ' + LINE, borderBottom: '1px solid ' + LINE, borderRadius: '0 0 10px 10px', background: '#fff', overflow: 'hidden' }}>
        {isLoading && <div style={{ padding: 16 }}><SkeletonTable rows={8} cols={3} /></div>}
        {error && (
          <div style={{ padding: 20 }}>
            <div style={{ color: '#dc2626', fontSize: 12.5, marginBottom: 10 }}>Couldn’t load Balance Sheet: {String(error.message || error)}</div>
            <button onClick={() => { toastInfo('Retrying…'); refetch(); }} className="max-tablet:min-h-[44px]" style={backBtn}>Retry</button>
          </div>
        )}

        {!isLoading && !error && top.kind === 'bs' && bs && (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'flex', gap: 0 }}>
              <PLSide title="Liabilities" lines={bs.liabilities} total={bs.total} periodLabel={asAt} onPick={pick} />
              <div style={{ width: 1, background: LINE }} />
              <PLSide title="Assets" lines={bs.assets} total={bs.total} periodLabel={asAt} onPick={pick} />
            </div>
            <div style={{ padding: '8px 16px', background: '#f7f8fb', fontSize: 11.5, color: DIM, borderTop: '1px solid ' + LINE }}>
              {bs.balanced ? '✔ Balanced' : '⚠ Difference'} · Total <b style={{ color: DARK }}>{cur} {money(bs.total)}</b> · click any group or ledger to drill down.
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
            <div style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 700, color: DARK, background: '#fcfdff', borderBottom: '1px solid ' + LINE }}>Ledger: {top.title || top.name}<span style={{ color: DIM, fontWeight: 400 }}> · {brCodeOf(branch)} (Branch)</span></div>
            <LedgerVouchers name={top.name} branch={branch} from={range.from} to={range.to} onPick={pickFrame} />
          </div>
        )}

        {top.kind === 'voucher' && <VoucherView id={top.id} cur={cur} />}
      </div>
    </PageLayout>
  );
}
