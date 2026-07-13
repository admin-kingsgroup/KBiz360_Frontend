import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck, ChevronRight, CalendarClock, BookOpenCheck, ListChecks, AlertTriangle, Sparkles } from 'lucide-react';
import { getScopeTree, getSummary, getPending } from './api';
import { useCockpitFocus } from '../../store/cockpitFocus';
import { BRANCHES, branchCodeOf, TIERS, tierOf, statusMeta, tierProgress, chainProgress, fmtAmt, currencyOf, visibleTiers, certPathFor, hubPathFor, reportPathFor, tierMenuName } from './utils';
import { PageSection, Badge, Button, EmptyState, LoadingState, ErrorState } from '../../shell/primitives';
import { CertificateDrawer } from './CertificateDrawer';

// ─── Reconciliation Hub — the full-view dashboard, one page per tier ─────────
// The read-only OVERVIEW of a tier: every ledger that must reconcile this period
// and its live status (Pending → Reconciled → Signed → Locked), the branch-wise
// readiness across the group, and the attention list of what's still outstanding.
// The Hub is where you WATCH; the Certification register (certPathFor) is where
// you WORK — every drill-in links across. The tier is fixed by the route
// (Reconciliation Hub ▸ Weekly / Monthly / Quarterly / Yearly Reconciliation);
// branch scope follows the top TK sub-branch selector, never an in-page picker.

function Kpi({ label, value, sub, tone = 'ink', title }) {
  const toneClass = { ink: 'text-ink', danger: 'text-danger', warning: 'text-warning', success: 'text-success', muted: 'text-ink-subtle' }[tone] || 'text-ink';
  return (
    <div className="rounded-brand border border-surface-border bg-surface p-3 text-left shadow-card" title={title}>
      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-subtle">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular-nums ${toneClass}`}>{value}</div>
      {sub ? <div className="mt-0.5 truncate text-xs text-ink-muted">{sub}</div> : null}
    </div>
  );
}

// Reason a ledger is on the attention list (most urgent first).
function attentionReason(c) {
  const openEx = (c.exceptions || []).filter((e) => !e.resolved).length;
  if (openEx > 0) return { tone: 'danger', label: `${openEx} open exception${openEx === 1 ? '' : 's'}` };
  if (c.snapshot && c.snapshot.frozenAt && Number(c.snapshot.difference) !== 0) return { tone: 'danger', label: 'difference ≠ 0' };
  if (c.status === 'pending') return { tone: 'warning', label: 'not generated' };
  if (c.status === 'open') return { tone: 'warning', label: 'not reconciled' };
  if (c.status === 'reconciled') return { tone: 'info', label: 'awaiting signatures' };
  return null;
}

