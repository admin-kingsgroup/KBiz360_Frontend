import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSetupReadiness } from './api/monitor';
import { readinessKpis, readinessRows, branchRows } from './utils/setupReadiness';
import { PageSection, ResponsiveGrid } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { BandError } from './BandError';
import { ModuleReadinessMap } from './ModuleReadinessMap';
import { useCockpitFocus } from '../../store/cockpitFocus';

// ─── TK GROUP · FE · Setup / Configuration Readiness (on the Control Tower) ───
// The per-branch MODULE GO-LIVE MAP: every ERP module scored against its live setup
// milestones (masters created? · limits/terms set? · has data this year?), so you can
// see at a glance how much of each branch is actually live. Rides the live adoption
// engine (60s stale / 5-min refetch) — a module turns live the moment the data is
// entered; nothing here is hand-ticked. Branchwise, never blended. Read-only.
//
// This tab is the VISUAL overview ONLY. The actionable, owned per-item to-do list
// (what's missing · who owns it · "set up →") lives in the **Task List** tab — the
// single canonical place those config tasks are tracked, so the two never drift.
//
// A branch SEPARATOR sits on top (like TK Group Central): pick a branch and the map +
// counts re-scope to it, so the whole Tower stays on one branch.

const KPI_COLOR = { pending: '#1a1c22', error: '#b23b3b', warn: '#a86a10', branches: '#1a1c22' };

export function SetupReadiness({ setRoute } = {}) {
  const q = useQuery({ queryKey: ['tk', 'monitor', 'readiness'], queryFn: getSetupReadiness, staleTime: 60_000, refetchInterval: 300_000 });
  const d = q.data || {};
  const allRows = readinessRows(d);   // used only for the branch bar's group-total count
  const branches = branchRows(d);

  // The in-tab branch bar follows the top TK Group Central selector (cockpit Focus):
  // it starts on the spotlighted branch and re-syncs when the top selector changes, so
  // the whole Tower stays on one branch. Within 'ALL' the bar still lets you drill in.
  const focus = useCockpitFocus();
  const [branch, setBranch] = useState(focus || 'ALL');
  useEffect(() => { setBranch(focus || 'ALL'); }, [focus]);
  const cur = branches.find((b) => b.branch === branch);
  const kpis = readinessKpis(d, branch); // tiles follow the selected branch, matching the map + Overview

  // Placed after the hooks above (useState) to keep hook order stable. A failed
  // roll-up must not read as an honest "nothing pending / all set up".
  if (q.isError) return <BandError label="setup readiness" onRetry={q.refetch} />;

  return (
    <div className="grid gap-4">
      <ResponsiveGrid min="150px" gap="md" data-testid="tk-readiness-kpis">
        {kpis.map((k) => (
          <KpiTile key={k.key} label={k.label} value={k.value} sub={k.sub}
            color={(k.key === 'error' && Number(k.value) > 0) || (k.key === 'warn' && Number(k.value) > 0) ? KPI_COLOR[k.key] : '#1a1c22'} />
        ))}
      </ResponsiveGrid>

      {/* Branch separator — only when NOT spotlighted from the top selector (which is
          then the single branch control); within 'ALL' it lets you drill into one branch. */}
      {focus === 'ALL' && branches.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" data-testid="tk-readiness-branchbar">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-subtle">Branch</span>
          <button type="button" onClick={() => setBranch('ALL')}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${branch === 'ALL' ? 'border-accent bg-accent text-white' : 'border-surface-border bg-surface text-ink-muted hover:border-accent hover:text-accent'}`}>
            All <span className="tabular-nums opacity-80">{allRows.length}</span>
          </button>
          {branches.map((b) => (
            <button key={b.branch} type="button" onClick={() => setBranch(b.branch)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${branch === b.branch ? 'border-accent bg-accent text-white' : 'border-surface-border bg-surface text-ink-muted hover:border-accent hover:text-accent'}`}>
              {b.branch} <span className="tabular-nums opacity-80">{b.pending}</span>
            </button>
          ))}
          {cur && (
            <span className="ml-1 text-[11px] text-ink-subtle">
              <b className="tabular-nums text-ink-muted">{cur.live}</b> / {cur.total} modules live
            </span>
          )}
        </div>
      )}

      <PageSection title="How readiness is tracked">
        <p className="text-xs text-ink-muted">
          Each module is checked against its live setup milestones (masters created? · limits/terms set? · has data this year?).
          A module reads as pending until every milestone is met, then it turns live automatically — nothing is hand-ticked.
          <b> Not started</b> = no data entered yet · <b>Partly set up</b> = partly configured · <b>Live</b> = fully set up.
          The actionable, owned to-do list (what's missing · who owns it · where to set it up) lives in the <b>Task List</b> tab.
        </p>
      </PageSection>

      {/* The whole ERP as a setup checklist: 11 head modules · 75 sub-modules, each
          with live health + what it needs (manual configuration / development / both)
          and the fix narration on expand. Follows the same branch scope as above. */}
      <ModuleReadinessMap data={d} branch={branch} setRoute={setRoute} />
    </div>
  );
}
