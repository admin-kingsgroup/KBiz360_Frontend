import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getSetupReadiness, getDevFindings } from './api/monitor';
import { headCards, overallHealth, scoreTone, howTo100 } from './utils/modulesHealth';
import { moduleHealthLabel, moduleHealthTone, needLabel, needTone } from './utils/setupReadiness';
import { PageSection, ResponsiveGrid, Badge } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { BandError } from './BandError';
import { useCockpitFocus } from '../../store/cockpitFocus';
import { openDevByModule } from '../devControl/registry';

// ─── TK GROUP · FE · Modules Health (Control Tower, after Task List) ──────────
// The module-wise scorecard: all 11 head modules with a composite health score and
// grade; CLICK a card to open the health of each of its sub-modules (75 total) —
// status, meter, branch coverage, what it needs (config vs development) and the
// plain-words remark. Same live engine as Setup Readiness (adoption milestones
// counted against the real DB, 5-min refetch + fresh on mount) joined with the
// dev registry, and the same branch scoping: follows the top TK Group selector,
// drills within ALL, branchwise never blended.

const SCORE_HEX = { success: '#1a7f37', warning: '#9a6700', danger: '#b23b3b', neutral: '#57606a' };

function ScoreRing({ score, grade }) {
  const tone = scoreTone(score);
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[30px] font-extrabold leading-none tabular-nums" style={{ color: SCORE_HEX[tone] }}>
        {score == null ? '—' : `${score}%`}
      </span>
      <span className="rounded-md px-1.5 py-0.5 text-[11px] font-extrabold" style={{ color: SCORE_HEX[tone], background: `${SCORE_HEX[tone]}1a` }}>
        {grade}
      </span>
    </div>
  );
}

function Meter({ pct }) {
  if (pct == null) return <span className="text-[11px] text-ink-subtle">no live meter</span>;
  const tone = scoreTone(pct);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-alt">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: SCORE_HEX[tone] }} />
      </div>
      <span className="tabular-nums text-[11px] font-semibold text-ink-muted">{pct}%</span>
    </div>
  );
}

