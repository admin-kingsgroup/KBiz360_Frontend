// ─── TK GATE-MAP · GUARD TEST (Phase 0) ──────────────────────────────────────
// The build-time contract of the Central-vs-Branch model: NO route with a
// `central` verdict may appear on the branch-accountant surface, minus the
// documented PENDING_MIGRATION allowlist (which shrinks to [] as Phase 3 lands).
// The moment a NEW central route leaks onto a branch menu, this test goes red.
import { getMenu } from '../menus';
import { verdictOf, isCentral, CENTRAL, BRANCH, SPLIT, EVERYONE, PENDING_MIGRATION } from '../tkGateMap';

function leafHrefs(node, out = []) {
  if (!node || node.divider) return out;
  if (node.href) out.push(node.href);
  (node.children || []).forEach((c) => leafHrefs(c, out));
  return out;
}
const hrefsOf = (pills) => pills.flatMap((p) => leafHrefs(p));

const BRANCH_OBJ = { code: 'BOM', cur: '₹' };
const ACCOUNTANT = { role: 'Branch Accountant', branches: ['BOM'] };

describe('gate-map classifier', () => {
  test('family prefixes resolve correctly', () => {
    expect(verdictOf('/masters/ledgers')).toBe(CENTRAL);
    expect(verdictOf('/dashboards/profitability')).toBe(CENTRAL);
    expect(verdictOf('/settings/users')).toBe(CENTRAL);
    expect(verdictOf('/assets/register')).toBe(CENTRAL);
    expect(verdictOf('/journal')).toBe(BRANCH);
    expect(verdictOf('/receipts')).toBe(BRANCH);
    expect(verdictOf('/tax/gstr-1-prep')).toBe(SPLIT);
  });

  test('exact-route exceptions win over their family', () => {
    expect(verdictOf('/dashboard')).toBe(BRANCH);            // landing, not the /dashboard/* family
    expect(verdictOf('/dashboard/owner')).toBe(CENTRAL);
    expect(verdictOf('/settings/preferences')).toBe(EVERYONE); // the one everyone-exception
    expect(verdictOf('/accounts/payment-run')).toBe(CENTRAL);  // money-out release
    expect(verdictOf('/accounts/dashboard')).toBe(BRANCH);     // Dashboard Accountant
    expect(verdictOf('/reports/pnl')).toBe(BRANCH);            // Branch MIS, not analytical
    expect(verdictOf('/hr/portal')).toBe(EVERYONE);            // self-service
    expect(verdictOf('/tk/decisions')).toBe(SPLIT);            // branch raises
  });

  test('unknown routes default to branch (never over-block)', () => {
    expect(verdictOf('/something/new')).toBe(BRANCH);
    expect(verdictOf(undefined)).toBe(BRANCH);
  });
});

describe('guard — no central route on the branch surface', () => {
  const branchMenu = getMenu(BRANCH_OBJ, ACCOUNTANT);
  const branchRoutes = [...new Set(hrefsOf(branchMenu))];

  test('every central route in the branch menu is a documented PENDING_MIGRATION item', () => {
    const leaks = branchRoutes.filter((r) => isCentral(r) && !PENDING_MIGRATION.has(r));
    // A non-empty list here means a NEW central route reached a branch menu — either
    // move it off the branch surface or (if intentional for now) add it to
    // PENDING_MIGRATION with a note. It must not be silently tolerated.
    expect(leaks).toEqual([]);
  });

  test('PENDING_MIGRATION contains only central-verdict routes (no rot)', () => {
    const notCentral = [...PENDING_MIGRATION].filter((r) => !isCentral(r));
    expect(notCentral).toEqual([]);
  });

  test('PENDING_MIGRATION has no stale entries — each still sits on the branch menu today', () => {
    const inBranch = new Set(branchRoutes);
    const stale = [...PENDING_MIGRATION].filter((r) => !inBranch.has(r));
    // When Phase 3 removes a route from the branch menu, delete it from
    // PENDING_MIGRATION too — this keeps the allowlist honest and shrinking.
    expect(stale).toEqual([]);
  });
});

// ─── INB · pipelines: verdicts unchanged, but OFF the accountant nav ──────────────────
// Inter-branch trade is bidirectional, so the VERDICT model keeps Outgoing SPLIT (the
// branch raises/monitors; central holds Approve+Push authority, role-gated in
// inb.controller) and Incoming BRANCH — neither is central-with-an-exception.
// 2026-07-17 decision: the whole "Inter Branch" head (pipelines + analytics) was
// removed from the accountant Accounts pill along with Branch MIS / Period Close /
// Accounts Master (MENU_ACCOUNTS_BRANCH_ACCOUNTANT). The screens stay reachable by
// direct URL / per-user grant, the daily INB entry voucher stays under Daily Entry ▸
// Sales & Inter-Branch, and full-menu roles keep the full head.
describe('INB pipelines — verdicts stable, off the accountant nav', () => {
  const branchRoutes = new Set(hrefsOf(getMenu(BRANCH_OBJ, ACCOUNTANT)));

  test('Outgoing is SPLIT — the branch raises/monitors, central holds Approve+Push authority', () => {
    expect(verdictOf('/inb/outgoing')).toBe(SPLIT);
  });

  test('Incoming is BRANCH — the buyer converts and completes it in its own books', () => {
    expect(verdictOf('/inb/incoming')).toBe(BRANCH);
  });

  test('the pipelines are OFF the accountant nav; the daily INB entry survives', () => {
    expect(branchRoutes.has('/inb/outgoing')).toBe(false);
    expect(branchRoutes.has('/inb/incoming')).toBe(false);
    expect(branchRoutes.has('/bookings/inter-branch')).toBe(true); // Daily Entry ▸ Sales & Inter-Branch
  });

  test('neither is central, so neither needs a PENDING_MIGRATION exemption to survive', () => {
    expect(isCentral('/inb/outgoing')).toBe(false);
    expect(isCentral('/inb/incoming')).toBe(false);
    expect(PENDING_MIGRATION.has('/inb/outgoing')).toBe(false);
    expect(PENDING_MIGRATION.has('/inb/incoming')).toBe(false);
  });

  test('the legacy aliases keep the same verdict as the routes they alias', () => {
    expect(verdictOf('/transactions/inb-approvals')).toBe(SPLIT);   // → /inb/outgoing
    expect(verdictOf('/accounts/inb-inbound')).toBe(BRANCH);        // → /inb/incoming
  });
});
