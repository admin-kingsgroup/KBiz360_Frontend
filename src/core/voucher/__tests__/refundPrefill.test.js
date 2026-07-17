import { refundPrefillFromBooking, poSnapForView, splitRefundJv, consolidateLegs, gstPctFromSo } from '../fields/refundPrefill';

// The original SO/PO/GP booking BKG/BOM/26/0357 (BOM intl flight) as the by-link
// endpoint returns it. PO has no supplier service fee; SO has a 250 service charge
// + 45 GST that we KEEP, and a markup we refund.
const BOOKING = {
  saleVno: 'BOM/0626/SF00495', purchaseVno: 'BOM/0626/PF00495',
  customer: { name: 'Travkings AMD', ledgerName: 'Travkings AMD' },
  supplier: { name: 'IATA-BSP [Stock]', ledgerName: 'IATA-BSP [Stock]' },
  so: { total: 74522, serviceCharge: 250, gst: 45, gstMode: 'inter',
        lines: [{ base: 42485, k3: 0, tax: 31742, markup: 120, ssvc: 250, gstSvc: 45 }] },
  po: { total: 74227, serviceCharge: 0, gst: 0, incentiveAmt: 1275, incentiveGst: 0, incentiveTds: 25.5,
        lines: [{ base: 42485, k3: 0, tax: 31742, psvc: 0, gst: 0 }] },
  gp: { total: 1525, pct: 2.05 },
};

describe('refundPrefillFromBooking', () => {
  test('locks the spawned sale/purchase invoice nos', () => {
    const p = refundPrefillFromBooking(BOOKING, {});
    expect(p.againstInvoice).toBe('BOM/0626/SF00495');
    expect(p.againstPurchase).toBe('BOM/0626/PF00495');
  });

  test('Supplier Refund = PO total minus supplier service fee + its GST', () => {
    const p = refundPrefillFromBooking({ ...BOOKING, po: { ...BOOKING.po, total: 80000, serviceCharge: 500, gst: 90 } }, {});
    expect(p.supplierAmt).toBe(79410); // 80000 - 500 - 90
  });

  test('REFUND does NOT retain the SO SVC2 (markup blank — it is refunded to the client in full)', () => {
    const p = refundPrefillFromBooking(BOOKING, {});       // isRefund defaults true
    expect(p.markup).toBe('');           // SO SVC2 returns to the client, never re-billed
    expect(p.incentiveAmt).toBe(1275);   // Commission clawback ← PO incentive
    expect(p.incentiveGst).toBe('');     // 0 → blank (keeps 0.00 placeholder)
    expect(p.incentiveTds).toBe(25.5);
  });

  test('REISSUE carries the SO SVC2 margin over to the amendment (markup ← SO markup)', () => {
    const p = refundPrefillFromBooking(BOOKING, {}, false); // isRefund = false
    expect(p.markup).toBe(120);
  });

  test('Commission Reversal OFF → clawback / GST / TDS are NOT filled (blank)', () => {
    const p = refundPrefillFromBooking(BOOKING, { commissionReversal: false });
    expect(p.incentiveAmt).toBe('');
    expect(p.incentiveGst).toBe('');
    expect(p.incentiveTds).toBe('');
    // the rest still fills (refund: markup blank)
    expect(p.supplierAmt).toBe(74227);
    expect(p.markup).toBe('');
  });

  test('Commission Reversal default / Yes → clawback fills as before', () => {
    expect(refundPrefillFromBooking(BOOKING, {}).incentiveAmt).toBe(1275);          // default = Yes
    expect(refundPrefillFromBooking(BOOKING, { commissionReversal: true }).incentiveAmt).toBe(1275);
  });

  test('NEVER fills our service charge / the supplier service charge / its GST (amounts are retained, not refunded)', () => {
    const p = refundPrefillFromBooking(BOOKING, {});
    expect(p).not.toHaveProperty('serviceCharge');
    expect(p).not.toHaveProperty('supplierSvc');
    expect(p).not.toHaveProperty('supplierGst');
  });

  test('defaults the GST RATE to the rate the original sale used (45 GST on 250 fee → 18%)', () => {
    const p = refundPrefillFromBooking(BOOKING, {});
    expect(p.gstPct).toBe(18);
  });

  test('does not clobber a customer / supplier / GST-mode the preparer already chose', () => {
    const p = refundPrefillFromBooking(BOOKING, { party: 'Chosen Cust', counterParty: 'Chosen Sup', gstMode: 'intra' });
    expect(p).not.toHaveProperty('party');
    expect(p).not.toHaveProperty('counterParty');
    expect(p).not.toHaveProperty('gstMode');
  });

  test('prefills party / supplier / GST-mode when the form is still blank', () => {
    const p = refundPrefillFromBooking(BOOKING, {});
    expect(p.party).toBe('Travkings AMD');
    expect(p.counterParty).toBe('IATA-BSP [Stock]');
    expect(p.gstMode).toBe('inter');
  });
});

