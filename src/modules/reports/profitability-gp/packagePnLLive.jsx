import { useState, useMemo } from 'react';
import { ChevronDown, Download } from 'lucide-react';
import { Menu as DropdownMenu } from '../../../core/ux/Menu';
import { useGpBills } from '../../../core/useAccounting';
import { bc, inp, btnGh, card } from '../../../core/styleTokens';
import { PERIOD_OPTIONS as MONTH_PERIOD_OPTIONS, FY_YTD_MONTHS } from '../../../core/dates';
import { exportToCSV } from '../../../core/business-logic';
import { useMobile } from '../../../core/hooks';
import { Skeleton } from '../../../shell/primitives';

// Roll a set of holiday/MICE GP bills up into per-tour-code rows (rev/cost/gp/pax).
function rollup(bills) {
  const pkgMap = {};
  bills.forEach((b) => {
    const tourCode = b.tourCode || `TC-${b.dest?.slice(0, 3).toUpperCase() || 'OTH'}`;
    if (!pkgMap[tourCode]) pkgMap[tourCode] = { code: tourCode, dest: b.dest || 'Various', rev: 0, cost: 0, bks: 0, pax: 0 };
    pkgMap[tourCode].rev += (b.sell || 0); pkgMap[tourCode].cost += (b.cost || 0); pkgMap[tourCode].bks++; pkgMap[tourCode].pax += b.pax || 2;
  });
  return Object.values(pkgMap)
    .map((p) => ({ ...p, gp: p.rev - p.cost, gpPct: p.rev > 0 ? +(((p.rev - p.cost) / p.rev) * 100).toFixed(1) : 0, gpPerPax: p.pax > 0 ? Math.round((p.rev - p.cost) / p.pax) : 0 }))
    .sort((a, b) => b.gp - a.gp);
}

// One currency's package-P&L table (a single branch, or a single-branch view). Money is
// formatted in `cur` — a consolidated view renders one of these PER BRANCH, never a merged
// table (which would sum ₹ + $ revenue/cost into one meaningless figure).
function PkgTable({ rows, cur, heading, loading }) {
  const f = (n) => cur + Number(Math.round(n || 0)).toLocaleString((cur === '₹' || cur === '₨' || cur === 'Rs') ? 'en-IN' : 'en-US');
  return (
    <div style={{ marginBottom: heading ? 18 : 0 }}>
      {heading && (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, margin: '2px 2px 8px', borderBottom: '2px solid #d4a437', paddingBottom: 4 }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: '#0d1326' }}>{heading}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#9A9A9A' }}>· {cur}</span>
        </div>
      )}
      <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
          <thead><tr style={{ background: '#0d1326' }}>
            {['Tour Code', 'Destination', 'Bookings', 'Pax', 'Revenue', 'Cost', 'Gross Profit', 'GP%', 'GP/Pax', 'Rating'].map((h, i) => (
              <th key={i} style={{ padding: '9px 12px', textAlign: i >= 2 ? 'right' : 'left', color: '#d4a437', fontWeight: 700, fontSize: 9.5, whiteSpace: 'nowrap' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={r.code} style={{ borderBottom: '1px solid #dfe2e7', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
              <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 700, color: '#185FA5' }}>{r.code}</td>
              <td style={{ padding: '8px 12px', fontWeight: 500, color: '#0d1326' }}>{r.dest}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{r.bks}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{r.pax}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{f(r.rev)}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', color: '#A32D2D', fontVariantNumeric: 'tabular-nums' }}>{f(r.cost)}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#27500A', fontVariantNumeric: 'tabular-nums' }}>{f(r.gp)}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}><span style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 999, fontWeight: 800, background: r.gpPct >= 15 ? '#EAF3DE' : r.gpPct >= 8 ? '#FAEEDA' : '#FCEBEB', color: r.gpPct >= 15 ? '#27500A' : r.gpPct >= 8 ? '#854F0B' : '#A32D2D' }}>{r.gpPct}%</span></td>
              <td style={{ padding: '8px 12px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#384677' }}>{f(r.gpPerPax)}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right' }}>{r.gpPct >= 15 ? '⭐⭐⭐' : r.gpPct >= 10 ? '⭐⭐' : '⭐'}</td>
            </tr>
          ))}
          {loading && Array.from({ length: 5 }).map((_, i) => (
            <tr key={`sk-${i}`}><td colSpan={10} style={{ padding: '10px 12px' }}><Skeleton className="h-4 w-full" style={{ opacity: Math.max(0.4, 1 - i * 0.15) }} /></td></tr>
          ))}
          {!loading && rows.length === 0 && <tr><td colSpan={10} style={{ padding: '24px', textAlign: 'center', color: '#5a6691' }}>No holiday bookings for this period</td></tr>}
          </tbody>
          {rows.length > 0 && <tfoot><tr style={{ background: '#0d1326', borderTop: '2px solid #d4a437' }}>
            <td colSpan={4} style={{ padding: '9px 12px', fontWeight: 700, color: '#d4a437', fontSize: 12 }}>TOTAL</td>
            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{f(rows.reduce((s, r) => s + r.rev, 0))}</td>
            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: '#F7C1C1', fontVariantNumeric: 'tabular-nums' }}>{f(rows.reduce((s, r) => s + r.cost, 0))}</td>
            <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 800, color: '#d4a437', fontVariantNumeric: 'tabular-nums' }}>{f(rows.reduce((s, r) => s + r.gp, 0))}</td>
            <td colSpan={3} />
          </tr></tfoot>}
        </table>
      </div>
    </div>
  );
}

