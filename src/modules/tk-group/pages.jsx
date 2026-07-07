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
import { Onboarding } from './Onboarding';
import { BranchScorecard } from './BranchScorecard';
import { ExceptionsRisk } from './ExceptionsRisk';
import { ComplianceClose } from './ComplianceClose';
import { PerformanceTargets } from './PerformanceTargets';
import { InvestmentDashboard } from './InvestmentDashboard';
import { Profitability } from './Profitability';
import { ReceivablesPayables } from './ReceivablesPayables';
import { HRControl } from './HRControl';
import { RolesResponsibilities } from './RolesResponsibilities';
import { ApprovalsOverview } from './ApprovalsOverview';
import { ConfigReadiness } from './ConfigReadiness';
import { ControlPanel } from './ControlPanel';
import { TaxDesk } from './TaxDesk';
import { AssetsCentral } from './AssetsCentral';
import { LimitsAdmin } from './LimitsAdmin';
import { PageLayout } from '../../shell/PageLayout';
import { BRANCHES } from '../../core/referenceCache';

const BRANCH_CODES = ['ALL', ...BRANCHES.map((b) => b.code).filter(Boolean)];

// ─── TK GROUP · FE · page wrappers (shell routes) ────────────────────────────
// Thin page shells so App.jsx can route to each TK Group Central surface. They use
// the app's native PageLayout (standard header, spacing, width, design tokens) so
// they look like the rest of the app. DORMANT-SAFE: with core.policy_guard OFF the
// /api/tk/* endpoints return empty / read-only, so pages render a benign empty state.

function Page({ title, subtitle, children }) {
  return (
    <PageLayout title={title} subtitle={subtitle} maxWidth="max-w-[1600px]">
      {children}
    </PageLayout>
  );
}

export function TkMyRolePage() {
  return (
    <Page title="My Role" subtitle="Your responsibilities, authority and what currently needs you — in the TK Group control model.">
      <MyRole />
    </Page>
  );
}

export function TkRolesPage() {
  return (
    <Page title="Roles & Responsibilities" subtitle="Everyone's role in the ERP — who reports to whom, what each can approve, and the guardrails. Read-only and auto-updates when the model changes; shareable with the whole team.">
      <RolesResponsibilities />
    </Page>
  );
}

export function TkApprovalsPage() {
  return (
    <Page title="Admin Approval" subtitle="Everything that is NOT a data-entry voucher — config, control flags, thresholds & limits, period locks, masters, party onboarding, user access and credit policy. All these route here when their rule is engaged; vouchers go to Approvals — Vouchers.">
      <ApprovalsInbox />
    </Page>
  );
}

export function TkConfigReadinessPage() {
  return (
    <Page title="Configuration Readiness" subtitle="How much of the control layer is engaged — a green % scoreboard Faiz and the Owner watch climb toward go-live. Read-only; complements the Go-Live activation steps.">
      <ConfigReadiness />
    </Page>
  );
}

export function TkControlPanelPage({ setRoute }) {
  return (
    <Page title="Control Panel" subtitle="The TK Group control centre — enforcement posture, the live approval chain (Check → Verify · Sughra → Approve · Faiz), whether the AE can also approve, and who is under control vs acting independently. Read-only; changes are Owner-approved on Control Flags / Limits.">
      <ControlPanel setRoute={setRoute} />
    </Page>
  );
}

export function TkVoucherApprovalsPage() {
  return (
    <Page title="Voucher Approvals" subtitle="One central queue across all branches — how many vouchers are Pending per branch and the backlog in each branch's own currency. Branchwise; never blended. Approval authority is central (Model B). Use the Focus bar to drill into one branch.">
      <ApprovalsOverview />
    </Page>
  );
}

export function TkControlsPage() {
  return (
    <Page title="Control Flags" subtitle="TK Group control switches — the Owner's to manage. Toggling a flag submits an Owner change-request (never a raw flip), so even go-live is Owner-approved and audited.">
      <FlagAdmin />
    </Page>
  );
}

