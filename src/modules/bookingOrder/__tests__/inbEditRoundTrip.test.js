// Regression: editing an INB deal must round-trip the PURCHASE-side figures.
// The Edit grid is rebuilt from the reconstructed deal (getDeal): the fares come from
// the SALE leg's fareLines, but the Supplier Service Charge ('Supp SVCHG') exists only
// on the PURCHASE leg's heads and the supplier incentive rides on deal.purchase.
// inbRowsFromDeal used to ignore both — the Edit form opened with them BLANK (the
// user's saved edit looked "not reflected") and the next save silently dropped them
// from the rebuilt purchase voucher.
jest.mock('../../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve([])), apiPost: jest.fn(), apiPut: jest.fn(), getAuthToken: jest.fn() }));
jest.mock('../../../core/useAccounting', () => ({ invalidateBooks: jest.fn(), useVoucherPreview: () => ({ data: {} }), useVoucherApprovals: jest.fn(() => ({ data: [] })), useApproveMany: jest.fn(), useApproveVoucher: jest.fn(), useRejectVoucher: jest.fn() }));
jest.mock('../../../core/useReference', () => ({ useLedgerRegistry: () => ({ data: [] }), useAppConfig: () => ({ data: {} }) }));
jest.mock('../../../core/AuditTrail', () => ({ AuditTrail: () => null }));
jest.mock('../../../core/ux/toast', () => ({ toast: jest.fn() }));
jest.mock('../../../core/ux/confirm', () => ({ confirmDialog: jest.fn(() => Promise.resolve({ confirmed: false })) }));

import { VSPECS, bookingTotals } from '../../../core/voucherSpecs.js';
import { inbRowsFromDeal, rowsForEdit } from '../legacy';

const CTX = { branch: 'BOM' };

// The deal shape InbEditGate hands to the entry screen, derived the same way the
// backend getDeal does: fareLines off the sale leg, purchaseHeads off the purchase leg.
function dealFromEntry(spec, line, { gstMode = 'inter' } = {}) {
  const t = bookingTotals(spec, [line], CTX);
  return {
    isInterBranch: true,
    fareLines: spec.fareCols.map((c) => ({ amt: line[c.key] || 0, desc: c.label })).filter((l) => l.amt > 0),
    serviceFee: line.ssvc || 0,
    passenger: 'ASHA MEHTA',
    purchaseHeads: t.po.heads.map((h) => ({ amt: h.amt, desc: h.label })),
    purchase: { gst: t.po.gst, incentiveAmt: t.po.incentiveAmt, incentiveTds: t.po.incentiveTds, gstMode },
  };
}

describe('INB deal edit — purchase-side figures round-trip into the grid', () => {
  test('Flight: Supplier Service Charge (psvc) and incentive are restored', () => {
    const spec = VSPECS.SF;
    const entered = { fn: 'ASHA', sn: 'MEHTA', base: 4000, k3: 800, tax: 287, psvc: 999, incentive: 150, ssvc: 250 };
    const deal = dealFromEntry(spec, entered);

    const [line] = inbRowsFromDeal(spec, deal);
    expect(line.base).toBe(4000);
    expect(line.ssvc).toBe(250);       // service fee (SVF)
    expect(line.psvc).toBe(999);       // supplier service charge — was lost
    expect(line.incentive).toBe(150);  // supplier incentive — was lost
    expect(line.fn).toBe('ASHA');

    // Re-saving off the rebuilt grid reproduces the same purchase snapshot.
    const t = bookingTotals(spec, [line], CTX);
    expect(t.po.serviceCharge).toBe(999);
    expect(t.po.incentiveAmt).toBe(150);
  });

  test('Holiday package: manual supplier GST (psvcGst) is restored', () => {
    const spec = VSPECS.SH; // package model — supplier GST is a manual entry
    const entered = { fn: 'ASHA', sn: 'MEHTA', base: 85000, psvc: 1000, psvcGst: 180, markup: 12000 };
    const deal = dealFromEntry(spec, entered);

    const [line] = inbRowsFromDeal(spec, deal);
    expect(line.psvc).toBe(1000);
    expect(line.psvcGst).toBe(180);
  });

  test('no purchase leg (sale-only deal) → purchase fields stay blank', () => {
    const spec = VSPECS.SM;
    const deal = {
      isInterBranch: true, fareLines: [{ amt: 900, desc: 'Base Fare' }], serviceFee: 100,
      passenger: '', purchaseHeads: [], purchase: null,
    };
    const [line] = inbRowsFromDeal(spec, deal);
    expect(line.psvc).toBe('');
    expect(line.incentive).toBe('');
  });

  test('SO/PO/GP (non-INB) edit keeps psvc via rows (control)', () => {
    const spec = VSPECS.SF;
    const row = { fn: 'A', sn: 'B', base: 4000, k3: 800, tax: 287, psvc: 999, markup: 500, ssvc: 100 };
    const t = bookingTotals(spec, [row], CTX);
    const grid = rowsForEdit(spec, { module: 'SF', rows: [row], so: t.so, po: t.po, gp: t.gp });
    expect(grid[0].psvc).toBe(999);
  });
});
