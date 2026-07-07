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
export const DEFAULT_DIRECTOR = ['farhan@travkings.com'];
export const DEFAULT_OWNER = ['afshin.dhanani@kingsgroupco.com'];
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
      const [v, a, d, o] = await Promise.all([
        apiGet('/api/app-config/approval.verifyEmails').catch(() => null),
        apiGet('/api/app-config/approval.approveEmails').catch(() => null),
        apiGet('/api/app-config/approval.directorEmails').catch(() => null),
        apiGet('/api/app-config/approval.ownerEmails').catch(() => null),
      ]);
      return {
        verify: asList(v && v.value, DEFAULT_VERIFY), approve: asList(a && a.value, DEFAULT_APPROVE),
        director: asList(d && d.value, DEFAULT_DIRECTOR), owner: asList(o && o.value, DEFAULT_OWNER),
      };
    },
    staleTime: 5 * 60_000,
    enabled: !!getAuthToken(),
  });
  return q.data || { verify: DEFAULT_VERIFY, approve: DEFAULT_APPROVE, director: DEFAULT_DIRECTOR, owner: DEFAULT_OWNER };
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
  // Escalation sign-offs (only present when approval.escalation_signoffs is engaged for a
  // large voucher — the server sets reviewStage to 'director'/'owner').
  if (stage === 'director') {
    return { stage, action: 'director', label: 'Director sign-off', allowed: su || (cfg.director || DEFAULT_DIRECTOR).includes(user.email), hint: `Director · ${(cfg.director || DEFAULT_DIRECTOR).join(', ')}` };
  }
  if (stage === 'owner') {
    return { stage, action: 'owner', label: 'Owner sign-off', allowed: su || (cfg.owner || DEFAULT_OWNER).includes(user.email), hint: `Owner · ${(cfg.owner || DEFAULT_OWNER).join(', ')}` };
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

// Compact stage tracker for a pending row — Branch → AE · Sughra → (Director · Farhan →
// Owner · Afshin) → FM · Faiz. Filled navy bead = cleared, gold = here now, hollow = still
// ahead. The path matches the backend order: Branch→AE→FM always, with Director (amount
// over the escalate ceiling) and Owner (over the dual ceiling) inserted BEFORE FM's final
// approve — but ONLY when the escalation sign-offs flag is engaged; with it off, FM's
// approve is the final step, so no Director/Owner beads appear (dormant = unchanged).
// Rendered ONLY for chain entries (reviewStage set) — single-step / legacy entries show
// nothing, exactly like StageChip, so the branch approval view is unchanged.
const TRACK_NODES = { branch: 'B', ae: 'AE', director: 'D', owner: 'O', fm: 'FM' };
const TRACK_LABEL = { branch: 'Branch', ae: 'AE · Sughra', director: 'Director · Farhan', owner: 'Owner · Afshin', fm: 'FM · Faiz' };
export function StageTracker({ e }) {
  const lq = useQuery({
    queryKey: ['tk', 'limits'],
    queryFn: () => apiGet('/api/tk/limits').catch(() => ({})),
    staleTime: 5 * 60_000,
    enabled: !!getAuthToken(),
  });
  const fq = useQuery({
    queryKey: ['tk', 'flags'],
    queryFn: () => apiGet('/api/tk/flags').catch(() => ({})),
    staleTime: 5 * 60_000,
    enabled: !!getAuthToken(),
  });
  if (!e || !e.reviewStage) return null;
  const lim = (lq.data && (lq.data.limits || lq.data)) || {};
  const flags = (fq.data && fq.data.flags) || {};
  const ef = flags['approval.escalation_signoffs'] || {};
  const escOn = ef.enabled === true || ef.foundation === true;
  const amt = Math.abs(Number(e.total != null ? e.total : e.amount) || 0);
  const esc = Number(lim.voucherEscalate) > 0 ? Number(lim.voucherEscalate) : Infinity;
  const dual = Number(lim.voucherDual) > 0 ? Number(lim.voucherDual) : Infinity;
  const s = stageOf(e); // check | verify | director | owner | approve
  // Director/Owner beads show only when the feature is engaged AND the amount crosses the
  // ceiling — or when the entry is already sitting at that stage (backend truth, race-proof).
  const wantDirector = (escOn && amt > esc) || s === 'director' || s === 'owner';
  const wantOwner = (escOn && amt > dual) || s === 'owner';
  const path = ['branch', 'ae'];
  if (wantDirector) path.push('director');
  if (wantOwner) path.push('owner');
  path.push('fm'); // FM posts last, after any sign-offs
  const curKey = s === 'check' ? 'branch' : s === 'verify' ? 'ae' : s === 'director' ? 'director' : s === 'owner' ? 'owner' : 'fm';
  const curIdx = path.indexOf(curKey);
  const trail = [
    e?.checkedBy && `✓ Checked · ${e.checkedBy}`,
    e?.verifiedBy && `✓ Verified · ${e.verifiedBy}`,
    `● Now at ${TRACK_LABEL[curKey]}`,
  ].filter(Boolean).join('\n');
  return (
    <span title={trail} style={{ display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle', marginLeft: 6 }}>
      {path.map((k, i) => {
        const state = i < curIdx ? 'done' : i === curIdx ? 'here' : 'wait';
        const bead = state === 'done'
          ? { background: '#1a1c22', color: '#fff', border: '1px solid #1a1c22' }
          : state === 'here'
            ? { background: '#c2a04a', color: '#1a1c22', border: '1px solid #c2a04a', boxShadow: '0 0 0 3px rgba(194,160,74,0.22)' }
            : { background: '#fff', color: '#8a90a2', border: '1.5px solid #cdd1d8' };
        return (
          <React.Fragment key={k}>
            {i > 0 && <span style={{ width: 11, height: 2, background: i <= curIdx ? '#1a1c22' : '#cdd1d8' }} />}
            <span aria-label={TRACK_LABEL[k]} style={{ width: 16, height: 16, borderRadius: '50%', display: 'inline-grid', placeItems: 'center', fontSize: 7.5, fontWeight: 800, ...bead }}>
              {state === 'done' ? '✓' : TRACK_NODES[k]}
            </span>
          </React.Fragment>
        );
      })}
    </span>
  );
}
