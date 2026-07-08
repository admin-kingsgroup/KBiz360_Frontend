import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHealthScorecard } from './api/monitor';
import { scoreColor, gradeTone, verdict, subScores, branchRows, groupScore } from './utils/healthScore';
import { PageSection, ResponsiveGrid, Badge } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { DataTable } from '../../shell/DataTable';

// ─── TK GROUP · FE · ERP Health Scorecard ────────────────────────────────────
// One composite health % + letter grade per branch (and group), blending the three live
// lenses: Health (50%) + Close-Readiness (30%) + Adoption (20%). Read-only; branchwise,
// never blended amounts — the group figure is the mean of the branch sub-scores.

// A compact score ring (conic-gradient) with the value in the centre.
function Ring({ score, size = 120 }) {
  const col = scoreColor(score);
  return (
    <div className="relative grid flex-none place-items-center rounded-full" style={{ width: size, height: size, background: `conic-gradient(${col} ${score}%, var(--surface-alt) 0)` }}>
      <div className="absolute grid place-items-center rounded-full bg-surface" style={{ inset: 10 }}>
        <span className="tabular-nums text-3xl font-extrabold" style={{ color: col }}>{score}</span>
        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-subtle">/ 100</span>
      </div>
    </div>
  );
}

const cell = (v, suffix = '') => <span className="tabular-nums font-semibold" style={{ color: scoreColor(v) }}>{v}{suffix}</span>;

export function HealthScorecard() {
  const q = useQuery({ queryKey: ['tk', 'monitor', 'scorecard'], queryFn: getHealthScorecard, staleTime: 60_000 });
  const d = q.data || {};
  const g = groupScore(d);
  const subs = subScores(d);
  const rows = branchRows(d);

  const columns = [
    { key: 'branch', header: 'Branch', render: (r) => <b className="text-ink">{r.branch}</b> },
    { key: 'composite', header: 'ERP Health', align: 'center', render: (r) => (
      <span className="inline-flex items-center gap-2"><span className="tabular-nums text-base font-extrabold" style={{ color: scoreColor(r.composite) }}>{r.composite}</span><Badge tone={gradeTone(r.grade)} size="sm">{r.grade}</Badge></span>
    ) },
    { key: 'health', header: 'Health (50%)', align: 'right', num: true, render: (r) => cell(r.health) },
    { key: 'close', header: 'Close (30%)', align: 'right', num: true, render: (r) => cell(r.close) },
    { key: 'adoption', header: 'Adoption (20%)', align: 'right', num: true, render: (r) => cell(r.adoption, '%') },
    { key: 'verdict', header: '', render: (r) => <span className="text-[11px] text-ink-muted">{verdict(r.composite)}</span> },
  ];

  return (
    <div className="grid gap-4">
      {/* Group composite hero */}
      <div className="flex flex-col items-center gap-5 rounded-lg border border-surface-border bg-surface p-5 shadow-sm tablet:flex-row">
        <Ring score={g.composite} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-ink">Group ERP Health</h2>
            <Badge tone={gradeTone(g.grade)} size="md">Grade {g.grade}</Badge>
            <span className="text-sm font-semibold" style={{ color: scoreColor(g.composite) }}>{verdict(g.composite)}</span>
          </div>
          <p className="mt-1 text-[13px] text-ink-muted">Composite of the three live lenses, weighted so correctness leads: <b>50% Health + 30% Close-Readiness + 20% Adoption</b>. Branchwise — the group figure is the mean of the branches, never a blended total.</p>
          <ResponsiveGrid min="140px" gap="md" className="mt-3">
            {subs.map((s) => (
              <KpiTile key={s.key} label={s.label} value={`${s.value}${s.suffix}`} sub={`weight ${s.weight} · ${s.hint}`} color={scoreColor(s.value)} />
            ))}
          </ResponsiveGrid>
        </div>
      </div>

      <PageSection title="Branch scorecard — worst first">
        <DataTable
          columns={columns}
          rows={rows}
          getRowKey={(r) => r.branch}
          loading={q.isLoading}
          isError={q.isError}
          emptyMessage="No scorecard data."
          showDensityToggle={false}
          zebra
        />
        <p className="mt-2 text-[11px] text-ink-subtle">Grades: A ≥ 85 · B ≥ 70 · C ≥ 55 · D ≥ 40 · F &lt; 40. Each sub-score is the same one shown on Group Health, Close Readiness and ERP Adoption — this just blends them into one figure per branch.</p>
      </PageSection>
    </div>
  );
}
