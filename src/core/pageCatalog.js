/* ════════════════════════════════════════════════════════════════════
   CORE/PAGE-CATALOG.JS
   The single source of truth for "every page/report a user could see",
   derived by walking the SAME menu trees the nav renders (core/menus.js +
   the tax sections in core/data.js). Powers Settings → Page Visibility
   Control: the admin (afshin / Super Admin) toggles each entry on/off per
   user; an OFF entry is added to that user's `hidden` deny-list, which
   getMenu() prunes from the nav and App.jsx blocks as a route.

   Keeping the catalogue derived (not hand-maintained) means new menu items
   automatically appear here — no second list to keep in sync.
   ════════════════════════════════════════════════════════════════════ */

// Namespace imports (not named) so the catalogue can DISCOVER every menu tree the
// app exports — including ones added later — instead of a hand-maintained list.
// Accessed only lazily inside sectionRoots(), never at module-eval, so the
// menus.js ↔ pageCatalog.js import cycle can't read a binding before it's
// initialised (TDZ).
import * as MENUS from './menus';
import * as DATA from './data';
// Complete list of routes App.jsx can render — AUTO-GENERATED from App.jsx by
// scripts/gen-route-manifest.cjs (runs on predev/prebuild/pretest). Lets the
// catalogue expose EVERY page, including standalone routes not in any nav menu.
import { APP_ROUTES, APP_ROUTE_LABELS } from './routeManifest.generated';

// Who may open Page Visibility Control: ONLY afshin, by email — no role (not even
// Super Admin / Senior Finance Manager) grants it. Mirrors the backend gate in
// features/auth/auth.route.js (requirePageAccessAdmin) — keep both in sync.
export const PAGE_ACCESS_ADMIN_EMAIL = 'afshin.dhanani@kingsgroupco.com';

export function isPageAccessAdmin(user) {
  if (!user) return false;
  return String(user.email || '').toLowerCase() === PAGE_ACCESS_ADMIN_EMAIL;
}

// Routes that must NEVER be hidden — hiding them would lock a user out of the
// app's landing screen, or lock the admin out of this very control. They are
// excluded from the catalogue (can't be toggled) and never pruned.
// '/dashboard/owner' is gated by EMAIL (owner only) at the route + menu level, not
// by the page-visibility catalogue — so it's always-visible here (never toggled).
export const ALWAYS_VISIBLE = new Set(['/dashboard', '/dashboard/owner', '/settings/page-access']);

// Is this value a menu node?  { label, children[] } or a leaf { label, href }.
function isMenuNode(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v)
    && typeof v.label === 'string'
    && (Array.isArray(v.children) || typeof v.href === 'string');
}

// Curated order for the sections we already know — gives the nicest grouping and
// nav-order on the control screen. Listed by EXPORT NAME so they resolve from the
// live namespaces below.
const PREFERRED_SECTIONS = [
  'MENU_DASHBOARDS', 'MENU_FINANCE', 'MENU_APPROVALS', 'MENU_ACCOUNTS', 'MENU_REPORTS',
  'TAX_ALL', 'TAX_INDIA', 'TAX_AFRICA', 'MENU_MASTERS', 'MENU_TRANSACTIONS',
  'MENU_HR', 'MENU_ASSETS', 'MENU_HO_CONTROL', 'MENU_SETTINGS', 'MENU_IMPORT_EXPORT',
];
// Umbrella / alias exports skipped when auto-appending: they only RE-GROUP sections
// already listed above (MENU_ADMIN nests HR/Assets/Settings/…; MENU_COMMON_TOP is an
// array of pills already covered), so including them would duplicate, not add.
const SECTION_SKIP = new Set(['MENU_ADMIN', 'MENU_COMMON_TOP']);

