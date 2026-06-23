import { refundPrefillFromBooking } from '../fields/refundPrefill';

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

  test('fills Other Taxes from the SO markup and the full commission reversal', () => {
    const p = refundPrefillFromBooking(BOOKING, {});
    expect(p.markup).toBe(120);          // Our Other Taxes ← SO markup
    expect(p.incentiveAmt).toBe(1275);   // Commission clawback ← PO incentive
    expect(p.incentiveGst).toBe('');     // 0 → blank (keeps 0.00 placeholder)
    expect(p.incentiveTds).toBe(25.5);
  });

  test('NEVER fills our service charge / its GST nor the supplier service charge / its GST', () => {
    const p = refundPrefillFromBooking(BOOKING, {});
    expect(p).not.toHaveProperty('serviceCharge');
    expect(p).not.toHaveProperty('gstPct');
    expect(p).not.toHaveProperty('supplierSvc');
    expect(p).not.toHaveProperty('supplierGst');
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