describe('gstPctFromSo — recover the original sale GST rate for the refund default', () => {
  test('service-fee route: 45 GST on a 250 fee → 18%', () => {
    expect(gstPctFromSo({ serviceCharge: 250, gst: 45, lines: [{ ssvc: 250, gstSvc: 45 }] })).toBe(18);
  });

  test('holiday sale at 5% → refund defaults to 5% (NOT a blanket 18)', () => {
    // SVC2 margin 4921.60 carries 246.08 GST (5%); no separate service fee.
    expect(gstPctFromSo({ serviceCharge: 0, otherTaxesGst: 246.08, lines: [{ markup: 5167.68, gstMk: 246.08 }] })).toBe(5);
  });

  test('12% slab is recovered', () => {
    expect(gstPctFromSo({ serviceCharge: 1000, lines: [{ ssvc: 1000, gstSvc: 120 }] })).toBe(12);
  });

  test('float-division noise snaps to the nearest slab (17.998 → 18)', () => {
    expect(gstPctFromSo({ serviceCharge: 1000, lines: [{ ssvc: 1000, gstSvc: 179.98 }] })).toBe(18);
  });

  test('no taxable retained income → null (caller keeps its current/default rate)', () => {
    expect(gstPctFromSo({ serviceCharge: 0, otherTaxesGst: 0, lines: [{ base: 5000 }] })).toBeNull();
    expect(gstPctFromSo({})).toBeNull();
    expect(gstPctFromSo(null)).toBeNull();
  });
});