function SubModuleRow({ r, setRoute }) {
  const steps = howTo100(r);
  const done = r.health === 'live';
  return (
    <div className="border-t border-surface-border/60 px-1 py-2 text-xs">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <div className="min-w-[180px] flex-1 font-medium text-ink">{r.name}</div>
        <Badge tone={moduleHealthTone(r.health)} size="sm">{moduleHealthLabel(r.health, r.kind)}</Badge>
        <Meter pct={r.pct} />
        {r.totalUnits > 0 && (
          <span className="tabular-nums text-[11px] text-ink-muted">{r.liveUnits}/{r.totalUnits} branches live</span>
        )}
        <Badge tone={needTone(r.need)} size="sm">{needLabel(r.need)}</Badge>
        {r.devItems.length > 0 && <Badge tone="info" size="sm">{r.devItems.length} dev</Badge>}
        {r.link && (
          <button type="button" onClick={() => (setRoute ? setRoute(r.link) : (window.location.href = r.link))}
            className="ml-auto whitespace-nowrap text-[12px] font-semibold text-accent hover:underline">
            Open →
          </button>
        )}
      </div>
      {/* Readable path to 100% — the exact actions, in order, each routed to where it is done */}
      <div className="mt-1.5 rounded-md bg-surface-alt px-2.5 py-1.5 text-[11px] leading-relaxed text-ink-muted">
        <span className="font-bold uppercase tracking-wide text-[10px] text-ink-subtle">{done ? 'Status' : 'To reach 100%'}</span>
        <ul className="mt-0.5 list-disc pl-4">
          {steps.map((s, i) => (
            <li key={i}>
              {s.text}
              {s.link && (
                <button type="button" onClick={() => (setRoute ? setRoute(s.link) : (window.location.href = s.link))}
                  className="ml-1.5 whitespace-nowrap font-semibold text-accent hover:underline">
                  Do it →
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ModulesHealth({ setRoute } = {}) {
  const focus = useCockpitFocus();
  const [branch, setBranch] = useState(focus || 'ALL');
  const [open, setOpen] = useState(null); // which head card is expanded
  useEffect(() => { setBranch(focus || 'ALL'); }, [focus]);

  // Same caches as Setup Readiness + Dev Control — one fetch feeds all lenses.
  const q = useQuery({ queryKey: ['tk', 'monitor', 'readiness'], queryFn: getSetupReadiness, staleTime: 60_000, refetchInterval: 300_000 });
  const devQ = useQuery({ queryKey: ['dev-control', 'status'], queryFn: getDevFindings, staleTime: 30_000 });
  const trackMap = {};
  (devQ.data || []).forEach((r) => { trackMap[r.itemId] = r; });

  const d = q.data || {};
  const cards = headCards(d, branch, openDevByModule(trackMap));
  const all = overallHealth(cards);
  const branches = (d.byBranch || []).map((b) => b.branch).filter((b) => b !== 'Central');

  if (q.isError) return <BandError label="modules health" onRetry={q.refetch} />;

  return (
    <div className="grid gap-4">
      {focus === 'ALL' && branches.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" data-testid="tk-mh-branchbar">
          <span className="text-[11px] font-bold uppercase tracking-wide text-ink-subtle">Branch</span>
          {['ALL', ...branches].map((b) => (
            <button key={b} type="button" onClick={() => setBranch(b)} data-testid={`tk-mh-branch-${b}`}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${branch === b ? 'border-accent bg-accent text-white' : 'border-surface-border bg-surface text-ink-muted hover:border-accent hover:text-accent'}`}>
              {b === 'ALL' ? 'All' : b}
            </button>
          ))}
        </div>
      )}

      <ResponsiveGrid min="150px" gap="md" data-testid="tk-mh-kpis">
        <KpiTile label="Overall health" value={`${all.score}%`} sub={`grade ${all.grade}`} color="#1a1c22" />
        <KpiTile label="Sub-modules live" value={`${all.live}/${all.modules}`} color="#1a1c22" />
        <KpiTile label="Partly set up" value={String(all.partial)} color="#1a1c22" />
        <KpiTile label="Not started" value={String(all.dormant)} color="#1a1c22" />
        <KpiTile label="Modules with dev findings" value={String(all.dev)} color="#1a1c22" />
      </ResponsiveGrid>

      <PageSection title="How the scorecard reads">
        <p className="text-xs text-ink-muted">
          Each card is a <b>head module</b>; its score averages the live health meters of its sub-modules
          (adoption milestones counted against the real DB — system/engine machinery without a meter never drags a
          score). <b>Click a card</b> to open the health of every sub-module: status, meter, branch coverage, what it
          needs (configuration → Task List · development → Dev Control) and the fix remark. Scope follows the branch
          bar — branchwise, never blended.
        </p>
      </PageSection>

      {q.isLoading && (
        <p className="text-xs text-ink-subtle">Computing module health from the live books…</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="tk-mh-cards">
        {cards.map((c) => {
          const expanded = open === c.head;
          return (
            <div key={c.head}
              className={`rounded-xl border bg-surface p-4 shadow-pop transition-colors ${expanded ? 'border-accent sm:col-span-2 lg:col-span-3' : 'border-surface-border'}`}>
              <button type="button" onClick={() => setOpen(expanded ? null : c.head)}
                aria-expanded={expanded} data-testid={`tk-mh-card-${c.head}`}
                className="flex w-full items-center justify-between gap-3 text-left">
                <div>
                  <div className="text-[13px] font-bold text-ink">{c.head}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                    <Badge tone="success" size="sm">{c.tally.live} live</Badge>
                    {c.tally.partial > 0 && <Badge tone="warning" size="sm">{c.tally.partial} partial</Badge>}
                    {c.tally.dormant > 0 && <Badge tone="danger" size="sm">{c.tally.dormant} not started</Badge>}
                    {c.tally.dev > 0 && <Badge tone="info" size="sm">{c.tally.dev} dev</Badge>}
                    <span className="text-ink-subtle">{c.metered}/{c.total} metered</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <ScoreRing score={c.score} grade={c.grade} />
                  <span className={`text-ink-subtle transition-transform ${expanded ? 'rotate-90' : ''}`}>›</span>
                </div>
              </button>

              {expanded && (
                <div className="mt-3" data-testid="tk-mh-drill">
                  {c.rows.map((r) => <SubModuleRow key={r.id} r={r} setRoute={setRoute} />)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
