/* The Accounts Tree View subtitle must describe the SAME four tiers the screen
   actually renders — Parent Group ▸ Group ▸ Sub-Group ▸ Ledger — not the internal
   "Primary Group / Primary Sub Group / ERP Group / ERP Sub Group" data-model
   wording. Regression guard for the subtitle drifting out of sync with the badge
   / miller-column labels in modules/chartBuilder.jsx. */

const fs = require('fs');
const path = require('path');

const SRC = fs.readFileSync(
  path.join(__dirname, '..', 'modules', 'chartBuilder.jsx'),
  'utf8',
);

// Pull the subtitle <p> text out of the header block (the paragraph that ends
// with "create under Masters ▸ Accounts Master").
const subtitle = (SRC.match(/color: DIM }}>([\s\S]*?)<\/p>/) || ['', ''])[1];

describe('Accounts Tree View subtitle matches the rendered tiers', () => {
  test('subtitle uses the four rendered tier labels in order', () => {
    expect(subtitle).toContain('Parent Group ▸ Group ▸ Sub-Group ▸ Ledger');
  });

  test('subtitle does NOT leak the internal Primary/ERP data-model wording', () => {
    expect(subtitle).not.toMatch(/Primary Sub Group|ERP Group|ERP Sub Group/);
  });

  test('the three group tiers render as badges and Ledger renders as a column', () => {
    expect(SRC).toContain("badge('Parent Group'");
    expect(SRC).toContain("badge('Group'");
    expect(SRC).toContain("badge('Sub-Group'");
    expect(SRC).toContain("col('Ledger'");
  });
});
