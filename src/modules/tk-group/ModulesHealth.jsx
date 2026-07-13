import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSetupReadiness, getDevFindings, getSetupTasks } from './api/monitor';
import { headCards, overallHealth, scoreTone, howTo100 } from './utils/modulesHealth';
import { moduleHealthLabel, moduleHealthTone, needLabel, needTone } from './utils/setupReadiness';
import {
  TASK_USERS, assigneeLabel, assigneeTone, taskStatusTone, taskStatusLabel,
  devFindingRows, combineTasks, moduleGroups, partyRows, userCounts,
} from './utils/setupTaskList';
import { PageSection, ResponsiveGrid, Badge } from '../../shell/primitives';
import { KpiTile } from '../dashboard/components/cards/KpiTile';
import { DataTable } from '../../shell/DataTable';
import { BandError } from './BandError';
import { useCockpitFocus } from '../../store/cockpitFocus';
import { openDevByModule, ALL_ITEMS as DEV_ITEMS } from '../devControl/registry';

// ─── TK GROUP · FE · Modules Health (Control Tower — the single setup home) ───
// One surface for "is each module ready, and what's left to do?". The Task List tab
// was retired INTO this screen: the module scorecards sit on top; CLICKING a card
// scrolls to that module's section below, where its sub-module health sits next to
// the exact configuration tasks that need attention (with Complete → deep-links). A
// user filter (All / FM / Developer / Owner) turns it into a per-person worklist; the
// party-master completeness and the 75-sub-module coverage proof sit at the foot. Same
// live engine + branch scoping as before (follows the top TK Group selector).

const SCORE_HEX = { success: '#1a7f37', warning: '#9a6700', danger: '#b23b3b', neutral: '#57606a' };
const slug = (h) => String(h || '').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

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

// One sub-module's HEALTH line — status, meter, branch coverage, what it needs, and
// the readable path-to-100% (each step routed to where it is done).
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

// One configuration TASK line from the live punch-list (the retired Task List's rows).
function TaskLine({ r, setRoute }) {
  const go = (link) => (setRoute ? setRoute(link) : (window.location.href = link));
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-surface-border/60 py-1.5 text-xs">
      <Badge tone={r.branch === 'Central' ? 'neutral' : 'info'} size="sm">{r.branch}</Badge>
      <Badge tone={assigneeTone(r.assignee)} size="sm">{assigneeLabel(r.assignee)}</Badge>
      <span className="min-w-[160px] flex-1 font-medium text-ink">{r.label}</span>
      <span className="whitespace-nowrap font-mono text-[11px] text-ink-muted">{r.check}</span>
      <Badge tone={taskStatusTone(r.status)} size="sm">{taskStatusLabel(r.status)}</Badge>
      {r.status !== 'done' && r.link && (
        <button type="button" onClick={() => go(r.link)} className="whitespace-nowrap text-[12px] font-semibold text-accent hover:underline">
          Complete →
        </button>
      )}
    </div>
  );
}

