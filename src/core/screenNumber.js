// ───────────────────────────────────────────────────────────────────────────
// SCREEN NUMBERS — a stable, human-friendly id shown top-right on every screen.
// The registry (route → #number) is generated + frozen by scripts/gen-route-
// manifest.cjs: numbers are assigned once and never change or get reused, so a
// support report ("Screen #142 is broken") always points to the same screen.
// This module is the read side: look a number up, reverse it, and build the
// copy-paste "issue token" the badge hands to whoever is reporting a problem.
// ───────────────────────────────────────────────────────────────────────────
import registry from './screenRegistry.json';
import { crumbsFor, labelFor } from './routeMeta';

const SCREENS = (registry && registry.screens) || {};
const REVERSE = Object.entries(SCREENS).reduce((m, [route, no]) => { m[no] = route; return m; }, {});

// The number for a route, or null if the route isn't registered (e.g. a brand-new
// route added before the generator re-ran). Callers render a graceful fallback.
export function screenNoFor(route) {
  return route && SCREENS[route] != null ? SCREENS[route] : null;
}

// Display tag, e.g. "#142" (or "#—" when unregistered).
export function screenTag(route) {
  const n = screenNoFor(route);
  return n != null ? `#${n}` : '#—';
}

// Reverse lookup for the dev side: "#142" → "/sales/flight".
export function routeForScreenNo(no) {
  return REVERSE[Number(no)] || null;
}

// "Sales ▸ Ticketing ▸ Flight" for the current route (reuses the breadcrumb map).
export function screenBreadcrumb(route) {
  return crumbsFor(route).map((c) => c.label).join(' ▸ ');
}

// A sensible default ticket title, e.g. "Screen #142 — Flight (Sale)".
export function issueTitle(route) {
  return `Screen ${screenTag(route)} — ${labelFor(route)}`;
}

// The one-line, copy-paste report that gives a developer everything to locate and
// reproduce: screen number, route, breadcrumb, branch, role, and a timestamp.
export function buildIssueToken({ route, branch, role, name, at } = {}) {
  const r = route || (typeof window !== 'undefined' ? window.location.pathname : '');
  const br = branch && typeof branch === 'object' ? (branch.code || branch.name) : branch;
  const when = at || (() => { try { return new Date().toLocaleString(); } catch { return ''; } })();
  return [
    `Screen ${screenTag(r)}`,
    r,
    screenBreadcrumb(r),
    br ? `branch ${br}` : '',
    role || '',
    name || '',
    when,
  ].filter(Boolean).join(' · ');
}
