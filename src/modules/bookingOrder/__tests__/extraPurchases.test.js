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

import { legToPayload, ALLOWED_LEG_MODULES } from '../legacy.jsx';
import { VSPECS, blankLine } from '../../../core/voucherSpecs.js';

const legOf = (module, over = {}) => ({
  module, supplier: { name: 'Skylux', ledgerGroup: 'Sundry Creditors' },
  costCenter: 'BOM-MISC', purTallyRef: 'SK-1', gstMode: 'intra', packageType: '', availItc: false,
  line: { ...blankLine(VSPECS[module]), ...over },
});

describe('ALLOWED_LEG_MODULES', () => {
  test('Flight→Misc; Holiday→any; Visa→2nd-visa/Misc/Insurance', () => {
    expect(ALLOWED_LEG_MODULES.SF).toEqual(['SM']);
    expect(ALLOWED_LEG_MODULES.SH).toEqual(['SF', 'SHT', 'SC', 'SV', 'SI', 'SM']);
    expect(ALLOWED_LEG_MODULES.SV).toEqual(['SV', 'SM', 'SI']); // multi-country visa + add-ons
    expect(ALLOWED_LEG_MODULES.SHT).toBeUndefined();            // hotel/car/insurance/misc stay single-PO
    expect(ALLOWED_LEG_MODULES.SC).toBeUndefined();
  });
  test('Visa allows a SAME-MODULE (2nd visa) leg', () => {
    expect(ALLOWED_LEG_MODULES.SV).toContain('SV');
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
