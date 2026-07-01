// buildKeyAlerts formats alert amounts with an injectable formatter so USD branches
// (NBO/DAR/FBM) read $ instead of ₹. Defaults to ₹ for back-compat / consolidated.
import { buildKeyAlerts } from '../utils/transformers';

describe('buildKeyAlerts — branch-aware money', () => {
  const arAgeing = [{ bucket: '90+ days', amount: 50000, count: 3 }];

  test('defaults to ₹ formatting when no fmtMoney is given', () => {
    const ar = buildKeyAlerts({ arAgeing }).find((a) => a.type === 'Receivables');
    expect(ar.title).toMatch(/₹/);
    expect(ar.title).not.toMatch(/\$/);
  });

  test('uses the supplied branch-currency formatter when provided', () => {
    const fmtMoney = (n) => `$${Math.round(n)}`;
    const ar = buildKeyAlerts({ arAgeing, fmtMoney }).find((a) => a.type === 'Receivables');
    expect(ar.title).toMatch(/\$50000/);
    expect(ar.title).not.toMatch(/₹/);
  });
});
