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

  test('EDIT opens the same themed window as CREATE (shared editFrame chrome)', () => {
    // Edit must no longer render the old bare "<div style={{ padding: 14 }}>" header.
    expect(shell).toContain('const editFrame = (children) =>');
    // Dark/gold header + gold left border, identical tokens to the create VWrap.
    expect(shell).toContain("borderLeft: '4px solid #A07828'");
    expect(shell).toMatch(/background: '#141414', borderBottom: '3px solid #A07828'/);
    // Both the editable form and the post-save panel reuse the frame.
    expect(shell).toContain('return editFrame(doneInner)');
    expect(shell).toMatch(/return editFrame\(\s*<div style=\{\{ padding: '14px 16px' \}\}/);
    // The stripped-down bare edit header is gone: a `<div style={{ padding: 14 }}>` may
    // only appear as INNER content passed to editFrame(...) (e.g. the approved/read-only
    // panel), never returned directly as the edit container itself (the old un-themed look).
    expect(shell).not.toMatch(/return\s*\(?\s*<div style=\{\{ padding: 14 \}\}>/);
  });
});

describe('SO / PO / GP booking voucher (legacy.jsx)', () => {
  const legacy = read('modules/accounts/daily-entry/soPoGpVoucherEntry.jsx');

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
    // Badge is inter-branch aware — `badge={interBranch ? 'INSO' : 'SO'}` etc. — so match
    // the SO/PO/GP token inside the badge expression, still anchored to its accent colour.
    expect(legacy).toMatch(/badge=\{[^}]*'SO'\}[^>]*accent=\{SO_BAR\}/);
    expect(legacy).toMatch(/badge=\{[^}]*'PO'\}[^>]*accent=\{PO_BAR\}/);
    expect(legacy).toMatch(/badge=\{[^}]*'GP'\}[^>]*accent=\{GP_BAR\}/);
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

  test('exact HTML match — muted Dr/Cr + section-tinted tables + 26px GP', () => {
    // Dr green / Cr red are the template's muted hexes, not the app's bright ones.
    expect(legacy).toContain("DR = '#1A7A42', CR = '#C0392B'");
    // SO headers carry blue / PO maroon via a section-colour gradient; the total rows
    // tint that colour into the table (blue #DCE8F4 for SO, maroon #FBEEF2 for PO).
    expect(legacy).toContain("'linear-gradient(180deg, ' + SO_BAR"); // soHdr
    expect(legacy).toContain("background: '#DCE8F4', color: SO_BAR, borderTop: '2px solid ' + SO_BAR"); // soTf
    expect(legacy).toContain("'linear-gradient(180deg, ' + PO_BAR"); // poHdr
    expect(legacy).toContain("background: '#FBEEF2', color: PO_BAR, borderTop: '2px solid ' + PO_BAR"); // poTf
    // Net SALE column green, NET COST column red.
    expect(legacy).toContain('color: DR, background: \'#faf7ef\'');
    expect(legacy).toContain('color: CR, background: \'#faf7ef\'');
    // GP value 26px + Helvetica font on the voucher container.
    expect(legacy).toContain('fontSize: 26, fontWeight: 800');
    expect(legacy).toContain("fontFamily: HELV");
  });
});

describe('Shared journal (JvBlock) Dr/Cr', () => {
  const jv = read('core/voucher/JvBlock.jsx');
  test('uses the template green/red (Dr #1A7A42, Cr #C0392B)', () => {
    expect(jv).toContain("const DR = '#1A7A42', CR = '#C0392B'");
    expect(jv).not.toContain('#185FA5'); // old blue Dr gone
  });
});

describe('Voucher module internals + print/display (Tier 1 + 2)', () => {
  test('shared voucher ui.js tokens are the new theme', () => {
    const ui = read('core/voucher/ui.js');
    expect(ui).toContain("DARK = '#141414', GOLD = '#A07828'");
    expect(ui).toContain("V_DR = '#1A7A42', V_CR = '#C0392B'");
    expect(ui).not.toContain('#c2a04a'); // old gold gone
    expect(ui).not.toContain('#1a1c22'); // old dark gone
  });

  test('field-table headers use new gold (no #d4a437)', () => {
    for (const f of ['JournalFields', 'DebitNoteFields', 'PurchaseExpenseFields']) {
      const src = read(`core/voucher/fields/${f}.jsx`);
      expect(src).not.toContain('#d4a437');
      expect(src).toContain("color: '#A07828'");
    }
  });

  test('payment-mode selector is dark/gold', () => {
    const rp = read('core/voucher/fields/ReceiptPaymentFields.jsx');
    expect(rp).toContain("? '#141414' :");
    expect(rp).not.toContain('#0d1326');
    expect(rp).not.toContain('#d4a437');
  });

  test('voucher-print PDF template is dark/gold (no old hexes)', () => {
    const vp = read('core/voucher-print.jsx');
    expect(vp).toContain('background:#141414;color:#A07828');
    expect(vp).toContain('color:#6B4E0F;background:#FBF3DE'); // voucher-no chip
    expect(vp).not.toContain('#0d1326');
    expect(vp).not.toContain('#d4a437');
  });

  test('VoucherView journal (pnlTally) Dr/Cr + posted badge are green/red', () => {
    const pnl = read('modules/accounts/branch-mis/pnlTally.jsx');
    expect(pnl).toContain("const DR = '#1A7A42', CR = '#C0392B'");
    expect(pnl).toContain("bg: '#E7F3E7', c: '#1A7A42'"); // posted badge
  });
});
