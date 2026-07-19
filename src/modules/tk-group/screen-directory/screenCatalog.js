// ───────────────────────────────────────────────────────────────────────────
// SCREEN CATALOG — the row model behind the Control Panel ▸ Screen Directory.
// Merges the stable screen-number registry (route → #n) with each route's
// breadcrumb/name (routeMeta) and which surface(s) it appears on — India branch,
// Africa branch, or the TK Group Central cockpit — by walking the SAME menu
// builders the app renders. Computed once and memoised (menus are static data).
// ───────────────────────────────────────────────────────────────────────────
import registry from '../../../core/screenRegistry.json';
import { crumbsFor, labelFor } from '../../../core/routeMeta';
import { roleMenuRoots } from '../../../core/menus';
import { controlCockpitMenu } from '../cockpit';

// A full-menu owner: sees every pill, so the walk enumerates the whole surface.
const OWNER = { role: 'Super Admin', email: 'afshin.dhanani@kingsgroupco.com', name: 'AD' };

function hrefSet(roots) {
  const set = new Set();
  const walk = (n) => { if (!n || n.divider) return; if (n.href) set.add(n.href); (n.children || []).forEach(walk); };
  (roots || []).forEach(walk);
  return set;
}

let _cache = null;

// [{ no, route, label, section, breadcrumb, surfaces:{india,africa,group}, inMenu, retired }]
export function getScreenCatalog() {
  if (_cache) return _cache;
  const india = hrefSet(roleMenuRoots({ code: 'BOM' }, OWNER));   // India regime branch surface
  const africa = hrefSet(roleMenuRoots({ code: 'NBO' }, OWNER));  // Africa regime branch surface
  const group = hrefSet(controlCockpitMenu('ALL', OWNER));        // consolidated cockpit surface

  const mk = (route, no, retired) => {
    const crumbs = crumbsFor(route).map((c) => c.label);
    const surfaces = { india: india.has(route), africa: africa.has(route), group: group.has(route) };
    return {
      no, route, retired,
      label: labelFor(route),
      section: crumbs[0] || '',
      breadcrumb: crumbs.join(' ▸ '),
      surfaces,
      inMenu: surfaces.india || surfaces.africa || surfaces.group,
    };
  };

  _cache = [
    ...Object.entries(registry.screens || {}).map(([r, n]) => mk(r, n, false)),
    ...Object.entries(registry.retired || {}).map(([r, n]) => mk(r, n, true)),
  ].sort((a, b) => a.no - b.no);
  return _cache;
}