describe('splitRefundJv — sale-side / purchase-side T-blocks', () => {
  const P = 'Travkings Tours and Travels AMD', S = 'IATA-BSP [Stock]';
  const sum = (legs, k) => Math.round(legs.reduce((s, p) => s + (p[k] || 0), 0) * 100) / 100;

  // The 9-leg refund JV (cancellation 300, no GST, Commission Reversal = No).
  const LEGS = [
    { ledger: 'IT-Base Fare', group: 'Sales Accounts', debit: 42485, credit: 0 },
    { ledger: 'IT-Taxes', group: 'Sales Accounts', debit: 31742, credit: 0 },
    { ledger: 'IT-Base Fare [Pur]', group: 'Purchase Accounts', debit: 0, credit: 42485 },
    { ledger: 'IT-Taxes [Pur]', group: 'Purchase Accounts', debit: 0, credit: 31742 },
    { ledger: S, group: 'Sundry Creditors', debit: 73927, credit: 0 },
    { ledger: 'Cancellation Charges', group: 'Indirect Expenses', debit: 300, credit: 0 },
    { ledger: 'Cancellation Charges Recovered', group: 'Indirect Income', debit: 0, credit: 300 },
    { ledger: P, group: 'Sundry Debtors', debit: 0, credit: 74227 },
    { ledger: P, group: 'Sundry Debtors', debit: 300, credit: 0 },
  ];

  test('groups by reversed voucher and each side balances', () => {
    const { sale, purchase } = splitRefundJv(LEGS, { party: P, counterParty: S });
    expect(sum(sale, 'debit')).toBe(74527);
    expect(sum(sale, 'credit')).toBe(74527);     // sale side balances
    expect(sum(purchase, 'debit')).toBe(74227);
    expect(sum(purchase, 'credit')).toBe(74227); // purchase side balances
    // customer on sale side, supplier on purchase side
    expect(sale.filter((p) => p.ledger === P).length).toBe(2);
    expect(purchase.filter((p) => p.ledger === S).length).toBe(1);
    // cancellation expense → purchase, recovery → sale
    expect(purchase.some((p) => p.ledger === 'Cancellation Charges')).toBe(true);
    expect(sale.some((p) => p.ledger === 'Cancellation Charges Recovered')).toBe(true);
  });

  test('commission reversal legs land on the purchase side', () => {
    const withCommission = [
      ...LEGS,
      { ledger: 'Commission / Incentive A/c.', group: 'Direct Income', debit: 1275, credit: 0 },
      { ledger: 'TDS Receivable [BOM]', group: 'Current Assets', debit: 0, credit: 25.5 },
    ];
    const { sale, purchase } = splitRefundJv(withCommission, { party: P, counterParty: S });
    expect(purchase.some((p) => /commission/i.test(p.ledger))).toBe(true);
    expect(purchase.some((p) => /tds/i.test(p.ledger))).toBe(true);
    expect(sale.some((p) => /commission|tds/i.test(p.ledger))).toBe(false);
  });

  // Insurance books its supplier commission to its OWN module head ("IN-Commission",
  // Sales Accounts · Insurance) rather than the shared Direct-Income head. The leg is
  // still a PURCHASE-side reversal (we earned it on the purchase), so it must render on
  // the purchase T-block exactly like the shared head does.
  //
  // This is load-bearing and fragile: the split rules test `/sales account/` on the
  // GROUP *before* they test `/commission/` on the LEDGER. It works only because the
  // posting carries the LEAF group ('Insurance'), not the primary ('Sales Accounts') —
  // if the engine ever stamped the primary instead, the commission would silently jump
  // to the sale side and both T-blocks would stop balancing.
  test('the Insurance module commission head (IN-Commission) also lands on the purchase side', () => {
    const withModuleCommission = [
      ...LEGS,
      { ledger: 'IN-Commission', group: 'Insurance', debit: 1476.9, credit: 0 },
      { ledger: 'TDS Receivable [BOM]', group: 'Current Assets', debit: 0, credit: 29.54 },
    ];
    const { sale, purchase } = splitRefundJv(withModuleCommission, { party: P, counterParty: S });
    expect(purchase.some((p) => p.ledger === 'IN-Commission')).toBe(true);
    expect(sale.some((p) => p.ledger === 'IN-Commission')).toBe(false);
  });

  test('regression: a commission head stamped with the PRIMARY group would misroute — pin the leaf-group contract', () => {
    // Documents the trap above. If this ever flips to 'sale', the engine started
    // stamping 'Sales Accounts' on the commission leg and commissionHead must be fixed.
    const { purchase } = splitRefundJv(
      [{ ledger: 'IN-Commission', group: 'Insurance', debit: 1476.9, credit: 0 }],
      { party: P, counterParty: S },
    );
    expect(purchase.length).toBe(1);
  });

  test('GST output → sale, input credit → purchase', () => {
    const { sale, purchase } = splitRefundJv([
      { ledger: 'IGST Output [BOM]', group: 'Duties & Taxes', debit: 0, credit: 45 },
      { ledger: 'IGST Input [BOM]', group: 'Duties & Taxes', debit: 54, credit: 0 },
    ], { party: P, counterParty: S });
    expect(sale.some((p) => /output/i.test(p.ledger))).toBe(true);
    expect(purchase.some((p) => /input/i.test(p.ledger))).toBe(true);
  });
});

describe('consolidateLegs — net each ledger to a single Dr/Cr line', () => {
  const P = 'Travkings Tours and Travels AMD';

  test('the customer (3 legs) collapses to ONE net credit line', () => {
    const sale = [
      { ledger: 'IT-Base Fare', group: 'Sales Accounts', debit: 42485, credit: 0 },
      { ledger: 'IT-Taxes', group: 'Sales Accounts', debit: 31742, credit: 0 },
      { ledger: P, group: 'Sundry Debtors', debit: 300.90, credit: 0 },   // handling charge billed
      { ledger: P, group: 'Sundry Debtors', debit: 300, credit: 0 },      // cancellation recovered
      { ledger: 'SVF Income', group: 'Indirect Income', debit: 0, credit: 100 },
      { ledger: 'SVC2 Income', group: 'Indirect Income', debit: 0, credit: 155 },
      { ledger: 'CGST Output', group: 'Duties & Taxes', debit: 0, credit: 22.95 },
      { ledger: 'SGST Output', group: 'Duties & Taxes', debit: 0, credit: 22.95 },
      { ledger: 'Cancellation Charges Recovered', group: 'Indirect Income', debit: 0, credit: 300 },
      { ledger: P, group: 'Sundry Debtors', debit: 0, credit: 74227 },
    ];
    const out = consolidateLegs(sale);
    const cust = out.filter((l) => l.ledger === P);
    expect(cust).toHaveLength(1);                       // shown once
    expect(cust[0]).toMatchObject({ debit: 0, credit: 73626.10 }); // 74227 − 300.90 − 300
    // side still balances
    const dr = out.reduce((s, l) => s + l.debit, 0), cr = out.reduce((s, l) => s + l.credit, 0);
    expect(Math.round(dr * 100) / 100).toBe(74227);
    expect(Math.round(cr * 100) / 100).toBe(74227);
  });

  test('single-occurrence ledgers pass through unchanged; net-zero drops out', () => {
    const out = consolidateLegs([
      { ledger: 'IT-Base Fare', group: 'Sales Accounts', debit: 1000, credit: 0 },
      { ledger: 'Wash', group: 'X', debit: 50, credit: 50 },   // nets to zero → dropped
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ ledger: 'IT-Base Fare', debit: 1000, credit: 0 });
  });
});

