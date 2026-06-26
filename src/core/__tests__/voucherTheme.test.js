/**
 * Voucher theme guard — verifies the gold / dark "SO·PO·GP voucher" theme is
 * applied consistently across:
 *   • every Accounts → Data-Entry voucher (shared chrome: VWrap in styles.jsx
 *     + the live journal / Save button in VoucherShell.jsx)
 *   • the standalone SO / PO / GP booking voucher (legacy.jsx)
 *
 * It is a source-level guard (these surfaces are styled with inline style
 * objects, not class names), so it pins the palette and the section-bar
 * treatment and fails loudly if a future edit drifts back to the old colours.
 */
const fs = require('fs');
const path = require('path');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');

const GOLD = '#A07828';
const GOLD_DEEP = '#6B4E0F';
const INK = '#141414';
const SO = '#1D4E89';
const PO = '#8A1F3D';

describe('Accounts voucher chrome (VWrap / VoucherShell)', () => {
  const styles = read('core/styles.jsx');
  const shell = read('core/voucher/VoucherShell.jsx');

  test('VWrap card carries the gold left border', () => {
    expect(styles).toMatch(/borderLeft:"4px solid #A07828"/);
  });

  test('VWrap header bar is dark with a gold underline', () => {
    expect(styles).toMatch(/background:"#141414",borderBottom:"3px solid #A07828"/);
  });

  test('VWrap icon chip and tax badge are gold (no leftover blue)', () => {
    expect(styles).toContain('color:"#A07828"');      // icon chip
    expect(styles).toContain('background:"#FBF3DE"');  // gold tax pill
    expect(styles).not.toContain('background:taxBg');  // old computed blue/green pill removed
  });

  test('Save button is gold, not the old blue/navy', () => {
    expect(styles).toMatch(/background:canSave\?"#A07828"/);
    expect(shell).toMatch(/background: canSave \? '#A07828'/);
    expect(shell).not.toContain("background: canSave ? '#2563eb'");
  });

  test('live journal wrapper uses gold border + paper, gold-deep heading', () => {
    expect(shell).toContain("border: '1px solid #E8D9A8', background: '#FFFDF7'");
    expect(shell).toContain("color: '#6B4E0F', fontSize: 12");
  });

  test('printed voucher header is dark/gold', () => {
    expect(shell).toContain('background:#141414;color:#A07828');
  });
});

describe('SO / PO / GP booking voucher (legacy.jsx)', () => {
  const legacy = read('modules/bookingOrder/legacy.jsx');

  test('palette constants are the template gold + ink (old hexes gone from the declaration)', () => {
    expect(legacy).toContain(`const GOLD = '${GOLD}', DARK = '${INK}'`);
    // The old gold/ink must not survive on the shared GOLD/DARK constant line.
    const constLine = legacy.split('\n').find((l) => l.includes('const GOLD ='));
    expect(constLine).not.toContain('#c2a04a');
    expect(constLine).not.toContain('#1a1c22');
  });

  test('section-bar accents defined for SO (blue) / PO (maroon) / GP (gold)', () => {
    expect(legacy).toContain(`const SO_BAR = '${SO}', PO_BAR = '${PO}', GP_BAR = GOLD`);
  });

  test('each section renders a full coloured bar via its accent', () => {
    expect(legacy).toMatch(/badge="SO"[^>]*accent=\{SO_BAR\}/);
    expect(legacy).toMatch(/badge="PO"[^>]*accent=\{PO_BAR\}/);
    expect(legacy).toMatch(/badge="GP"[^>]*accent=\{GP_BAR\}/);
  });

  test('Section header bar paints the full accent background', () => {
    expect(legacy).toContain("padding: '8px 14px', background: accent, color: '#fff'");
  });

  test('header bar gains the gold underline; GP cards are 3-tone', () => {
    expect(legacy).toContain("borderBottom: '3px solid ' + GOLD");
    expect(legacy).toContain('bg="#FFFDF7"');
    expect(legacy).toContain('bg="#FFFAEC"');
    expect(legacy).toContain('bg="#FCF3DE"');
  });

  test('GP margin % uses gold-deep accent', () => {
    expect(legacy).toContain(`color: GOLD_DEEP`);
    expect(GOLD_DEEP).toBe('#6B4E0F');
  });
});