export function ReconciliationHub({ branch: appBranch, setRoute, currentUser, tier: fixedTier }) {
  const appCode = branchCodeOf(appBranch);
  const focus = useCockpitFocus();
  // Group mode = no specific branch spotlighted up top → show the branch-wise
  // matrix and default the single-branch checklist to BOM. A spotlighted branch
  // scopes the whole page to it.
  const groupMode = !appCode && (!BRANCHES.includes(focus));
  const branch = appCode || (BRANCHES.includes(focus) ? focus : 'BOM');
  const summaryBranch = appCode || (BRANCHES.includes(focus) ? focus : 'ALL');
  const tierKey = TIERS.some((t) => t.key === fixedTier) ? fixedTier : 'weekly';
  const tier = tierOf(tierKey);
  const [openId, setOpenId] = useState(null);

  // Branch Accountant sees the WEEKLY hub only — central tiers are worked from
  // TK Group Central. An explicit Page-Visibility grant opens a tier read-only.
  const tiers = visibleTiers(currentUser?.role);
  const granted = Array.isArray(currentUser?.granted) ? currentUser.granted : [];
  const tierAllowed = tiers.some((t) => t.key === tierKey) || granted.includes(hubPathFor(tierKey));

  const { data: summary } = useQuery({ queryKey: ['recon-certs', 'summary', summaryBranch], queryFn: () => getSummary({ branch: summaryBranch }), enabled: tierAllowed });
  const { data: pendingData } = useQuery({ queryKey: ['recon-certs', 'pending', summaryBranch], queryFn: () => getPending({ branch: summaryBranch }), enabled: tierAllowed });
  const period = summary?.periods?.[tierKey];

  const { data: scope, isLoading, isError, refetch } = useQuery({
    queryKey: ['recon-certs', 'scope', branch, tierKey, period || ''],
    queryFn: () => getScopeTree({ branch, tier: tierKey, period }),
    enabled: tierAllowed,
  });

  // Direct-URL guard — a Branch Accountant on a central tier gets the rule,
  // not a broken page (the menu already hides these entries).
  if (!tierAllowed) {
    return (
      <div className="mx-auto w-full grid gap-4 px-4 py-4 tablet:px-6 tablet:py-5 desktop:px-8">
        <h1 className="kbiz-page-title">{tierMenuName(tierKey)} Reconciliation</h1>
        <EmptyState title="Central closing tier"
          hint="The Branch Accountant watches the WEEKLY cycle only — Month-End, Quarterly and Year-End are overseen from TK Group Central by AE / FM / Director / Owner."
          action={<Button variant="secondary" onClick={() => setRoute && setRoute('/reconciliation/hub/weekly')}>Open Weekly Reconciliation</Button>} />
      </div>
    );
  }

  const counts = scope?.counts || {};
  const total = counts.total || 0;
  const done = counts.done || 0;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const groups = scope?.groups || [];
  const empty = !isLoading && !isError && total === 0;

  // Weekly cycles carry a Friday deadline — surface it (and whether it's overdue).
  const today = new Date().toISOString().slice(0, 10);
  const tierRows = (pendingData?.rows || []).filter((r) => r.tier === tierKey);
  const dueRow = tierRows.find((r) => !r.upcoming) || tierRows[0];
  const overdue = !!(dueRow && dueRow.dueOn && dueRow.dueOn < today && done < total);

  // Attention list — flatten the scope tree, keep only ledgers that still need
  // something, most urgent first (exceptions / non-zero difference → not started).
  const flat = groups.flatMap((g) => g.subGroups.flatMap((sg) => sg.items));
  const attention = flat
    .map((c) => ({ c, r: attentionReason(c) }))
    .filter((x) => x.r)
    .sort((a, b) => ({ danger: 0, warning: 1, info: 2 }[a.r.tone] - { danger: 0, warning: 1, info: 2 }[b.r.tone]))
    .slice(0, 8);

  const rowClick = (c) => (c._id ? setOpenId(c._id) : setRoute && setRoute(certPathFor(tierKey)));

  return (
    <div className="mx-auto w-full grid gap-4 px-4 py-4 tablet:px-6 tablet:py-5 desktop:px-8">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="kbiz-page-title">{tierMenuName(tierKey)} Reconciliation</h1>
          <p className="text-sm text-ink-muted">Full view — every ledger in scope and its live status. Watch here; sign off in Certification.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" icon={ClipboardCheck} onClick={() => setRoute && setRoute(certPathFor(tierKey))}>Open {tierMenuName(tierKey)} Certification</Button>
          <Button variant="ghost" icon={CalendarClock} onClick={() => setRoute && setRoute(reportPathFor(tierKey))}>{tierMenuName(tierKey)} Report</Button>
          <Button variant="ghost" icon={BookOpenCheck} onClick={() => setRoute && setRoute('/reconciliation/rulebook')}>Rule Book</Button>
        </div>
      </div>

      {/* branch scope */}
      <div className="flex flex-wrap items-center gap-2" data-testid="recon-branch-scope">
        <span className="rounded-full bg-navy px-3.5 py-1.5 text-sm font-semibold text-white">
          {groupMode ? 'All branches' : `${branch} `}
          {!groupMode && <span className="text-xs opacity-70">{currencyOf(branch)}</span>}
        </span>
        <span className="text-xs italic text-ink-subtle">
          Scoped by the top TK branch selector — branch-wise, never mixed.
          {groupMode ? ' Showing the group readiness matrix; the checklist below defaults to BOM — spotlight a branch up top to drill in.' : ''}
        </span>
        {overdue && <Badge tone="danger" size="sm" dot>Overdue — was due {dueRow.dueOn}</Badge>}
      </div>

      {isError && <ErrorState title="Couldn’t load the reconciliation status" message="The reconciliation service didn’t respond. Check the connection and retry." onRetry={() => refetch()} />}

      {/* KPI tiles — scope-driven, so PENDING (not-yet-generated) ledgers count */}
      <div className="grid grid-cols-2 gap-3 tablet:grid-cols-3 desktop:grid-cols-6">
        <Kpi label="In scope" value={total} sub={`${period || '—'}`} title="Ledgers that must reconcile this period" />
        <Kpi label="Released" value={done} tone={done === total && total > 0 ? 'success' : 'ink'} sub={`${pct}% signed`} />
        <Kpi label="Pending" value={counts.pending || 0} tone={(counts.pending || 0) > 0 ? 'warning' : 'muted'} title="In scope but no certificate generated yet" />
        <Kpi label="In progress" value={(counts.open || 0) + (counts.reconciled || 0)} tone="muted" sub="frozen / reconciled" />
        <Kpi label="Difference ≠ 0" value={counts.diffOpen || 0} tone={(counts.diffOpen || 0) > 0 ? 'danger' : 'muted'} title="Frozen certificates whose difference is not yet cleared" />
        <Kpi label="Open exceptions" value={counts.exceptions || 0} tone={(counts.exceptions || 0) > 0 ? 'danger' : 'muted'} />
      </div>

      {/* progress bar */}
      <div>
        <div className="mb-1 flex items-center justify-between text-xs text-ink-muted">
          <span>{tier.label}{dueRow?.dueOn ? ` · due ${dueRow.dueOn}` : ''}</span>
          <span className="tabular-nums">{done} / {total} released · {pct}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-alt">
          <div className={`h-full rounded-full transition-all ${overdue ? 'bg-danger' : 'bg-navy'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* branch-wise readiness matrix — only in group mode (all 4 tiers, at a glance) */}
      {groupMode && Array.isArray(summary?.byBranch) && (
        <PageSection title="Branch-wise readiness" subtitle="Released / in scope per tier — each branch under its own regime, never blended (Rule 06).">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-surface-border text-left text-xs uppercase tracking-wider text-ink-subtle">
                  <th className="px-3 py-2 font-bold">Branch</th>
                  {TIERS.map((t) => <th key={t.key} className="px-3 py-2 text-center font-bold">{t.short}</th>)}
                </tr>
              </thead>
              <tbody>
                {summary.byBranch.map((row) => (
                  <tr key={row.branch} className="border-b border-surface-border last:border-0">
                    <td className="px-3 py-2 font-semibold text-ink">{row.branch}</td>
                    {TIERS.map((t) => {
                      const p = tierProgress(row.tiers?.[t.key]);
                      const tone = p.total === 0 ? 'text-ink-subtle' : p.done >= p.total ? 'text-success' : 'text-warning';
                      return (
                        <td key={t.key} className="px-3 py-2 text-center tabular-nums">
                          <span className={`font-semibold ${tone}`}>{p.total === 0 ? '—' : `${p.done}/${p.total}`}</span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-ink-subtle">Counts are of generated certificates; open the tier's Certification register to generate and sign.</p>
        </PageSection>
      )}

      {/* attention list — what still needs something, most urgent first */}
      {!isLoading && !empty && (
        <PageSection title="Needs attention" subtitle="The ledgers still standing between this period and a clean close." icon={AlertTriangle}>
          {attention.length === 0 ? (
            <div className="flex items-center gap-2 rounded-brand border border-success/30 bg-success/5 px-4 py-3 text-sm text-ink">
              <Sparkles size={16} className="text-success" aria-hidden="true" />
              All clear — every ledger in scope is reconciled and released for {branch} · {period || 'this period'}.
            </div>
          ) : (
            <ul className="grid gap-1.5">
              {attention.map(({ c, r }) => (
                <li key={c._id || c.ledger.code}>
                  <button type="button" onClick={() => rowClick(c)}
                    className="flex w-full items-center gap-3 rounded-brand border border-surface-border px-3 py-2 text-left hover:bg-surface-alt/60">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-ink">{c.ledger.name}</span>
                      <span className="font-mono text-xs text-ink-subtle">{c.ledger.code}</span>
                    </span>
                    <Badge tone={r.tone} size="sm" dot>{r.label}</Badge>
                    <ChevronRight size={15} className="text-ink-subtle" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PageSection>
      )}

      {/* the full checklist — every in-scope ledger + its status */}
      <PageSection title={`Ledger checklist — ${branch} · ${period || ''}`}
        subtitle={`${total} in scope · ${tier.scope}`} icon={ListChecks}>
        {isLoading && <LoadingState label="Loading the reconciliation status…" />}
        {empty && (
          <EmptyState title={`No ${tier.short} ledgers in scope for ${branch}`}
            hint="Nothing reconciles on this tier for this branch — check the cycle-ledger config or the branch selector." />
        )}
        <div className="grid gap-4">
          {groups.map((g) => (
            <div key={g.parentGroup} className="overflow-hidden rounded-brand border border-surface-border">
              <div className="bg-navy px-4 py-2 text-sm font-bold text-white">{g.parentGroup}</div>
              {g.subGroups.map((sg) => (
                <div key={sg.subGroup}>
                  <div className="border-y border-surface-border bg-surface-alt px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-ink-muted">
                    {sg.subGroup}
                  </div>
                  <ul>
                    {sg.items.map((c) => {
                      const meta = statusMeta(c.status);
                      const prog = chainProgress(c);
                      return (
                        <li key={c._id || c.ledger.code}>
                          <button type="button" onClick={() => rowClick(c)}
                            className="flex w-full items-center gap-3 border-b border-surface-border px-4 py-2.5 text-left last:border-0 hover:bg-surface-alt/60">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-ink">{c.ledger.name}</span>
                              <span className="font-mono text-xs text-ink-subtle">{c.ledger.code}</span>
                            </span>
                            <span className="hidden text-xs tabular-nums text-ink-muted tablet:block">
                              {c.snapshot?.frozenAt ? `diff ${fmtAmt(c.snapshot.difference, c.branch || branch)}` : (c.status === 'pending' ? 'not generated' : 'not frozen')}
                            </span>
                            <span className="text-xs tabular-nums text-ink-muted">{prog.done}/{prog.total} signed</span>
                            <Badge tone={meta.tone} size="sm" dot>{meta.label}</Badge>
                            <ChevronRight size={15} className="text-ink-subtle" aria-hidden="true" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </div>
      </PageSection>

      {openId && <CertificateDrawer id={openId} branch={branch} setRoute={setRoute} onClose={() => setOpenId(null)} />}
    </div>
  );
}
