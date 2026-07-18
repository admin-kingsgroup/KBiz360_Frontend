// React Query hooks for the 4-tier Reconciliation module (per-ledger certificates).
//
// These power the read-only STATUS surfaces — the Reconciliation Queue screen, the
// nav-pill badge and the TK-Group reco-readiness tile — not the certificate work
// itself (that stays in modules/reconciliation via its own api.js). Reads fail soft
// so a status surface never turns a dead backend into a false "nothing pending".
//
//   GET /api/reconciliation/queue-status?branch=   → this week's per-bank-ledger status
//   GET /api/reconciliation/summary?branch=        → per-tier counts (+ byBranch for ALL)
//   GET /api/reconciliation/pending?branch=        → the pending-closings board

import { useQuery } from '@tanstack/react-query';
import { apiGet, getAuthToken } from './api';
import { branchCode } from './useAccounting';

// Resilient: a token read that throws (e.g. no import.meta.env under the jest
// transform) simply disables the query rather than crashing the render.
const enabled = () => { try { return !!getAuthToken(); } catch { return false; } };

// This week's reconcile status for every bank/OD ledger of the branch.
export function useReconQueue(branch) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['reconciliation', 'queue-status', code || 'all'],
    queryFn: () => apiGet('/api/reconciliation/queue-status', { branch: code }),
    enabled: enabled(),
    staleTime: 60_000,
  });
}

// Per-tier roll-up (weekly / month / quarter / year) for the pending strip.
export function useReconSummary(branch) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['reconciliation', 'summary', code || 'all'],
    queryFn: () => apiGet('/api/reconciliation/summary', { branch: code }),
    enabled: enabled(),
    staleTime: 60_000,
  });
}

// The pending-closings board (weekly cycles + month/quarter/year closings).
export function useReconPending(branch) {
  const code = branchCode(branch);
  return useQuery({
    queryKey: ['reconciliation', 'pending', code || 'all'],
    queryFn: () => apiGet('/api/reconciliation/pending', { branch: code }),
    enabled: enabled(),
    staleTime: 60_000,
  });
}

// Pure: pending-board rows → { pending, overdue } for the nav pill. 'superseded' (the
// week's month is already certified — Covered by Month-End) is excluded like 'closed',
// so the pill matches the Queue tile, the Reports board and the bell exactly.
export function navCountFromRows(rows = [], today = new Date().toISOString().slice(0, 10)) {
  const live = (rows || []).filter((r) => !r.upcoming && r.state !== 'closed' && r.state !== 'superseded');
  const overdue = live.filter((r) => r.tier === 'weekly' && r.dueOn && r.dueOn < today).length;
  return { pending: live.length, overdue };
}

// Nav-pill badge input: how many reconciliation items across ALL tiers still need
// work this period, and whether any weekly cycle is past its Friday (→ red).
export function useReconNavCount(branch) {
  const { data } = useReconPending(branch);
  return navCountFromRows((data && data.rows) || []);
}
