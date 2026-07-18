import React from 'react';
import { OwnerDashboardPage } from './owner-dashboard';
import { AdCockpitPage } from './ad-cockpit';

/**
 * OWNER COCKPIT — the single owner-home destination, with two view modes:
 *   • Overview (default) — the light, per-branch Owner Dashboard (financial home).
 *   • Cockpit            — the dark, region-tier "Command Bridge" (₹ India / $ Africa
 *                          roll-up, RoNW, budget, integrity, concentration risk).
 *
 * CONSOLIDATION (2026-07): the two owner cockpits ("AD Dashboard (All)" and "AD Cockpit")
 * became ONE destination. Both are non-redundant — each carries widgets the other lacks —
 * so nothing was ported or lost: each view keeps its full widget set. They now share one
 * route + one menu entry. `view` is derived from the ACTIVE route (/dashboard/owner ⇒
 * overview, /dashboard/cockpit ⇒ cockpit) so the URL always matches the visible view
 * (deep-linkable, active-nav highlight works); the toggle simply navigates between the two.
 * Both views honour the SAME top-right branch selector.
 */
const TABS = [
  ['overview', 'Overview', 'Per-branch financial home'],
  ['cockpit', 'Cockpit', 'Region-tier command bridge (₹ India / $ Africa)'],
];

export function OwnerCockpitPage({ currentUser, setRoute, branch, setBranch, view = 'overview' }) {
  const active = view === 'cockpit' ? 'cockpit' : 'overview';
  const go = (v) => setRoute(v === 'cockpit' ? '/dashboard/cockpit' : '/dashboard/owner');
  return (
    <>
      {/* View switch — dark strip so it reads cleanly above BOTH the light Overview and
          the dark Cockpit. Always visible + labelled (no silent mode-switch). */}
      <div role="tablist" aria-label="Owner Cockpit view"
        style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#0d1326', borderBottom: '1px solid #22252d' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#8b93a3', textTransform: 'uppercase', letterSpacing: '.04em', marginRight: 4 }}>Owner Cockpit</span>
        {TABS.map(([id, label, desc]) => {
          const on = active === id;
          return (
            <button key={id} role="tab" aria-selected={on} onClick={() => go(id)} title={desc}
              style={{ padding: '5px 14px', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', borderRadius: 6,
                color: on ? '#0d1326' : '#c8cfdd', background: on ? '#fff' : 'transparent',
                border: `1px solid ${on ? '#fff' : '#39415a'}` }}>
              {label}
            </button>
          );
        })}
      </div>
      {active === 'cockpit'
        ? <AdCockpitPage setRoute={setRoute} branch={branch} />
        : <OwnerDashboardPage currentUser={currentUser} setRoute={setRoute} branch={branch} setBranch={setBranch} />}
    </>
  );
}