export function PackagePnL({ branch }) {
  const mob = useMobile(); // eslint-disable-line no-unused-vars
  const [period, setPeriod] = useState('YTD');
  const PERIODS = MONTH_PERIOD_OPTIONS;
  const FY_MONTHS = FY_YTD_MONTHS;
  // LIVE: per-booking GP list (GET /api/accounting/gp-bills, branch-scoped server-side),
  // filtered to Holiday/MICE packages. Each bill carries its own `branch`.
  const gpQ = useGpBills(branch);
  const bills = useMemo(() => (gpQ.data || []).filter((b) => (b.mod === 'Holiday' || b.mod === 'MICE') && (period === 'YTD' ? FY_MONTHS.includes(String(b.date || '').slice(0, 7)) : String(b.date || '').startsWith(period))), [gpQ.data, period, FY_MONTHS]);
  const isAll = !branch || branch === 'ALL' || branch?.code === 'ALL';

  // Consolidated: split the bills by branch and render one own-currency table each.
  const groups = useMemo(() => {
    if (!isAll) return null;
    const m = {};
    bills.forEach((b) => { const k = b.branch || '—'; (m[k] = m[k] || []).push(b); });
    return Object.keys(m).sort().map((k) => ({ branch: k, rows: rollup(m[k]) }));
  }, [bills, isAll]);

  const singleRows = isAll ? null : rollup(bills);
  const csvRows = isAll
    ? (groups || []).flatMap((g) => g.rows.map((r) => ({ branch: g.branch, ...r })))
    : (singleRows || []).map((r) => ({ branch: (branch && (branch.code || branch)) || '', ...r }));

  return (
    <div style={{ padding: '12px 10px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#FAEEDA', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>📦</div>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#0d1326' }}>Package P&amp;L by Tour Code</h2>
            <p style={{ margin: '2px 0 0', fontSize: 10.5, color: '#5a6691' }}>{bills.length} holiday bookings{isAll ? ` · ${(groups || []).length} branch(es) · each in its own currency` : ` · ${branch?.code || branch} · GP per package`}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <DropdownMenu
            ariaLabel="Period"
            menuRole="listbox"
            items={PERIODS.map((p) => ({ key: p.v, label: p.l, selected: period === p.v, onSelect: () => setPeriod(p.v) }))}
            renderTrigger={({ ref, toggle, triggerProps }) => (
              <button ref={ref} {...triggerProps} onClick={toggle} type="button"
                style={{ ...inp, width: 'auto', minHeight: 32, fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                {PERIODS.find((p) => p.v === period)?.l || period}
                <ChevronDown size={13} style={{ color: '#5b616e', flexShrink: 0 }} />
              </button>
            )}
          />
          <button onClick={() => exportToCSV(csvRows, ['branch', 'code', 'dest', 'bks', 'pax', 'rev', 'cost', 'gp', 'gpPct'], 'package-pnl.csv')} style={{ ...btnGh, fontSize: 11 }}><Download size={12} /> CSV</button>
        </div>
      </div>

      {isAll
        ? (groups.length === 0 && !gpQ.isLoading
            ? <div style={{ ...card, padding: 24, textAlign: 'center', color: '#5a6691' }}>No holiday bookings in any branch for this period.</div>
            : groups.map((g) => <PkgTable key={g.branch} rows={g.rows} cur={(bc({ code: g.branch }) || {}).cur || '₹'} heading={g.branch} loading={gpQ.isLoading} />))
        : <PkgTable rows={singleRows} cur={(bc(branch) || {}).cur || '₹'} heading={null} loading={gpQ.isLoading} />}
    </div>
  );
}
