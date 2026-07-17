// ─── "May I raise this document here?" — the FE mirror of entryRights.assertMayOriginate ──
//
// When the Owner engages Branch Accountant control, the four CRM-sourced documents (SO/PO/GP,
// inter-branch deal, refund, reissue) can no longer be RAISED in the ERP by a Branch
// Accountant — they arrive from the CRM and the accountant's part is to check them.
//
// The server refuses with a 403. Without this hook the entry screens have no role gate at
// all, so the accountant fills in an entire multi-line booking, presses an enabled Save, and
// only THEN discovers they were never allowed to — a live no-op, and their work is on screen
// with nowhere to go. This lets the screen say so up front and disable the button with a
// reason, which is the house rule: never a silent or dead control.
//
// DORMANT by default: the flag ships off, and everyone who is not a Branch Accountant is
// unaffected. A failed/absent flag read resolves to "allowed" — same fail-open direction as
// the backend, so a control-plane hiccup can never stop a branch working.
import { useQuery } from '@tanstack/react-query';
import { apiGet, getAuthToken } from '../../core/api';
import { chainUser, flagOn } from '../../core/approvalChain';

const BA_CONTROL_FLAG = 'control.role.branch_accountant';
// The canonical role strings a Branch Accountant logs in as (roles.js CANON). Deliberately
// NOT a loose /accountant/i: 'Sr. Accounts Executive' contains "Accounts" and must not match.
const IS_BRANCH_ACCOUNTANT = /^\s*branch\s*accountant\s*$/i;

/** What the four document kinds are called in the refusal — matches entryRights.DOC_LABEL. */
const WHAT = {
  booking: 'an SO/PO/GP booking',
  reversal: 'a refund or reissue',
  inb: 'an inter-branch deal',
};

/**
 * @param {string} branch  the branch the document would be raised in
 * @param {'booking'|'reversal'|'inb'} kind
 * @returns {{ blocked: boolean, reason: string }}
 */
export function useCanOriginate(branch, kind = 'booking') {
  const role = (chainUser().role) || '';
  const isBA = IS_BRANCH_ACCOUNTANT.test(role);
  // Only a Branch Accountant can ever be blocked, so nobody else pays for the fetch.
  // /effective (not /api/tk/flags) — the central-only read 403s for this very role.
  const q = useQuery({
    queryKey: ['tk', 'flags', 'effective'],
    queryFn: () => apiGet('/api/tk/flags/effective').catch(() => ({})),
    staleTime: 5 * 60_000,
    enabled: isBA && !!getAuthToken(),
  });

  if (!isBA) return { blocked: false, reason: '' };
  const blocked = flagOn(q.data && q.data.flags, BA_CONTROL_FLAG, branch);
  if (!blocked) return { blocked: false, reason: '' };
  return {
    blocked: true,
    reason: `${WHAT[kind] || 'This document'} can’t be raised here — these come from the CRM. `
      + 'Your part is to check it once it arrives: correct it if it’s wrong, then Check it to hand it to the verifier. '
      + 'If it hasn’t arrived, it hasn’t been raised in the CRM yet.',
  };
}