describe('poSnapForView — surface Supplier Incentive on the PO grid', () => {
  test('adds incentive + 2% TDS columns from the rows entry grid', () => {
    const po = { total: 74227, incentiveAmt: 1275, incentiveTds: 25.5,
                 lines: [{ base: 42485, tax: 31742, psvc: 0 }] };
    const rows = [{ base: 42485, tax: 31742, psvc: 0, incentive: 1275 }];
    const v = poSnapForView(po, rows);
    expect(v.lines[0].incentive).toBe(1275);
    expect(v.lines[0].incentiveTds).toBe(25.5);
    // original scalars preserved
    expect(v.incentiveAmt).toBe(1275);
  });

  test('falls back to the PO scalar when a single line has no rows detail', () => {
    const po = { incentiveAmt: 1275, incentiveTds: 25.5, lines: [{ base: 42485, tax: 31742 }] };
    const v = poSnapForView(po, []);
    expect(v.lines[0].incentive).toBe(1275);
    expect(v.lines[0].incentiveTds).toBe(25.5);
  });

  test('leaves lines untouched when there is no incentive', () => {
    const po = { incentiveAmt: 0, lines: [{ base: 1000, tax: 200 }] };
    const v = poSnapForView(po, [{ base: 1000, tax: 200, incentive: 0 }]);
    expect(v.lines[0]).not.toHaveProperty('incentive');
  });

  test('multi-line: takes incentive per row, computes 2% TDS each', () => {
    const po = { incentiveAmt: 300, lines: [{ base: 1000 }, { base: 2000 }] };
    const rows = [{ incentive: 100 }, { incentive: 200 }];
    const v = poSnapForView(po, rows);
    expect(v.lines[0]).toMatchObject({ incentive: 100, incentiveTds: 2 });
    expect(v.lines[1]).toMatchObject({ incentive: 200, incentiveTds: 4 });
  });
});

// ── N-PO (Phase 4): refund against one additional leg of a folder ─────────────
import { refundPrefillFromLeg } from '../fields/refundPrefill';

const FOLDER = {
  saleVno: 'BOM/0626/SF00911',
  customer: { name: 'Rahul Sharma', ledgerName: 'Rahul Sharma' },
  supplier: { name: 'Akbar Travels', ledgerName: 'Akbar Travels' }, // primary
  purchases: [{
    module: 'SM', purchaseVno: 'BOM/0626/PM00132', gstMode: 'intra',
    supplier: { name: 'Skylux Services', ledgerName: 'Skylux Services' },
    po: { total: 1500, serviceCharge: 0, gst: 0, incentiveAmt: 0, incentiveGst: 0, incentiveTds: 0 },
  }],
};

describe('refundPrefillFromLeg (Phase 4)', () => {
  const leg = FOLDER.purchases[0];
  test('points againstPurchase at the LEG vno; sale stays the folder sale', () => {
    const p = refundPrefillFromLeg(leg, FOLDER, {});
    expect(p.againstInvoice).toBe('BOM/0626/SF00911'); // shared folder sale
    expect(p.againstPurchase).toBe('BOM/0626/PM00132'); // the leg's purchase
  });
  test('supplier = the leg supplier; customer = the folder customer', () => {
    const p = refundPrefillFromLeg(leg, FOLDER, {});
    expect(p.counterParty).toBe('Skylux Services');
    expect(p.party).toBe('Rahul Sharma');
  });
  test('supplierAmt from the leg po; no separate sale margin (markup blank)', () => {
    const p = refundPrefillFromLeg(leg, FOLDER, {});
    expect(p.supplierAmt).toBe(1500);
    expect(p.markup).toBe('');
  });
  test('respects a preparer-chosen supplier/gstMode (does not clobber)', () => {
    const p = refundPrefillFromLeg(leg, FOLDER, { counterParty: 'X', gstMode: 'inter' });
    expect(p.counterParty).toBeUndefined();
    expect(p.gstMode).toBeUndefined();
  });
});

