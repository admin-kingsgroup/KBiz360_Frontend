/* ════════════════════════════════════════════════════════════════════
   MODULES/DEV-CONTROL/SCAN.JS — automated code-scan merge + presentation
   ════════════════════════════════════════════════════════════════════
   Single source of truth for turning the ERP's two scan sources into ONE
   finding set for the Control Tower ▸ Development lens and the Developer
   Control page:

     • LIVE  — GET /api/dev-control/scan (backend walks the source trees on
               disk on every refresh; always covers the API, and covers the
               frontend too when the backend can reach that tree — dev).
     • BUILD — src/core/devScan.generated.js (frontend findings baked at
               build time; the coverage the backend can't reach on prod).

   Merge rule: if the live scan reported the FE tree as scanned, its FE
   findings are authoritative and the build-time copy is dropped (no double
   count). Otherwise the build-time FE findings fill the gap. The API (BE)
   findings always come from live. De-duped by stable id as a backstop.

   These are AUTOMATED findings — distinct from the hand-maintained registry
   findings (./registry.js). The Development lens shows both: "issues the
   scanner found in the code" and "features the developer registry tracks".
   ──────────────────────────────────────────────────────────────────── */

import { DEV_SCAN } from '../../core/devScan.generated';

export const SCAN_SEVERITY = {
  high:   { label: 'High',   color: '#cf222e', bg: '#ffebe9', rank: 0 },
  medium: { label: 'Medium', color: '#9a6700', bg: '#fff8e1', rank: 1 },
  low:    { label: 'Low',    color: '#57606a', bg: '#f0f2f5', rank: 2 },
};

// Category → how it reads to a developer. Order = display order (worst first).
export const SCAN_CATEGORY = {
  structure:     { label: 'Structure / broken code', desc: 'Broken imports — a module that will crash when the file loads.' },
  routing:       { label: 'Routing', desc: 'A menu or registry link points at a route the app can no longer render (blank / 404).' },
  placeholder:   { label: 'Empty placeholders', desc: 'Screens/handlers that render "not implemented / coming soon" — a visible dead-end.' },
  'ui-ux':       { label: 'UI / UX', desc: 'Dead buttons (empty handler) and dead links (href="#") — the UI looks broken to users.' },
  'broken-code': { label: 'Broken code / tech-debt', desc: 'debugger statements, silently-swallowed errors, and unresolved TODO/FIXME/HACK markers.' },
};
const CATEGORY_ORDER = Object.keys(SCAN_CATEGORY);

const dedupeById = (rows) => {
  const seen = new Set(); const out = [];
  for (const r of rows) { if (r && !seen.has(r.id)) { seen.add(r.id); out.push(r); } }
  return out;
};

function countUp(findings) {
  const bySeverity = { high: 0, medium: 0, low: 0 };
  const byCategory = {};
  const byTree = { FE: 0, BE: 0 };
  for (const f of findings) {
    bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1;
    byCategory[f.category] = (byCategory[f.category] || 0) + 1;
    byTree[f.tree] = (byTree[f.tree] || 0) + 1;
  }
  return { total: findings.length, bySeverity, byCategory, byTree };
}

/* Merge the live backend scan with the build-time FE scan.
   `live` = getCodeScan() payload (may be an empty/unreachable shape). */
export function mergeScan(live) {
  const l = live || {};
  const liveFindings = Array.isArray(l.findings) ? l.findings : [];
  const roots = Array.isArray(l.roots) ? l.roots : [];
  const feLive = roots.some((r) => r.tree === 'FE' && r.scanned);
  const beScanned = roots.some((r) => r.tree === 'BE' && r.scanned);

  // Live FE findings are authoritative when present; otherwise use the build copy.
  const buildFindings = feLive ? [] : ((DEV_SCAN && DEV_SCAN.findings) || []);
  const findings = dedupeById([...liveFindings, ...buildFindings]).sort((a, b) =>
    (SCAN_SEVERITY[a.severity].rank - SCAN_SEVERITY[b.severity].rank) ||
    (CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)) ||
    a.tree.localeCompare(b.tree) || a.file.localeCompare(b.file) || (a.line - b.line));

  return {
    findings,
    counts: countUp(findings),
    roots,
    feLive,
    beScanned,
    feFromBuild: !feLive,
    unreachable: !!l.unreachable,
    cached: !!l.cached,
    generatedAt: l.generatedAt || null,
    buildFilesScanned: (DEV_SCAN && DEV_SCAN.filesScanned) || 0,
  };
}

/* Group findings by category, worst-first, for the sectioned table view. */
export function groupByCategory(findings) {
  const map = {};
  for (const f of findings) (map[f.category] = map[f.category] || []).push(f);
  return CATEGORY_ORDER
    .filter((c) => map[c] && map[c].length)
    .map((c) => ({ category: c, ...SCAN_CATEGORY[c], findings: map[c] }));
}
