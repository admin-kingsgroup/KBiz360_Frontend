import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, RefreshCcw, BookOpenCheck, ExternalLink } from 'lucide-react';
import { getRegister } from './api';
import { useCockpitFocus } from '../../store/cockpitFocus';
import { PageSection, Badge, Button, EmptyState, LoadingState, ErrorState } from '../../shell/primitives';
import { BRANCHES, CUR, round2, branchCodeOf, fmt, certMeta, TALLY_CHAIN, isCentralRole } from './format';

// ─── Tally Certification Register — one page per tier (month / year) ──────────
// The at-a-glance "which period is certified" overview: every period that has an
// uploaded Tally TB and/or a certificate, with its status (🔒 Certified /
// Signing… / Ready / Not tied / Not started), the AE→FM→Director→Owner sign
// chain, the frozen snapshot numbers and the re-open count. Read-only — the
// sign-off ACTION happens on the tie-out board (open a row's period there).
// Central Month/Year control (Branch Accountants work the weekly cycle only).

// Hand a period to the tie-out board (which keeps period in local state): stash it
// and route to that tier's board, where a mount effect picks it up.
function openOnBoard(setRoute, branch, tier, period) {
  try { sessionStorage.setItem('tally-open-period', JSON.stringify({ branch, tier, period })); } catch { /* ignore */ }
  if (setRoute) setRoute(`/tally-reconciliation/${tier === 'year' ? 'yearly' : 'monthly'}`);
}

export function TallyCertRegister({ branch: appBranch, currentUser, tier: fixedTier, setRoute }) {
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

  const summary = useMemo(() => {
    const s = { total: items.length, certified: 0, signing: 0, pending: 0 };
    for (const it of items) {
      const st = it.cert?.status || 'none';
      if (st === 'locked') s.certified += 1;
      else if (st === 'signed') s.signing += 1;
      else s.pending += 1; // reconciled / open / none — not yet certified
    }
    return s;
  }, [items]);

  const title = tier === 'year' ? 'Yearly' : 'Monthly';

  if (!central) {
    return (
      <PageSection icon={ShieldCheck} title="Tally Certification Register">
        <EmptyState title="Central control" hint="Tally certification is a central Month/Year control — AE / FM / Director / Owner only. Branch Accountants work the weekly reconciliation cycle." />
      </PageSection>
    );
  }

  return (
    <div className="mx-auto grid gap-4" style={{ maxWidth: 1600 }}>
      {/* header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="kbiz-page-title">Tally Certification Register · {title}</h1>
          <p className="text-sm text-ink-muted">Every {tier} period and its certificate — which are certified (🔒), signing, or still pending. Branch-wise, never blended.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-navy px-3.5 py-1.5 text-sm font-semibold text-white">{branch} <span className="text-xs opacity-70">{cur}</span></span>
          <Button variant="ghost" icon={RefreshCcw} onClick={() => refetch()}>Refresh</Button>
          <Button variant="ghost" icon={BookOpenCheck} onClick={() => setRoute && setRoute('/tally-reconciliation/guide')}>Guide</Button>
        </div>
      </div>

      {/* summary chips */}
      <div className="grid grid-cols-2 gap-3 tablet:grid-cols-4">
        <Kpi label="Periods" value={summary.total} />
        <Kpi label="🔒 Certified" value={summary.certified} tone={summary.certified > 0 ? 'success' : 'muted'} />
        <Kpi label="Signing" value={summary.signing} tone={summary.signing > 0 ? 'info' : 'muted'} />
        <Kpi label="Pending" value={summary.pending} tone={summary.pending > 0 ? 'warning' : 'muted'} />
      </div>

      <PageSection icon={ShieldCheck} title={`${title} certificates — ${branch}`}
        subtitle="A certificate freezes the tie-out (difference = 0) and is signed AE → FM → Director → Owner. Click “Open in Tie-Out” to work a period.">
        {isLoading && <LoadingState label="Loading the certification register…" />}
        {isError && <ErrorState title="Couldn’t load the register" message="The reconciliation service didn’t respond. Check the connection and retry." onRetry={() => refetch()} />}
        {!isLoading && !isError && !items.length && (
          <EmptyState title={`No Tally periods yet for ${branch}`} hint={`Upload a Tally Trial Balance on the ${title} Tie-Out board — the period will appear here with its certificate status.`}
            action={<Button variant="primary" onClick={() => setRoute && setRoute(`/tally-reconciliation/${tier === 'year' ? 'yearly' : 'monthly'}`)}>Open {title} Tie-Out</Button>} />
        )}
        {!isLoading && !isError && items.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ minWidth: 900 }}>
              <thead>
                <tr className="border-b border-surface-border text-xs uppercase tracking-wider text-ink-subtle">
                  <th className="px-4 py-2 text-left font-bold">Period</th>
                  <th className="px-4 py-2 text-right font-bold">TB ledgers</th>
                  <th className="px-4 py-2 text-left font-bold">Status</th>
                  <th className="px-4 py-2 text-left font-bold">Sign chain</th>
                  <th className="px-4 py-2 text-right font-bold">Net-profit Δ (frozen)</th>
                  <th className="px-4 py-2 text-right font-bold" />
                </tr>
              </thead>
              <tbody>
                {items.map((it) => <RegisterRow key={it.period} it={it} cur={cur} branch={branch} tier={tier} setRoute={setRoute} />)}
              </tbody>
            </table>
          </div>
        )}
      </PageSection>
    </div>
  );
}