// The top-level sections to expose. We take the curated order first, then
// AUTO-APPEND every OTHER menu tree the app exports that isn't already represented.
// That auto-append is the guarantee the admin asked for: a new page under an
// existing menu already appears (build() walks children), AND a whole new
// module/section added as a new MENU_* / TAX_* export shows up here automatically —
// with no edit to this file. Resolved lazily (TDZ-safe; see the import note above).
function sectionRoots() {
  const sources = { ...MENUS, ...DATA };
  const roots = [];
  const taken = new Set();
  // 1) Curated sections, in order.
  for (const key of PREFERRED_SECTIONS) {
    if (isMenuNode(sources[key])) { roots.push(sources[key]); taken.add(key); }
  }
  // 2) Safety net: any other exported menu tree (a newly added module/section).
  for (const [key, val] of Object.entries(sources)) {
    if (taken.has(key) || SECTION_SKIP.has(key)) continue;
    if (isMenuNode(val)) { roots.push(val); taken.add(key); }
  }
  return roots;
}

// Flatten one menu tree to its navigable leaves: { key (href), label, trail }.
function collectLeaves(node, trail, out) {
  if (!node || node.divider) return;
  const here = node.label ? [...trail, node.label] : trail;
  if (node.href) out.push({ key: node.href, label: node.label || node.href, trail: here });
  (node.children || []).forEach((c) => collectLeaves(c, here, out));
}

// Friendly section name for a standalone route (one not found in any menu),
// grouped by its first path segment so related extras sit together.
const PREFIX_SECTION = {
  finance: 'Finance', reports: 'Reports', hr: 'HR & Payroll', ho: 'HO Control',
  tax: 'Taxation', masters: 'Masters', settings: 'Settings', accounts: 'Accounts',
  accounting: 'Accounting', assets: 'Assets', sales: 'Sales', purchase: 'Purchase',
  'purchase-expense': 'Purchase', dashboards: 'Dashboards', dashboard: 'Dashboards',
  bookings: 'Bookings', transactions: 'Transactions', expense: 'Expense',
};
const titleCase = (s) => String(s || '').split(/[-_]/).filter(Boolean)
  .map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
const routeSection = (route) => {
  const seg = route.replace(/^\//, '').split('/');
  return seg.length < 2 ? 'Other · General' : `Other · ${PREFIX_SECTION[seg[0]] || titleCase(seg[0])}`;
};
const routeLabel = (route) =>
  APP_ROUTE_LABELS[route] || titleCase(route.replace(/^\//, '').split('/').pop());

// Build the catalogue once (menus are static module-level data). Each section
// lists its leaves de-duplicated by href; a href that appears in several
// sections is shown only under the first section it occurs in, so toggling it
// once has one obvious home (it still hides everywhere, since `hidden` is keyed
// by href). ALWAYS_VISIBLE keys are dropped. After the menu sections we fold in
// EVERY remaining App route (from the generated manifest) under "Other · …"
// groups, so the admin can hide ANY page — not just nav links.
function build() {
  const sections = [];
  const seen = new Set();
  for (const root of sectionRoots()) {
    const leaves = [];
    collectLeaves(root, [], leaves);
    const items = [];
    for (const lf of leaves) {
      if (ALWAYS_VISIBLE.has(lf.key) || seen.has(lf.key)) continue;
      seen.add(lf.key);
      items.push({ key: lf.key, label: lf.label });
    }
    if (items.length) sections.push({ section: root.label, icon: root.icon || null, items });
  }
  // Standalone routes not surfaced by any menu, grouped under "Other · …".
  const extra = new Map();
  for (const route of APP_ROUTES) {
    if (ALWAYS_VISIBLE.has(route) || seen.has(route)) continue;
    seen.add(route);
    const sec = routeSection(route);
    if (!extra.has(sec)) extra.set(sec, []);
    extra.get(sec).push({ key: route, label: routeLabel(route) });
  }
  for (const sec of [...extra.keys()].sort()) {
    sections.push({ section: sec, icon: null, items: extra.get(sec).sort((a, b) => a.label.localeCompare(b.label)) });
  }
  return sections;
}

let _cache = null;
export function buildPageCatalog() {
  if (!_cache) _cache = build();
  return _cache;
}

// Every togglable page key (handy for "hide all" / counts).
export function allPageKeys() {
  return buildPageCatalog().flatMap((s) => s.items.map((i) => i.key));
}
