import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, CalendarClock, AlertTriangle, LayoutDashboard } from 'lucide-react';
import { getPending, getList, generateCertificates } from '../api';
import { useCockpitFocus } from '../../../store/cockpitFocus';
import { BRANCHES, branchCodeOf, TIERS, tierOf, statusMeta, currencyOf, fmtAmt, chainProgress, pendingStateMeta, fmtDue, visibleTiers, certPathFor, hubPathFor, reportPathFor, tierMenuName } from '../utils';
import { PageSection, Badge, Button, EmptyState, LoadingState, ErrorState, Select, FormField } from '../../../shell/primitives';

// ─── Reconciliation · per-tier Report ────────────────────────────────────────
// Lives ONLY under the Reconciliation header, one page per tier (Reports ▸
// Weekly / Monthly / Quarterly / Yearly Report). Three sections, branch-wise:
//   1 · Pending Closings — this tier's go-live backlog (FY2025-26 year-end,
//       month-ends from Apr 2026, weekly cycles due every FRIDAY from W29),
//       each row's status computed live from the certificates in the DB.
//   2 · Certificate Register — this tier's certificates, filterable by status.
//   3 · Open Exceptions — this tier's unresolved signature blockers.

const cellCls = 'px-3 py-2.5 text-sm border-b border-surface-border align-middle';
const headCls = 'px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-ink-muted bg-surface-alt border-b border-surface-border whitespace-nowrap';

