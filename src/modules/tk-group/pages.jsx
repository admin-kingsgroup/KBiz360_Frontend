import React from 'react';
import { MyRole } from './MyRole';
import { ApprovalsInbox } from './ApprovalsInbox';
import { FlagAdmin } from './FlagAdmin';
import { PeriodLockAdmin } from './PeriodLockAdmin';
import { DecisionsBoard } from './DecisionsBoard';
import { ControlTower } from './ControlTower';
import { BranchCockpit } from './BranchCockpit';
import { AuditTrail } from './AuditTrail';
import { TargetsBudgets } from './TargetsBudgets';
import { MasterControl } from './MasterControl';
import { GoLive } from './GoLive';
import { BRANCHES } from '../../core/referenceCache';

const BRANCH_CODES = ['ALL', ...BRANCHES.map((b) => b.code).filter(Boolean)];

// ─── TK GROUP · FE · page wrappers (shell routes) ────────────────────────────
// Thin page shells so App.jsx can route to the three TK Group governance
// surfaces. Each just frames an already-tested container with a title. The pages
// are DORMANT-SAFE: with core.policy_guard OFF the /api/tk/* endpoints return
// empty / read-only, so every page renders a benign empty state until go-live.

function Page({ title, subtitle, children }) {
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '18px 20px' }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: '#1f2a44' }}>{title}</h1>
        {subtitle ? <p style={{ fontSize: 12.5, color: '#5a6691', margin: '4px 0 0' }}>{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function TkMyRolePage() {
  return (
    <Page title="My Role" subtitle="Your responsibilities, authority and what currently needs you — in the TK Group control model.">
      <MyRole />
    </Page>
  );
}

export function TkApprovalsPage() {
  return (
    <Page title="Approvals Inbox" subtitle="Governance change-requests awaiting your decision — config, control flags, period locks, masters and credit policy.">
      <ApprovalsInbox />
    </Page>
  );
}

export function TkControlsPage() {
  return (
    <Page title="Control Flags" subtitle="TK Group control switches. Toggling a flag submits a Farhan + Owner change-request — never a raw flip — so even go-live is dual-approved and audited.">
      <FlagAdmin />
    </Page>
  );
}

export function TkPeriodLockPage() {
  return (
    <Page title="Period Locks" subtitle="Lock an accounting period so nothing can be posted or edited into it. Proposing a lock (or unlock) is a Farhan + Owner change-request; 'ALL' locks every branch.">
      <PeriodLockAdmin branches={BRANCH_CODES} />
    </Page>
  );
}

export function TkDecisionsPage() {
  return (
    <Page title="Decisions" subtitle="Raise a credit-limit, funds-release or counterparty-onboarding decision. Farhan disposes smaller ones; large decisions and all onboarding escalate to the Owner. Nothing posts automatically — approval is the governance record.">
      <DecisionsBoard />
    </Page>
  );
}

export function TkControlTowerPage() {
  return (
    <Page title="Control Tower" subtitle="Is the control layer healthy? Pending approvals, how long they've waited, locked periods, which controls are live, and the latest control events.">
      <ControlTower />
    </Page>
  );
}

export function TkBranchCockpitPage() {
  return (
    <Page title="Branch Cockpit" subtitle="Per-branch control posture — pending decisions, pending governance and locked periods. Rows needing attention are highlighted.">
      <BranchCockpit />
    </Page>
  );
}

export function TkAuditTrailPage() {
  return (
    <Page title="Audit Trail" subtitle="The append-only control-events log — every config change, approval, rejection and lock. Filter by branch or action.">
      <AuditTrail />
    </Page>
  );
}

export function TkTargetsPage() {
  return (
    <Page title="Targets & Budgets" subtitle="Propose a branch target or budget for a period. It's filed as a Farhan + Owner change-request; nothing applies until approved.">
      <TargetsBudgets branches={BRANCH_CODES} />
    </Page>
  );
}

export function TkMasterControlPage() {
  return (
    <Page title="Master Control" subtitle="Raise a master / chart-of-accounts change (add / rename / deactivate a head). Filed as a Farhan + Owner change-request; applying it to the master stays a deliberate post-approval step.">
      <MasterControl />
    </Page>
  );
}

export function TkGoLivePage({ setRoute }) {
  return (
    <Page title="Go-Live" subtitle="Turn the TK Group control layer on. Each step shows its live status; the switch itself is proposed on Control Flags and dual-approved — fully reversible.">
      <GoLive setRoute={setRoute} />
    </Page>
  );
}
