// Border-visibility guard — keeps the UI on the single visible border system.
// After the 2026-06-26 border refactor, structural borders must use the
// tokens (#cdd1d8 standard / #dfe2e7 divider / #bcc1cb strong) — never the old
// near-invisible greys (#e6e8ec/#e1e3ec) or the near-white dividers that made
// table rows look borderless. This scans source so a stray inline style can't
// silently reintroduce an invisible border.
const fs = require('fs');
const path = require('path');

const SRC = path.resolve(__dirname, '..');

// Banned in inline `solid #hex` borders.
const BANNED_SOLID = [
  // faint/duplicate neutral structural greys
  'e1e3ec', 'e6e8ec', 'd6dbe6', 'd8dcec', 'e2e8f0', 'e3e9f2', 'e5e9f0',
  'd8dbe6', 'e7e9f2', 'd8dce8', 'd7dae6', 'e7eaf2', 'cdd6e6', 'c8cee0',
  'cbd5e1', 'd6d6d6', 'c8c8c8', 'e5e5e5',
  // near-white dividers (effectively invisible on white surfaces)
  'f0f2f7', 'f3f4f8', 'f4f5f7', 'eef1f6', 'f4f6fa', 'f2f4f8', 'f1f5f9',
  'f1f3f8', 'eef0f6', 'f3f5f9', 'eef0f3', 'eceef4', 'f5f6fa', 'f4f4f4',
  'f0f0f0', 'f5f5f5', 'f2f4f9', 'f1f2f4', 'f0f1f4', 'eef1f8', 'eef0f5',
  'f7f8fb', 'ecece8', 'dededa', 'dfe3ea',
];
// Banned as a palette `border:`/`borderLt:` color-only field.
const BANNED_PALETTE = ['e1e3ec', 'e6e8ec', 'd6dbe6', 'd9d9d9', 'ededed'];

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name !== '__tests__') walk(p, acc);
    } else if (/\.(jsx?|tsx?)$/.test(e.name)) {
      acc.push(p);
    }
  }
  return acc;
}

const files = walk(SRC);
const solidRe = new RegExp(`solid\\s+#(${BANNED_SOLID.join('|')})\\b`, 'gi');
const paletteRe = new RegExp(`\\b(?:border|borderLt):\\s*'#(${BANNED_PALETTE.join('|')})'`, 'gi');

describe('border visibility tokens', () => {
  test('no inline border uses the old faint/invisible greys', () => {
    const offenders = [];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      const hits = src.match(solidRe);
      if (hits) offenders.push(`${path.relative(SRC, f)}: ${[...new Set(hits)].join(', ')}`);
    }
    expect(offenders).toEqual([]);
  });

  test('no module palette pins border/borderLt to an old faint grey', () => {
    const offenders = [];
    for (const f of files) {
      const src = fs.readFileSync(f, 'utf8');
      const hits = src.match(paletteRe);
      if (hits) offenders.push(`${path.relative(SRC, f)}: ${[...new Set(hits)].join(', ')}`);
    }
    expect(offenders).toEqual([]);
  });
});
