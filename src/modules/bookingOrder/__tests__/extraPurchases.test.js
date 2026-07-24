// Phase-2 N-PO: the booking form's additional-purchase-leg → payload shaping.
// Mock the network / import.meta-bound modules so legacy.jsx imports offline.
jest.mock('../../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve([])), apiPost: jest.fn(), apiPut: jest.fn() }));
jest.mock('../../../core/useAccounting', () => ({ invalidateBooks: jest.fn(), useVoucherPreview: () => ({ data: {} }) }));
jest.mock('../../../core/useReference', () => ({ useLedgerRegistry: () => ({ data: [] }), useAppConfig: () => ({ data: {} }) }));
jest.mock('../../../core/PrintPreview', () => ({ openPrintPreview: jest.fn() }));
jest.mock('../../../core/invoiceHtml', () => ({ buildBookingInvoice: jest.fn() }));
jest.mock('../../../core/AuditTrail', () => ({ AuditTrail: () => null }));
jest.mock('../../../core/ux/toast', () => ({ toast: jest.fn() }));
jest.mock('../../../core/ux/confirm', () => ({ confirmDialog: jest.fn(() => Promise.resolve({ confirmed: false })) }));

import { legToPayload, ALLOWED_LEG_MODULES, clubLegsIntoSo, clubbedLegFares } from '../legacy.jsx';
import { VSPECS, blankLine } from '../../../core/voucherSpecs.js';

const legOf = (module, over = {}) => ({
  module, supplier: { name: 'Skylux', ledgerGroup: 'Sundry Creditors' },
  costCenter: 'BOM-MISC', purTallyRef: 'SK-1', gstMode: 'intra', packageType: '', availItc: false,
  line: { ...blankLine(VSPECS[module]), ...over },
});

describe('ALLOWED_LEG_MODULES', () => {
  test('Flight→2nd-flight/Misc; Holiday→non-flight components; Visa→2nd-visa/Misc/Insurance', () => {
    expect(ALLOWED_LEG_MODULES.SF).toEqual(['SF', 'SM']);
    // A package's flights are priced INSIDE the package — no separate Flight PO.
    expect(ALLOWED_LEG_MODULES.SH).toEqual(['SHT', 'SC', 'SV', 'SI', 'SM']);
    expect(ALLOWED_LEG_MODULES.SH).not.toContain('SF');
    expect(ALLOWED_LEG_MODULES.SV).toEqual(['SV', 'SM', 'SI']); // multi-country visa + add-ons
    expect(ALLOWED_LEG_MODULES.SHT).toBeUndefined();            // hotel/car/insurance/misc stay single-PO
    expect(ALLOWED_LEG_MODULES.SC).toBeUndefined();
  });
  test('Visa allows a SAME-MODULE (2nd visa) leg', () => {
    expect(ALLOWED_LEG_MODULES.SV).toContain('SV');
  });
  test('Flight allows a SAME-MODULE (2nd flight) leg', () => {
    expect(ALLOWED_LEG_MODULES.SF).toContain('SF');
  });
});

describe('legToPayload — shapes an N-PO leg for the API', () => {
  test('Misc leg → module/supplier/ref/cost-centre + computed po + rows', () => {
    const p = legToPayload(legOf('SM', { base: 2500 }), 'BOM', false);
    expect(p.module).toBe('SM');
    expect(p.supplier).toEqual({ name: 'Skylux', ledgerName: 'Skylux', ledgerGroup: 'Sundry Creditors' });
    expect(p.purTallyRef).toBe('SK-1');
    expect(p.costCenter).toBe('BOM-MISC');
    expect(p.po.total).toBe(2500);          // Misc basic, no GST on the cost (service model)
    expect(p.po.gstMode).toBe('intra');
    expect(p.rows).toHaveLength(1);
  });

  test('Visa same-module (2nd visa) leg → shapes as an SV purchase', () => {
    const p = legToPayload(legOf('SV', { base: 9000 }), 'BOM', false);
    expect(p.module).toBe('SV');
    expect(p.po.total).toBe(9000);
    expect(p.rows).toHaveLength(1);
  });

  test('Holiday component leg with availItc → supplier GST becomes claimable input', () => {
    const p = legToPayload(legOf('SH', { base: 100000, psvcGst: 5000 }), 'BOM', false);
    p.availItc = true;
    const withItc = legToPayload({ ...legOf('SH', { base: 100000, psvcGst: 5000 }), availItc: true }, 'BOM', false);
    expect(withItc.po.gst).toBe(5000);      // ITC claimed
    expect(withItc.po.total).toBe(105000);  // payable unchanged
  });
});

describe('clubLegsIntoSo — Flight N-PO fares fold into the single SO', () => {
  // One journey, three tickets: main PO (BOM–DXB) is already inside `so`;
  // legs 2 & 3 (DXB–FIH, FIH–DAR) club in as pass-through fares.
  const flightLegX = (over) => ({ leg: legOf('SF', over), sp: VSPECS.SF });
  // A main-grid SO snapshot: fares 10000+2000+500, SVF 1000 (+180 GST),
  // SVC2 1180 incl 180 GST → total 14860, heads sum = saleNet 14500.
  const so = {
    lineTotal: 14500, gst: 180, otherTaxesGst: 180, tcs: 0, roundOff: 0, total: 14860,
    heads: [
      { key: 'base', label: 'Base Fare', amt: 10000 }, { key: 'k3', label: 'K3 Tax', amt: 2000 },
      { key: 'tax', label: 'Taxes', amt: 500 }, { key: 'markup', label: 'SVC2', amt: 1000 }, { key: 'ssvc', label: 'SVF', amt: 1000 },
    ],
  };
  const legs = [
    flightLegX({ base: 8000, k3: 1600, tax: 400 }),   // ticket 2 — 10000
    flightLegX({ base: 5000, tax: 250 }),             // ticket 3 — 5250
  ];

  test('fares add to lineTotal AND total — consistency equation stays exact', () => {
    const out = clubLegsIntoSo(so, legs);
    expect(clubbedLegFares(legs)).toBe(15250);
    expect(out.lineTotal).toBe(29750);
    expect(out.total).toBe(30110);
    // total = lineTotal + gst + otherTaxesGst + tcs + roundOff (backend consistency gate)
    expect(out.total).toBe(out.lineTotal + out.gst + out.otherTaxesGst + out.tcs + out.roundOff);
  });

  test('fares merge into the matching pass-through heads — heads sum = new saleNet', () => {
    const out = clubLegsIntoSo(so, legs);
    const head = (k) => out.heads.find((h) => h.key === k).amt;
    expect(head('base')).toBe(23000);   // 10000 + 8000 + 5000
    expect(head('k3')).toBe(3600);      // 2000 + 1600
    expect(head('tax')).toBe(1150);     // 500 + 400 + 250
    expect(head('markup')).toBe(1000);  // sale-only heads untouched
    expect(head('ssvc')).toBe(1000);
    const headsSum = out.heads.reduce((s, h) => s + h.amt, 0);
    expect(headsSum).toBe(out.total - out.gst - out.otherTaxesGst - out.tcs); // JV balances
  });

  test('GST is untouched — leg fares are untaxed pass-throughs', () => {
    const out = clubLegsIntoSo(so, legs);
    expect(out.gst).toBe(so.gst);
    expect(out.otherTaxesGst).toBe(so.otherTaxesGst);
  });

  test('no billable legs → the SO snapshot is returned unchanged', () => {
    expect(clubLegsIntoSo(so, [])).toBe(so);
  });
});
