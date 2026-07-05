import React from 'react';
import { MyRole } from './MyRole';
import { ApprovalsInbox } from './ApprovalsInbox';
import { FlagAdmin } from './FlagAdmin';

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
