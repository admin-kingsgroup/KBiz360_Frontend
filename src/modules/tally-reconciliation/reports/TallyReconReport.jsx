import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileBarChart, RefreshCcw, AlertTriangle, Clock, ShieldCheck, ExternalLink } from 'lucide-react';
import { getRegister } from '../api';
import { useCockpitFocus } from '../../../store/cockpitFocus';
import { PageSection, Badge, Button, EmptyState, LoadingState, ErrorState } from '../../../shell/primitives';
import { BRANCHES, CUR, round2, branchCodeOf, fmt, certMeta, TALLY_CHAIN, isCentralRole } from '../format';

// ─── Tally Reconciliation · per-tier Report ───────────────────────────────────
// One page per tier (Reports ▸ Monthly / Yearly Report). Three sections,
// branch-wise, all derived from the certification register:
//   1 · Pending Closings — periods with an uploaded Tally TB not yet certified.
//   2 · Certificate Register — every certificate + its frozen snapshot & chain.
//   3 · Open Items — the blockers (off ledgers / stale accepted variances at
//       freeze, or an uploaded period with no certificate started).
// Read-only; work a period on the tie-out board.

function openOnBoard(setRoute, branch, tier, period) {
  try { sessionStorage.setItem('tally-open-period', JSON.stringify({ branch, tier, period })); } catch { /* ignore */ }
  if (setRoute) setRoute(`/tally-reconciliation/${tier === 'year' ? 'yearly' : 'monthly'}`);
}
const OpenLink = ({ setRoute, branch, tier, period }) => (
  <button type="button" onClick={() => openOnBoard(setRoute, branch, tier, period)}
    className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">Open <ExternalLink size={12} aria-hidden="true" /></button>
);

