/* ════════════════════════════════════════════════════════════════════════════
   scripts/dev-scan/codeScan.cjs — frontend build-time code scanner

   The FRONTEND half of the ERP's automated development scanner. It applies the
   SAME rules as the backend runtime scanner (kbiz360-erp-backend/src/features/
   dev-control/codeScan.js) but runs at build time over KBiz360_Frontend/src, so
   the Control Tower ▸ Development lens still has full FE coverage on production,
   where the backend EC2 box has no frontend source to scan live.

   In DEV the backend also reaches this tree and scans it live; the Development
   lens then prefers the live findings and ignores this build-time copy (it keys
   off scan.roots[].scanned). This file is the prod safety net + the guard test's
   input. Keep the RULES / regexes in lock-step with the backend engine.

   Pure fs + regex, dependency-free (runs before `npm run dev/build/test`).
   ════════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');

const CODE_EXT = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);
const RESOLVE_EXT = ['', '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json'];
const RESOLVE_INDEX = ['index.js', 'index.jsx', 'index.ts', 'index.tsx'];
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.git', '.next', '.cache', '__tests__', '__mocks__', '__snapshots__']);
const SKIP_FILE = /(\.test\.|\.spec\.|\.generated\.|codeScan\.|devScan\.|registry\.js$|routeManifest|devControl\/scan\.js$|CodeScanPanel)/i;

const RULES = {
  'broken-import': { category: 'structure', severity: 'high', title: 'Broken import — module not found',
    remark: 'This relative import/require does not resolve to a file on disk. Fix the path, restore the missing module, or remove the dead import — the bundle/route will crash when this file loads.' },
  'dead-route': { category: 'routing', severity: 'high', title: 'Menu links to a route the app cannot render',
    remark: 'A navigation menu points at a path that is not in the app router (APP_ROUTES) and is not referenced in App.jsx — clicking it shows a blank / 404 page. Add the route to App.jsx (and regenerate the manifest) or fix the menu href.' },
  'registry-route-missing': { category: 'routing', severity: 'medium', title: 'Registry route no longer exists',
    remark: 'The developer registry lists this route for a feature, but the app can no longer render it. Update the registry entry or restore the route so deep-links from Dev Control work.' },
  'not-implemented': { category: 'placeholder', severity: 'high', title: 'Not-implemented placeholder',
    remark: 'This screen/handler throws or renders a "not implemented / coming soon" placeholder — it is a visible dead-end for the user. Build the real behaviour or hide the entry point until it is ready.' },
  'dead-button': { category: 'ui-ux', severity: 'medium', title: 'Dead button — empty click handler',
    remark: 'This control has an empty onClick (() => {}) so clicking it does nothing — users perceive a broken UI. Wire the handler or remove the control.' },
  'dead-link': { category: 'ui-ux', severity: 'low', title: 'Dead link — href="#"',
    remark: 'A link points at "#" so it scrolls to top / does nothing. Give it a real target or convert it to a button with an onClick.' },
  'debugger': { category: 'broken-code', severity: 'medium', title: 'debugger statement left in source',
    remark: 'A debugger statement will halt execution when devtools are open. Remove it before shipping.' },
  'empty-catch': { category: 'broken-code', severity: 'low', title: 'Empty catch — error silently swallowed',
    remark: 'This catch block is empty with no comment, so failures disappear silently. Handle the error, surface it, or at least add a note on why it is safe to ignore.' },
  'todo': { category: 'broken-code', severity: 'low', title: 'Unresolved TODO / FIXME / HACK',
    remark: 'A TODO/FIXME/HACK/XXX marker flags known-incomplete work at this line. Resolve it or track it so it is not forgotten.' },
};

function walk(root, acc = []) {
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.') continue;
    const full = path.join(root, e.name);
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(full, acc); }
    else if (CODE_EXT.has(path.extname(e.name)) || path.extname(e.name) === '.css') acc.push(full);
  }
  return acc;
}

function resolves(fromFile, spec) {
  if (!spec || !/^\.\.?\//.test(spec)) return true;
  const cleaned = spec.split('?')[0].split('#')[0];
  const base = path.resolve(path.dirname(fromFile), cleaned);
  for (const ext of RESOLVE_EXT) { try { if (fs.statSync(base + ext).isFile()) return true; } catch { /* try next */ } }
  for (const idx of RESOLVE_INDEX) { try { if (fs.statSync(path.join(base, idx)).isFile()) return true; } catch { /* try next */ } }
  try { if (fs.statSync(base).isDirectory()) return true; } catch { /* not a dir */ }
  return false;
}

