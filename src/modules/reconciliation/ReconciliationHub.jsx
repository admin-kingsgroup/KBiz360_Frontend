import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpenCheck, RefreshCcw, ChevronRight, CalendarClock, Settings2 } from 'lucide-react';
import { getTree, getSummary, getPending, generateCertificates } from './api';
import { BRANCHES, branchCodeOf, TIERS, tierOf, statusMeta, tierProgress, chainProgress, fmtAmt, currencyOf, periodOptions, visibleTiers, canEditCycleConfig, reportPathFor, tierMenuName } from './utils';
import { PageSection, Badge, Button, EmptyState, LoadingState, ErrorState, Select } from '../../shell/primitives';
import { CertificateDrawer } from './CertificateDrawer';
import { CycleLedgerDrawer } from './CycleLedgerDrawer';

// ─── Reconciliation — one page per tier ──────────────────────────────────────
// Branch-wise (Rule 06: one branch at a time, never mixed). The TIER is fixed
// by the route — Reconcile & Certify ▸ Weekly / Monthly / Quarterly / Yearly
// Reconciliation are separate menu entries rendering this page tier-locked.
// Per-ledger register grouped Parent Group → Sub-group → ledger — one
// certificate per ledger (Rule 01). Opening a row works the certificate in a
// drawer: freeze → attach → exceptions → sign chain → (physical) scan-back.

function TierCard({ tier, counts, period }) {
  const p = tierProgress(counts);
  return (
    <div className="rounded-brand border border-navy bg-navy/5 p-4 text-left shadow-card">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">{tier.short}</span>
        <Badge tone={tier.tone} size="sm">{tier.mode === 'digital' ? 'Digital' : 'Physical'}</Badge>
      </div>
      <div className="mt-2 text-2xl font-bold tabular-nums text-ink">{p.done}<span className="text-base font-semibold text-ink-subtle"> / {p.total}</span></div>
      <div className="mt-0.5 truncate text-xs text-ink-muted">{period || '—'} · {p.pct}% signed</div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-alt">
        <div className="h-full rounded-full bg-navy transition-all" style={{ width: `${p.pct}%` }} />
      </div>
    </div>
  );
}

