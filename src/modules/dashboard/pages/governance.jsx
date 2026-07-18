import React from 'react';
import { AlertsDashboard } from './alerts-dashboard';
import { ApprovalsAuditDash } from '../director/directorDash';

/**
 * GOVERNANCE & EXCEPTIONS — one board consolidating the two governance/risk surfaces:
 *   • Approvals & Audit — maker-checker approvals + audit trail (was /dashboards/audit).
 *   • Alerts           — the live exceptions/alerts feed (was /dashboard/alerts).
 *
 * CONSOLIDATION (2026-07): the two became one destination. `view` is derived from the active
 * route (/dashboards/audit ⇒ approvals, /dashboard/alerts ⇒ alerts) so the URL matches the
 * visible view (deep-linkable, active-nav highlight works); the toggle navigates between them.
 * Both sub-views keep their FULL content and honour the top-right branch selector.
 *
 * ACCESS: this wrapper is owner-facing. App.jsx renders the plain Alerts board (no audit tab)
 * for NON-owners hitting /dashboard/alerts, so a branch user is never shown the central
 * Approvals & Audit surface — the alerts feed stays reachable for them exactly as before.
 */
const TABS = [
  ['approvals', 'Approvals & Audit', '/dashboards/audit'],
  ['alerts', 'Alerts', '/dashboard/alerts'],
];

export function GovernanceBoard({ branch, setRoute, view = 'approvals' }) {
  const active = view === 'alerts' ? 'alerts' : 'approvals';
  const go = (route) => setRoute && setRoute(route);
  return (
    <>
      <div role="tablist" aria-label="Governance & Exceptions view"
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#0d1326', borderBottom: '1px solid #22252d' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#8b93a3', textTransform: 'uppercase', letterSpacing: '.04em', marginRight: 4 }}>Governance &amp; Exceptions</span>
        {TABS.map(([id, label, route]) => {
          const on = active === id;
          return (
            <button key={id} role="tab" aria-selected={on} onClick={() => { if (!on) go(route); }}
              style={{ padding: '5px 14px', fontSize: 12.5, fontWeight: 700, cursor: on ? 'default' : 'pointer', borderRadius: 6,
                color: on ? '#0d1326' : '#c8cfdd', background: on ? '#fff' : 'transparent', border: `1px solid ${on ? '#fff' : '#39415a'}` }}>
              {label}
            </button>
          );
        })}
      </div>
      {active === 'alerts'
        ? <AlertsDashboard branch={branch} setRoute={setRoute} />
        : <ApprovalsAuditDash branch={branch} go={setRoute} />}
    </>
  );
}
