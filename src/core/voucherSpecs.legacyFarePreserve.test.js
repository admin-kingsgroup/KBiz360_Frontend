import { VSPECS, blankLine, bookingTotals } from './voucherSpecs.js';

// Locks the invariant behind the "preserve legacy premium on edit" fix
// (soPoGpVoucherEntry effective-spec). A legacy insurance voucher carries premium on a
// `base` fare column that service-only SI no longer lists; the entry screen re-adds that
// column as an EFFECTIVE spec so the premium is carried through save unchanged. Because a
// fare is a pass-through (added to BOTH sale and purchase), it inflates the totals but
// CANNOT change GP, and it re-posts its Base Fare head on both sides — reproducing the
// original books. Figures mirror the LOBO/RODNEY PAUL voucher (MS/14).
const SI = VSPECS.SI;
const EFF = { ...SI, fareCols: [{ key: 'base', label: 'Base Fare' }] };
const svcLine = { ...blankLine(SI), markup: 4222, ssvc: 0, psvc: 3577.76, incentive: 1610.08 };
const effLine = { ...blankLine(EFF), markup: 4222, ssvc: 0, psvc: 3577.76, incentive: 1610.08, base: 1967.88 };

describe('legacy insurance premium preserved via effective spec — GP unchanged', () => {
  const svc = bookingTotals(SI, [svcLine], { branch: 'BOM' });   // service-only (premium dropped)
  const eff = bookingTotals(EFF, [effLine], { branch: 'BOM' });  // effective spec (premium carried)

  test('GP is identical with or without the carried premium (pass-through cancels)', () => {
    expect(svc.gp.total).toBeCloseTo(1610.29, 2);
    expect(eff.gp.total).toBeCloseTo(svc.gp.total, 2);
  });

  test('sale & purchase totals grow by exactly the premium — nothing lost', () => {
    expect(eff.so.total).toBeCloseTo(svc.so.total + 1967.88, 2);
    expect(eff.po.total).toBeCloseTo(svc.po.total + 1967.88, 2);
  });

  test('GP tiles still reconcile: Net Sales − Net Purchase = GP', () => {
    expect(Math.round((eff.gp.saleNet - eff.gp.costNet) * 100) / 100).toBeCloseTo(eff.gp.total, 2);
  });

  test('re-post reproduces a Base Fare head on BOTH sale and purchase', () => {
    expect(eff.so.heads.find((h) => h.label === 'Base Fare')?.amt).toBeCloseTo(1967.88, 2);
    expect(eff.po.heads.find((h) => h.label === 'Base Fare')?.amt).toBeCloseTo(1967.88, 2);
  });
});
