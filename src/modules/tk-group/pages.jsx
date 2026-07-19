import React, { useState } from 'react';
import { MyRole } from './setup-roles/MyRole';
import { ApprovalsInbox } from './approvals/ApprovalsInbox';
import { FlagAdmin } from './control-configuration/FlagAdmin';
import { PeriodLockAdmin } from './control-configuration/PeriodLockAdmin';
import { DecisionsBoard } from './approvals/DecisionsBoard';
import { ControlTower } from './control-configuration/ControlTower';
import { AdoptionMatrix } from './control-configuration/AdoptionMatrix';
import { IntegrityChecks } from './control-configuration/IntegrityChecks';
import { ModuleTower } from './control-configuration/ModuleTower';
import { HealthScorecard } from './control-configuration/HealthScorecard';
import { RulesManager } from './control-configuration/RulesManager';
import { UserRulesManager } from './control-configuration/UserRulesManager';
import { RuleBook } from './control-configuration/RuleBook';
import { AuthorityAdmin } from './control-configuration/AuthorityAdmin';
import { BranchCockpit } from './control-configuration/BranchCockpit';
import { AuditTrail } from './control-configuration/AuditTrail';
import { TargetsBudgets } from './control-configuration/TargetsBudgets';
import { MasterControl } from './control-configuration/MasterControl';
import { GoLive } from './setup-roles/GoLive';
import { Onboarding } from './approvals/Onboarding';
import { BranchScorecard } from './performance-oversight/BranchScorecard';
import { ExceptionsRisk } from './performance-oversight/ExceptionsRisk';
import { ComplianceClose } from './performance-oversight/ComplianceClose';
import { PerformanceTargets } from './performance-oversight/PerformanceTargets';
import { InvestmentDashboard } from './performance-oversight/InvestmentDashboard';
import { Profitability } from './performance-oversight/Profitability';
import { ReceivablesPayables } from './performance-oversight/ReceivablesPayables';
import { HRControl } from './hr-control/HRControl';
import { RolesResponsibilities } from './setup-roles/RolesResponsibilities';
import { ApprovalsOverview } from './approvals/ApprovalsOverview';
import { ConfigReadiness } from './setup-roles/ConfigReadiness';
import { ControlPanel } from './control-configuration/ControlPanel';
import { TaxDesk } from './performance-oversight/TaxDesk';
import { AssetsCentral } from './performance-oversight/AssetsCentral';
import { LimitsAdmin } from './control-configuration/LimitsAdmin';
import { PageLayout } from '../../shell/PageLayout';
import { BRANCHES } from '../../core/referenceCache';
import { SettingsUsers } from '../settings/legacy';
import { PageAccessControl } from '../settings/pageAccess';
import { ScreenDirectory } from './screen-directory/ScreenDirectory';

const BRANCH_CODES = ['ALL', ...BRANCHES.map((b) => b.code).filter(Boolean)];

// ─── TK GROUP · FE · page wrappers (shell routes) ────────────────────────────
// Thin page shells so App.jsx can route to each TK Group Central surface. They use
// the app's native PageLayout (standard header, spacing, width, design tokens) so
// they look like the rest of the app. DORMANT-SAFE: with core.policy_guard OFF the
// /api/tk/* endpoints return empty / read-only, so pages render a benign empty state.

