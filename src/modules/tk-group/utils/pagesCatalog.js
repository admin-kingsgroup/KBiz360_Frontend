// ── Other Pages — every registered route in the app that ISN'T one of the
// data-creation forms in formsDirectory.js. Ground truth for "every page" is
// screenRegistry.json (auto-generated from the real route table, gen-route-
// manifest.cjs) — NOT core/pageCatalog.js alone, which only covers pages
// reachable from a nav-menu tree (283 of them) and deliberately drops:
//   - ALWAYS_VISIBLE pages (never togglable: /dashboard, /settings/page-access…)
//   - top-level nav pills (/dev/control, /transactions/approvals…)
//   - sub-tab / filter views of a list page (e.g. /bookings/pending — a tab
//     inside /bookings, not its own menu entry) and a few internal/legacy
//     routes with no menu link at all.
// Those ~74 pages are real, reachable pages — just not toggle-catalogue
// entries — so they're included here too, with a best-effort label/note
// instead of the catalogue's proper one.

import screenRegistry from '../../../core/screenRegistry.json';
import { buildPageCatalog, ALWAYS_VISIBLE, topLevelPillHrefs } from '../../../core/pageCatalog';
import { FORM_DIRECTORY } from './formsDirectory';

const FORM_ROUTES = new Set(FORM_DIRECTORY.map((f) => f.route));

function catalogIndex() {
  const idx = new Map();
  for (const section of buildPageCatalog()) {
    for (const item of section.items) {
      idx.set(item.key, {
        name: item.label,
        module: section.section,
        breadcrumb: item.group ? `${section.section} ▸ ${item.group}` : section.section,
      });
    }
  }
  return idx;
}

const titleCase = (seg) => seg.split('-').filter(Boolean).map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

function fallbackEntry(route) {
  const parts = route.split('/').filter(Boolean);
  const name = route === '/' ? 'Home' : titleCase(parts[parts.length - 1]);
  const module = route === '/' ? 'Root' : titleCase(parts[0]);
  const note = ALWAYS_VISIBLE.has(route) ? 'always-visible page, not in the toggle catalogue'
    : topLevelPillHrefs().has(route) ? 'top-level nav pill, not in the toggle catalogue'
    : 'sub-view / not linked directly from a menu';
  return { name, module, breadcrumb: `${module} — ${note}` };
}

export function otherPages() {
  const idx = catalogIndex();
  const routes = Object.keys(screenRegistry.screens).filter((r) => !FORM_ROUTES.has(r));
  return routes
    .map((route) => ({ id: route, route, ...(idx.get(route) || fallbackEntry(route)) }))
    .sort((a, b) => a.module.localeCompare(b.module) || a.name.localeCompare(b.name));
}
