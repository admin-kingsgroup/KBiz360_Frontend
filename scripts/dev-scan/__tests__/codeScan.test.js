/* Frontend build-time code scanner (scripts/dev-scan/codeScan.cjs) + the guard
   that the committed src/core/devScan.generated.js is not stale — the same
   contract as the route-manifest generator. Rule coverage is proven on a tiny
   fixture tree; the guard re-scans the REAL src/ and compares to the committed
   findings so a code change that introduces (or fixes) an issue can't silently
   drift from what the Development lens ships on production. */
const fs = require('fs');
const os = require('os');
const path = require('path');
const scanner = require('../codeScan.cjs');
const { stripToCode, importSpecs, resolves, markerFindings, scanFrontend } = scanner;
// eslint-disable-next-line import/no-unresolved
import { DEV_SCAN } from '../../../src/core/devScan.generated';

let ROOT;
const W = (rel, body) => {
  const full = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, body);
};
const byRule = (findings) => findings.reduce((m, f) => ((m[f.rule] = (m[f.rule] || 0) + 1), m), {});

beforeAll(() => {
  ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'kbiz-fescan-'));
  W('real.js', 'export const x = 1;\n');
  W('good.js', "// import ghost from './nope'\nimport { x } from './real';\nexport default x;\n");
  W('bad-import.js', "import y from './missing-xyz';\nexport default y;\n");
  W('markers.jsx', [
    'export default function Bad() {',
    '  return (<div>',
    '    <button onClick={() => {}}>x</button>',
    '    <a href="#">dead</a>',
    '    <a href="#" onClick={go}>ok</a>',
    '    <input placeholder="Search" />',
    '    <span>Coming soon</span>',
    '  </div>);',
    '}',
    'function boom(){ throw new Error("not implemented"); }',
    'function d(){ debugger; }',
    'function a(){ try { boom(); } catch {} }',
    'function b(){ try { boom(); } catch { /* fine */ } }',
    '// FIXME: replace stub',
  ].join('\n') + '\n');
  W('core/routeManifest.generated.js', 'export const APP_ROUTES = ["/exists"];\n');
  W('App.jsx', 'export default () => null;\n');
  W('core/menus.js', 'export const M = [{ href: "/exists" }, { href: "/gone" }];\n');
  W('modules/devControl/registry.js', "export const R = [{ routes: ['/exists', '/missing-route'] }];\n");
});
afterAll(() => { try { fs.rmSync(ROOT, { recursive: true, force: true }); } catch { /* ignore */ } });

describe('frontend scanner rules', () => {
  test('comments never yield imports; strings survive', () => {
    expect(importSpecs(stripToCode("// import g from './g'\nimport r from './r';")).map((s) => s.spec)).toEqual(['./r']);
  });
  test('resolves packages + present files, rejects missing relatives', () => {
    expect(resolves(path.join(ROOT, 'x.js'), 'react')).toBe(true);
    expect(resolves(path.join(ROOT, 'x.js'), './real')).toBe(true);
    expect(resolves(path.join(ROOT, 'x.js'), './missing-xyz')).toBe(false);
  });
  test('markers fire and false-positive shapes are skipped', () => {
    const src = fs.readFileSync(path.join(ROOT, 'markers.jsx'), 'utf8');
    const c = byRule(markerFindings('markers.jsx', 'FE', src.split('\n'), stripToCode(src)));
    expect(c['dead-button']).toBe(1);
    expect(c['dead-link']).toBe(1);          // href="#" WITHOUT onClick only
    expect(c['debugger']).toBe(1);
    expect(c['not-implemented']).toBe(2);    // throw + "Coming soon"
    expect(c['empty-catch']).toBe(1);        // bare catch{} only
    expect(c['todo']).toBe(1);               // FIXME
  });
  test('scanFrontend cross-checks routes + imports end-to-end', () => {
    const c = byRule(scanFrontend(ROOT).findings);
    expect(c['broken-import']).toBe(1);
    expect(c['dead-route']).toBe(1);
    expect(c['registry-route-missing']).toBe(1);
  });
});

describe('generated manifest guard', () => {
  const SRC = path.join(__dirname, '..', '..', '..', 'src');
  test('committed devScan.generated.js matches a fresh scan of src/ (run npm run gen:devscan if this fails)', () => {
    const fresh = scanFrontend(SRC);
    expect(fresh.findings).toEqual(DEV_SCAN.findings);
    expect(fresh.counts).toEqual(DEV_SCAN.counts);
  });
  test('every committed finding carries a fixable remark + location', () => {
    for (const f of DEV_SCAN.findings) {
      expect(f.remark && f.remark.length).toBeGreaterThan(10);
      expect(f.file).toBeTruthy();
      expect(f.tree).toBe('FE');
    }
  });
});