function stripToCode(text) {
  let out = ''; let str = null; let block = false; let line = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]; const c2 = text[i + 1];
    if (block) { if (c === '*' && c2 === '/') { out += '  '; i++; block = false; } else out += (c === '\n' ? '\n' : ' '); continue; }
    if (line) { if (c === '\n') { out += '\n'; line = false; } else out += ' '; continue; }
    if (str) { out += c; if (c === '\\') { out += (c2 || ''); i++; } else if (c === str) str = null; continue; }
    if (c === '/' && c2 === '/') { out += '  '; i++; line = true; continue; }
    if (c === '/' && c2 === '*') { out += '  '; i++; block = true; continue; }
    if (c === '"' || c === "'" || c === '`') { str = c; out += c; continue; }
    out += c;
  }
  return out.split('\n');
}

const IMPORT_PATS = [
  /\bimport\s+(?:[^'"]*?\bfrom\s+)?['"]([^'"]+)['"]/g,
  /\bexport\s+(?:\*|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g,
  /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
];
function importSpecs(codeLines) {
  const out = [];
  codeLines.forEach((ln, i) => { for (const re of IMPORT_PATS) { re.lastIndex = 0; let m; while ((m = re.exec(ln))) out.push({ spec: m[1], line: i + 1 }); } });
  return out;
}

const NOT_IMPL = /throw\s+new\s+Error\(\s*['"`](?:not\s*implemented|unimplemented|todo|fixme|coming\s*soon)/i;
const RENDER_NOTWIRED = /<NotWired\b/;
const PLACEHOLDER_TXT = /\b(coming soon|not implemented|not yet implemented|to be implemented|under construction|lorem ipsum)\b/i;
const DEAD_BTN = /onClick=\{\s*\(\s*\)\s*=>\s*\{\s*\}\s*\}/;
const DEAD_LINK = /href=["']#["']/;
const DEBUGGER = /(^|[\s;{])debugger\s*;/;
const EMPTY_CATCH = /catch\s*(?:\([^)]*\))?\s*\{\s*\}/;
const TODO_MARK = /(?:\/\/|\/\*|\*)[^\n]*?\b(TODO|FIXME|HACK|XXX)\b/;

function mkFinding(rule, tree, file, line, snippet) {
  const r = RULES[rule];
  return { id: `${tree}:${file}:${line}:${rule}`, tree, rule, category: r.category, severity: r.severity, title: r.title, remark: r.remark, file, line, snippet: (snippet || '').slice(0, 200) };
}

function markerFindings(relFile, tree, rawLines, codeLines) {
  const out = [];
  const push = (rule, i, snippet) => out.push(mkFinding(rule, tree, relFile, i + 1, (snippet || rawLines[i] || '').trim()));
  codeLines.forEach((code, i) => {
    if (NOT_IMPL.test(code) || RENDER_NOTWIRED.test(code)) push('not-implemented', i);
    else if (PLACEHOLDER_TXT.test(code) && !/placeholder=/.test(code)) push('not-implemented', i);
    if (DEAD_BTN.test(code)) push('dead-button', i);
    if (DEAD_LINK.test(code) && !/onClick/.test(code)) push('dead-link', i);
    if (DEBUGGER.test(code)) push('debugger', i);
  });
  rawLines.forEach((raw, i) => {
    if (TODO_MARK.test(raw)) push('todo', i, raw);
    if (EMPTY_CATCH.test(raw)) push('empty-catch', i, raw);
  });
  return out;
}

function readAppRoutes(feSrc) {
  try {
    const txt = fs.readFileSync(path.join(feSrc, 'core/routeManifest.generated.js'), 'utf8');
    const m = txt.match(/APP_ROUTES\s*=\s*(\[[\s\S]*?\]);/);
    return m ? new Set(JSON.parse(m[1])) : null;
  } catch { return null; }
}

function routeFindings(feSrc) {
  const routes = readAppRoutes(feSrc);
  if (!routes) return [];
  let appJsx = '';
  try { appJsx = fs.readFileSync(path.join(feSrc, 'App.jsx'), 'utf8'); } catch { /* ignore */ }
  const renderable = (r) => routes.has(r) || appJsx.includes(`"${r}"`) || appJsx.includes(`'${r}'`);
  const out = [];
  try {
    const menus = fs.readFileSync(path.join(feSrc, 'core/menus.js'), 'utf8');
    const seen = new Set();
    menus.split('\n').forEach((ln, i) => {
      for (const m of ln.matchAll(/href\s*:\s*["'](\/[^"']*)["']/g)) {
        const href = m[1].split('?')[0].split('#')[0];
        if (!href || href.includes(':') || seen.has(href)) continue;
        seen.add(href);
        if (!renderable(href)) out.push(mkFinding('dead-route', 'FE', 'core/menus.js', i + 1, `href: "${m[1]}"`));
      }
    });
  } catch { /* no menus */ }
  try {
    const reg = fs.readFileSync(path.join(feSrc, 'modules/devControl/registry.js'), 'utf8');
    const seen = new Set();
    reg.split('\n').forEach((ln, i) => {
      const rm = ln.match(/routes\s*:\s*\[([^\]]*)\]/);
      if (!rm) return;
      for (const s of rm[1].matchAll(/["'](\/[^"']*)["']/g)) {
        const r = s[1].split('?')[0].split('#')[0];
        if (!r || r.includes(':') || seen.has(r)) continue;
        seen.add(r);
        if (!renderable(r)) out.push(mkFinding('registry-route-missing', 'FE', 'modules/devControl/registry.js', i + 1, r));
      }
    });
  } catch { /* no registry */ }
  return out;
}

const SEV_ORDER = { high: 0, medium: 1, low: 2 };

// Scan one FE src root → sorted findings + counts (tagged source:'build').
function scanFrontend(feSrc) {
  const files = walk(feSrc);
  const findings = [];
  for (const abs of files) {
    const rel = path.relative(feSrc, abs).split(path.sep).join('/');
    const ext = path.extname(abs);
    let text; try { text = fs.readFileSync(abs, 'utf8'); } catch { continue; }
    const rawLines = text.split('\n');
    const codeLines = stripToCode(text);
    if (CODE_EXT.has(ext) || ext === '.css') {
      for (const { spec, line } of importSpecs(codeLines)) {
        if (!resolves(abs, spec)) findings.push(mkFinding('broken-import', 'FE', rel, line, `'${spec}'`));
      }
    }
    if (!SKIP_FILE.test(rel) && CODE_EXT.has(ext)) findings.push(...markerFindings(rel, 'FE', rawLines, codeLines));
  }
  findings.push(...routeFindings(feSrc));
  findings.sort((a, b) => (SEV_ORDER[a.severity] - SEV_ORDER[b.severity]) || a.file.localeCompare(b.file) || (a.line - b.line));
  const tagged = findings.map((f) => ({ ...f, source: 'build' }));
  return { files: files.length, findings: tagged, counts: summarise(tagged) };
}

function summarise(findings) {
  const bySeverity = { high: 0, medium: 0, low: 0 };
  const byCategory = {};
  for (const f of findings) { bySeverity[f.severity] = (bySeverity[f.severity] || 0) + 1; byCategory[f.category] = (byCategory[f.category] || 0) + 1; }
  return { total: findings.length, bySeverity, byCategory };
}

module.exports = { RULES, walk, resolves, stripToCode, importSpecs, markerFindings, routeFindings, scanFrontend, summarise, mkFinding };