function partyColumns(setRoute, link) {
  const go = () => (setRoute ? setRoute(link) : (window.location.href = link));
  return [
    { key: 'sr', header: 'SR', align: 'right', render: (r) => (
      <span className="tabular-nums text-[12px] font-semibold text-ink-subtle">{r.sr}</span>
    ) },
    { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-ink">{r.name}</span> },
    { key: 'branch', header: 'Branch', render: (r) => (
      <Badge tone={r.branch ? 'info' : 'neutral'} size="sm">{r.branch || 'ALL'}</Badge>
    ) },
    { key: 'missing', header: 'Details to fill', render: (r) => (
      <span className="text-[11.5px] text-ink">{(r.missing || []).join(' · ')}</span>
    ) },
    { key: 'status', header: 'Status', align: 'center', render: () => (
      <Badge tone="warning" size="sm">Incomplete</Badge>
    ) },
    { key: 'go', header: '', align: 'right', render: () => (
      <button type="button" onClick={go} className="whitespace-nowrap text-[12px] font-semibold text-accent hover:underline">Complete →</button>
    ) },
  ];
}

function ScopePill({ on, onClick, children, testId }) {
  return (
    <button type="button" onClick={onClick} data-testid={testId}
      className={`rounded-full border px-3 py-1 text-xs font-semibold ${on ? 'border-accent bg-accent text-white' : 'border-surface-border bg-surface text-ink-muted hover:border-accent hover:text-accent'}`}>
      {children}
    </button>
  );
}

export function ModulesHealth({ setRoute } = {}) {
  const focus = useCockpitFocus();
  const [branch, setBranch] = useState(focus || 'ALL');
  const [user, setUser] = useState('ALL');
  const [sp, setSp] = useSearchParams();
  const focusedHead = sp.get('head') || '';
  useEffect(() => { setBranch(focus || 'ALL'); }, [focus]);

  // Same caches as Setup Readiness · Task List · Dev Control — one fetch feeds all.
  const q = useQuery({ queryKey: ['tk', 'monitor', 'readiness'], queryFn: getSetupReadiness, staleTime: 60_000, refetchInterval: 300_000 });
  const tasksQ = useQuery({ queryKey: ['tk', 'monitor', 'setup-tasks'], queryFn: () => getSetupTasks(), staleTime: 30_000, refetchInterval: 60_000 });
  const devQ = useQuery({ queryKey: ['dev-control', 'status'], queryFn: getDevFindings, staleTime: 30_000 });
  const trackMap = {};
  (devQ.data || []).forEach((r) => { trackMap[r.itemId] = r; });

  const d = q.data || {};
  const td = tasksQ.data || {};
  const cards = headCards(d, branch, openDevByModule(trackMap));
  const all = overallHealth(cards);
  const branches = (d.byBranch || []).map((b) => b.branch).filter((b) => b !== 'Central');

  // Configuration punch-list (config tasks + dev findings), grouped head → sub-module,
  // scoped by the branch bar AND the user filter — the same shaping the Task List used.
  const tasks = combineTasks(td, devFindingRows(DEV_ITEMS, trackMap));
  const groups = moduleGroups(tasks, (td.coverage || {}).modules, branch, user);
  const groupByHead = new Map(groups.map((g) => [g.head, g]));
  const uCounts = userCounts(tasks, branch);
  const parties = partyRows(td, branch);
  const showParties = user === 'ALL' || user === 'FM';
  const pendingTotal = groups.reduce((s, g) => s + g.pending, 0);

  // One collapsible detail section per head — the health cards first, then any task
  // group with no health card ("Other configuration"). Only the FOCUSED section's body
  // renders (health + tasks), so the page stays short and clicking a card genuinely
  // jumps to just that module's attention list instead of pre-expanding all 11.
  const cardHeads = new Set(cards.map((c) => c.head));
  const detailSections = [
    ...cards.map((c) => ({ head: c.head, card: c, group: groupByHead.get(c.head) })),
    ...groups.filter((g) => !cardHeads.has(g.head)).map((g) => ({ head: g.head, card: null, group: g })),
  ];

  // Card → expand+scroll to that head's section; section header → toggle it.
  const focusHead = (head) => setSp((prev) => { const p = new URLSearchParams(prev); p.set('head', head); return p; });
  const toggleHead = (head) => setSp((prev) => {
    const p = new URLSearchParams(prev);
    if (slug(p.get('head') || '') === slug(head)) p.delete('head'); else p.set('head', head);
    return p;
  });
  useEffect(() => {
    if (!focusedHead) return;
    const el = typeof document !== 'undefined' && document.getElementById(`mh-sec-${slug(focusedHead)}`);
    if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusedHead]);

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

      {/* User worklist filter — folds the retired Task List's per-person lens in as a filter */}
      <div className="flex flex-wrap items-center gap-2" data-testid="tk-mh-userbar">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ink-subtle">User</span>
        {['ALL', ...TASK_USERS].map((u) => (
          <ScopePill key={u} on={user === u} onClick={() => setUser(u)} testId={`tk-mh-user-${u}`}>
            {u === 'ALL' ? 'All users' : assigneeLabel(u)} <span className="tabular-nums opacity-80">{uCounts[u] ?? 0}</span>
          </ScopePill>
        ))}
      </div>

      <ResponsiveGrid min="150px" gap="md" data-testid="tk-mh-kpis">
        <KpiTile label="Overall health" value={`${all.score}%`} sub={`grade ${all.grade}`} color="#1a1c22" />
        <KpiTile label="Sub-modules live" value={`${all.live}/${all.modules}`} color="#1a1c22" />
        <KpiTile label="Tasks to configure" value={String(pendingTotal)} color="#1a1c22" />
        <KpiTile label="Not started" value={String(all.dormant)} color="#1a1c22" />
        <KpiTile label="Modules with dev findings" value={String(all.dev)} color="#1a1c22" />
      </ResponsiveGrid>

      <PageSection title="How this reads">
        <p className="text-xs text-ink-muted">
          Each card is a <b>head module</b> scored on its sub-modules' live health. <b>Click a card</b> to jump to that
          module's section below, where its sub-module health sits next to the exact <b>configuration tasks that need
          attention</b> (each with a <b>Complete →</b> link to where it's done). Use the <b>User</b> filter for a
          per-person worklist — all configuration under <b>FM (Faiz)</b>, development under <b>Developer</b> (cleared in
          Dev Control), the two activations under <b>Owner</b>. Scope follows the branch bar — branchwise, never blended.
        </p>
      </PageSection>

      {(q.isLoading || tasksQ.isLoading) && (
        <p className="text-xs text-ink-subtle">Computing module health from the live books…</p>
      )}

      {/* A failed TASKS load must not masquerade as "all Ready" — surface it (health still shows). */}
      {tasksQ.isError && (
        <p className="text-xs text-danger">
          Couldn't load the configuration tasks — health scores are shown, but task counts may be incomplete.{' '}
          <button type="button" onClick={() => tasksQ.refetch()} className="font-semibold underline">Retry</button>
        </p>
      )}

      {/* ── Scoreboard: click a card to focus its section below ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="tk-mh-cards">
        {cards.map((c) => {
          const g = groupByHead.get(c.head);
          const pending = g ? g.pending : 0;
          return (
            <button key={c.head} type="button" onClick={() => focusHead(c.head)}
              aria-controls={`mh-sec-${slug(c.head)}`} data-testid={`tk-mh-card-${c.head}`}
              className={`rounded-xl border bg-surface p-4 text-left shadow-pop transition-colors ${focusedHead && slug(focusedHead) === slug(c.head) ? 'border-accent' : 'border-surface-border hover:border-accent'}`}>
              <div className="flex items-center justify-between gap-3">
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
                <ScoreRing score={c.score} grade={c.grade} />
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-surface-border/60 pt-2 text-[11.5px]">
                <span className="text-ink-subtle">{pending > 0 ? 'needs attention' : 'nothing to configure'}</span>
                <span className={`font-semibold ${pending > 0 ? 'text-danger' : 'text-success'}`}>
                  {pending > 0 ? `${pending} to configure →` : 'Ready ✓'}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Per-module detail: collapsible; only the focused section's body renders ── */}
      <div className="grid gap-3" data-testid="tk-mh-sections">
        {detailSections.map((sec) => {
          const focused = focusedHead && slug(focusedHead) === slug(sec.head);
          const pendingTasks = sec.group ? sec.group.modules.flatMap((m) => m.pending) : [];
          const doneTasks = sec.group ? sec.group.modules.flatMap((m) => m.done) : [];
          return (
            <div key={sec.head} id={`mh-sec-${slug(sec.head)}`} data-testid={`tk-mh-section-${slug(sec.head)}`}
              className={`scroll-mt-4 rounded-xl border bg-surface ${focused ? 'border-accent ring-2 ring-accent/30' : 'border-surface-border'}`}>
              <button type="button" onClick={() => toggleHead(sec.head)} aria-expanded={!!focused}
                data-testid={`tk-mh-sechead-${slug(sec.head)}`}
                className="flex w-full items-center justify-between gap-3 p-4 text-left">
                <span className="text-[13px] font-bold text-ink">{sec.head}</span>
                <span className="flex items-center gap-3 text-[11px] text-ink-subtle">
                  {sec.card && <span>health {sec.card.score == null ? '—' : `${sec.card.score}%`}</span>}
                  <span className={pendingTasks.length ? 'font-semibold text-danger' : 'text-success'}>
                    {pendingTasks.length ? `${pendingTasks.length} to configure` : 'Ready ✓'}
                  </span>
                  <span className={`transition-transform ${focused ? 'rotate-90' : ''}`}>›</span>
                </span>
              </button>

              {focused && (
                <div className="px-4 pb-4" data-testid={`tk-mh-body-${slug(sec.head)}`}>
                  {sec.card && (
                    <div className="border-t border-surface-border/60">
                      {sec.card.rows.map((r) => <SubModuleRow key={r.id} r={r} setRoute={setRoute} />)}
                    </div>
                  )}
                  {(pendingTasks.length > 0 || doneTasks.length > 0) ? (
                    <div className="mt-3 rounded-lg bg-surface-alt/40 p-3">
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-ink-subtle">
                        Configuration tasks{user !== 'ALL' ? ` · ${assigneeLabel(user)}` : ''}
                      </div>
                      {pendingTasks.map((r) => <TaskLine key={r.id} r={r} setRoute={setRoute} />)}
                      {doneTasks.map((r) => <TaskLine key={r.id} r={r} setRoute={setRoute} />)}
                    </div>
                  ) : (
                    <p className="mt-3 text-xs text-ink-subtle">Nothing to configure here in this scope. 🎉</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Master completeness (foot) — the retired Task List's party workstream ── */}
      {showParties && (
        <PageSection title="Master completeness — details to fill" data-testid="tk-mh-parties">
          <p className="mb-3 text-xs text-ink-muted">
            Entry or no entry, every client, supplier and employee must have complete master details. Each row lists
            exactly which details are missing; it clears the moment they are saved. Scope follows the Branch bar.
          </p>
          <div className="grid gap-4">
            <DataTable
              title={`Customers with missing details (${parties.customers.items.length})${parties.customers.capped ? ' — first page' : ''}`}
              columns={partyColumns(setRoute, '/masters/customers')}
              rows={parties.customers.items}
              getRowKey={(r) => `${r.branch}:${r.name}:${r.sr}`}
              loading={tasksQ.isLoading}
              emptyMessage="Every customer in this scope has complete details. 🎉"
              searchable showDensityToggle={false} zebra
            />
            <DataTable
              title={`Suppliers with missing details (${parties.suppliers.items.length})${parties.suppliers.capped ? ' — first page' : ''}`}
              columns={partyColumns(setRoute, '/masters/suppliers')}
              rows={parties.suppliers.items}
              getRowKey={(r) => `${r.branch}:${r.name}:${r.sr}`}
              loading={tasksQ.isLoading}
              emptyMessage="Every supplier in this scope has complete details. 🎉"
              searchable showDensityToggle={false} zebra
            />
            <DataTable
              title={`Employees with missing details (${parties.employees.items.length})${parties.employees.capped ? ' — first page' : ''}`}
              columns={partyColumns(setRoute, '/hr/employees')}
              rows={parties.employees.items}
              getRowKey={(r) => `${r.branch}:${r.name}:${r.sr}`}
              loading={tasksQ.isLoading}
              emptyMessage="Every active employee in this scope has complete details. 🎉"
              searchable showDensityToggle={false} zebra
            />
          </div>
        </PageSection>
      )}

      {/* ── Coverage proof (foot) — every sub-module accounted for ── */}
      {td.coverage && (
        <PageSection title={`Module scan coverage — ${td.coverage.total}/75 sub-modules accounted for`}>
          <p className="mb-3 text-xs text-ink-muted">
            Proof the scan reaches the whole ERP: every sub-module is covered by a <b>register task</b>,
            <b> auto-scanned</b> branch-wise, is <b>system machinery</b>, a <b>transaction surface</b>,
            <b> manual reconciliation</b>, or <b>CRM-side</b>.
          </p>
          <div className="grid gap-2" data-testid="tk-mh-coverage">
            {[...new Set((td.coverage.modules || []).map((m) => m.head))].map((head) => (
              <div key={head} className="flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="w-full font-bold text-ink sm:w-56">{head}</span>
                {(td.coverage.modules || []).filter((m) => m.head === head).map((m) => (
                  <span key={m.id} title={m.via}
                    className={`rounded-full border px-2 py-0.5 ${m.via === 'task' ? 'border-transparent bg-accent/10 text-accent' : m.via === 'scan' ? 'border-transparent bg-info/10 text-info' : 'border-surface-border text-ink-subtle'}`}>
                    {m.name}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </PageSection>
      )}
    </div>
  );
}
