import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTrend } from './api/monitor';
import { trendKpis, branchRows, branchMax, directionTone, directionGlyph, trendVerdict, focusView } from './utils/trend';
import { ResponsiveGrid, Badge } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { BandError } from './BandError';
import { useCockpitFocus } from '../../store/cockpitFocus';

// ─── TK GROUP · FE · Scrutiny Trend (is data quality improving?) ─────────────
// A compact Control-Tower band from the alert lifecycle: per branch, issues OPENED
// (raised) vs FIXED (cleared) over the last 8 weeks, net direction, open-now and
// average time-to-fix. Shows whether each branch is getting cleaner or dirtier —
// progress, not just today's number. Live; dormant-safe.

const OPENED = '#b23b3b'; // raised
const FIXED = '#1a7a4c';  // cleared

/** 8 tiny week columns — opened (red) above, fixed (green) below a shared baseline. */
function WeekBars({ branch }) {
  const max = branchMax(branch);
  return (
    <div className="flex items-end gap-[3px]" style={{ height: 34 }}>
      {(branch.weeks || []).map((w, i) => (
        <div key={i} className="flex flex-col justify-end" style={{ width: 7 }} title={`${w.weekStart}: +${w.opened || 0} opened / −${w.fixed || 0} fixed`}>
          <span style={{ height: `${((w.opened || 0) / max) * 16}px`, background: OPENED, borderRadius: '2px 2px 0 0', minHeight: w.opened ? 2 : 0 }} />
          <span style={{ height: `${((w.fixed || 0) / max) * 16}px`, background: FIXED, borderRadius: '0 0 2px 2px', minHeight: w.fixed ? 2 : 0, marginTop: 1 }} />
        </div>
      ))}
    </div>
  );
}

export function ScrutinyTrend() {
  const focus = useCockpitFocus();
  const q = useQuery({ queryKey: ['tk', 'monitor', 'trend'], queryFn: getTrend, staleTime: 60_000, refetchInterval: 300_000 });
  const d = focusView(q.data || {}, focus); // narrow to the spotlighted branch (ALL = group)
  const kpis = trendKpis(d, focus);
  const rows = branchRows(d);
  const dir = (d.group && d.group.direction) || 'flat';

  // A failed roll-up must not read as a calm "flat / zero" trend.
  if (q.isError) return <BandError label="scrutiny trend" onRetry={q.refetch} />;

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <Badge tone={directionTone(dir)} size="sm">{directionGlyph(dir)} {dir}</Badge>
        <span className="text-xs text-ink-muted">{trendVerdict(d)}</span>
      </div>

      <ResponsiveGrid min="140px" gap="md" data-testid="tk-trend-kpis">
        {kpis.map((k) => (
          <KpiTile key={k.key} label={k.label} value={k.value} sub={k.sub}
            color={k.key === 'fixed' ? FIXED : k.key === 'opened' ? OPENED : '#1a1c22'} />
        ))}
      </ResponsiveGrid>

      <div className="grid gap-1.5">
        {rows.map((b) => (
          <div key={b.branch} className="flex items-center gap-3 rounded-lg border border-surface-border bg-surface px-3 py-2">
            <b className="w-14 text-ink">{b.branch}</b>
            <Badge tone={directionTone(b.direction)} size="sm">{directionGlyph(b.direction)}</Badge>
            <WeekBars branch={b} />
            <span className="ml-auto flex items-center gap-3 text-[11px] text-ink-muted">
              <span title="open now"><b className="tabular-nums text-ink">{b.openNow}</b> open</span>
              <span title="opened / fixed over 8 weeks" className="tabular-nums"><span style={{ color: OPENED }}>+{b.opened}</span> / <span style={{ color: FIXED }}>−{b.fixed}</span></span>
              {b.avgFixHrs > 0 && <span title="average time to fix" className="tabular-nums">{b.avgFixHrs}h fix</span>}
            </span>
          </div>
        ))}
        {!rows.length && <p className="text-xs text-ink-subtle">No trend history yet — it builds as branches are scanned.</p>}
      </div>

      <p className="text-[11px] text-ink-subtle">Red = issues opened, green = issues fixed, per week (last 8). A branch is improving when it clears more than it raises.</p>
    </div>
  );
}