function RegisterRow({ it, cur, branch, tier, setRoute }) {
  const st = it.cert?.status || 'none';
  const meta = certMeta(st);
  const sigs = it.cert?.signatures || [];
  const snap = it.cert?.snapshot || null;
  const npDelta = snap ? round2((snap.netProfitErp || 0) - (snap.netProfitTally || 0)) : null;
  return (
    <tr className="border-b border-surface-border hover:bg-surface-alt/60">
      <td className="px-4 py-2 font-semibold text-ink">{it.period}
        {it.cert?.reopened > 0 ? <span className="ml-1.5 align-middle rounded-full bg-warning/15 px-1.5 text-[10px] font-semibold text-warning" title={`Re-opened ${it.cert.reopened} time(s)`}>↻ {it.cert.reopened}</span> : null}
      </td>
      <td className="px-4 py-2 text-right font-mono tabular-nums text-ink-muted">{it.ledgers || <span className="text-ink-subtle">—</span>}</td>
      <td className="px-4 py-2"><Badge tone={meta.tone} size="sm" dot>{meta.icon} {meta.label}</Badge></td>
      <td className="px-4 py-2">
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs tabular-nums text-ink-muted">{sigs.length}/{TALLY_CHAIN.length}</span>
          {TALLY_CHAIN.map((role) => {
            const signed = sigs.find((s) => s.role === role);
            return <span key={role} title={signed ? `${role} · ${signed.action}${signed.by ? ` · ${signed.by}` : ''}` : `${role} — pending`}
              className={`rounded-full px-1.5 text-[10px] font-semibold ${signed ? 'bg-success/10 text-success' : 'bg-ink/5 text-ink-subtle'}`}>{role}</span>;
          })}
        </div>
      </td>
      <td className={`px-4 py-2 text-right font-mono tabular-nums ${npDelta === null ? 'text-ink-subtle' : npDelta !== 0 ? 'text-danger font-semibold' : 'text-ink-muted'}`}>
        {npDelta === null ? '—' : fmt(npDelta, cur)}
      </td>
      <td className="px-4 py-2 text-right">
        <button type="button" onClick={() => openOnBoard(setRoute, branch, tier, it.period)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:underline">
          Open in Tie-Out <ExternalLink size={12} aria-hidden="true" />
        </button>
      </td>
    </tr>
  );
}

function Kpi({ label, value, tone = 'muted' }) {
  const toneCls = { success: 'text-success', info: 'text-info', warning: 'text-warning', danger: 'text-danger', muted: 'text-ink' }[tone] || 'text-ink';
  return (
    <div className="rounded-brand border border-surface-border bg-surface px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">{label}</div>
      <div className={`mt-0.5 text-2xl font-bold tabular-nums ${toneCls}`}>{value}</div>
    </div>
  );
}