export function TallyReconReport({ branch: appBranch, currentUser, tier: fixedTier, setRoute }) {
  const tier = fixedTier === 'year' ? 'year' : 'month';
  const appCode = branchCodeOf(appBranch);
  const focus = useCockpitFocus();
  const branch = appCode || (BRANCHES.includes(focus) ? focus : 'BOM');
  const cur = CUR[branch] || '₹';
  const central = isCentralRole(currentUser?.role);

  const { data: items = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['tally-tieout', 'register', branch, tier],
    queryFn: () => getRegister({ branch, tier }),
    enabled: central,
  });

  const { pending, certs, openItems } = useMemo(() => {
    const pending = []; const certs = []; const openItems = [];
    for (const it of items) {
      const st = it.cert?.status || 'none';
      const snap = it.cert?.snapshot || null;
      if (it.ledgers > 0 && st !== 'locked') pending.push(it);
      if (it.cert) certs.push(it);
      const off = snap ? Number(snap.offTotal || 0) : 0;
      const fix = snap ? Number(snap.fixTotal || 0) : 0; // name/group corrections owed in Tally
      const stale = snap ? Number(snap.staleAccepted || 0) : 0;
      // Blockers to certifying (never a locked period — it's done): no cert started,
      // a re-opened/not-tied period with uploaded ledgers, a frozen-but-dirty snap, or
      // Tally ledger names/groups that still differ from ERP (blocks sign-off).
      if (st !== 'locked' && ((it.ledgers > 0 && (st === 'none' || st === 'open')) || off > 0 || fix > 0 || stale > 0)) {
        openItems.push({ ...it, reason: st === 'none' ? 'TB uploaded — no certificate started'
          : off > 0 ? `${off} ledger(s) off at freeze`
          : fix > 0 ? `${fix} name/group fix(es) owed in Tally`
          : stale > 0 ? `${stale} accepted variance(s) changed`
          : 'not tied — clear the off ledgers' });
      }
    }
    return { pending, certs, openItems };
  }, [items]);

  const title = tier === 'year' ? 'Yearly' : 'Monthly';

  if (!central) {
    return (
      <PageSection icon={FileBarChart} title="Tally Reconciliation Report">
        <EmptyState title="Central control" hint="Tally reconciliation reporting is a central Month/Year control — AE / FM / Director / Owner only." />
      </PageSection>
    );
  }

  return (
    <div className="mx-auto grid gap-4" style={{ maxWidth: 1600 }}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="kbiz-page-title">Tally Reconciliation Report · {title}</h1>
          <p className="text-sm text-ink-muted">Pending closings, the certificate register and open blockers for the {tier}. Branch-wise, never blended.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-navy px-3.5 py-1.5 text-sm font-semibold text-white">{branch} <span className="text-xs opacity-70">{cur}</span></span>
          <Button variant="ghost" icon={RefreshCcw} onClick={() => refetch()}>Refresh</Button>
        </div>
      </div>

      {isError ? (
        <ErrorState title="Couldn’t load the report" message="The reconciliation service didn’t respond — this report may NOT be complete. Retry before relying on it." onRetry={() => refetch()} />
      ) : isLoading ? (
        <LoadingState label="Building the report…" />
      ) : (
        <>
          {/* 1 · Pending Closings */}
          <PageSection icon={Clock} title="Pending Closings"
            subtitle="Periods with an uploaded Tally TB that are not yet certified (🔒). This is the go-live backlog."
            actions={<Badge tone={pending.length ? 'warning' : 'success'} size="sm" dot>{pending.length} pending</Badge>}>
            {!pending.length ? <EmptyState title="Nothing pending" hint="Every uploaded period is certified." /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: 720 }}>
                  <thead><tr className="border-b border-surface-border text-xs uppercase tracking-wider text-ink-subtle">
                    <th className="px-4 py-2 text-left font-bold">Period</th><th className="px-4 py-2 text-right font-bold">TB ledgers</th>
                    <th className="px-4 py-2 text-left font-bold">Status</th><th className="px-4 py-2 text-left font-bold">Next step</th><th className="px-4 py-2 text-right font-bold" />
                  </tr></thead>
                  <tbody>{pending.map((it) => {
                    const st = it.cert?.status || 'none'; const m = certMeta(st);
                    const left = TALLY_CHAIN.length - (it.cert?.signatures?.length || 0);
                    const next = st === 'none' ? 'Freeze the tie-out' : st === 'open' ? 'Clear the off ledgers' : st === 'reconciled' ? 'Sign the chain' : `${left} signature${left === 1 ? '' : 's'} left`;
                    return (<tr key={it.period} className="border-b border-surface-border hover:bg-surface-alt/60">
                      <td className="px-4 py-2 font-semibold text-ink">{it.period}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums text-ink-muted">{it.ledgers}</td>
                      <td className="px-4 py-2"><Badge tone={m.tone} size="sm" dot>{m.icon} {m.label}</Badge></td>
                      <td className="px-4 py-2 text-xs text-ink-muted">{next}</td>
                      <td className="px-4 py-2 text-right"><OpenLink setRoute={setRoute} branch={branch} tier={tier} period={it.period} /></td>
                    </tr>);
                  })}</tbody>
                </table>
              </div>
            )}
          </PageSection>

          {/* 2 · Certificate Register */}
          <PageSection icon={ShieldCheck} title="Certificate Register"
            subtitle="Every certificate for the tier — status, frozen snapshot and sign chain."
            actions={<Badge tone="info" size="sm" dot>{certs.length} certificate(s)</Badge>}>
            {!certs.length ? <EmptyState title="No certificates yet" hint="Freeze and sign a period on the tie-out board to start the register." /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: 960 }}>
                  <thead><tr className="border-b border-surface-border text-xs uppercase tracking-wider text-ink-subtle">
                    <th className="px-4 py-2 text-left font-bold">Period</th><th className="px-4 py-2 text-left font-bold">Status</th>
                    <th className="px-4 py-2 text-right font-bold">Off @ freeze</th><th className="px-4 py-2 text-right font-bold">Net-profit Δ</th>
                    <th className="px-4 py-2 text-left font-bold">Signed by</th><th className="px-4 py-2 text-right font-bold" />
                  </tr></thead>
                  <tbody>{certs.map((it) => {
                    const m = certMeta(it.cert.status); const snap = it.cert.snapshot || {};
                    const npDelta = round2((snap.netProfitErp || 0) - (snap.netProfitTally || 0));
                    const signers = (it.cert.signatures || []).map((s) => s.role).join(' → ') || '—';
                    return (<tr key={it.period} className="border-b border-surface-border hover:bg-surface-alt/60">
                      <td className="px-4 py-2 font-semibold text-ink">{it.period}{it.cert.reopened > 0 ? <span className="ml-1.5 rounded-full bg-warning/15 px-1.5 text-[10px] font-semibold text-warning">↻ {it.cert.reopened}</span> : null}</td>
                      <td className="px-4 py-2"><Badge tone={m.tone} size="sm" dot>{m.icon} {m.label}</Badge></td>
                      <td className={`px-4 py-2 text-right font-mono tabular-nums ${Number(snap.offTotal || 0) > 0 ? 'text-danger font-semibold' : 'text-ink-subtle'}`}>{snap.frozenAt ? (snap.offTotal || 0) : '—'}</td>
                      <td className={`px-4 py-2 text-right font-mono tabular-nums ${npDelta !== 0 ? 'text-danger' : 'text-ink-subtle'}`}>{snap.frozenAt ? fmt(npDelta, cur) : '—'}</td>
                      <td className="px-4 py-2 text-xs text-ink-muted">{signers}</td>
                      <td className="px-4 py-2 text-right"><OpenLink setRoute={setRoute} branch={branch} tier={tier} period={it.period} /></td>
                    </tr>);
                  })}</tbody>
                </table>
              </div>
            )}
          </PageSection>

          {/* 3 · Open Items */}
          <PageSection icon={AlertTriangle} title="Open Items"
            subtitle="Blockers to certifying — off ledgers or changed accepted variances at freeze, or an uploaded period with no certificate started."
            actions={<Badge tone={openItems.length ? 'danger' : 'success'} size="sm" dot>{openItems.length} open</Badge>}>
            {!openItems.length ? <EmptyState title="No open blockers" hint="Every uploaded period is either certified or cleanly in progress." /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: 640 }}>
                  <thead><tr className="border-b border-surface-border text-xs uppercase tracking-wider text-ink-subtle">
                    <th className="px-4 py-2 text-left font-bold">Period</th><th className="px-4 py-2 text-left font-bold">Blocker</th><th className="px-4 py-2 text-right font-bold" />
                  </tr></thead>
                  <tbody>{openItems.map((it) => (
                    <tr key={it.period} className="border-b border-surface-border hover:bg-surface-alt/60">
                      <td className="px-4 py-2 font-semibold text-ink">{it.period}</td>
                      <td className="px-4 py-2 text-sm text-danger">{it.reason}</td>
                      <td className="px-4 py-2 text-right"><OpenLink setRoute={setRoute} branch={branch} tier={tier} period={it.period} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </PageSection>
        </>
      )}
    </div>
  );
}