function Page({ title, subtitle, children, maxWidth = 'max-w-[1600px]' }) {
  return (
    <PageLayout title={title} subtitle={subtitle} maxWidth={maxWidth}>
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

export function TkScreenDirectoryPage() {
  return (
    <Page title="Screen Directory" subtitle="Every screen in the app by its stable number, with a live preview. Look up a screen from a support report and see it exactly as users do." maxWidth="max-w-[1800px]">
      <ScreenDirectory />
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
    <Page title="Decisions" subtitle="Raise a credit-limit, funds-release or counterparty-onboarding decision. Farhan disposes smaller ones; large decisions and all onboarding escalate to the Owner. Nothing posts automatically — approval is the governance record." maxWidth="max-w-none">
      <DecisionsBoard />
    </Page>
  );
}

export function TkControlTowerPage({ setRoute }) {
  return (
    <Page title="Control Tower" subtitle="Is the control layer healthy? Pending approvals, how long they've waited, locked periods, which controls are live, and the latest control events.">
      <ControlTower setRoute={setRoute} />
    </Page>
  );
}

export function TkAdoptionPage() {
  return (
    <Page title="ERP Adoption" subtitle="How much of the ERP each branch actually uses — capability-milestone scoring across every module, branchwise, with a Central column for shared config. Live: the score moves as branches enter data and fix issues.">
      <AdoptionMatrix />
    </Page>
  );
}

export function TkIntegrityPage() {
  return (
    <Page title="Close Readiness & Integrity" subtitle="SAP-style close checklist, branchwise: journal drift, orphan journals, self-approvals, duplicate numbers/masters, suspense, sub-ledger↔GL, depreciation, accruals & GSTR-2B. Live — a fix clears the gate on refresh.">
      <IntegrityChecks />
    </Page>
  );
}

// Two surfaces under one route: ERP Rules (Control-Tower monitoring) + Rule Book
// (read-only reference of the rules enforced in code). Tabbed so they sit together
// under Control & Configuration. User Rules Manager is its own separate entry under
// Rules & Requests (/tk/user-rules → TkUserRulesPage), so it is no longer a tab here.
const RULES_TABS = [
  { id: 'erp', label: 'ERP Rules Manager', subtitle: 'OWNER ONLY. Add, verify and activate the rules the Control Tower monitors. New rules land Inactive (Draft) and do nothing until you Test them on live data and Activate. System rules (🔒) are enforced in code and read-only.' },
  { id: 'authority', label: 'Approval Authority', subtitle: 'OWNER ONLY. Who verifies, approves and signs (Director / Owner) on the three-level approval chain. Read live by the chain from the DB — a change applies immediately (no deploy) and is audited. These were previously invisible hardcoded fallbacks.' },
  { id: 'book', label: 'Rule Book', subtitle: 'Read-only reference of every Accounts & Operations rule the ERP enforces in code — searchable, filterable by Accounts / Operations, each citing the file that enforces it. Documentation only; nothing here is evaluated on live data.' },
];

export function TkRulesPage({ owner, initialTab = 'erp' }) {
  const [tab, setTab] = useState(RULES_TABS.some((t) => t.id === initialTab) ? initialTab : 'erp');
  // Deep-links may target a specific tab; sync when the prop changes (the page does not
  // remount on route change). In-page tab clicks are unaffected.
  React.useEffect(() => { if (RULES_TABS.some((t) => t.id === initialTab)) setTab(initialTab); }, [initialTab]);
  const meta = RULES_TABS.find((t) => t.id === tab) || RULES_TABS[0];
  return (
    <Page title={meta.label} subtitle={meta.subtitle}>
      <div className="mb-4 flex gap-1 border-b border-surface-border">
        {RULES_TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${tab === t.id ? 'border-accent text-accent' : 'border-transparent text-ink-muted hover:text-ink'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'erp' ? <RulesManager canManage={!!owner} />
        : tab === 'authority' ? <AuthorityAdmin canManage={!!owner} />
        : <RuleBook />}
    </Page>
  );
}

// User Control Center — ONE owner-only hub for everything user-related: the user
// list & creation, role templates, per-app login access, per-user page visibility
// and the per-user access rules. Users / Roles / App Access are the SAME component
// as Settings → Users & Roles (SettingsUsers, embedded with a controlled tab) and
// Page Visibility is Settings → Page Visibility Control (PageAccessControl,
// embedded) — both routes keep working; this page just centralises them.
const USER_TABS = [
  { id: 'users', label: 'Users', subtitle: 'Every user with a Books login — add users, set role & branch access, edit the permission matrix, activate / deactivate.' },
  { id: 'roles', label: 'Role Templates', subtitle: 'The ERP role templates — what each role can reach, its special access toggles and how many users hold it.' },
  { id: 'access', label: 'App Access', subtitle: 'Per-app login toggles for CRM, ERP (Books) and Smart Connect. Off = login blocked; open sessions end within ~1 min.' },
  { id: 'pages', label: 'Page Visibility', subtitle: 'Per-user page & report visibility plus branch scope — toggle exactly which screens each user sees, grant out-of-role pages, reset passwords.' },
  { id: 'rules', label: 'User Rules', subtitle: 'Add, verify and activate per-user access rules — who may reach which branch, module or action, an approval ceiling, view-only or a login window. New rules land Inactive (Draft) until you Test the blast radius and Activate.' },
];

export function TkUserRulesPage({ owner, currentUser, setRoute, initialTab = 'users' }) {
  const [tab, setTab] = useState(USER_TABS.some((t) => t.id === initialTab) ? initialTab : 'users');
  // Deep-links may target a specific tab; sync when the prop changes (the page does
  // not remount on route change). In-page tab clicks are unaffected.
  React.useEffect(() => { if (USER_TABS.some((t) => t.id === initialTab)) setTab(initialTab); }, [initialTab]);
  const meta = USER_TABS.find((t) => t.id === tab) || USER_TABS[0];
  return (
    <Page title="User Control Center" subtitle={`OWNER ONLY. ${meta.subtitle}`}>
      <div className="mb-4 flex flex-wrap gap-1 border-b border-surface-border">
        {USER_TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold transition-colors ${tab === t.id ? 'border-accent text-accent' : 'border-transparent text-ink-muted hover:text-ink'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {!owner ? (
        <div className="rounded-lg border border-dashed border-warning p-8 text-center text-sm text-warning">This screen is for the Owner (Super Admin) only. Ask the Owner to manage users and access.</div>
      ) : tab === 'rules' ? <UserRulesManager canManage />
        : tab === 'pages' ? <PageAccessControl embedded currentUser={currentUser} setRoute={setRoute} />
          : <SettingsUsers embedded tab={tab} onTabChange={setTab} />}
    </Page>
  );
}

export function TkHealthScorecardPage() {
  return (
    <Page title="ERP Health Scorecard" subtitle="One composite health % and letter grade per branch — a weighted blend of Health (50%), Close-Readiness (30%) and Adoption (20%). Branchwise; the group figure is the mean of the branches.">
      <HealthScorecard />
    </Page>
  );
}

export function TkModulesPage({ setRoute }) {
  return (
    <Page title="Control Tower — by Module" subtitle="Every one of the 75 ERP modules, grouped by head module, each with a live issue count (Health · Integrity · Adoption, branchwise). Click a module, then a problem, to drill to the exact ledgers / parties / vouchers.">
      <ModuleTower setRoute={setRoute} />
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
