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
import { inbRowsFromDeal, rowsForEdit, legsFromEdit, legFilled } from '../legacy';

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

// A leg only counts as "filled" if it carries money — but the predicate must ask the LEG's OWN
// module spec which columns hold it. It used to hardcode `base`, so a Misc leg (whose spec is
// [Base Fare, Taxes]) carrying ONLY tax — a real shape: seat-booking charges booked as pure tax —
// read as empty. It was then skipped by the folder-GP fold AND dropped from the save payload;
// on an INB edit that means the server DELETES it (the payload always carries `purchases` now).
describe('N-PO leg "filled" test — spec-aware, not base-only', () => {
  test('a Misc leg with ONLY tax counts as filled (the tax-only seat-charge shape)', () => {
    expect(legFilled({ module: 'SM', line: { base: 0, tax: 1272, psvc: 0 } })).toBe(true);
  });

  test('a Misc leg with only base, or only psvc, still counts', () => {
    expect(legFilled({ module: 'SM', line: { base: 500, tax: 0, psvc: 0 } })).toBe(true);
    expect(legFilled({ module: 'SM', line: { base: 0, tax: 0, psvc: 60 } })).toBe(true);
  });

  test('a genuinely empty leg does NOT count (no phantom legs posted)', () => {
    expect(legFilled({ module: 'SM', line: { base: 0, tax: 0, psvc: 0 } })).toBe(false);
    expect(legFilled({ module: 'SM', line: {} })).toBe(false);
  });

  test('a Flight leg counts on any of its own fare columns (k3-only, tax-only)', () => {
    expect(legFilled({ module: 'SF', line: { base: 0, k3: 800, tax: 0 } })).toBe(true);
    expect(legFilled({ module: 'SF', line: { base: 0, k3: 0, tax: 287 } })).toBe(true);
  });

  test('an unknown module falls back to the Misc spec rather than throwing', () => {
    expect(legFilled({ module: 'ZZ', line: { base: 10 } })).toBe(true);
    expect(legFilled({ module: undefined, line: { base: 0, tax: 0 } })).toBe(false);
  });
});

// N-PO: an INB deal's EXTRA cost legs arrive from getDeal as component `heads` off the
// "<pfx>-<component> [IB-Pur]" ledgers — a booking leg carries a grid `rows`, an INB leg does
// not. legsFromEdit must map those heads onto the grid, else the editor opens the leg BLANK and
// the save (which now carries `purchases`) rebuilds the deal without it — deleting a leg the
// INB list itself advertises as "(+N legs)".
describe('INB deal edit — extra N-PO legs rehydrate from getDeal `heads`', () => {
  test('a Misc cost leg maps its heads onto the grid line (fares, Supp SVCHG, incentive)', () => {
    const legs = legsFromEdit({
      purchases: [{
        vno: 'INB/BOM/26/0551', module: 'SM', packageType: '',
        supplier: { name: 'Seat Co', ledgerName: 'Seat Co', ledgerGroup: 'Sundry Creditors' },
        costCenter: 'BOM-INB-MISC', purTallyRef: 'IP/229/26-27', gstMode: 'intra',
        // Engine-created legs name components off the fare-column LABELS, so they map exactly.
        heads: [{ amt: 500, desc: 'Base Fare' }, { amt: 60, desc: 'Supp SVCHG' }],
        purchase: { gst: 90, incentiveAmt: 25, incentiveTds: 0, gstMode: 'intra' },
      }],
    });
    expect(legs).toHaveLength(1);
    const [leg] = legs;
    expect(leg.vno).toBe('INB/BOM/26/0551');   // identifies the leg so the server patches in place
    expect(leg.module).toBe('SM');
    expect(leg.supplier).toEqual({ name: 'Seat Co', ledgerGroup: 'Sundry Creditors' });
    expect(leg.purTallyRef).toBe('IP/229/26-27');
    expect(leg.costCenter).toBe('BOM-INB-MISC');
    // The fare amount MUST land — asserting only psvc/incentive is what let a silent drop pass.
    expect(leg.line.base).toBe(500);
    expect(leg.line.psvc).toBe(60);        // 'Supp SVCHG' is the psvc column, not a fare column
    expect(leg.line.incentive).toBe(25);   // rides on leg.purchase, not the heads
    expect(leg.unmapped).toEqual([]);      // everything represented → safe to rebuild
  });

  test('two heads on ONE column ACCUMULATE (assigning kept only the last and ate the rest)', () => {
    const [leg] = legsFromEdit({
      purchases: [{ module: 'SM', supplier: { ledgerName: 'X' }, heads: [{ amt: 300, desc: 'Taxes' }, { amt: 200, desc: 'Taxes' }] }],
    });
    expect(leg.line.tax).toBe(500);
  });

  // Migrated legs carry descs that drifted from the spec labels — 'K3-Taxes', 'Supplier Service',
  // 'Room / Basic', 'Visa Fee' and 'Premium' all exist in the live books. The grid has no column
  // for them, so the leg must be flagged and sent back keep-untouched: rebuilding it from a read
  // that lost the amount would rewrite a real cost leg into a smaller one.
  test('an UNMAPPED component is reported, never silently dropped', () => {
    const [leg] = legsFromEdit({
      purchases: [{
        vno: 'INB/BOM/26/0999', module: 'SF', supplier: { ledgerName: 'Y' },
        heads: [{ amt: 21230, desc: 'Base Fare' }, { amt: 800, desc: 'K3-Taxes' }, { amt: 99, desc: 'Supplier Service' }],
      }],
    });
    expect(leg.line.base).toBe(21230);                             // what we could map still lands
    expect(leg.unmapped).toEqual(['K3-Taxes', 'Supplier Service']); // what we couldn't is surfaced
  });

  test('a leg whose money is ONLY in an unmapped component still counts as filled (never dropped)', () => {
    // It maps to nothing, so every column reads 0 — the old base-only/fareSum test would drop it,
    // and the server retires whatever it is not sent.
    expect(legFilled({ module: 'SF', line: { base: 0, k3: 0, tax: 0 }, unmapped: ['K3-Taxes'] })).toBe(true);
  });

  test('a booking-style leg with saved `rows` still wins over heads (unchanged path)', () => {
    const [leg] = legsFromEdit({
      purchases: [{ module: 'SM', supplier: { ledgerName: 'X' }, rows: [{ base: 777 }], heads: [{ amt: 1, desc: 'Misc' }] }],
    });
    expect(leg.line.base).toBe(777);
  });

  test('no purchases → no legs (an empty deal never fabricates one)', () => {
    expect(legsFromEdit({})).toEqual([]);
    expect(legsFromEdit({ purchases: [] })).toEqual([]);
  });
});

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
