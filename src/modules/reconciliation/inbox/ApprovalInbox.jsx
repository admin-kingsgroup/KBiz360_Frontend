import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Inbox, ChevronRight, Snowflake } from 'lucide-react';
import { getInbox } from '../api';
import { BRANCHES, branchCodeOf, tierMenuName, certPathFor, fmtAmt } from '../utils';
import { PageSection, Badge, Button, EmptyState, LoadingState, ErrorState } from '../../../shell/primitives';
import { FULL_SCOPE_ROLES } from '../../../core/branchScope';
import { useCockpitFocusStore } from '../../../store/cockpitFocus';

// ─── TK Group Central · Approval Inbox ───────────────────────────────────────
// Every FROZEN certificate across all branches still awaiting a signature, routed
// by the role it WAITS ON: Daily → AE · Weekly → AE, FM · Month+ → AE, FM,
// Director, Owner. This is the TK Group surface where branch Daily/Weekly freezes
// are APPROVED and Month/Quarter/Year are CERTIFIED — per branch, never blended
// (Rule 06). "Waiting on me" filters to the signed-in role; "Open" jumps to that
// tier's register to act (branch picked by the top TK selector).

const cellCls = 'px-3 py-2.5 text-sm border-b border-surface-border align-top';
const headCls = 'px-3 py-2 text-left text-xs font-bold uppercase tracking-wider text-ink-muted bg-surface-alt border-b border-surface-border whitespace-nowrap';
const TONE = { daily: 'neutral', weekly: 'success', month: 'info', quarter: 'gold', year: 'warning' };

// Does the signed-in user's role satisfy this chain signer? Mirrors the backend
// normalizeRole + roleSatisfies/canSign (Owner ≡ Super Admin; the Owner may act a
// Director step — Rule 07 — and break-glass the Branch-Accountant prepare step of a
// MONTHLY statement freeze only, matching the cert-aware backend gate).
export function roleActs(me, signer, tier) {
  const r = String(me || '').toLowerCase();
  const owner = /owner|super[\s_-]*admin/.test(r);
  if (signer === 'Branch Accountant') return /branch\s*account/.test(r) || (owner && tier === 'month'); // Owner break-glass (month-only)
  if (signer === 'AE') return /account.*(exec|executive)|(^|[^a-z])ae([^a-z]|$)/.test(r);
  if (signer === 'FM') return /finance\s*manager|(^|[^a-z])fm([^a-z]|$)/.test(r);
  if (signer === 'Director') return /director/.test(r) || owner; // Rule 07 fallback
  if (signer === 'Owner') return owner;
  return false;
}

export function ApprovalInbox({ branch: appBranch, setRoute, currentUser }) {
  const code = branchCodeOf(appBranch); // '' in group mode (ALL) → every branch
  const [mineOnly, setMineOnly] = useState(true);
  const setFocus = useCockpitFocusStore((s) => s.setFocus);
  // The inbox is a TK Group Central surface (approvals happen at Group). A branch-
  // scoped user reaching it by direct URL gets the rule, not the board.
  const central = FULL_SCOPE_ROLES.includes(currentUser?.role) || currentUser?.role === 'super_admin';
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['recon-certs', 'inbox', code || 'ALL'],
    queryFn: () => getInbox({ branch: code || 'ALL' }),
    enabled: central,
  });
  const me = data?.me || currentUser?.role || '';
  const all = data?.items || [];
  const mine = all.filter((i) => roleActs(me, i.waitingOn, i.tier));
  const shown = mineOnly ? mine : all;
  const branches = [...new Set(shown.map((i) => i.branch))].sort();

  if (!central) {
    return (
      <div className="mx-auto w-full grid gap-4 px-4 py-4 tablet:px-6 tablet:py-5 desktop:px-8">
        <h1 className="kbiz-page-title">Approval Inbox</h1>
        <EmptyState title="TK Group Central only"
          hint="The Approval Inbox is worked from TK Group Central by AE / FM / Director / Owner. At a branch, use the Daily & Weekly Freeze pages." />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full grid gap-4 px-4 py-4 tablet:px-6 tablet:py-5 desktop:px-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="kbiz-page-title">Approval Inbox</h1>
          <p className="text-sm text-ink-muted">Every frozen reconciliation awaiting a signature — per branch, routed by role. Daily → AE · Weekly → AE, FM · Month+ → AE, FM, Director, Owner. Branch-wise, never mixed.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant={mineOnly ? 'secondary' : 'ghost'} onClick={() => setMineOnly(true)}>Waiting on me ({mine.length})</Button>
          <Button variant={mineOnly ? 'ghost' : 'secondary'} onClick={() => setMineOnly(false)}>All pending ({all.length})</Button>
        </div>
      </div>

      {isLoading && <LoadingState />}
      {isError && <ErrorState onRetry={refetch} />}
      {!isLoading && !isError && shown.length === 0 && (
        <EmptyState title={mineOnly ? 'Nothing waiting on you' : 'No pending approvals'}
          hint={mineOnly ? 'Every frozen reconciliation awaiting your role is cleared.' : 'No branch has a frozen reconciliation waiting for a signature right now.'} />
      )}

      {branches.map((b) => {
        const items = shown.filter((i) => i.branch === b);
        return (
          <PageSection key={b} icon={Inbox} title={b} subtitle={`${items.length} awaiting a signature`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead><tr>
                  <th className={headCls}>Tier</th><th className={headCls}>Ledger</th><th className={headCls}>Period</th>
                  <th className={headCls}>Difference</th><th className={headCls}>Waiting on</th><th className={headCls} aria-label="open" />
                </tr></thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.certId} className="transition-colors hover:bg-gold-light/15">
                      <td className={cellCls}>
                        <Badge tone={TONE[i.tier] || 'neutral'} size="sm">{tierMenuName(i.tier)}</Badge>
                        {i.reopened ? <span className="ml-1"><Badge tone="danger" size="sm">Re-opened</Badge></span> : null}
                      </td>
                      <td className={cellCls}><span className="inline-flex items-center gap-1"><Snowflake size={13} className="text-info" aria-hidden="true" />{i.ledger}</span></td>
                      <td className={`${cellCls} font-mono text-xs`}>{i.period}</td>
                      <td className={cellCls}>{fmtAmt(i.difference, b)}</td>
                      <td className={cellCls}>
                        <Badge tone={roleActs(me, i.waitingOn, i.tier) ? 'success' : 'neutral'} size="sm">{i.waitingOn}</Badge>
                        <span className="ml-1 text-xs text-ink-subtle">{i.action}</span>
                      </td>
                      <td className={cellCls}><Button variant="ghost" size="sm" icon={ChevronRight} onClick={() => { if (i.branch) setFocus(i.branch, BRANCHES); if (setRoute) setRoute(certPathFor(i.tier)); }}>Open</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </PageSection>
        );
      })}
    </div>
  );
}