export function TkLimitsPage() {
  return (
    <Page title="Thresholds & Limits" subtitle="The control-model numbers — decision escalation ceilings, voucher tiers, cash limits, investment thresholds. Owner-editable; changes are filed as an Owner change-request and apply only on approval.">
      <LimitsAdmin />
    </Page>
  );
}

export function TkPeriodLockPage() {
  return (
    <Page title="Period Locks" subtitle="Lock an accounting period so nothing can be posted or edited into it. Proposing a lock (or unlock) is an Owner change-request; 'ALL' locks every branch.">
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
    <Page title="Targets & Budgets" subtitle="Propose a branch target or budget for a period. It's filed as an Owner change-request; nothing applies until approved.">
      <TargetsBudgets branches={BRANCH_CODES} />
    </Page>
  );
}

export function TkMasterControlPage() {
  return (
    <Page title="Master Control" subtitle="Raise a master / chart-of-accounts change (add / rename / deactivate a head). Filed as an Owner change-request; applying it to the master stays a deliberate post-approval step.">
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

export function TkOnboardingPage() {
  return (
    <Page title="Onboarding" subtitle="Onboard a new client or supplier with their credit terms — centrally. Filed as a Farhan + Owner counterparty decision; the party master is set up after approval (nothing auto-creates it).">
      <Onboarding />
    </Page>
  );
}

export function TkScorecardPage() {
  return (
    <Page title="Branch Scorecard" subtitle="Every branch side by side in its own currency — Sales, Gross Profit, GP%, Net Profit and bookings. Branchwise oversight; amounts are never consolidated into a group total.">
      <BranchScorecard />
    </Page>
  );
}

export function TkExceptionsPage() {
  return (
    <Page title="Exceptions & Risk" subtitle="Governance red-flags per branch — net loss, thin margin, no bookings. Each branch judged on its own figures (branchwise), worst first.">
      <ExceptionsRisk />
    </Page>
  );
}

export function TkCompliancePage() {
  return (
    <Page title="Compliance & Close" subtitle="Per-branch close & compliance posture — period-lock status and pending governance/decisions still to clear. Branchwise; never consolidated.">
      <ComplianceClose />
    </Page>
  );
}

export function TkPerformancePage() {
  return (
    <Page title="Performance vs Target" subtitle="Each branch's actual against its own target for the chosen metric — branchwise, in native currency, never consolidated. Targets are the ones approved under Controls ▸ Targets & Budgets.">
      <PerformanceTargets />
    </Page>
  );
}

export function TkInvestmentPage() {
  return (
    <Page title="Investment & Capital" subtitle="Each branch's capital invested, investments, loans, capital employed and profit — branchwise, in native currency, never consolidated into a group total.">
      <InvestmentDashboard />
    </Page>
  );
}

export function TkTaxDeskPage() {
  return (
    <Page title="Central Tax Desk" subtitle="The org-wide statutory compliance calendar (a filing is entity / return level, never a branch sum) plus a branchwise filing-status matrix for the last fileable month.">
      <TaxDesk />
    </Page>
  );
}

export function TkAssetsPage() {
  return (
    <Page title="Assets Central" subtitle="Each branch's fixed-asset register — asset count, gross cost, accumulated depreciation and net book value — branchwise, in native currency, never consolidated into a group total.">
      <AssetsCentral />
    </Page>
  );
}

export function TkProfitabilityPage() {
  return (
    <Page title="Profitability" subtitle="Each branch's P&L — Revenue, Cost, Gross Profit, GP%, Expenses, Net Profit and NP% — branchwise, in native currency, never consolidated.">
      <Profitability />
    </Page>
  );
}

export function TkArapPage() {
  return (
    <Page title="Receivables & Payables" subtitle="Each branch's outstanding — receivables (with 90d+ overdue), payables and the net — branchwise, in native currency, never consolidated.">
      <ReceivablesPayables />
    </Page>
  );
}

export function TkHRControlPage() {
  return (
    <Page title="HR Requests" subtitle="Raise an HR governance item centrally — new hire, salary revision, payroll release. Filed as an Owner change-request; nothing is actioned in HR until approved.">
      <HRControl />
    </Page>
  );
}
