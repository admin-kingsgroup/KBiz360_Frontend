import { isCockpitRoute, isCentralRole, controlCockpitMenu } from '../cockpit';

// The App.jsx guard, in TK Group Central mode, bounces any route where
// isCockpitRoute() is false back to the Control Tower. This locks in WHAT stays
// reachable — so cross-cutting app-bar links (profile/prefs/support) don't break.
describe('isCockpitRoute — what stays reachable in TK Group Central', () => {
  test('control, oversight, governance-surfaced screens stay', () => {
    for (const r of ['/tk/control-tower', '/tk/scorecard', '/dashboards/branch', '/masters/ledgers', '/hr/employees', '/dashboard']) {
      expect(isCockpitRoute(r)).toBe(true);
    }
  });

  test('cross-cutting app-bar / user-menu pages stay (the bug we fixed)', () => {
    for (const r of ['/settings/profile', '/settings/preferences', '/support/tickets']) {
      expect(isCockpitRoute(r)).toBe(true);
    }
  });

  test('branch-operational pages are OUT of control mode (bounce to Control Tower)', () => {
    for (const r of ['/receipts', '/bookings/new', '/journal', '/reports/pnl', '/reports/sreg', '/tax/gstr-1-prep']) {
      expect(isCockpitRoute(r)).toBe(false);
    }
  });
});

describe('cockpit menu integrity', () => {
  test('every cockpit link is itself a reachable cockpit route (no self-bounce)', () => {
    const hrefs = [];
    (function walk(n) { (n || []).forEach((x) => { if (x.href) hrefs.push(x.href); if (x.children) walk(x.children); }); })(controlCockpitMenu());
    for (const h of hrefs) expect(isCockpitRoute(h)).toBe(true);
    expect(new Set(hrefs).size).toBe(hrefs.length); // no duplicates
  });

  test('isCentralRole gates the cockpit to the four central roles', () => {
    expect(isCentralRole({ role: 'Super Admin' })).toBe(true);
    expect(isCentralRole({ role: 'Branch Accountant' })).toBe(false);
  });

  // The shared MegaPanel renderer promotes a section's LEADING title-less link to a
  // boxed "featured" pill, while grouped/post-divider links become titled columns — so
  // a section with loose top-level leaves renders as a different format (pills, or a
  // mix). To keep every header dropdown ONE consistent titled-column look, no cockpit
  // section may expose a bare leaf as a direct child: each must wrap its links in groups.
  test('every cockpit section wraps its links in titled groups (no loose featured pills)', () => {
    const menu = controlCockpitMenu(undefined, { role: 'Super Admin' });
    const offenders = [];
    menu.forEach((section) => {
      if (!section || !section.children) return; // Control Tower is a direct top-level link
      section.children.forEach((child) => {
        if (child && child.href && !child.children && !child.divider) offenders.push(`${section.label} › ${child.label}`);
      });
    });
    expect(offenders).toEqual([]);
  });
});
