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

import {
  MENU_MASTERS, MENU_FINANCE, MENU_REPORTS, MENU_HR, MENU_SETTINGS, MENU_ASSETS,
  MENU_HO_CONTROL, MENU_DASHBOARDS, MENU_IMPORT_EXPORT,
  MENU_APPROVALS, MENU_ACCOUNTS,
} from './menus';
import { TAX_ALL, TAX_INDIA, TAX_AFRICA } from './data';

// Who may open Page Visibility Control (mirrors the backend gate in
// features/auth/auth.route.js — keep both in sync).
export const PAGE_ACCESS_ADMIN_EMAIL = 'afshin.dhanani@kingsgroupco.com';
const PAGE_ACCESS_ADMIN_ROLES = new Set(['Super Admin', 'Senior Finance Manager', 'super_admin']);

export function isPageAccessAdmin(user) {
  if (!user) return false;
  if (PAGE_ACCESS_ADMIN_ROLES.has(user.role)) return true;
  return String(user.email || '').toLowerCase() === PAGE_ACCESS_ADMIN_EMAIL;
}

// Routes that must NEVER be hidden — hiding them would lock a user out of the
// app's landing screen, or lock the admin out of this very control. They are
// excluded from the catalogue (can't be toggled) and never pruned.
export const ALWAYS_VISIBLE = new Set(['/dashboard', '/settings/page-access']);

// The top-level sections to expose, in nav order. Each becomes a collapsible
// group of leaf pages on the control screen. The plain Dashboard pill and the
// branch Accounts workspace are folded in so nothing reachable is missing.
// Resolved lazily (inside a function) — never at module-eval time — so the
// menus.js ↔ pageCatalog.js import cycle can't read a menu binding before it's
// initialised (TDZ). By the time build() runs, both modules are fully evaluated.
function sectionRoots() {
  return [
    MENU_DASHBOARDS, MENU_FINANCE, MENU_APPROVALS, MENU_ACCOUNTS, MENU_REPORTS,
    TAX_ALL, TAX_INDIA, TAX_AFRICA, MENU_MASTERS,
    MENU_HR, MENU_ASSETS, MENU_HO_CONTROL, MENU_SETTINGS, MENU_IMPORT_EXPORT,
  ].filter(Boolean);
}

// Flatten one menu tree to its navigable leaves: { key (href), label, trail }.
function collectLeaves(node, trail, out) {
  if (!node || node.divider) return;
  const here = node.label ? [...trail, node.label] : trail;
  if (node.href) out.push({ key: node.href, label: node.label || node.href, trail: here });
  (node.children || []).forEach((c) => collectLeaves(c, here, out));
}

// Build the catalogue once (menus are static module-level data). Each section
// lists its leaves de-duplicated by href; a href that appears in several
// sections is shown only under the first section it occurs in, so toggling it
// once has one obvious home (it still hides everywhere, since `hidden` is keyed
// by href). ALWAYS_VISIBLE keys are dropped.
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