// ── Inter-branch (INB): refund raised against a single INB Link No ────────────
// The backend by-link lookup shapes an INB deal into this booking-like object (see
// inb.service.inbToBookingLike), so refundPrefillFromBooking must fill against-sale +
// against-purchase (and the buyer-branch debtor / airline supplier) from one INB no.
const INB_BOOKING = {
  isInterBranch: true,
  saleVno: 'INB/BOM/26/0001',
  purchaseVno: 'INB/BOM/26/0002',
  customer: { name: 'Travkings Tours and Travels AMD', ledgerName: 'Travkings Tours and Travels AMD' },
  supplier: { name: 'TRIP JACK', ledgerName: 'TRIP JACK' },
  gstMode: 'inter',
  so: { lines: [{ ledger: 'IT-SVF [IB]' }], total: 30551, gst: 21.81, gstMode: 'inter' },
  po: { total: 29113, serviceCharge: 0, gst: 0, incentiveAmt: 200, incentiveGst: 0, incentiveTds: 20 },
  purchases: [],
};

describe('refundPrefillFromBooking — INB deal', () => {
  test('fills against-sale + against-purchase from the one fetched INB deal', () => {
    const p = refundPrefillFromBooking(INB_BOOKING, {}, true);
    expect(p.againstInvoice).toBe('INB/BOM/26/0001');
    expect(p.againstPurchase).toBe('INB/BOM/26/0002');
  });
  test('party = buyer-branch debtor; counterParty = airline; gstMode inter', () => {
    const p = refundPrefillFromBooking(INB_BOOKING, {}, true);
    expect(p.party).toBe('Travkings Tours and Travels AMD');
    expect(p.counterParty).toBe('TRIP JACK');
    expect(p.gstMode).toBe('inter');
  });
  test('supplier refund = purchase net (no supplier service charge); commission clawback carried', () => {
    const p = refundPrefillFromBooking(INB_BOOKING, {}, true);
    expect(p.supplierAmt).toBe(29113);   // po.total − serviceCharge − gst
    expect(p.incentiveAmt).toBe(200);    // commission clawed back on cancellation
  });
});

// The "Refund payable to customer" caption must equal what actually posts to the client
// (customer leg of the full-reversal JV, net of the cancellation recovered) — not the old
// net-settlement formula. Regression guard for the RF00063 "client amount differs" report.
describe('clientNetFromJv — displayed client figure matches the posted JV', () => {
  const { clientNetFromJv } = require('../fields/refundPrefill');
  // RF00063 shape: client credited the gross reversal, debited the handling charge (59)
  // and the airline cancellation recovered (36135) → net payable 139714 (NOT 168140).
  const postings = [
    { ledger: 'NeuIQ', credit: 175908, debit: 0 },
    { ledger: 'NeuIQ', credit: 0, debit: 59 },
    { ledger: 'NeuIQ', credit: 0, debit: 36135 },
    { ledger: 'Cancellation Charge Income', credit: 36135, debit: 0 },
  ];
  test('refund → client net credit (payable), cancellation deducted', () => {
    expect(clientNetFromJv(postings, 'NeuIQ', true, 168140)).toBe(139714);
  });
  test('reissue → client net debit (billed) returns the positive billed amount', () => {
    const ri = [{ ledger: 'NeuIQ', debit: 5000, credit: 0 }, { ledger: 'NeuIQ', credit: 900, debit: 0 }];
    expect(clientNetFromJv(ri, 'NeuIQ', false, 0)).toBe(4100);
  });
  test('falls back to the formula total until the preview resolves', () => {
    expect(clientNetFromJv([], 'NeuIQ', true, 168140)).toBe(168140);
  });
  test('falls back when no party is picked yet', () => {
    expect(clientNetFromJv(postings, '', true, 168140)).toBe(168140);
  });
});