// The tier is FIXED by the route (Reconcile & Certify ▸ Weekly / Monthly /
// Quarterly / Yearly Reconciliation) — the menu is the tier switch, the page
// never mixes tiers.
export function ReconciliationHub({ branch: appBranch, setRoute, currentUser, tier: fixedTier }) {
  const appCode = branchCodeOf(appBranch); // app passes a branch OBJECT (or 'ALL')
  const [branch, setBranch] = useState(appCode || 'BOM');
  const tierKey = TIERS.some((t) => t.key === fixedTier) ? fixedTier : 'weekly';
  const [openId, setOpenId] = useState(null);
  const [showCycleCfg, setShowCycleCfg] = useState(false);
  // Per-(branch,tier) period override — '' means "the current period". Lets the
  // team work the BACKLOG (Apr/May/Jun 2026 month-ends, FY2025-26 / CY2025
  // year-end) from the same register, not just the running period.
  const [periodSel, setPeriodSel] = useState({});
  const qc = useQueryClient();
  const tier = tierOf(tierKey);

  // Follow the app-wide branch selector — the module must never show a
  // different branch than the rest of the ERP (branch-isolation convention).
  useEffect(() => { if (appCode) setBranch(appCode); }, [appCode]);

  // Branch Accountant works the WEEKLY cycle only (Month/Quarter/Year are done
  // from TK Group Central by AE/FM/Director/Owner — backend enforces it too).
  const tiers = visibleTiers(currentUser?.role);
  const tierAllowed = tiers.some((t) => t.key === tierKey);

  const { data: summary } = useQuery({ queryKey: ['recon-certs', 'summary', branch], queryFn: () => getSummary({ branch }) });
  const { data: pendingData } = useQuery({ queryKey: ['recon-certs', 'pending', branch], queryFn: () => getPending({ branch }) });
  const currentPeriod = summary?.periods?.[tierKey];
  const options = periodOptions(tierKey, currentPeriod, pendingData?.rows);
  const period = periodSel[`${branch}:${tierKey}`] || currentPeriod;
  const setPeriod = (p) => setPeriodSel((s) => ({ ...s, [`${branch}:${tierKey}`]: p }));

  const { data: treeData, isLoading, isError, refetch } = useQuery({
    queryKey: ['recon-certs', 'tree', branch, tierKey, period || ''],
    queryFn: () => getTree({ branch, tier: tierKey, period }),
    enabled: !!period,
  });
  const groups = treeData?.groups || [];
  const empty = !isLoading && !isError && groups.length === 0;

  const gen = useMutation({
    mutationFn: () => generateCertificates({ branch, tier: tierKey, period }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recon-certs'] });
    },
  });

  // Direct-URL guard: a Branch Accountant landing on a central closing tier
  // gets the rule, not a broken page (the menu already hides these entries).
  if (!tierAllowed) {
    return (
      <div className="grid gap-4">
        <h1 className="kbiz-page-title">{tierMenuName(tierKey)} Reconciliation</h1>
        <EmptyState title="Central closing tier"
          hint="The Branch Accountant works the WEEKLY cycle only — Month-End, Quarterly and Year-End closings are done from TK Group Central by AE / FM / Director / Owner."
          action={<Button variant="secondary" onClick={() => setRoute && setRoute('/reconciliation/weekly')}>Open Weekly Reconciliation</Button>} />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="kbiz-page-title">{tierMenuName(tierKey)} Reconciliation</h1>
          <p className="text-sm text-ink-muted">One certificate per ledger · {tier.mode === 'digital' ? 'digital sign chain' : 'physical certificate + scan-back'} · branch-wise, never mixed.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" icon={CalendarClock} onClick={() => setRoute && setRoute(reportPathFor(tierKey))}>{tierMenuName(tierKey)} Report</Button>
          {tierKey === 'weekly' && canEditCycleConfig(currentUser?.role) && (
            <Button variant="ghost" icon={Settings2} onClick={() => setShowCycleCfg(true)}>Cycle ledgers</Button>
          )}
          <Button variant="ghost" icon={BookOpenCheck} onClick={() => setRoute && setRoute('/reconciliation/rulebook')}>Rule Book</Button>
          <Button variant="secondary" icon={RefreshCcw} loading={gen.isPending} onClick={() => gen.mutate()}>
            Generate {tier.short} certificates
          </Button>
        </div>
      </div>

      {/* branch chips — the register is always a single branch (Rule 06) */}
      <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Branch">
        {BRANCHES.map((b) => (
          <button key={b} type="button" role="tab" aria-selected={branch === b} onClick={() => setBranch(b)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors ${branch === b ? 'border-transparent bg-navy text-white' : 'border-surface-border bg-surface text-ink-muted hover:border-ink/20'}`}>
            {b} <span className="ml-1 text-xs opacity-60">{currencyOf(b)}</span>
          </button>
        ))}
        <span className="ml-auto text-xs italic text-ink-subtle">Branch-wise — data is never mixed across branches</span>
      </div>

      {/* this tier's progress card — switching tiers happens from the menu
          (Reconcile & Certify ▸ Weekly / Monthly / Quarterly / Yearly) */}
      <div className="grid grid-cols-1 gap-3 tablet:max-w-sm">
        <TierCard tier={tier} counts={summary?.tiers?.[tierKey]} period={summary?.periods?.[tierKey]} />
      </div>
      {tiers.length === 1 && (
        <p className="text-xs text-ink-subtle">Month-End, Quarterly and Year-End closings are worked from TK Group Central by AE / FM / Director / Owner.</p>
      )}

      {/* register */}
      <PageSection
        title={`${tier.label} — ${branch} · ${period || ''}`}
        subtitle={`${tier.scope} · Signers: ${tier.chain.map((s) => s.role).join(' → ')}`}
        actions={options.length > 1 && (
          <label className="flex items-center gap-2 text-xs font-semibold text-ink-muted">
            Period
            <Select value={period || ''} onChange={(e) => setPeriod(e.target.value)} aria-label="Register period">
              {options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </label>
        )}>
        {gen.isError && <p className="mb-3 text-sm text-danger">Couldn’t generate certificates: {gen.error?.message}</p>}
        {gen.isSuccess && gen.data && <p className="mb-3 text-sm text-success">Generated {gen.data.created ?? 0} new certificate{(gen.data.created ?? 0) === 1 ? '' : 's'} ({gen.data.total ?? 0} in scope).</p>}
        {isLoading && <LoadingState label="Loading register…" />}
        {isError && <ErrorState title="Couldn’t load the register" message="The reconciliation service didn’t respond. Check the connection and retry." onRetry={() => refetch()} />}
        {empty && (
          <EmptyState title={`No ${tier.short} certificates for ${branch} · ${period || 'this period'}`}
            hint="Generate the period's certificates — one per ledger in this tier's scope."
            action={<Button variant="primary" loading={gen.isPending} onClick={() => gen.mutate()}>Generate certificates</Button>} />
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
                        <li key={c._id}>
                          <button type="button" onClick={() => setOpenId(c._id)}
                            className="flex w-full items-center gap-3 border-b border-surface-border px-4 py-2.5 text-left last:border-0 hover:bg-surface-alt/60">
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-ink">{c.ledger.name}</span>
                              <span className="font-mono text-xs text-ink-subtle">{c.ledger.code}</span>
                            </span>
                            <span className="hidden text-xs tabular-nums text-ink-muted tablet:block">
                              {c.snapshot?.frozenAt ? `diff ${fmtAmt(c.snapshot.difference, c.branch)}` : 'not frozen'}
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
      {showCycleCfg && <CycleLedgerDrawer branch={branch} onClose={() => setShowCycleCfg(false)} />}
    </div>
  );
}
