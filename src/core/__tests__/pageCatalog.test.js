// Page Visibility Control catalogue (core/pageCatalog.js).
//
// The catalogue must stay SELF-MAINTAINING: every navigable page the app exports
// has to be controllable here, and a brand-new module added later must appear
// automatically — without anyone editing pageCatalog.js. These tests lock that in.

import * as MENUS from '../menus';
import { TAX_ALL, TAX_INDIA, TAX_AFRICA } from '../data';
import { buildPageCatalog, allPageKeys, ALWAYS_VISIBLE, topLevelPillHrefs } from '../pageCatalog';
import { APP_ROUTES } from '../routeManifest.generated';
// CommonJS generator (reads App.jsx at test time) — used to guard the manifest.
const { manifest } = require('../../../scripts/gen-route-manifest.cjs');

// Collect every href reachable in a menu tree (or array of trees).
function collectHrefs(node, out = new Set()) {
  if (!node || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach((n) => collectHrefs(n, out)); return out; }
  if (typeof node.href === 'string') out.add(node.href);
  if (Array.isArray(node.children)) node.children.forEach((c) => collectHrefs(c, out));
  return out;
}

describe('pageCatalog — Page Visibility Control', () => {
  test('every navigable page from every exported menu is controllable', () => {
    // Source of truth for "every page": walk every menu tree the app exports.
    const everyHref = new Set();
    for (const tree of [...Object.values(MENUS), TAX_ALL, TAX_INDIA, TAX_AFRICA]) {
      collectHrefs(tree, everyHref);
    }
    const controllable = new Set(allPageKeys());
    const pills = topLevelPillHrefs();
    const missing = [...everyHref].filter((h) => !ALWAYS_VISIBLE.has(h) && !pills.has(h) && !controllable.has(h));
    expect(missing).toEqual([]); // nothing navigable is left out of the control
  });

  test('always-visible routes can never be toggled off', () => {
    const keys = new Set(allPageKeys());
    for (const k of ALWAYS_VISIBLE) expect(keys.has(k)).toBe(false);
  });

  test('a href appears under exactly one section (toggling it once has one home)', () => {
    const catalog = buildPageCatalog();
    const seen = new Map();
    for (const s of catalog) for (const it of s.items) seen.set(it.key, (seen.get(it.key) || 0) + 1);
    const dupes = [...seen.entries()].filter(([, n]) => n > 1);
    expect(dupes).toEqual([]);
  });

  test('every route App.jsx can render is controllable (standalone pages too)', () => {
    const controllable = new Set(allPageKeys());
    const pills = topLevelPillHrefs();
    const missing = APP_ROUTES.filter((r) => !ALWAYS_VISIBLE.has(r) && !pills.has(r) && !controllable.has(r));
    expect(missing).toEqual([]);
  });

  test('top-level pills are structural — excluded from the togglable catalogue', () => {
    const controllable = new Set(allPageKeys());
    const pills = topLevelPillHrefs();
    expect(pills.size).toBeGreaterThan(0);            // there is at least one (e.g. Approvals)
    expect(pills.has('/transactions/approvals')).toBe(true);
    for (const p of pills) expect(controllable.has(p)).toBe(false); // never togglable
  });

  test('the generated route manifest is in sync with App.jsx (run `npm run gen:routes`)', () => {
    // Re-extract straight from source; the committed manifest must already match.
    const fresh = manifest().routes;
    const committed = [...APP_ROUTES].sort();
    expect(committed).toEqual([...fresh].sort());
  });

  test('Admin sub-menus (Assets / HO Control / Settings / Import-Export) nest under one "Admin" section', () => {
    const catalog = buildPageCatalog();
    const admin = catalog.find((s) => s.section === 'Admin');
    expect(admin).toBeTruthy();                                   // there is a single "Admin" section
    // …and NOT as separate top-level sections (they moved under Admin, like the top nav).
    for (const s of ['Assets', 'HO Control', 'Settings', 'Import / Export Data']) {
      expect(catalog.some((sec) => sec.section === s)).toBe(false);
    }
    // The Admin section carries those as its sub-groups.
    const groups = new Set(admin.items.map((i) => i.group));
    for (const g of ['Assets', 'HO Control', 'Settings', 'Import / Export Data']) {
      expect(groups.has(g)).toBe(true);
    }
  });

  test('a NEW module added as a menu export is auto-discovered (no edit to pageCatalog)', () => {
    jest.isolateModules(() => {
      jest.doMock('../menus', () => ({
        ...jest.requireActual('../menus'),
        MENU_BRAND_NEW: {
          label: 'Brand New Module',
          children: [{ label: 'Shiny Page', href: '/brand-new/shiny' }],
        },
      }));
      // Fresh pageCatalog picks up the mocked menus namespace.
      const { allPageKeys: keys, buildPageCatalog: build } = require('../pageCatalog');
      expect(keys()).toContain('/brand-new/shiny');
      expect(build().some((s) => s.section === 'Brand New Module')).toBe(true);
    });
    jest.dontMock('../menus');
  });
});
