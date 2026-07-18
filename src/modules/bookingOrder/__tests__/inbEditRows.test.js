// INB unified edit: inbRowsFromDeal rebuilds the SINGLE fare row of the SO/PO/GP grid
// from a reconstructed deal (getDeal → { fareLines:[{amt,desc}], serviceFee }), so an
// INB deal edits on the SAME screen as SO/PO/GP with both legs loaded. Mocks the
// network / import.meta-bound modules so legacy.jsx imports offline (mirrors the N-PO test).
jest.mock('../../../core/api', () => ({ apiGet: jest.fn(() => Promise.resolve([])), apiPost: jest.fn(), apiPut: jest.fn() }));
jest.mock('../../../core/useAccounting', () => ({ invalidateBooks: jest.fn(), useVoucherPreview: () => ({ data: {} }) }));
jest.mock('../../../core/useReference', () => ({ useLedgerRegistry: () => ({ data: [] }), useAppConfig: () => ({ data: {} }) }));
jest.mock('../../../core/PrintPreview', () => ({ openPrintPreview: jest.fn() }));
jest.mock('../../../core/invoiceHtml', () => ({ buildBookingInvoice: jest.fn() }));
jest.mock('../../../core/AuditTrail', () => ({ AuditTrail: () => null }));
jest.mock('../../../core/ux/toast', () => ({ toast: jest.fn() }));
jest.mock('../../../core/ux/confirm', () => ({ confirmDialog: jest.fn(() => Promise.resolve({ confirmed: false })) }));

import { inbRowsFromDeal } from '../legacy.jsx';
import { VSPECS } from '../../../core/voucherSpecs.js';

const num = (v) => Number(v) || 0;

describe('inbRowsFromDeal — rebuild the INB edit grid from a reconstructed deal', () => {
  const deal = {
    fareLines: [{ amt: 26000, desc: 'Base Fare' }, { amt: 1295, desc: 'K3 Tax' }, { amt: 3268, desc: 'Taxes' }],
    serviceFee: 200, passenger: 'John Doe',
  };

  test('each fare component lands in its fare column; service fee → ssvc; pax split', () => {
    const [row] = inbRowsFromDeal(VSPECS.SF, deal);
    expect(row.base).toBe(26000);   // Base Fare → base
    expect(row.k3).toBe(1295);      // K3 Tax   → k3
    expect(row.tax).toBe(3268);     // Taxes    → tax
    expect(row.ssvc).toBe(200);     // service fee is the seller's margin
    expect(row.fn).toBe('John');
    expect(row.sn).toBe('Doe');
  });

  test('round-trips: the row re-derives the SAME fareLines + serviceFee the save sends', () => {
    const spec = VSPECS.SF;
    const rows = inbRowsFromDeal(spec, deal);
    // Mirror the interBranch save(): fareLines = Σ per fare column across rows; SF = Σ ssvc.
    const fareLines = spec.fareCols
      .map((c) => ({ amt: Math.round(rows.reduce((s, l) => s + num(l[c.key]), 0) * 100) / 100, desc: c.label }))
      .filter((l) => l.amt > 0);
    const serviceFee = Math.round(rows.reduce((s, l) => s + num(l.ssvc), 0) * 100) / 100;
    expect(fareLines).toEqual([
      { amt: 26000, desc: 'Base Fare' }, { amt: 1295, desc: 'K3 Tax' }, { amt: 3268, desc: 'Taxes' },
    ]);
    expect(serviceFee).toBe(200);
  });

  test('components with no matching fare column are ignored (no crash)', () => {
    const [row] = inbRowsFromDeal(VSPECS.SF, { fareLines: [{ amt: 500, desc: 'Mystery Head' }], serviceFee: 0 });
    expect(row.base).toBe('');      // blankLine default — nothing mismapped
    expect(row.ssvc).toBe(0);
  });
});
