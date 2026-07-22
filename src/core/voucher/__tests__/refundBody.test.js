import { buildRefundReissueBody } from '../fields/refundBody';

const ctx = { branchCode: 'BOM' };
const base = {
  date: '2026-04-14', party: 'Cust', counterParty: 'IATA-BSP [Stock]',
  supplierAmt: 74227, serviceCharge: 250, markup: 120, gstPct: 18,
  supplierSvc: 0, supplierGst: 0, supplierCancel: 300, supplierCancelGst: 54,
  incentiveAmt: 1275, incentiveGst: 0, incentiveTds: 25.5,
  gstMode: 'inter', againstInvoice: 'BOM/0626/SF00495', againstPurchase: 'BOM/0626/PF00495',
};

describe('buildRefundReissueBody', () => {
  test('refund: builds the RF body the engine posts', () => {
    const b = buildRefundReissueBody(base, ctx, 'refund');
    expect(b).toMatchObject({
      type: 'RF', category: 'refund', branch: 'BOM',
      supplierAmt: 74227, supplierCancel: 300, supplierCancelGst: 54,
      incentiveAmt: 1275, incentiveTds: 25.5, gstPct: 18,
      againstInvoice: 'BOM/0626/SF00495', againstPurchase: 'BOM/0626/PF00495', linkNo: 'BOM/0626/SF00495',
    });
    // our income legs only added when > 0
    expect(b.lines).toEqual([
      { ledger: 'SVF Income', amt: 250, desc: 'Service Fee' },
      { ledger: 'SVC2 Income', amt: 120, desc: 'Service Charge - 2' },
    ]);
    // GST split by component: Service-Fee GST → taxAmt, SVC2 margin GST → otherTaxesGst
    expect(b.taxAmt).toBe(45);          // 250 × 18%
    expect(b.otherTaxesGst).toBe(21.6); // 120 × 18% → SVC2 GST ledgers
    // refund customer figure: supplierAmt − ourIncome − taxAmt − otherTaxesGst
    // ourIncome = 370, total GST = 66.6 → 74227 - 370 - 45 - 21.6
    expect(b.total).toBe(73790.4);
  });

  test('reissue: drops refund-only legs (cancel / commission) and flips the total', () => {
    const b = buildRefundReissueBody(base, ctx, 'reissue');
    expect(b.type).toBe('RI');
    expect(b.supplierCancel).toBe(0);
    expect(b.supplierCancelGst).toBe(0);
    expect(b.incentiveAmt).toBe(0);
    // reissue billed = supplierAmt − supSvc − supGst + ourIncome + taxAmt
    expect(b.total).toBe(74663.6);
  });

  test('no income legs when service charge and markup are both 0', () => {
    const b = buildRefundReissueBody({ ...base, serviceCharge: 0, markup: 0 }, ctx, 'refund');
    expect(b.lines).toEqual([]);
    expect(b.taxAmt).toBe(0);
  });
});

describe('buildRefundReissueBody — partial-by-ticket refund', () => {
  const { buildRefundReissueBody } = require('../fields/refundBody');
  const base = { date: '2026-07-18', party: 'Anubhav Client', counterParty: 'Emirates BSP', gstMode: 'intra', gstPct: 18, againstInvoice: 'SV/1' };

  test('refund with partialAmount rides it into the body (fares-at-cost, income cleared)', () => {
    const b = buildRefundReissueBody({ ...base, supplierAmt: 5250, partialAmount: 5250 }, { branchCode: 'BOM' }, 'refund');
    expect(b.partialAmount).toBe(5250);
    expect(b.total).toBe(5250);          // supplierAmt with no retained income = customer refund
  });

  test('no selection → partialAmount pinned to 0 (full reversal path)', () => {
    const b = buildRefundReissueBody({ ...base, supplierAmt: 1000 }, { branchCode: 'BOM' }, 'refund');
    expect(b.partialAmount).toBe(0);
  });

  test('reissue never takes the partial path', () => {
    const b = buildRefundReissueBody({ ...base, supplierAmt: 1000, partialAmount: 400 }, { branchCode: 'BOM' }, 'reissue');
    expect(b.partialAmount).toBe(0);
  });
});

describe('buildRefundReissueBody — reissue records the NEW ticket', () => {
  const { buildRefundReissueBody } = require('../fields/refundBody');
  const base = { date: '2026-07-18', party: 'C', counterParty: 'S', gstMode: 'intra', gstPct: 18, againstInvoice: 'SV/1', supplierAmt: 2000, sectorRef: 'BOM-DXB EK 501 TKT T1' };
  const newSectors = [
    { sector: 'BOM-DXB', airline: 'Emirates', flightNo: 'EK 507', ticketNo: 'T9', pnr: 'P9', travelDate: '2026-08-10' },
    { sector: '', airline: '', flightNo: '', ticketNo: '', pnr: '', travelDate: '' },   // blank row dropped
  ];

  test('reissue carries newSectors (blank rows dropped) + names both in the narration', () => {
    const b = buildRefundReissueBody({ ...base, newSectors }, { branchCode: 'BOM' }, 'reissue');
    expect(b.newSectors).toHaveLength(1);
    expect(b.newSectors[0].ticketNo).toBe('T9');
    expect(b.remarks).toContain('BOM-DXB EK 501 TKT T1');
    expect(b.remarks).toContain('→ BOM-DXB EK 507 TKT T9');
  });

  test('refund never carries newSectors', () => {
    const b = buildRefundReissueBody({ ...base, newSectors }, { branchCode: 'BOM' }, 'refund');
    expect(b.newSectors).toEqual([]);
  });
});
