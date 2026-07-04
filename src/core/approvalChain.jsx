// Three-level approval chain (frontend mirror of shared/approvalChain.js):
//   Check (L1 · branch accountant) → Verify (L2) → Approve & Post (L3).
// Assignees come from app-config keys 'approval.verifyEmails' / 'approval.approveEmails'
// (admin-editable, defaults below). The server enforces everything — these helpers only
// decide which button to SHOW; a stale UI can never post past the backend gates.

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet, getAuthToken } from './api';

export const DEFAULT_VERIFY = ['sughra@travkings.com'];
export const DEFAULT_APPROVE = ['faiz@travkings.com'];
const SUPER = /super.?admin/i;

const asList = (v, fb) => {
  const raw = Array.isArray(v) ? v : (typeof v === 'string' && v.trim() ? v.split(/[,;\s]+/) : null);
  const clean = (raw || []).map((e) => String(e || '').trim().toLowerCase()).filter(Boolean);
  return clean.length ? clean : fb;
};

// Signed-in user (email drives L2/L3 eligibility; role only for the Super Admin override).
export function chainUser() {
  try {
    const u = JSON.parse(localStorage.getItem('kb360-user') || '{}');
    return { email: String(u.email || '').toLowerCase(), role: u.role || '' };
  } catch { return { email: '', role: '' }; }
}

// Live config (cached 5 min); safe fallback to the defaults when the key is absent.
export function useApprovalChain() {
  const q = useQuery({
    queryKey: ['app-config', 'approval-chain'],
    queryFn: async () => {
      const [v, a] = await Promise.all([
        apiGet('/api/app-config/approval.verifyEmails').catch(() => null),
        apiGet('/api/app-config/approval.approveEmails').catch(() => null),
      ]);
      return { verify: asList(v && v.value, DEFAULT_VERIFY), approve: asList(a && a.value, DEFAULT_APPROVE) };
    },
    staleTime: 5 * 60_000,
    enabled: !!getAuthToken(),
  });
  return q.data || { verify: DEFAULT_VERIFY, approve: DEFAULT_APPROVE };
}

export const stageOf = (e) => (e && e.reviewStage) || (!e?.checkedBy ? 'check' : (!e?.verifiedBy ? 'verify' : 'approve'));

// The single action the CURRENT user may take on a pending entry at its stage.
// The chain applies ONLY to CRM-created entries — the server marks those with a
// non-empty reviewStage. ERP-entered/legacy entries (blank reviewStage) keep the
// original single-step Approve, open to everyone exactly as before.
export function nextActionFor(e, cfg, user = chainUser()) {
  if (!e || !e.reviewStage) return { stage: '', action: 'approve', label: 'Approve', allowed: true, hint: '' };
  const stage = stageOf(e);
  const su = SUPER.test(user.role);
  if (stage === 'check') return { stage, action: 'check', label: 'Check', allowed: true, hint: 'Level 1 · branch accountant' };
  if (stage === 'verify') {
    return { stage, action: 'verify', label: 'Verify', allowed: su || cfg.verify.includes(user.email), hint: `Level 2 · ${cfg.verify.join(', ')}` };
  }
  return { stage, action: 'approve', label: 'Approve & Post', allowed: su || cfg.approve.includes(user.email), hint: `Level 3 · ${cfg.approve.join(', ')}` };
}

const BADGE = {
  check:   { txt: 'L1 · awaiting Check',   bg: '#EEF2FF', fg: '#3730a3', bd: '#c7d2fe' },
  verify:  { txt: 'L2 · awaiting Verify',  bg: '#FEF9C3', fg: '#854d0e', bd: '#fde68a' },
  approve: { txt: 'L3 · awaiting Approve', bg: '#DCFCE7', fg: '#166534', bd: '#bbf7d0' },
};

// Small stage chip for pending rows: shows the level + who signed the earlier ones.
// Rendered ONLY for CRM-created entries (server sets reviewStage); ERP-entered /
// legacy entries show no chip — they keep the plain single-step Approve.
export function StageChip({ e }) {
  if (!e || !e.reviewStage) return null;
  const s = stageOf(e);
  const b = BADGE[s] || BADGE.check;
  const trail = [e?.checkedBy && `✓ Checked · ${e.checkedBy}`, e?.verifiedBy && `✓ Verified · ${e.verifiedBy}`].filter(Boolean).join('\n');
  return (
    <span title={trail || 'Not yet checked'} style={{ marginLeft: 6, fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 20, whiteSpace: 'nowrap', background: b.bg, color: b.fg, border: `1px solid ${b.bd}` }}>
      {b.txt}
    </span>
  );
}