export function ReconReportsPage({ branch: appBranch, setRoute, currentUser, tier: fixedTier }) {
  const appCode = branchCodeOf(appBranch); // app passes a branch OBJECT (or 'ALL')
  // Branch scope: a real branch context (top-right selector) wins; otherwise the
  // top TK sub-branch selector (cockpit Focus) scopes the report — no in-page
  // selector, same contract as every Control Tower lens. 'ALL' focus defaults to
  // BOM because the report is single-branch by Rule 06.
  const focus = useCockpitFocus();
  const branch = appCode || (BRANCHES.includes(focus) ? focus : 'BOM');
  const tierKey = TIERS.some((t) => t.key === fixedTier) ? fixedTier : 'weekly';
  const tier = tierOf(tierKey);
  const [statusFilter, setStatusFilter] = useState('');

  // Branch Accountant sees the Daily/Weekly cycles and the Monthly report (they
  // freeze the branch bank/client/supplier reconciliations) — Quarter/Year closings
  // are worked from TK Group Central by AE/FM/Director/Owner. An explicit
  // Page-Visibility GRANT of this report opens it (read-only data anyway) —
  // otherwise the admin's grant toggle would promise a page the guard refuses.
  const tiers = visibleTiers(currentUser?.role);
  const granted = Array.isArray(currentUser?.granted) ? currentUser.granted : [];
  const tierAllowed = tiers.some((t) => t.key === tierKey) || granted.includes(reportPathFor(tierKey));

  const qc = useQueryClient();
  // Queries stay idle behind the tier guard — a guarded page must not fetch.
  const { data: pendingData, isLoading: pendingLoading, isError: pendingError, refetch: refetchPending } = useQuery({
    queryKey: ['recon-certs', 'pending', branch], queryFn: () => getPending({ branch }), enabled: tierAllowed,
  });
  const { data: certs = [], isLoading: certsLoading, isError: certsError, refetch: refetchCerts } = useQuery({
    queryKey: ['recon-certs', 'register', branch], queryFn: () => getList({ branch }), enabled: tierAllowed,
  });
  // "Generate" on a not-started closing spawns that period's per-ledger
  // certificates so the team can start it straight from the pending board.
  const gen = useMutation({
    mutationFn: ({ tier, period }) => generateCertificates({ branch, tier, period }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['recon-certs'] }),
  });

  const pendingRows = (pendingData?.rows || []).filter((r) => r.tier === tierKey);
  const registerRows = certs.filter((c) => c.tier === tierKey && (!statusFilter || c.status === statusFilter));
  const exceptionRows = certs.filter((c) => c.tier === tierKey).flatMap((c) => (c.exceptions || []).filter((e) => !e.resolved)
    .map((e) => ({ cert: c, text: e.text })));

  // Direct-URL guard: a Branch Accountant landing on a central tier's report
  // gets the rule, not a broken page (the menu already hides these entries).
  if (!tierAllowed) {
    return (
      <div className="mx-auto w-full grid gap-4 px-4 py-4 tablet:px-6 tablet:py-5 desktop:px-8">
        <h1 className="kbiz-page-title">{tierMenuName(tierKey)} Report</h1>
        <EmptyState title="Central closing tier"
          hint="The Branch Accountant works the Daily & Weekly freeze and the monthly bank / client / supplier freeze — Quarterly and Year-End closings are done from TK Group Central by AE / FM / Director / Owner."
          action={<Button variant="secondary" onClick={() => setRoute && setRoute('/reconciliation/reports/weekly')}>Open Weekly Report</Button>} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full grid gap-4 px-4 py-4 tablet:px-6 tablet:py-5 desktop:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="kbiz-page-title">{tierMenuName(tierKey)} Report</h1>
          <p className="text-sm text-ink-muted">{tier.label} — the closing backlog, certificate register and open exceptions. Branch-wise, never mixed.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" icon={LayoutDashboard} onClick={() => setRoute && setRoute(hubPathFor(tierKey))}>{tierMenuName(tierKey)} Hub</Button>
          <Button variant="ghost" icon={ArrowLeft} onClick={() => setRoute && setRoute(certPathFor(tierKey))}>Open {tierMenuName(tierKey)} Certification</Button>
        </div>
      </div>

      {/* branch scope — driven by the top TK branch selector, never an in-page picker */}
      <div className="flex flex-wrap items-center gap-2" data-testid="recon-branch-scope">
        <span className="rounded-full bg-navy px-3.5 py-1.5 text-sm font-semibold text-white">{branch} <span className="text-xs opacity-70">{currencyOf(branch)}</span></span>
        <span className="text-xs italic text-ink-subtle">
          Scoped by the top TK branch selector — branch-wise, data is never mixed across branches.
          {!appCode && !BRANCHES.includes(focus) ? ' Focus is ALL, defaulting to BOM — spotlight a branch up top to switch.' : ''}
        </span>
      </div>

      {/* 1 · pending closings */}
      <PageSection title="1 · Pending Closings" icon={CalendarClock}
        subtitle={`${{
          weekly: 'Weekly reconciliation runs from W29, due every Friday.',
          month: 'Month-End closings run from April 2026 onward.',
          quarter: 'Quarterly closings — India fiscal quarters (Jun/Sep/Dec/Mar) · Africa calendar quarters (Mar/Jun/Sep/Dec).',
          year: 'Year-End — India FY2025-26 (Apr–Mar) · Africa CY2025 (Jan–Dec).',
        }[tierKey]} A row leaves this board only when every ledger certificate in it is ${tierKey === 'weekly' ? 'signed' : 'locked'}.`}>
        {gen.isError && <p className="mb-3 text-sm text-danger">Couldn’t generate certificates: {gen.error?.message}</p>}
        {gen.isSuccess && gen.data && <p className="mb-3 text-sm text-success">Generated {gen.data.created ?? 0} certificate{(gen.data.created ?? 0) === 1 ? '' : 's'} for {gen.variables?.period} — open {tierMenuName(tierKey)} Certification to work them.</p>}
        {pendingLoading && <LoadingState label="Loading pending closings…" />}
        {pendingError && <ErrorState title="Couldn’t load the pending closings" message="The reconciliation service didn’t respond — this board may NOT be complete. Retry before relying on it." onRetry={() => refetchPending()} />}
        {!pendingLoading && !pendingError && pendingRows.length === 0 && <EmptyState title="Nothing pending" hint="Every scheduled closing is complete for this branch." />}
        {!pendingError && pendingRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse">
              <thead><tr>
                <th className={headCls}>Closing</th><th className={headCls}>Tier</th><th className={headCls}>Period</th>
                <th className={headCls}>Due</th><th className={headCls}>Ledgers signed</th><th className={headCls}>Status</th><th className={headCls}>Action</th>
              </tr></thead>
              <tbody>
                {pendingRows.map((r) => {
                  const t = tierOf(r.tier);
                  const st = pendingStateMeta(r);
                  const busy = gen.isPending && gen.variables?.tier === r.tier && gen.variables?.period === r.period;
                  return (
                    <tr key={`${r.tier}:${r.period}`} className={r.upcoming ? 'bg-info-soft/30' : r.state === 'superseded' ? 'opacity-60' : undefined}>
                      <td className={cellCls}>
                        <span className="font-semibold text-ink">{r.label}</span>
                        {r.note ? <div className="text-xs text-ink-subtle">{r.note}</div> : null}
                      </td>
                      <td className={cellCls}><Badge tone={t.tone} size="sm">{t.short}</Badge></td>
                      <td className={`${cellCls} font-mono text-xs`}>{r.period}</td>
                      <td className={cellCls}>{fmtDue(r)}</td>
                      <td className={`${cellCls} tabular-nums`}>{r.total ? `${r.done} / ${r.total}` : '—'}</td>
                      <td className={cellCls}><Badge tone={st.tone} size="sm" dot>{st.label}</Badge></td>
                      <td className={cellCls}>
                        {r.state === 'superseded'
                          ? <span className="text-xs text-ink-subtle">covered by Month-End</span>
                          : r.state === 'not-started' && !r.upcoming
                            ? <Button size="xs" variant="secondary" loading={busy} onClick={() => gen.mutate({ tier: r.tier, period: r.period })}>Generate</Button>
                            : r.upcoming
                              ? <span className="text-xs text-ink-subtle">opens {fmtDue(r).replace(' (upcoming)', '')}</span>
                              : <Button size="xs" variant="ghost" onClick={() => setRoute && setRoute(certPathFor(tierKey))}>Open</Button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      {/* 2 · certificate register */}
      <PageSection title="2 · Certificate Register" subtitle={`Every ${tier.short} certificate for ${branch}, across all periods.`}>
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <FormField label="Status">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All statuses</option>
              <option value="open">Open</option><option value="reconciled">Reconciled</option>
              <option value="signed">Signed</option><option value="locked">Locked</option>
            </Select>
          </FormField>
          <span className="mb-2 ml-auto text-xs text-ink-subtle tabular-nums">{registerRows.length} certificate{registerRows.length === 1 ? '' : 's'}</span>
        </div>
        {certsLoading && <LoadingState label="Loading register…" />}
        {certsError && <ErrorState title="Couldn’t load the register" message="The reconciliation service didn’t respond. Check the connection and retry." onRetry={() => refetchCerts()} />}
        {!certsLoading && !certsError && registerRows.length === 0 && <EmptyState title="No certificates match" hint={`Generate them from ${tierMenuName(tierKey)} Certification, or clear the status filter.`} />}
        {!certsError && registerRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead><tr>
                <th className={headCls}>Certificate</th><th className={headCls}>Ledger</th><th className={headCls}>Group</th>
                <th className={headCls}>Period</th><th className={headCls}>Difference</th><th className={headCls}>Signatures</th><th className={headCls}>Status</th>
              </tr></thead>
              <tbody>
                {registerRows.map((c) => {
                  const meta = statusMeta(c.status);
                  const prog = chainProgress(c);
                  return (
                    <tr key={c._id}>
                      <td className={`${cellCls} font-mono text-xs`}>{c.certNo}</td>
                      <td className={cellCls}><span className="font-semibold text-ink">{c.ledger.name}</span><div className="font-mono text-xs text-ink-subtle">{c.ledger.code}</div></td>
                      <td className={cellCls}><span className="text-xs text-ink-muted">{c.ledger.parentGroup} › {c.ledger.subGroup}</span></td>
                      <td className={`${cellCls} font-mono text-xs`}>{c.period}</td>
                      <td className={`${cellCls} tabular-nums`}>{c.snapshot?.frozenAt ? fmtAmt(c.snapshot.difference, c.branch) : <span className="text-ink-subtle">not frozen</span>}</td>
                      <td className={`${cellCls} tabular-nums`}>{prog.done}/{prog.total}{prog.next ? ` · next ${prog.next.role}` : ''}</td>
                      <td className={cellCls}><Badge tone={meta.tone} size="sm" dot>{meta.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>

      {/* 3 · open exceptions */}
      <PageSection title="3 · Open Exceptions" icon={AlertTriangle}
        subtitle="Unresolved exceptions block their certificate's signatures (Rule 03) — this is the fix-first list.">
        {exceptionRows.length === 0
          ? <EmptyState title="No open exceptions" hint="Nothing is blocking a signature right now." />
          : (
            <ul className="grid gap-2">
              {exceptionRows.map((x, i) => (
                <li key={`${x.cert._id}-${i}`} className="flex flex-wrap items-center gap-3 rounded-brand border border-warning/30 bg-warning-soft/30 px-3 py-2 text-sm">
                  <AlertTriangle size={15} className="shrink-0 text-warning" aria-hidden="true" />
                  <span className="flex-1 text-ink">{x.text}</span>
                  <span className="font-semibold text-ink">{x.cert.ledger.name}</span>
                  <span className="font-mono text-xs text-ink-subtle">{x.cert.certNo}</span>
                </li>
              ))}
            </ul>
          )}
      </PageSection>
    </div>
  );
}
